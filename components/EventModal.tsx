import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, MapPin, Users, Clock, Plus, Minus, Trash2, AlertCircle, CheckCircle, Package, Search, Zap, Activity, ChevronRight, ChevronLeft, FileText, Check } from 'lucide-react';
import { Event, Equipment, EquipmentAllocation } from '../types';
import { EventService } from '../services/EventService';
import { DataService } from '../services/supabaseClient';
import { useToast } from './Toast';

interface EventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    event?: Event | null;
}

const STEPS = [
    { id: 1, title: 'Informações', icon: FileText, description: 'Dados básicos do evento' },
    { id: 2, title: 'Datas', icon: Calendar, description: 'Datas e horários' },
    { id: 3, title: 'Equipamentos', icon: Package, description: 'Seleção de equipamentos' },
];

export const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, onSave, event }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<Partial<Event>>({
        name: '',
        clientName: '',
        venue: '',
        address: '',
        startDate: '',
        endDate: '',
        setupTime: '',
        eventTime: '',
        status: 'planned',
        notes: '',
        technicalResponsible: '',
    });

    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [selectedEquipments, setSelectedEquipments] = useState<EquipmentAllocation[]>([]);
    const [availabilityMap, setAvailabilityMap] = useState<Record<string, number>>({});
    const [occupiedCasesMap, setOccupiedCasesMap] = useState<Record<string, number[]>>({});
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingQty, setEditingQty] = useState<Record<string, string>>({});
    const [triedNext, setTriedNext] = useState<Set<number>>(new Set());

    // LED Panel Calc State
    const [isLEDCalcOpen, setIsLEDCalcOpen] = useState(false);
    const [activeLEDEquip, setActiveLEDEquip] = useState<Equipment | null>(null);
    const [targetArea, setTargetArea] = useState<number | string>('');
    const [targetWidth, setTargetWidth] = useState<number | string>('');
    const [targetHeight, setTargetHeight] = useState<number | string>('');
    const [calcMode, setCalcMode] = useState<'area' | 'dimensions'>('dimensions');

    const { success, error: showError } = useToast();

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            loadEquipments();
            if (event) {
                setFormData({
                    name: event.name,
                    clientName: event.clientName,
                    venue: event.venue,
                    address: event.address,
                    startDate: event.startDate.split('T')[0],
                    endDate: event.endDate.split('T')[0],
                    setupTime: event.setupTime,
                    eventTime: event.eventTime,
                    status: event.status,
                    notes: event.notes,
                    technicalResponsible: event.technicalResponsible,
                });
                setSelectedEquipments(event.equipmentAllocations || []);
                setCurrentStep(1);
            } else {
                resetForm();
                setCurrentStep(1);
            }
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen, event]);

    useEffect(() => {
        if (formData.startDate && formData.endDate) {
            checkAvailability();
        } else {
            const map: Record<string, number> = {};
            equipments.forEach(eq => {
                map[eq.id] = eq.quantityOwned;
            });
            setAvailabilityMap(map);
        }
    }, [formData.startDate, formData.endDate, selectedEquipments, equipments]);

    const loadEquipments = async () => {
        const data = await DataService.getEquipments();
        setEquipments(data.filter(e => e.status === 'active'));
    };

    const checkAvailability = async () => {
        const map: Record<string, number> = {};
        equipments.forEach(eq => {
            map[eq.id] = eq.quantityOwned;
        });

        try {
            if (!formData.startDate || !formData.endDate) return;
            for (const eq of equipments) {
                try {
                    const available = await EventService.checkAvailability(eq.id, event?.id);
                    if (available !== -1) {
                        map[eq.id] = available;
                    }
                } catch (err) {
                    console.error(`Erro ao verificar disponibilidade do item ${eq.id}:`, err);
                }
            }
        } catch (err) {
            console.error('Erro ao processar disponibilidade:', err);
        }

        setAvailabilityMap(map);

        // Load occupied cases for equipment with unitsPerCase
        if (formData.startDate && formData.endDate) {
            const casesMap: Record<string, number[]> = {};
            for (const eq of equipments) {
                if (eq.unitsPerCase && eq.unitsPerCase > 0) {
                    try {
                        const occupied = await EventService.getOccupiedCases(
                            eq.id,
                            formData.startDate,
                            formData.endDate,
                            event?.id
                        );
                        casesMap[eq.id] = occupied;
                    } catch (err) {
                        console.error(`Erro ao buscar cases ocupados para ${eq.id}:`, err);
                    }
                }
            }
            setOccupiedCasesMap(casesMap);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '',
            clientName: '',
            venue: '',
            address: '',
            startDate: '',
            endDate: '',
            setupTime: '',
            eventTime: '',
            status: 'planned',
            notes: '',
            technicalResponsible: '',
        });
        setSelectedEquipments([]);
    };

    const handleAddEquipment = (equipment: Equipment) => {
        const existing = selectedEquipments.find(e => e.equipmentId === equipment.id);
        if (existing) {
            showError('Equipamento já adicionado');
            return;
        }

        const available = availabilityMap[equipment.id] || 0;
        if (available <= 0) {
            showError(`${equipment.name} não está disponível no momento`);
            return;
        }

        // Auto-select available cases if equipment has unitsPerCase
        let autoAllocatedCases: number[] | undefined;
        let autoQty = 1;

        if (equipment.unitsPerCase && equipment.unitsPerCase > 0) {
            const upc = equipment.unitsPerCase;
            const totalCases = Math.ceil((equipment.quantityOwned || 0) / upc);
            const occupied = occupiedCasesMap[equipment.id] || [];
            const availableCases = Array.from({ length: totalCases }, (_, i) => i + 1)
                .filter(c => !occupied.includes(c));

            if (availableCases.length === 0) {
                showError(`${equipment.name}: todos os cases estão ocupados neste período`);
                return;
            }

            // Auto-select first available case
            autoAllocatedCases = [availableCases[0]];
            autoQty = Math.min(upc, available);
        }

        const newAllocation: EquipmentAllocation = {
            id: crypto.randomUUID(),
            eventId: event?.id || '',
            equipmentId: equipment.id,
            equipment,
            quantityAllocated: autoQty,
            status: 'allocated',
            allocatedAt: new Date().toISOString(),
            allocatedCases: autoAllocatedCases,
        };

        setSelectedEquipments([...selectedEquipments, newAllocation]);
        success(`${equipment.name} adicionado (${available} disponível${available > 1 ? 'is' : ''})`);
    };

    const handleUpdateQuantity = (allocationId: string, quantity: number) => {
        setSelectedEquipments(prev =>
            prev.map(alloc => {
                if (alloc.id === allocationId) {
                    const eq = alloc.equipment;
                    const upc = eq.unitsPerCase || 0;
                    
                    // If no cases configured, just update quantity naturally
                    if (upc <= 0) {
                        return { ...alloc, quantityAllocated: Math.max(0, quantity) };
                    }
                    
                    // Handle case auto-selection based on new quantity
                    const totalCases = Math.ceil((eq.quantityOwned || 0) / upc);
                    const occupied = occupiedCasesMap[eq.id] || [];
                    const availableCases = Array.from({ length: totalCases }, (_, i) => i + 1)
                        .filter(c => !occupied.includes(c));
                    
                    const neededCasesCount = Math.ceil(quantity / upc);
                    
                    // Take the first available cases up to neededCasesCount
                    const newAllocatedCases = availableCases.slice(0, neededCasesCount);
                    
                    // Adjust quantity to match the selected cases if limited by availability
                    const finalQty = Math.min(quantity, newAllocatedCases.length * upc, eq.quantityOwned || quantity);
                    
                    return { 
                        ...alloc, 
                        quantityAllocated: finalQty,
                        allocatedCases: newAllocatedCases
                    };
                }
                return alloc;
            })
        );
    };

    const handleRemoveEquipment = (allocationId: string) => {
        setSelectedEquipments(prev => prev.filter(alloc => alloc.id !== allocationId));
    };

    const getAvailabilityStatus = (equipmentId: string, requestedQty: number) => {
        const available = availabilityMap[equipmentId] || 0;
        if (available >= requestedQty) return { status: 'available', color: 'text-green-400' };
        if (available > 0) return { status: 'partial', color: 'text-yellow-400' };
        return { status: 'unavailable', color: 'text-red-400' };
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
        const available = availabilityMap[activeLEDEquip.id] || 0;
        const finalPlates = Math.min(plates, available);

        const newAllocation: EquipmentAllocation = {
            id: crypto.randomUUID(),
            eventId: event?.id || '',
            equipmentId: activeLEDEquip.id,
            equipment: activeLEDEquip,
            quantityAllocated: finalPlates,
            status: 'allocated',
            allocatedAt: new Date().toISOString(),
        };

        setSelectedEquipments(prev => {
            const existing = prev.find(e => e.equipmentId === activeLEDEquip.id);
            if (existing) {
                return prev.map(e => e.equipmentId === activeLEDEquip.id ? { ...e, quantityAllocated: finalPlates } : e);
            }
            return [...prev, newAllocation];
        });

        setIsLEDCalcOpen(false);
        setActiveLEDEquip(null);
        success(`${finalPlates} placas aplicadas (${area}m²)`);
    };

    // Step validation
    const canProceedStep1 = !!(formData.name && formData.venue);
    const canProceedStep2 = !!(formData.startDate && formData.endDate);

    const handleNext = () => {
        if (currentStep === 1 && !canProceedStep1) {
            setTriedNext(prev => new Set(prev).add(1));
            return;
        }
        if (currentStep === 2 && !canProceedStep2) {
            setTriedNext(prev => new Set(prev).add(2));
            return;
        }
        setTriedNext(prev => { const next = new Set(prev); next.delete(currentStep); return next; });
        if (currentStep < 3) setCurrentStep(currentStep + 1);
    };

    const handleBack = () => {
        setTriedNext(prev => { const next = new Set(prev); next.delete(currentStep); return next; });
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const showFieldError = (step: number, fieldEmpty: boolean) => triedNext.has(step) && fieldEmpty;

    const handleSubmit = async () => {
        if (!formData.name || !formData.venue || !formData.startDate || !formData.endDate) {
            showError('Preencha todos os campos obrigatórios');
            return;
        }

        for (const alloc of selectedEquipments) {
            const available = availabilityMap[alloc.equipmentId] || 0;
            if (available < alloc.quantityAllocated) {
                showError(`${alloc.equipment?.name}: apenas ${available} disponível(is)`);
                return;
            }
        }

        setLoading(true);
        try {
            const eventData: Partial<Event> = {
                ...formData,
                startDate: formData.startDate!.includes('T') ? formData.startDate! : formData.startDate! + 'T12:00:00',
                endDate: formData.endDate!.includes('T') ? formData.endDate! : formData.endDate! + 'T12:00:00',
                equipmentAllocations: selectedEquipments,
            };

            if (event?.id) {
                await EventService.updateEvent(event.id, eventData);
                success('Evento atualizado com sucesso!');
            } else {
                await EventService.createEvent(eventData);
                success('Evento criado com sucesso!');
            }

            onSave();
            onClose();
        } catch (err) {
            console.error('Error saving event:', err);
            showError('Erro ao salvar evento');
        } finally {
            setLoading(false);
        }
    };

    const filteredEquipments = equipments.filter(eq =>
        eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        eq.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        eq.model.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalWatts = selectedEquipments.reduce((sum, alloc) => sum + ((alloc.equipment?.watts || 0) * alloc.quantityAllocated), 0);
    const totalItems = selectedEquipments.reduce((sum, alloc) => sum + alloc.quantityAllocated, 0);

    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm overflow-hidden">
                <div className={`bg-surface border-x sm:border border-slate-700 sm:rounded-xl w-full ${currentStep === 3 ? 'max-w-3xl' : 'max-w-2xl'} shadow-2xl animate-in zoom-in-95 duration-200 my-auto h-full sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col transition-all`}>
                    {/* Header */}
                    <div className="flex justify-between items-center p-3 sm:p-5 border-b border-slate-700 bg-slate-900/50 rounded-t-xl sticky top-0 z-10">
                        <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                            <div className="p-1 sm:p-1.5 bg-purple-600 rounded-lg">
                                <Calendar className="w-4 h-4 text-white" />
                            </div>
                            {event ? 'Editar Evento' : 'Novo Evento'}
                        </h2>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded-lg">
                            <X className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                    </div>

                    {/* Stepper */}
                    <div className="px-3 sm:px-5 pt-4 pb-2">
                        <div className="flex items-center justify-between">
                            {STEPS.map((step, index) => {
                                const isActive = currentStep === step.id;
                                const isCompleted = currentStep > step.id;
                                const StepIcon = step.icon;

                                return (
                                    <React.Fragment key={step.id}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (isCompleted || isActive) setCurrentStep(step.id);
                                            }}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-left ${isActive
                                                ? 'bg-purple-600/20 border border-purple-500/40'
                                                : isCompleted
                                                    ? 'bg-emerald-600/10 border border-emerald-500/20 cursor-pointer hover:bg-emerald-600/20'
                                                    : 'bg-slate-800/50 border border-slate-700/50 opacity-50'
                                                }`}
                                        >
                                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive
                                                ? 'bg-purple-600 text-white'
                                                : isCompleted
                                                    ? 'bg-emerald-600 text-white'
                                                    : 'bg-slate-700 text-slate-400'
                                                }`}>
                                                {isCompleted ? <Check className="w-4 h-4" /> : <StepIcon className="w-3.5 h-3.5" />}
                                            </div>
                                            <div className="hidden sm:block">
                                                <p className={`text-xs font-bold ${isActive ? 'text-purple-300' : isCompleted ? 'text-emerald-400' : 'text-slate-500'}`}>{step.title}</p>
                                                <p className="text-[10px] text-slate-500">{step.description}</p>
                                            </div>
                                        </button>
                                        {index < STEPS.length - 1 && (
                                            <div className={`flex-1 h-0.5 mx-2 rounded ${isCompleted ? 'bg-emerald-500/50' : 'bg-slate-700/50'}`} />
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>

                    {/* Step Content */}
                    <div className="overflow-y-auto flex-1 p-3 sm:p-5">
                        {/* === STEP 1: Informações === */}
                        {currentStep === 1 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <label className={`block text-xs font-bold uppercase mb-1.5 ${showFieldError(1, !formData.name) ? 'text-red-400' : 'text-slate-400'}`}>Nome do Evento *</label>
                                    <input
                                        autoFocus
                                        required
                                        className={`w-full bg-slate-900 border rounded-lg px-4 py-3 text-white outline-none transition-all ${showFieldError(1, !formData.name) ? 'border-red-500 focus:border-red-400 ring-1 ring-red-500/30' : 'border-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50'}`}
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ex: Show de Rock, Casamento, Conferência..."
                                    />
                                    {showFieldError(1, !formData.name) && <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Preencha o nome do evento</p>}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Cliente</label>
                                        <input
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none transition-all"
                                            value={formData.clientName}
                                            onChange={e => setFormData({ ...formData, clientName: e.target.value })}
                                            placeholder="Nome do cliente"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Responsável Técnico</label>
                                        <input
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none transition-all"
                                            value={formData.technicalResponsible}
                                            onChange={e => setFormData({ ...formData, technicalResponsible: e.target.value })}
                                            placeholder="Nome do responsável"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className={`block text-xs font-bold uppercase mb-1.5 ${showFieldError(1, !formData.venue) ? 'text-red-400' : 'text-slate-400'}`}>Local *</label>
                                    <input
                                        required
                                        className={`w-full bg-slate-900 border rounded-lg px-4 py-3 text-white outline-none transition-all ${showFieldError(1, !formData.venue) ? 'border-red-500 focus:border-red-400 ring-1 ring-red-500/30' : 'border-slate-700 focus:border-purple-500'}`}
                                        value={formData.venue}
                                        onChange={e => setFormData({ ...formData, venue: e.target.value })}
                                        placeholder="Ex: Teatro Municipal, Clube..."
                                    />
                                    {showFieldError(1, !formData.venue) && <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Preencha o local do evento</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Endereço</label>
                                    <input
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none transition-all"
                                        value={formData.address}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                        placeholder="Endereço completo"
                                    />
                                </div>
                            </div>
                        )}

                        {/* === STEP 2: Datas e Horários === */}
                        {currentStep === 2 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block text-xs font-bold uppercase mb-1.5 ${showFieldError(2, !formData.startDate) ? 'text-red-400' : 'text-slate-400'}`}>Data Início *</label>
                                        <input
                                            required
                                            type="date"
                                            className={`w-full bg-slate-900 border rounded-lg px-4 py-3 text-white outline-none transition-all ${showFieldError(2, !formData.startDate) ? 'border-red-500 focus:border-red-400 ring-1 ring-red-500/30' : 'border-slate-700 focus:border-purple-500'}`}
                                            value={formData.startDate}
                                            onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                        />
                                        {showFieldError(2, !formData.startDate) && <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Selecione a data de início</p>}
                                    </div>
                                    <div>
                                        <label className={`block text-xs font-bold uppercase mb-1.5 ${showFieldError(2, !formData.endDate) ? 'text-red-400' : 'text-slate-400'}`}>Data Término *</label>
                                        <input
                                            required
                                            type="date"
                                            className={`w-full bg-slate-900 border rounded-lg px-4 py-3 text-white outline-none transition-all ${showFieldError(2, !formData.endDate) ? 'border-red-500 focus:border-red-400 ring-1 ring-red-500/30' : 'border-slate-700 focus:border-purple-500'}`}
                                            value={formData.endDate}
                                            onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                        />
                                        {showFieldError(2, !formData.endDate) && <p className="text-red-400 text-[11px] mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Selecione a data de término</p>}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Horário Montagem</label>
                                        <input
                                            type="time"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none transition-all"
                                            value={formData.setupTime}
                                            onChange={e => setFormData({ ...formData, setupTime: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Horário Evento</label>
                                        <input
                                            type="time"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none transition-all"
                                            value={formData.eventTime}
                                            onChange={e => setFormData({ ...formData, eventTime: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {event && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Status</label>
                                        <select
                                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none transition-all"
                                            value={formData.status}
                                            onChange={e => setFormData({ ...formData, status: e.target.value as Event['status'] })}
                                        >
                                            <option value="planned">Planejado</option>
                                            <option value="in_progress">Em Andamento</option>
                                            <option value="completed">Concluído</option>
                                            <option value="cancelled">Cancelado</option>
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Observações</label>
                                    <textarea
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none transition-all resize-none"
                                        rows={3}
                                        value={formData.notes}
                                        onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                        placeholder="Notas adicionais sobre o evento..."
                                    />
                                </div>
                            </div>
                        )}

                        {/* === STEP 3: Equipamentos === */}
                        {currentStep === 3 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                {/* Search bar */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por nome, marca ou modelo..."
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:border-emerald-500 outline-none transition-all placeholder-slate-500"
                                        value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        autoFocus
                                    />
                                </div>

                                {/* Selected Equipment Summary Bar */}
                                {selectedEquipments.length > 0 && (
                                    <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg px-4 py-2.5 flex items-center justify-between">
                                        <span className="text-purple-300 text-xs font-bold">{selectedEquipments.length} equipamento(s) • {totalItems} unidades</span>
                                        <span className="text-yellow-400 text-xs font-bold flex items-center gap-1">
                                            <Zap className="w-3 h-3" />
                                            {totalWatts >= 1000 ? `${(totalWatts / 1000).toFixed(1)}kW` : `${totalWatts}W`}
                                        </span>
                                    </div>
                                )}

                                {/* Equipment Cards - Grouped by Category */}
                                <div className="space-y-5 max-h-[50vh] overflow-y-auto pr-1">
                                    {(() => {
                                        const categoryOrder = ['Painel de LED', 'Moving Head', 'Par Led', 'Blinder', 'Strobo', 'Console', 'Outros'];
                                        const categoryIcons: Record<string, string> = {
                                            'Painel de LED': '📺', 'Moving Head': '💡', 'Par Led': '🔦',
                                            'Blinder': '⚡', 'Strobo': '✨', 'Console': '🎛️', 'Outros': '📦'
                                        };
                                        const grouped = filteredEquipments.reduce((acc, eq) => {
                                            const cat = eq.category || 'Outros';
                                            if (!acc[cat]) acc[cat] = [];
                                            acc[cat].push(eq);
                                            return acc;
                                        }, {} as Record<string, Equipment[]>);

                                        // Include ALL categories from the data, not just hardcoded ones
                                        const allCategories = Object.keys(grouped);
                                        const sortedCategories = [
                                            ...categoryOrder.filter(c => grouped[c]),
                                            ...allCategories.filter(c => !categoryOrder.includes(c))
                                        ];

                                        if (sortedCategories.length === 0) {
                                            return (
                                                <div className="text-center py-8 text-slate-500">
                                                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                                    <p className="font-medium">Nenhum equipamento encontrado</p>
                                                    <p className="text-xs mt-1">Tente outro termo de busca</p>
                                                </div>
                                            );
                                        }

                                        return sortedCategories.map(category => (
                                            <div key={category}>
                                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-2 sticky top-0 bg-surface py-1 z-[1]">
                                                    <span>{categoryIcons[category] || '📦'}</span>
                                                    {category}
                                                    <span className="text-slate-600">({grouped[category].length})</span>
                                                </h4>
                                                <div className="space-y-2">
                                                    {grouped[category].map(eq => {
                                                        const alloc = selectedEquipments.find(a => a.equipmentId === eq.id);
                                                        const isSelected = !!alloc;
                                                        const available = availabilityMap[eq.id] || 0;
                                                        const isUnavailable = available <= 0;
                                                        const isLED = eq.category === 'Painel de LED';

                                                        return (
                                                            <div
                                                                key={eq.id}
                                                                className={`rounded-xl border p-4 transition-all ${isSelected
                                                                    ? 'bg-emerald-900/15 border-emerald-500/40'
                                                                    : isUnavailable
                                                                        ? 'bg-slate-800/50 border-slate-700 opacity-50'
                                                                        : 'bg-slate-900/80 border-slate-700 hover:border-slate-600'
                                                                    }`}
                                                            >
                                                                {/* Card top row */}
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <h5 className="text-white font-bold text-sm truncate">{eq.name}</h5>
                                                                            {isSelected && <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                                                                        </div>
                                                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                                                            <span className="text-xs text-slate-400">{eq.brand}{eq.model ? ` • ${eq.model}` : ''}</span>
                                                                            <span className="text-xs text-yellow-400 flex items-center gap-0.5">
                                                                                <Zap className="w-3 h-3" />{eq.watts}W
                                                                            </span>
                                                                            {isLED && eq.panelWidth && eq.panelHeight && (
                                                                                <span className="text-xs text-blue-400">
                                                                                    {eq.panelWidth}m × {eq.panelHeight}m
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    {/* Availability + Stock */}
                                                                    <div className="text-right flex-shrink-0">
                                                                        <p className={`text-lg font-black ${available > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                                            {available}
                                                                        </p>
                                                                        <p className="text-[10px] text-slate-500">{eq.quantityOwned} total</p>
                                                                    </div>
                                                                </div>

                                                                {/* Action row */}
                                                                <div className="mt-3 flex items-center gap-2 sm:gap-3">
                                                                    {isSelected ? (
                                                                        <>
                                                                            <div className="flex items-center gap-2">
                                                                                {/* Editable quantity */}
                                                                                <div className="flex items-center gap-1 bg-slate-800 rounded-lg border border-slate-700 p-1">
                                                                                    <button type="button" onClick={() => handleUpdateQuantity(alloc!.id, alloc!.quantityAllocated - 1)} disabled={alloc!.quantityAllocated <= 1} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 rounded-md disabled:opacity-30 transition-all">
                                                                                        <Minus className="w-4 h-4" />
                                                                                    </button>
                                                                                    <input
                                                                                        type="text"
                                                                                        inputMode="numeric"
                                                                                        value={editingQty[alloc!.id] !== undefined ? editingQty[alloc!.id] : alloc!.quantityAllocated}
                                                                                        onChange={e => {
                                                                                            const raw = e.target.value.replace(/[^0-9]/g, '');
                                                                                            setEditingQty(prev => ({ ...prev, [alloc!.id]: raw }));
                                                                                        }}
                                                                                        onFocus={e => {
                                                                                            setEditingQty(prev => ({ ...prev, [alloc!.id]: String(alloc!.quantityAllocated) }));
                                                                                            setTimeout(() => e.target.select(), 0);
                                                                                        }}
                                                                                        onBlur={() => {
                                                                                            const raw = editingQty[alloc!.id];
                                                                                            const val = parseInt(raw) || 1;
                                                                                            const clamped = Math.min(Math.max(val, 1), available);
                                                                                            handleUpdateQuantity(alloc!.id, clamped);
                                                                                            setEditingQty(prev => { const next = { ...prev }; delete next[alloc!.id]; return next; });
                                                                                        }}
                                                                                        onKeyDown={e => {
                                                                                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                                                                        }}
                                                                                        className="w-14 h-8 bg-slate-900 border border-slate-600 rounded-md text-white text-center text-sm font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none"
                                                                                    />
                                                                                    <button type="button" onClick={() => handleUpdateQuantity(alloc!.id, alloc!.quantityAllocated + 1)} disabled={alloc!.quantityAllocated >= available} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 rounded-md disabled:opacity-30 transition-all">
                                                                                        <Plus className="w-4 h-4" />
                                                                                    </button>
                                                                                </div>
                                                                                <span className="text-[10px] text-slate-500">de {available}</span>
                                                                            </div>
                                                                            
                                                                            <div className="flex items-center gap-2 ml-auto">
                                                                                {/* LED Calc shortcut */}
                                                                                {isLED && (
                                                                                    <button type="button" onClick={() => handleOpenLEDCalc(eq)} className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-500/10 px-2.5 py-1.5 rounded-lg border border-blue-500/20 transition-colors">
                                                                                        <Activity className="w-3.5 h-3.5" />
                                                                                        Área
                                                                                    </button>
                                                                                )}
                                                                                {/* Remove */}
                                                                                <button type="button" onClick={() => handleRemoveEquipment(alloc!.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Remover">
                                                                                    <Trash2 className="w-4 h-4" />
                                                                                </button>
                                                                            </div>
                                                                        </>
                                                                    ) : isUnavailable ? (
                                                                        <span className="text-xs text-red-400 flex items-center gap-1">
                                                                            <AlertCircle className="w-3.5 h-3.5" /> Indisponível no período
                                                                        </span>
                                                                    ) : (
                                                                        <>
                                                                            <button type="button" onClick={() => handleAddEquipment(eq)} className="flex-1 sm:flex-none justify-center bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all">
                                                                                <Plus className="w-3.5 h-3.5" />
                                                                                Adicionar
                                                                            </button>
                                                                            {isLED && (
                                                                                <button type="button" onClick={() => handleOpenLEDCalc(eq)} className="flex-1 sm:flex-none justify-center text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-500/10 px-2.5 py-2 rounded-lg border border-blue-500/20 transition-colors">
                                                                                    <Activity className="w-3.5 h-3.5" />
                                                                                    Calc. Área
                                                                                </button>
                                                                            )}
                                                                        </>
                                                                    )}
                                                                </div>

                                                                {/* Interactive Case Selection */}
                                                                {isSelected && eq.unitsPerCase && eq.unitsPerCase > 0 && (() => {
                                                                    const upc = eq.unitsPerCase;
                                                                    const prefix = eq.casePrefix || 'C';
                                                                    const totalOwnedCases = Math.ceil((eq.quantityOwned || 0) / upc);
                                                                    const selectedCases = alloc!.allocatedCases || [];
                                                                    const occupied = occupiedCasesMap[eq.id] || [];
                                                                    const availableCount = totalOwnedCases - occupied.length;

                                                                    const toggleCase = (caseNum: number) => {
                                                                        if (occupied.includes(caseNum)) return; // Can't toggle occupied
                                                                        const current = alloc!.allocatedCases || [];
                                                                        let updated: number[];
                                                                        if (current.includes(caseNum)) {
                                                                            updated = current.filter(c => c !== caseNum);
                                                                        } else {
                                                                            updated = [...current, caseNum].sort((a, b) => a - b);
                                                                        }
                                                                        const newQty = updated.length * upc;
                                                                        setSelectedEquipments(prev =>
                                                                            prev.map(a => a.id === alloc!.id
                                                                                ? { ...a, allocatedCases: updated, quantityAllocated: Math.min(newQty, eq.quantityOwned || newQty) }
                                                                                : a
                                                                            )
                                                                        );
                                                                    };

                                                                    return (
                                                                        <div className="mt-2 bg-amber-500/5 border border-amber-500/15 rounded-lg p-2.5">
                                                                            <p className="text-[10px] text-amber-400 font-bold uppercase mb-1.5">
                                                                                📦 Selecione os cases ({selectedCases.length} selecionado{selectedCases.length !== 1 ? 's' : ''} · {availableCount} disponível{availableCount !== 1 ? 'is' : ''})
                                                                            </p>
                                                                            <div className="flex flex-wrap gap-1.5">
                                                                                {Array.from({ length: totalOwnedCases }, (_, c) => {
                                                                                    const caseNum = c + 1;
                                                                                    const start = String(c * upc + 1).padStart(2, '0');
                                                                                    const end = String(Math.min((c + 1) * upc, eq.quantityOwned || 0)).padStart(2, '0');
                                                                                    const isChecked = selectedCases.includes(caseNum);
                                                                                    const isOccupied = occupied.includes(caseNum);
                                                                                    return (
                                                                                        <button
                                                                                            key={c}
                                                                                            type="button"
                                                                                            onClick={() => toggleCase(caseNum)}
                                                                                            disabled={isOccupied}
                                                                                            title={isOccupied ? `Case ${prefix}-${caseNum} alocado em outro evento` : ''}
                                                                                            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold transition-all ${
                                                                                                isOccupied
                                                                                                    ? 'bg-red-500/15 border border-red-500/30 text-red-400/70 cursor-not-allowed opacity-60'
                                                                                                    : isChecked
                                                                                                        ? 'bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 ring-1 ring-emerald-400/30 cursor-pointer'
                                                                                                        : 'bg-slate-800/50 border border-slate-700 text-slate-500 hover:border-amber-500/30 hover:text-amber-400 cursor-pointer'
                                                                                            }`}
                                                                                        >
                                                                                            {isOccupied ? '🔒' : isChecked ? '✅' : '⬜'} {prefix}-{caseNum}
                                                                                            <span className={isOccupied ? 'text-red-500/50' : isChecked ? 'text-emerald-500/60' : 'text-slate-600'}>({start}-{end})</span>
                                                                                        </button>
                                                                                    );
                                                                                })}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer with navigation */}
                    <div className="flex items-center justify-between p-3 sm:p-5 border-t border-slate-700 bg-slate-900/30 sticky bottom-0">
                        <div>
                            {currentStep > 1 ? (
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors font-medium text-sm"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Voltar
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors font-medium text-sm"
                                >
                                    Cancelar
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Step indicator (mobile) */}
                            <span className="text-xs text-slate-500 sm:hidden">{currentStep}/3</span>

                            {currentStep < 3 ? (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-purple-500/20 active:scale-95 transition-all"
                                >
                                    Próximo
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={loading}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Salvando...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            Salvar Evento
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* LED Area Calculator Modal */}
            {isLEDCalcOpen && activeLEDEquip && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
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
                                <button type="button" onClick={() => setCalcMode('dimensions')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${calcMode === 'dimensions' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                                    Dimensões (LxA)
                                </button>
                                <button type="button" onClick={() => setCalcMode('area')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${calcMode === 'area' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                                    Área Total (m²)
                                </button>
                            </div>

                            {calcMode === 'dimensions' ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Largura (m)</label>
                                        <input type="number" placeholder="Ex: 5" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-xl font-bold focus:border-emerald-500 outline-none" value={targetWidth} onChange={e => setTargetWidth(e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Altura (m)</label>
                                        <input type="number" placeholder="Ex: 4" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-xl font-bold focus:border-emerald-500 outline-none" value={targetHeight} onChange={e => setTargetHeight(e.target.value)} />
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Quantos m² você precisa?</label>
                                    <div className="relative">
                                        <input type="number" placeholder="Ex: 32" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-xl font-bold focus:border-emerald-500 outline-none pr-12" value={targetArea} onChange={e => setTargetArea(e.target.value)} />
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
                                    type="button"
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
        </>
    );
};
