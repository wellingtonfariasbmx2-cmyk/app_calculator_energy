import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Plus, MapPin, Users, Clock, Edit2, Trash2, CheckCircle, XCircle, AlertCircle, Search, ArrowUpDown, Package, TrendingUp, Timer } from 'lucide-react';
import { Event } from '../types';
import { EventService } from '../services/EventService';
import { useToast } from './Toast';
import { EventModal } from './EventModal';
import { EventDetailView } from './EventDetailView';
import { useConfirm } from './ConfirmModal';
import { LoadingScreen } from './LoadingScreen';
import { ErrorScreen } from './ErrorScreen';

interface EventsViewProps {
    onNavigateToDistribution?: (eventId: string) => void;
}

export const EventsView: React.FC<EventsViewProps> = ({ onNavigateToDistribution }) => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setErrorState] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'planned' | 'in_progress' | 'completed' | 'cancelled'>('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'date' | 'name'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const { success, error: showError } = useToast();
    const { confirm, ConfirmModalComponent } = useConfirm();

    useEffect(() => {
        loadEvents();

        // Verificar se viemos de uma notificação
        const autoOpenId = localStorage.getItem('autoOpenEventId');
        if (autoOpenId) {
            setSelectedEventId(autoOpenId);
            localStorage.removeItem('autoOpenEventId');
        }
    }, []);

    const loadEvents = async () => {
        try {
            setLoading(true);
            setErrorState(null);
            const data = await EventService.getEvents();
            setEvents(data);
        } catch (err) {
            console.error('Error loading events:', err);
            setErrorState('Falha ao carregar eventos.');
            showError('Erro ao carregar eventos');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirm({
            title: 'Excluir Evento',
            message: 'Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.',
            variant: 'danger',
            confirmText: 'Excluir',
            cancelText: 'Cancelar'
        });

        if (!confirmed) return;

        try {
            await EventService.deleteEvent(id);
            setEvents(prev => prev.filter(e => e.id !== id));
            success('Evento excluído com sucesso!');
        } catch (err) {
            showError('Erro ao excluir evento');
        }
    };

    const handleComplete = async (id: string) => {
        const confirmed = await confirm({
            title: 'Finalizar Evento',
            message: 'Finalizar evento e devolver equipamentos ao estoque?',
            variant: 'info',
            confirmText: 'Finalizar',
            cancelText: 'Cancelar'
        });

        if (!confirmed) return;

        try {
            await EventService.completeEvent(id);
            await loadEvents();
            success('Evento finalizado! Equipamentos devolvidos ao estoque.');
        } catch (err) {
            showError('Erro ao finalizar evento');
        }
    };

    const handleCancel = async (id: string) => {
        const confirmed = await confirm({
            title: 'Cancelar Evento',
            message: 'Cancelar evento e devolver equipamentos ao estoque?',
            variant: 'warning',
            confirmText: 'Cancelar Evento',
            cancelText: 'Voltar'
        });

        if (!confirmed) return;

        try {
            await EventService.cancelEvent(id);
            await loadEvents();
            success('Evento cancelado! Equipamentos devolvidos ao estoque.');
        } catch (err) {
            showError('Erro ao cancelar evento');
        }
    };

    const handleEdit = (event: Event) => {
        setEditingEvent(event);
        setIsModalOpen(true);
    };

    // ==================== HELPERS ====================
    // Parsear data de forma segura sem shift de timezone
    // Strings 'YYYY-MM-DD' são parseadas como UTC pelo JS, causando -1 dia em timezones negativos.
    // Adicionar 'T12:00:00' faz o parse como meio-dia local, evitando o shift.
    const parseLocalDate = (dateStr: string) => {
        if (!dateStr) return new Date();
        // Garantir que pegamos apenas a parte da data YYYY-MM-DD
        const datePart = dateStr.split('T')[0].split(' ')[0];
        return new Date(datePart + 'T12:00:00');
    };

    // ==================== KPI CALCULATIONS ====================
    const kpis = useMemo(() => {
        const now = new Date();
        const planned = events.filter(e => e.status === 'planned');
        const inProgress = events.filter(e => e.status === 'in_progress');
        const completed = events.filter(e => e.status === 'completed');

        // Próximo evento (mais próximo do futuro)
        const upcomingEvents = events
            .filter(e => e.status === 'planned' && parseLocalDate(e.startDate) >= now)
            .sort((a, b) => parseLocalDate(a.startDate).getTime() - parseLocalDate(b.startDate).getTime());
        const nextEvent = upcomingEvents[0] || null;

        // Dias até o próximo evento
        let daysUntilNext: number | null = null;
        if (nextEvent) {
            const diff = parseLocalDate(nextEvent.startDate).getTime() - now.getTime();
            daysUntilNext = Math.ceil(diff / (1000 * 60 * 60 * 24));
        }

        // Total de equipamentos alocados em eventos ativos
        const activeEvents = events.filter(e => e.status === 'planned' || e.status === 'in_progress');
        const totalAllocatedItems = activeEvents.reduce((sum, ev) => {
            return sum + (ev.equipmentAllocations?.reduce((s, a) => s + a.quantityAllocated, 0) || 0);
        }, 0);

        return {
            total: events.length,
            planned: planned.length,
            inProgress: inProgress.length,
            completed: completed.length,
            nextEvent,
            daysUntilNext,
            totalAllocatedItems,
        };
    }, [events]);

    // ==================== SEARCH, FILTER, SORT ====================
    const processedEvents = useMemo(() => {
        let result = [...events];

        // Filtro por status
        if (filter !== 'all') {
            result = result.filter(event => event.status === filter);
        }

        // Busca por texto
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(event =>
                event.name.toLowerCase().includes(q) ||
                (event.clientName && event.clientName.toLowerCase().includes(q)) ||
                event.venue.toLowerCase().includes(q)
            );
        }

        // Ordenação
        result.sort((a, b) => {
            if (sortBy === 'date') {
                const dateA = parseLocalDate(a.startDate).getTime();
                const dateB = parseLocalDate(b.startDate).getTime();
                return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
            } else {
                const nameA = a.name.toLowerCase();
                const nameB = b.name.toLowerCase();
                return sortOrder === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
            }
        });

        return result;
    }, [events, filter, searchQuery, sortBy, sortOrder]);

    const getProximityBadge = (startDate: string, status: string) => {
        if (status === 'completed' || status === 'cancelled') return null;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const eventDate = parseLocalDate(startDate);
        eventDate.setHours(0, 0, 0, 0);
        const diffDays = Math.round((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return { label: '🔴 Hoje!', color: 'bg-red-500/20 text-red-400 border-red-500/40' };
        if (diffDays === 1) return { label: '🟡 Amanhã', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' };
        if (diffDays >= 2 && diffDays <= 7) return { label: `📅 Em ${diffDays} dias`, color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' };
        if (diffDays > 7 && diffDays <= 30) return { label: `📅 Em ${diffDays} dias`, color: 'bg-slate-500/20 text-slate-400 border-slate-500/40' };
        if (diffDays < 0 && diffDays >= -7) return { label: `⏰ Há ${Math.abs(diffDays)} dia(s)`, color: 'bg-orange-500/20 text-orange-400 border-orange-500/40' };
        if (diffDays < -7) return { label: `⏰ Há ${Math.abs(diffDays)} dias`, color: 'bg-slate-500/20 text-slate-400 border-slate-500/40' };
        return null;
    };

    const getEquipmentSummary = (event: Event) => {
        if (!event.equipmentAllocations || event.equipmentAllocations.length === 0) return null;
        let totalItems = 0;
        let totalUnits = 0;
        event.equipmentAllocations.forEach(alloc => {
            totalItems++;
            totalUnits += alloc.quantityAllocated;
        });
        return { totalItems, totalUnits };
    };

    // Se um evento está selecionado, mostrar detalhes
    if (selectedEventId) {
        return (
            <EventDetailView
                eventId={selectedEventId}
                onBack={() => setSelectedEventId(null)}
                onCreateDistribution={(eventId) => {
                    if (onNavigateToDistribution) {
                        onNavigateToDistribution(eventId);
                    }
                }}
                onViewProject={(projectId) => {
                    if (onNavigateToDistribution) {
                        onNavigateToDistribution(projectId);
                    }
                }}
            />
        );
    }

    const getStatusBadge = (status: Event['status']) => {
        const badges = {
            planned: { label: 'Planejado', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
            in_progress: { label: 'Em Andamento', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
            completed: { label: 'Concluído', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
            cancelled: { label: 'Cancelado', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
        };
        const badge = badges[status];
        return (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${badge.color}`}>
                {badge.label}
            </span>
        );
    };

    const formatDate = (dateStr: string) => {
        const date = parseLocalDate(dateStr);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const toggleSort = () => {
        if (sortBy === 'date') {
            setSortBy('name');
            setSortOrder('asc');
        } else {
            setSortBy('date');
            setSortOrder('desc');
        }
    };

    if (loading && !selectedEventId) return <LoadingScreen />;

    if (error && !selectedEventId) return <ErrorScreen message={error} onRetry={loadEvents} />;

    return (
        <div className="animate-fade-in pb-20">
            <ConfirmModalComponent />
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl shadow-lg shadow-purple-900/20">
                            <Calendar className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Eventos</h1>
                            <p className="text-slate-400 text-xs sm:text-sm font-medium">Gerencie sua agenda de eventos</p>
                        </div>
                    </div>
                </div>

                {/* ==================== KPI DASHBOARD ==================== */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    {/* Total de Eventos */}
                    <div className="bg-surface border border-slate-700/50 rounded-xl p-3 hover:border-purple-500/30 transition-all">
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className="p-1.5 bg-purple-500/20 rounded-lg">
                                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                            </div>
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Total</span>
                        </div>
                        <div className="text-2xl font-bold text-white">{kpis.total}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                            {kpis.planned} planejado{kpis.planned !== 1 ? 's' : ''} • {kpis.inProgress} ativo{kpis.inProgress !== 1 ? 's' : ''}
                        </div>
                    </div>

                    {/* Próximo Evento */}
                    <div className="bg-surface border border-slate-700/50 rounded-xl p-3 hover:border-blue-500/30 transition-all">
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className="p-1.5 bg-blue-500/20 rounded-lg">
                                <Timer className="w-3.5 h-3.5 text-blue-400" />
                            </div>
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Próximo</span>
                        </div>
                        {kpis.nextEvent ? (
                            <>
                                <div className="text-lg font-bold text-white leading-tight truncate">{kpis.daysUntilNext === 0 ? 'Hoje!' : `${kpis.daysUntilNext}d`}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5 truncate">{kpis.nextEvent.name}</div>
                            </>
                        ) : (
                            <>
                                <div className="text-lg font-bold text-slate-600">—</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">Nenhum agendado</div>
                            </>
                        )}
                    </div>

                    {/* Equipamentos Alocados */}
                    <div className="bg-surface border border-slate-700/50 rounded-xl p-3 hover:border-emerald-500/30 transition-all">
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                                <Package className="w-3.5 h-3.5 text-emerald-400" />
                            </div>
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Alocados</span>
                        </div>
                        <div className="text-2xl font-bold text-white">{kpis.totalAllocatedItems}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">itens em eventos ativos</div>
                    </div>

                    {/* Concluídos */}
                    <div className="bg-surface border border-slate-700/50 rounded-xl p-3 hover:border-green-500/30 transition-all">
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className="p-1.5 bg-green-500/20 rounded-lg">
                                <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                            </div>
                            <span className="text-[10px] text-slate-500 uppercase font-bold">Concluídos</span>
                        </div>
                        <div className="text-2xl font-bold text-white">{kpis.completed}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                            {kpis.total > 0 ? `${Math.round((kpis.completed / kpis.total) * 100)}% de sucesso` : '—'}
                        </div>
                    </div>
                </div>

                {/* ==================== SEARCH + SORT ==================== */}
                <div className="flex gap-2 mb-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar por nome, cliente ou local..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-surface border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 outline-none transition-all placeholder-slate-500"
                        />
                    </div>
                    <button
                        onClick={toggleSort}
                        className="bg-surface border border-slate-700 text-slate-400 hover:text-white hover:border-purple-500/50 px-3 py-2.5 rounded-lg transition-all flex items-center gap-1.5 text-xs font-bold whitespace-nowrap"
                        title={`Ordenar por ${sortBy === 'date' ? 'Nome' : 'Data'}`}
                    >
                        <ArrowUpDown className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{sortBy === 'date' ? 'Data' : 'A-Z'}</span>
                    </button>
                </div>

                {/* Filters */}
                <div className="flex gap-2 flex-wrap">
                    {[
                        { key: 'all', label: 'Todos', count: events.length },
                        { key: 'planned', label: 'Planejados', count: kpis.planned },
                        { key: 'in_progress', label: 'Andamento', count: kpis.inProgress },
                        { key: 'completed', label: 'Concluídos', count: kpis.completed },
                        { key: 'cancelled', label: 'Cancelados', count: events.filter(e => e.status === 'cancelled').length },
                    ].map(({ key, label, count }) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key as any)}
                            className={`px-3 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-1.5 ${filter === key
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                                : 'bg-surface text-slate-400 hover:bg-slate-800 border border-slate-700'
                                }`}
                        >
                            {label}
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filter === key ? 'bg-white/20' : 'bg-slate-700/50'}`}>
                                {count}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Events List */}
            <div className="space-y-3">
                {loading ? (
                    <div className="text-center py-12 text-slate-500">
                        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                        <p>Carregando eventos...</p>
                    </div>
                ) : processedEvents.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-surface/30 rounded-xl border border-dashed border-slate-800">
                        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">
                            {searchQuery ? 'Nenhum evento encontrado para esta busca' : 'Nenhum evento encontrado'}
                        </p>
                        <p className="text-xs mt-1">
                            {searchQuery ? 'Tente com outros termos' : 'Crie seu primeiro evento para começar'}
                        </p>
                    </div>
                ) : (
                    processedEvents.map((event, index) => {
                        const proximity = getProximityBadge(event.startDate, event.status);
                        const eqSummary = getEquipmentSummary(event);

                        return (
                            <div
                                key={event.id}
                                onClick={() => setSelectedEventId(event.id)}
                                className="bg-surface border border-slate-700/50 rounded-xl p-4 hover:border-purple-500/30 transition-all group hover:shadow-lg hover:shadow-black/20 animate-slide-in-up cursor-pointer"
                                style={{ animationDelay: `${index * 0.05}s` }}
                            >
                                {/* Header */}
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">
                                                {event.name}
                                            </h3>
                                            {getStatusBadge(event.status)}
                                            {proximity && (
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${proximity.color}`}>
                                                    {proximity.label}
                                                </span>
                                            )}
                                        </div>
                                        {event.clientName && (
                                            <p className="text-sm text-slate-400 flex items-center gap-1">
                                                <Users className="w-3.5 h-3.5" />
                                                {event.clientName}
                                            </p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {event.status === 'planned' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleComplete(event.id);
                                                }}
                                                className="p-2 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                                                title="Finalizar Evento"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                        {(event.status === 'planned' || event.status === 'in_progress') && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleCancel(event.id);
                                                }}
                                                className="p-2 text-yellow-400 hover:bg-yellow-500/10 rounded-lg transition-colors"
                                                title="Cancelar Evento"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEdit(event);
                                            }}
                                            className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                            title="Editar Evento"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(event.id);
                                            }}
                                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Excluir"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Info Grid */}
                                <div className="grid grid-cols-2 gap-3 border-t border-slate-800/50 pt-3">
                                    <div>
                                        <span className="block text-[10px] text-slate-500 uppercase font-bold mb-0.5">Local</span>
                                        <span className="text-sm text-white flex items-center gap-1">
                                            <MapPin className="w-3.5 h-3.5 text-purple-400" />
                                            {event.venue}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] text-slate-500 uppercase font-bold mb-0.5">Data</span>
                                        <span className="text-sm text-white flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5 text-purple-400" />
                                            {formatDate(event.startDate)}
                                        </span>
                                    </div>

                                    {/* Resumo de Equipamentos */}
                                    {eqSummary && (
                                        <div className="col-span-2 bg-slate-900/30 rounded-lg p-2.5 border border-slate-800/50">
                                            <div className="flex items-center gap-1.5">
                                                <Package className="w-3.5 h-3.5 text-purple-400" />
                                                <span className="text-xs text-slate-400">
                                                    {eqSummary.totalItems} equipamento(s) • {eqSummary.totalUnits} unidade(s)
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Fallback se não tem equipamentos */}
                                    {!eqSummary && event.equipmentAllocations && event.equipmentAllocations.length === 0 && (
                                        <div className="col-span-2">
                                            <span className="text-xs text-slate-600 italic">Sem equipamentos alocados</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Floating Action Button */}
            <button
                onClick={() => {
                    setEditingEvent(null);
                    setIsModalOpen(true);
                }}
                className="fixed bottom-24 right-6 bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-full shadow-2xl shadow-purple-500/30 active:scale-95 transition-all z-50"
                title="Novo Evento"
            >
                <Plus className="w-6 h-6" />
            </button>

            {/* Event Modal */}
            <EventModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingEvent(null);
                }}
                onSave={() => {
                    loadEvents();
                }}
                event={editingEvent}
            />
        </div>
    );
};
