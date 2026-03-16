import * as admin from 'firebase-admin';

// Initialize the Firebase Admin SDK
// This should only be used in Server Actions or API routes
// DEPLOY_MARK: 2026-03-15_16:30

const projectId = (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || '').trim();
const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || '').trim();
const privateKeyFromEnv = (process.env.FIREBASE_PRIVATE_KEY || '').trim();

let adminError: string | null = null;

if (!admin.apps.length) {
  let finalKey: string = 'Not processed';
  try {
    if (!projectId || !clientEmail || !privateKeyFromEnv) {
      throw new Error('Missing credentials');
    }

    // 1. Verificar si es un JSON (error común al pegar)
    try {
      const potentialJson = JSON.parse(privateKeyFromEnv);
      if (potentialJson.private_key) {
        finalKey = potentialJson.private_key;
      } else {
        throw new Error('JSON without private_key');
      }
    } catch (e) {
      // 2. No es JSON, proceder con limpieza PEM
      const bodyMatch = privateKeyFromEnv.match(/-----BEGIN PRIVATE KEY-----([\s\S]+?)-----END PRIVATE KEY-----/);
      if (bodyMatch) {
         // Quitar escapes literales de \n, \r y cualquier cosa que no sea base64
        const bodyClean = bodyMatch[1].replace(/\\n/g, '').replace(/[^A-Za-z0-9+/=]/g, '');
        // Reconstruir con cabeceras estándar
        finalKey = `-----BEGIN PRIVATE KEY-----\n${bodyClean}\n-----END PRIVATE KEY-----\n`;
      } else {
        // Fallback: tratar como llave con escapes de \n
        finalKey = privateKeyFromEnv.replace(/\\n/g, '\n').trim();
      }
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey: finalKey,
      }),
    });
    console.log('Firebase Admin initialized successfully.');
  } catch (error: any) {
    console.error('Firebase Admin initialization error:', error);
    const keyDebug = ` (ProcessedLen=${finalKey.length}, EnvLen=${privateKeyFromEnv.length})`;
    adminError = (error.message || 'Error desconocido') + keyDebug;
  }
}
// Safely export services only if initialized
const adminAuth = (admin.apps.length > 0 ? admin.auth() : null) as admin.auth.Auth;
const adminDb = (admin.apps.length > 0 ? admin.firestore() : null) as admin.firestore.Firestore;

export { adminAuth, adminDb, admin, adminError };
