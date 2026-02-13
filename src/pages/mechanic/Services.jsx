import { useState, useEffect } from 'react';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { rtdb } from '../../firebase/firebase';
import { MdAdd, MdEdit, MdDelete, MdClose, MdMiscellaneousServices, MdSearch } from 'react-icons/md';
import toast from 'react-hot-toast';

export default function Services() {
    const [services, setServices] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [search, setSearch] = useState('');
    const [catFilter, setCatFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', description: '', category: 'mantenimiento', basePrice: '', estimatedTime: '' });

    const categories = [
        { value: 'mantenimiento', label: 'Mantenimiento' },
        { value: 'reparacion', label: 'Reparación' },
        { value: 'diagnostico', label: 'Diagnóstico' },
        { value: 'electrica', label: 'Eléctrica' },
        { value: 'pintura', label: 'Pintura' },
        { value: 'otro', label: 'Otro' }
    ];

    useEffect(() => {
        const unsub = onValue(ref(rtdb, 'services'), snap => {
            setServices(snap.exists() ? Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })) : []);
            setLoading(false);
        });
        return unsub;
    }, []);

    useEffect(() => {
        let result = services;
        if (catFilter !== 'all') result = result.filter(s => s.category === catFilter);
        const q = search.toLowerCase();
        if (q) result = result.filter(s => s.name?.toLowerCase().includes(q));
        setFiltered(result);
    }, [search, catFilter, services]);

    const openModal = (service = null) => {
        if (service) {
            setEditing(service);
            setForm({ name: service.name || '', description: service.description || '', category: service.category || 'mantenimiento', basePrice: service.basePrice || '', estimatedTime: service.estimatedTime || '' });
        } else {
            setEditing(null);
            setForm({ name: '', description: '', category: 'mantenimiento', basePrice: '', estimatedTime: '' });
        }
        setModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.name) return toast.error('El nombre es obligatorio');
        try {
            const data = { ...form, basePrice: Number(form.basePrice) || 0, updatedAt: Date.now() };
            if (editing) {
                await update(ref(rtdb, `services/${editing.id}`), data);
                toast.success('Servicio actualizado');
            } else {
                data.createdAt = Date.now();
                await push(ref(rtdb, 'services'), data);
                toast.success('Servicio agregado');
            }
            setModal(false);
        } catch (err) { toast.error('Error al guardar'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar servicio?')) return;
        try { await remove(ref(rtdb, `services/${id}`)); toast.success('Servicio eliminado'); } catch (err) { toast.error('Error'); }
    };

    const categoryLabels = Object.fromEntries(categories.map(c => [c.value, c.label]));

    if (loading) return <div className="page-loader"><div className="loader"></div></div>;

    return (
        <div className="page fade-in">
            <div className="page-header">
                <div><h2>Servicios y Precios</h2><p className="page-subtitle">{services.length} servicios</p></div>
                <button className="btn btn-primary" onClick={() => openModal()}><MdAdd /> Nuevo Servicio</button>
            </div>

            <div className="filters-row">
                <div className="search-bar" style={{ flex: 1, marginBottom: 0 }}>
                    <MdSearch className="search-icon" />
                    <input type="text" placeholder="Buscar servicio..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="filter-select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                    <option value="all">Todas</option>
                    {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
            </div>

            {filtered.length === 0 ? (
                <div className="empty-state"><MdMiscellaneousServices className="empty-icon" /><p>No hay servicios</p></div>
            ) : (
                <div className="cards-grid services-grid">
                    {filtered.map(service => (
                        <div key={service.id} className="service-card">
                            <div className="service-category">{categoryLabels[service.category] || service.category}</div>
                            <h4>{service.name}</h4>
                            {service.description && <p className="service-desc">{service.description}</p>}
                            <div className="service-meta">
                                <span className="service-price">${Number(service.basePrice).toLocaleString()}</span>
                                {service.estimatedTime && <span className="service-time">{service.estimatedTime}</span>}
                            </div>
                            <div className="card-actions">
                                <button className="btn btn-sm btn-ghost" onClick={() => openModal(service)}><MdEdit /></button>
                                <button className="btn btn-sm btn-danger-ghost" onClick={() => handleDelete(service.id)}><MdDelete /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {modal && (
                <div className="modal-overlay" onClick={() => setModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editing ? 'Editar Servicio' : 'Nuevo Servicio'}</h3>
                            <button className="modal-close" onClick={() => setModal(false)}><MdClose /></button>
                        </div>
                        <form onSubmit={handleSave} className="modal-body">
                            <div className="form-group"><label>Nombre *</label><input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                            <div className="form-group"><label>Descripción</label><textarea rows="2" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}></textarea></div>
                            <div className="form-group"><label>Categoría</label>
                                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                                    {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label>Precio Base ($)</label><input type="number" min="0" value={form.basePrice} onChange={e => setForm(p => ({ ...p, basePrice: e.target.value }))} /></div>
                                <div className="form-group"><label>Tiempo Estimado</label><input type="text" value={form.estimatedTime} onChange={e => setForm(p => ({ ...p, estimatedTime: e.target.value }))} placeholder="Ej: 2-3 horas" /></div>
                            </div>
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
