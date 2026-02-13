import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ref, get } from 'firebase/database';
import { rtdb } from '../../firebase/firebase';
import { Link, useNavigate } from 'react-router-dom';
import { MdEmail, MdLock, MdLogin } from 'react-icons/md';
import toast from 'react-hot-toast';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!identifier || !password) return toast.error('Completa todos los campos');
        setLoading(true);
        try {
            let email = identifier.trim();

            // Si no contiene @, buscar el email por nombre de usuario
            if (!email.includes('@')) {
                const snap = await get(ref(rtdb, 'users'));
                if (snap.exists()) {
                    const users = snap.val();
                    const found = Object.values(users).find(
                        u => u.displayName?.toLowerCase() === email.toLowerCase()
                    );
                    if (found && found.email) {
                        email = found.email;
                    } else {
                        setLoading(false);
                        return toast.error('Usuario no encontrado');
                    }
                } else {
                    setLoading(false);
                    return toast.error('Usuario no encontrado');
                }
            }

            await login(email, password);
            toast.success('¡Bienvenido!');
            navigate('/');
        } catch (err) {
            toast.error(err.code === 'auth/invalid-credential' ? 'Credenciales incorrectas' : 'Error al iniciar sesión');
        }
        setLoading(false);
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">
                    <img src="/logo.jpg" alt="Chontal Racing" className="auth-logo-img" />
                </div>
                <h2>Chontal Racing</h2>
                <p className="auth-subtitle">Sistema de Gestión de Taller</p>
                <form onSubmit={handleSubmit}>
                    <div className="form-group"><label><MdEmail /> Email o Usuario</label><input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)} placeholder="tu@email.com o tu nombre" autoComplete="username" /></div>
                    <div className="form-group"><label><MdLock /> Contraseña</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" autoComplete="current-password" /></div>
                    <button type="submit" className="btn btn-primary btn-block" disabled={loading}>{loading ? <span className="btn-loader"></span> : <><MdLogin /> Iniciar Sesión</>}</button>
                </form>
                <p className="auth-link">¿No tienes cuenta? <Link to="/register">Regístrate aquí</Link></p>
            </div>
        </div>
    );
}
