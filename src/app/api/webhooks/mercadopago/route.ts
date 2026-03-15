import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { adminDb } from '@/lib/firebase/admin';
import { logToDb } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '' });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await logToDb('webhook_received', 'Webhook de Mercado Pago crudo', { body });
    
    if (body.type === 'payment' && body.data?.id) {
       const paymentId = body.data.id;
       const payment = new Payment(client);
       const paymentInfo = await payment.get({ id: paymentId });
       
       await logToDb('webhook_payment_info', `Información de pago recuperada: ${paymentId}`, { 
         status: paymentInfo.status,
         metadata: paymentInfo.metadata 
       });

       if (paymentInfo.status === 'approved') {
          const empresaId = paymentInfo.metadata?.empresa_id;
          
          if (empresaId) {
             if (!adminDb) {
                await logToDb('webhook_critical', 'No hay conexión a adminDb en webhook', { empresaId, paymentId });
                return NextResponse.json({ error: 'Database connection missing' }, { status: 500 });
             }

             const nextMonth = new Date();
             nextMonth.setMonth(nextMonth.getMonth() + 1);

             await adminDb.collection('empresas').doc(empresaId.toString()).update({
                estado: 'activo',
                fecha_vencimiento: nextMonth,
                plan_actual: paymentInfo.metadata?.plan || 'pro',
                ultimo_pago_id: paymentInfo.id
             });
             
             await logToDb('webhook_success', `Empresa ${empresaId} activada exitosamente`, { paymentId });
             return NextResponse.json({ success: true, message: 'Tenant activado' }, { status: 200 });
          } else {
             await logToDb('webhook_warning', 'Pago aprobado pero sin empresa_id', { paymentId });
          }
       }
    }

    return NextResponse.json({ success: true, message: 'Ignored' }, { status: 200 });
  } catch (error: any) {
    console.error('Error procesando webhook:', error);
    await logToDb('webhook_error', error.message || 'Error desconocido', { stack: error.stack });
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
