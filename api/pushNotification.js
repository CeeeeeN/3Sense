import admin from 'firebase-admin';

// Initialize Firebase Admin (Singleton to avoid re-init error in serverless env)
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { memberID, title, message } = req.body;

    if (!memberID || !title || !message) {
      return res.status(400).json({ error: 'Missing target parameters' });
    }

    const db = admin.firestore();
    const tokenDoc = await db.collection("fcmTokens").doc(memberID).get();

    if (!tokenDoc.exists) {
      return res.status(200).json({ success: true, message: 'No registered devices found for user.' });
    }

    const data = tokenDoc.data();
    let tokens = data.tokens || [];

    if (tokens.length === 0) {
      return res.status(200).json({ success: true, message: 'User has no active devices.' });
    }

    const payload = {
      notification: {
        title: title,
        body: message,
      },
      tokens: tokens,
    };

    // Use sendEachForMulticast to blast the message to all user devices securely
    const response = await admin.messaging().sendEachForMulticast(payload);

    // Auto-cleanup invalid or expired tokens in Firestore
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            failedTokens.push(tokens[idx]);
          }
        }
      });

      if (failedTokens.length > 0) {
        await tokenDoc.ref.update({
          tokens: admin.firestore.FieldValue.arrayRemove(...failedTokens)
        });
      }
    }

    return res.status(200).json({ success: true, pushed: response.successCount });
  } catch (error) {
    console.error('Push notification failed:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
