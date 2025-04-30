const admin = require('firebase-admin');
const cron = require('node-cron');

// Initialize Firebase Admin using environment variables
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.database();

// Function to clean up database
async function cleanupDatabase() {
  try {
    const pathsToClean = [
      'temporaryData', // Add your paths here
      'oldSessions',
      // Add more paths as needed
    ];

    for (const path of pathsToClean) {
      await db.ref(path).remove();
      console.log(`Successfully cleaned up ${path}`);
    }

    return { success: true, message: 'Database cleanup completed successfully' };
  } catch (error) {
    console.error('Error during cleanup:', error);
    return { success: false, error: error.message };
  }
}

// Schedule cleanup to run every day at midnight (00:00)
cron.schedule('0 0 * * *', () => {
  const now = new Date().toLocaleString();
  console.log(`[${now}] Running scheduled database cleanup...`);
  cleanupDatabase().then(result => {
    console.log(`[${new Date().toLocaleString()}] Cleanup result:`, result);
  });
});

// Stylish HTML response for the server
const htmlResponse = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Firebase Cleanup Server</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      margin: 0;
      padding: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      color: #333;
    }
    .container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      padding: 40px;
      text-align: center;
      max-width: 600px;
      width: 90%;
    }
    h1 {
      color: #4285F4;
      margin-bottom: 20px;
    }
    .status {
      background: #34A853;
      color: white;
      padding: 10px 20px;
      border-radius: 20px;
      font-weight: bold;
      display: inline-block;
      margin: 20px 0;
    }
    .info {
      background: #f8f9fa;
      border-left: 4px solid #4285F4;
      padding: 15px;
      margin: 20px 0;
      text-align: left;
    }
    .schedule {
      margin-top: 30px;
      font-size: 0.9em;
      color: #666;
    }
    .logo {
      font-size: 24px;
      font-weight: bold;
      color: #4285F4;
      margin-bottom: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">Firebase Cleanup Server</div>
    <h1>Database Maintenance Service</h1>
    <div class="status">ACTIVE</div>
    <div class="info">
      <p>This service automatically cleans up your Firebase Realtime Database every day at midnight (00:00).</p>
      <p>Paths cleaned:</p>
      <ul>
        <li>temporaryData</li>
        <li>oldSessions</li>
      </ul>
    </div>
    <div class="schedule">
      Last cleanup: ${new Date().toLocaleString()}<br>
      Next cleanup: ${new Date(new Date().setHours(24, 0, 0, 0)).toLocaleString()}
    </div>
  </div>
</body>
</html>
`;

// Export for Vercel
module.exports = (req, res) => {
  res.status(200).send(htmlResponse);
};
