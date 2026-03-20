import * as dotenv from 'dotenv';
import path from 'path';

// Cargar .env.local explícitamente
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

import { sendWelcomeEmail, sendAdminRegistrationAlert } from '../src/lib/mail';

async function testEmails() {
  console.log('--- Iniciando prueba de correos con Resend ---');
  
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️  ADVERTENCIA: No se encontró RESEND_API_KEY en el entorno.');
    console.log('Asegúrate de haber añadido la clave en .env.local');
    return;
  }

  try {
    const testEmail = 'mvaldes@tecno-artificial.com'; // Usamos el correo del usuario
    const testEmpresa = 'Tecno Artificial Test';
    
    console.log(`1. Enviando Welcome Email a ${testEmail}...`);
    const welcomeResult = await sendWelcomeEmail(testEmail, testEmpresa);
    console.log('Resultado Welcome:', welcomeResult);
    
    console.log(`2. Enviando Alerta de Admin a mvaldes@tecno-artificial.com...`);
    const adminResult = await sendAdminRegistrationAlert(testEmpresa, 'mvaldes@tecno-artificial.com');
    console.log('Resultado Admin Alert:', adminResult);

    console.log('✅  Prueba finalizada. Revisa tu buzón (y carpeta spam).');
  } catch (error) {
    console.error('❌  Error durante la prueba de correo:', error);
  }
}

testEmails();
