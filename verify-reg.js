require('dotenv').config({ path: '.env.verify.local' });
const admin = require('firebase-admin');

async function verifyRegistration() {
  console.log('--- VERIFICANDO ÚLTIMO REGISTRO (domo7/demo7) ---');
  
  const rawKey = process.env.FIREBASE_PRIVATE_KEY;
  const privateKey = rawKey ? rawKey.replace(/\\n/g, '\n').replace(/"/g, '').trim() : undefined;

  const firebaseConfig = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  };

  if (!firebaseConfig.projectId || !firebaseConfig.privateKey) {
    console.error('❌ Error: Faltan variables de entorno o llave privada malformada.');
    return;
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig),
    });
  }

  const db = admin.firestore();
  const auth = admin.auth();

  // 1. Buscar Empresas recientes
  console.log('\nEmpresas registradas recientemente:');
  const empresasSnap = await db.collection('empresas').orderBy('createdAt', 'desc').limit(3).get();
  empresasSnap.forEach(doc => {
    const data = doc.data();
    console.log(`- ${data.nombre} (${doc.id}) - Creado: ${data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString() : data.createdAt}`);
  });

  // 2. Buscar Notificaciones recientes
  console.log('\nNotificaciones de Registro recientes:');
  const notifSnap = await db.collection('notificaciones_saas').orderBy('createdAt', 'desc').limit(5).get();
  notifSnap.forEach(doc => {
    const data = doc.data();
    console.log(`- Mensaje: ${data.message} - Fecha: ${data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString() : data.createdAt}`);
  });

  // 3. Verificar Auth (último usuario)
  console.log('\nÚltimo usuario en Firebase Auth:');
  const listUsers = await auth.listUsers(5);
  const sortedUsers = listUsers.users.sort((a, b) => new Date(b.metadata.creationTime) - new Date(a.metadata.creationTime));
  sortedUsers.forEach(u => {
    console.log(`- ${u.email} - Creado: ${u.metadata.creationTime}`);
  });
}

verifyRegistration().catch(console.error);
