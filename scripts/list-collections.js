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

async function listCollections() {
  console.log('--- REVISANDO COLECCIONES ---');
  try {
    const collections = await db.listCollections();
    console.log('Colecciones encontradas:', collections.map(c => c.id));
  } catch (err) {
    console.error('Error listing collections:', err);
  }
}

listCollections();
