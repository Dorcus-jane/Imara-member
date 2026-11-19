import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyDcSNR2AFYtL0cFzi1RUUCez2fUXpg3RAQ',
  authDomain: 'wallet-application-1bd18.firebaseapp.com',
  projectId: 'wallet-application-1bd18',
  storageBucket: 'wallet-application-1bd18.firebasestorage.app',
  messagingSenderId: '538319305925',
  appId: '1:538319305925:web:bf5678f63ce5f33b83c4ac',
  measurementId: 'G-JM3YJWX0P7',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
