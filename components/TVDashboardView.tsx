import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Monitor, Calendar, Package, Clock, Zap, AlertTriangle,
    TrendingUp, CheckCircle, ArrowRight, ArrowLeft, RefreshCw,
    Wrench, Bell, ChevronRight, MapPin, User, Maximize, Minimize,
    Activity, Truck, RotateCcw, X
} from 'lucide-react';
import { EventService } from '../services/EventService';
import { DataService } from '../services/supabaseClient';
import { MaintenanceService } from '../services/MaintenanceService';
import { Event, Equipment, MaintenanceRecord } from '../types';

export function TVDashboardView() {
    const [events, setEvents] = useState<Event[]>([]);
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [newEventIds, setNewEventIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const previousEventIdsRef = useRef<Set<string>>(new Set());
    const containerRef = useRef<HTMLDivElement>(null);

    // Clock update every second
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Load data
    const loadData = useCallback(async () => {
        try {
            const [eventsData, equipData] = await Promise.all([
                EventService.getEvents(),
                DataService.getEquipments(),
            ]);

            // Try to load maintenance (may fail if table doesn't exist yet)
            let maintenanceData: MaintenanceRecord[] = [];
            try {
                maintenanceData = await MaintenanceService.getMaintenanceRecords();
            } catch (e) {
                console.warn('Maintenance table may not exist yet:', e);
            }

            // Detect new events
            const currentIds = new Set(eventsData.map(e => e.id));
            if (previousEventIdsRef.current.size > 0) {
                const newIds = new Set<string>();
                currentIds.forEach(id => {
                    if (!previousEventIdsRef.current.has(id)) {
                        newIds.add(id);
                    }
                });
                if (newIds.size > 0) {
                    setNewEventIds(prev => new Set([...prev, ...newIds]));
                    // Auto-remove new event highlight after 60s
                    setTimeout(() => {
                        setNewEventIds(prev => {
                            const next = new Set(prev);
                            newIds.forEach(id => next.delete(id));
                            return next;
                        });
                    }, 60000);
                }
            }
            previousEventIdsRef.current = currentIds;

            setEvents(eventsData);
            setEquipments(equipData);
            setMaintenance(maintenanceData);
            setLastRefresh(new Date());
            setIsLoading(false);
        } catch (err) {
            console.error('TV Dashboard load error:', err);
            setIsLoading(false);
        }
    }, []);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, [loadData]);

    // Fullscreen toggle
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    // Helper: extract YYYY-MM-DD from any date string (handles both 'YYYY-MM-DD' and full TIMESTAMPTZ)
    const toDateStr = (s: string) => s ? s.substring(0, 10) : '';

    // Data calculations (use local date, not UTC)
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local timezone
    const todayEvents = events.filter(e => toDateStr(e.startDate) <= today && toDateStr(e.endDate) >= today && e.status !== 'cancelled');
    const upcomingEvents = events.filter(e => toDateStr(e.startDate) > today && e.status === 'planned').sort((a, b) => a.startDate.localeCompare(b.startDate)).slice(0, 5);
    const activeEvents = events.filter(e => e.status === 'in_progress');
    const completedThisMonth = events.filter(e => {
        if (e.status !== 'completed') return false;
        const d = new Date(e.endDate);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    // Equipment stats
    const totalEquipments = equipments.reduce((sum, eq) => sum + eq.quantityOwned, 0);
    const inMaintenanceFromRecords = new Set(maintenance.filter(m => m.status !== 'completed').map(m => m.equipmentId)).size;
    const inMaintenanceFromStatus = equipments.filter(e => e.status === 'maintenance').length;
    const inMaintenance = Math.max(inMaintenanceFromRecords, inMaintenanceFromStatus);
    const allocatedCount = events
        .filter(e => e.status === 'planned' || e.status === 'in_progress')
        .reduce((sum, e) => sum + (e.equipmentAllocations?.reduce((s, a) => s + a.quantityAllocated, 0) || 0), 0);

    // Maintenance stats
    const pendingMaintenance = maintenance.filter(m => m.status === 'pending').length;
    const overdueMaintenance = maintenance.filter(m =>
        m.status !== 'completed' && m.scheduledDate && toDateStr(m.scheduledDate) < today
    ).length;

    // Equipment going out today (events starting today)
    const goingOutToday = events
        .filter(e => toDateStr(e.startDate) === today && (e.status === 'planned' || e.status === 'in_progress'))
        .flatMap(e => (e.equipmentAllocations || []).map(a => ({ ...a, eventName: e.name, venue: e.venue })));

    // Equipment returning today (events ending today)
    const returningToday = events
        .filter(e => toDateStr(e.endDate) === today && e.status === 'in_progress')
        .flatMap(e => (e.equipmentAllocations || []).map(a => ({ ...a, eventName: e.name, venue: e.venue })));

    const formatTime = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const safeDate = (s: string) => { const d = new Date(s.length === 10 ? s + 'T12:00:00' : s); return isNaN(d.getTime()) ? new Date() : d; };
    const formatDate = (s: string) => safeDate(s).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    const formatDateFull = (s: string) => safeDate(s).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });

    const statusColors: Record<string, string> = {
        planned: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        in_progress: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    const statusLabels: Record<string, string> = {
        planned: 'Planejado',
        in_progress: 'Em Andamento',
        completed: 'Concluído',
        cancelled: 'Cancelado',
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <RefreshCw className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
                    <p className="text-slate-400 text-lg">Carregando dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className={`${isFullscreen ? 'bg-background p-6' : ''} min-h-[calc(100vh-120px)] overflow-x-hidden`}>
            {/* Header Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-blue-600 to-violet-600 rounded-xl shadow-lg shadow-blue-500/20">
                        <Monitor className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">Dashboard</h1>
                        <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">Monitoramento em tempo real</p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    {/* Live Clock */}
                    <div className="bg-slate-800/80 border border-slate-700 rounded-xl px-2.5 sm:px-4 py-1.5 sm:py-2 flex items-center gap-2 sm:gap-3 flex-1 sm:flex-none justify-center">
                        <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
                        <span className="text-white font-mono text-base sm:text-lg font-bold tabular-nums">{formatTime(currentTime)}</span>
                        <span className="hidden sm:inline text-slate-500 text-xs">{currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
                    </div>
                    {/* Last refresh */}
                    <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        Atualizado {formatTime(lastRefresh)}
                    </div>
                    <button onClick={loadData} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all ml-auto sm:ml-0" title="Atualizar agora">
                        <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <button onClick={toggleFullscreen} className="hidden sm:flex p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all" title="Tela cheia">
                        {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            {/* Stats Cards Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-3 mb-6">
                <StatCard icon={Calendar} label="Eventos Hoje" value={todayEvents.length} color="blue" />
                <StatCard icon={Activity} label="Em Andamento" value={activeEvents.length} color="yellow" />
                <StatCard icon={CheckCircle} label="Concluídos (mês)" value={completedThisMonth.length} color="emerald" />
                <StatCard icon={Package} label="Equip. Alocados" value={allocatedCount} color="purple" sub={`de ${totalEquipments}`} />
                <StatCard icon={Wrench} label="Manutenção" value={pendingMaintenance} color={overdueMaintenance > 0 ? 'red' : 'orange'} sub={overdueMaintenance > 0 ? `${overdueMaintenance} atrasada(s)` : undefined} />
                <StatCard icon={TrendingUp} label="Próximos" value={upcomingEvents.length} color="cyan" />
            </div>

            {/* New Events Alert */}
            {newEventIds.size > 0 && (
                <div className="mb-6 bg-gradient-to-r from-emerald-900/30 via-emerald-800/20 to-emerald-900/30 border border-emerald-500/40 rounded-xl p-4 animate-pulse">
                    <div className="flex items-center gap-3">
                        <Bell className="w-6 h-6 text-emerald-400 animate-bounce" />
                        <div>
                            <p className="text-emerald-300 font-bold text-sm">🎉 {newEventIds.size} novo(s) evento(s) detectado(s)!</p>
                            <p className="text-emerald-400/60 text-xs">Destacados em verde abaixo</p>
                        </div>
                        <button onClick={() => setNewEventIds(new Set())} className="ml-auto p-1 text-emerald-400 hover:bg-emerald-500/20 rounded-lg">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* LEFT: Events Today + Active */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Today's Events */}
                    <DashboardSection title="Eventos Hoje" icon={Calendar} count={todayEvents.length} color="blue">
                        {todayEvents.length === 0 ? (
                            <EmptyState message="Nenhum evento hoje" icon={Calendar} />
                        ) : (
                            <div className="space-y-2">
                                {todayEvents.map(event => (
                                    <EventCard key={event.id} event={event} isNew={newEventIds.has(event.id)} formatDate={formatDate} statusColors={statusColors} statusLabels={statusLabels} />
                                ))}
                            </div>
                        )}
                    </DashboardSection>

                    {/* Equipment Movement */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Going Out */}
                        <DashboardSection title="Saindo Hoje" icon={Truck} count={goingOutToday.length} color="orange">
                            {goingOutToday.length === 0 ? (
                                <EmptyState message="Nada saindo hoje" icon={Truck} small />
                            ) : (
                                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                    {goingOutToday.map((item, i) => (
                                        <div key={i} className="flex items-center justify-between bg-orange-900/10 border border-orange-500/20 rounded-lg px-3 py-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-white text-xs font-medium truncate">{item.equipment?.name || 'Equipamento'}</p>
                                                <p className="text-[10px] text-slate-500 truncate">{item.eventName}</p>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-orange-400 text-xs font-bold">{item.quantityAllocated}x</span>
                                                <ArrowRight className="w-3 h-3 text-orange-400" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </DashboardSection>

                        {/* Returning */}
                        <DashboardSection title="Retornando Hoje" icon={RotateCcw} count={returningToday.length} color="emerald">
                            {returningToday.length === 0 ? (
                                <EmptyState message="Nada retornando hoje" icon={RotateCcw} small />
                            ) : (
                                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                    {returningToday.map((item, i) => (
                                        <div key={i} className="flex items-center justify-between bg-emerald-900/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-white text-xs font-medium truncate">{item.equipment?.name || 'Equipamento'}</p>
                                                <p className="text-[10px] text-slate-500 truncate">{item.eventName}</p>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <ArrowLeft className="w-3 h-3 text-emerald-400" />
                                                <span className="text-emerald-400 text-xs font-bold">{item.quantityAllocated}x</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </DashboardSection>
                    </div>

                    {/* Maintenance Alerts */}
                    {maintenance.filter(m => m.status !== 'completed').length > 0 && (
                        <DashboardSection title="Alertas de Manutenção" icon={Wrench} count={maintenance.filter(m => m.status !== 'completed').length} color="red">
                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                {maintenance.filter(m => m.status !== 'completed').slice(0, 8).map(m => {
                                    const isOverdue = m.scheduledDate && m.scheduledDate < today;
                                    return (
                                        <div key={m.id} className={`flex items-center justify-between rounded-lg px-3 py-2 border ${isOverdue ? 'bg-red-900/15 border-red-500/30' : 'bg-yellow-900/10 border-yellow-500/20'}`}>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-white text-xs font-medium truncate">{m.equipment?.name || 'Equipamento'}</p>
                                                <p className="text-[10px] text-slate-500">{m.description}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${m.priority === 'critical' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                                    m.priority === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                                                        m.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                                            'bg-slate-700/50 text-slate-400 border-slate-600'
                                                    }`}>
                                                    {m.priority === 'critical' ? 'CRÍTICO' : m.priority === 'high' ? 'ALTO' : m.priority === 'medium' ? 'MÉDIO' : 'BAIXO'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </DashboardSection>
                    )}
                </div>

                {/* RIGHT: Upcoming Events */}
                <div className="space-y-4">
                    <DashboardSection title="Próximos Eventos" icon={ChevronRight} count={upcomingEvents.length} color="purple">
                        {upcomingEvents.length === 0 ? (
                            <EmptyState message="Nenhum evento próximo" icon={Calendar} />
                        ) : (
                            <div className="space-y-2">
                                {upcomingEvents.map(event => (
                                    <div key={event.id} className={`rounded-xl border p-3 transition-all ${newEventIds.has(event.id)
                                        ? 'bg-emerald-900/20 border-emerald-500/50 ring-1 ring-emerald-500/30 animate-pulse'
                                        : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'}`}>
                                        {newEventIds.has(event.id) && (
                                            <div className="text-[9px] font-bold text-emerald-400 uppercase mb-1 flex items-center gap-1">
                                                <Bell className="w-3 h-3" /> NOVO
                                            </div>
                                        )}
                                        <h4 className="text-white font-bold text-sm truncate">{event.name}</h4>
                                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                                            <Calendar className="w-3 h-3" />
                                            {formatDateFull(event.startDate)}
                                        </div>
                                        {event.venue && (
                                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                                                <MapPin className="w-3 h-3" />
                                                {event.venue}
                                            </div>
                                        )}
                                        {event.equipmentAllocations && event.equipmentAllocations.length > 0 && (
                                            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-blue-400">
                                                <Package className="w-3 h-3" />
                                                {event.equipmentAllocations.reduce((s, a) => s + a.quantityAllocated, 0)} equipamento(s)
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </DashboardSection>

                    {/* Equipment Overview */}
                    <DashboardSection title="Resumo Equipamentos" icon={Package} color="cyan">
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-400">Total no estoque</span>
                                <span className="text-white font-bold">{totalEquipments}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-400">Em eventos</span>
                                <span className="text-yellow-400 font-bold">{allocatedCount}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-400">Disponível</span>
                                <span className="text-emerald-400 font-bold">{totalEquipments - allocatedCount}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-400">Em manutenção</span>
                                <span className="text-orange-400 font-bold">{inMaintenance}</span>
                            </div>
                            {/* Usage bar */}
                            <div className="mt-2">
                                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                    <span>Utilização</span>
                                    <span>{totalEquipments > 0 ? Math.round((allocatedCount / totalEquipments) * 100) : 0}%</span>
                                </div>
                                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-1000"
                                        style={{ width: `${totalEquipments > 0 ? Math.min((allocatedCount / totalEquipments) * 100, 100) : 0}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </DashboardSection>
                </div>
            </div>
        </div>
    );
}

// --- Sub-components ---

function StatCard({ icon: Icon, label, value, color, sub }: { icon: any; label: string; value: number; color: string; sub?: string }) {
    const colorMap: Record<string, string> = {
        blue: 'from-blue-600/20 to-blue-700/10 border-blue-500/20 text-blue-400',
        yellow: 'from-yellow-600/20 to-yellow-700/10 border-yellow-500/20 text-yellow-400',
        emerald: 'from-emerald-600/20 to-emerald-700/10 border-emerald-500/20 text-emerald-400',
        purple: 'from-purple-600/20 to-purple-700/10 border-purple-500/20 text-purple-400',
        orange: 'from-orange-600/20 to-orange-700/10 border-orange-500/20 text-orange-400',
        red: 'from-red-600/20 to-red-700/10 border-red-500/20 text-red-400',
        cyan: 'from-cyan-600/20 to-cyan-700/10 border-cyan-500/20 text-cyan-400',
    };
    const iconColorMap: Record<string, string> = {
        blue: 'text-blue-400', yellow: 'text-yellow-400', emerald: 'text-emerald-400',
        purple: 'text-purple-400', orange: 'text-orange-400', red: 'text-red-400', cyan: 'text-cyan-400',
    };

    return (
        <div className={`bg-gradient-to-br ${colorMap[color]} border rounded-xl p-3 flex flex-col`}>
            <Icon className={`w-4 h-4 ${iconColorMap[color]} mb-2`} />
            <p className="text-2xl font-black text-white">{value}</p>
            <p className="text-[10px] text-slate-400 mt-auto">{label}</p>
            {sub && <p className="text-[9px] text-slate-500 mt-0.5">{sub}</p>}
        </div>
    );
}

function DashboardSection({ title, icon: Icon, count, color, children }: { title: string; icon: any; count?: number; color: string; children: React.ReactNode }) {
    const iconColorMap: Record<string, string> = {
        blue: 'bg-blue-600', yellow: 'bg-yellow-600', emerald: 'bg-emerald-600',
        purple: 'bg-purple-600', orange: 'bg-orange-600', red: 'bg-red-600', cyan: 'bg-cyan-600',
    };

    return (
        <div className="bg-slate-900/50 border border-slate-700/60 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/50">
                <div className={`w-6 h-6 ${iconColorMap[color]} rounded-lg flex items-center justify-center`}>
                    <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                <h3 className="text-sm font-bold text-white flex-1">{title}</h3>
                {count !== undefined && (
                    <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{count}</span>
                )}
            </div>
            <div className="p-3">{children}</div>
        </div>
    );
}

interface EventCardProps {
    event: Event;
    isNew: boolean;
    formatDate: (s: string) => string;
    statusColors: Record<string, string>;
    statusLabels: Record<string, string>;
}

const EventCard: React.FC<EventCardProps> = ({ event, isNew, formatDate, statusColors, statusLabels }) => {
    return (
        <div className={`rounded-xl border p-4 transition-all ${isNew
            ? 'bg-emerald-900/20 border-emerald-500/50 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10'
            : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'}`}>
            {isNew && (
                <div className="text-[10px] font-bold text-emerald-400 uppercase mb-2 flex items-center gap-1 animate-pulse">
                    <Bell className="w-3.5 h-3.5" /> NOVO EVENTO
                </div>
            )}
            <div className="flex items-start justify-between gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                    <h4 className="text-white font-bold text-xs sm:text-sm truncate leading-tight">{event.name}</h4>
                    <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-1 mt-1">
                        {event.venue && (
                            <span className="text-[10px] sm:text-xs text-slate-400 flex items-center gap-1 truncate max-w-[120px] sm:max-w-none">
                                <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" /><span className="truncate">{event.venue}</span>
                            </span>
                        )}
                        {event.clientName && (
                            <span className="text-[10px] sm:text-xs text-slate-500 flex items-center gap-1 truncate max-w-[120px] sm:max-w-none">
                                <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 shrink-0" /><span className="truncate">{event.clientName}</span>
                            </span>
                        )}
                    </div>
                </div>
                <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg border whitespace-nowrap shrink-0 ${statusColors[event.status]}`}>
                    {statusLabels[event.status]}
                </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-[10px] sm:text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                    <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {formatDate(event.startDate)} → {formatDate(event.endDate)}
                </span>
                {event.equipmentAllocations && event.equipmentAllocations.length > 0 && (
                    <span className="flex items-center gap-1 text-blue-400">
                        <Package className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {event.equipmentAllocations.reduce((s, a) => s + a.quantityAllocated, 0)} items
                    </span>
                )}
                {event.setupTime && (
                    <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> Mont: {event.setupTime}
                    </span>
                )}
            </div>
        </div>
    );
}

function EmptyState({ message, icon: Icon, small }: { message: string; icon: any; small?: boolean }) {
    return (
        <div className={`text-center ${small ? 'py-4' : 'py-6'} text-slate-500`}>
            <Icon className={`${small ? 'w-6 h-6' : 'w-8 h-8'} mx-auto mb-2 opacity-40`} />
            <p className={`${small ? 'text-[10px]' : 'text-xs'}`}>{message}</p>
        </div>
    );
}
