import { useState, useEffect } from 'react';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { rtdb } from '../../firebase/firebase';
import { MdAdd, MdEdit, MdDelete, MdSearch, MdClose, MdInventory, MdWarning, MdTrendingUp, MdTrendingDown } from 'react-icons/md';
import toast from 'react-hot-toast';

export default function Inventory() {
    const [parts, setParts] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [search, setSearch] = useState('');
    const [catFilter, setCatFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [moveModal, setMoveModal] = useState(null);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', brand: '', category: 'general', price: '', cost: '', stock: 0, minStock: 5, supplier: '' });
    const [moveForm, setMoveForm] = useState({ type: 'in', quantity: 1, reason: '' });

    const categories = [
        { value: 'general', label: 'General' }, { value: 'motor', label: 'Motor' },
        { value: 'frenos', label: 'Frenos' }, { value: 'electrico', label: 'Eléctrico' },
        { value: 'suspension', label: 'Suspensión' }, { value: 'transmision', label: 'Transmisión' },
        { value: 'carroceria', label: 'Carrocería' }, { value: 'aceites', label: 'Aceites/Lubricantes' },
        { value: 'filtros', label: 'Filtros' }, { value: 'llantas', label: 'Llantas' },
    ];

    useEffect(() => {
        const unsub = onValue(ref(rtdb, 'spareParts'), snap => {
            setParts(snap.exists() ? Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })).sort((a, b) => (a.name || '').localeCompare(b.name || '')) : []);
            setLoading(false);
        });
        return unsub;
    }, []);

    useEffect(() => {
        let result = parts;
        if (catFilter !== 'all') result = result.filter(p => p.category === catFilter);
        const q = search.toLowerCase();
        if (q) result = result.filter(p => p.name?.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q));
        setFiltered(result);
    }, [search, catFilter, parts]);

    const openModal = (part = null) => {
        if (part) {
            setEditing(part);
            setForm({ name: part.name || '', brand: part.brand || '', category: part.category || 'general', price: part.price || '', cost: part.cost || '', stock: part.stock || 0, minStock: part.minStock || 5, supplier: part.supplier || '' });
        } else {
            setEditing(null);
            setForm({ name: '', brand: '', category: 'general', price: '', cost: '', stock: 0, minStock: 5, supplier: '' });
        }
        setModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.name) return toast.error('El nombre es obligatorio');
        try {
            const data = { ...form, price: Number(form.price) || 0, cost: Number(form.cost) || 0, stock: Number(form.stock), minStock: Number(form.minStock), updatedAt: Date.now() };
            if (editing) {
                await update(ref(rtdb, `spareParts/${editing.id}`), data);
                toast.success('Repuesto actualizado');
            } else {
                data.createdAt = Date.now();
                await push(ref(rtdb, 'spareParts'), data);
                toast.success('Repuesto agregado');
            }
            setModal(false);
        } catch (err) { toast.error('Error al guardar'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar repuesto?')) return;
        try { await remove(ref(rtdb, `spareParts/${id}`)); toast.success('Eliminado'); } catch (err) { toast.error('Error'); }
    };

    const handleMovement = async (e) => {
        e.preventDefault();
        if (!moveForm.quantity || moveForm.quantity <= 0) return toast.error('Cantidad inválida');
        try {
            const part = moveModal;
            const newStock = moveForm.type === 'in' ? part.stock + Number(moveForm.quantity) : part.stock - Number(moveForm.quantity);
            if (newStock < 0) return toast.error('Stock insuficiente');
            await update(ref(rtdb, `spareParts/${part.id}`), { stock: newStock, updatedAt: Date.now() });
            await push(ref(rtdb, 'inventoryMovements'), {
                partId: part.id, partName: part.name, movementType: moveForm.type,
                quantity: Number(moveForm.quantity), reason: moveForm.reason,
                previousStock: part.stock, newStock, createdAt: Date.now()
            });
            toast.success(moveForm.type === 'in' ? 'Entrada registrada' : 'Salida registrada');
            setMoveModal(null);
            setMoveForm({ type: 'in', quantity: 1, reason: '' });
        } catch (err) { toast.error('Error'); }
    };

    const categoryLabels = Object.fromEntries(categories.map(c => [c.value, c.label]));
    const lowStockParts = parts.filter(p => p.stock <= (p.minStock || 5));

    if (loading) return <div className="page-loader"><div className="loader"></div></div>;

    return (
        <div className="page fade-in">
            <div className="page-header">
                <div><h2>Inventario</h2><p className="page-subtitle">{parts.length} repuestos | {lowStockParts.length} con stock bajo</p></div>
                <button className="btn btn-primary" onClick={() => openModal()}><MdAdd /> Nuevo Repuesto</button>
            </div>

            {lowStockParts.length > 0 && (
                <div className="alert-bar"><MdWarning /> <strong>{lowStockParts.length} repuestos</strong> con stock bajo: {lowStockParts.map(p => p.name).join(', ')}</div>
            )}

            <div className="filters-row">
                <div className="search-bar" style={{ flex: 1, marginBottom: 0 }}>
                    <MdSearch className="search-icon" />
                    <input type="text" placeholder="Buscar repuesto..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="filter-select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                    <option value="all">Todas las categorías</option>
                    {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
            </div>

            {filtered.length === 0 ? (
                <div className="empty-state"><MdInventory className="empty-icon" /><p>No hay repuestos</p></div>
            ) : (
                <div className="table-container">
                    <table className="data-table">
                        <thead><tr><th>Nombre</th><th>Marca</th><th>Categoría</th><th>Precio</th><th>Costo</th><th>Stock</th><th>Acciones</th></tr></thead>
                        <tbody>
                            {filtered.map(part => (
                                <tr key={part.id} className={part.stock <= (part.minStock || 5) ? 'row-warning' : ''}>
                                    <td><strong>{part.name}</strong></td>
                                    <td>{part.brand || '—'}</td>
                                    <td>{categoryLabels[part.category] || part.category}</td>
                                    <td className="text-right">${(part.price || 0).toLocaleString()}</td>
                                    <td className="text-right">${(part.cost || 0).toLocaleString()}</td>
                                    <td><span className={`stock-badge ${part.stock <= (part.minStock || 5) ? 'stock-low' : 'stock-ok'}`}>{part.stock}</span></td>
                                    <td>
                                        <div className="action-btns">
                                            <button className="btn btn-sm btn-success" onClick={() => { setMoveModal(part); setMoveForm({ type: 'in', quantity: 1, reason: '' }); }} title="Entrada"><MdTrendingUp /></button>
                                            <button className="btn btn-sm btn-warning" onClick={() => { setMoveModal(part); setMoveForm({ type: 'out', quantity: 1, reason: '' }); }} title="Salida"><MdTrendingDown /></button>
                                            <button className="btn btn-sm btn-ghost" onClick={() => openModal(part)}><MdEdit /></button>
                                            <button className="btn btn-sm btn-danger-ghost" onClick={() => handleDelete(part.id)}><MdDelete /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {moveModal && (
                <div className="modal-overlay" onClick={() => setMoveModal(null)}>
                    <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{moveForm.type === 'in' ? 'Entrada' : 'Salida'} - {moveModal.name}</h3>
                            <button className="modal-close" onClick={() => setMoveModal(null)}><MdClose /></button>
                        </div>
                        <form onSubmit={handleMovement} className="modal-body">
                            <p>Stock actual: <strong>{moveModal.stock}</strong></p>
                            <div className="form-row">
                                <div className="form-group"><label>Tipo</label><select value={moveForm.type} onChange={e => setMoveForm(p => ({ ...p, type: e.target.value }))}><option value="in">Entrada</option><option value="out">Salida</option></select></div>
                                <div className="form-group"><label>Cantidad</label><input type="number" min="1" value={moveForm.quantity} onChange={e => setMoveForm(p => ({ ...p, quantity: e.target.value }))} /></div>
                            </div>
                            <div className="form-group"><label>Razón</label><input type="text" value={moveForm.reason} onChange={e => setMoveForm(p => ({ ...p, reason: e.target.value }))} placeholder="Ej: Compra, uso en orden" /></div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => setMoveModal(null)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">Registrar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {modal && (
                <div className="modal-overlay" onClick={() => setModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editing ? 'Editar Repuesto' : 'Nuevo Repuesto'}</h3>
                            <button className="modal-close" onClick={() => setModal(false)}><MdClose /></button>
                        </div>
                        <form onSubmit={handleSave} className="modal-body">
                            <div className="form-row">
                                <div className="form-group"><label>Nombre *</label><input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
                                <div className="form-group"><label>Marca</label><input type="text" value={form.brand} onChange={e => setForm(p => ({ ...p, brand: e.target.value }))} /></div>
                            </div>
                            <div className="form-group"><label>Categoría</label><select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>{categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
                            <div className="form-row">
                                <div className="form-group"><label>Precio Venta</label><input type="number" min="0" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} /></div>
                                <div className="form-group"><label>Costo</label><input type="number" min="0" value={form.cost} onChange={e => setForm(p => ({ ...p, cost: e.target.value }))} /></div>
                            </div>
                            <div className="form-row">
                                <div className="form-group"><label>Stock Inicial</label><input type="number" min="0" value={form.stock} onChange={e => setForm(p => ({ ...p, stock: e.target.value }))} /></div>
                                <div className="form-group"><label>Stock Mínimo</label><input type="number" min="0" value={form.minStock} onChange={e => setForm(p => ({ ...p, minStock: e.target.value }))} /></div>
                            </div>
                            <div className="form-group"><label>Proveedor</label><input type="text" value={form.supplier} onChange={e => setForm(p => ({ ...p, supplier: e.target.value }))} /></div>
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
