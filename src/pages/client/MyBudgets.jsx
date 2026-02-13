import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../../firebase/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { MdRequestQuote, MdAttachMoney } from 'react-icons/md';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function MyBudgets() {
    const { user } = useAuth();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const unsub = onValue(ref(rtdb, 'workOrders'), snap => {
            if (snap.exists()) {
                setOrders(Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })).filter(o => o.clientId === user.uid).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
            } else { setOrders([]); }
            setLoading(false);
        });
        return unsub;
    }, [user]);

    const statusLabels = { pending: 'Pendiente', in_progress: 'En Progreso', waiting_parts: 'Esperando Piezas', completed: 'Completado' };
    const statusClasses = { pending: 'status-pending', in_progress: 'status-progress', waiting_parts: 'status-waiting', completed: 'status-completed' };

    if (loading) return <div className="page-loader"><div className="loader"></div></div>;

    return (
        <div className="page fade-in">
            <div className="page-header">
                <h2>Presupuestos y Costos</h2>
                <p className="page-subtitle">Detalle de costos de tus reparaciones</p>
            </div>

            {orders.length === 0 ? (
                <div className="empty-state"><MdRequestQuote className="empty-icon" /><p>No tienes presupuestos aún</p></div>
            ) : (
                <div className="budgets-list">
                    {orders.map(order => (
                        <div key={order.id} className="budget-card">
                            <div className="budget-header">
                                <div><h4>{order.description}</h4><span className="budget-moto">{order.motoName || 'Moto no especificada'}</span></div>
                                <span className={`status-badge ${statusClasses[order.status]}`}>{statusLabels[order.status]}</span>
                            </div>
                            {order.spareParts?.length > 0 && (
                                <div className="budget-parts">
                                    <h5>Repuestos</h5>
                                    <table className="data-table data-table-sm">
                                        <thead><tr><th>Repuesto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th></tr></thead>
                                        <tbody>{order.spareParts.map((p, i) => (<tr key={i}><td>{p.name}</td><td className="text-center">{p.quantity}</td><td className="text-right">${p.price?.toLocaleString()}</td><td className="text-right">${(p.price * p.quantity).toLocaleString()}</td></tr>))}</tbody>
                                    </table>
                                </div>
                            )}
                            <div className="budget-totals">
                                <div className="budget-line"><span>Repuestos:</span><span>${(order.spareParts?.reduce((s, p) => s + p.price * p.quantity, 0) || 0).toLocaleString()}</span></div>
                                <div className="budget-line"><span>Mano de Obra:</span><span>${(order.laborCost || 0).toLocaleString()}</span></div>
                                <div className="budget-line budget-total"><span><MdAttachMoney /> TOTAL:</span><span>${(order.totalCost || 0).toLocaleString()}</span></div>
                            </div>

                            {/* PAYMENT INFO */}
                            {order.totalCost > 0 && (
                                <div className="budget-payments">
                                    {(() => {
                                        const payments = order.payments || [];
                                        const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
                                        const balance = (order.totalCost || 0) - totalPaid;
                                        return (
                                            <div className="payment-summary-client">
                                                <div className="p-sum-item"><span>Pagado:</span><span className="text-success">${totalPaid.toLocaleString()}</span></div>
                                                <div className="p-sum-item"><span>Saldo:</span><span className={balance > 0 ? 'text-danger' : 'text-success'}>${balance.toLocaleString()}</span></div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            {order.notes && <p className="budget-notes">{order.notes}</p>}
                            <span className="budget-date">{order.createdAt ? format(new Date(order.createdAt), 'dd MMM yyyy', { locale: es }) : ''}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
