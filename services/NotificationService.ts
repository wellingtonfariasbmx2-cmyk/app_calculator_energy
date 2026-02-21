import { supabase } from './supabaseClient';

// --- Tipos ---
export interface AppNotification {
    id: string;
    type: string;
    title: string;
    message: string;
    entity_type: string;
    entity_id: string | null;
    read: boolean;
    created_at: string;
}

type NotificationCallback = (notification: AppNotification) => void;

// --- Estado ---
let channel: any = null;
const listeners: NotificationCallback[] = [];

// --- Helpers ---
function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'agora';
    if (diffMin < 60) return `há ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `há ${diffH}h`;
    const diffD = Math.floor(diffH / 24);
    return `há ${diffD}d`;
}

function getNotificationMeta(type: string): { icon: string; color: string } {
    switch (type) {
        case 'event_created':
        case 'event_updated':
            return { icon: '📅', color: '#a855f7' }; // purple
        case 'allocation_created':
            return { icon: '📦', color: '#22c55e' }; // green
        case 'project_created':
            return { icon: '⚡', color: '#3b82f6' }; // blue
        default:
            return { icon: '🔔', color: '#f59e0b' }; // amber
    }
}

// --- CRUD ---
async function createNotification(
    type: string,
    title: string,
    message: string,
    entityType: string,
    entityId?: string
): Promise<AppNotification | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('notifications')
        .insert({
            type,
            title,
            message,
            entity_type: entityType,
            entity_id: entityId || null,
            read: false,
        })
        .select()
        .single();

    if (error) {
        console.error('❌ Erro ao criar notificação:', error);
        return null;
    }

    return data as AppNotification;
}

async function getNotifications(limit = 20): Promise<AppNotification[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error('❌ Erro ao buscar notificações:', error);
        return [];
    }

    return (data || []) as AppNotification[];
}

async function getUnreadCount(): Promise<number> {
    if (!supabase) return 0;

    const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('read', false);

    if (error) return 0;
    return count || 0;
}

async function markAsRead(id: string): Promise<void> {
    if (!supabase) return;
    await supabase.from('notifications').update({ read: true }).eq('id', id);
}

async function markAllAsRead(): Promise<void> {
    if (!supabase) return;
    await supabase.from('notifications').update({ read: true }).eq('read', false);
}

// --- Push (navegador) ---
async function requestPushPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
        console.warn('🔔 Navegador não suporta notificações');
        return 'denied';
    }
    if (Notification.permission === 'granted') return 'granted';
    const perm = await Notification.requestPermission();
    console.log('🔔 Permissão de notificação:', perm);
    return perm;
}

async function sendBrowserNotification(title: string, body: string, tag?: string) {
    // 1) Verifica suporte
    if (!('Notification' in window)) {
        console.warn('🔔 Notification API não disponível neste navegador');
        return;
    }

    // 2) Se permissão não foi concedida, não tenta (precisa de user gesture para pedir)
    if (Notification.permission !== 'granted') {
        console.warn('🔔 Permissão não concedida. O usuário precisa clicar no sino primeiro.');
        return;
    }

    const notifTag = tag || 'lightload-' + Date.now();
    const notifOptions: any = {
        body,
        icon: 'https://cdn-icons-png.flaticon.com/512/427/427735.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/427/427735.png',
        vibrate: [200, 100, 200],
        tag: notifTag,
    };

    // 3) Tenta via Service Worker com timeout de 3s
    if ('serviceWorker' in navigator) {
        try {
            const registration = await Promise.race([
                navigator.serviceWorker.ready,
                new Promise((_, reject) => setTimeout(() => reject(new Error('SW timeout')), 3000))
            ]) as ServiceWorkerRegistration;

            await registration.showNotification(title, notifOptions);
            console.log('🔔 Notificação push enviada via Service Worker');
            return;
        } catch (err) {
            console.warn('🔔 SW indisponível, usando fallback:', err);
        }
    }

    // 4) Fallback: Notification API direta
    try {
        new Notification(title, notifOptions);
        console.log('🔔 Notificação enviada via Notification API direta');
    } catch (err) {
        console.error('🔔 Falha ao enviar notificação:', err);
    }
}

// --- Realtime Listener ---
function subscribeToChanges() {
    if (!supabase || channel) return;

    channel = supabase
        .channel('db-notifications')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'events' },
            async (payload: any) => {
                const ev = payload.new;
                const notif = await createNotification(
                    'event_created',
                    '📅 Novo Evento',
                    ev.name || 'Evento sem nome',
                    'event',
                    ev.id
                );
                if (notif) {
                    listeners.forEach((cb) => cb(notif));
                    sendBrowserNotification('Novo Evento', ev.name || 'Novo evento criado');
                }
            }
        )
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'events' },
            async (payload: any) => {
                const ev = payload.new;
                const notif = await createNotification(
                    'event_updated',
                    '📅 Evento Atualizado',
                    ev.name || 'Evento atualizado',
                    'event',
                    ev.id
                );
                if (notif) {
                    listeners.forEach((cb) => cb(notif));
                    sendBrowserNotification('Evento Atualizado', ev.name || 'Um evento foi atualizado');
                }
            }
        )
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'equipment_allocations' },
            async (payload: any) => {
                const alloc = payload.new;
                const notif = await createNotification(
                    'allocation_created',
                    '📦 Equipamento Alocado',
                    `Alocação de ${alloc.quantity_allocated} unidade(s)`,
                    'equipment_allocation',
                    alloc.id
                );
                if (notif) {
                    listeners.forEach((cb) => cb(notif));
                    sendBrowserNotification('Equipamento Alocado', `${alloc.quantity_allocated} unidade(s) alocada(s)`);
                }
            }
        )
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'calculations' },
            async (payload: any) => {
                const calc = payload.new;
                const notif = await createNotification(
                    'project_created',
                    '⚡ Novo Projeto',
                    calc.name || 'Projeto de energia',
                    'calculation',
                    calc.id
                );
                if (notif) {
                    listeners.forEach((cb) => cb(notif));
                    sendBrowserNotification('Novo Projeto', calc.name || 'Projeto de energia criado');
                }
            }
        )
        .subscribe((status: string) => {
            console.log('🔔 Realtime notification channel:', status);
        });
}

function onNewNotification(callback: NotificationCallback) {
    listeners.push(callback);
    return () => {
        const idx = listeners.indexOf(callback);
        if (idx > -1) listeners.splice(idx, 1);
    };
}

function cleanup() {
    if (channel && supabase) {
        supabase.removeChannel(channel);
        channel = null;
    }
    listeners.length = 0;
}

// --- Export ---
export const NotificationService = {
    createNotification,
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    requestPushPermission,
    sendBrowserNotification,
    subscribeToChanges,
    onNewNotification,
    cleanup,
    timeAgo,
    getNotificationMeta,
};
