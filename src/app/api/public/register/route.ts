import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function POST(request: Request) {
  try {
    const { empresaNombre, rut, adminEmail, adminPassword } = await request.json();

    if (!empresaNombre || !adminEmail || !adminPassword) {
      return NextResponse.json({ success: false, error: 'Campos faltantes' }, { status: 400 });
    }

    // 1. Crear la Empresa (Tenant)
    const empresaRef = await adminDb.collection('empresas').add({
      nombre: empresaNombre,
      rut: rut || 'N/A',
      plan_activo: 'Pro (Trial)',
      estado: 'activo', // O 'pendiente' si quieres pago forzado al inicio
      creado_en: new Date().toISOString(),
      vencimiento: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 días trial
    });

    // 2. Crear el Usuario de Firebase Auth
    const userRecord = await adminAuth.createUser({
      email: adminEmail,
      password: adminPassword,
      displayName: empresaNombre
    });

    // 3. Crear el Perfil de Usuario vinculado a la Empresa
    await adminDb.collection('usuarios').doc(userRecord.uid).set({
      empresa_id: empresaRef.id,
      nombre: `Admin ${empresaNombre}`,
      rol: 'admin',
      creado_en: new Date().toISOString()
    });

    // 4. NOTIFICAR AL SUPERADMIN (v11.1)
    await adminDb.collection('notificaciones_saas').add({
      type: 'new_tenant',
      title: '¡Nuevo Registro! 🚀',
      message: `La empresa ${empresaNombre} se ha unido a Gravoka.`,
      read: false,
      createdAt: new Date().toISOString(),
      isSuperAdmin: true,
      metadata: { empresaId: empresaRef.id, email: adminEmail }
    });

    return NextResponse.json({ success: true, message: 'Registro exitoso' });

  } catch (error: any) {
    console.error('Error en registro publico:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error interno' }, { status: 500 });
  }
}
