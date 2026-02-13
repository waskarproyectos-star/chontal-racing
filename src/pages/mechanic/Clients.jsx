import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { rtdb } from '../../firebase/firebase';
import { MdSearch, MdPeople, MdPhone, MdEmail } from 'react-icons/md';

export default function Clients() {
    const [clients, setClients] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsub = onValue(ref(rtdb, 'users'), snap => {
            if (snap.exists()) {
                const data = snap.val();
                setClients(
                    Object.entries(data)
                        .map(([id, v]) => ({ id, ...v }))
                        .filter(u => u.role === 'client')
                        .sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''))
                );
            } else { setClients([]); }
            setLoading(false);
        });
        return unsub;
    }, []);

    useEffect(() => {
        const q = search.toLowerCase();
        setFiltered(q ? clients.filter(c =>
            c.displayName?.toLowerCase().includes(q) || c.phone?.includes(q) || c.email?.toLowerCase().includes(q)
        ) : clients);
    }, [search, clients]);

    if (loading) return <div className="page-loader"><div className="loader"></div></div>;

    return (
        <div className="page fade-in">
            <div className="page-header">
                <div><h2>Clientes</h2><p className="page-subtitle">{clients.length} clientes registrados</p></div>
            </div>

            <div className="search-bar">
                <MdSearch className="search-icon" />
                <input type="text" placeholder="Buscar por nombre, teléfono o email..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {filtered.length === 0 ? (
                <div className="empty-state"><MdPeople className="empty-icon" /><p>No hay clientes registrados</p><p className="text-muted">Los clientes aparecerán aquí cuando se registren en la app</p></div>
            ) : (
                <div className="cards-grid">
                    {filtered.map(client => (
                        <div key={client.id} className="client-card">
                            <div className="client-card-header">
                                <div className="client-avatar">{(client.displayName || 'C')[0].toUpperCase()}</div>
                                <div className="client-main-info">
                                    <h4>{client.displayName}</h4>
                                    {client.phone && <span className="client-detail"><MdPhone /> {client.phone}</span>}
                                    {client.email && <span className="client-detail"><MdEmail /> {client.email}</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
