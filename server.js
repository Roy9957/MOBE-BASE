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

async function cleanupDatabase() {
  const paths = ['temporaryData', 'oldSessions'];
  console.log('Starting database cleanup at:', new Date().toISOString());

  for (const path of paths) {
    try {
      const ref = db.ref(path);
      await ref.remove();
      console.log(`Cleaned path: ${path}`);
    } catch (error) {
      console.error(`Error cleaning ${path}:`, error.message);
    }
  }
}

// Run daily at midnight (server time)
cron.schedule('0 0 * * *', cleanupDatabase);

// Basic HTTP endpoint
module.exports = (req, res) => {
  if (req.query.trigger === 'manual') {
    cleanupDatabase()
      .then(() => res.send('Manual cleanup completed'))
      .catch(err => res.status(500).send('Cleanup failed: ' + err.message));
  } else {
    res.send(`
      <html>
        <body>
          <h1>Firebase Cleanup Server</h1>
          <p>Running on: ${new Date().toString()}</p>
          <a href="?trigger=manual">Run Manual Cleanup</a>
        </body>
      </html>
    `);
  }
};
