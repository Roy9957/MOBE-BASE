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

    return { success: true };
  } catch (error) {
    console.error('Error during cleanup:', error);
    return { success: false, error: error.message };
  }
}

// Schedule cleanup to run every 24 hours
cron.schedule('0 0 * * *', () => {
  console.log('Running daily cleanup...');
  cleanupDatabase();
});

// Export for Vercel
module.exports = (req, res) => {
  res.status(200).send('Firebase Cleanup Server is running');
};
