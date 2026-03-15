import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

export const dynamic = 'force-dynamic';

// Mercado Pago setup: Uses Environment Variable
const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '' });

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const empresaId = formData.get('empresaId');
    const isTest = formData.get('isTest') === 'true';
    const amount = isTest ? 1000 : 49990;

    if (!empresaId) {
      return NextResponse.json({ error: 'Falta empresaId' }, { status: 400 });
    }

    const host = request.headers.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

    // Si no hay token de Mercado Pago configurado
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
       if (isTest) {
         console.log("Simulando activación para prueba...");
         return NextResponse.redirect(`${baseUrl}/suscripcion?status=success&mock=true`, { status: 303 });
       }
       return NextResponse.redirect(`${baseUrl}/suscripcion?error=mercadopago_not_configured`, { status: 303 });
    }

    const preference = new Preference(client);
    
    console.log(`Creando preferencia para empresa: ${empresaId}, monto: ${amount}, isTest: ${isTest}`);

    // El puerto base puede ser variable en producción
    const result = await preference.create({
      body: {
        items: [
          {
            id: isTest ? 'gravoka-test-payment' : 'gravoka-pro-mensual',
            title: isTest ? 'Gravoka SaaS - Pago de Prueba' : 'Gravoka SaaS - Plan Pro (Mensual)',
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
        binary_mode: true, // Forzar aprobación rápida/rechazo directo
        metadata: {
           empresa_id: empresaId.toString(),
           plan: 'pro'
        },
        notification_url: `${baseUrl}/api/webhooks/mercadopago`
      }
    });

    console.log('Preferencia creada exitosamente:', result.id);

    if (result.init_point) {
       return NextResponse.redirect(result.init_point, { status: 303 });
    } else {
       throw new Error("No se pudo generar el init_point de MercadoPago");
    }

  } catch (error) {
    console.error('Error creando preferencia MercadoPago:', error);
    return NextResponse.json({ error: 'Error interno conectando con pasarela' }, { status: 500 });
  }
}
