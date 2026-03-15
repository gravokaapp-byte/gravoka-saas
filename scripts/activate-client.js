const admin = require('firebase-admin');

const serviceAccount = {
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  projectId: "gravoka-7445d",
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function activate() {
  try {
    const snapshot = await db.collection('empresas')
      .where('nombre', '==', 'Empresa Demo de Pruebas')
      .get();
    
    if (snapshot.empty) {
      console.log('No se encontró la empresa.');
      return;
    }

    const docRef = snapshot.docs[0].ref;
    await docRef.update({ estado: 'activo' });
    console.log('Empresa activada exitosamente.');
  } catch (err) {
    console.error('Error:', err);
  }
}

activate();
