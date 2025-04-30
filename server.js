const admin = require('firebase-admin');
const cron = require('node-cron');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.database();

// Enhanced cleanup function with better error handling
async function cleanupDatabase() {
  const pathsToClean = [
    'temporaryData',
    'oldSessions',
    // Add more paths as needed
  ];
  
  const results = [];
  const cleanupStart = new Date();
  
  try {
    console.log(`🚀 Starting database cleanup at ${cleanupStart.toISOString()}`);
    
    for (const path of pathsToClean) {
      try {
        const ref = db.ref(path);
        console.log(`🧹 Attempting to clean path: ${path}`);
        
        // Get snapshot before deletion for logging
        const snapshot = await ref.once('value');
        const dataCount = snapshot.numChildren();
        
        await ref.remove();
        
        console.log(`✅ Successfully cleaned ${path} (removed ${dataCount} items)`);
        results.push({
          path,
          status: 'success',
          itemsRemoved: dataCount,
          error: null
        });
      } catch (pathError) {
        console.error(`❌ Failed to clean ${path}:`, pathError);
        results.push({
          path,
          status: 'failed',
          itemsRemoved: 0,
          error: pathError.message
        });
      }
    }
    
    return {
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${(new Date() - cleanupStart) / 1000} seconds`,
      results
    };
  } catch (error) {
    console.error('🔥 Critical cleanup error:', error);
    return {
      success: false,
      timestamp: new Date().toISOString(),
      error: error.message,
      results
    };
  }
}

// More reliable scheduling with error handling
const cleanupJob = cron.schedule('0 0 * * *', async () => {
  console.log('⏰ Scheduled cleanup triggered');
  try {
    const result = await cleanupDatabase();
    console.log('📋 Cleanup result:', JSON.stringify(result, null, 2));
    
    // Optional: Send notification via email/webhook here
  } catch (error) {
    console.error('⚠️ Scheduled job error:', error);
  }
}, {
  scheduled: true,
  timezone: "Asia/Dhaka" // Set your timezone
});

// Manual trigger endpoint for testing
module.exports = async (req, res) => {
  if (req.query.trigger === 'manual') {
    console.log('🔄 Manual cleanup triggered');
    try {
      const result = await cleanupDatabase();
      res.status(200).json({
        status: 'success',
        ...result
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        error: error.message
      });
    }
  } else {
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Firebase Cleanup Service</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; }
          .container { max-width: 800px; margin: 0 auto; }
          .success { color: green; }
          .error { color: red; }
          .paths { margin: 20px 0; }
          .manual-btn {
            background: #4285F4;
            color: white;
            border: none;
            padding: 10px 15px;
            border-radius: 4px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Firebase Realtime Database Cleanup Service</h1>
          <p>Status: <span class="success">ACTIVE</span></p>
          <p>Next scheduled cleanup: ${cron.getNextDate(cleanupJob).toString()}</p>
          
          <div class="paths">
            <h3>Paths being cleaned:</h3>
            <ul>
              ${['temporaryData', 'oldSessions'].map(path => `<li>${path}</li>`).join('')}
            </ul>
          </div>
          
          <p>Last run: ${cleanupJob.lastDate() ? cleanupJob.lastDate().toString() : 'Not run yet'}</p>
          
          <a href="?trigger=manual" class="manual-btn">Trigger Manual Cleanup</a>
          
          <h3>Troubleshooting:</h3>
          <ol>
            <li>Verify Firebase service account permissions</li>
            <li>Check database rules allow writes</li>
            <li>Review function logs for errors</li>
          </ol>
        </div>
      </body>
      </html>
    `);
  }
};

// Handle process termination
process.on('SIGTERM', () => {
  cleanupJob.stop();
  process.exit(0);
});
