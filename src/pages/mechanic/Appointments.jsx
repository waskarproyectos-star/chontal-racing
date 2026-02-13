import { useState, useEffect } from 'react';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { rtdb } from '../../firebase/firebase';
import { MdAdd, MdEdit, MdClose, MdCalendarMonth, MdCheck, MdCancel, MdDelete, MdTwoWheeler } from 'react-icons/md';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';

export default function Appointments() {
    const [appointments, setAppointments] = useState([]);
    const [clients, setClients] = useState([]);
    const [motorcycles, setMotorcycles] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ clientId: '', motorcycleId: '', serviceType: '', date: '', time: '', notes: '', status: 'pending' });
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        const unsubs = [];
        unsubs.push(onValue(ref(rtdb, 'appointments'), snap => {
            setAppointments(snap.exists() ? Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })).sort((a, b) => (b.date || '').localeCompare(a.date || '')) : []);
            setLoading(false);
        }));
        unsubs.push(onValue(ref(rtdb, 'users'), snap => {
            if (snap.exists()) {
                setClients(Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })).filter(u => u.role === 'client'));
            }
        }));
        unsubs.push(onValue(ref(rtdb, 'motorcycles'), snap => {
            setMotorcycles(snap.exists() ? Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })) : []);
        }));
        unsubs.push(onValue(ref(rtdb, 'services'), snap => {
            setServices(snap.exists() ? Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })) : []);
        }));
        return () => unsubs.forEach(u => u());
    }, []);

    const statusLabels = { pending: 'Pendiente', confirmed: 'Confirmada', completed: 'Completada', cancelled: 'Cancelada' };
    const statusClasses = { pending: 'status-pending', confirmed: 'status-progress', completed: 'status-completed', cancelled: 'status-cancelled' };
    const filtered = statusFilter === 'all' ? appointments : appointments.filter(a => a.status === statusFilter);

    const getClientMotos = () => form.clientId ? motorcycles.filter(m => m.clientId === form.clientId) : motorcycles;

    const openModal = (apt = null) => {
        if (apt) {
            setEditing(apt);
            setForm({ clientId: apt.clientId || '', motorcycleId: apt.motorcycleId || '', serviceType: apt.serviceType || '', date: apt.date || '', time: apt.time || '', notes: apt.notes || '', status: apt.status || 'pending' });
        } else {
            setEditing(null);
            setForm({ clientId: '', motorcycleId: '', serviceType: '', date: '', time: '', notes: '', status: 'pending' });
        }
        setModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.date) return toast.error('La fecha es obligatoria');
        const client = clients.find(c => c.id === form.clientId);
        const moto = motorcycles.find(m => m.id === form.motorcycleId);
        try {
            const data = {
                ...form,
                clientName: client?.displayName || '',
                motoName: moto ? `${moto.brand} ${moto.model}` : '',
                updatedAt: Date.now()
            };
            if (editing) {
                await update(ref(rtdb, `appointments/${editing.id}`), data);
                toast.success('Cita actualizada');
                if (editing.status !== data.status && data.clientId) {
                    sendNotification(data.clientId, data.status, data.serviceType, data.date);
                }
            } else {
                data.createdAt = Date.now();
                await push(ref(rtdb, 'appointments'), data);
                toast.success('Cita creada');
            }
            setModal(false);
        } catch (err) { toast.error('Error al guardar'); }
    };

    // Notification helper for appointments
    const sendNotification = async (clientId, status, serviceType, date) => {
        if (!clientId) return;
        const icons = { confirmed: '✅', completed: '🎉', cancelled: '❌' };
        const labels = { confirmed: 'confirmada', completed: 'completada', cancelled: 'cancelada', pending: 'pendiente' };
        const msg = `Tu cita${serviceType ? ` de ${serviceType}` : ''} del ${date} fue ${labels[status] || status}`;
        try {
            await push(ref(rtdb, `notifications/${clientId}`), { message: msg, icon: icons[status] || '📅', read: false, createdAt: Date.now() });
        } catch (e) { /* ignore */ }
    };

    const quickStatus = async (id, status) => {
        const apt = appointments.find(a => a.id === id);
        try {
            await update(ref(rtdb, `appointments/${id}`), { status, updatedAt: Date.now() });
            toast.success('Estado actualizado');
            if (apt?.clientId) sendNotification(apt.clientId, status, apt.serviceType, apt.date);
        } catch (err) { toast.error('Error'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar cita?')) return;
        try { await remove(ref(rtdb, `appointments/${id}`)); toast.success('Cita eliminada'); } catch (err) { toast.error('Error'); }
    };

    if (loading) return <div className="page-loader"><div className="loader"></div></div>;

    return (
        <div className="page fade-in">
            <div className="page-header">
                <div><h2>Citas</h2><p className="page-subtitle">{appointments.length} citas</p></div>
                <button className="btn btn-primary" onClick={() => openModal()}><MdAdd /> Nueva Cita</button>
            </div>

            <div className="filters-row">
                <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="all">Todas</option>
                    {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
            </div>

            {filtered.length === 0 ? (
                <div className="empty-state"><MdCalendarMonth className="empty-icon" /><p>No hay citas</p></div>
            ) : (
                <div className="appointments-list">
                    {filtered.map(apt => (
                        <div key={apt.id} className="appointment-card">
                            <div className="apt-date-block">
                                <span className="apt-day">{apt.date ? format(new Date(apt.date + 'T12:00:00'), 'dd', { locale: es }) : '—'}</span>
                                <span className="apt-month">{apt.date ? format(new Date(apt.date + 'T12:00:00'), 'MMM yyyy', { locale: es }) : ''}</span>
                            </div>
                            <div className="apt-info">
                                <h4>{apt.clientName || 'Cliente'}</h4>
                                <span className="apt-service">{apt.serviceType || 'Servicio General'}</span>
                                {apt.motoName && <span className="apt-moto"><MdTwoWheeler /> {apt.motoName}</span>}
                                {apt.time && <span className="apt-time">{apt.time}</span>}
                                {apt.servicePrice > 0 && <span className="apt-price">${apt.servicePrice.toLocaleString()}</span>}
                                {apt.notes && <p className="apt-notes">{apt.notes}</p>}
                            </div>
                            <div className="apt-actions">
                                <span className={`status-badge ${statusClasses[apt.status]}`}>{statusLabels[apt.status]}</span>
                                <div className="action-btns">
                                    {apt.status === 'pending' && <button className="btn btn-sm btn-success" onClick={() => quickStatus(apt.id, 'confirmed')}><MdCheck /> Confirmar</button>}
                                    {(apt.status === 'pending' || apt.status === 'confirmed') && <button className="btn btn-sm btn-warning" onClick={() => quickStatus(apt.id, 'completed')} title="Completar">✓ Completar</button>}
                                    {apt.status !== 'cancelled' && <button className="btn btn-sm btn-danger-ghost" onClick={() => quickStatus(apt.id, 'cancelled')}><MdCancel /></button>}
                                    <button className="btn btn-sm btn-ghost" onClick={() => openModal(apt)}><MdEdit /></button>
                                    <button className="btn btn-sm btn-danger-ghost" onClick={() => handleDelete(apt.id)}><MdDelete /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {modal && (
                <div className="modal-overlay" onClick={() => setModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editing ? 'Editar Cita' : 'Nueva Cita'}</h3>
                            <button className="modal-close" onClick={() => setModal(false)}><MdClose /></button>
                        </div>
                        <form onSubmit={handleSave} className="modal-body">
                            <div className="form-group"><label>Cliente</label>
                                <select value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value, motorcycleId: '' }))}>
                                    <option value="">— Seleccionar —</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.displayName}</option>)}
                                </select>
                            </div>
                            <div className="form-group"><label>Moto</label>
                                <select value={form.motorcycleId} onChange={e => setForm(p => ({ ...p, motorcycleId: e.target.value }))}>
                                    <option value="">— Seleccionar moto —</option>
                                    {getClientMotos().map(m => <option key={m.id} value={m.id}>{m.brand} {m.model} {m.plate ? `(${m.plate})` : ''}</option>)}
                                </select>
                            </div>
                            <div className="form-group"><label>Servicio</label>
                                <select value={form.serviceType} onChange={e => setForm(p => ({ ...p, serviceType: e.target.value }))}>
                                    <option value="">— Seleccionar —</option>
                                    {services.map(s => <option key={s.id} value={s.name}>{s.name} — ${s.basePrice}</option>)}
                                </select>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label>Fecha *</label><input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
                                <div className="form-group"><label>Hora</label><input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} /></div>
                            </div>
                            <div className="form-group"><label>Estado</label>
                                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                                    {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                            </div>
                            <div className="form-group"><label>Notas</label><textarea rows="2" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}></textarea></div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
