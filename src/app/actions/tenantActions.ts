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
    const plan = (formData.get('plan') as string) || 'Startup';

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
      fecha_vencimiento: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString() // 15 dias para demo gratis
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

export async function resetPasswordAction(email: string) {
  try {
    const link = await adminAuth.generatePasswordResetLink(email);
    return { success: true, link };
  } catch (error: any) {
    console.error('Error generating reset link:', error);
    return { success: false, error: error.message };
  }
}

export async function updateUserAction(uid: string, data: { 
  nombre: string, 
  rol: string, 
  empresa_id: string 
}) {
  try {
    // 1. Update Firestore
    await adminDb.collection('usuarios').doc(uid).update({
      nombre: data.nombre,
      rol: data.rol,
      empresa_id: data.empresa_id,
      actualizado_en: new Date().toISOString()
    });

    // 2. Update Auth DisplayName
    await adminAuth.updateUser(uid, {
      displayName: data.nombre
    });

    return { success: true, message: 'Usuario actualizado correctamente.' };
  } catch (error: any) {
    console.error('Error updating user:', error);
    return { success: false, error: error.message };
  }
}

export async function toggleUserStatusAction(uid: string, disabled: boolean) {
  try {
    // 1. Update Auth
    await adminAuth.updateUser(uid, { disabled });
    
    // 2. Update Firestore
    await adminDb.collection('usuarios').doc(uid).update({
      estado: disabled ? 'inactivo' : 'activo',
      actualizado_en: new Date().toISOString()
    });

    return { success: true, message: `Usuario ${disabled ? 'desactivado' : 'activado'} correctamente.` };
  } catch (error: any) {
    console.error('Error toggling user status:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteUserAction(uid: string) {
  try {
    // 1. Delete from Auth
    await adminAuth.deleteUser(uid);
    
    // 2. Delete from Firestore
    await adminDb.collection('usuarios').doc(uid).delete();

    return { success: true, message: 'Usuario eliminado permanentemente.' };
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return { success: false, error: error.message };
  }
}
