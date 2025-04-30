const admin = require('firebase-admin');

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
    // Clear all chat data
    await db.ref('chats').remove();
    console.log('Successfully cleared all chat data');
    
    // Clear all player data
    await db.ref('players').remove();
    console.log('Successfully cleared all player data');
    
    return { success: true };
  } catch (error) {
    console.error('Error clearing data:', error);
    return { success: false, error: error.message };
  }
}

// HTTP endpoint
module.exports = async (req, res) => {
  if (req.query.trigger === 'manual') {
    try {
      const result = await clearGameData();
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.send(`
      <html>
        <head>
          <title>Game Data Cleanup</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            button {
              background: #4285f4;
              color: white;
              border: none;
              padding: 10px 15px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 16px;
            }
          </style>
        </head>
        <body>
          <h1>Game Data Cleanup</h1>
          <p>This will clear all chat and player data from the database.</p>
          <button onclick="window.location.href='?trigger=manual'">
            Clear All Game Data Now
          </button>
        </body>
      </html>
    `);
  }
};
