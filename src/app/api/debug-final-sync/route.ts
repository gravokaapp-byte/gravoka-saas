import { NextResponse } from 'next/server';
import { adminDb, adminError } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  return NextResponse.json({
    ENDPOINT_NAME: "debug-final-sync",
    AUDIT_VERSION: "2.0",
    SERVER_TIME: new Date().toISOString(),
    FIREBASE_ADMIN_INITIALIZED: !!adminDb,
    FIREBASE_ADMIN_ERROR: adminError,
    CREDS_CHECK: {
        project_id: projectId ? `OK (${projectId.length} chars)` : 'MISSING',
        email: clientEmail ? `OK (${clientEmail.length} chars)` : 'MISSING',
        key: privateKey ? `OK (${privateKey.length} chars)` : 'MISSING',
        key_has_newlines: privateKey?.includes('\n') || false
    }
  });
}
