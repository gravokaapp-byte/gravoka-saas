import { Resend } from 'resend';

// Lazy initialization function to avoid build-time errors
const getResend = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey && process.env.NODE_ENV === 'production') {
    console.warn('RESEND_API_KEY is missing');
  }
  // We use a fallback key to avoid initialization errors during build
  return new Resend(apiKey || 're_missing_key_for_build');
};

export const sendWelcomeEmail = async (email: string, empresaNombre: string) => {
  const resend = getResend();
  try {
    const { data, error } = await resend.emails.send({
      from: 'Gravoka <soporte@tecno-artificial.com>',
      to: [email],
      subject: '¡Bienvenido a Gravoka! 🚀',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #10b981;">¡Hola ${empresaNombre}!</h2>
          <p>Es un placer darte la bienvenida a Gravoka SaaS.</p>
          <p>Has comenzado tu <strong>Prueba de 15 días con Acceso Full</strong>. Durante este tiempo podrás explorar todas las funcionalidades de la plataforma sin límites.</p>
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Tu Plan Actual:</strong> Full (Prueba)</p>
            <p style="margin: 5px 0 0 0;"><strong>Días restantes:</strong> 15</p>
          </div>
          <p>Si tienes alguna duda o necesitas ayuda para configurar tu primera planta, responde a este correo o contacta a nuestro equipo de soporte.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #6b7280;">© 2026 Gravoka. Gestionado por TecnoArtificial.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Error enviando email de bienvenida:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Excepción enviando email de bienvenida:', err);
    return { success: false, error: err };
  }
};

export const sendAdminRegistrationAlert = async (empresaNombre: string, adminEmail: string) => {
  const resend = getResend();
  try {
    const { data, error } = await resend.emails.send({
      from: 'Sistema Gravoka <alertas@tecno-artificial.com>',
      to: ['mvaldes@tecno-artificial.com'],
      subject: `🔔 Nuevo Registro: ${empresaNombre}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Nuevo Registro en la Plataforma</h2>
          <p>Se ha registrado un nuevo cliente:</p>
          <ul>
            <li><strong>Empresa:</strong> ${empresaNombre}</li>
            <li><strong>Email Admin:</strong> ${adminEmail}</li>
            <li><strong>Fecha:</strong> ${new Date().toLocaleString()}</li>
          </ul>
          <p><a href="https://www.gravoka.app/admin/empresas">Ver en el Panel Administrador</a></p>
        </div>
      `,
    });

    if (error) {
      console.error('Error enviando alerta admin:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Excepción enviando alerta admin:', err);
    return { success: false, error: err };
  }
};

export const sendPaymentSuccessEmail = async (email: string, amount: string, plan: string) => {
  const resend = getResend();
  try {
    const { data, error } = await resend.emails.send({
      from: 'Facturación Gravoka <pagos@tecno-artificial.com>',
      to: [email],
      subject: '¡Pago Confirmado! 💳 Acceso Renovado',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #10b981;">Confirmación de Pago</h2>
          <p>Hola,</p>
          <p>Te confirmamos que hemos recibido tu pago correctamente por el plan <strong>${plan}</strong>.</p>
          <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bbf7d0;">
            <p style="margin: 0;"><strong>Monto:</strong> $${amount}</p>
            <p style="margin: 5px 0 0 0;"><strong>Estado:</strong> Activo / Pagado</p>
          </div>
          <p>Ya puedes seguir gestionando tus guías y camiones con normalidad.</p>
          <p>Gracias por confiar en Gravoka.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 11px; color: #9ca3af;">Este es un correo automático, por favor no respondas directamente.</p>
        </div>
      `,
    });

    if (error) {
      console.error('Error enviando email de pago:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Excepción enviando email de pago:', err);
    return { success: false, error: err };
  }
};
