import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendWelcomeEmail = async (email: string, empresaNombre: string) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Gravoka <no-reply@tecno-artificial.com>',
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
      console.error('Error sending welcome email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Unexpected error in sendWelcomeEmail:', err);
    return { success: false, error: err };
  }
};

export const sendAdminRegistrationAlert = async (empresaNombre: string, email: string) => {
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
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Fecha:</strong> ${new Date().toLocaleString()}</li>
          </ul>
          <p><a href="https://www.gravoka.app/admin/empresas">Ver en el Panel Administrador</a></p>
        </div>
      `,
    });

    if (error) {
      console.error('Error sending admin alert:', error);
    }

    return { success: true, data };
  } catch (err) {
    console.error('Unexpected error in admin alert:', err);
    return { success: false, error: err };
  }
};

export const sendPaymentSuccessEmail = async (email: string, empresaNombre: string, plan: string) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Facturación Gravoka <pagos@tecno-artificial.com>',
      to: [email],
      subject: '¡Pago Confirmado! 💳 Acceso Renovado',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #10b981;">Confirmación de Pago</h2>
          <p>Hola ${empresaNombre},</p>
          <p>Te confirmamos que hemos recibido tu pago correctamente. Tu cuenta ha sido actualizada.</p>
          <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bbf7d0;">
            <p style="margin: 0;"><strong>Plan Activo:</strong> ${plan}</p>
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
      console.error('Error sending payment email:', error);
    }

    return { success: true, data };
  } catch (err) {
    console.error('Unexpected error in payment email:', err);
    return { success: false, error: err };
  }
};
