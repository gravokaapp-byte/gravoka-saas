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
    let finalKey: string = 'Not processed';
    try {
      // --- LIMPIEZA NUCLEAR ---
      // 1. Extraer solo el contenido base64 entre los headers
      const bodyMatch = privateKey.match(/-----BEGIN PRIVATE KEY-----([\s\S]+?)-----END PRIVATE KEY-----/);
      
      if (bodyMatch) {
        // 1. ELIMINAR ESCAPES: Quitar específicamente el texto literal "\n" 
        // antes de filtrar or caracteres, para que la "n" no se quede pegada al base64.
        const bodyWithoutEscapes = bodyMatch[1].replace(/\\n/g, '');
        
        // 2. FILTRAR: Solo permitir caracteres Base64 puros
        const bodyClean = bodyWithoutEscapes.replace(/[^A-Za-z0-9+/=]/g, '');
        
        // 3. FORMATEAR: Envolver a 64 caracteres (estándar PEM estricto)
        const wrappedBody = bodyClean.match(/.{1,64}/g)?.join('\n') || bodyClean;
        
        // 4. RECONSTRUIR: Headers limpios y saltos de línea reales
        finalKey = `-----BEGIN PRIVATE KEY-----\n${wrappedBody}\n-----END PRIVATE KEY-----`;
      } else {
        // Fallback: tratar de limpiar lo que sea que venga
        finalKey = privateKey.trim().replace(/^["']|["']$/g, '').replace(/\\n/g, '\n');
      }
      
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: projectId,
          clientEmail: clientEmail,
          privateKey: finalKey,
        }),
      });
      console.log('Firebase Admin initialized successfully.');
    } catch (error: any) {
      console.error('Firebase Admin initialization error:', error);
      const keyDebug = typeof finalKey !== 'undefined' ? 
        ` (ProcessedKey: len=${finalKey.length}, start=${finalKey.substring(0, 25)}, end=${finalKey.substring(finalKey.length-25)})` : 
        ' (Key undefined)';
      adminError = (error.message || 'Error desconocido') + keyDebug;
    }
  }
}

// Safely export services only if initialized
const adminAuth = (admin.apps.length > 0 ? admin.auth() : null) as admin.auth.Auth;
const adminDb = (admin.apps.length > 0 ? admin.firestore() : null) as admin.firestore.Firestore;

export { adminAuth, adminDb, admin, adminError };
