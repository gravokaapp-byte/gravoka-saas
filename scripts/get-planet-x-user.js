const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Basic .env parser
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

async function getAdmin() {
  try {
    const empresaId = '0ww38higFz42QYEHZJzI';
    console.log(`Buscando usuarios para empresa_id: ${empresaId}`);
    
    const snapshot = await db.collection('usuarios')
      .where('empresa_id', '==', empresaId)
      .get();
    
    if (snapshot.empty) {
      console.log('No se encontraron usuarios para esta empresa.');
      return;
    }

    for (const doc of snapshot.docs) {
      const userData = doc.data();
      console.log(`Usuario encontrado UID: ${doc.id}, Rol: ${userData.rol}`);
      
      try {
        const userRecord = await auth.getUser(doc.id);
        console.log(`Email del administrador: ${userRecord.email}`);
      } catch (authErr) {
        console.error(`Error obteniendo email para UID ${doc.id}:`, authErr.message);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

getAdmin();
