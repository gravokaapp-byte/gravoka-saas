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

async function testLog() {
  console.log('--- TEST LOG LOCAL ---');
  try {
    await db.collection('system_logs').add({
      category: 'test_local',
      message: 'Este es un test desde script local',
      timestamp: new Date()
    });
    console.log('✅ Log creado exitosamente en Firestore.');
  } catch (err) {
    console.error('❌ Error creando log:', err);
  }
}

testLog();
