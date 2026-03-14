import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "gravoka-7445d",
  appId: "1:766882192546:web:ed44d80aaa1142a6888bfb",
  storageBucket: "gravoka-7445d.firebasestorage.app",
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAj0zByCKhNYSGEZWu3fNMnj-njnn063nI",
  authDomain: "gravoka-7445d.firebaseapp.com",
  messagingSenderId: "766882192546",
  measurementId: "G-Y126QDYXXL"
};

// Initialize Firebase only once
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Auth & Firestore
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
