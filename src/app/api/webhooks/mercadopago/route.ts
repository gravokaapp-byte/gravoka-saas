import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '' });

// Este Webhook será invocado por Mercado Pago (Server to Server)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // MercadoPago envia type: "payment" y action: "payment.created"
    if (body.type === 'payment' && body.data?.id) {
       console.log('Webhook de Mercado Pago recibido para pago ID:', body.data.id);
       
       const payment = new Payment(client);
       const paymentInfo = await payment.get({ id: body.data.id });
       
       if (paymentInfo.status === 'approved') {
          // Buscamos la metadata que inyectamos en la Preferencia
          const empresaId = paymentInfo.metadata?.empresa_id;
          
          if (empresaId) {
             console.log(`Pago aprobado para empresa ${empresaId}. Activando cuenta...`);
             
             // Definir próximo vencimiento (ej. +30 días)
             const nextMonth = new Date();
             nextMonth.setMonth(nextMonth.getMonth() + 1);

             // IMPORTANTE: Usamos adminDb de firebase-admin para tener permisos totales
             await adminDb.collection('empresas').doc(empresaId.toString()).update({
                estado: 'activo',
                fecha_vencimiento: nextMonth,
                plan_actual: paymentInfo.metadata?.plan || 'pro',
                ultimo_pago_id: paymentInfo.id
             });
             
             console.log(`Empresa ${empresaId} activada exitosamente!`);
             return NextResponse.json({ success: true, message: 'Tenant activado' }, { status: 200 });
          } else {
             console.warn("Pago aprobado pero sin empresa_id en metadata:", paymentInfo.id);
          }
       }
    }

    return NextResponse.json({ success: true, message: 'Ignored' }, { status: 200 });
  } catch (error) {
    console.error('Error procesando webhook de MercadoPago:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
