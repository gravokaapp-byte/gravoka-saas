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
    const isTest = formData.get('isTest') === 'true';
    const amount = 79000; // Plan Full: $79.000 CLP

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
