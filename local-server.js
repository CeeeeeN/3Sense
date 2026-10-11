import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

// Import your Vercel serverless functions here
import pinAuthHandler from './api/pin-auth.js';
import resendEmailHandler from './api/resend-email.js'; // Add your other API routes if you have them!
import AIAnalysisHandler from './api/analyze.js'; // Import the AI analysis handler
import emailBlaster from './api/email-blast.js'; // Import the email blaster handler
import pushNotificationHandler from './api/pushNotification.js'; // Import the push notification handler
import recordHandler from './api/records.js'; // Import the record handler
import emailResend from './api/resend-email.js'; // Import the email resend handler

// Load the .env file so Firebase Admin has its credentials
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Map the routes exactly as Vercel does
app.post('/api/pin-auth', pinAuthHandler);
app.post('/api/resend-email', resendEmailHandler);
app.post('/api/analyze', AIAnalysisHandler); // Add the AI analysis route
app.post('/api/email-blaster', emailBlaster); // Add the email blaster route
app.post('/api/pushNotification', pushNotificationHandler); // Add the push notification route
app.post('/api/record', recordHandler); // Add the record route
app.post('/api/resend-email', emailResend); // Add the email resend route

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Local Backend API running on http://localhost:${PORT}`);
});