import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const check = {
    MERCADOPAGO_TOKEN: process.env.MERCADOPAGO_ACCESS_TOKEN ? `Presente (${process.env.MERCADOPAGO_ACCESS_TOKEN.substring(0, 10)}...)` : 'Faltante ❌',
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? 'Presente ✅' : 'Faltante ❌',
    FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'Faltante ❌',
    NODE_ENV: process.env.NODE_ENV
  };

  return NextResponse.json(check);
}
