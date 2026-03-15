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

async function forceActivate() {
  const empresaId = '0ww38higFz42QYEHZJzI'; // Planeta X
  const empresaRef = db.collection('empresas').doc(empresaId);
  
  const venci = new Date();
  venci.setDate(venci.getDate() + 30); // 30 días a futuro

  try {
    await empresaRef.update({
      estado: 'activo',
      fecha_vencimiento: admin.firestore.Timestamp.fromDate(venci),
      plan_activo: 'Pro'
    });
    console.log(`Empresa Planeta X activada manualmente con éxito.`);
    console.log(`Vencimiento establecido para: ${venci.toLocaleDateString()}`);
  } catch (err) {
    console.error('Error activando empresa:', err);
  }
}

forceActivate();
