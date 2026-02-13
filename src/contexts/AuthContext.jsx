import { createContext, useContext, useState, useEffect } from 'react';
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    updateProfile
} from 'firebase/auth';
import { ref, get, set, onValue } from 'firebase/database';
import { auth, rtdb } from '../firebase/firebase';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let profileUnsub = null;

        const authUnsub = onAuthStateChanged(auth, (firebaseUser) => {
            // Limpiar listener anterior de perfil
            if (profileUnsub) {
                profileUnsub();
                profileUnsub = null;
            }

            if (firebaseUser) {
                setUser(firebaseUser);
                // Escuchar cambios de perfil en tiempo real
                profileUnsub = onValue(ref(rtdb, `users/${firebaseUser.uid}`), (snap) => {
                    if (snap.exists()) {
                        setUserProfile(snap.val());
                    } else {
                        setUserProfile(null);
                    }
                    setLoading(false);
                }, (err) => {
                    console.error('Error fetching profile:', err);
                    setLoading(false);
                });
            } else {
                setUser(null);
                setUserProfile(null);
                setLoading(false);
            }
        });

        return () => {
            authUnsub();
            if (profileUnsub) profileUnsub();
        };
    }, []);

    const login = (email, password) => signInWithEmailAndPassword(auth, email, password);

    const register = async (email, password, displayName, role = 'client') => {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName });
        const profile = {
            displayName,
            email,
            role,
            createdAt: Date.now()
        };
        await set(ref(rtdb, `users/${cred.user.uid}`), profile);
        setUserProfile(profile);
        return cred;
    };

    const logout = () => signOut(auth);

    const isAdmin = userProfile?.role === 'admin';
    const isMechanic = userProfile?.role === 'mechanic' || userProfile?.role === 'admin';
    const isClient = userProfile?.role === 'client';

    return (
        <AuthContext.Provider value={{ user, userProfile, loading, login, register, logout, isAdmin, isMechanic, isClient }}>
            {children}
        </AuthContext.Provider>
    );
}
