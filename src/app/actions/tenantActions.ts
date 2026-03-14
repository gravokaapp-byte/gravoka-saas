'use server';

import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function createTenantAction(formData: FormData, idToken: string) {
  try {
    // 1. Verify Caller is SuperAdmin
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    // Hardcoded SuperAdmin logic for MVP
    if (decodedToken.email !== 'mvaldes86@gmail.com') {
      throw new Error('No autorizado. Acceso denegado.');
    }

    const empresaNombre = formData.get('empresaNombre') as string;
    const rut = formData.get('rut') as string;
    const adminEmail = formData.get('adminEmail') as string;
    const adminPassword = formData.get('adminPassword') as string;
    const plan = (formData.get('plan') as string) || 'Básico';

    if (!empresaNombre || !adminEmail || !adminPassword) {
      throw new Error('Todos los campos son obligatorios.');
    }

    // 2. Create the Tenant (Empresa) in Firestore
    const empresaRef = await adminDb.collection('empresas').add({
      nombre: empresaNombre,
      rut: rut || 'N/A',
      plan_activo: plan,
      creado_en: new Date().toISOString()
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
      rol: 'admin',
      creado_en: new Date().toISOString()
    });

    return { success: true, message: `Empresa '${empresaNombre}' creada exitosamente.` };

  } catch (error: any) {
    console.error('Error creating tenant:', error);
    return { success: false, error: error.message || 'Error interno del servidor.' };
  }
}
