const admin = require('firebase-admin');
const cron = require('node-cron');
const moment = require('moment-timezone');

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
const TIMEZONE = 'Asia/Dhaka';

// Enhanced cleanup function with Bangladesh time logging
async function cleanupDatabase() {
  const pathsToClean = ['temporaryData', 'oldSessions'];
  const results = [];
  const cleanupStart = moment().tz(TIMEZONE);

  console.log(`🚀 Starting database cleanup at ${cleanupStart.format('YYYY-MM-DD HH:mm:ss')} (${TIMEZONE})`);

  for (const path of pathsToClean) {
    const pathStart = moment().tz(TIMEZONE);
    try {
      const ref = db.ref(path);
      console.log(`🧹 Attempting to clean path: ${path}`);
      
      const snapshot = await ref.once('value');
      const dataCount = snapshot.numChildren();
      
      if (dataCount > 0) {
        await ref.remove();
        console.log(`✅ Successfully cleaned ${path} (removed ${dataCount} items)`);
      } else {
        console.log(`ℹ️ No data found at path: ${path}`);
      }

      results.push({
        path,
        status: 'success',
        itemsRemoved: dataCount,
        duration: `${moment().diff(pathStart, 'seconds')} seconds`,
        error: null
      });
    } catch (pathError) {
      console.error(`❌ Failed to clean ${path}:`, pathError);
      results.push({
        path,
        status: 'failed',
        itemsRemoved: 0,
        duration: `${moment().diff(pathStart, 'seconds')} seconds`,
        error: pathError.message
      });
    }
  }

  return {
    success: !results.some(r => r.status === 'failed'),
    timestamp: cleanupStart.format(),
    duration: `${moment().diff(cleanupStart, 'seconds')} seconds`,
    timezone: TIMEZONE,
    results
  };
}

// Schedule for 12:00 AM Dhaka time
const cleanupJob = cron.schedule('0 0 * * *', async () => {
  console.log(`⏰ Scheduled cleanup triggered at ${moment().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss')}`);
  try {
    const result = await cleanupDatabase();
    console.log('📋 Cleanup result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('⚠️ Scheduled job error:', error);
  }
}, {
  scheduled: true,
  timezone: TIMEZONE
});

// Manual trigger endpoint with improved time display
module.exports = async (req, res) => {
  if (req.query.trigger === 'manual') {
    console.log('🔄 Manual cleanup triggered');
    try {
      const result = await cleanupDatabase();
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({
        status: 'error',
        error: error.message,
        timestamp: moment().tz(TIMEZONE).format()
      });
    }
  } else {
    const now = moment().tz(TIMEZONE);
    const nextRun = cron.getNextDates(1, '0 0 * * *', TIMEZONE)[0];
    const lastRun = cleanupJob.lastDate() ? 
      moment(cleanupJob.lastDate()).tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss') : 
      'Not run yet';

    res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Firebase Cleanup Service</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6; 
            padding: 20px;
            background: #f5f5f5;
            color: #333;
          }
          .container { 
            max-width: 800px; 
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h1 {
            color: #4285F4;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
          }
          .status-active { 
            color: #34A853;
            font-weight: bold;
          }
          .paths { 
            margin: 20px 0;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 5px;
          }
          .manual-btn {
            background: #4285F4;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 5px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            font-size: 16px;
            margin: 10px 0;
            transition: background 0.3s;
          }
          .manual-btn:hover {
            background: #3367D6;
          }
          .time-display {
            font-family: monospace;
            background: #f1f1f1;
            padding: 3px 6px;
            border-radius: 3px;
          }
          .troubleshooting {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Firebase Realtime Database Cleanup Service</h1>
          <p>Status: <span class="status-active">ACTIVE</span></p>
          <p>Timezone: <strong>${TIMEZONE}</strong></p>
          
          <h3>Schedule Information</h3>
          <p>Current Dhaka time: <span class="time-display">${now.format('YYYY-MM-DD HH:mm:ss')}</span></p>
          <p>Next scheduled cleanup: <span class="time-display">${nextRun.format('YYYY-MM-DD HH:mm:ss')}</span></p>
          <p>Last run: <span class="time-display">${lastRun}</span></p>
          
          <div class="paths">
            <h3>Paths being cleaned:</h3>
            <ul>
              ${['temporaryData', 'oldSessions'].map(path => `<li><code>/${path}</code></li>`).join('')}
            </ul>
          </div>
          
          <a href="?trigger=manual" class="manual-btn">Trigger Manual Cleanup Now</a>
          
          <div class="troubleshooting">
            <h3>Troubleshooting Guide</h3>
            <ol>
              <li>Verify your Firebase service account has <strong>write permissions</strong></li>
              <li>Check your database rules allow these paths to be modified</li>
              <li>Review Vercel function logs for execution details</li>
              <li>Ensure your paths exist in the database</li>
              <li>Confirm environment variables are properly set</li>
            </ol>
          </div>
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
