const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Extraer credenciales de .env production local
const envPath = path.join(__dirname, '.env.prod.local');
// Re-crear .env.prod.local si no existe (usando el contenido que vimos antes)
// NOTA: .env.prod.local fue borrado, pero tenemos el contenido en memoria
// En este caso, usaré los valores extraídos si los tengo, o re-pull

async function verifyDemo7() {
  console.log('--- VERIFICANDO "demo7" ---');
  
  // Como .env.prod.local fue borrado, haré un pull rápido
  // Pero para simplificar, usaré los valores del sistema si están disponibles
  
  const firebaseConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig),
    });
  }

  const db = admin.firestore();
  const auth = admin.auth();

  // 1. Buscar Empresa
  console.log('\nBuscando Empresa "demo7"...');
  const empresaSnap = await db.collection('empresas').where('nombre', '==', 'demo7').get();
  if (empresaSnap.empty) {
    console.log('❌ Empresa "demo7" no encontrada.');
  } else {
    empresaSnap.forEach(doc => {
      console.log('✅ Empresa encontrada:', doc.id, doc.data());
    });
  }

  // 2. Buscar Notificación
  console.log('\nBuscando Notificación de demo7...');
  const notifSnap = await db.collection('notificaciones_saas').orderBy('createdAt', 'desc').limit(5).get();
  notifSnap.forEach(doc => {
    if (doc.data().message.includes('demo7')) {
      console.log('✅ Notificación encontrada:', doc.id, doc.data());
    }
  });

  // 3. Verificar Auth (emails recientes)
  console.log('\nBuscando Usuario reciente en Auth...');
  const listUsers = await auth.listUsers(10);
  const recentUser = listUsers.users.sort((a, b) => new Date(b.metadata.creationTime) - new Date(a.metadata.creationTime))[0];
  console.log('Último usuario registrado:', recentUser.email, `(${recentUser.metadata.creationTime})`);
}

verifyDemo7().catch(console.error);
