import * as admin from 'firebase-admin';

// Initialize the Firebase Admin SDK
// This should only be used in Server Actions or API routes
// DEPLOY_MARK: 2026-03-15_16:30

const projectId = (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || '').trim();
const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || '').trim();
const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').trim();

let adminError: string | null = null;

if (!admin.apps.length) {
    let finalKey: string = 'Not processed';
    try {
      // 1. Verificar si es un JSON (error común al pegar)
      try {
        const potentialJson = JSON.parse(privateKey);
        if (potentialJson.private_key) {
          finalKey = potentialJson.private_key;
        } else {
           throw new Error('Not the right JSON');
        }
      } catch (e) {
        // No es JSON, proceder con limpieza estándar pero robusta
        const bodyMatch = privateKey.match(/-----BEGIN PRIVATE KEY-----([\s\S]+?)-----END PRIVATE KEY-----/);
        if (bodyMatch) {
          const bodyClean = bodyMatch[1].replace(/\\n/g, '').replace(/[^A-Za-z0-9+/=]/g, '');
          const wrappedBody = (bodyClean.match(/.{1,64}/g) || []).join('\n');
          finalKey = `-----BEGIN PRIVATE KEY-----\n${wrappedBody}\n-----END PRIVATE KEY-----\n`;
        } else {
          finalKey = privateKey.replace(/\\n/g, '\n').trim();
        }
      }
      
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: projectId,
            clientEmail: clientEmail,
            privateKey: finalKey,
          }),
        });
        console.log('Firebase Admin initialized successfully.');
      }
    } catch (error: any) {
      console.error('Firebase Admin initialization error:', error);
      const keyDebug = ` (ProcessedKey: len=${finalKey.length}, start=${finalKey.substring(0, 25)}, end=${finalKey.substring(finalKey.length-5)})`;
      adminError = (error.message || 'Error desconocido') + keyDebug;
    }
  }
}

// Safely export services only if initialized
const adminAuth = (admin.apps.length > 0 ? admin.auth() : null) as admin.auth.Auth;
const adminDb = (admin.apps.length > 0 ? admin.firestore() : null) as admin.firestore.Firestore;

export { adminAuth, adminDb, admin, adminError };
