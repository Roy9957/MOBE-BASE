const admin = require('firebase-admin');
const cron = require('node-cron');

// Initialize Firebase
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  }),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

const db = admin.database();

async function clearGameData() {
  try {
    console.log('Starting data cleanup at:', new Date().toISOString());
    
    // Clear all chat data
    await db.ref('chats').remove();
    console.log('✅ Cleared all chat data');
    
    // Clear all player data
    await db.ref('players').remove();
    console.log('✅ Cleared all player data');
    
    return { success: true, timestamp: new Date().toISOString() };
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Automatic daily cleanup at midnight (server time)
cron.schedule('0 0 * * *', () => {
  console.log('⏰ Running scheduled cleanup');
  clearGameData();
});

// Manual trigger endpoint
module.exports = async (req, res) => {
  if (req.query.trigger === 'manual') {
    console.log('🔄 Manual cleanup triggered');
    const result = await clearGameData();
    res.json(result);
  } else {
    res.send(`
      <html>
        <head>
          <title>Game Data Manager</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; }
            h1 { color: #4285f4; }
            button {
              background: #4285f4;
              color: white;
              border: none;
              padding: 12px 20px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 16px;
              margin: 10px 0;
            }
            .log { 
              background: #f5f5f5; 
              padding: 15px; 
              border-radius: 4px;
              margin: 20px 0;
              font-family: monospace;
            }
          </style>
        </head>
        <body>
          <h1>Game Data Manager</h1>
          <p>Automatic cleanup runs daily at midnight (server time)</p>
          
          <button onclick="runCleanup()">
            Clear All Data Now
          </button>
          
          <div class="log" id="result">
            Click button to manually clear data
          </div>
          
          <script>
            async function runCleanup() {
              document.getElementById('result').textContent = 'Clearing data...';
              const response = await fetch('?trigger=manual');
              const result = await response.json();
              document.getElementById('result').textContent = 
                result.success 
                  ? '✅ Success! Cleared at: ' + new Date(result.timestamp).toLocaleString()
                  : '❌ Error: ' + (result.error || 'Unknown error');
            }
          </script>
        </body>
      </html>
    `);
  }
};
