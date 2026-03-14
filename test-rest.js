// Tests the Identity Toolkit REST API directly to sidestep any Firebase SDK networking issues
const API_KEY = "AIzaSyAj0zByCKhNYSGEZWu3fNMnj-njnn063nI";
const targetEmail = "demo@planetax.cl";
const targetPassword = "password123";

async function run() {
  try {
    console.log(`Checking if user ${targetEmail} can login...`);
    const loginRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: targetEmail, password: targetPassword, returnSecureToken: true })
    });
    const loginData = await loginRes.json();
    
    if (loginData.idToken) {
      console.log("LOGIN SUCCESS! UID:", loginData.localId);
      process.exit(0);
    } else if (loginData.error?.message === 'EMAIL_NOT_FOUND' || loginData.error?.message === 'INVALID_LOGIN_CREDENTIALS') {
      console.log(`User does not exist or invalid credentials. Attempting to create user ${targetEmail}...`);
      
      const createRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: targetPassword, returnSecureToken: true })
      });
      const createData = await createRes.json();
      
      if (createData.idToken) {
         console.log("CREATE SUCCESS! UID:", createData.localId);
         process.exit(0);
      } else {
         console.error("CREATE FAILED. Raw API Response:", JSON.stringify(createData, null, 2));
         process.exit(1);
      }
    } else {
      console.error("LOGIN FAILED:", loginData.error);
      process.exit(1);
    }
  } catch (error) {
    console.error("Network or parsing error:", error);
    process.exit(1);
  }
}

run();
