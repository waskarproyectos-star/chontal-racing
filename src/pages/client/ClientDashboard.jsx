import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../../firebase/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { MdTwoWheeler, MdBuild, MdCalendarMonth, MdRequestQuote, MdCheckCircle, MdAttachMoney, MdEvent } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ClientDashboard() {
    const { user, userProfile } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ motos: 0, activeOrders: 0, completedOrders: 0, appointments: 0, totalSpent: 0 });
    const [recentOrders, setRecentOrders] = useState([]);
    const [nextApt, setNextApt] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const unsubs = [];

        unsubs.push(onValue(ref(rtdb, 'motorcycles'), snap => {
            if (snap.exists()) {
                const list = Object.values(snap.val()).filter(m => m.clientId === user.uid);
                setStats(prev => ({ ...prev, motos: list.length }));
            }
        }));

        unsubs.push(onValue(ref(rtdb, 'workOrders'), snap => {
            if (snap.exists()) {
                const list = Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })).filter(o => o.clientId === user.uid);
                const completed = list.filter(o => o.status === 'completed');
                setStats(prev => ({
                    ...prev,
                    activeOrders: list.filter(o => o.status !== 'completed').length,
                    completedOrders: completed.length,
                    totalSpent: completed.reduce((s, o) => s + (o.totalCost || 0), 0)
                }));
                setRecentOrders(list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 4));
            }
            setLoading(false);
        }));

        unsubs.push(onValue(ref(rtdb, 'appointments'), snap => {
            if (snap.exists()) {
                const list = Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })).filter(a => a.clientId === user.uid);
                const pending = list.filter(a => a.status === 'pending' || a.status === 'confirmed');
                setStats(prev => ({ ...prev, appointments: pending.length }));
                const today = new Date().toISOString().split('T')[0];
                const next = pending.filter(a => a.date >= today).sort((a, b) => (a.date || '').localeCompare(b.date || ''))[0];
                setNextApt(next || null);
            }
        }));

        return () => unsubs.forEach(u => u());
    }, [user]);

    const statusLabels = { pending: 'Pendiente', in_progress: 'En Progreso', waiting_parts: 'Esperando Piezas', completed: 'Completado' };
    const statusClasses = { pending: 'status-pending', in_progress: 'status-progress', waiting_parts: 'status-waiting', completed: 'status-completed' };

    const getTaskProgress = (tasks) => {
        if (!tasks?.length) return 0;
        return Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100);
    };

    if (loading) return <div className="page-loader"><div className="loader"></div></div>;

    return (
        <div className="dashboard-page fade-in">
            <div className="page-header">
                <h2>Mi Panel</h2>
                <p className="page-subtitle">Bienvenido, {userProfile?.displayName}</p>
            </div>

            <div className="stats-grid">
                <div className="stat-card clickable" onClick={() => navigate('/client/motorcycles')}>
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f093fb, #f5576c)' }}><MdTwoWheeler /></div>
                    <div className="stat-info"><span className="stat-number">{stats.motos}</span><span className="stat-label">Mis Motos</span></div>
                </div>
                <div className="stat-card clickable" onClick={() => navigate('/client/motorcycles')}>
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #4facfe, #00f2fe)' }}><MdBuild /></div>
                    <div className="stat-info"><span className="stat-number">{stats.activeOrders}</span><span className="stat-label">Reparaciones Activas</span></div>
                </div>
                <div className="stat-card clickable" onClick={() => navigate('/client/appointments')}>
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #43e97b, #38f9d7)' }}><MdCalendarMonth /></div>
                    <div className="stat-info"><span className="stat-number">{stats.appointments}</span><span className="stat-label">Citas Pendientes</span></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #a18cd1, #fbc2eb)' }}><MdCheckCircle /></div>
                    <div className="stat-info"><span className="stat-number">{stats.completedOrders}</span><span className="stat-label">Reparaciones Completadas</span></div>
                </div>
            </div>

            {/* Next Appointment Banner */}
            {nextApt && (
                <div className="next-apt-banner" onClick={() => navigate('/client/appointments')}>
                    <MdCalendarMonth className="next-apt-icon" />
                    <div>
                        <strong>Próxima Cita</strong>
                        <span>{nextApt.serviceType || 'Servicio'} — {nextApt.date ? format(new Date(nextApt.date + 'T12:00:00'), 'dd MMMM yyyy', { locale: es }) : ''} {nextApt.time && `a las ${nextApt.time}`}</span>
                    </div>
                </div>
            )}

            {/* Recent orders with task progress */}
            {recentOrders.length > 0 && (
                <div className="dashboard-section">
                    <h3><MdRequestQuote /> Mis Reparaciones</h3>
                    <div className="cards-grid">
                        {recentOrders.map(order => {
                            const progress = getTaskProgress(order.tasks);
                            const hasClientParts = order.spareParts?.some(p => p.providedBy === 'client');
                            return (
                                <div key={order.id} className="order-summary-card" onClick={() => navigate('/client/motorcycles')}>
                                    <div className="order-summary-header">
                                        <span className={`status-badge ${statusClasses[order.status]}`}>{statusLabels[order.status]}</span>
                                        <span className="order-moto">{order.motoName || 'Moto'}</span>
                                    </div>
                                    <p style={{ margin: '0.35rem 0', fontWeight: 600 }}>{order.description}</p>

                                    {order.tasks?.length > 0 && (
                                        <div className="task-progress-bar" style={{ margin: '0.4rem 0' }}>
                                            <div className="progress-track">
                                                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                                            </div>
                                            <span className="progress-text">{progress}% completado</span>
                                        </div>
                                    )}

                                    {order.estimatedDate && (
                                        <span className="text-muted" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <MdEvent /> Entrega: {format(new Date(order.estimatedDate + 'T12:00:00'), 'dd MMM yyyy', { locale: es })}
                                        </span>
                                    )}

                                    {hasClientParts && <span className="client-parts-badge" style={{ marginTop: '0.3rem' }}>👤 Traje repuesto(s)</span>}
                                    {order.totalCost > 0 && <span className="order-cost">Total: ${order.totalCost.toLocaleString()}</span>}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
