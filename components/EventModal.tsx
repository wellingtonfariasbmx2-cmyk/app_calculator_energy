import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, MapPin, Users, Clock, Plus, Minus, Trash2, AlertCircle, CheckCircle, Package, Search, Zap } from 'lucide-react';
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
    const [isEquipPopupOpen, setIsEquipPopupOpen] = useState(false);

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
                // Enviar como meio-dia para evitar que a conversão de timezone mude o dia
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
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
                <div className="bg-surface border-x sm:border border-slate-700 sm:rounded-xl w-full max-w-4xl shadow-2xl animate-in zoom-in-95 duration-200 my-auto min-h-full sm:min-h-0 sm:max-h-[90vh] overflow-hidden flex flex-col">
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

                            {/* Equipamentos — Resumo Compacto + Botão Popup */}
                            <div className="border-t border-slate-700/50 pt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-white text-sm font-bold flex items-center gap-2">
                                        <Package className="w-4 h-4 text-purple-400" />
                                        Equipamentos ({selectedEquipments.length})
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => { setSearchQuery(''); setIsEquipPopupOpen(true); }}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        Adicionar Equipamento
                                    </button>
                                </div>

                                {/* Resumo dos equipamentos selecionados */}
                                {selectedEquipments.length > 0 ? (
                                    <div className="space-y-2">
                                        {selectedEquipments.map(alloc => {
                                            const availability = getAvailabilityStatus(alloc.equipmentId, alloc.quantityAllocated);
                                            const available = availabilityMap[alloc.equipmentId] || 0;

                                            return (
                                                <div key={alloc.id} className="bg-slate-900 border border-slate-700 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white font-medium text-sm truncate">{alloc.equipment?.name}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-xs text-slate-500">{alloc.equipment?.brand}</span>
                                                            <span className="text-xs text-yellow-400 flex items-center gap-0.5">
                                                                <Zap className="w-3 h-3" />{alloc.equipment?.watts}W
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 pt-2 sm:pt-0 border-t border-slate-800 sm:border-0">
                                                        <div className="flex items-center gap-1 bg-slate-800 rounded-lg border border-slate-700">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleUpdateQuantity(alloc.id, alloc.quantityAllocated - 1)}
                                                                disabled={alloc.quantityAllocated <= 1}
                                                                className="px-2 py-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                            >
                                                                <Minus className="w-3.5 h-3.5" />
                                                            </button>
                                                            <span className="text-white text-sm font-bold w-8 text-center">{alloc.quantityAllocated}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleUpdateQuantity(alloc.id, alloc.quantityAllocated + 1)}
                                                                disabled={alloc.quantityAllocated >= available}
                                                                className="px-2 py-1 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                            >
                                                                <Plus className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                        <span className={`text-xs font-bold ${availability.color}`}>
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
                                        {/* Total bar */}
                                        <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-3 flex items-center justify-between">
                                            <span className="text-purple-300 text-xs font-bold">Total: {totalItems} unidades</span>
                                            <span className="text-yellow-400 text-xs font-bold flex items-center gap-1">
                                                <Zap className="w-3 h-3" />
                                                {totalWatts >= 1000 ? `${(totalWatts / 1000).toFixed(1)}kW` : `${totalWatts}W`}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6 border border-dashed border-slate-700 rounded-lg">
                                        <Package className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                                        <p className="text-slate-500 text-sm">Nenhum equipamento selecionado</p>
                                        <p className="text-slate-600 text-xs mt-1">Clique em "Adicionar Equipamento" para selecionar</p>
                                    </div>
                                )}
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

            {/* ===== EQUIPMENT POPUP (Sub-Modal) ===== */}
            {isEquipPopupOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-surface border-x sm:border border-slate-700 sm:rounded-xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 min-h-full sm:min-h-0 sm:max-h-[85vh] flex flex-col">
                        {/* Popup Header */}
                        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-slate-700 bg-slate-900/50 rounded-t-xl">
                            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                                <div className="p-1 bg-emerald-600 rounded-lg">
                                    <Package className="w-4 h-4 text-white" />
                                </div>
                                Selecionar Equipamentos
                            </h3>
                            <button
                                onClick={() => setIsEquipPopupOpen(false)}
                                className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="p-4 sm:p-5 pb-0">
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
                        </div>

                        {/* Equipment List */}
                        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2">
                            {filteredEquipments.map(eq => {
                                const isSelected = selectedEquipments.some(alloc => alloc.equipmentId === eq.id);
                                const available = availabilityMap[eq.id] || 0;
                                const isUnavailable = available <= 0;

                                return (
                                    <button
                                        key={eq.id}
                                        type="button"
                                        onClick={() => {
                                            if (!isSelected && !isUnavailable) {
                                                handleAddEquipment(eq);
                                            }
                                        }}
                                        disabled={isSelected || isUnavailable}
                                        className={`w-full text-left p-3 rounded-lg border transition-all ${isSelected
                                            ? 'bg-emerald-900/20 border-emerald-500/40 cursor-default'
                                            : isUnavailable
                                                ? 'bg-slate-800 border-slate-700 opacity-50 cursor-not-allowed'
                                                : 'bg-slate-900 border-slate-700 hover:border-emerald-500 hover:bg-slate-800'
                                            }`}
                                    >
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-white font-medium text-sm truncate">{eq.name}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs text-slate-400">{eq.brand} - {eq.model}</span>
                                                    <span className="text-xs text-yellow-400 flex items-center gap-0.5">
                                                        <Zap className="w-3 h-3" />{eq.watts}W
                                                    </span>
                                                </div>
                                                {isUnavailable && !isSelected && (
                                                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                                                        <AlertCircle className="w-3 h-3" /> Indisponível
                                                    </p>
                                                )}
                                                {isSelected && (
                                                    <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                                                        <CheckCircle className="w-3 h-3" /> Já adicionado
                                                    </p>
                                                )}
                                            </div>
                                            <div className="text-left sm:text-right flex-shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t border-slate-800 sm:border-0 flex sm:flex-col justify-between items-center sm:items-end">
                                                <p className={`text-sm font-bold ${available > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {available} disp.
                                                </p>
                                                <p className="text-xs text-slate-500">{eq.quantityOwned} total</p>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                            {filteredEquipments.length === 0 && (
                                <div className="text-center py-8 text-slate-500">
                                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p className="font-medium">Nenhum equipamento encontrado</p>
                                    <p className="text-xs mt-1">Tente outro termo de busca</p>
                                </div>
                            )}
                        </div>

                        {/* Popup Footer */}
                        <div className="flex justify-end p-4 sm:p-5 border-t border-slate-700 bg-slate-900/30 rounded-b-xl">
                            <button
                                type="button"
                                onClick={() => setIsEquipPopupOpen(false)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Concluir Seleção
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

