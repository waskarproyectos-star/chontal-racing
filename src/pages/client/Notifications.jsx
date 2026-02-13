import { useState, useEffect } from 'react';
import { ref, onValue, update, remove } from 'firebase/database';
import { rtdb } from '../../firebase/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { MdNotifications, MdCheckCircle, MdDeleteSweep, MdArrowBack } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Notifications() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const unsub = onValue(ref(rtdb, `notifications/${user.uid}`), snap => {
            if (snap.exists()) {
                const list = Object.entries(snap.val()).map(([id, v]) => ({ id, ...v }));
                setNotifications(list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
            } else { setNotifications([]); }
            setLoading(false);
        });
        return unsub;
    }, [user]);

    const markAllRead = async () => {
        const updates = {};
        notifications.filter(n => !n.read).forEach(n => { updates[`${n.id}/read`] = true; });
        if (Object.keys(updates).length) await update(ref(rtdb, `notifications/${user.uid}`), updates);
    };

    const clearAll = async () => {
        if (confirm('¿Borrar todas las notificaciones?')) {
            await remove(ref(rtdb, `notifications/${user.uid}`));
        }
    };

    const markRead = async (id) => {
        await update(ref(rtdb, `notifications/${user.uid}/${id}`), { read: true });
    };

    if (loading) return <div className="page-loader"><div className="loader"></div></div>;

    return (
        <div className="page fade-in">
            <div className="page-header" style={{ marginBottom: '1rem' }}>
                <button className="btn-icon-back" onClick={() => navigate(-1)}><MdArrowBack /></button>
                <div style={{ flex: 1 }}>
                    <h2>Notificaciones</h2>
                </div>
                <div className="header-actions">
                    {notifications.length > 0 && (
                        <>
                            <button className="btn btn-ghost" onClick={markAllRead} title="Marcar leídas"><MdCheckCircle /></button>
                            <button className="btn btn-ghost" onClick={clearAll} title="Borrar todo"><MdDeleteSweep /></button>
                        </>
                    )}
                </div>
            </div>

            <div className="notifications-list-page">
                {notifications.length === 0 ? (
                    <div className="empty-state">
                        <MdNotifications className="empty-icon" />
                        <p>No tienes notificaciones</p>
                    </div>
                ) : (
                    notifications.map(n => (
                        <div key={n.id} className={`notification-card ${n.read ? 'read' : 'unread'}`} onClick={() => !n.read && markRead(n.id)}>
                            <div className="notif-icon-col">
                                <div className="notif-icon-circle">{n.icon || '🔔'}</div>
                            </div>
                            <div className="notif-content-col">
                                <p className="notif-message">{n.message}</p>
                                <span className="notif-time">{n.createdAt ? format(new Date(n.createdAt), 'dd MMMM, HH:mm', { locale: es }) : ''}</span>
                            </div>
                            {!n.read && <div className="notif-dot"></div>}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
