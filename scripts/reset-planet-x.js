const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value.length > 0) {
    env[key.trim()] = value.join('=').trim().replace(/^"(.*)"$/, '$1');
  }
});

const serviceAccount = {
  clientEmail: env.FIREBASE_CLIENT_EMAIL,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  privateKey: env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const auth = admin.auth();

async function reset() {
  const email = 'demo@planetax.cl';
  const newPassword = 'Gravoka2025*';
  
  try {
    const user = await auth.getUserByEmail(email);
    await auth.updateUser(user.uid, {
      password: newPassword
    });
    console.log(`Password reset for ${email} successfully!`);
    console.log(`New Password: ${newPassword}`);
  } catch (err) {
    console.error('Error reset:', err.message);
  }
}

reset();
