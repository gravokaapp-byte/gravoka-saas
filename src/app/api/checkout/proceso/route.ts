import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { logToDb } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Gateway setup: Uses Environment Variable
const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '' });

export async function POST(request: Request) {
  let empresaId = 'desconocido';
  try {
    const formData = await request.formData();
    empresaId = formData.get('empresaId')?.toString() || 'sin_id';
    const adminEmail = formData.get('email')?.toString() || '';
    const planRequested = formData.get('plan')?.toString() || 'Full';
    const isTest = formData.get('isTest') === 'true';
    
    // --- NUEVO: Obtener precio oficial desde Firestore (Single Source of Truth) ---
    let amount = planRequested === 'Full' ? 79990 : 29990;
    try {
      // Necesitamos usar firebase-admin aquí porque estamos en un Route Handler (Server side)
      // O podemos usar el SDK de cliente si el entorno lo permite, pero mejor Admin si está disponible.
      // Revisando imports... usa 'mercadopago'. 
      // Vemos si hay acceso a admin. 
      const { db } = await import('@/lib/firebase/config');
      const { doc, getDoc } = await import('firebase/firestore');
      
      const saasConfigRef = doc(db, 'config', 'saas');
      const saasConfigSnap = await getDoc(saasConfigRef);
      
      if (saasConfigSnap.exists()) {
        const data = saasConfigSnap.data();
        if (data.pricing) {
          amount = planRequested === 'Full' ? data.pricing.full : data.pricing.startup;
          console.log(`[Checkout] Precio dinámico cargado para ${planRequested}: ${amount}`);
        }
      }
    } catch (dbError) {
      console.error("Error al obtener precio de Firestore, usando fallback:", dbError);
    }

    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) {
       console.error("CRITICAL: MERCADOPAGO_ACCESS_TOKEN is missing in production environment");
       return NextResponse.json({ error: 'Configuración incompleta: Falta Token de Mercado Pago en Vercel.' }, { status: 503 });
    }

    const host = request.headers.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

    // Si no hay token configurado
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
       await logToDb('gateway_error', 'Token MERCADOPAGO_ACCESS_TOKEN no encontrado en variables de entorno');
       return NextResponse.json({ error: 'El sistema de pagos no está configurado. Contacta a soporte.' }, { status: 503 });
    }

    const preference = new Preference(client);
    
    const result = await preference.create({
      body: {
        items: [
          {
            id: isTest ? 'gravoka-test' : `gravoka-${planRequested.toLowerCase()}`,
            title: isTest ? 'Gravoka SaaS - Pago de Prueba' : `Gravoka SaaS - Plan ${planRequested}`,
            quantity: 1,
            unit_price: amount,
            currency_id: 'CLP',
          }
        ],
        back_urls: {
          success: `${baseUrl}/suscripcion?status=success`,
          failure: `${baseUrl}/suscripcion?status=failure`,
          pending: `${baseUrl}/suscripcion?status=pending`
        },
        auto_return: 'approved',
        binary_mode: true,
        metadata: {
            empresa_id: empresaId,
            plan: planRequested,
            email: adminEmail
        },
        notification_url: `${baseUrl}/api/webhooks/mercadopago`
      }
    });

    const isAjax = request.headers.get('accept')?.includes('application/json');

    if (result.init_point) {
       if (isAjax) {
         return NextResponse.json({ url: result.init_point });
       }
       return NextResponse.redirect(new URL(result.init_point), { status: 303 });
    } else {
       if (isAjax) return NextResponse.json({ error: 'No se generó el enlace de pago correctamente' }, { status: 500 });
       throw new Error("No se pudo generar el init_point");
    }

  } catch (error: any) {
    console.error('Error en gateway:', error);
    
    // Intentar loggear el error (si el logger está vivo)
    await logToDb('gateway_error', error.message || 'Error desconocido', { 
      stack: error.stack,
      empresaId: empresaId
    });

    return NextResponse.json({ 
      error: `Error técnico en el servidor: ${error.message || 'Error desconocido'}`,
      details: error.response?.data || null
    }, { status: 500 });
  }
}
