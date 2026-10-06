import admin from 'firebase-admin';
import crypto from 'node:crypto';

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = 15 * 60 * 1000;
const LOCKED_MESSAGE =
  'Too many incorrect attempts. Your account has been temporarily locked. Please try again in 15 minutes.';
const PIN_COLLECTION = 'pinSecurity';

const hashPin = (pin) => crypto.createHash('sha256').update(pin, 'utf8').digest('hex');

const safeEqualHex = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

const isValidId = (v) => typeof v === 'string' && v.length > 0 && v.length <= 128 && !v.includes('/');

const notFound = () => ({
  status: 404,
  body: { success: false, code: 'NOT_FOUND', message: 'Resident profile not found.' },
});

const lockedResponse = (lockedUntilMs, now) => ({
  status: 423,
  body: {
    success: false,
    code: 'LOCKED',
    message: LOCKED_MESSAGE,
    remainingSeconds: Math.max(1, Math.ceil((lockedUntilMs - now) / 1000)),
  },
});

const callerOwnsHousehold = async (db, householdID, decodedToken) => {
  const householdRef = db.collection('households').doc(householdID);
  const householdSnap = await householdRef.get();
  if (!householdSnap.exists) return false;

  const household = householdSnap.data();
  if (household.userID && household.userID === decodedToken.uid) return true;

  const tokenEmail = (decodedToken.email || '').trim().toLowerCase();
  if (tokenEmail) {
    const candidates = [household.email, household.pendingEmail]
      .filter(Boolean)
      .map((e) => String(e).trim().toLowerCase());
    if (candidates.includes(tokenEmail)) return true;
  }

  const headSnap = await householdRef.collection('residents').doc('head').get();
  return headSnap.exists && headSnap.data().userID === decodedToken.uid;
};

const loadPinState = async (tx, refs) => {
  const [resSnap, secSnap] = await Promise.all([tx.get(refs.resident), tx.get(refs.security)]);
  if (!resSnap.exists) return null;

  const res = resSnap.data();
  const sec = secSnap.exists ? secSnap.data() : {};
  const legacyHash = typeof res.pinHash === 'string' && res.pinHash ? res.pinHash : null;

  return {
    hash: sec.pinHash || legacyHash || null,
    hasLegacy: Object.prototype.hasOwnProperty.call(res, 'pinHash'),
    attempts: Number(sec.pinFailedAttempts) || 0,
    lockedUntilMs: sec.pinLockedUntil?.toMillis?.() ?? 0,
  };
};

const savePinState = (tx, refs, state, { hash, attempts, lockedUntilMs }) => {
  tx.set(
    refs.security,
    {
      pinHash: hash ?? null,
      pinFailedAttempts: attempts,
      pinLockedUntil: lockedUntilMs ? admin.firestore.Timestamp.fromMillis(lockedUntilMs) : null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  if (state.hasLegacy) {
    tx.update(refs.resident, { pinHash: admin.firestore.FieldValue.delete() });
  }
};

const getStatus = (db, refs) =>
  db.runTransaction(async (tx) => {
    const state = await loadPinState(tx, refs);
    if (!state) return notFound();

    const now = Date.now();
    const locked = state.lockedUntilMs > now;

    return {
      status: 200,
      body: {
        success: true,
        hasPin: !!state.hash,
        locked,
        remainingSeconds: locked ? Math.ceil((state.lockedUntilMs - now) / 1000) : 0,
      },
    };
  });

const createPin = (db, refs, pin) =>
  db.runTransaction(async (tx) => {
    const state = await loadPinState(tx, refs);
    if (!state) return notFound();

    if (state.hash) {
      return { status: 409, body: { success: false, code: 'PIN_EXISTS', message: 'A PIN is already set for this profile.' } };
    }

    savePinState(tx, refs, state, { hash: hashPin(pin), attempts: 0, lockedUntilMs: 0 });
    return { status: 200, body: { success: true } };
  });

const verifyPin = (db, refs, pin) =>
  db.runTransaction(async (tx) => {
    const state = await loadPinState(tx, refs);
    if (!state) return notFound();

    const now = Date.now();

    if (state.lockedUntilMs > now) return lockedResponse(state.lockedUntilMs, now);

    if (!state.hash) {
      return { status: 409, body: { success: false, code: 'NO_PIN', message: 'No PIN is set on your profile. Please set up a PIN first.' } };
    }

    const previousAttempts = state.lockedUntilMs ? 0 : state.attempts;

    if (safeEqualHex(hashPin(pin), state.hash)) {
      savePinState(tx, refs, state, { hash: state.hash, attempts: 0, lockedUntilMs: 0 });
      return { status: 200, body: { success: true } };
    }

    const attempts = previousAttempts + 1;

    if (attempts >= MAX_ATTEMPTS) {
      const lockedUntil = now + LOCKOUT_MS;
      savePinState(tx, refs, state, { hash: state.hash, attempts, lockedUntilMs: lockedUntil });
      return lockedResponse(lockedUntil, now);
    }

    savePinState(tx, refs, state, { hash: state.hash, attempts, lockedUntilMs: 0 });
    const attemptsRemaining = MAX_ATTEMPTS - attempts;
    return {
      status: 401,
      body: {
        success: false,
        code: 'INCORRECT_PIN',
        attemptsRemaining,
        message: `Incorrect PIN. ${attemptsRemaining} ${attemptsRemaining === 1 ? 'attempt' : 'attempts'} remaining.`,
      },
    };
  });

const resetPin = (db, refs) =>
  db.runTransaction(async (tx) => {
    const state = await loadPinState(tx, refs);
    if (!state) return notFound();

    const now = Date.now();
    if (state.lockedUntilMs > now) return lockedResponse(state.lockedUntilMs, now);

    savePinState(tx, refs, state, { hash: null, attempts: 0, lockedUntilMs: 0 });
    tx.update(refs.resident, { updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    return { status: 200, body: { success: true } };
  });

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, code: 'UNAUTHENTICATED', message: 'Unauthorized: Missing token' });
  }

  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(authHeader.split('Bearer ')[1]);
  } catch {
    return res.status(401).json({ success: false, code: 'UNAUTHENTICATED', message: 'Your session has expired. Please log in again.' });
  }

  try {
    const { action, householdID, residentID, pin } = req.body || {};

    if (!['status', 'verify', 'create', 'reset'].includes(action) || !isValidId(householdID) || !isValidId(residentID)) {
      return res.status(400).json({ success: false, code: 'BAD_REQUEST', message: 'Invalid request.' });
    }
    if ((action === 'verify' || action === 'create') && !(typeof pin === 'string' && /^\d{4}$/.test(pin))) {
      return res.status(400).json({ success: false, code: 'BAD_REQUEST', message: 'PIN must be exactly 4 digits.' });
    }

    const db = admin.firestore();

    if (!(await callerOwnsHousehold(db, householdID, decodedToken))) {
      return res.status(403).json({ success: false, code: 'FORBIDDEN', message: 'Forbidden' });
    }

    const refs = {
      resident: db.collection('households').doc(householdID).collection('residents').doc(residentID),
      security: db.collection(PIN_COLLECTION).doc(`${householdID}__${residentID}`),
    };

    let result;
    if (action === 'status') result = await getStatus(db, refs);
    else if (action === 'verify') result = await verifyPin(db, refs, pin);
    else if (action === 'create') result = await createPin(db, refs, pin);
    else result = await resetPin(db, refs);

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('PIN auth failed:', error?.message || error);
    return res.status(500).json({ success: false, code: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' });
  }
}
