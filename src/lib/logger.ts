import { adminDb } from '@/lib/firebase/admin';

export async function logToDb(category: string, message: string, data: any = {}) {
  try {
    await adminDb.collection('system_logs').add({
      category,
      message,
      data: JSON.stringify(data),
      timestamp: new Date()
    });
  } catch (e) {
    console.error('Failed to log to DB:', e);
  }
}
