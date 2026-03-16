'use server';

import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function createTenantAction(formData: FormData) {
  try {
    // 1. Verify Caller Session (Simulated for initial MVP if no idToken is passed, 
    // but in production we should check cookies/session)
    // For now, we will trust the caller because Manuel is the only one with this UI
    
    const empresaNombre = formData.get('empresaNombre') as string;
    const rut = formData.get('rut') as string;
    const adminEmail = formData.get('adminEmail') as string;
    const adminPassword = formData.get('adminPassword') as string;
    const plan = (formData.get('plan') as string) || 'Básico';

    if (!empresaNombre || !adminEmail || !adminPassword) {
      throw new Error('Empresa, Email y Password son obligatorios.');
    }

    // 2. Create the Tenant (Empresa) in Firestore
    const empresaRef = await adminDb.collection('empresas').add({
      nombre: empresaNombre,
      rut: rut || 'N/A',
      plan_activo: plan,
      estado: 'activo',
      creado_en: new Date().toISOString(),
      fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 dias por defecto
    });

    // 3. Create the Client's Admin User in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email: adminEmail,
      password: adminPassword,
      displayName: `Admin de ${empresaNombre}`
    });

    // 4. Create the User Profile in Firestore linked to the Empresa
    await adminDb.collection('usuarios').doc(userRecord.uid).set({
      empresa_id: empresaRef.id,
      nombre: `Administrador (${empresaNombre})`,
      rol: 'admin_tenant', // Usamos admin_tenant para no confundir con superadmin
      creado_en: new Date().toISOString(),
      email: adminEmail
    });

    // 5. Notificar al Superadmin (v11.2)
    await adminDb.collection('notificaciones_saas').add({
      type: 'new_tenant',
      title: 'Registro Manual ✅',
      message: `Se ha creado manualmente la empresa ${empresaNombre}.`,
      read: false,
      createdAt: new Date().toISOString(),
      isSuperAdmin: true,
      metadata: { empresaId: empresaRef.id }
    });

    return { success: true, message: `Empresa '${empresaNombre}' creada exitosamente.` };

  } catch (error: any) {
    console.error('Error creating tenant:', error);
    return { success: false, error: error.message || 'Error interno del servidor.' };
  }
}

export async function createManualUserAction(data: { 
  nombre: string, 
  email: string, 
  rol: string, 
  empresa_id: string 
}) {
  try {
    // 1. Crear en Firebase Auth con password temporal
    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';
    const userRecord = await adminAuth.createUser({
      email: data.email,
      password: tempPassword,
      displayName: data.nombre
    });

    // 2. Crear perfil en Firestore
    await adminDb.collection('usuarios').doc(userRecord.uid).set({
      empresa_id: data.empresa_id,
      nombre: data.nombre,
      rol: data.rol,
      email: data.email,
      creado_en: new Date().toISOString()
    });

    return { 
      success: true, 
      message: `Usuario ${data.nombre} creado. Password temporal: ${tempPassword}`,
      tempPassword 
    };
  } catch (error: any) {
    console.error('Error creating manual user:', error);
    return { success: false, error: error.message };
  }
}
