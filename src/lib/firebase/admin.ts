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
      // Extraemos solo el cuerpo base64
      const bodyOnly = privateKeyFromEnv
        .replace(/-----BEGIN PRIVATE KEY-----/g, '')
        .replace(/-----END PRIVATE KEY-----/g, '')
        .replace(/\\n/g, '')
        .replace(/[^A-Za-z0-9+/=]/g, ''); // Solo caracteres Base64
      
      // ELIMINACION DE CARACTERES HUEFANOS (v9.0)
      // Un Base64 válido debe ser múltiplo de 4. 
      // Si sobra 1 (ej 1625), usualmente es una 'n' de un \n real mal procesado o un espacio.
      let bodyFixed = bodyOnly;
      if (bodyFixed.length % 4 !== 0) {
          const extra = bodyFixed.length % 4;
          // Si solo sobra 1, lo quitamos (lo más común en errores de pegado/vercel)
          if (extra === 1) {
              bodyFixed = bodyFixed.substring(0, bodyFixed.length - 1);
          }
      }
      
      finalKey = `-----BEGIN PRIVATE KEY-----\n${bodyFixed}\n-----END PRIVATE KEY-----\n`;
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
