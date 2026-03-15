import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    MERCADOPAGO_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN ? 'Presente' : 'Faltante ❌',
    FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || 'Faltante ❌',
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ? 'Presente' : 'Faltante ❌',
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? 'Presente' : 'Faltante ❌',
    FIREBASE_ADMIN_INITIALIZED: !!adminDb,
    NODE_ENV: process.env.NODE_ENV
  });
}
