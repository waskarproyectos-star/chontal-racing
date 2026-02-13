import { useState, useEffect } from 'react';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { rtdb } from '../../firebase/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { compressToBase64 } from '../../utils/compressToBase64';
import { MdAdd, MdEdit, MdDelete, MdClose, MdTwoWheeler, MdSearch, MdPhotoCamera, MdHistory, MdBuild, MdCheckCircle, MdExpandMore } from 'react-icons/md';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';

export default function Motorcycles() {
    const { userProfile } = useAuth();
    const [motos, setMotos] = useState([]);
    const [clients, setClients] = useState([]);
    const [orders, setOrders] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ brand: '', model: '', year: '', plate: '', color: '', clientId: '', status: 'active' });
    const [photos, setPhotos] = useState([]);
    const [existingPhotos, setExistingPhotos] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [viewingPhoto, setViewingPhoto] = useState(null);
    const [historyMoto, setHistoryMoto] = useState(null);

    useEffect(() => {
        const unsubs = [];
        unsubs.push(onValue(ref(rtdb, 'motorcycles'), snap => {
            setMotos(snap.exists() ? Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })) : []);
            setLoading(false);
        }));
        unsubs.push(onValue(ref(rtdb, 'users'), snap => {
            if (snap.exists()) {
                setClients(Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })).filter(u => u.role === 'client'));
            }
        }));
        unsubs.push(onValue(ref(rtdb, 'workOrders'), snap => {
            setOrders(snap.exists() ? Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)) : []);
        }));
        return () => unsubs.forEach(u => u());
    }, []);

    const filtered = search ? motos.filter(m =>
        `${m.brand} ${m.model} ${m.plate} ${m.clientName}`.toLowerCase().includes(search.toLowerCase())
    ) : motos;

    const getMotoOrders = (motoId) => orders.filter(o => o.motorcycleId === motoId);

    const getTaskProgress = (tasks) => {
        if (!tasks?.length) return 0;
        return Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100);
    };

    const openModal = (moto = null) => {
        if (moto) {
            setEditing(moto);
            setForm({ brand: moto.brand || '', model: moto.model || '', year: moto.year || '', plate: moto.plate || '', color: moto.color || '', clientId: moto.clientId || '', status: moto.status || 'active' });
            setExistingPhotos(moto.photos || []);
        } else {
            setEditing(null);
            setForm({ brand: '', model: '', year: '', plate: '', color: '', clientId: '', status: 'active' });
            setExistingPhotos([]);
        }
        setPhotos([]);
        setModal(true);
    };

    const handlePhotos = async (e) => {
        const files = Array.from(e.target.files);
        const totalPhotos = existingPhotos.length + photos.length + files.length;
        if (totalPhotos > 5) return toast.error('Máximo 5 fotos por moto');
        setUploading(true);
        try {
            const compressed = await Promise.all(files.map(f => compressToBase64(f, 800, 0.4)));
            setPhotos(prev => [...prev, ...compressed]);
            toast.success(`${files.length} foto(s) comprimida(s)`);
        } catch (err) { toast.error('Error al procesar fotos'); }
        setUploading(false);
    };

    const removeNewPhoto = (i) => setPhotos(prev => prev.filter((_, idx) => idx !== i));
    const removeExistingPhoto = (i) => setExistingPhotos(prev => prev.filter((_, idx) => idx !== i));

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.brand || !form.model) return toast.error('Marca y modelo son obligatorios');
        if (!form.clientId) return toast.error('Debes asignar la moto a un cliente');
        const client = clients.find(c => c.id === form.clientId);
        try {
            const allPhotos = [...existingPhotos, ...photos];
            const data = {
                ...form,
                clientName: client?.displayName || '',
                photos: allPhotos,
                updatedAt: Date.now()
            };
            if (editing) {
                await update(ref(rtdb, `motorcycles/${editing.id}`), data);
                toast.success('Moto actualizada');
            } else {
                data.createdAt = Date.now();
                await push(ref(rtdb, 'motorcycles'), data);
                toast.success('Moto registrada');
            }
            setModal(false);
        } catch (err) { toast.error('Error al guardar'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar moto?')) return;
        try { await remove(ref(rtdb, `motorcycles/${id}`)); toast.success('Moto eliminada'); } catch (err) { toast.error('Error'); }
    };

    const statusLabels = { active: 'Activa', in_repair: 'En Reparación' };
    const statusClasses = { active: 'status-completed', in_repair: 'status-progress' };
    const orderStatus = { pending: 'Pendiente', in_progress: 'En Progreso', waiting_parts: 'Esperando Piezas', completed: 'Completado' };
    const orderStatusCls = { pending: 'status-pending', in_progress: 'status-progress', waiting_parts: 'status-waiting', completed: 'status-completed' };

    if (loading) return <div className="page-loader"><div className="loader"></div></div>;

    return (
        <div className="page fade-in">
            <div className="page-header">
                <div><h2>Motos</h2><p className="page-subtitle">{motos.length} motos registradas</p></div>
                <button className="btn btn-primary" onClick={() => openModal()}><MdAdd /> Nueva Moto</button>
            </div>

            <div className="search-bar">
                <MdSearch className="search-icon" />
                <input type="text" placeholder="Buscar por marca, modelo, placa o cliente..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {filtered.length === 0 ? (
                <div className="empty-state"><MdTwoWheeler className="empty-icon" /><p>No hay motos registradas</p></div>
            ) : (
                <div className="cards-grid">
                    {filtered.map(moto => {
                        const motoOrders = getMotoOrders(moto.id);
                        const activeOrders = motoOrders.filter(o => o.status !== 'completed');
                        const completedOrders = motoOrders.filter(o => o.status === 'completed');
                        return (
                            <div key={moto.id} className="moto-card">
                                <div className="moto-photo">
                                    {moto.photos?.length > 0 ? (
                                        <img src={moto.photos[0]} alt={`${moto.brand} ${moto.model}`} loading="lazy" onClick={() => setViewingPhoto(moto.photos[0])} />
                                    ) : (
                                        <div className="moto-photo-placeholder"><MdTwoWheeler /></div>
                                    )}
                                    <span className={`status-badge ${statusClasses[moto.status]}`}>{statusLabels[moto.status]}</span>
                                    {moto.photos?.length > 1 && <span className="photo-count-badge"><MdPhotoCamera /> {moto.photos.length}</span>}
                                </div>
                                <div className="moto-info" style={{ padding: '0.75rem' }}>
                                    <h4>{moto.brand} {moto.model}</h4>
                                    <div className="moto-details">
                                        {moto.year && <span>Año: {moto.year}</span>}
                                        {moto.plate && <span>Placa: {moto.plate}</span>}
                                        {moto.color && <span>Color: {moto.color}</span>}
                                    </div>
                                    <span className="moto-client">Cliente: {moto.clientName || 'Sin asignar'}</span>

                                    {/* Order counts summary */}
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                                        {activeOrders.length > 0 && (
                                            <span className="active-orders-badge"><MdBuild /> {activeOrders.length} activa(s)</span>
                                        )}
                                        {completedOrders.length > 0 && (
                                            <span className="completed-orders-badge"><MdCheckCircle /> {completedOrders.length} completada(s)</span>
                                        )}
                                    </div>
                                </div>
                                <div className="card-actions">
                                    <div className="action-btns">
                                        <button className="btn btn-sm btn-accent" onClick={() => setHistoryMoto(historyMoto?.id === moto.id ? null : moto)}>
                                            <MdHistory /> Historial ({motoOrders.length})
                                        </button>
                                        <button className="btn btn-sm btn-ghost" onClick={() => openModal(moto)}><MdEdit /> Editar</button>
                                        <button className="btn btn-sm btn-danger-ghost" onClick={() => handleDelete(moto.id)}><MdDelete /></button>
                                    </div>
                                </div>

                                {/* ORDER HISTORY PANEL */}
                                {historyMoto?.id === moto.id && (
                                    <div className="moto-orders-panel">
                                        <h4 className="history-title"><MdHistory /> Historial de Reparaciones</h4>
                                        {motoOrders.length === 0 ? (
                                            <p className="text-muted" style={{ padding: '0.5rem' }}>Sin órdenes de trabajo registradas</p>
                                        ) : (
                                            <div className="history-timeline">
                                                {motoOrders.map(order => {
                                                    const progress = getTaskProgress(order.tasks);
                                                    return (
                                                        <div key={order.id} className="history-item">
                                                            <div className="history-dot"></div>
                                                            <div className="history-content">
                                                                <div className="history-header">
                                                                    <span className={`status-badge ${orderStatusCls[order.status]}`}>{orderStatus[order.status]}</span>
                                                                    <span className="history-date">
                                                                        {order.createdAt ? format(new Date(order.createdAt), 'dd MMM yyyy', { locale: es }) : ''}
                                                                    </span>
                                                                </div>
                                                                <h5>{order.description}</h5>
                                                                <span className="text-muted" style={{ fontSize: '0.8rem' }}>Mecánico: {order.mechanicName}</span>

                                                                {/* Task progress */}
                                                                {order.tasks?.length > 0 && (
                                                                    <div className="task-progress-bar" style={{ marginTop: '0.5rem' }}>
                                                                        <div className="progress-track">
                                                                            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                                                                        </div>
                                                                        <span className="progress-text">{order.tasks.filter(t => t.completed).length}/{order.tasks.length} tareas</span>
                                                                    </div>
                                                                )}

                                                                {/* Tasks list */}
                                                                {order.tasks?.length > 0 && (
                                                                    <div className="history-tasks">
                                                                        {order.tasks.map((t, ti) => (
                                                                            <span key={ti} className={`history-task-chip ${t.completed ? 'chip-done' : ''}`}>
                                                                                {t.completed ? <MdCheckCircle /> : '○'} {t.name}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                {/* Spare parts */}
                                                                {order.spareParts?.length > 0 && (
                                                                    <div className="history-parts">
                                                                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>Repuestos: </span>
                                                                        {order.spareParts.map((p, pi) => (
                                                                            <span key={pi} className="part-chip">{p.name} ×{p.quantity}</span>
                                                                        ))}
                                                                    </div>
                                                                )}

                                                                {/* Cost */}
                                                                {order.totalCost > 0 && (
                                                                    <div className="history-cost">
                                                                        Total: <strong>${order.totalCost.toLocaleString()}</strong>
                                                                        {order.laborCost > 0 && <span className="text-muted"> (M.O: ${order.laborCost.toLocaleString()})</span>}
                                                                    </div>
                                                                )}

                                                                {/* Process photos */}
                                                                {order.photos?.length > 0 && (
                                                                    <div className="photo-gallery" style={{ marginTop: '0.5rem' }}>
                                                                        {order.photos.map((p, i) => <img key={i} src={p} alt="" className="gallery-thumb-sm" onClick={() => setViewingPhoto(p)} />)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {modal && (
                <div className="modal-overlay" onClick={() => setModal(false)}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editing ? 'Editar Moto' : 'Nueva Moto'}</h3>
                            <button className="modal-close" onClick={() => setModal(false)}><MdClose /></button>
                        </div>
                        <form onSubmit={handleSave} className="modal-body">
                            <div className="form-group">
                                <label>Cliente *</label>
                                <select value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value }))}>
                                    <option value="">— Seleccionar cliente —</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.displayName} ({c.email})</option>)}
                                </select>
                                {clients.length === 0 && <p className="text-muted" style={{ marginTop: '0.3rem' }}>No hay clientes. Primero registra un cliente.</p>}
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label>Marca *</label><input type="text" value={form.brand} onChange={e => setForm(p => ({ ...p, brand: e.target.value }))} placeholder="Honda, Yamaha..." /></div>
                                <div className="form-group"><label>Modelo *</label><input type="text" value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} placeholder="CRF 250, YZ 450..." /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label>Año</label><input type="text" value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))} placeholder="2024" /></div>
                                <div className="form-group"><label>Placa</label><input type="text" value={form.plate} onChange={e => setForm(p => ({ ...p, plate: e.target.value }))} /></div>
                                <div className="form-group"><label>Color</label><input type="text" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} /></div>
                            </div>
                            <div className="form-group">
                                <label>Estado</label>
                                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                                    <option value="active">Activa</option><option value="in_repair">En Reparación</option>
                                </select>
                            </div>

                            <div className="form-section">
                                <h4><MdPhotoCamera /> Fotos (máx. 5)</h4>
                                {existingPhotos.length > 0 && (
                                    <div className="photo-gallery" style={{ marginBottom: '0.75rem' }}>
                                        {existingPhotos.map((p, i) => (
                                            <div key={i} className="photo-thumb-wrap">
                                                <img src={p} alt={`Foto ${i + 1}`} className="gallery-thumb" onClick={() => setViewingPhoto(p)} />
                                                <button type="button" className="photo-remove" onClick={() => removeExistingPhoto(i)}>×</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {photos.length > 0 && (
                                    <div className="photo-gallery" style={{ marginBottom: '0.75rem' }}>
                                        {photos.map((p, i) => (
                                            <div key={i} className="photo-thumb-wrap">
                                                <img src={p} alt={`Nueva ${i + 1}`} className="gallery-thumb" />
                                                <button type="button" className="photo-remove" onClick={() => removeNewPhoto(i)}>×</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {(existingPhotos.length + photos.length) < 5 && (
                                    <div className="file-upload">
                                        <input type="file" id="moto-photos" accept="image/*" multiple onChange={handlePhotos} />
                                        <label htmlFor="moto-photos" className="file-upload-label">
                                            {uploading ? 'Comprimiendo...' : <><MdPhotoCamera /> Agregar Fotos ({existingPhotos.length + photos.length}/5)</>}
                                        </label>
                                    </div>
                                )}
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">{editing ? 'Guardar' : 'Registrar Moto'}</button>
                            </div>
                        </form>
                    </div>
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
