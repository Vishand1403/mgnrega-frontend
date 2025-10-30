// Import Firebase functions
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBqqryLgU-9KNM1qJgmElKiw8YdB_eOff8",
  authDomain: "rural-gov-services.firebaseapp.com",
  projectId: "rural-gov-services",
  storageBucket: "rural-gov-services.firebasestorage.app",
  messagingSenderId: "378836130309",
  appId: "1:378836130309:web:72b64d9c864958b284da6c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);
