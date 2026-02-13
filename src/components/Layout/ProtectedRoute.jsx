import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
    const { user, userProfile, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loader"></div>
                <p>Cargando...</p>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && userProfile && !allowedRoles.includes(userProfile.role)) {
        if (userProfile.role === 'client') {
            return <Navigate to="/client" replace />;
        }
        return <Navigate to="/mechanic" replace />;
    }

    return children;
}
