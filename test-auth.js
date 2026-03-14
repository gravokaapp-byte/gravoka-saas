const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const app = initializeApp({
  apiKey: "AIzaSyAj0zByCKhNYSGEZWu3fNMnj-njnn063nI",
  projectId: "gravoka-7445d"
});

const auth = getAuth(app);

signInWithEmailAndPassword(auth, 'demo@planetax.cl', 'password123')
  .then((userCredential) => {
    console.log("SUCCESS. UID:", userCredential.user.uid);
    process.exit(0);
  })
  .catch((error) => {
    console.error("FAILED. Code:", error.code);
    console.error("Message:", error.message);
    process.exit(1);
  });
