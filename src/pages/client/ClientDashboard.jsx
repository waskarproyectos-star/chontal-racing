import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../../firebase/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { MdTwoWheeler, MdBuild, MdCalendarMonth, MdRequestQuote, MdCheckCircle, MdEvent, MdClose, MdPhotoCamera, MdInfo, MdAttachMoney } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import ImageCarousel from '../../components/ImageCarousel';

export default function ClientDashboard() {
    const { user, userProfile } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ motos: 0, activeOrders: 0, completedOrders: 0, appointments: 0, totalSpent: 0 });
    const [recentOrders, setRecentOrders] = useState([]);
    const [nextApt, setNextApt] = useState(null);
    const [loading, setLoading] = useState(true);

    // DETAIL MODAL STATE
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [viewingPhoto, setViewingPhoto] = useState(null);

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
                // Sort by most recent update or creation
                setRecentOrders(list.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)));
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
                <p className="page-subtitle">Hola, {userProfile?.displayName}</p>
            </div>

            <div className="stats-grid">
                <div className="stat-card clickable" onClick={() => navigate('/client/motorcycles')}>
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f093fb, #f5576c)' }}><MdTwoWheeler /></div>
                    <div className="stat-info"><span className="stat-number">{stats.motos}</span><span className="stat-label">Mis Motos</span></div>
                </div>
                {/* Clicking active orders serves as a shortcut, but lists are below too */}
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #4facfe, #00f2fe)' }}><MdBuild /></div>
                    <div className="stat-info"><span className="stat-number">{stats.activeOrders}</span><span className="stat-label">En Taller</span></div>
                </div>
                <div className="stat-card clickable" onClick={() => navigate('/client/appointments')}>
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #43e97b, #38f9d7)' }}><MdCalendarMonth /></div>
                    <div className="stat-info"><span className="stat-number">{stats.appointments}</span><span className="stat-label">Citas</span></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #a18cd1, #fbc2eb)' }}><MdCheckCircle /></div>
                    <div className="stat-info"><span className="stat-number">{stats.completedOrders}</span><span className="stat-label">Historial</span></div>
                </div>
            </div>

            {/* Next Appointment Banner */}
            {nextApt && (
                <div className="next-apt-banner" onClick={() => navigate('/client/appointments')}>
                    <MdCalendarMonth className="next-apt-icon" />
                    <div>
                        <strong>Próxima Cita</strong>
                        <span>{nextApt.serviceType || 'Servicio'} — {nextApt.date ? format(new Date(nextApt.date + 'T12:00:00'), 'dd MMMM', { locale: es }) : ''} {nextApt.time && `a las ${nextApt.time}`}</span>
                    </div>
                </div>
            )}

            {/* Recent orders with task progress */}
            <div className="dashboard-section">
                <h3><MdRequestQuote /> Mis Reparaciones Recientes</h3>
                {recentOrders.length === 0 ? (
                    <div className="empty-state">
                        <p className="text-muted">No tienes reparaciones registradas.</p>
                    </div>
                ) : (
                    <div className="cards-grid">
                        {recentOrders.map(order => {
                            const progress = getTaskProgress(order.tasks);
                            const hasClientParts = order.spareParts?.some(p => p.providedBy === 'client');
                            return (
                                <div key={order.id} className="order-summary-card" onClick={() => setSelectedOrder(order)}>
                                    <div className="order-summary-header">
                                        <span className={`status-badge ${statusClasses[order.status]}`}>{statusLabels[order.status]}</span>
                                        <span className="order-moto">{order.motoName || 'Moto'}</span>
                                    </div>
                                    <p style={{ margin: '0.5rem 0', fontWeight: 600 }}>{order.description}</p>

                                    {/* Progress Bar */}
                                    <div className="task-progress-bar">
                                        <div className="progress-track">
                                            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                                        </div>
                                        <span className="progress-text">{progress}% completado</span>
                                    </div>

                                    {/* Quick Info */}
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        {order.estimatedDate && (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <MdEvent /> {format(new Date(order.estimatedDate + 'T12:00:00'), 'dd MMM', { locale: es })}
                                            </span>
                                        )}
                                        {order.photos && order.photos.length > 0 && (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <MdPhotoCamera /> {order.photos.length} fotos
                                            </span>
                                        )}
                                    </div>

                                    <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <button className="btn btn-sm btn-primary" onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}>
                                            Ver Detalles Completos
                                        </button>
                                        {order.paymentStatus !== 'paid' && order.totalCost > 0 && (
                                            <span className="text-danger" style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>Debes: ${(order.totalCost - (order.payments?.reduce((s, p) => s + p.amount, 0) || 0)).toLocaleString()}</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ORDER DETAIL MODAL */}
            {selectedOrder && (
                <div className="modal-overlay" onClick={() => setSelectedOrder(null)}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Detalle de Reparación</h3>
                            <button className="modal-close" onClick={() => setSelectedOrder(null)}><MdClose /></button>
                        </div>
                        <div className="modal-body" style={{ padding: 0 }}>
                            {/* CAROUSEL OF PHOTOS */}
                            {(selectedOrder.photos && selectedOrder.photos.length > 0) ? (
                                <ImageCarousel images={selectedOrder.photos} />
                            ) : (
                                <div className="no-photos-placeholder" style={{
                                    height: '150px', background: 'var(--bg-secondary)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'var(--text-muted)', flexDirection: 'column', gap: '0.5rem',
                                    borderRadius: '12px 12px 0 0'
                                }}>
                                    <MdPhotoCamera size={32} />
                                    <span>Sin fotos de avance aún</span>
                                </div>
                            )}

                            <div style={{ padding: '1.5rem' }}>
                                <h4 style={{ marginBottom: '0.5rem' }}>{selectedOrder.description}</h4>
                                <p className="text-muted" style={{ marginBottom: '1.5rem' }}>{selectedOrder.motoName}</p>

                                <div className="client-detail-grid">
                                    <div className="detail-item">
                                        <label>Estado</label>
                                        <span className={`status-badge ${statusClasses[selectedOrder.status]}`}>{statusLabels[selectedOrder.status]}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Entrega Estimada</label>
                                        <span>{selectedOrder.estimatedDate ? format(new Date(selectedOrder.estimatedDate + 'T12:00:00'), 'dd MMM yyyy', { locale: es }) : 'Pendiente'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Mecánico</label>
                                        <span>{selectedOrder.mechanicName || 'Asignado'}</span>
                                    </div>
                                    <div className="detail-item">
                                        <label>Total a Pagar</label>
                                        <span>${(selectedOrder.totalCost || 0).toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* TASKS TIMELINE */}
                                <h4 className="section-title" style={{ marginTop: '2rem' }}><MdInfo /> Avance de Tareas</h4>
                                {selectedOrder.tasks && selectedOrder.tasks.length > 0 ? (
                                    <div className="advances-timeline">
                                        {selectedOrder.tasks.map((task, idx) => (
                                            <div key={idx} className="timeline-item">
                                                <div className={`timeline-marker ${task.completed ? 'completed' : ''}`}></div>
                                                <div className="timeline-content">
                                                    <div className="timeline-header">
                                                        <span className="timeline-title">{task.name}</span>
                                                        <span className={`timeline-status ${task.completed ? 'done' : ''}`}>
                                                            {task.completed ? 'Completado' : 'Pendiente'}
                                                        </span>
                                                    </div>
                                                    {task.photo && (
                                                        <img
                                                            src={task.photo}
                                                            alt="Evidencia"
                                                            className="timeline-photo"
                                                            onClick={() => setViewingPhoto(task.photo)}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted">No hay tareas registradas.</p>
                                )}

                                {/* FINANCIAL SUMMARY */}
                                <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span>Total Reparación:</span>
                                        <strong>${(selectedOrder.totalCost || 0).toLocaleString()}</strong>
                                    </div>
                                    {selectedOrder.payments && selectedOrder.payments.map((p, i) => (
                                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', color: '#22c55e', fontSize: '0.9rem' }}>
                                            <span>Abono ({p.method === 'cash' ? 'Efectivo' : p.method === 'transfer' ? 'Transf.' : 'Tarjeta'}):</span>
                                            <span>- ${p.amount.toLocaleString()}</span>
                                        </div>
                                    ))}
                                    <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.5rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                                        <span>Saldo Pendiente:</span>
                                        <strong className={(selectedOrder.totalCost - (selectedOrder.payments?.reduce((s, p) => s + p.amount, 0) || 0)) > 0 ? 'text-danger' : 'text-success'}>
                                            ${(selectedOrder.totalCost - (selectedOrder.payments?.reduce((s, p) => s + p.amount, 0) || 0)).toLocaleString()}
                                        </strong>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* FULLSCREEN PHOTO VIEWER (For individual task photos) */}
            {viewingPhoto && (
                <div className="modal-overlay photo-viewer" onClick={() => setViewingPhoto(null)} style={{ zIndex: 1100 }}>
                    <img src={viewingPhoto} alt="Foto Grande" />
                    <button className="modal-close-float" onClick={() => setViewingPhoto(null)}><MdClose /></button>
                </div>
            )}
        </div>
    );
}
