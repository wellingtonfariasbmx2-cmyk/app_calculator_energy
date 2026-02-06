import React, { useState, useEffect } from 'react';
import { Calendar, Plus, MapPin, Users, Clock, Edit2, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Event } from '../types';
import { EventService } from '../services/EventService';
import { useToast } from './Toast';
import { EventModal } from './EventModal';
import { EventDetailView } from './EventDetailView';

interface EventsViewProps {
    onNavigateToDistribution?: (eventId: string) => void;
}

export const EventsView: React.FC<EventsViewProps> = ({ onNavigateToDistribution }) => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'planned' | 'in_progress' | 'completed' | 'cancelled'>('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

    const { success, error: showError } = useToast();

    useEffect(() => {
        loadEvents();
    }, []);

    const loadEvents = async () => {
        try {
            setLoading(true);
            const data = await EventService.getEvents();
            setEvents(data);
        } catch (err) {
            console.error('Error loading events:', err);
            showError('Erro ao carregar eventos');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este evento?')) return;

        try {
            await EventService.deleteEvent(id);
            setEvents(prev => prev.filter(e => e.id !== id));
            success('Evento excluído com sucesso!');
        } catch (err) {
            showError('Erro ao excluir evento');
        }
    };

    const handleComplete = async (id: string) => {
        if (!confirm('Finalizar evento e devolver equipamentos ao estoque?')) return;

        try {
            await EventService.completeEvent(id);
            await loadEvents();
            success('Evento finalizado! Equipamentos devolvidos ao estoque.');
        } catch (err) {
            showError('Erro ao finalizar evento');
        }
    };

    const handleCancel = async (id: string) => {
        if (!confirm('Cancelar evento e devolver equipamentos ao estoque?')) return;

        try {
            await EventService.cancelEvent(id);
            await loadEvents();
            success('Evento cancelado! Equipamentos devolvidos ao estoque.');
        } catch (err) {
            showError('Erro ao cancelar evento');
        }
    };

    const filteredEvents = filter === 'all'
        ? events
        : events.filter(event => event.status === filter);

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
                    // Navegar para distribuição e abrir o projeto específico
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
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div className="animate-fade-in pb-20">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-6">
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

                {/* Filters */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {[
                        { key: 'all', label: 'Todos' },
                        { key: 'planned', label: 'Planejados' },
                        { key: 'in_progress', label: 'Em Andamento' },
                        { key: 'completed', label: 'Concluídos' },
                        { key: 'cancelled', label: 'Cancelados' },
                    ].map(({ key, label }) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key as any)}
                            className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${filter === key
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                                : 'bg-surface text-slate-400 hover:bg-slate-800 border border-slate-700'
                                }`}
                        >
                            {label}
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
                ) : filteredEvents.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-surface/30 rounded-xl border border-dashed border-slate-800">
                        <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">Nenhum evento encontrado</p>
                        <p className="text-xs mt-1">Crie seu primeiro evento para começar</p>
                    </div>
                ) : (
                    filteredEvents.map((event, index) => (
                        <div
                            key={event.id}
                            onClick={() => setSelectedEventId(event.id)}
                            className="bg-surface border border-slate-700/50 rounded-xl p-4 hover:border-purple-500/30 transition-all group hover:shadow-lg hover:shadow-black/20 animate-slide-in-up cursor-pointer"
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            {/* Header */}
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">
                                            {event.name}
                                        </h3>
                                        {getStatusBadge(event.status)}
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
                                {event.equipmentAllocations && event.equipmentAllocations.length > 0 && (
                                    <div className="col-span-2">
                                        <span className="block text-[10px] text-slate-500 uppercase font-bold mb-0.5">Equipamentos</span>
                                        <span className="text-sm text-white">
                                            {event.equipmentAllocations.length} item(s) alocado(s)
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
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
