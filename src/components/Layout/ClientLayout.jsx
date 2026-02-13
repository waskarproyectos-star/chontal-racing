import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useState } from 'react';
import { MdDashboard, MdTwoWheeler, MdRequestQuote, MdCalendarMonth, MdMiscellaneousServices, MdLogout, MdMenu, MdClose } from 'react-icons/md';
import toast from 'react-hot-toast';
import NotificationBell from '../NotificationBell';

export default function ClientLayout() {
    const { logout, userProfile } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        toast.success('Sesión cerrada');
        navigate('/login');
    };

    const links = [
        { to: '/client', icon: <MdDashboard />, label: 'Mi Panel', end: true },
        { to: '/client/motorcycles', icon: <MdTwoWheeler />, label: 'Mis Motos' },
        { to: '/client/budgets', icon: <MdRequestQuote />, label: 'Presupuestos' },
        { to: '/client/appointments', icon: <MdCalendarMonth />, label: 'Mis Citas' },
        { to: '/client/services', icon: <MdMiscellaneousServices />, label: 'Servicios' },
    ];

    return (
        <div className="app-layout">
            <aside className={`sidebar client-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
                <div className="sidebar-header">
                    <img src="/logo.jpg" alt="Chontal Racing" className="sidebar-logo" />
                    <span className="sidebar-title">Chontal Racing</span>
                    <button className="sidebar-close-mobile" onClick={() => setSidebarOpen(false)}><MdClose /></button>
                </div>
                <nav className="sidebar-nav">
                    {links.map(link => (
                        <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                            {link.icon} <span>{link.label}</span>
                        </NavLink>
                    ))}
                </nav>
                <div className="sidebar-footer">
                    <div className="sidebar-user">
                        <div className="sidebar-user-avatar client-avatar">{(userProfile?.displayName || 'C')[0].toUpperCase()}</div>
                        <div className="sidebar-user-info">
                            <span className="sidebar-user-name">{userProfile?.displayName}</span>
                            <span className="sidebar-user-role">Cliente</span>
                        </div>
                    </div>
                    <button className="btn btn-ghost btn-logout" onClick={handleLogout}><MdLogout /> Cerrar sesión</button>
                </div>
            </aside>
            <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} style={{ display: sidebarOpen ? 'block' : 'none' }}></div>
            <main className="main-content">
                <header className="mobile-header">
                    <button className="menu-toggle" onClick={() => setSidebarOpen(true)}><MdMenu /></button>
                    <img src="/logo.jpg" alt="Chontal Racing" className="mobile-header-logo" />
                    <span className="mobile-header-title">Chontal Racing</span>
                    <NotificationBell />
                </header>
                <Outlet />
            </main>
        </div>
    );
}
