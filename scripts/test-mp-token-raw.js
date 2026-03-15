const accessToken = 'APP_USR-2218746377122088-031410-d542363222ae3f1ef07924c7ebf1f2dd-13862654';

async function testTokenRaw() {
  console.log('--- TESTEANDO TOKEN (RAW FETCH) ---');
  try {
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        items: [{ title: 'Test', quantity: 1, unit_price: 100 }]
      })
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error in fetch:', err.message);
  }
}

testTokenRaw();
