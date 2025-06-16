import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, setPersistence, inMemoryPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD7FcqCKdI9GhERG6x7aD3v09vXFQEiPnM",
  authDomain: "bolo-c36b4.firebaseapp.com",
  databaseURL: "https://bolo-c36b4-default-rtdb.firebaseio.com",
  projectId: "bolo-c36b4",
  storageBucket: "bolo-c36b4.firebasestorage.app",
  messagingSenderId: "460614075365",
  appId: "1:460614075365:web:1852a4531a9be87de9250c",
  measurementId: "G-FHYSYNSS78"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

setPersistence(auth, inMemoryPersistence).catch((error) => {
  console.error("❌ Firebase persistence error:", error);
});

export { db, auth };
