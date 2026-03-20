const fs = require('fs');
const path = require('path');
const { Resend } = require('resend');

// Manual env loading to be 100% sure
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/RESEND_API_KEY=(re_[a-zA-Z0-9_]+)/);
const apiKey = match ? match[1] : null;

if (!apiKey) {
  console.error('❌ No se encontró RESEND_API_KEY en .env.local');
  process.exit(1);
}

console.log('--- Probando Resend con API Key:', apiKey.substring(0, 10) + '... ---');

const resend = new Resend(apiKey);

async function test() {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Gravoka <soporte@tecno-artificial.com>',
      to: ['mvaldes@tecno-artificial.com'],
      subject: '✅ Prueba de Conexión Exitosa - Gravoka',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #10b981; border-radius: 10px;">
          <h2 style="color: #10b981;">¡Conexión Exitosa!</h2>
          <p>Este correo confirma que tu API Key de Resend está funcionando correctamente.</p>
          <p>Los correos de bienvenida, alertas de admin y notificaciones de pago ya están activos.</p>
          <hr />
          <p style="font-size: 12px; color: #666;">Enviado desde el sistema de pruebas de Gravoka.</p>
        </div>
      `
    });

    if (error) {
      console.error('❌ Error de Resend:', error);
    } else {
      console.log('🚀 ¡Correo enviado con éxito!', data);
    }
  } catch (e) {
    console.error('💥 Excepción:', e.message);
  }
}

test();
