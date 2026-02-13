import { useState, useEffect } from 'react';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { rtdb } from '../../firebase/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { compressToBase64 } from '../../utils/compressToBase64';
import { MdAdd, MdEdit, MdDelete, MdClose, MdBuild, MdSearch, MdPhotoCamera, MdCheckCircle, MdAddTask, MdFlag, MdEvent, MdPerson, MdPayment, MdAttachMoney } from 'react-icons/md';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';

export default function WorkOrders() {
    const { user, userProfile } = useAuth();
    const [orders, setOrders] = useState([]);
    const [motorcycles, setMotorcycles] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [detailModal, setDetailModal] = useState(null);
    const [viewingPhoto, setViewingPhoto] = useState(null);
    const [paymentModal, setPaymentModal] = useState(null);
    const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'cash', note: '' });

    const [form, setForm] = useState({
        clientId: '', motorcycleId: '', description: '', notes: '',
        laborCost: 0, status: 'pending', priority: 'normal', estimatedDate: '',
        tasks: [{ name: '', completed: false, photo: null }],
        spareParts: [{ name: '', quantity: 1, price: 0, providedBy: 'shop' }]
    });
    const [photos, setPhotos] = useState([]);
    const [existingPhotos, setExistingPhotos] = useState([]);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const unsubs = [];
        unsubs.push(onValue(ref(rtdb, 'workOrders'), snap => {
            setOrders(snap.exists() ? Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)) : []);
            setLoading(false);
        }));
        unsubs.push(onValue(ref(rtdb, 'motorcycles'), snap => {
            setMotorcycles(snap.exists() ? Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })) : []);
        }));
        unsubs.push(onValue(ref(rtdb, 'users'), snap => {
            if (snap.exists()) setClients(Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })).filter(u => u.role === 'client'));
        }));
        return () => unsubs.forEach(u => u());
    }, []);

    const getClientMotos = () => form.clientId ? motorcycles.filter(m => m.clientId === form.clientId) : motorcycles;

    const filtered = orders.filter(o => {
        if (statusFilter !== 'all' && o.status !== statusFilter) return false;
        if (search) {
            const q = search.toLowerCase();
            return `${o.description} ${o.motoName} ${o.clientName}`.toLowerCase().includes(q);
        }
        return true;
    });

    const openModal = (order = null) => {
        if (order) {
            setEditing(order);
            setForm({
                clientId: order.clientId || '', motorcycleId: order.motorcycleId || '',
                description: order.description || '', notes: order.notes || '',
                laborCost: order.laborCost || 0, status: order.status || 'pending',
                priority: order.priority || 'normal', estimatedDate: order.estimatedDate || '',
                tasks: order.tasks?.length > 0 ? order.tasks : [{ name: '', completed: false, photo: null }],
                spareParts: order.spareParts?.length > 0 ? order.spareParts.map(p => ({ ...p, providedBy: p.providedBy || 'shop' })) : [{ name: '', quantity: 1, price: 0, providedBy: 'shop' }]
            });
            setExistingPhotos(order.photos || []);
        } else {
            setEditing(null);
            setForm({
                clientId: '', motorcycleId: '', description: '', notes: '',
                laborCost: 0, status: 'pending', priority: 'normal', estimatedDate: '',
                tasks: [{ name: '', completed: false, photo: null }],
                spareParts: [{ name: '', quantity: 1, price: 0, providedBy: 'shop' }]
            });
            setExistingPhotos([]);
        }
        setPhotos([]);
        setModal(true);
    };

    // Photos
    const handlePhotos = async (e) => {
        const files = Array.from(e.target.files);
        if (existingPhotos.length + photos.length + files.length > 5) return toast.error('Máximo 5 fotos');
        setUploading(true);
        try {
            const compressed = await Promise.all(files.map(f => compressToBase64(f, 800, 0.4)));
            setPhotos(prev => [...prev, ...compressed]);
        } catch (err) { toast.error('Error'); }
        setUploading(false);
    };

    // Tasks
    const addTask = () => setForm(p => ({ ...p, tasks: [...p.tasks, { name: '', completed: false, photo: null }] }));
    const removeTask = (i) => setForm(p => ({ ...p, tasks: p.tasks.filter((_, idx) => idx !== i) }));
    const updateTask = (i, field, value) => {
        setForm(p => {
            const tasks = [...p.tasks];
            tasks[i] = { ...tasks[i], [field]: value };
            return { ...p, tasks };
        });
    };
    const handleTaskPhoto = async (i, e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const b64 = await compressToBase64(file, 600, 0.35);
            updateTask(i, 'photo', b64);
            toast.success('Foto de tarea comprimida');
        } catch (err) { toast.error('Error'); }
    };

    // Spare parts — now with providedBy
    const addPart = () => setForm(p => ({ ...p, spareParts: [...p.spareParts, { name: '', quantity: 1, price: 0, providedBy: 'shop' }] }));
    const removePart = (i) => setForm(p => ({ ...p, spareParts: p.spareParts.filter((_, idx) => idx !== i) }));
    const updatePart = (i, field, value) => {
        setForm(p => {
            const spareParts = [...p.spareParts];
            if (field === 'providedBy') {
                spareParts[i] = { ...spareParts[i], providedBy: value, price: value === 'client' ? 0 : spareParts[i].price };
            } else {
                spareParts[i] = { ...spareParts[i], [field]: field === 'name' ? value : Number(value) || 0 };
            }
            return { ...p, spareParts };
        });
    };

    // Cost calcs — only shop-provided parts count toward total
    const getShopPartsCost = () => form.spareParts.filter(p => p.providedBy !== 'client').reduce((s, p) => s + (p.price * p.quantity), 0);
    const getTotalCost = () => getShopPartsCost() + (Number(form.laborCost) || 0);
    const getTaskProgress = (tasks) => {
        if (!tasks?.length) return 0;
        return Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100);
    };

    // Notification helper
    const sendNotification = async (clientId, message, icon = '🔔') => {
        if (!clientId) return;
        try {
            await push(ref(rtdb, `notifications/${clientId}`), { message, icon, read: false, createdAt: Date.now() });
        } catch (e) { /* ignore */ }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.description) return toast.error('La descripción es obligatoria');
        if (!form.motorcycleId) return toast.error('Selecciona una moto');
        const moto = motorcycles.find(m => m.id === form.motorcycleId);
        const client = clients.find(c => c.id === form.clientId);
        const validTasks = form.tasks.filter(t => t.name.trim());
        const validParts = form.spareParts.filter(p => p.name.trim());
        try {
            const allPhotos = [...existingPhotos, ...photos];
            const shopParts = validParts.filter(p => p.providedBy !== 'client');
            const data = {
                clientId: form.clientId || moto?.clientId || '',
                clientName: client?.displayName || moto?.clientName || '',
                motorcycleId: form.motorcycleId,
                motoName: moto ? `${moto.brand} ${moto.model}` : '',
                description: form.description,
                notes: form.notes,
                status: form.status,
                priority: form.priority,
                estimatedDate: form.estimatedDate,
                tasks: validTasks,
                spareParts: validParts,
                laborCost: Number(form.laborCost) || 0,
                totalCost: shopParts.reduce((s, p) => s + p.price * p.quantity, 0) + (Number(form.laborCost) || 0),
                photos: allPhotos,
                mechanicName: userProfile?.displayName || '',
                updatedAt: Date.now()
            };
            if (editing) {
                await update(ref(rtdb, `workOrders/${editing.id}`), data);
                toast.success('Orden actualizada');
                // Notify if status changed
                if (editing.status !== data.status && data.clientId) {
                    const statusMsg = { pending: 'pendiente', in_progress: 'en progreso', waiting_parts: 'esperando piezas', completed: 'completada' };
                    const icon = data.status === 'completed' ? '✅' : '🔧';
                    sendNotification(data.clientId, `Tu orden "${data.description}" cambió a: ${statusMsg[data.status] || data.status}`, icon);
                }
            } else {
                data.createdAt = Date.now();
                data.payments = [];
                data.paymentStatus = 'pending';
                await push(ref(rtdb, 'workOrders'), data);
                toast.success('Orden creada');
                if (data.clientId) sendNotification(data.clientId, `Se creó una nueva orden: "${data.description}" para tu moto ${data.motoName}`, '🆕');
            }
            setModal(false);
        } catch (err) { toast.error('Error al guardar'); }
    };

    const toggleTask = async (orderId, taskIndex, tasks) => {
        const updatedTasks = [...tasks];
        const wasCompleted = updatedTasks[taskIndex].completed;
        updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], completed: !wasCompleted };
        try {
            await update(ref(rtdb, `workOrders/${orderId}`), { tasks: updatedTasks, updatedAt: Date.now() });
            // Notify client when a task is completed
            if (!wasCompleted && detailModal?.clientId) {
                sendNotification(detailModal.clientId, `Se completó la tarea "${updatedTasks[taskIndex].name}" en tu orden "${detailModal.description}"`, '✔️');
            }
        } catch (err) { toast.error('Error'); }
    };

    // Payment system
    const handleAddPayment = async () => {
        if (!paymentModal || !paymentForm.amount || Number(paymentForm.amount) <= 0) return toast.error('Ingresa un monto válido');
        const order = paymentModal;
        const existingPayments = order.payments || [];
        const totalPaid = existingPayments.reduce((s, p) => s + p.amount, 0);
        const newAmount = Number(paymentForm.amount);
        if (totalPaid + newAmount > (order.totalCost || 0)) return toast.error('El abono excede el total');
        const newPayment = { amount: newAmount, method: paymentForm.method, note: paymentForm.note, date: Date.now() };
        const updatedPayments = [...existingPayments, newPayment];
        const newTotalPaid = totalPaid + newAmount;
        const newPaymentStatus = newTotalPaid >= (order.totalCost || 0) ? 'paid' : 'partial';
        try {
            await update(ref(rtdb, `workOrders/${order.id}`), { payments: updatedPayments, paymentStatus: newPaymentStatus, updatedAt: Date.now() });
            toast.success('Abono registrado');
            setDetailModal(prev => prev ? { ...prev, payments: updatedPayments, paymentStatus: newPaymentStatus } : prev);
            setPaymentModal(null);
            setPaymentForm({ amount: '', method: 'cash', note: '' });
            if (order.clientId) {
                const methodLabels = { cash: 'Efectivo', transfer: 'Transferencia', card: 'Tarjeta' };
                sendNotification(order.clientId, `Se registró un pago de $${newAmount.toLocaleString()} (${methodLabels[paymentForm.method] || paymentForm.method}) en tu orden "${order.description}"`, '💰');
            }
        } catch (err) { toast.error('Error'); }
    };

    const addTaskPhotoFromDetail = async (orderId, taskIndex, tasks, e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const b64 = await compressToBase64(file, 600, 0.35);
            const updatedTasks = [...tasks];
            updatedTasks[taskIndex] = { ...updatedTasks[taskIndex], photo: b64 };
            await update(ref(rtdb, `workOrders/${orderId}`), { tasks: updatedTasks, updatedAt: Date.now() });
            toast.success('Foto agregada');
            setDetailModal(prev => ({ ...prev, tasks: updatedTasks }));
        } catch (err) { toast.error('Error'); }
    };

    const addProgressPhoto = async (orderId, currentPhotos, e) => {
        const files = Array.from(e.target.files);
        if ((currentPhotos?.length || 0) + files.length > 5) return toast.error('Máximo 5 fotos');
        try {
            const compressed = await Promise.all(files.map(f => compressToBase64(f, 800, 0.4)));
            const updatedPhotos = [...(currentPhotos || []), ...compressed];
            await update(ref(rtdb, `workOrders/${orderId}`), { photos: updatedPhotos, updatedAt: Date.now() });
            toast.success('Avance subido');
            setDetailModal(prev => ({ ...prev, photos: updatedPhotos }));
        } catch (err) { toast.error('Error'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar orden?')) return;
        try { await remove(ref(rtdb, `workOrders/${id}`)); toast.success('Eliminada'); setDetailModal(null); } catch (err) { toast.error('Error'); }
    };

    const statusLabels = { pending: 'Pendiente', in_progress: 'En Progreso', waiting_parts: 'Esperando Piezas', completed: 'Completado' };
    const statusClasses = { pending: 'status-pending', in_progress: 'status-progress', waiting_parts: 'status-waiting', completed: 'status-completed' };
    const priorityLabels = { urgent: '🔴 Urgente', high: '🟠 Alta', normal: '🟢 Normal', low: '⚪ Baja' };
    const priorityClasses = { urgent: 'priority-urgent', high: 'priority-high', normal: 'priority-normal', low: 'priority-low' };

    if (loading) return <div className="page-loader"><div className="loader"></div></div>;

    return (
        <div className="page fade-in">
            <div className="page-header">
                <div><h2>Órdenes de Trabajo</h2><p className="page-subtitle">{orders.length} órdenes</p></div>
                <button className="btn btn-primary" onClick={() => openModal()}><MdAdd /> Nueva Orden</button>
            </div>

            <div className="filters-row">
                <div className="search-bar" style={{ flex: 1, marginBottom: 0 }}>
                    <MdSearch className="search-icon" />
                    <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="all">Todos</option>
                    {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
            </div>

            {filtered.length === 0 ? (
                <div className="empty-state"><MdBuild className="empty-icon" /><p>No hay órdenes</p></div>
            ) : (
                <div className="cards-grid">
                    {filtered.map(order => {
                        const progress = getTaskProgress(order.tasks);
                        return (
                            <div key={order.id} className="order-card" onClick={() => setDetailModal(order)} style={{ cursor: 'pointer' }}>
                                <div className="order-card-header">
                                    <span className={`status-badge ${statusClasses[order.status]}`}>{statusLabels[order.status]}</span>
                                    {order.priority && order.priority !== 'normal' && <span className={`priority-badge ${priorityClasses[order.priority]}`}>{priorityLabels[order.priority]}</span>}
                                    <span className="order-moto">{order.motoName}</span>
                                </div>
                                <h4 style={{ fontSize: '0.95rem', margin: '0.5rem 0 0.25rem' }}>{order.description}</h4>
                                <span className="text-muted" style={{ fontSize: '0.8rem' }}>Cliente: {order.clientName}</span>
                                {order.estimatedDate && <span className="text-muted" style={{ fontSize: '0.75rem', display: 'block' }}><MdEvent style={{ verticalAlign: 'middle' }} /> Entrega: {format(new Date(order.estimatedDate + 'T12:00:00'), 'dd MMM yyyy', { locale: es })}</span>}
                                {order.tasks?.length > 0 && (
                                    <div className="task-progress-bar" style={{ margin: '0.5rem 0' }}>
                                        <div className="progress-track">
                                            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                                        </div>
                                        <span className="progress-text">{progress}% — {order.tasks.filter(t => t.completed).length}/{order.tasks.length} tareas</span>
                                    </div>
                                )}
                                {order.totalCost > 0 && <span className="order-cost">Total: ${order.totalCost.toLocaleString()}</span>}
                                {order.paymentStatus && <span className={`payment-status-badge ps-${order.paymentStatus}`}>{order.paymentStatus === 'paid' ? '💚 Pagado' : order.paymentStatus === 'partial' ? '🟡 Parcial' : '🔴 Pendiente'}</span>}
                                {order.spareParts?.some(p => p.providedBy === 'client') && <span className="client-parts-badge"><MdPerson /> Repuesto(s) del cliente</span>}
                                {order.photos?.length > 0 && <span className="text-muted" style={{ fontSize: '0.75rem' }}><MdPhotoCamera /> {order.photos.length} fotos</span>}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* DETAIL MODAL */}
            {detailModal && (
                <div className="modal-overlay" onClick={() => setDetailModal(null)}>
                    <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{detailModal.description}</h3>
                            <button className="modal-close" onClick={() => setDetailModal(null)}><MdClose /></button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-grid">
                                <div><strong>Moto:</strong> {detailModal.motoName}</div>
                                <div><strong>Cliente:</strong> {detailModal.clientName}</div>
                                <div><strong>Mecánico:</strong> {detailModal.mechanicName}</div>
                                <div><strong>Estado:</strong> <span className={`status-badge ${statusClasses[detailModal.status]}`}>{statusLabels[detailModal.status]}</span></div>
                                <div><strong>Prioridad:</strong> <span className={`priority-badge ${priorityClasses[detailModal.priority || 'normal']}`}>{priorityLabels[detailModal.priority || 'normal']}</span></div>
                                <div><strong>Creado:</strong> {detailModal.createdAt ? format(new Date(detailModal.createdAt), 'dd MMM yyyy', { locale: es }) : ''}</div>
                                {detailModal.estimatedDate && <div><strong>Entrega estimada:</strong> {format(new Date(detailModal.estimatedDate + 'T12:00:00'), 'dd MMM yyyy', { locale: es })}</div>}
                            </div>

                            {/* TASKS CHECKLIST */}
                            {detailModal.tasks?.length > 0 && (
                                <div className="detail-section">
                                    <h4><MdAddTask /> Tareas ({detailModal.tasks.filter(t => t.completed).length}/{detailModal.tasks.length})</h4>
                                    <div className="tasks-checklist">
                                        {detailModal.tasks.map((task, i) => (
                                            <div key={i} className={`task-item ${task.completed ? 'task-done' : ''}`}>
                                                <label className="task-check-label" onClick={() => toggleTask(detailModal.id, i, detailModal.tasks)}>
                                                    <MdCheckCircle className={`task-check-icon ${task.completed ? 'checked' : ''}`} />
                                                    <span className={task.completed ? 'task-name-done' : ''}>{task.name}</span>
                                                </label>
                                                <div className="task-actions-row">
                                                    {task.photo && <img src={task.photo} alt="Tarea" className="task-thumb" onClick={() => setViewingPhoto(task.photo)} />}
                                                    <div className="file-upload" style={{ display: 'inline-block' }}>
                                                        <input type="file" id={`task-photo-${i}`} accept="image/*" onChange={e => addTaskPhotoFromDetail(detailModal.id, i, detailModal.tasks, e)} />
                                                        <label htmlFor={`task-photo-${i}`} className="btn btn-sm btn-ghost"><MdPhotoCamera /></label>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* PHOTOS */}
                            <div className="detail-section">
                                <h4><MdPhotoCamera /> Fotos del Proceso ({detailModal.photos?.length || 0}/5)</h4>
                                {detailModal.photos?.length > 0 && (
                                    <div className="photo-gallery">
                                        {detailModal.photos.map((p, i) => <img key={i} src={p} alt={`Avance ${i + 1}`} className="gallery-thumb" onClick={() => setViewingPhoto(p)} />)}
                                    </div>
                                )}
                                {(detailModal.photos?.length || 0) < 5 && (
                                    <div className="file-upload" style={{ marginTop: '0.5rem' }}>
                                        <input type="file" id="progress-photo" accept="image/*" multiple onChange={e => addProgressPhoto(detailModal.id, detailModal.photos, e)} />
                                        <label htmlFor="progress-photo" className="file-upload-label"><MdPhotoCamera /> Subir Avance</label>
                                    </div>
                                )}
                            </div>

                            {/* SPARE PARTS */}
                            {detailModal.spareParts?.length > 0 && (
                                <div className="detail-section">
                                    <h4>Repuestos</h4>
                                    <table className="data-table data-table-sm"><thead><tr><th>Repuesto</th><th>Provee</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead>
                                        <tbody>{detailModal.spareParts.map((p, i) => (
                                            <tr key={i} className={p.providedBy === 'client' ? 'row-client-part' : ''}>
                                                <td>{p.name}</td>
                                                <td><span className={`provider-badge ${p.providedBy === 'client' ? 'provider-client' : 'provider-shop'}`}>{p.providedBy === 'client' ? '👤 Cliente' : '🔧 Taller'}</span></td>
                                                <td className="text-center">{p.quantity}</td>
                                                <td className="text-right">{p.providedBy === 'client' ? '—' : `$${p.price?.toLocaleString()}`}</td>
                                                <td className="text-right">{p.providedBy === 'client' ? '—' : `$${(p.price * p.quantity).toLocaleString()}`}</td>
                                            </tr>
                                        ))}</tbody>
                                    </table>
                                </div>
                            )}

                            {/* COSTS */}
                            <div className="detail-costs">
                                <div><span>Repuestos (taller):</span><span>${(detailModal.spareParts?.filter(p => p.providedBy !== 'client').reduce((s, p) => s + p.price * p.quantity, 0) || 0).toLocaleString()}</span></div>
                                {detailModal.spareParts?.some(p => p.providedBy === 'client') && <div className="text-muted" style={{ fontSize: '0.8rem' }}><span>Repuestos del cliente:</span><span>sin costo</span></div>}
                                <div><span>Mano de Obra:</span><span>${(detailModal.laborCost || 0).toLocaleString()}</span></div>
                                <div className="total-row"><span>TOTAL:</span><strong>${(detailModal.totalCost || 0).toLocaleString()}</strong></div>
                            </div>

                            {/* PAYMENTS */}
                            <div className="detail-section">
                                <h4><MdPayment /> Pagos</h4>
                                {(() => {
                                    const payments = detailModal.payments || [];
                                    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
                                    const balance = (detailModal.totalCost || 0) - totalPaid;
                                    const methodLabels = { cash: 'Efectivo', transfer: 'Transferencia', card: 'Tarjeta' };
                                    return (<>
                                        <div className="payment-summary">
                                            <div className="payment-summary-item"><span>Total:</span><strong>${(detailModal.totalCost || 0).toLocaleString()}</strong></div>
                                            <div className="payment-summary-item"><span>Pagado:</span><strong className="text-success">${totalPaid.toLocaleString()}</strong></div>
                                            <div className="payment-summary-item"><span>Saldo:</span><strong className={balance > 0 ? 'text-danger' : 'text-success'}>${balance.toLocaleString()}</strong></div>
                                        </div>
                                        {payments.length > 0 && (
                                            <div className="payments-list">
                                                {payments.map((p, i) => (
                                                    <div key={i} className="payment-item">
                                                        <span className="payment-amount">${p.amount.toLocaleString()}</span>
                                                        <span className="payment-method">{methodLabels[p.method] || p.method}</span>
                                                        {p.note && <span className="payment-note">{p.note}</span>}
                                                        <span className="payment-date">{p.date ? format(new Date(p.date), 'dd/MM/yy HH:mm') : ''}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {balance > 0 && <button className="btn btn-primary btn-sm" style={{ marginTop: '0.5rem' }} onClick={() => { setPaymentModal(detailModal); setPaymentForm({ amount: '', method: 'cash', note: '' }); }}><MdAttachMoney /> Registrar Abono</button>}
                                    </>);
                                })()}
                            </div>

                            {detailModal.notes && <p className="info-text" style={{ marginTop: '1rem', fontStyle: 'italic' }}>"{detailModal.notes}"</p>}

                            <div className="modal-actions">
                                <button className="btn btn-ghost" onClick={() => { setDetailModal(null); openModal(detailModal); }}><MdEdit /> Editar</button>
                                <button className="btn btn-danger-ghost" onClick={() => handleDelete(detailModal.id)}><MdDelete /> Eliminar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE/EDIT MODAL */}
            {modal && (
                <div className="modal-overlay" onClick={() => setModal(false)}>
                    <div className="modal modal-xl" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{editing ? 'Editar Orden' : 'Nueva Orden de Trabajo'}</h3>
                            <button className="modal-close" onClick={() => setModal(false)}><MdClose /></button>
                        </div>
                        <form onSubmit={handleSave} className="modal-body">
                            <div className="form-row">
                                <div className="form-group"><label>Cliente</label>
                                    <select value={form.clientId} onChange={e => setForm(p => ({ ...p, clientId: e.target.value, motorcycleId: '' }))}>
                                        <option value="">— Seleccionar —</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.displayName}</option>)}
                                    </select>
                                </div>
                                <div className="form-group"><label>Moto *</label>
                                    <select value={form.motorcycleId} onChange={e => setForm(p => ({ ...p, motorcycleId: e.target.value }))}>
                                        <option value="">— Seleccionar moto —</option>
                                        {getClientMotos().map(m => <option key={m.id} value={m.id}>{m.brand} {m.model} {m.plate ? `(${m.plate})` : ''}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="form-group"><label>Descripción *</label><input type="text" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Ej: Cambio de frenos y ajuste general" /></div>

                            <div className="form-row">
                                <div className="form-group"><label>Estado</label>
                                    <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                                        {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                </div>
                                <div className="form-group"><label><MdFlag /> Prioridad</label>
                                    <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                                        {Object.entries(priorityLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                </div>
                                <div className="form-group"><label><MdEvent /> Entrega Estimada</label>
                                    <input type="date" value={form.estimatedDate} onChange={e => setForm(p => ({ ...p, estimatedDate: e.target.value }))} />
                                </div>
                            </div>

                            {/* TASKS */}
                            <div className="form-section">
                                <h4><MdAddTask /> Tareas</h4>
                                {form.tasks.map((task, i) => (
                                    <div key={i} className="task-form-row">
                                        <input type="checkbox" checked={task.completed} onChange={e => updateTask(i, 'completed', e.target.checked)} style={{ width: '20px', accentColor: 'var(--accent)' }} />
                                        <input type="text" placeholder={`Tarea ${i + 1}`} value={task.name} onChange={e => updateTask(i, 'name', e.target.value)} style={{ flex: 1 }} />
                                        <div className="file-upload" style={{ display: 'inline-block' }}>
                                            <input type="file" id={`tf-${i}`} accept="image/*" onChange={e => handleTaskPhoto(i, e)} />
                                            <label htmlFor={`tf-${i}`} className="btn btn-sm btn-ghost" title="Foto opcional"><MdPhotoCamera /></label>
                                        </div>
                                        {task.photo && <img src={task.photo} alt="T" className="task-thumb" />}
                                        {form.tasks.length > 1 && <button type="button" className="btn btn-sm btn-danger-ghost" onClick={() => removeTask(i)}>×</button>}
                                    </div>
                                ))}
                                <button type="button" className="btn btn-sm btn-ghost" onClick={addTask}><MdAdd /> Agregar Tarea</button>
                            </div>

                            {/* SPARE PARTS with providedBy */}
                            <div className="form-section">
                                <h4>Repuestos</h4>
                                <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>Si el cliente trae el repuesto, selecciona "Cliente" y no se cobrará.</p>
                                {form.spareParts.map((p, i) => (
                                    <div key={i} className="spare-part-row">
                                        <input type="text" placeholder="Nombre del repuesto" value={p.name} onChange={e => updatePart(i, 'name', e.target.value)} style={{ flex: 2 }} />
                                        <select value={p.providedBy} onChange={e => updatePart(i, 'providedBy', e.target.value)} className="provider-select">
                                            <option value="shop">🔧 Taller</option>
                                            <option value="client">👤 Cliente</option>
                                        </select>
                                        <input type="number" placeholder="Cant" min="1" value={p.quantity} onChange={e => updatePart(i, 'quantity', e.target.value)} style={{ width: '65px' }} />
                                        {p.providedBy !== 'client' ? (
                                            <input type="number" placeholder="Precio" min="0" value={p.price || ''} onChange={e => updatePart(i, 'price', e.target.value)} style={{ width: '95px' }} />
                                        ) : (
                                            <span className="text-muted" style={{ width: '95px', textAlign: 'center', fontSize: '0.8rem' }}>Sin costo</span>
                                        )}
                                        {form.spareParts.length > 1 && <button type="button" className="btn btn-sm btn-danger-ghost" onClick={() => removePart(i)}>×</button>}
                                    </div>
                                ))}
                                <button type="button" className="btn btn-sm btn-ghost" onClick={addPart}><MdAdd /> Agregar Repuesto</button>
                            </div>

                            <div className="form-row">
                                <div className="form-group"><label>Mano de Obra ($)</label><input type="number" min="0" value={form.laborCost} onChange={e => setForm(p => ({ ...p, laborCost: e.target.value }))} /></div>
                                <div className="form-group"><label>TOTAL</label><input type="text" readOnly className="total-input" value={`$${getTotalCost().toLocaleString()}`} /></div>
                            </div>

                            {/* PHOTOS */}
                            <div className="form-section">
                                <h4><MdPhotoCamera /> Fotos del Proceso (máx. 5)</h4>
                                <div className="photo-gallery">
                                    {existingPhotos.map((p, i) => (
                                        <div key={`e${i}`} className="photo-thumb-wrap">
                                            <img src={p} className="gallery-thumb" alt="" />
                                            <button type="button" className="photo-remove" onClick={() => setExistingPhotos(prev => prev.filter((_, idx) => idx !== i))}>×</button>
                                        </div>
                                    ))}
                                    {photos.map((p, i) => (
                                        <div key={`n${i}`} className="photo-thumb-wrap">
                                            <img src={p} className="gallery-thumb" alt="" />
                                            <button type="button" className="photo-remove" onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}>×</button>
                                        </div>
                                    ))}
                                </div>
                                {(existingPhotos.length + photos.length) < 5 && (
                                    <div className="file-upload"><input type="file" id="wo-photos" accept="image/*" multiple onChange={handlePhotos} /><label htmlFor="wo-photos" className="file-upload-label">{uploading ? 'Comprimiendo...' : <><MdPhotoCamera /> Agregar Fotos</>}</label></div>
                                )}
                            </div>

                            <div className="form-group"><label>Notas</label><textarea rows="2" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Observaciones..."></textarea></div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancelar</button>
                                <button type="submit" className="btn btn-primary">{editing ? 'Guardar' : 'Crear Orden'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* PAYMENT MODAL */}
            {paymentModal && (
                <div className="modal-overlay" onClick={() => setPaymentModal(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="modal-header">
                            <h3><MdAttachMoney /> Registrar Abono</h3>
                            <button className="modal-close" onClick={() => setPaymentModal(null)}><MdClose /></button>
                        </div>
                        <div className="modal-body">
                            <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Orden: {paymentModal.description}</p>
                            <div className="form-group"><label>Monto ($) *</label><input type="number" min="1" value={paymentForm.amount} onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))} placeholder="0" autoFocus /></div>
                            <div className="form-group"><label>Método de Pago</label>
                                <select value={paymentForm.method} onChange={e => setPaymentForm(p => ({ ...p, method: e.target.value }))}>
                                    <option value="cash">💵 Efectivo</option>
                                    <option value="transfer">🏦 Transferencia</option>
                                    <option value="card">💳 Tarjeta</option>
                                </select>
                            </div>
                            <div className="form-group"><label>Nota (opcional)</label><input type="text" value={paymentForm.note} onChange={e => setPaymentForm(p => ({ ...p, note: e.target.value }))} placeholder="Ej: Anticipo..." /></div>
                            <div className="modal-actions">
                                <button className="btn btn-ghost" onClick={() => setPaymentModal(null)}>Cancelar</button>
                                <button className="btn btn-primary" onClick={handleAddPayment}>Registrar</button>
                            </div>
                        </div>
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
