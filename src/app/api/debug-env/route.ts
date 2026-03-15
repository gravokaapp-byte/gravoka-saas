import { NextResponse } from 'next/server';
import { adminDb, adminError } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  return NextResponse.json({
    DEBUG_VERSION: "1.2",
    MERCADOPAGO_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN ? `Presente (${process.env.MERCADOPAGO_ACCESS_TOKEN.length} chars)` : 'Faltante ❌',
    FIREBASE_PROJECT_ID: projectId ? `${projectId} (${projectId.length} chars)` : 'Faltante ❌',
    FIREBASE_CLIENT_EMAIL: clientEmail ? `${clientEmail.substring(0, 5)}... (${clientEmail.length} chars)` : 'Faltante ❌',
    FIREBASE_PRIVATE_KEY: privateKey ? `Empieza con ${privateKey.substring(0, 20)}... (Longitud: ${privateKey.length})` : 'Faltante ❌',
    PRIVATE_KEY_HAS_NEWLINES: privateKey?.includes('\n') || false,
    PRIVATE_KEY_HAS_ESCAPED_N: privateKey?.includes('\\n') || false,
    PRIVATE_KEY_HAS_SPACES: privateKey?.includes(' ') || false,
    FIREBASE_ADMIN_INITIALIZED: !!adminDb,
    FIREBASE_ADMIN_ERROR: adminError,
    NODE_ENV: process.env.NODE_ENV
  });
}
