import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, CheckCircle, TrendingDown, Search, X } from 'lucide-react';
import { Equipment } from '../types';
import { DataService } from '../services/supabaseClient';
import { EventService } from '../services/EventService';

interface EquipmentWithAvailability extends Equipment {
    quantityAvailable: number;
    quantityAllocated: number;
    utilizationPercent: number;
}

export const EquipmentAvailabilityPanel: React.FC = () => {
    const [equipments, setEquipments] = useState<EquipmentWithAvailability[]>([]);
    // Iniciar com loading=false para mostrar "0" em vez de números vermelhos
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'low' | 'unavailable'>('all');

    useEffect(() => {
        loadAvailability();
        // Atualizar a cada 30 segundos
        const interval = setInterval(loadAvailability, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadAvailability = async () => {
        try {
            setLoading(true);

            // Buscar equipamentos e disponibilidades em paralelo
            const [allEquipments, availabilityMap] = await Promise.all([
                DataService.getEquipments(),
                EventService.checkAllAvailability()
            ]);

            // Mapear dados com disponibilidade
            const withAvailability = allEquipments.map((eq) => {
                const available = availabilityMap.get(eq.id) || 0;
                const allocated = eq.quantityOwned - available;
                const utilizationPercent = eq.quantityOwned > 0
                    ? Math.round((allocated / eq.quantityOwned) * 100)
                    : 0;

                return {
                    ...eq,
                    quantityAvailable: available,
                    quantityAllocated: allocated,
                    utilizationPercent,
                };
            });

            setEquipments(withAvailability);
        } catch (err) {
            console.error('Error loading availability:', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (eq: EquipmentWithAvailability) => {
        if (eq.quantityAvailable === 0) return 'text-red-400';
        if (eq.quantityAvailable <= eq.quantityOwned * 0.3) return 'text-yellow-400';
        return 'text-green-400';
    };

    const getStatusIcon = (eq: EquipmentWithAvailability) => {
        if (eq.quantityAvailable === 0) return <AlertTriangle className="w-4 h-4 text-red-400" />;
        if (eq.quantityAvailable <= eq.quantityOwned * 0.3) return <TrendingDown className="w-4 h-4 text-yellow-400" />;
        return <CheckCircle className="w-4 h-4 text-green-400" />;
    };

    const filteredEquipments = equipments.filter(eq => {
        // Filtro de busca
        const matchesSearch =
            eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            eq.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
            eq.model.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        // Filtro de status
        if (filterStatus === 'available' && eq.quantityAvailable === 0) return false;
        if (filterStatus === 'low' && (eq.quantityAvailable === 0 || eq.quantityAvailable > eq.quantityOwned * 0.3)) return false;
        if (filterStatus === 'unavailable' && eq.quantityAvailable > 0) return false;

        return true;
    });

    const stats = {
        total: equipments.length,
        available: equipments.filter(eq => eq.quantityAvailable > 0).length,
        low: equipments.filter(eq => eq.quantityAvailable > 0 && eq.quantityAvailable <= eq.quantityOwned * 0.3).length,
        unavailable: equipments.filter(eq => eq.quantityAvailable === 0).length,
    };

    return (
        <div className="animate-fade-in">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl shadow-lg shadow-emerald-900/20">
                        <Package className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Disponibilidade</h1>
                        <p className="text-slate-400 text-xs sm:text-sm font-medium">Estoque em tempo real</p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <div className="bg-surface border border-slate-700 rounded-xl p-4">
                        <p className="text-xs text-slate-500 uppercase font-bold mb-1">Total</p>
                        <p className="text-2xl font-bold text-white">{stats.total}</p>
                    </div>
                    <div className="bg-surface border border-green-500/20 rounded-xl p-4">
                        <p className="text-xs text-green-400 uppercase font-bold mb-1">Disponíveis</p>
                        <p className="text-2xl font-bold text-green-400">{stats.available}</p>
                    </div>
                    <div className="bg-surface border border-yellow-500/20 rounded-xl p-4">
                        <p className="text-xs text-yellow-400 uppercase font-bold mb-1">Baixo Estoque</p>
                        <p className="text-2xl font-bold text-yellow-400">{stats.low}</p>
                    </div>
                    <div className="bg-surface border border-red-500/20 rounded-xl p-4">
                        <p className="text-xs text-red-400 uppercase font-bold mb-1">Indisponíveis</p>
                        <p className="text-2xl font-bold text-red-400">{stats.unavailable}</p>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar equipamento..."
                            className="w-full bg-surface border border-slate-700 rounded-lg pl-10 pr-10 py-2.5 text-white text-sm focus:border-emerald-500 outline-none transition-all"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {[
                            { key: 'all', label: 'Todos' },
                            { key: 'available', label: 'Disponíveis' },
                            { key: 'low', label: 'Baixo' },
                            { key: 'unavailable', label: 'Indisponíveis' },
                        ].map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setFilterStatus(key as any)}
                                className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${filterStatus === key
                                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                                    : 'bg-surface text-slate-400 hover:bg-slate-800 border border-slate-700'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Equipment List */}
            <div className="space-y-3">
                {loading ? (
                    <div className="text-center py-12 text-slate-500">
                        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-3"></div>
                        <p>Carregando disponibilidade...</p>
                    </div>
                ) : filteredEquipments.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 bg-surface/30 rounded-xl border border-dashed border-slate-800">
                        <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="font-medium">Nenhum equipamento encontrado</p>
                    </div>
                ) : (
                    filteredEquipments.map((eq, index) => (
                        <div
                            key={eq.id}
                            className="bg-surface border border-slate-700/50 rounded-xl p-4 hover:border-emerald-500/30 transition-all animate-slide-in-up"
                            style={{ animationDelay: `${index * 0.03}s` }}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3 flex-1">
                                    {getStatusIcon(eq)}
                                    <div>
                                        <h3 className="text-white font-bold">{eq.name}</h3>
                                        <p className="text-xs text-slate-400">{eq.brand} - {eq.model}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`text-lg font-bold ${getStatusColor(eq)}`}>
                                        {eq.quantityAvailable}/{eq.quantityOwned}
                                    </p>
                                    <p className="text-xs text-slate-500">disponível</p>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mb-2">
                                <div className="flex justify-between text-xs text-slate-500 mb-1">
                                    <span>Utilização</span>
                                    <span>{eq.utilizationPercent}%</span>
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${eq.utilizationPercent >= 100
                                            ? 'bg-red-500'
                                            : eq.utilizationPercent >= 70
                                                ? 'bg-yellow-500'
                                                : 'bg-emerald-500'
                                            }`}
                                        style={{ width: `${Math.min(eq.utilizationPercent, 100)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Details */}
                            <div className="grid grid-cols-3 gap-2 text-xs">
                                <div className="bg-slate-900/50 rounded px-2 py-1">
                                    <span className="text-slate-500">Total:</span>
                                    <span className="text-white font-bold ml-1">{eq.quantityOwned}</span>
                                </div>
                                <div className="bg-slate-900/50 rounded px-2 py-1">
                                    <span className="text-slate-500">Alocado:</span>
                                    <span className="text-white font-bold ml-1">{eq.quantityAllocated}</span>
                                </div>
                                <div className="bg-slate-900/50 rounded px-2 py-1">
                                    <span className="text-slate-500">Livre:</span>
                                    <span className={`font-bold ml-1 ${getStatusColor(eq)}`}>{eq.quantityAvailable}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Refresh Button */}
            <button
                onClick={loadAvailability}
                disabled={loading}
                className="fixed bottom-24 right-6 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-full shadow-2xl shadow-emerald-500/30 active:scale-95 transition-all z-50 flex items-center gap-2 font-bold text-sm disabled:opacity-50"
            >
                <Package className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
            </button>
        </div>
    );
};
