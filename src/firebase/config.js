// Firebase configuration
// Replace these placeholder values with your actual Firebase project credentials.
// Get them from: https://console.firebase.google.com → Your Project → Project Settings → General → Your apps

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBfIPR42_KnwwHBb87yjDEYajHFM5rp2IM",
  authDomain: "fund-evde.firebaseapp.com",
  projectId: "fund-evde",
  storageBucket: "fund-evde.firebasestorage.app",
  messagingSenderId: "599002514293",
  appId: "1:599002514293:web:e969d4b92dee0bb5e8093c",
  measurementId: "G-6T47VQ8PQD"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
