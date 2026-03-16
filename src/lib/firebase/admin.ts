import * as admin from 'firebase-admin';

// Initialize the Firebase Admin SDK
// This should only be used in Server Actions or API routes
// DEPLOY_MARK: 2026-03-15_16:30

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

let adminError: string | null = null;

if (!admin.apps.length) {
  if (!projectId || !clientEmail || !privateKey) {
    adminError = 'Firebase Admin credentials missing. projectId: ' + (projectId ? 'OK' : 'MISSING') + ', email: ' + (clientEmail ? 'OK' : 'MISSING') + ', key: ' + (privateKey ? 'OK' : 'MISSING');
  } else {
    try {
      // Limpieza quirúrgica: eliminar comillas, espacios al inicio/fin, 
      // y normalizar escapes de \n que a veces Vercel duplica o malinterpreta.
      let sanitizedKey = privateKey.trim();
      
      // Eliminar comillas envolventes si existen
      if ((sanitizedKey.startsWith('"') && sanitizedKey.endsWith('"')) || 
          (sanitizedKey.startsWith("'") && sanitizedKey.endsWith("'"))) {
        sanitizedKey = sanitizedKey.substring(1, sanitizedKey.length - 1);
      }

      // Reemplazar escapes literales de \n por saltos de línea reales
      sanitizedKey = sanitizedKey.replace(/\\n/g, '\n');

      // Si por alguna razón la llave no tiene los headers PEM, no funcionará, 
      // pero aquí asumimos que los tiene según el audit anterior.
      
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: projectId,
          clientEmail: clientEmail,
          privateKey: sanitizedKey,
        }),
      });
      console.log('Firebase Admin initialized successfully.');
    } catch (error: any) {
      console.error('Firebase Admin initialization error:', error);
      adminError = error.message || 'Error desconocido al inicializar';
    }
  }
}

// Safely export services only if initialized
const adminAuth = (admin.apps.length > 0 ? admin.auth() : null) as admin.auth.Auth;
const adminDb = (admin.apps.length > 0 ? admin.firestore() : null) as admin.firestore.Firestore;

export { adminAuth, adminDb, admin, adminError };
