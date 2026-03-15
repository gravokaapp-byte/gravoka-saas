const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value.length > 0) {
    env[key.trim()] = value.join('=').trim().replace(/^"(.*)"$/, '$1');
  }
});

const serviceAccount = {
  clientEmail: env.FIREBASE_CLIENT_EMAIL,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function readLogs() {
  console.log('--- REVISANDO LOGS DE PRODUCCIÓN ---');
  try {
    const snapshot = await db.collection('system_logs')
      .orderBy('timestamp', 'desc')
      .limit(10)
      .get();
    
    if (snapshot.empty) {
      console.log('No hay logs recientes.');
      return;
    }

    snapshot.forEach(doc => {
      const log = doc.data();
      console.log(`[${log.timestamp.toDate().toLocaleTimeString()}] [${log.category}] ${log.message}`);
      if (log.data) console.log('Data:', log.data);
      console.log('-------------------');
    });
  } catch (err) {
    console.error('Error leyendo logs:', err);
  }
}

readLogs();
