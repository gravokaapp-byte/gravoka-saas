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
const auth = admin.auth();

async function findSuperAdmin() {
  try {
    const snapshot = await db.collection('usuarios')
      .where('rol', '==', 'superadmin')
      .get();
    
    if (snapshot.empty) {
      console.log('No se encontró SuperAdmin.');
      return;
    }

    for (const doc of snapshot.docs) {
      const userRecord = await auth.getUser(doc.id);
      console.log(`SuperAdmin encontrado: ${userRecord.email}`);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

findSuperAdmin();
