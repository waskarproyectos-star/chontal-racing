import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { MdPerson, MdEmail, MdLock, MdPersonAdd } from 'react-icons/md';
import toast from 'react-hot-toast';

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name || !email || !password) return toast.error('Completa todos los campos');
        if (password.length < 6) return toast.error('La contraseña debe tener al menos 6 caracteres');
        setLoading(true);
        try {
            await register(email, password, name, 'client');
            toast.success('¡Cuenta creada! Bienvenido');
            navigate('/');
        } catch (err) {
            toast.error(err.code === 'auth/email-already-in-use' ? 'El email ya está en uso' : 'Error al registrarse');
        }
        setLoading(false);
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-logo">
                    <img src="/logo.jpg" alt="Chontal Racing" className="auth-logo-img" />
                </div>
                <h2>Crear Cuenta</h2>
                <p className="auth-subtitle">Únete a Chontal Racing</p>
                <form onSubmit={handleSubmit}>
                    <div className="form-group"><label><MdPerson /> Nombre</label><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre completo" /></div>
                    <div className="form-group"><label><MdEmail /> Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" autoComplete="email" /></div>
                    <div className="form-group"><label><MdLock /> Contraseña</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" autoComplete="new-password" /></div>
                    <button type="submit" className="btn btn-primary btn-block" disabled={loading}>{loading ? <span className="btn-loader"></span> : <><MdPersonAdd /> Registrarse</>}</button>
                </form>
                <p className="auth-link">¿Ya tienes cuenta? <Link to="/login">Inicia sesión aquí</Link></p>
            </div>
        </div>
    );
}
