import { useState, useEffect } from 'react';
import { ref, onValue, push } from 'firebase/database';
import { rtdb } from '../../firebase/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { MdCalendarMonth, MdAdd, MdClose, MdAccessTime, MdCheck } from 'react-icons/md';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';

export default function MyAppointments() {
    const { user, userProfile } = useAuth();
    const [appointments, setAppointments] = useState([]);
    const [motos, setMotos] = useState([]);
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [form, setForm] = useState({ motorcycleId: '', serviceType: '', date: '', time: '', notes: '' });

    useEffect(() => {
        if (!user) return;
        const unsubs = [];
        unsubs.push(onValue(ref(rtdb, 'appointments'), snap => {
            if (snap.exists()) {
                setAppointments(Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })).filter(a => a.clientId === user.uid).sort((a, b) => (b.date || '').localeCompare(a.date || '')));
            } else { setAppointments([]); }
            setLoading(false);
        }));
        unsubs.push(onValue(ref(rtdb, 'motorcycles'), snap => {
            if (snap.exists()) {
                setMotos(Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })).filter(m => m.clientId === user.uid));
            } else { setMotos([]); }
        }));
        unsubs.push(onValue(ref(rtdb, 'services'), snap => {
            setServices(snap.exists() ? Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })) : []);
        }));
        return () => unsubs.forEach(u => u());
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.date) return toast.error('La fecha es obligatoria');
        try {
            await push(ref(rtdb, 'appointments'), {
                clientId: user.uid, clientName: userProfile?.displayName || '',
                motorcycleId: form.motorcycleId, serviceType: form.serviceType,
                date: form.date, time: form.time, notes: form.notes,
                status: 'pending', createdAt: Date.now()
            });
            toast.success('¡Cita solicitada!');
            setModal(false);
            setForm({ motorcycleId: '', serviceType: '', date: '', time: '', notes: '' });
        } catch (err) { toast.error('Error al solicitar cita'); }
    };

    const statusLabels = { pending: 'Pendiente', confirmed: 'Confirmada', completed: 'Completada', cancelled: 'Cancelada' };
    const statusClasses = { pending: 'status-pending', confirmed: 'status-progress', completed: 'status-completed', cancelled: 'status-cancelled' };

    if (loading) return <div className="page-loader"><div className="loader"></div></div>;

    return (
        <div className="page fade-in">
            <div className="page-header">
                <div><h2>Mis Citas</h2><p className="page-subtitle">Gestiona tus citas con el taller</p></div>
                <button className="btn btn-primary" onClick={() => setModal(true)}><MdAdd /> Solicitar Cita</button>
            </div>

            {appointments.length === 0 ? (
                <div className="empty-state"><MdCalendarMonth className="empty-icon" /><p>No tienes citas programadas</p><button className="btn btn-primary" onClick={() => setModal(true)}>Solicitar mi primera cita</button></div>
            ) : (
                <div className="appointments-list">
                    {appointments.map(apt => (
                        <div key={apt.id} className="appointment-card">
                            <div className="apt-date-block">
                                <span className="apt-day">{apt.date ? format(new Date(apt.date + 'T12:00:00'), 'dd', { locale: es }) : '—'}</span>
                                <span className="apt-month">{apt.date ? format(new Date(apt.date + 'T12:00:00'), 'MMM yyyy', { locale: es }) : ''}</span>
                            </div>
                            <div className="apt-info">
                                <h4>{apt.serviceType || 'Servicio General'}</h4>
                                {apt.time && <span className="apt-time"><MdAccessTime /> {apt.time}</span>}
                                {apt.notes && <p className="apt-notes">{apt.notes}</p>}
                            </div>
                            <div className="apt-actions">
                                <span className={`status-badge ${statusClasses[apt.status]}`}>{apt.status === 'confirmed' && <MdCheck />} {statusLabels[apt.status]}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {modal && (
                <div className="modal-overlay" onClick={() => setModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Solicitar Cita</h3>
                            <button className="modal-close" onClick={() => setModal(false)}><MdClose /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-body">
                            <div className="form-group"><label>Moto</label><select value={form.motorcycleId} onChange={e => setForm(p => ({ ...p, motorcycleId: e.target.value }))}><option value="">— Seleccionar moto —</option>{motos.map(m => <option key={m.id} value={m.id}>{m.brand} {m.model}</option>)}</select></div>
                            <div className="form-group"><label>Tipo de Servicio</label><select value={form.serviceType} onChange={e => setForm(p => ({ ...p, serviceType: e.target.value }))}><option value="">— Seleccionar —</option>{services.map(s => <option key={s.id} value={s.name}>{s.name} — ${s.basePrice}</option>)}</select></div>
                            <div className="form-row">
                                <div className="form-group"><label>Fecha *</label><input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} min={new Date().toISOString().split('T')[0]} /></div>
                                <div className="form-group"><label>Hora</label><input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} /></div>
                            </div>
                            <div className="form-group"><label>Comentarios</label><textarea rows="2" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Describe lo que necesitas..."></textarea></div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Solicitar Cita</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
