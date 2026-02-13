import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { getDatabase, ref, set } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyBBqUt8Aitn3Fvj_SCYSgk-3uHrJCnNhTU",
    authDomain: "chontal-racing.firebaseapp.com",
    databaseURL: "https://chontal-racing-default-rtdb.firebaseio.com",
    projectId: "chontal-racing",
    storageBucket: "chontal-racing.firebasestorage.app",
    messagingSenderId: "118155735263",
    appId: "1:118155735263:web:40828fce5f38274cefb96a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

try {
    const cred = await createUserWithEmailAndPassword(auth, "waskareliasrios11@gmail.com", "111987");
    await updateProfile(cred.user, { displayName: "Waskar" });
    await set(ref(db, `users/${cred.user.uid}`), {
        displayName: "Waskar",
        email: "waskareliasrios11@gmail.com",
        role: "admin",
        createdAt: Date.now()
    });
    console.log("✅ Usuario ADMIN creado exitosamente!");
    console.log("   Email: waskareliasrios11@gmail.com");
    console.log("   Password: 111987");
    console.log("   Rol: admin");
    console.log("   UID:", cred.user.uid);
    process.exit(0);
} catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
}
