import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, MapPin, Users, Clock, Package, FileText, Plus, Edit2, Trash2, ExternalLink, Link, X } from 'lucide-react';
import { Event, Equipment, DistributionProject } from '../types';
import { EventService } from '../services/EventService';
import { DataService } from '../services/supabaseClient';
import { useToast } from './Toast';

interface EventDetailViewProps {
    eventId: string;
    onBack: () => void;
    onCreateDistribution: (eventId: string) => void;
    onViewProject?: (projectId: string) => void;
}

export const EventDetailView: React.FC<EventDetailViewProps> = ({ eventId, onBack, onCreateDistribution, onViewProject }) => {
    const [event, setEvent] = useState<Event | null>(null);
    const [distributionProjects, setDistributionProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [availableProjects, setAvailableProjects] = useState<DistributionProject[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    const { success, error: showError } = useToast();

    useEffect(() => {
        loadEventDetails();
    }, [eventId]);

    const loadEventDetails = async () => {
        try {
            setLoading(true);
            const eventData = await EventService.getEventById(eventId);
            if (eventData) {
                setEvent(eventData);
                const projects = await EventService.getDistributionProjects(eventId);
                setDistributionProjects(projects);
            }
        } catch (err) {
            console.error('Error loading event details:', err);
            showError('Erro ao carregar detalhes do evento');
        } finally {
            setLoading(false);
        }
    };

    const loadAvailableProjects = async () => {
        try {
            const allProjects = await DataService.getDistributionProjects();
            // Mostrar TODOS os projetos de distribuição do banco de dados
            setAvailableProjects(allProjects as DistributionProject[]);
        } catch (err) {
            console.error('Error loading available projects:', err);
            showError('Erro ao carregar projetos disponíveis');
        }
    };

    const handleLinkProject = async (projectId: string) => {
        try {
            await DataService.updateCalculation(projectId, { event_id: eventId });
            success('Projeto vinculado ao evento com sucesso!');
            setIsLinkModalOpen(false);
            loadEventDetails();
        } catch (err) {
            console.error('Error linking project:', err);
            showError('Erro ao vincular projeto');
        }
    };

    const handleUnlinkProject = async (projectId: string) => {
        if (!confirm('Desvincular este projeto do evento?')) return;

        try {
            await DataService.updateCalculation(projectId, { event_id: null });
            success('Projeto desvinculado do evento');
            loadEventDetails();
        } catch (err) {
            console.error('Error unlinking project:', err);
            showError('Erro ao desvincular projeto');
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (status: Event['status']) => {
        const badges = {
            planned: { label: 'Planejado', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
            in_progress: { label: 'Em Andamento', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
            completed: { label: 'Concluído', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
            cancelled: { label: 'Cancelado', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
        };
        const badge = badges[status];
        return (
            <span className={`px-3 py-1 rounded-full text-sm font-bold border ${badge.color}`}>
                {badge.label}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="text-center py-12 text-slate-500">
                <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                <p>Carregando detalhes...</p>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="text-center py-12 text-slate-500">
                <p>Evento não encontrado</p>
                <button onClick={onBack} className="mt-4 text-purple-400 hover:text-purple-300">
                    Voltar
                </button>
            </div>
        );
    }

    return (
        <div className="animate-fade-in pb-20">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar
                </button>

                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-2">{event.name}</h1>
                        {getStatusBadge(event.status)}
                    </div>
                </div>
            </div>

            {/* Event Info Card */}
            <div className="bg-surface border border-slate-700 rounded-xl p-6 mb-6">
                <h2 className="text-white font-bold mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-400" />
                    Informações do Evento
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {event.clientName && (
                        <div>
                            <span className="block text-xs text-slate-500 uppercase font-bold mb-1">Cliente</span>
                            <span className="text-white flex items-center gap-2">
                                <Users className="w-4 h-4 text-purple-400" />
                                {event.clientName}
                            </span>
                        </div>
                    )}

                    <div>
                        <span className="block text-xs text-slate-500 uppercase font-bold mb-1">Local</span>
                        <span className="text-white flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-purple-400" />
                            {event.venue}
                        </span>
                    </div>

                    {event.address && (
                        <div className="md:col-span-2">
                            <span className="block text-xs text-slate-500 uppercase font-bold mb-1">Endereço</span>
                            <span className="text-white">{event.address}</span>
                        </div>
                    )}

                    <div>
                        <span className="block text-xs text-slate-500 uppercase font-bold mb-1">Data Início</span>
                        <span className="text-white flex items-center gap-2">
                            <Clock className="w-4 h-4 text-purple-400" />
                            {formatDate(event.startDate)}
                        </span>
                    </div>

                    <div>
                        <span className="block text-xs text-slate-500 uppercase font-bold mb-1">Data Término</span>
                        <span className="text-white flex items-center gap-2">
                            <Clock className="w-4 h-4 text-purple-400" />
                            {formatDate(event.endDate)}
                        </span>
                    </div>

                    {event.setupTime && (
                        <div>
                            <span className="block text-xs text-slate-500 uppercase font-bold mb-1">Horário Montagem</span>
                            <span className="text-white">{event.setupTime}</span>
                        </div>
                    )}

                    {event.eventTime && (
                        <div>
                            <span className="block text-xs text-slate-500 uppercase font-bold mb-1">Horário Evento</span>
                            <span className="text-white">{event.eventTime}</span>
                        </div>
                    )}

                    {event.technicalResponsible && (
                        <div>
                            <span className="block text-xs text-slate-500 uppercase font-bold mb-1">Responsável Técnico</span>
                            <span className="text-white">{event.technicalResponsible}</span>
                        </div>
                    )}

                    {event.notes && (
                        <div className="md:col-span-2">
                            <span className="block text-xs text-slate-500 uppercase font-bold mb-1">Observações</span>
                            <span className="text-white">{event.notes}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Equipment Allocations */}
            <div className="bg-surface border border-slate-700 rounded-xl p-6 mb-6">
                <h2 className="text-white font-bold mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-purple-400" />
                    Equipamentos Alocados ({event.equipmentAllocations?.length || 0})
                </h2>

                {event.equipmentAllocations && event.equipmentAllocations.length > 0 ? (
                    <div className="space-y-2">
                        {event.equipmentAllocations.map(alloc => (
                            <div key={alloc.id} className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 flex justify-between items-center">
                                <div>
                                    <p className="text-white font-medium">{alloc.equipment?.name}</p>
                                    <p className="text-xs text-slate-400">{alloc.equipment?.brand} - {alloc.equipment?.model}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-white font-bold">{alloc.quantityAllocated}x</p>
                                    <p className={`text-xs ${alloc.status === 'allocated' ? 'text-yellow-400' : 'text-green-400'}`}>
                                        {alloc.status === 'allocated' ? 'Alocado' : 'Devolvido'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-slate-500 text-sm">Nenhum equipamento alocado</p>
                )}
            </div>

            {/* Distribution Projects */}
            <div className="bg-surface border border-slate-700 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-white font-bold flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-400" />
                        Projetos de Distribuição ({distributionProjects.length})
                    </h2>
                    <button
                        onClick={() => {
                            loadAvailableProjects();
                            setIsLinkModalOpen(true);
                        }}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all"
                    >
                        <Link className="w-4 h-4" />
                        Vincular Projeto
                    </button>
                </div>

                {distributionProjects.length > 0 ? (
                    <div className="space-y-2">
                        {distributionProjects.map(project => (
                            <div key={project.id} className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 flex justify-between items-center hover:border-purple-500/30 transition-all">
                                <div className="flex-1">
                                    <p className="text-white font-medium">{project.name}</p>
                                    {project.description && (
                                        <p className="text-xs text-slate-400">{project.description}</p>
                                    )}
                                    {(project as any).ports && (
                                        <p className="text-xs text-slate-500 mt-1">
                                            {(project as any).ports.length} portas • {(project as any).total_watts || 0}W • {((project as any).total_amperes || 0).toFixed(2)}A
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleUnlinkProject(project.id)}
                                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                        title="Desvincular"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onViewProject && onViewProject(project.id)}
                                        className="p-2 text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors"
                                        title="Visualizar Projeto"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-500 border border-dashed border-slate-700 rounded-lg">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="font-medium mb-2">Nenhum projeto de distribuição vinculado</p>
                        <p className="text-xs">Vincule um projeto existente para gerenciar a distribuição elétrica deste evento</p>
                    </div>
                )}
            </div>

            {/* Link Project Modal */}
            {isLinkModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-surface border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-700 bg-slate-900/50">
                            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                                <Link className="w-5 h-5 text-purple-400" />
                                Vincular Projeto de Distribuição
                            </h2>
                            <button
                                onClick={() => setIsLinkModalOpen(false)}
                                className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded-lg"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-4 sm:p-6">
                            {/* Search */}
                            <div className="mb-4">
                                <input
                                    type="text"
                                    placeholder="Buscar projeto..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:border-purple-500 outline-none"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>

                            {/* Projects List */}
                            <div className="max-h-96 overflow-y-auto space-y-2">
                                {availableProjects
                                    .filter(p =>
                                        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
                                    )
                                    .map(project => (
                                        <button
                                            key={project.id}
                                            onClick={() => handleLinkProject(project.id)}
                                            className="w-full text-left bg-slate-900/50 border border-slate-700 rounded-lg p-3 hover:border-purple-500 hover:bg-slate-800 transition-all"
                                        >
                                            <p className="text-white font-medium">{project.name}</p>
                                            {project.description && (
                                                <p className="text-xs text-slate-400 mt-1">{project.description}</p>
                                            )}
                                            {(project as any).ports && (
                                                <p className="text-xs text-slate-500 mt-1">
                                                    {(project as any).ports.length} portas • {(project as any).total_watts || 0}W • {((project as any).total_amperes || 0).toFixed(2)}A
                                                </p>
                                            )}
                                        </button>
                                    ))}
                                {availableProjects.filter(p =>
                                    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
                                ).length === 0 && (
                                        <div className="text-center py-8 text-slate-500">
                                            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                            <p className="font-medium">Nenhum projeto encontrado</p>
                                            <p className="text-xs mt-1">Crie um projeto de distribuição primeiro</p>
                                        </div>
                                    )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end p-4 sm:p-6 border-t border-slate-700 bg-slate-900/30">
                            <button
                                onClick={() => setIsLinkModalOpen(false)}
                                className="px-6 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors font-medium text-sm"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
