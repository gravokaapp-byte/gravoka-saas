import { NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { logToDb } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Gateway setup: Uses Environment Variable
const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '' });

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const empresaId = formData.get('empresaId')?.toString();
    const isTest = formData.get('isTest') === 'true';
    const amount = isTest ? 1000 : 49990;

    await logToDb('gateway_init', `Iniciando proceso para ${empresaId}`, { isTest, amount });

    if (!empresaId) {
      return NextResponse.json({ error: 'Falta identificador de empresa' }, { status: 400 });
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
            id: isTest ? 'gravoka-test' : 'gravoka-pro',
            title: isTest ? 'Gravoka SaaS - Pago de Prueba' : 'Gravoka SaaS - Plan Pro',
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
            plan: 'pro'
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
    await logToDb('gateway_error', error.message || 'Error desconocido', { error });
    return NextResponse.json({ error: 'Error al conectar con el servidor de pagos' }, { status: 500 });
  }
}
