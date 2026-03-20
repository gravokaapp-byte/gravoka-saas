import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { sendWelcomeEmail, sendAdminRegistrationAlert } from '@/lib/mail';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { empresaNombre, rut, adminEmail, adminPassword, plan } = await request.json();
    const planDeseado = plan || 'Startup';

    console.log('[DEBUG] Intento de registro:', { empresaNombre, adminEmail, planDeseado });

    if (!adminAuth || !adminDb) {
      console.error('[DEBUG] Firebase Admin no inicializado.');
      return NextResponse.json({ 
        success: false, 
        error: 'Servicio no disponible temporalmente (Firebase Error)' 
      }, { status: 503 });
    }

    if (!empresaNombre || !adminEmail || !adminPassword) {
      return NextResponse.json({ success: false, error: 'Campos faltantes' }, { status: 400 });
    }

    // 1. Crear la Empresa (Tenant) con 15 días de TRIAL FULL
    // Pero guardamos plan_deseado para saber qué pasa cuando acabe el trial
    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 15);

    const empresaRef = await adminDb.collection('empresas').add({
      nombre: empresaNombre,
      rut: rut || 'N/A',
      plan_activo: 'Full',
      plan_deseado: planDeseado,
      es_trial: true,
      estado: 'activo',
      creado_en: new Date().toISOString(),
      fecha_vencimiento: fechaVencimiento.toISOString()
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

    // 5. ENVIAR CORREOS (v11.1)
    try {
      await sendWelcomeEmail(adminEmail, empresaNombre);
      await sendAdminRegistrationAlert(empresaNombre, adminEmail);
    } catch (mailError) {
      console.error('Error al enviar correos de bienvenida:', mailError);
    }

    return NextResponse.json({ success: true, message: 'Registro exitoso' });

  } catch (error: any) {
    console.error('Error en registro publico:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error interno' }, { status: 500 });
  }
}
