import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../../firebase/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { MdPeople, MdTwoWheeler, MdBuild, MdCalendarMonth, MdAttachMoney, MdFlag, MdEvent } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Dashboard() {
    const { userProfile } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ clients: 0, motos: 0, activeOrders: 0, pendingApts: 0, totalRevenue: 0, monthRevenue: 0, motosInRepair: 0 });
    const [recentOrders, setRecentOrders] = useState([]);
    const [upcomingApts, setUpcomingApts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubs = [];

        // Clients from users node
        unsubs.push(onValue(ref(rtdb, 'users'), snap => {
            if (snap.exists()) {
                const clientCount = Object.values(snap.val()).filter(u => u.role === 'client').length;
                setStats(prev => ({ ...prev, clients: clientCount }));
            }
        }));

        // Motorcycles
        unsubs.push(onValue(ref(rtdb, 'motorcycles'), snap => {
            if (snap.exists()) {
                const list = Object.values(snap.val());
                setStats(prev => ({
                    ...prev,
                    motos: list.length,
                    motosInRepair: list.filter(m => m.status === 'in_repair').length
                }));
            }
        }));

        // Work Orders
        unsubs.push(onValue(ref(rtdb, 'workOrders'), snap => {
            if (snap.exists()) {
                const data = snap.val();
                const list = Object.entries(data).map(([id, v]) => ({ id, ...v }));
                const now = new Date();
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
                const completedThisMonth = list.filter(o => o.status === 'completed' && o.updatedAt >= monthStart);
                const allCompleted = list.filter(o => o.status === 'completed');
                setStats(prev => ({
                    ...prev,
                    activeOrders: list.filter(o => o.status !== 'completed').length,
                    totalRevenue: allCompleted.reduce((s, o) => s + (o.totalCost || 0), 0),
                    monthRevenue: completedThisMonth.reduce((s, o) => s + (o.totalCost || 0), 0)
                }));
                setRecentOrders(list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 5));
            } else {
                setStats(prev => ({ ...prev, activeOrders: 0, totalRevenue: 0, monthRevenue: 0 }));
                setRecentOrders([]);
            }
            setLoading(false);
        }));

        // Appointments
        unsubs.push(onValue(ref(rtdb, 'appointments'), snap => {
            if (snap.exists()) {
                const list = Object.entries(snap.val()).map(([id, v]) => ({ id, ...v }));
                const pending = list.filter(a => a.status === 'pending' || a.status === 'confirmed');
                setStats(prev => ({ ...prev, pendingApts: pending.length }));
                // Upcoming appointments (next 7 days)
                const today = new Date().toISOString().split('T')[0];
                setUpcomingApts(pending.filter(a => a.date >= today).sort((a, b) => (a.date || '').localeCompare(b.date || '')).slice(0, 5));
            }
        }));

        return () => unsubs.forEach(u => u());
    }, []);

    const statusLabels = { pending: 'Pendiente', in_progress: 'En Progreso', waiting_parts: 'Esperando Piezas', completed: 'Completado' };
    const statusClasses = { pending: 'status-pending', in_progress: 'status-progress', waiting_parts: 'status-waiting', completed: 'status-completed' };
    const priorityLabels = { urgent: '🔴 Urgente', high: '🟠 Alta', normal: '🟢 Normal', low: '⚪ Baja' };

    if (loading) return <div className="page-loader"><div className="loader"></div></div>;

    return (
        <div className="dashboard-page fade-in">
            <div className="page-header">
                <h2>Dashboard</h2>
                <p className="page-subtitle">Bienvenido, {userProfile?.displayName}</p>
            </div>

            <div className="stats-grid">
                <div className="stat-card clickable" onClick={() => navigate('/mechanic/clients')}>
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}><MdPeople /></div>
                    <div className="stat-info"><span className="stat-number">{stats.clients}</span><span className="stat-label">Clientes</span></div>
                </div>
                <div className="stat-card clickable" onClick={() => navigate('/mechanic/motorcycles')}>
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f093fb, #f5576c)' }}><MdTwoWheeler /></div>
                    <div className="stat-info"><span className="stat-number">{stats.motos}</span><span className="stat-label">Motos ({stats.motosInRepair} en reparación)</span></div>
                </div>
                <div className="stat-card clickable" onClick={() => navigate('/mechanic/work-orders')}>
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #4facfe, #00f2fe)' }}><MdBuild /></div>
                    <div className="stat-info"><span className="stat-number">{stats.activeOrders}</span><span className="stat-label">Órdenes Activas</span></div>
                </div>
                <div className="stat-card clickable" onClick={() => navigate('/mechanic/appointments')}>
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #43e97b, #38f9d7)' }}><MdCalendarMonth /></div>
                    <div className="stat-info"><span className="stat-number">{stats.pendingApts}</span><span className="stat-label">Citas Pendientes</span></div>
                </div>
                <div className="stat-card stat-revenue">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f5af19, #f12711)' }}><MdAttachMoney /></div>
                    <div className="stat-info"><span className="stat-number">${stats.monthRevenue.toLocaleString()}</span><span className="stat-label">Ingresos del Mes</span></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #a18cd1, #fbc2eb)' }}><MdAttachMoney /></div>
                    <div className="stat-info"><span className="stat-number">${stats.totalRevenue.toLocaleString()}</span><span className="stat-label">Ingresos Totales</span></div>
                </div>
            </div>

            <div className="dashboard-columns">
                {/* Recent Orders */}
                {recentOrders.length > 0 && (
                    <div className="dashboard-section">
                        <h3><MdBuild /> Órdenes Recientes</h3>
                        <div className="table-container">
                            <table className="data-table">
                                <thead><tr><th>Descripción</th><th>Moto</th><th>Prioridad</th><th>Estado</th><th>Total</th></tr></thead>
                                <tbody>
                                    {recentOrders.map(o => (
                                        <tr key={o.id} className="clickable-row" onClick={() => navigate('/mechanic/work-orders')}>
                                            <td><strong>{o.description}</strong></td>
                                            <td>{o.motoName || '—'}</td>
                                            <td>{priorityLabels[o.priority || 'normal']}</td>
                                            <td><span className={`status-badge ${statusClasses[o.status]}`}>{statusLabels[o.status]}</span></td>
                                            <td className="text-right">${(o.totalCost || 0).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Upcoming Appointments */}
                {upcomingApts.length > 0 && (
                    <div className="dashboard-section">
                        <h3><MdCalendarMonth /> Próximas Citas</h3>
                        <div className="upcoming-apts-list">
                            {upcomingApts.map(apt => (
                                <div key={apt.id} className="upcoming-apt-card" onClick={() => navigate('/mechanic/appointments')}>
                                    <div className="upcoming-apt-date">
                                        <span className="apt-day">{apt.date ? format(new Date(apt.date + 'T12:00:00'), 'dd', { locale: es }) : '—'}</span>
                                        <span className="apt-month">{apt.date ? format(new Date(apt.date + 'T12:00:00'), 'MMM', { locale: es }) : ''}</span>
                                    </div>
                                    <div className="upcoming-apt-info">
                                        <strong>{apt.clientName || 'Cliente'}</strong>
                                        <span>{apt.serviceType || 'Servicio'} {apt.time && `• ${apt.time}`}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
