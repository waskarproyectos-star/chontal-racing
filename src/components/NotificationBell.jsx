import { useState, useEffect, useRef } from 'react';
import { ref, onValue, update, remove } from 'firebase/database';
import { rtdb } from '../firebase/firebase';
import { useAuth } from '../contexts/AuthContext';
import { MdNotifications, MdClose, MdCheckCircle, MdDeleteSweep } from 'react-icons/md';

export default function NotificationBell() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [open, setOpen] = useState(false);
    const panelRef = useRef(null);

    useEffect(() => {
        if (!user) return;
        const unsub = onValue(ref(rtdb, `notifications/${user.uid}`), snap => {
            if (snap.exists()) {
                const list = Object.entries(snap.val()).map(([id, v]) => ({ id, ...v }));
                setNotifications(list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
            } else { setNotifications([]); }
        });
        return unsub;
    }, [user]);

    useEffect(() => {
        const handleClick = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
        };
        if (open) document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [open]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markRead = async (id) => {
        await update(ref(rtdb, `notifications/${user.uid}/${id}`), { read: true });
    };

    const markAllRead = async () => {
        const updates = {};
        notifications.filter(n => !n.read).forEach(n => { updates[`${n.id}/read`] = true; });
        if (Object.keys(updates).length) await update(ref(rtdb, `notifications/${user.uid}`), updates);
    };

    const clearAll = async () => {
        await remove(ref(rtdb, `notifications/${user.uid}`));
    };

    const timeAgo = (ts) => {
        if (!ts) return '';
        const diff = Date.now() - ts;
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Ahora';
        if (mins < 60) return `${mins}m`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h`;
        const days = Math.floor(hrs / 24);
        return `${days}d`;
    };

    return (
        <div className="notification-bell-container" ref={panelRef}>
            <button className="notification-bell-btn" onClick={() => setOpen(!open)}>
                <MdNotifications />
                {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>

            {open && (
                <div className="notification-panel">
                    <div className="notification-panel-header">
                        <h4>Notificaciones</h4>
                        <div className="notification-panel-actions">
                            {unreadCount > 0 && <button className="btn btn-sm btn-ghost" onClick={markAllRead} title="Marcar todas como leídas"><MdCheckCircle /></button>}
                            {notifications.length > 0 && <button className="btn btn-sm btn-ghost" onClick={clearAll} title="Limpiar todas"><MdDeleteSweep /></button>}
                            <button className="btn btn-sm btn-ghost" onClick={() => setOpen(false)}><MdClose /></button>
                        </div>
                    </div>
                    <div className="notification-list">
                        {notifications.length === 0 ? (
                            <div className="notification-empty">No tienes notificaciones</div>
                        ) : (
                            <>
                                {notifications.slice(0, 5).map(n => (
                                    <div key={n.id} className={`notification-item ${n.read ? 'read' : 'unread'}`} onClick={() => !n.read && markRead(n.id)}>
                                        <div className="notification-icon-wrap">{n.icon || '🔔'}</div>
                                        <div className="notification-content">
                                            <p className="notification-message">{n.message}</p>
                                            <span className="notification-time">{timeAgo(n.createdAt)}</span>
                                        </div>
                                        {!n.read && <div className="notification-dot"></div>}
                                    </div>
                                ))}
                                <div className="view-all-notifs" onClick={() => { setOpen(false); window.location.href = '/client/notifications'; }}>
                                    Ver todas las notificaciones
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

