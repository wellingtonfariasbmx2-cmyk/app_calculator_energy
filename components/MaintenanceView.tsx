import React, { useState, useEffect, useCallback } from 'react';
import {
    Wrench, Plus, Search, Filter, Calendar, AlertTriangle, CheckCircle, Clock,
    X, Trash2, Edit, ChevronDown, Package, DollarSign, User, FileText,
    AlertCircle, RotateCcw, Settings, Activity
} from 'lucide-react';
import { MaintenanceService } from '../services/MaintenanceService';
import { DataService } from '../services/supabaseClient';
import { MaintenanceRecord, Equipment } from '../types';
import { useToast } from './Toast';

export function MaintenanceView() {
    const [records, setRecords] = useState<MaintenanceRecord[]>([]);
    const [equipments, setEquipments] = useState<Equipment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterPriority, setFilterPriority] = useState<string>('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<MaintenanceRecord | null>(null);
    const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, completed: 0, overdue: 0, totalCost: 0 });
    const { success, error: showError } = useToast();

    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [recordsData, equipData] = await Promise.all([
                MaintenanceService.getMaintenanceRecords(),
                DataService.getEquipments(),
            ]);
            setRecords(recordsData);
            setEquipments(equipData);

            // Calculate stats
            const today = new Date().toISOString().split('T')[0];
            setStats({
                total: recordsData.length,
                pending: recordsData.filter(r => r.status === 'pending').length,
                inProgress: recordsData.filter(r => r.status === 'in_progress').length,
                completed: recordsData.filter(r => r.status === 'completed').length,
                overdue: recordsData.filter(r => r.status !== 'completed' && r.scheduledDate && r.scheduledDate < today).length,
                totalCost: recordsData.filter(r => r.status === 'completed').reduce((sum, r) => sum + (r.cost || 0), 0),
            });
        } catch (err) {
            console.error('Error loading maintenance data:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleDelete = async (id: string) => {
        try {
            await MaintenanceService.delete(id);
            success('Registro removido com sucesso');
            loadData();
        } catch (err) {
            showError('Erro ao remover registro');
        }
    };

    const handleComplete = async (id: string) => {
        try {
            await MaintenanceService.complete(id);
            success('Manutenção concluída!');
            loadData();
        } catch (err) {
            showError('Erro ao concluir manutenção');
        }
    };

    const today = new Date().toISOString().split('T')[0];

    const filteredRecords = records.filter(r => {
        const matchSearch = !searchQuery ||
            r.equipment?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.technician?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchStatus = filterStatus === 'all' || r.status === filterStatus;
        const matchPriority = filterPriority === 'all' || r.priority === filterPriority;
        return matchSearch && matchStatus && matchPriority;
    });

    const priorityColors: Record<string, string> = {
        low: 'bg-slate-700/50 text-slate-300 border-slate-600',
        medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
        high: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
        critical: 'bg-red-500/15 text-red-400 border-red-500/30',
    };
    const priorityLabels: Record<string, string> = {
        low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica',
    };
    const statusColors: Record<string, string> = {
        pending: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        in_progress: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
        completed: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    };
    const statusLabels: Record<string, string> = {
        pending: 'Pendente', in_progress: 'Em Andamento', completed: 'Concluída',
    };
    const typeLabels: Record<string, string> = {
        preventive: 'Preventiva', corrective: 'Corretiva', replacement: 'Reposição',
    };
    const typeColors: Record<string, string> = {
        preventive: 'text-blue-400', corrective: 'text-orange-400', replacement: 'text-purple-400',
    };

    return (
        <div>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-orange-600 to-red-600 rounded-xl shadow-lg shadow-orange-500/20">
                        <Wrench className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight">Manutenção</h1>
                        <p className="text-xs text-slate-500 mt-0.5">Controle de manutenção e reposição de equipamentos</p>
                    </div>
                </div>
                <button
                    onClick={() => { setEditingRecord(null); setIsModalOpen(true); }}
                    className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 text-sm"
                >
                    <Plus className="w-4 h-4" />
                    Nova Manutenção
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
                <MiniStat label="Total" value={stats.total} color="slate" />
                <MiniStat label="Pendente" value={stats.pending} color="blue" />
                <MiniStat label="Em Andamento" value={stats.inProgress} color="yellow" />
                <MiniStat label="Concluída" value={stats.completed} color="emerald" />
                <MiniStat label="Atrasada" value={stats.overdue} color="red" alert={stats.overdue > 0} />
                <MiniStat label="Custo Total" value={`R$ ${stats.totalCost.toFixed(0)}`} color="purple" />
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Buscar por equipamento, descrição ou técnico..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:border-orange-500 outline-none transition-all placeholder-slate-500"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <select
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-orange-500"
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                >
                    <option value="all">Todos Status</option>
                    <option value="pending">Pendente</option>
                    <option value="in_progress">Em Andamento</option>
                    <option value="completed">Concluída</option>
                </select>
                <select
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-orange-500"
                    value={filterPriority}
                    onChange={e => setFilterPriority(e.target.value)}
                >
                    <option value="all">Todas Prioridades</option>
                    <option value="critical">Crítica</option>
                    <option value="high">Alta</option>
                    <option value="medium">Média</option>
                    <option value="low">Baixa</option>
                </select>
            </div>

            {/* Records List */}
            {isLoading ? (
                <div className="text-center py-12 text-slate-500">
                    <RotateCcw className="w-8 h-8 animate-spin mx-auto mb-3" />
                    <p>Carregando...</p>
                </div>
            ) : filteredRecords.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                    <Wrench className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">Nenhum registro de manutenção</p>
                    <p className="text-sm mt-1">Clique em "Nova Manutenção" para criar o primeiro</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredRecords.map(record => {
                        const isOverdue = record.status !== 'completed' && record.scheduledDate && record.scheduledDate < today;
                        return (
                            <div key={record.id} className={`bg-slate-900/60 border rounded-xl p-4 transition-all hover:border-slate-600 ${isOverdue ? 'border-red-500/40' : 'border-slate-700'}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-white font-bold text-sm">{record.equipment?.name || 'Equipamento'}</h3>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusColors[record.status]}`}>
                                                {statusLabels[record.status]}
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${priorityColors[record.priority]}`}>
                                                {priorityLabels[record.priority]}
                                            </span>
                                            <span className={`text-[10px] font-bold ${typeColors[record.type]}`}>
                                                {typeLabels[record.type]}
                                            </span>
                                            {isOverdue && (
                                                <span className="text-[10px] font-bold text-red-400 flex items-center gap-0.5 animate-pulse">
                                                    <AlertTriangle className="w-3 h-3" /> ATRASADA
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">{record.description}</p>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-500">
                                            {record.technician && (
                                                <span className="flex items-center gap-1"><User className="w-3 h-3" />{record.technician}</span>
                                            )}
                                            {record.scheduledDate && (
                                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Prevista: {new Date(record.scheduledDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                            )}
                                            {record.completedDate && (
                                                <span className="flex items-center gap-1 text-emerald-400"><CheckCircle className="w-3 h-3" />Concluída: {new Date(record.completedDate).toLocaleDateString('pt-BR')}</span>
                                            )}
                                            {record.nextMaintenanceDate && (
                                                <span className="flex items-center gap-1 text-blue-400"><RotateCcw className="w-3 h-3" />Próxima: {new Date(record.nextMaintenanceDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                                            )}
                                            {record.cost !== undefined && record.cost > 0 && (
                                                <span className="flex items-center gap-1 text-yellow-400"><DollarSign className="w-3 h-3" />R$ {record.cost.toFixed(2)}</span>
                                            )}
                                            {record.parts && (
                                                <span className="flex items-center gap-1"><Package className="w-3 h-3" />{record.parts}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        {record.status !== 'completed' && (
                                            <button onClick={() => handleComplete(record.id)} className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors" title="Marcar como concluída">
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button onClick={() => { setEditingRecord(record); setIsModalOpen(true); }} className="p-2 text-slate-400 hover:bg-slate-800 rounded-lg transition-colors" title="Editar">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(record.id)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Remover">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <MaintenanceModal
                    record={editingRecord}
                    equipments={equipments}
                    onClose={() => { setIsModalOpen(false); setEditingRecord(null); }}
                    onSave={() => { loadData(); setIsModalOpen(false); setEditingRecord(null); }}
                />
            )}
        </div>
    );
}

// Mini stat card
function MiniStat({ label, value, color, alert }: { label: string; value: number | string; color: string; alert?: boolean }) {
    const colorMap: Record<string, string> = {
        slate: 'border-slate-700 text-slate-300',
        blue: 'border-blue-500/30 text-blue-400',
        yellow: 'border-yellow-500/30 text-yellow-400',
        emerald: 'border-emerald-500/30 text-emerald-400',
        red: 'border-red-500/30 text-red-400',
        purple: 'border-purple-500/30 text-purple-400',
    };

    return (
        <div className={`bg-slate-900/50 border rounded-xl px-3 py-3 ${colorMap[color]} ${alert ? 'animate-pulse' : ''}`}>
            <p className="text-xl font-black text-white">{value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
        </div>
    );
}

// Maintenance Modal for create/edit
function MaintenanceModal({ record, equipments, onClose, onSave }: {
    record: MaintenanceRecord | null;
    equipments: Equipment[];
    onClose: () => void;
    onSave: () => void;
}) {
    const [formData, setFormData] = useState({
        equipmentId: record?.equipmentId || '',
        type: record?.type || 'corrective' as MaintenanceRecord['type'],
        description: record?.description || '',
        status: record?.status || 'pending' as MaintenanceRecord['status'],
        priority: record?.priority || 'medium' as MaintenanceRecord['priority'],
        cost: record?.cost?.toString() || '',
        parts: record?.parts || '',
        technician: record?.technician || '',
        scheduledDate: record?.scheduledDate || '',
        nextMaintenanceDate: record?.nextMaintenanceDate || '',
        notes: record?.notes || '',
    });
    const [saving, setSaving] = useState(false);
    const { success, error: showError } = useToast();

    const handleSubmit = async () => {
        if (!formData.equipmentId) {
            showError('Selecione um equipamento');
            return;
        }
        if (!formData.description.trim()) {
            showError('Preencha a descrição');
            return;
        }

        setSaving(true);
        try {
            const data: Partial<MaintenanceRecord> = {
                equipmentId: formData.equipmentId,
                type: formData.type as MaintenanceRecord['type'],
                description: formData.description,
                status: formData.status as MaintenanceRecord['status'],
                priority: formData.priority as MaintenanceRecord['priority'],
                cost: formData.cost ? parseFloat(formData.cost) : undefined,
                parts: formData.parts || undefined,
                technician: formData.technician || undefined,
                scheduledDate: formData.scheduledDate || undefined,
                nextMaintenanceDate: formData.nextMaintenanceDate || undefined,
                notes: formData.notes || undefined,
            };

            if (record) {
                await MaintenanceService.update(record.id, data);
                success('Manutenção atualizada!');
            } else {
                await MaintenanceService.create(data);
                success('Manutenção criada!');
            }
            onSave();
        } catch (err) {
            showError('Erro ao salvar manutenção');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-surface border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-slate-700 bg-slate-900/50">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <div className="p-1.5 bg-orange-600 rounded-lg">
                            <Wrench className="w-4 h-4 text-white" />
                        </div>
                        {record ? 'Editar Manutenção' : 'Nova Manutenção'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded-lg">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 p-5 space-y-4">
                    {/* Equipment */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Equipamento *</label>
                        <select
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-orange-500 outline-none transition-all"
                            value={formData.equipmentId}
                            onChange={e => setFormData({ ...formData, equipmentId: e.target.value })}
                        >
                            <option value="">Selecione um equipamento</option>
                            {equipments.map(eq => (
                                <option key={eq.id} value={eq.id}>{eq.name} - {eq.brand} {eq.model}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Type */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Tipo *</label>
                            <select
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-orange-500 outline-none"
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                            >
                                <option value="preventive">Preventiva</option>
                                <option value="corrective">Corretiva</option>
                                <option value="replacement">Reposição</option>
                            </select>
                        </div>
                        {/* Priority */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Prioridade *</label>
                            <select
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-orange-500 outline-none"
                                value={formData.priority}
                                onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
                            >
                                <option value="low">Baixa</option>
                                <option value="medium">Média</option>
                                <option value="high">Alta</option>
                                <option value="critical">Crítica</option>
                            </select>
                        </div>
                        {/* Status */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Status</label>
                            <select
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-orange-500 outline-none"
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                            >
                                <option value="pending">Pendente</option>
                                <option value="in_progress">Em Andamento</option>
                                <option value="completed">Concluída</option>
                            </select>
                        </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Descrição *</label>
                        <textarea
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-orange-500 outline-none resize-none"
                            rows={3}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Descreva o problema ou serviço necessário..."
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Technician */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Técnico</label>
                            <input
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-orange-500 outline-none"
                                value={formData.technician}
                                onChange={e => setFormData({ ...formData, technician: e.target.value })}
                                placeholder="Nome do técnico"
                            />
                        </div>
                        {/* Cost */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Custo (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-orange-500 outline-none"
                                value={formData.cost}
                                onChange={e => setFormData({ ...formData, cost: e.target.value })}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* Parts */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Peças para Reposição</label>
                        <input
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-orange-500 outline-none"
                            value={formData.parts}
                            onChange={e => setFormData({ ...formData, parts: e.target.value })}
                            placeholder="Ex: Lâmpada, Lente, Fonte de alimentação..."
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Scheduled Date */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Data Prevista</label>
                            <input
                                type="date"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-orange-500 outline-none"
                                value={formData.scheduledDate}
                                onChange={e => setFormData({ ...formData, scheduledDate: e.target.value })}
                            />
                        </div>
                        {/* Next Maintenance Date */}
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Próxima Manutenção</label>
                            <input
                                type="date"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-orange-500 outline-none"
                                value={formData.nextMaintenanceDate}
                                onChange={e => setFormData({ ...formData, nextMaintenanceDate: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Observações</label>
                        <textarea
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-orange-500 outline-none resize-none"
                            rows={2}
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Notas adicionais..."
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center p-5 border-t border-slate-700 bg-slate-900/30">
                    <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-sm font-medium transition-colors">
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={saving}
                        className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 text-sm"
                    >
                        {saving ? <RotateCcw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        {record ? 'Atualizar' : 'Criar Manutenção'}
                    </button>
                </div>
            </div>
        </div>
    );
}
