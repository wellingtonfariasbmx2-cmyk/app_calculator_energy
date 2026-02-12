import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, MapPin, Users, Clock, Plus, Minus, Trash2, AlertCircle, CheckCircle, Package } from 'lucide-react';
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

export const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, onSave, event }) => {
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
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const { success, error: showError } = useToast();

    useEffect(() => {
        if (isOpen) {
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
            } else {
                resetForm();
            }
        }
    }, [isOpen, event]);

    useEffect(() => {
        if (formData.startDate && formData.endDate) {
            checkAvailability();
        }
    }, [formData.startDate, formData.endDate, selectedEquipments]);

    const loadEquipments = async () => {
        const data = await DataService.getEquipments();
        setEquipments(data.filter(e => e.status === 'active'));
    };

    const checkAvailability = async () => {
        const map: Record<string, number> = {};
        for (const eq of equipments) {
            const available = await EventService.checkAvailability(eq.id, event?.id);
            map[eq.id] = available;
        }
        setAvailabilityMap(map);
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

        // Verificar disponibilidade ANTES de adicionar
        const available = availabilityMap[equipment.id] || 0;
        if (available <= 0) {
            showError(`${equipment.name} não está disponível no momento`);
            return;
        }

        const newAllocation: EquipmentAllocation = {
            id: crypto.randomUUID(),
            eventId: event?.id || '',
            equipmentId: equipment.id,
            equipment,
            quantityAllocated: 1,
            status: 'allocated',
            allocatedAt: new Date().toISOString(),
        };

        setSelectedEquipments([...selectedEquipments, newAllocation]);
        success(`${equipment.name} adicionado (${available} disponível${available > 1 ? 'is' : ''})`);
    };

    const handleUpdateQuantity = (allocationId: string, quantity: number) => {
        setSelectedEquipments(prev =>
            prev.map(alloc =>
                alloc.id === allocationId
                    ? { ...alloc, quantityAllocated: Math.max(0, quantity) }
                    : alloc
            )
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.venue || !formData.startDate || !formData.endDate) {
            showError('Preencha todos os campos obrigatórios');
            return;
        }

        // Validar disponibilidade
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
                startDate: new Date(formData.startDate!).toISOString(),
                endDate: new Date(formData.endDate!).toISOString(),
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <div className="bg-surface border border-slate-700 rounded-xl w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-200 my-auto max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-3 sm:p-6 border-b border-slate-700 bg-slate-900/50 rounded-t-xl sticky top-0 z-10">
                    <h2 className="text-base sm:text-xl font-bold text-white flex items-center gap-2">
                        <div className="p-1 sm:p-1.5 bg-purple-600 rounded-lg">
                            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                        </div>
                        {event ? 'Editar Evento' : 'Novo Evento'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded-lg">
                        <X className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
                    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
                        {/* Informações Básicas */}
                        <div>
                            <h3 className="text-white text-sm font-bold mb-4 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-purple-400" />
                                Informações do Evento
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Nome do Evento *</label>
                                    <input
                                        required
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 outline-none transition-all"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ex: Show de Rock, Casamento, Conferência..."
                                    />
                                </div>

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

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Local *</label>
                                    <input
                                        required
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none transition-all"
                                        value={formData.venue}
                                        onChange={e => setFormData({ ...formData, venue: e.target.value })}
                                        placeholder="Ex: Teatro Municipal, Clube..."
                                    />
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

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Data Início *</label>
                                    <input
                                        required
                                        type="date"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none transition-all"
                                        value={formData.startDate}
                                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Data Término *</label>
                                    <input
                                        required
                                        type="date"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none transition-all"
                                        value={formData.endDate}
                                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                    />
                                </div>

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

                                <div className="md:col-span-2">
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
                        </div>

                        {/* Equipamentos */}
                        <div className="border-t border-slate-700/50 pt-6">
                            <h3 className="text-white text-sm font-bold mb-4 flex items-center gap-2">
                                <Package className="w-4 h-4 text-purple-400" />
                                Equipamentos
                            </h3>

                            {/* Equipamentos Selecionados */}
                            {selectedEquipments.length > 0 && (
                                <div className="mb-4 space-y-2">
                                    <p className="text-xs text-slate-500 uppercase font-bold">Selecionados ({selectedEquipments.length})</p>
                                    {selectedEquipments.map(alloc => {
                                        const availability = getAvailabilityStatus(alloc.equipmentId, alloc.quantityAllocated);
                                        const available = availabilityMap[alloc.equipmentId] || 0;

                                        return (
                                            <div key={alloc.id} className="bg-slate-900 border border-slate-700 rounded-lg p-3 flex items-center justify-between">
                                                <div className="flex-1">
                                                    <p className="text-white font-medium text-sm">{alloc.equipment?.name}</p>
                                                    <p className="text-xs text-slate-400">{alloc.equipment?.brand} - {alloc.equipment?.model}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-2 bg-slate-800 rounded-lg border border-slate-700">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateQuantity(alloc.id, alloc.quantityAllocated - 1)}
                                                            disabled={alloc.quantityAllocated <= 1}
                                                            className="px-2 py-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                        >
                                                            <Minus className="w-4 h-4" />
                                                        </button>
                                                        <input
                                                            type="text"
                                                            className="w-12 bg-transparent text-white text-sm text-center outline-none"
                                                            value={alloc.quantityAllocated}
                                                            onChange={e => {
                                                                const val = e.target.value;
                                                                if (val === '') {
                                                                    handleUpdateQuantity(alloc.id, 0);
                                                                } else {
                                                                    const num = parseInt(val);
                                                                    if (!isNaN(num) && num >= 0) {
                                                                        handleUpdateQuantity(alloc.id, num);
                                                                    }
                                                                }
                                                            }}
                                                            onBlur={e => {
                                                                if (e.target.value === '' || parseInt(e.target.value) < 1) {
                                                                    handleUpdateQuantity(alloc.id, 1);
                                                                }
                                                            }}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateQuantity(alloc.id, alloc.quantityAllocated + 1)}
                                                            disabled={alloc.quantityAllocated >= available}
                                                            className="px-2 py-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <span className={`text-xs font-bold ${availability.color} whitespace-nowrap`}>
                                                        {available} disp.
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveEquipment(alloc.id)}
                                                        className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Buscar Equipamentos */}
                            <div className="mb-3">
                                <input
                                    type="text"
                                    placeholder="Buscar equipamento..."
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm focus:border-purple-500 outline-none"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>

                            {/* Lista de Equipamentos */}
                            <div className="max-h-60 overflow-y-auto space-y-2 border border-slate-700 rounded-lg p-2 bg-slate-900/50">
                                {filteredEquipments.map(eq => {
                                    const isSelected = selectedEquipments.some(alloc => alloc.equipmentId === eq.id);
                                    const available = availabilityMap[eq.id] || 0;
                                    const isUnavailable = available <= 0;

                                    return (
                                        <button
                                            key={eq.id}
                                            type="button"
                                            onClick={() => !isSelected && !isUnavailable && handleAddEquipment(eq)}
                                            disabled={isSelected || isUnavailable}
                                            className={`w-full text-left p-3 rounded-lg border transition-all ${isSelected || isUnavailable
                                                ? 'bg-slate-800 border-slate-700 opacity-50 cursor-not-allowed'
                                                : 'bg-slate-900 border-slate-700 hover:border-purple-500 hover:bg-slate-800'
                                                }`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="text-white font-medium text-sm">{eq.name}</p>
                                                    <p className="text-xs text-slate-400">{eq.brand} - {eq.model}</p>
                                                    {isUnavailable && !isSelected && (
                                                        <p className="text-xs text-red-400 mt-1">❌ Indisponível</p>
                                                    )}
                                                    {isSelected && (
                                                        <p className="text-xs text-purple-400 mt-1">✓ Já adicionado</p>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-sm font-bold ${available > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {available} disp.
                                                    </p>
                                                    <p className="text-xs text-slate-500">{eq.quantityOwned} total</p>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 p-3 sm:p-6 border-t border-slate-700 bg-slate-900/30 sticky bottom-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="order-2 sm:order-1 px-6 py-3 sm:py-2.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors font-medium text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="order-1 sm:order-2 bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 sm:py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                    </div>
                </form>
            </div>
        </div>
    );
};
