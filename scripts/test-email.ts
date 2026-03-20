import { sendWelcomeEmail, sendAdminRegistrationAlert } from '../src/lib/mail';

async function testEmails() {
  console.log('--- Iniciando prueba de correos con Resend ---');
  
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️  ADVERTENCIA: No se encontró RESEND_API_KEY en el entorno.');
    console.log('Asegúrate de haber añadido la clave en .env.local');
    // Si estás ejecutándolo manualmente fuera de Next.js, 
    // podrías necesitar cargar dotenv.
    return;
  }

  try {
    const testEmail = 'tu-email-de-prueba@ejemplo.com'; // Cambia esto para probar
    const testEmpresa = 'Empresa de Prueba Gravoka';
    
    console.log(`1. Enviando Welcome Email a ${testEmail}...`);
    // await sendWelcomeEmail(testEmail, 'Cliente de Prueba');
    
    console.log(`2. Enviando Alerta de Admin a mvaldes@tecno-artificial.com...`);
    // await sendAdminRegistrationAlert(testEmpresa, 'Prueba Técnica');

    console.log('✅  Prueba finalizada. Revisa tu buzón (y carpeta spam).');
  } catch (error) {
    console.error('❌  Error durante la prueba de correo:', error);
  }
}

// Para ejecutar: npx ts-node -r dotenv/config test-email.ts
// (necesitas instalar ts-node y dotenv si no los tienes)
// testEmails();
