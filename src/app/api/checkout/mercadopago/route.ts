import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';

export const dynamic = 'force-dynamic';

// Mercado Pago setup: Uses Environment Variable
const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '' });

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const empresaId = formData.get('empresaId');

    if (!empresaId) {
      return NextResponse.json({ error: 'Falta empresaId' }, { status: 400 });
    }

    const host = request.headers.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;

    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
       console.warn("Mercado Pago no configurado. Simularíamos pago exitoso aquí en DEV.");
       return NextResponse.redirect(`${baseUrl}/suscripcion?error=mercadopago_not_configured`, { status: 303 });
    }

    const preference = new Preference(client);
    
    // El puerto base puede ser variable en producción (ej. https://miapp.cl)
    const result = await preference.create({
      body: {
        items: [
          {
            id: 'gravoka-pro-mensual',
            title: 'Gravoka SaaS - Plan Pro (Mensual)',
            quantity: 1,
            unit_price: 49990,
            currency_id: 'CLP',
          }
        ],
        back_urls: {
          success: `${baseUrl}/suscripcion?status=success`,
          failure: `${baseUrl}/suscripcion?status=failure`,
          pending: `${baseUrl}/suscripcion?status=pending`
        },
        auto_return: 'approved',
        // metadata es CRÍTICO: aquí guardamos qué empresa está pagando para activarla luego en el Webhook
        metadata: {
           empresa_id: empresaId.toString(),
           plan: 'pro'
        },
        // Donde enviaremos la confirmación en segundo plano (Server to Server)
        notification_url: `${baseUrl}/api/webhooks/mercadopago`
      }
    });

    if (result.init_point) {
       // Redirigir al usuario a la pasarela de pagos de Mercado Pago
       return NextResponse.redirect(result.init_point, { status: 303 });
    } else {
       throw new Error("No se pudo generar el init_point de MercadoPago");
    }

  } catch (error) {
    console.error('Error creando preferencia MercadoPago:', error);
    return NextResponse.json({ error: 'Error interno conectando con pasarela' }, { status: 500 });
  }
}
