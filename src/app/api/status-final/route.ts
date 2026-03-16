import { NextResponse } from 'next/server';
import { adminError, adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'online',
    version: 'FINAL_DEBUG_2.2',
    timestamp: new Date().toISOString(),
    initialized: !!adminDb,
    error: adminError || 'Ningún error reportado',
    env_summary: {
      project_id: (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID) ? 'OK' : 'MISSING',
      client_email: process.env.FIREBASE_CLIENT_EMAIL ? 'OK' : 'MISSING',
      private_key: process.env.FIREBASE_PRIVATE_KEY ? `${process.env.FIREBASE_PRIVATE_KEY.length} chars` : 'MISSING'
    }
  });
}
