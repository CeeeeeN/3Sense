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

// ─── OPTIMIZED: Global Connections ───
// Cache database and messaging clients outside the handler for faster warm-starts
const db = admin.firestore();
const messaging = admin.messaging();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { householdID, residentID, title, message } = req.body;

    if (!householdID || !residentID || !title || !message) {
      return res.status(400).json({ error: 'Missing target parameters' });
    }

    // Query the tokens where householdID and residentID match
    const tokensSnapshot = await db.collection("fcmTokens")
      .where("householdID", "==", householdID)
      .where("residentID", "==", residentID)
      .get();

    if (tokensSnapshot.empty) {
      return res.status(200).json({ success: true, message: 'No registered devices found for user.' });
    }

    // Map tokens efficiently
    const tokens = tokensSnapshot.docs
      .map(doc => doc.data().token)
      .filter(Boolean); // Drops any undefined or empty token fields

    if (tokens.length === 0) {
      return res.status(200).json({ success: true, message: 'User has no active devices.' });
    }

    // Use a 'data' payload instead of 'notification'.
    // If 'notification' is used, FCM auto-displays it and skips our custom Service Worker logic.
    // By using 'data', we force the Service Worker's onBackgroundMessage to trigger.
    const payload = {
      data: {
        title: title,
        message: message,
      },
      tokens: tokens,
    };

    // Use sendEachForMulticast to blast the message to all user devices securely
    const response = await messaging.sendEachForMulticast(payload);

    // ─── OPTIMIZED: Serverless-Safe Cleanup ───
    // Awaits the deletion of invalid tokens before returning the response. 
    // Without this, Vercel kills the function before Firestore finishes the delete!
    if (response.failureCount > 0) {
      const cleanupPromises = [];
      
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            cleanupPromises.push(
              db.collection("fcmTokens").doc(tokens[idx]).delete()
            );
          }
        }
      });

      if (cleanupPromises.length > 0) {
        await Promise.all(cleanupPromises);
        console.log(`Cleaned up ${cleanupPromises.length} invalid FCM tokens.`);
      }
    }

    return res.status(200).json({ success: true, pushed: response.successCount });
  } catch (error) {
    console.error('Push notification failed:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}