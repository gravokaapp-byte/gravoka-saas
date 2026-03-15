const { MercadoPagoConfig, Preference } = require('mercadopago');

const accessToken = 'APP_USR-2218746377122088-031410-d542363222ae3f1ef07924c7ebf1f2dd-13862654';

async function testToken() {
  console.log('--- TESTEANDO TOKEN DE MERCADO PAGO ---');
  const client = new MercadoPagoConfig({ accessToken });
  const preference = new Preference(client);

  try {
    const response = await preference.create({
      body: {
        items: [{ title: 'Suscripcion Gravoka Pro', quantity: 1, unit_price: 1000 }],
        back_urls: { 
          success: 'https://gravoka.app/suscripcion?status=success',
          failure: 'https://gravoka.app/suscripcion?status=failure'
        },
        auto_return: 'approved'
      }
    });
    console.log('✅ TOKEN VÁLIDO. Preference ID:', response.id);
    console.log('URL de pago:', response.init_point);
  } catch (error) {
    console.error('❌ TOKEN INVÁLIDO o ERROR DE MP:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.log('Error:', error.message);
    }
  }
}

testToken();
