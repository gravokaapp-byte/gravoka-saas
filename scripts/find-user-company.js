const admin = require('firebase-admin');

// Use the existing test-admin.js pattern for initialization
const serviceAccount = JSON.parse(`{
  "type": "service_account",
  "project_id": "gravoka-7445d",
  "private_key_id": "84bcd71462ffba90e8a17c7a28e660f921302d4c",
  "private_key": "-----BEGIN PRIVATE KEY-----\\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDElO8gxaTJB4S7\\nWHQM+j/TZTQ3Fx1OLNcLzkrQghtTP6L6JAtU3fgxh0seMFvxmIeWUihA/Tn86Nk+\\nLjNQaLDvBHn9LR10HpV/Z0CEnb5Qze0YvKfpOHY9hH0oLDOeHi47Vf2POWKGbSYi\\nVNH8MRHf00MeH5iGUS5fhzkzx1r8wIg5mM3LEppD1V1a5ZJbtRfgiQKY+P+hsptQ\\nImexyGLa1a02HV/ey4KFJNNbxk+R4iK4+Gul2e3qyrm/3WO+Rx4nigsiEl9ah6ju\\nNGxygOWZxANATebv57UFRyhfO7mMuTrkeYjgv/MvtqA5eQHWfkdM35O7xDfIOR4l\\nuppxsjFBAgMBAAECggEAA1sSgPH2x+q9sJAIPR95fvOTklwt5yN7UUuGeew6qK9l\\nqhT674oxfjDzzpJfQ27J475HyyI3fvJ/oODbheQfnxjptzFxtwV9olTiJFFoCguV\\n4E36JNBOrmqoU0r735dezSsA3tTJMofC9qORiRdSWYqK8wTxjttsafuONazRyA4+\\nnS9N46NVKcJ6FSEERw9be2yXM9QptxJVGJ9nSdHkh2jqNuW9o5b2VzLeNv2lSufU\\nRY77d4tFQGZA7cuvmMz/xzz3owQ/5bAkM5w0nouL4jf/gGC9M4Jk2o9o7hB+gvTC\\n8mWo/ZtyJi4HgoMmzi4exexNznQUvp8bqTz9HySuxQKBgQD+CAkjoJB2cR7uy/6E\\nCnjWUP/sLpb9dK8N3RtZEfrcP6H9jIkfvyxP4yxQPth53lafdDvN0ih4gb4r1/my\\n5uATm2uxlcV7+flhazu+Q8aHmfu7KOtaUzU1bsq8cXSTLsGCm3QBBTZ3a6aZusb6\\noLOf6XgQtOZRKkSrKnmLlRPcDQKBgQDGGu0Q+s3tV1fKdxT1A7B9kDSQdLX6V5CV\\n+8BtXVgsF94/heRyKTWcMw5xLrHuhG+czvJ/2Dcj6Lu0DSlzSkBomRsA0voD8Spd\\nTpdgYZqiPkd1fBIn3xer0bEceX5632vQgSySQ+WHEGSIksuVhY4Gg12BXbt5a5bo\\nojTKaZA5BQKBgFJCe+MjjWQtQV0GhcZwNa0A0b7DX3V3oXAV11NCdT95A5W9OnIj\\nT9AWujTKBQOBsf80fmEp2p0bNl+wMlVyWcE/pOH+o9J/ofef59q2y8UBYfi7SWsY\\nYrSIyfG3s44tp9AJUsk5zOdi3rINP33NKB1yVsTiL2q9Czt6J53BiorJAoGBAIUt\\nsNXLZgj6wOAxsfsNYebnvQ6oB3amy2Ko/jIHoLDz0sttnahJn+rEQB9CvweULNyE\\nG25q0pbnbNicSJNjBW3MD+U78CwaQtq7bPS0aRpNOAj5QdNgHS+7Jo/39VlxPa/M\\nR0SFNJbaJFvUI9z/Df2+7mt7sf7sn2UBNvAki3ppAoGAHQ/7VT9cTZhqVq6DPBMr\\nzt0eSFQZlK4y1N1QLgwCbiv8MpGScoTUj0PiyksRSICHA2YZ4jPmHk6RYgqM4oO1\\nDdaiD/8uEUoJ44WZmt9pBHrLmUowFbjFgvNZfUWOqhdTc0l0b+NtD/1E7l1rU6mJ\\nO59yND5WHRSFB6UAG1Kw5jM=\\n-----END PRIVATE KEY-----\\n",
  "client_email": "firebase-adminsdk-fbsvc@gravoka-7445d.iam.gserviceaccount.com"
}`);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const auth = admin.auth();

async function findUserAndCompany() {
  const email = 'valdes517@hotmail.com';
  console.log(`Searching for user: ${email}`);
  
  try {
    const userRecord = await auth.getUserByEmail(email);
    console.log(`UID: ${userRecord.uid}`);
    
    const userDoc = await db.collection('usuarios').doc(userRecord.uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      const empresaId = userData.empresa_id;
      console.log(`Empresa ID: ${empresaId}`);
      
      const empresaDoc = await db.collection('empresas').doc(empresaId).get();
      if (empresaDoc.exists) {
        const empresaData = empresaDoc.data();
        console.log(`Empresa Nombre: ${empresaData.nombre}`);
        console.log(`Empresa RUT: ${empresaData.rut}`);
        console.log(`Plan Activo: ${empresaData.plan_activo}`);
        console.log(`Creado en: ${empresaData.creado_en}`);
      } else {
        console.log('Empresa document not found.');
      }
    } else {
      console.log('User profile document not found in "usuarios" collection.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

findUserAndCompany();
