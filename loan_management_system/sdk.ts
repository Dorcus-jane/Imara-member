// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDcSNR2AFYtL0cFzi1RUUCez2fUXpg3RAQ",
  authDomain: "wallet-application-1bd18.firebaseapp.com",
  projectId: "wallet-application-1bd18",
  storageBucket: "wallet-application-1bd18.firebasestorage.app",
  messagingSenderId: "538319305925",
  appId: "1:538319305925:web:bf5678f63ce5f33b83c4ac",
  measurementId: "G-JM3YJWX0P7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);