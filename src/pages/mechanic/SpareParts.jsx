import { useState, useEffect } from 'react';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { rtdb } from '../../firebase/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { MdAdd, MdClose, MdShoppingCart, MdCheck, MdCancel, MdSearch, MdTwoWheeler } from 'react-icons/md';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';

export default function SpareParts() {
    const { userProfile } = useAuth();
    const [requests, setRequests] = useState([]);
    const [motorcycles, setMotorcycles] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [form, setForm] = useState({
        motorcycleId: '', clientId: '',
        parts: [{ name: '', quantity: 1, price: 0 }],
        notes: '', priority: 'normal'
    });

    useEffect(() => {
        const unsubs = [];
        unsubs.push(onValue(ref(rtdb, 'partRequests'), snap => {
            setRequests(snap.exists() ? Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)) : []);
            setLoading(false);
        }));
        unsubs.push(onValue(ref(rtdb, 'motorcycles'), snap => {
            setMotorcycles(snap.exists() ? Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })) : []);
        }));
        unsubs.push(onValue(ref(rtdb, 'users'), snap => {
            if (snap.exists()) {
                setClients(Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })).filter(u => u.role === 'client'));
            }
        }));
        return () => unsubs.forEach(u => u());
    }, []);

    const getClientMotos = () => {
        if (!form.clientId) return motorcycles;
        return motorcycles.filter(m => m.clientId === form.clientId);
    };

    const addPart = () => setForm(p => ({ ...p, parts: [...p.parts, { name: '', quantity: 1, price: 0 }] }));
    const removePart = (i) => setForm(p => ({ ...p, parts: p.parts.filter((_, idx) => idx !== i) }));
    const updatePart = (i, field, value) => {
        setForm(p => {
            const parts = [...p.parts];
            parts[i] = { ...parts[i], [field]: field === 'name' ? value : Number(value) || 0 };
            return { ...p, parts };
        });
    };

    const getTotal = () => form.parts.reduce((s, p) => s + (p.price * p.quantity), 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validParts = form.parts.filter(p => p.name.trim());
        if (validParts.length === 0) return toast.error('Agrega al menos un repuesto');
        if (!form.motorcycleId) return toast.error('Selecciona una moto');
        const moto = motorcycles.find(m => m.id === form.motorcycleId);
        const client = clients.find(c => c.id === form.clientId);
        try {
            await push(ref(rtdb, 'partRequests'), {
                motorcycleId: form.motorcycleId,
                motoName: moto ? `${moto.brand} ${moto.model}` : '',
                clientId: form.clientId || moto?.clientId || '',
                clientName: client?.displayName || '',
                parts: validParts,
                notes: form.notes,
                priority: form.priority,
                totalEstimado: validParts.reduce((s, p) => s + (p.price * p.quantity), 0),
                mechanicName: userProfile?.displayName || '',
                status: 'pending',
                createdAt: Date.now()
            });
            toast.success('Solicitud de repuestos creada');
            setModal(false);
            setForm({ motorcycleId: '', clientId: '', parts: [{ name: '', quantity: 1, price: 0 }], notes: '', priority: 'normal' });
        } catch (err) { toast.error('Error al crear solicitud'); }
    };

    const updateStatus = async (id, status) => {
        try {
            await update(ref(rtdb, `partRequests/${id}`), { status, updatedAt: Date.now() });
            toast.success(status === 'approved' ? 'Solicitud aprobada' : status === 'rejected' ? 'Rechazada' : 'Actualizada');
        } catch (err) { toast.error('Error'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar solicitud?')) return;
        try { await remove(ref(rtdb, `partRequests/${id}`)); toast.success('Eliminada'); } catch (err) { toast.error('Error'); }
    };

    const statusLabels = { pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada', completed: 'Entregada' };
    const statusClasses = { pending: 'status-pending', approved: 'status-completed', rejected: 'status-cancelled', completed: 'status-progress' };

    if (loading) return <div className="page-loader"><div className="loader"></div></div>;

    return (
        <div className="page fade-in">
            <div className="page-header">
                <div><h2>Solicitud de Repuestos</h2><p className="page-subtitle">{requests.length} solicitudes — para motos de clientes</p></div>
                <button className="btn btn-primary" onClick={() => setModal(true)}><MdAdd /> Nueva Solicitud</button>
            </div>

            {requests.length === 0 ? (
                <div className="empty-state"><MdShoppingCart className="empty-icon" /><p>No hay solicitudes de repuestos</p><p className="text-muted">Crea una solicitud asociada a la moto de un cliente</p></div>
            ) : (
                <div className="requests-list">
                    {requests.map(req => (
                        <div key={req.id} className="request-card">
                            <div className="request-header">
                                <div>
                                    <span className={`status-badge ${statusClasses[req.status]}`}>{statusLabels[req.status]}</span>
                                    {req.priority === 'urgent' && <span className="status-badge status-cancelled">URGENTE</span>}
                                    <span className="request-mechanic">{req.mechanicName}</span>
                                </div>
                                <span className="request-date">{req.createdAt ? format(new Date(req.createdAt), 'dd MMM yyyy HH:mm', { locale: es }) : ''}</span>
                            </div>
                            <div className="request-moto-info" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--accent)' }}>
                                <MdTwoWheeler /> <strong>{req.motoName || 'Moto'}</strong>
                                {req.clientName && <span style={{ color: 'var(--text-secondary)' }}>— Cliente: {req.clientName}</span>}
                            </div>
                            <div className="request-parts">
                                {req.parts?.map((p, i) => (
                                    <div key={i} className="request-part-item">
                                        <span className="part-check"><MdCheck /></span>
                                        <span>{p.name}</span>
                                        <span className="part-qty">x{p.quantity}</span>
                                        {p.price > 0 && <span className="part-qty">${(p.price * p.quantity).toLocaleString()}</span>}
                                    </div>
                                ))}
                            </div>
                            {req.totalEstimado > 0 && <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent)', margin: '0.5rem 0' }}>Total estimado: ${req.totalEstimado.toLocaleString()}</div>}
                            {req.notes && <p className="request-notes">"{req.notes}"</p>}
                            <div className="request-actions">
                                {req.status === 'pending' && (
                                    <>
                                        <button className="btn btn-sm btn-success" onClick={() => updateStatus(req.id, 'approved')}><MdCheck /> Aprobar</button>
                                        <button className="btn btn-sm btn-danger" onClick={() => updateStatus(req.id, 'rejected')}><MdCancel /> Rechazar</button>
                                    </>
                                )}
                                {req.status === 'approved' && (
                                    <button className="btn btn-sm btn-primary" onClick={() => updateStatus(req.id, 'completed')}>Marcar Entregada</button>
                                )}
                                <button className="btn btn-sm btn-danger-ghost" onClick={() => handleDelete(req.id)}>Eliminar</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {modal && (
                <div className="modal-overlay" onClick={() => setModal(false)}>
                    <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Nueva Solicitud de Repuestos</h3>
                            <button className="modal-close" onClick={() => setModal(false)}><MdClose /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Cliente</label>
                                    <select value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value, motorcycleId: '' }))}>
                                        <option value="">— Todos los clientes —</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.displayName}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Moto del Cliente *</label>
                                    <select value={form.motorcycleId} onChange={e => setForm(p => ({ ...p, motorcycleId: e.target.value }))}>
                                        <option value="">— Seleccionar moto —</option>
                                        {getClientMotos().map(m => <option key={m.id} value={m.id}>{m.brand} {m.model} {m.plate ? `(${m.plate})` : ''}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="form-section">
                                <h4>Repuestos Necesarios</h4>
                                {form.parts.map((part, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <input type="text" placeholder="Nombre del repuesto" value={part.name} onChange={e => updatePart(i, 'name', e.target.value)} style={{ flex: 2 }} />
                                        <input type="number" placeholder="Cant" min="1" value={part.quantity} onChange={e => updatePart(i, 'quantity', e.target.value)} style={{ width: '70px' }} />
                                        <input type="number" placeholder="Precio" min="0" value={part.price || ''} onChange={e => updatePart(i, 'price', e.target.value)} style={{ width: '100px' }} />
                                        {form.parts.length > 1 && <button type="button" className="btn btn-sm btn-danger-ghost" onClick={() => removePart(i)}><MdClose /></button>}
                                    </div>
                                ))}
                                <button type="button" className="btn btn-sm btn-ghost" onClick={addPart}><MdAdd /> Agregar Repuesto</button>
                                {getTotal() > 0 && <div style={{ marginTop: '0.75rem', fontWeight: 700, color: 'var(--accent)', fontSize: '1.05rem' }}>Total Estimado: ${getTotal().toLocaleString()}</div>}
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Prioridad</label>
                                    <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                                        <option value="normal">Normal</option><option value="urgent">Urgente</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group"><label>Notas</label><textarea rows="2" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Observaciones sobre los repuestos..."></textarea></div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Crear Solicitud</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
