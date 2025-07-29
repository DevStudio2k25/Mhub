// Firebase configuration
import { initializeApp, getApps } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: "AIzaSyAucdOZ659enQK0Vlg2MEx7eJmLFcUxVYg",
  authDomain: "movies-35801.firebaseapp.com",
  projectId: "movies-35801",
  storageBucket: "movies-35801.appspot.com",
  messagingSenderId: "1006618170751",
  appId: "1:1006618170751:web:d5d28ad8030ad30740364a",
  measurementId: "G-0ZPKR7PWQ2"
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const auth = getAuth(app)
const db = getFirestore(app)
const storage = getStorage(app)

export { app, auth, db, storage }

