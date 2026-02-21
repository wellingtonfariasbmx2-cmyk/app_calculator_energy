import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, CheckCheck, Calendar, Package, Zap, Volume2 } from 'lucide-react';
import { NotificationService, AppNotification } from '../services/NotificationService';

export default function NotificationCenter() {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [animateBell, setAnimateBell] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    // Carrega notificações e conta de não-lidas
    const loadNotifications = async () => {
        const notifs = await NotificationService.getNotifications(30);
        setNotifications(notifs);
        const count = await NotificationService.getUnreadCount();
        setUnreadCount(count);
    };

    useEffect(() => {
        loadNotifications();

        // Iniciar Realtime
        NotificationService.subscribeToChanges();

        // Listener para novas notificações em tempo real
        const unsub = NotificationService.onNewNotification((notif) => {
            setNotifications((prev) => [notif, ...prev]);
            setUnreadCount((prev) => prev + 1);

            // Animar sino
            setAnimateBell(true);
            setTimeout(() => setAnimateBell(false), 1000);
        });

        return () => {
            unsub();
            NotificationService.cleanup();
        };
    }, []);

    // Fechar ao clicar fora
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [isOpen]);

    const handleMarkAsRead = async (id: string) => {
        await NotificationService.markAsRead(id);
        setNotifications((prev) =>
            prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
    };

    const handleMarkAllAsRead = async () => {
        await NotificationService.markAllAsRead();
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'event_created':
            case 'event_updated':
                return <Calendar size={16} />;
            case 'allocation_created':
                return <Package size={16} />;
            case 'project_created':
                return <Zap size={16} />;
            default:
                return <Bell size={16} />;
        }
    };

    const getColor = (type: string) => {
        switch (type) {
            case 'event_created':
            case 'event_updated':
                return '#a855f7';
            case 'allocation_created':
                return '#22c55e';
            case 'project_created':
                return '#3b82f6';
            default:
                return '#f59e0b';
        }
    };

    return (
        <div ref={panelRef} style={{ position: 'relative' }}>
            {/* Botão Sino */}
            <button
                onClick={async () => {
                    // Pede permissão no clique (user gesture = sempre funciona)
                    if ('Notification' in window && Notification.permission === 'default') {
                        const perm = await Notification.requestPermission();
                        console.log('🔔 Permissão concedida pelo clique:', perm);
                    }
                    setIsOpen(!isOpen);
                }}
                style={{
                    position: 'relative',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '12px',
                    padding: '8px',
                    cursor: 'pointer',
                    color: '#e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                    animation: animateBell ? 'bellShake 0.5s ease' : 'none',
                }}
                title="Notificações"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span
                        style={{
                            position: 'absolute',
                            top: '-4px',
                            right: '-4px',
                            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                            color: '#fff',
                            borderRadius: '999px',
                            fontSize: '10px',
                            fontWeight: 700,
                            minWidth: '18px',
                            height: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '0 4px',
                            boxShadow: '0 2px 8px rgba(239,68,68,0.4)',
                            animation: 'badgePulse 2s infinite',
                        }}
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Painel dropdown */}
            {isOpen && (
                <div
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        right: 0,
                        width: '360px',
                        maxWidth: '90vw',
                        maxHeight: '480px',
                        background: 'linear-gradient(180deg, #1a2332, #0f172a)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '16px',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                        zIndex: 100,
                        overflow: 'hidden',
                        animation: 'slideDown 0.25s ease',
                    }}
                >
                    {/* Header */}
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '16px 20px',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Bell size={18} style={{ color: '#a855f7' }} />
                            <span style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '15px' }}>
                                Notificações
                            </span>
                            {unreadCount > 0 && (
                                <span
                                    style={{
                                        background: 'rgba(168,85,247,0.15)',
                                        color: '#a855f7',
                                        padding: '2px 8px',
                                        borderRadius: '999px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                    }}
                                >
                                    {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllAsRead}
                                    title="Marcar todas como lidas"
                                    style={{
                                        background: 'rgba(34,197,94,0.1)',
                                        border: '1px solid rgba(34,197,94,0.2)',
                                        borderRadius: '8px',
                                        padding: '4px 8px',
                                        cursor: 'pointer',
                                        color: '#22c55e',
                                        fontSize: '11px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                    }}
                                >
                                    <CheckCheck size={13} /> Ler todas
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#64748b',
                                    padding: '2px',
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Lista */}
                    <div
                        style={{
                            overflowY: 'auto',
                            maxHeight: '400px',
                            padding: '4px 0',
                        }}
                    >
                        {notifications.length === 0 ? (
                            <div
                                style={{
                                    textAlign: 'center',
                                    padding: '48px 24px',
                                    color: '#475569',
                                }}
                            >
                                <Bell size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                                <p style={{ fontSize: '14px', margin: 0 }}>Nenhuma notificação</p>
                                <p style={{ fontSize: '12px', margin: '4px 0 0', opacity: 0.6 }}>
                                    Você será notificado sobre novos eventos, alocações e projetos
                                </p>
                            </div>
                        ) : (
                            notifications.map((notif, idx) => (
                                <div
                                    key={notif.id}
                                    onClick={() => !notif.read && handleMarkAsRead(notif.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '12px',
                                        padding: '12px 20px',
                                        cursor: notif.read ? 'default' : 'pointer',
                                        borderBottom:
                                            idx < notifications.length - 1
                                                ? '1px solid rgba(255,255,255,0.04)'
                                                : 'none',
                                        background: notif.read ? 'transparent' : 'rgba(168,85,247,0.04)',
                                        transition: 'background 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!notif.read)
                                            (e.currentTarget as HTMLDivElement).style.background =
                                                'rgba(168,85,247,0.08)';
                                    }}
                                    onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLDivElement).style.background = notif.read
                                            ? 'transparent'
                                            : 'rgba(168,85,247,0.04)';
                                    }}
                                >
                                    {/* Ícone */}
                                    <div
                                        style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '10px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            background: `${getColor(notif.type)}15`,
                                            color: getColor(notif.type),
                                        }}
                                    >
                                        {getIcon(notif.type)}
                                    </div>

                                    {/* Conteúdo */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                marginBottom: '2px',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    color: '#e2e8f0',
                                                    fontSize: '13px',
                                                    fontWeight: notif.read ? 400 : 600,
                                                }}
                                            >
                                                {notif.title}
                                            </span>
                                            {!notif.read && (
                                                <div
                                                    style={{
                                                        width: '6px',
                                                        height: '6px',
                                                        borderRadius: '50%',
                                                        background: '#a855f7',
                                                        flexShrink: 0,
                                                    }}
                                                />
                                            )}
                                        </div>
                                        <p
                                            style={{
                                                color: '#94a3b8',
                                                fontSize: '12px',
                                                margin: 0,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                            }}
                                        >
                                            {notif.message}
                                        </p>
                                        <span
                                            style={{
                                                color: '#475569',
                                                fontSize: '11px',
                                                marginTop: '4px',
                                                display: 'block',
                                            }}
                                        >
                                            {NotificationService.timeAgo(notif.created_at)}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* CSS Animations */}
            <style>{`
        @keyframes bellShake {
          0%, 100% { transform: rotate(0); }
          15% { transform: rotate(15deg); }
          30% { transform: rotate(-15deg); }
          45% { transform: rotate(10deg); }
          60% { transform: rotate(-10deg); }
          75% { transform: rotate(5deg); }
        }
        @keyframes badgePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
        </div>
    );
}
