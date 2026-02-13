import { useState, useEffect } from 'react';
import { ref, onValue, push } from 'firebase/database';
import { rtdb } from '../../firebase/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { MdMiscellaneousServices, MdAttachMoney, MdTimer, MdCalendarMonth, MdClose, MdTwoWheeler, MdCheck } from 'react-icons/md';
import toast from 'react-hot-toast';

export default function ServiceCatalog() {
    const { user, userProfile } = useAuth();
    const [services, setServices] = useState([]);
    const [motos, setMotos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [catFilter, setCatFilter] = useState('all');
    const [bookingModal, setBookingModal] = useState(null); // service being booked
    const [bookForm, setBookForm] = useState({ motorcycleId: '', date: '', time: '', notes: '' });

    useEffect(() => {
        const unsubs = [];
        unsubs.push(onValue(ref(rtdb, 'services'), snap => {
            setServices(snap.exists() ? Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })) : []);
            setLoading(false);
        }));
        unsubs.push(onValue(ref(rtdb, 'motorcycles'), snap => {
            if (snap.exists()) {
                setMotos(Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })).filter(m => m.clientId === user.uid));
            } else { setMotos([]); }
        }));
        return () => unsubs.forEach(u => u());
    }, [user]);

    const categories = [
        { value: 'mantenimiento', label: 'Mantenimiento' }, { value: 'reparacion', label: 'Reparación' },
        { value: 'diagnostico', label: 'Diagnóstico' }, { value: 'electrica', label: 'Eléctrica' },
        { value: 'pintura', label: 'Pintura' }, { value: 'otro', label: 'Otro' }
    ];
    const categoryLabels = Object.fromEntries(categories.map(c => [c.value, c.label]));
    const filtered = catFilter === 'all' ? services : services.filter(s => s.category === catFilter);

    const openBooking = (service) => {
        setBookingModal(service);
        setBookForm({ motorcycleId: motos.length === 1 ? motos[0].id : '', date: '', time: '', notes: '' });
    };

    const handleBook = async (e) => {
        e.preventDefault();
        if (!bookForm.date) return toast.error('Selecciona una fecha');
        if (!bookForm.motorcycleId && motos.length > 0) return toast.error('Selecciona tu moto');
        const moto = motos.find(m => m.id === bookForm.motorcycleId);
        try {
            await push(ref(rtdb, 'appointments'), {
                clientId: user.uid,
                clientName: userProfile?.displayName || '',
                motorcycleId: bookForm.motorcycleId,
                motoName: moto ? `${moto.brand} ${moto.model}` : '',
                serviceType: bookingModal.name,
                servicePrice: bookingModal.basePrice || 0,
                date: bookForm.date,
                time: bookForm.time,
                notes: bookForm.notes,
                status: 'pending',
                createdAt: Date.now()
            });
            toast.success('¡Cita solicitada! El taller la confirmará');
            setBookingModal(null);
        } catch (err) { toast.error('Error al solicitar cita'); }
    };

    if (loading) return <div className="page-loader"><div className="loader"></div></div>;

    return (
        <div className="page fade-in">
            <div className="page-header">
                <h2>Servicios Disponibles</h2>
                <p className="page-subtitle">Selecciona un servicio para agendar cita</p>
            </div>
            <div className="filters-row">
                <select className="filter-select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                    <option value="all">Todas las categorías</option>
                    {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
            </div>
            {filtered.length === 0 ? (
                <div className="empty-state"><MdMiscellaneousServices className="empty-icon" /><p>No hay servicios disponibles</p></div>
            ) : (
                <div className="cards-grid services-grid">
                    {filtered.map(service => (
                        <div key={service.id} className="service-card client-service-card">
                            <div className="service-category">{categoryLabels[service.category] || service.category}</div>
                            <h4>{service.name}</h4>
                            {service.description && <p className="service-desc">{service.description}</p>}
                            <div className="service-meta">
                                <span className="service-price"><MdAttachMoney /> ${Number(service.basePrice).toLocaleString()}</span>
                                {service.estimatedTime && <span className="service-time"><MdTimer /> {service.estimatedTime}</span>}
                            </div>
                            <button className="btn btn-primary btn-sm" style={{ width: '100%', marginTop: '0.75rem' }} onClick={() => openBooking(service)}>
                                <MdCalendarMonth /> Solicitar Cita
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Booking Modal */}
            {bookingModal && (
                <div className="modal-overlay" onClick={() => setBookingModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Agendar: {bookingModal.name}</h3>
                            <button className="modal-close" onClick={() => setBookingModal(null)}><MdClose /></button>
                        </div>
                        <form onSubmit={handleBook} className="modal-body">
                            <div className="booking-service-info">
                                <span className="service-price"><MdAttachMoney /> ${Number(bookingModal.basePrice).toLocaleString()}</span>
                                {bookingModal.estimatedTime && <span className="service-time"><MdTimer /> {bookingModal.estimatedTime}</span>}
                            </div>

                            {motos.length === 0 ? (
                                <div className="info-text" style={{ color: 'var(--warning)' }}>
                                    <MdTwoWheeler /> No tienes motos registradas. El mecánico asignará tu moto.
                                </div>
                            ) : (
                                <div className="form-group"><label><MdTwoWheeler /> Mi Moto</label>
                                    <select value={bookForm.motorcycleId} onChange={e => setBookForm(p => ({ ...p, motorcycleId: e.target.value }))}>
                                        <option value="">— Seleccionar moto —</option>
                                        {motos.map(m => <option key={m.id} value={m.id}>{m.brand} {m.model} {m.plate ? `(${m.plate})` : ''}</option>)}
                                    </select>
                                </div>
                            )}

                            <div className="form-row">
                                <div className="form-group"><label>Fecha *</label><input type="date" value={bookForm.date} onChange={e => setBookForm(p => ({ ...p, date: e.target.value }))} min={new Date().toISOString().split('T')[0]} /></div>
                                <div className="form-group"><label>Hora preferida</label><input type="time" value={bookForm.time} onChange={e => setBookForm(p => ({ ...p, time: e.target.value }))} /></div>
                            </div>
                            <div className="form-group"><label>Comentarios</label><textarea rows="2" value={bookForm.notes} onChange={e => setBookForm(p => ({ ...p, notes: e.target.value }))} placeholder="Describe lo que necesitas..."></textarea></div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => setBookingModal(null)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary"><MdCheck /> Confirmar Cita</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
