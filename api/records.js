import admin from 'firebase-admin';

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

const FULL_EMAIL_ROLES = [
  "Super Admin",
  "Super admin",
  "Secretary",
  "Standard Admin",
];

const maskEmail = (email) => {
  if (!email || typeof email !== "string") return "N/A";
  const trimmed = email.trim();
  const atIndex = trimmed.indexOf("@");
  if (atIndex <= 0) return trimmed;
  const username = trimmed.slice(0, atIndex);
  const domain = trimmed.slice(atIndex);
  return `${username[0]}****${domain}`;
};

const sanitizeRecord = (data, userRole, currentUid) => {
  if (!data || typeof data !== "object") return data;
  const isOwner = currentUid && (data.uid === currentUid || data.userID === currentUid);
  const canView = FULL_EMAIL_ROLES.includes(userRole) || isOwner;

  const sanitized = { ...data };
  if (sanitized.email) {
    sanitized.email = canView ? sanitized.email : maskEmail(sanitized.email);
  }
  if (sanitized.allData && typeof sanitized.allData === "object") {
    sanitized.allData = sanitizeRecord(sanitized.allData, userRole, currentUid);
  }
  return sanitized;
};

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const db = admin.firestore();
    const adminSnap = await db.collection("approvedAdmins").where("uid", "==", uid).get();
    
    let userRole = "Standard User";
    if (!adminSnap.empty) {
      userRole = adminSnap.docs[0].data().role || "Standard Admin";
    }

    const { collectionName } = req.query || req.body;
    if (!collectionName) {
      return res.status(400).json({ error: 'Missing collectionName parameter' });
    }

    const snapshot = await db.collection(collectionName).get();
    const records = snapshot.docs.map(doc => {
      const data = doc.data();
      return sanitizeRecord({ id: doc.id, ...data }, userRole, uid);
    });

    return res.status(200).json({ success: true, data: records });
  } catch (error) {
    console.error('API authorization or query error:', error);
    return res.status(403).json({ error: 'Forbidden or Invalid Token' });
  }
}
