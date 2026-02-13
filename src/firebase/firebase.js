import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBBqUt8Aitn3Fvj_SCYSgk-3uHrJCnNhTU",
  authDomain: "chontal-racing.firebaseapp.com",
  databaseURL: "https://chontal-racing-default-rtdb.firebaseio.com",
  projectId: "chontal-racing",
  storageBucket: "chontal-racing.firebasestorage.app",
  messagingSenderId: "118155735263",
  appId: "1:118155735263:web:40828fce5f38274cefb96a",
  measurementId: "G-Z07MB0WJF5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const rtdb = getDatabase(app);
export const storage = getStorage(app);
export default app;
