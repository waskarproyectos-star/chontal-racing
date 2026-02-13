import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../../firebase/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { MdTwoWheeler, MdBuild, MdClose, MdPhotoCamera, MdCheckCircle, MdAddTask, MdExpandMore } from 'react-icons/md';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';

export default function MyMotorcycles() {
    const { user } = useAuth();
    const [motos, setMotos] = useState([]);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMoto, setSelectedMoto] = useState(null);
    const [viewingPhoto, setViewingPhoto] = useState(null);

    useEffect(() => {
        const unsubs = [];
        unsubs.push(onValue(ref(rtdb, 'motorcycles'), snap => {
            if (snap.exists()) {
                const all = Object.entries(snap.val()).map(([id, v]) => ({ id, ...v }));
                setMotos(all.filter(m => m.clientId === user.uid));
            } else { setMotos([]); }
            setLoading(false);
        }));
        unsubs.push(onValue(ref(rtdb, 'workOrders'), snap => {
            if (snap.exists()) {
                const all = Object.entries(snap.val()).map(([id, v]) => ({ id, ...v }));
                setOrders(all.filter(o => o.clientId === user.uid).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
            } else { setOrders([]); }
        }));
        return () => unsubs.forEach(u => u());
    }, [user]);

    const getMotoOrders = (motoId) => orders.filter(o => o.motorcycleId === motoId);
    const getTaskProgress = (tasks) => {
        if (!tasks?.length) return 0;
        return Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100);
    };

    const statusLabels = { pending: 'Pendiente', in_progress: 'En Progreso', waiting_parts: 'Esperando Piezas', completed: 'Completado' };
    const statusClasses = { pending: 'status-pending', in_progress: 'status-progress', waiting_parts: 'status-waiting', completed: 'status-completed' };

    if (loading) return <div className="page-loader"><div className="loader"></div></div>;

    return (
        <div className="page fade-in">
            <div className="page-header">
                <div><h2>Mis Motos</h2><p className="page-subtitle">{motos.length} moto(s) registrada(s)</p></div>
            </div>

            {motos.length === 0 ? (
                <div className="empty-state"><MdTwoWheeler className="empty-icon" /><p>No tienes motos registradas</p><p className="text-muted">Tu mecánico registrará tu moto en el sistema</p></div>
            ) : (
                <div className="cards-grid">
                    {motos.map(moto => {
                        const motoOrders = getMotoOrders(moto.id);
                        const activeOrders = motoOrders.filter(o => o.status !== 'completed');
                        return (
                            <div key={moto.id} className="moto-card-client">
                                {/* Photo gallery */}
                                <div className="moto-photo">
                                    {moto.photos?.length > 0 ? (
                                        <img src={moto.photos[0]} alt={`${moto.brand} ${moto.model}`} onClick={() => setViewingPhoto(moto.photos[0])} />
                                    ) : (
                                        <div className="moto-photo-placeholder"><MdTwoWheeler /></div>
                                    )}
                                    {moto.photos?.length > 1 && <span className="photo-count-badge"><MdPhotoCamera /> {moto.photos.length}</span>}
                                </div>

                                {/* Moto thumbnails */}
                                {moto.photos?.length > 1 && (
                                    <div className="photo-gallery" style={{ padding: '0.5rem 0.75rem' }}>
                                        {moto.photos.map((p, i) => (
                                            <img key={i} src={p} alt="" className="gallery-thumb-sm" onClick={() => setViewingPhoto(p)} />
                                        ))}
                                    </div>
                                )}

                                <div className="moto-info" style={{ padding: '0.75rem' }}>
                                    <h4>{moto.brand} {moto.model}</h4>
                                    <div className="moto-details">
                                        {moto.year && <span>Año: {moto.year}</span>}
                                        {moto.plate && <span>Placa: {moto.plate}</span>}
                                        {moto.color && <span>Color: {moto.color}</span>}
                                    </div>

                                    {activeOrders.length > 0 && (
                                        <div className="active-orders-badge">
                                            <MdBuild /> {activeOrders.length} reparación(es) activa(s)
                                        </div>
                                    )}

                                    <button className="btn btn-sm btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => setSelectedMoto(selectedMoto?.id === moto.id ? null : moto)}>
                                        <MdExpandMore style={{ transform: selectedMoto?.id === moto.id ? 'rotate(180deg)' : 'none', transition: '0.3s' }} />
                                        {motoOrders.length} orden(es) de trabajo
                                    </button>
                                </div>

                                {/* Orders for this moto */}
                                {selectedMoto?.id === moto.id && (
                                    <div className="moto-orders-panel">
                                        {/* ACTIVE ORDERS SECTION */}
                                        {motoOrders.filter(o => o.status !== 'completed').length > 0 && (
                                            <div className="orders-section">
                                                <h5 className="section-title"><MdBuild /> Reparaciones en Curso</h5>
                                                {motoOrders.filter(o => o.status !== 'completed').map(order => {
                                                    const progress = getTaskProgress(order.tasks);
                                                    const payments = order.payments || [];
                                                    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
                                                    const balance = (order.totalCost || 0) - totalPaid;

                                                    return (
                                                        <div key={order.id} className="client-order-card active">
                                                            <div className="order-card-header">
                                                                <span className={`status-badge ${statusClasses[order.status]}`}>{statusLabels[order.status]}</span>
                                                                <span className="order-date">{order.createdAt ? format(new Date(order.createdAt), 'dd MMM yyyy', { locale: es }) : ''}</span>
                                                            </div>
                                                            <h4>{order.description}</h4>

                                                            <div className="task-progress-bar">
                                                                <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }}></div></div>
                                                                <span className="progress-text">{progress}% completado</span>
                                                            </div>

                                                            <div className="tasks-checklist client-tasks">
                                                                {order.tasks?.map((task, i) => (
                                                                    <div key={i} className={`task-item ${task.completed ? 'task-done' : ''}`}>
                                                                        <MdCheckCircle className={`task-check-icon ${task.completed ? 'checked' : ''}`} />
                                                                        <span className={task.completed ? 'task-name-done' : ''}>{task.name}</span>
                                                                        {task.photo && <img src={task.photo} alt="T" className="task-thumb" onClick={() => setViewingPhoto(task.photo)} />}
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            {/* PHOTO GALLERY */}
                                                            {order.photos?.length > 0 && (
                                                                <div className="order-gallery-section">
                                                                    <span className="gallery-label"><MdPhotoCamera /> Fotos del proceso:</span>
                                                                    <div className="order-photo-grid">
                                                                        {order.photos.map((p, i) => <img key={i} src={p} alt="" className="gallery-img" onClick={() => setViewingPhoto(p)} />)}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* PAYMENT STATUS */}
                                                            {order.totalCost > 0 && (
                                                                <div className="order-payment-client">
                                                                    <div className="payment-row">
                                                                        <span>Total: <strong>${(order.totalCost || 0).toLocaleString()}</strong></span>
                                                                        {balance > 0 ? (
                                                                            <span className="text-danger">Por pagar: <strong>${balance.toLocaleString()}</strong></span>
                                                                        ) : (
                                                                            <span className="text-success"><strong>Pagado ✅</strong></span>
                                                                        )}
                                                                    </div>
                                                                    {order.paymentStatus === 'partial' && <div className="payment-progress"><div className="p-progress-fill" style={{ width: `${(totalPaid / order.totalCost) * 100}%` }}></div></div>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* HISTORY SECTION */}
                                        <div className="orders-section">
                                            <h5 className="section-title"><MdHistory /> Historial de Servicios</h5>
                                            {motoOrders.filter(o => o.status === 'completed').length === 0 ? (
                                                <p className="text-muted" style={{ padding: '0.5rem' }}>Aún no hay servicios completados</p>
                                            ) : (
                                                <div className="client-history-list">
                                                    {motoOrders.filter(o => o.status === 'completed').map(order => (
                                                        <div key={order.id} className="history-item-client">
                                                            <div className="h-dot"></div>
                                                            <div className="h-info">
                                                                <div className="h-header">
                                                                    <span className="h-date">{order.createdAt ? format(new Date(order.createdAt), 'dd MMM yyyy', { locale: es }) : ''}</span>
                                                                    <span className="h-cost">${(order.totalCost || 0).toLocaleString()}</span>
                                                                </div>
                                                                <h6>{order.description}</h6>
                                                                <p className="h-mec">Mecánico: {order.mechanicName}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {viewingPhoto && (
                <div className="modal-overlay photo-viewer" onClick={() => setViewingPhoto(null)}>
                    <img src={viewingPhoto} alt="Foto" />
                    <button className="modal-close-float" onClick={() => setViewingPhoto(null)}><MdClose /></button>
                </div>
            )}
        </div>
    );
}
