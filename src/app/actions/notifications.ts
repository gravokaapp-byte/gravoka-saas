'use server';

import { adminDb } from '@/lib/firebase/admin';
import { revalidatePath } from 'next/cache';

export interface Notification {
  id: string;
  type: 'payment_success' | 'new_tenant' | 'system' | 'alert';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  userId?: string;
  isSuperAdmin: boolean;
  metadata?: any;
}

export async function getNotifications(isSuperAdmin: boolean, userId?: string) {
  try {
    if (!adminDb) return [];
    
    let q = adminDb.collection('notificaciones_saas')
      .orderBy('createdAt', 'desc')
      .limit(20);
    
    if (isSuperAdmin) {
      q = q.where('isSuperAdmin', '==', true);
    } else if (userId) {
      q = q.where('userId', '==', userId);
    } else {
      return [];
    }

    const snapshot = await q.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Notification[];
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

export async function markNotificationAsRead(id: string) {
  try {
    if (!adminDb) return { success: false };
    await adminDb.collection('notificaciones_saas').doc(id).update({ read: true });
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { success: false };
  }
}

export async function createNotification(data: Omit<Notification, 'id' | 'read' | 'createdAt'>) {
  try {
    if (!adminDb) return null;
    const docRef = await adminDb.collection('notificaciones_saas').add({
      ...data,
      read: false,
      createdAt: new Date().toISOString()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}
