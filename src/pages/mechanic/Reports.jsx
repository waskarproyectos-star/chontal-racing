import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../../firebase/firebase';
import { MdAssessment, MdAttachMoney, MdTrendingUp, MdBuild, MdPeople, MdShoppingCart } from 'react-icons/md';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Reports() {
    const [orders, setOrders] = useState([]);
    const [parts, setParts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState(6);

    useEffect(() => {
        const unsubs = [];
        unsubs.push(onValue(ref(rtdb, 'workOrders'), snap => {
            setOrders(snap.exists() ? Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })) : []);
            setLoading(false);
        }));
        unsubs.push(onValue(ref(rtdb, 'spareParts'), snap => {
            setParts(snap.exists() ? Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })) : []);
        }));
        return () => unsubs.forEach(u => u());
    }, []);

    // Month revenue data
    const getMonthlyData = () => {
        const months = [];
        for (let i = period - 1; i >= 0; i--) {
            const d = subMonths(new Date(), i);
            const start = startOfMonth(d).getTime();
            const end = endOfMonth(d).getTime();
            const monthOrders = orders.filter(o => o.status === 'completed' && o.updatedAt >= start && o.updatedAt <= end);
            months.push({
                label: format(d, 'MMM yy', { locale: es }),
                revenue: monthOrders.reduce((s, o) => s + (o.totalCost || 0), 0),
                count: monthOrders.length
            });
        }
        return months;
    };

    // Top services
    const getTopServices = () => {
        const map = {};
        orders.forEach(o => {
            const desc = o.description || 'Sin descripción';
            if (!map[desc]) map[desc] = { name: desc, count: 0, revenue: 0 };
            map[desc].count++;
            if (o.status === 'completed') map[desc].revenue += (o.totalCost || 0);
        });
        return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 8);
    };

    // Top parts used in orders
    const getTopParts = () => {
        const map = {};
        orders.forEach(o => {
            (o.spareParts || []).forEach(p => {
                if (!p.name) return;
                if (!map[p.name]) map[p.name] = { name: p.name, count: 0, qty: 0 };
                map[p.name].count++;
                map[p.name].qty += (p.quantity || 1);
            });
        });
        return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 8);
    };

    // Top clients
    const getTopClients = () => {
        const map = {};
        orders.forEach(o => {
            const name = o.clientName || 'Desconocido';
            const cid = o.clientId || name;
            if (!map[cid]) map[cid] = { name, count: 0, spent: 0 };
            map[cid].count++;
            if (o.status === 'completed') map[cid].spent += (o.totalCost || 0);
        });
        return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 8);
    };

    // Summary stats
    const completedOrders = orders.filter(o => o.status === 'completed');
    const totalRevenue = completedOrders.reduce((s, o) => s + (o.totalCost || 0), 0);
    const avgTicket = completedOrders.length ? Math.round(totalRevenue / completedOrders.length) : 0;
    const now = new Date();
    const thisMonthStart = startOfMonth(now).getTime();
    const monthRevenue = completedOrders.filter(o => o.updatedAt >= thisMonthStart).reduce((s, o) => s + (o.totalCost || 0), 0);

    const monthlyData = getMonthlyData();
    const maxRevenue = Math.max(...monthlyData.map(m => m.revenue), 1);

    if (loading) return <div className="page-loader"><div className="loader"></div></div>;

    return (
        <div className="page fade-in">
            <div className="page-header">
                <div><h2><MdAssessment /> Reportes</h2><p className="page-subtitle">{orders.length} órdenes totales</p></div>
                <select className="filter-select" value={period} onChange={e => setPeriod(Number(e.target.value))}>
                    <option value={3}>Últimos 3 meses</option>
                    <option value={6}>Últimos 6 meses</option>
                    <option value={12}>Último año</option>
                </select>
            </div>

            {/* Summary Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f5af19, #f12711)' }}><MdAttachMoney /></div>
                    <div className="stat-info"><span className="stat-number">${totalRevenue.toLocaleString()}</span><span className="stat-label">Ingresos Totales</span></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #43e97b, #38f9d7)' }}><MdAttachMoney /></div>
                    <div className="stat-info"><span className="stat-number">${monthRevenue.toLocaleString()}</span><span className="stat-label">Ingresos del Mes</span></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}><MdTrendingUp /></div>
                    <div className="stat-info"><span className="stat-number">${avgTicket.toLocaleString()}</span><span className="stat-label">Ticket Promedio</span></div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #4facfe, #00f2fe)' }}><MdBuild /></div>
                    <div className="stat-info"><span className="stat-number">{completedOrders.length}</span><span className="stat-label">Órdenes Completadas</span></div>
                </div>
            </div>

            {/* Revenue Chart */}
            <div className="report-section">
                <h3><MdTrendingUp /> Ingresos por Mes</h3>
                <div className="chart-container">
                    {monthlyData.map((m, i) => (
                        <div key={i} className="chart-bar-group">
                            <div className="chart-bar-value">${m.revenue > 0 ? m.revenue.toLocaleString() : '—'}</div>
                            <div className="chart-bar-track">
                                <div className="chart-bar-fill" style={{ height: `${(m.revenue / maxRevenue) * 100}%` }}></div>
                            </div>
                            <div className="chart-bar-label">{m.label}</div>
                            <div className="chart-bar-count">{m.count} ord.</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="report-grid">
                {/* Top Services */}
                <div className="report-section">
                    <h3><MdBuild /> Servicios Más Solicitados</h3>
                    <div className="ranking-list">
                        {getTopServices().length === 0 ? <p className="text-muted">Sin datos</p> : getTopServices().map((s, i) => (
                            <div key={i} className="ranking-item">
                                <span className="ranking-pos">#{i + 1}</span>
                                <div className="ranking-info">
                                    <span className="ranking-name">{s.name}</span>
                                    <span className="ranking-meta">{s.count} veces — ${s.revenue.toLocaleString()}</span>
                                </div>
                                <div className="ranking-bar"><div style={{ width: `${(s.count / getTopServices()[0].count) * 100}%` }}></div></div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Parts */}
                <div className="report-section">
                    <h3><MdShoppingCart /> Repuestos Más Usados</h3>
                    <div className="ranking-list">
                        {getTopParts().length === 0 ? <p className="text-muted">Sin datos</p> : getTopParts().map((p, i) => (
                            <div key={i} className="ranking-item">
                                <span className="ranking-pos">#{i + 1}</span>
                                <div className="ranking-info">
                                    <span className="ranking-name">{p.name}</span>
                                    <span className="ranking-meta">{p.qty} unidades en {p.count} órdenes</span>
                                </div>
                                <div className="ranking-bar"><div style={{ width: `${(p.qty / getTopParts()[0].qty) * 100}%` }}></div></div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Clients */}
                <div className="report-section">
                    <h3><MdPeople /> Clientes Frecuentes</h3>
                    <div className="ranking-list">
                        {getTopClients().length === 0 ? <p className="text-muted">Sin datos</p> : getTopClients().map((c, i) => (
                            <div key={i} className="ranking-item">
                                <span className="ranking-pos">#{i + 1}</span>
                                <div className="ranking-info">
                                    <span className="ranking-name">{c.name}</span>
                                    <span className="ranking-meta">{c.count} órdenes — ${c.spent.toLocaleString()} gastados</span>
                                </div>
                                <div className="ranking-bar"><div style={{ width: `${(c.count / getTopClients()[0].count) * 100}%` }}></div></div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
