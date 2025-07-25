// Firebase configuration
import { initializeApp, getApps } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getDatabase } from "firebase/database"
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: "AIzaSyB84FXYSgsCnPzUsJDEW_OLgNTBUfSxqV4",
  authDomain: "the-e-commerce-web.firebaseapp.com",
  databaseURL: "https://the-e-commerce-web-default-rtdb.firebaseio.com",
  projectId: "the-e-commerce-web",
  storageBucket: "the-e-commerce-web.firebasestorage.app",
  messagingSenderId: "468604550726",
  appId: "1:468604550726:web:41f9f552ccf0e017e0d447",
  measurementId: "G-QRHXY36BZ8"
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
const auth = getAuth(app)
const db = getDatabase(app)
const storage = getStorage(app)

export { app, auth, db, storage }

