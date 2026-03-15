const admin = require('firebase-admin');

const serviceAccount = {
  clientEmail: "firebase-adminsdk-fbsvc@gravoka-7445d.iam.gserviceaccount.com",
  projectId: "gravoka-7445d",
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function checkAndActivate() {
  try {
    const snapshot = await db.collection('empresas').get();
    console.log('Listado de empresas:');
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- ID: ${doc.id}, Nombre: ${data.nombre}, Estado: ${data.estado}`);
      if (data.nombre === 'Empresa Demo de Pruebas' || data.nombre.includes('Demo')) {
          doc.ref.update({ estado: 'activo' });
          console.log(`>>> ACTIVADA: ${doc.id}`);
      }
    });
  } catch (err) {
    console.error('Error:', err);
  }
}

checkAndActivate();
