import React, { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, MapPin, Users, Clock, Package, FileText, Plus, Edit2, Trash2, ExternalLink, Link, X, Download, Search, Minus, Activity, Share2 } from 'lucide-react';
import { Event, Equipment, DistributionProject } from '../types';
import { EventService } from '../services/EventService';
import { DataService } from '../services/supabaseClient';
import { ExportService } from '../services/ExportService';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmModal';
import { EventModal } from './EventModal';
import { useConfig } from './ConfigContext';

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
    const [isEquipModalOpen, setIsEquipModalOpen] = useState(false);
    const [availableProjects, setAvailableProjects] = useState<DistributionProject[]>([]);
    const [allEquipments, setAllEquipments] = useState<Equipment[]>([]);
    const [equipSearchQuery, setEquipSearchQuery] = useState('');
    const [selectedEquipments, setSelectedEquipments] = useState<Record<string, number>>({});
    const [savingEquipments, setSavingEquipments] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // LED Panel Calc State
    const [isLEDCalcOpen, setIsLEDCalcOpen] = useState(false);
    const [activeLEDEquip, setActiveLEDEquip] = useState<Equipment | null>(null);
    const [targetArea, setTargetArea] = useState<number | string>('');
    const [targetWidth, setTargetWidth] = useState<number | string>('');
    const [targetHeight, setTargetHeight] = useState<number | string>('');
    const [calcMode, setCalcMode] = useState<'area' | 'dimensions'>('dimensions');
    const [availabilityMap, setAvailabilityMap] = useState<Record<string, number>>({});

    const { success, error: showError } = useToast();
    const { confirm, ConfirmModalComponent } = useConfirm();
    const { company } = useConfig();

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
        const confirmed = await confirm({
            title: 'Desvincular Projeto',
            message: 'Tem certeza que deseja desvincular este projeto do evento?',
            variant: 'warning',
            confirmText: 'Desvincular',
            cancelText: 'Cancelar'
        });

        if (!confirmed) return;

        try {
            await DataService.updateCalculation(projectId, { event_id: null });
            success('Projeto desvinculado do evento');
            loadEventDetails();
        } catch (err) {
            console.error('Error unlinking project:', err);
            showError('Erro ao desvincular projeto');
        }
    };

    const handleExportPDF = async () => {
        if (!event) return;
        try {
            await ExportService.exportEventPDF(event, company || undefined);
            success('PDF gerado com sucesso!');
        } catch (err) {
            console.error('Error generating PDF:', err);
            showError('Erro ao gerar PDF');
        }
    };

    const loadAllEquipments = async () => {
        try {
            const equipments = await DataService.getEquipments();
            setAllEquipments(equipments as Equipment[]);
        } catch (err) {
            showError('Erro ao carregar equipamentos');
        }
    };

    const handleOpenEquipModal = () => {
        loadAllEquipments();
        setSelectedEquipments({});
        setEquipSearchQuery('');
        setIsEquipModalOpen(true);
    };

    const handleEquipQtyChange = (equipId: string, delta: number) => {
        setSelectedEquipments(prev => {
            const current = prev[equipId] || 0;
            const next = current + delta;
            if (next <= 0) {
                const { [equipId]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [equipId]: next };
        });
    };

    useEffect(() => {
        if (isEquipModalOpen && allEquipments.length > 0) {
            checkAvailability();
        }
    }, [isEquipModalOpen, allEquipments]);

    const checkAvailability = async () => {
        const map: Record<string, number> = {};

        // Inicializa com o estoque total primeiro (fallback)
        allEquipments.forEach(eq => {
            map[eq.id] = eq.quantityOwned || (eq as any).quantity || 0;
        });

        // Só tenta o banco se tivermos um evento e datas (que EventDetailView sempre tem se aberto)
        if (event) {
            for (const eq of allEquipments) {
                try {
                    const available = await EventService.checkAvailability(eq.id, event.id);
                    if (available !== -1) {
                        map[eq.id] = available;
                    }
                } catch (err) {
                    console.error('Erro na verificação de disponibilidade:', err);
                }
            }
        }
        setAvailabilityMap(map);
    };

    const handleSaveEquipments = async () => {
        if (!event || Object.keys(selectedEquipments).length === 0) return;

        // Validar disponibilidade ANTES de salvar
        for (const [equipId, qty] of Object.entries(selectedEquipments)) {
            const available = availabilityMap[equipId] || 0;
            const eq = allEquipments.find(e => e.id === equipId);
            if (available < (qty as number)) {
                showError(`${eq?.name || 'Equipamento'}: apenas ${available} disponível(is)`);
                return;
            }
        }

        setSavingEquipments(true);
        try {
            for (const [equipId, qty] of Object.entries(selectedEquipments)) {
                await EventService.allocateEquipment(event.id, equipId, qty as number);
            }
            success('Equipamentos alocados com sucesso!');
            setIsEquipModalOpen(false);
            loadEventDetails();
        } catch (err: any) {
            showError(err.message || 'Erro ao alocar equipamentos');
        } finally {
            setSavingEquipments(false);
        }
    };

    const handleOpenLEDCalc = (eq: Equipment) => {
        setActiveLEDEquip(eq);
        setTargetArea('');
        setTargetWidth('');
        setTargetHeight('');
        setCalcMode('dimensions');
        setIsLEDCalcOpen(true);
    };

    const handleApplyLEDCalc = () => {
        if (!activeLEDEquip) return;

        let area = 0;
        if (calcMode === 'area') {
            area = Number(targetArea);
        } else {
            area = Number(targetWidth) * Number(targetHeight);
        }

        if (area <= 0) return;

        const w = activeLEDEquip.panelWidth || 0.5;
        const h = activeLEDEquip.panelHeight || 1.0;

        const plates = Math.ceil(area / (w * h));

        setSelectedEquipments(prev => ({
            ...prev,
            [activeLEDEquip.id]: plates
        }));

        setIsLEDCalcOpen(false);
        setActiveLEDEquip(null);
        success(`${plates} placas aplicadas para ${area}m²`);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '—';
        // Garantir que pegamos apenas a parte da data YYYY-MM-DD
        const datePart = dateStr.split('T')[0].split(' ')[0];
        const date = new Date(datePart + 'T12:00:00');
        return date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };

    const handleShareWhatsApp = () => {
        if (!event) return;

        // Formatar lista de equipamentos
        let equipList = '';
        if (event.equipmentAllocations && event.equipmentAllocations.length > 0) {
            equipList = '\n\n*--- LISTA DE EQUIPAMENTOS ---*\n';
            event.equipmentAllocations.forEach(alloc => {
                const eq = alloc.equipment;
                const eqName = eq?.name || 'Equipamento';

                if (eq && eq.category === 'Painel de LED') {
                    const w = eq.panelWidth || 0.5;
                    const h = eq.panelHeight || 1.0;
                    const qty = alloc.quantityAllocated;

                    let bestW = 1;
                    let bestH = qty;
                    let bestRatioDiff = Infinity;
                    const targetRatio = 16 / 9;

                    for (let tryW = 1; tryW <= qty; tryW++) {
                        if (qty % tryW === 0) {
                            const tryH = qty / tryW;
                            const currentRatio = (tryW * w) / (tryH * h);
                            const ratioDiff = Math.abs(currentRatio - targetRatio);
                            if (ratioDiff < bestRatioDiff) {
                                bestRatioDiff = ratioDiff;
                                bestW = tryW;
                                bestH = tryH;
                            }
                        }
                    }

                    const panelsPerCase = eq.panelsPerCase || 6;
                    const cases = Math.ceil(qty / panelsPerCase);

                    equipList += `• ${qty}x ${eqName}\n`;
                    equipList += `  ↳ Tamanho: ${(bestW * w).toFixed(1)}m x ${(bestH * h).toFixed(1)}m\n`;
                    equipList += `  ↳ Cases: ${cases} case(s)\n`;
                } else {
                    equipList += `• ${alloc.quantityAllocated}x ${eqName}\n`;
                }
            });
        } else {
            equipList = '\n\n*--- LISTA DE EQUIPAMENTOS ---*\n• Nenhum equipamento alocado ainda.\n';
        }

        const message = `*EVENTO: ${event.name}*\n\n` +
            `*DATA:* ${formatDate(event.startDate)}\n` +
            `*LOCAL:* ${event.venue}\n` +
            (event.address ? `*ENDEREÇO:* ${event.address}\n` : '') +
            (event.setupTime ? `*HORÁRIO MONTAGEM:* ${event.setupTime}\n` : '') +
            (event.eventTime ? `*HORÁRIO EVENTO:* ${event.eventTime}\n` : '') +
            (event.technicalResponsible ? `*RESP. TÉCNICO:* ${event.technicalResponsible}\n` : '') +
            equipList +
            `\nEquipe, fiquem atentos aos detalhes e horários!`;

        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
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
            <ConfirmModalComponent />
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
                    <div className="flex gap-2">
                        <button
                            onClick={handleShareWhatsApp}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 sm:px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                            title="Compartilhar no WhatsApp"
                        >
                            <Share2 className="w-4 h-4" />
                            <span className="hidden sm:inline">WhatsApp</span>
                        </button>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-slate-800 hover:bg-slate-700 text-white px-3 sm:px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all border border-slate-700"
                        >
                            <Edit2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Editar</span>
                        </button>
                        <button
                            onClick={handleExportPDF}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-3 sm:px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-purple-500/20"
                        >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Gerar PDF</span>
                        </button>
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
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-white font-bold flex items-center gap-2">
                        <Package className="w-5 h-5 text-purple-400" />
                        Equipamentos Alocados ({event.equipmentAllocations?.length || 0})
                    </h2>
                    {(event.status === 'planned' || event.status === 'in_progress') && (
                        <button
                            onClick={handleOpenEquipModal}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Adicionar
                        </button>
                    )}
                </div>

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
                                            {(project as any).ports.length} circuito(s)
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
                                                    {(project as any).ports.length} circuito(s)
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

            {/* Equipment Allocation Modal */}
            {isEquipModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-surface border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-700 bg-slate-900/50">
                            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                                <Package className="w-5 h-5 text-emerald-400" />
                                Adicionar Equipamentos
                            </h2>
                            <button
                                onClick={() => setIsEquipModalOpen(false)}
                                className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded-lg"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-4 sm:p-6">
                            {/* Search */}
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Buscar equipamento..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:border-emerald-500 outline-none transition-all placeholder-slate-500"
                                    value={equipSearchQuery}
                                    onChange={e => setEquipSearchQuery(e.target.value)}
                                />
                            </div>

                            {/* Selected count */}
                            {Object.keys(selectedEquipments).length > 0 && (
                                <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-3 mb-4 flex items-center justify-between">
                                    <span className="text-emerald-400 text-sm font-bold">
                                        {Object.keys(selectedEquipments).length} equipamento(s) selecionado(s)
                                    </span>
                                    <span className="text-emerald-300 text-xs">
                                        Total: {Object.values(selectedEquipments).reduce((s: number, v: number) => s + v, 0)} unidades
                                    </span>
                                </div>
                            )}

                            {/* Equipment List */}
                            <div className="max-h-80 overflow-y-auto space-y-2">
                                {allEquipments
                                    .filter(eq =>
                                        eq.name.toLowerCase().includes(equipSearchQuery.toLowerCase()) ||
                                        (eq.brand && eq.brand.toLowerCase().includes(equipSearchQuery.toLowerCase())) ||
                                        (eq.model && eq.model.toLowerCase().includes(equipSearchQuery.toLowerCase()))
                                    )
                                    .map(eq => {
                                        const qty = selectedEquipments[eq.id] || 0;
                                        return (
                                            <div
                                                key={eq.id}
                                                className={`bg-slate-900/50 border rounded-lg p-3 flex justify-between items-center transition-all ${qty > 0 ? 'border-emerald-500/50 bg-emerald-900/10' : 'border-slate-700 hover:border-slate-600'
                                                    }`}
                                            >
                                                <div className="flex-1">
                                                    <p className="text-white font-medium text-sm">{eq.name}</p>
                                                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                                        <span className="text-xs text-slate-500">{eq.brand} {eq.model}</span>
                                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${(availabilityMap[eq.id] || 0) > 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                            {(availabilityMap[eq.id] || 0)} disp.
                                                        </span>
                                                        <span className="text-[10px] text-slate-500">Saldo: {eq.quantityOwned || (eq as any).quantity}</span>
                                                    </div>
                                                    {eq.category === 'Painel de LED' && (
                                                        <button
                                                            onClick={() => handleOpenLEDCalc(eq)}
                                                            className="mt-2 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 transition-colors"
                                                        >
                                                            <Activity className="w-3 h-3" />
                                                            Calculadora de Área
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {qty > 0 && (
                                                        <button
                                                            onClick={() => handleEquipQtyChange(eq.id, -1)}
                                                            className="w-8 h-8 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg flex items-center justify-center transition-colors"
                                                        >
                                                            <Minus className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {qty > 0 && (
                                                        <span className="text-white font-bold text-lg w-8 text-center">{qty}</span>
                                                    )}
                                                    <button
                                                        onClick={() => handleEquipQtyChange(eq.id, 1)}
                                                        disabled={(selectedEquipments[eq.id] || 0) >= (availabilityMap[eq.id] || 0)}
                                                        className="w-8 h-8 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                {allEquipments.filter(eq =>
                                    eq.name.toLowerCase().includes(equipSearchQuery.toLowerCase()) ||
                                    (eq.brand && eq.brand.toLowerCase().includes(equipSearchQuery.toLowerCase()))
                                ).length === 0 && (
                                        <div className="text-center py-8 text-slate-500">
                                            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                            <p className="font-medium">Nenhum equipamento encontrado</p>
                                        </div>
                                    )}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end gap-3 p-4 sm:p-6 border-t border-slate-700 bg-slate-900/30">
                            <button
                                onClick={() => setIsEquipModalOpen(false)}
                                className="px-6 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors font-medium text-sm"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveEquipments}
                                disabled={Object.keys(selectedEquipments).length === 0 || savingEquipments}
                                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {savingEquipments ? (
                                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                ) : (
                                    <Plus className="w-4 h-4" />
                                )}
                                Alocar Equipamentos
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Event Modal */}
            <EventModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={loadEventDetails}
                event={event}
            />

            {/* LED Area Calculator Modal */}
            {isLEDCalcOpen && activeLEDEquip && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="bg-surface border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                            <h3 className="text-white font-bold flex items-center gap-2">
                                <Activity className="w-5 h-5 text-emerald-400" />
                                Cálcular Metragem de LED
                            </h3>
                            <button onClick={() => setIsLEDCalcOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-bold text-white mb-1">{activeLEDEquip.name}</p>
                                    <p className="text-xs text-slate-500">
                                        Módulo: {activeLEDEquip.panelWidth || 0.5}m x {activeLEDEquip.panelHeight || 1.0}m
                                        ({(activeLEDEquip.panelWidth || 0.5) * (activeLEDEquip.panelHeight || 1.0)}m²)
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">Logística</p>
                                    <p className="text-xs text-white font-bold">{activeLEDEquip.panelsPerCase || 6} placas / case</p>
                                </div>
                            </div>

                            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                                <button
                                    onClick={() => setCalcMode('dimensions')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${calcMode === 'dimensions' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    Dimensões (LxA)
                                </button>
                                <button
                                    onClick={() => setCalcMode('area')}
                                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${calcMode === 'area' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    Área Total (m²)
                                </button>
                            </div>

                            {calcMode === 'dimensions' ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Largura (m)</label>
                                        <input
                                            type="number"
                                            placeholder="Ex: 5"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-xl font-bold focus:border-emerald-500 outline-none"
                                            value={targetWidth}
                                            onChange={e => setTargetWidth(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Altura (m)</label>
                                        <input
                                            type="number"
                                            placeholder="Ex: 4"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-xl font-bold focus:border-emerald-500 outline-none"
                                            value={targetHeight}
                                            onChange={e => setTargetHeight(e.target.value)}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Quantos m² você precisa?</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            placeholder="Ex: 32"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-xl font-bold focus:border-emerald-500 outline-none pr-12"
                                            value={targetArea}
                                            onChange={e => setTargetArea(e.target.value)}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">m²</span>
                                    </div>
                                </div>
                            )}

                            {((calcMode === 'dimensions' && targetWidth && targetHeight) || (calcMode === 'area' && targetArea)) && (
                                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                        <span className="block text-[10px] text-emerald-500 uppercase font-bold mb-1">Total de Placas</span>
                                        <span className="text-2xl font-black text-white">
                                            {(() => {
                                                const area = calcMode === 'area' ? Number(targetArea) : Number(targetWidth) * Number(targetHeight);
                                                return Math.ceil(area / ((activeLEDEquip.panelWidth || 0.5) * (activeLEDEquip.panelHeight || 1.0)));
                                            })()}
                                        </span>
                                    </div>
                                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                        <span className="block text-[10px] text-blue-500 uppercase font-bold mb-1">Cases (Hards)</span>
                                        <span className="text-2xl font-black text-white">
                                            {(() => {
                                                const area = calcMode === 'area' ? Number(targetArea) : Number(targetWidth) * Number(targetHeight);
                                                const plates = Math.ceil(area / ((activeLEDEquip.panelWidth || 0.5) * (activeLEDEquip.panelHeight || 1.0)));
                                                return Math.ceil(plates / (activeLEDEquip.panelsPerCase || 6));
                                            })()}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="pt-2">
                                <button
                                    onClick={handleApplyLEDCalc}
                                    disabled={
                                        (calcMode === 'area' && (!targetArea || Number(targetArea) <= 0)) ||
                                        (calcMode === 'dimensions' && (!targetWidth || !targetHeight || Number(targetWidth) <= 0 || Number(targetHeight) <= 0))
                                    }
                                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:bg-slate-800 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-5 h-5" />
                                    Aplicar Quantidade
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
