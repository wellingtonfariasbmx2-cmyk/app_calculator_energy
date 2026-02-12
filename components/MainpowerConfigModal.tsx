import React, { useState, useEffect } from 'react';
import { Zap, X, Activity, AlertTriangle, ShieldCheck } from 'lucide-react';
import { MainpowerConfig, GeneratorConfig } from '../types';

interface MainpowerConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: MainpowerConfig) => void;
    initialConfig: MainpowerConfig;
    generatorConfig: GeneratorConfig;
    projectPortsCount: number; // Quantidade de circuitos no projeto para validação
}

export const MainpowerConfigModal: React.FC<MainpowerConfigModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialConfig,
    generatorConfig,
    projectPortsCount
}) => {
    const [config, setConfig] = useState<MainpowerConfig>(initialConfig);
    const [portsPerPhase, setPortsPerPhase] = useState<number>(4); // Default 4 por fase

    // Calcular maxAmps por fase baseado no gerador
    const calculateMaxAmpsPerPhase = (systemType: 'single' | 'two-phase' | 'three-phase'): number => {
        if (!generatorConfig.enabled) return 63; // Padrão

        const { powerKVA, voltage } = generatorConfig;
        // P = V * I * sqrt(3) for 3-phase
        // I = (P * 1000) / (V * sqrt(3))

        // Vamos simplificar e usar a formula correta dependendo do sistema

        // const totalPowerWatts = powerKVA * 1000 * 0.8; // Assume FP 0.8

        switch (systemType) {
            case 'single':
                // Monofásico: I = P / V
                return (powerKVA * 1000) / voltage;
            case 'two-phase':
                // Bifásico: I = P / (V * 2) ?? Simplificação
                return ((powerKVA * 1000) / voltage) / 2;
            case 'three-phase':
                // Trifásico: I = (kVA * 1000) / (V * 1.732)
                return (powerKVA * 1000) / (voltage * 1.732);
            default:
                return 63;
        }
    };

    // Atualizar portas totais quando mudar portas por fase ou sistema
    useEffect(() => {
        const numPhases = config.systemType === 'three-phase' ? 3 : config.systemType === 'two-phase' ? 2 : 1;
        setConfig(prev => ({
            ...prev,
            totalPorts: portsPerPhase * numPhases
        }));
    }, [portsPerPhase, config.systemType]);

    // Atualizar fases quando o tipo de sistema mudar
    const handleSystemTypeChange = (systemType: 'single' | 'two-phase' | 'three-phase') => {
        const maxAmps = calculateMaxAmpsPerPhase(systemType);

        let phases = [];
        switch (systemType) {
            case 'single':
                phases = [
                    { phaseId: 'A' as const, color: '#3b82f6', maxAmps, currentLoad: 0, ports: [] }
                ];
                break;
            case 'two-phase':
                phases = [
                    { phaseId: 'A' as const, color: '#ef4444', maxAmps, currentLoad: 0, ports: [] },
                    { phaseId: 'B' as const, color: '#3b82f6', maxAmps, currentLoad: 0, ports: [] }
                ];
                break;
            case 'three-phase':
                phases = [
                    { phaseId: 'A' as const, color: '#ef4444', maxAmps, currentLoad: 0, ports: [] },
                    { phaseId: 'B' as const, color: '#3b82f6', maxAmps, currentLoad: 0, ports: [] },
                    { phaseId: 'C' as const, color: '#eab308', maxAmps, currentLoad: 0, ports: [] }
                ];
                break;
        }

        setConfig(prev => ({
            ...prev,
            systemType,
            phases
        }));
    };

    // Recalcular maxAmps quando o gerador mudar
    useEffect(() => {
        if (generatorConfig.enabled) {
            const maxAmps = calculateMaxAmpsPerPhase(config.systemType);
            setConfig(prev => ({
                ...prev,
                phases: prev.phases.map(phase => ({ ...phase, maxAmps }))
            }));
        }
    }, [generatorConfig.powerKVA, generatorConfig.voltage]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave({
            ...config,
            enabled: true
        });
        onClose();
    };

    const isCapacityInsufficient = config.totalPorts < projectPortsCount;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-lg animate-scale-in overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                            <Activity className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">
                                Configuração do Mainpower
                            </h3>
                            <p className="text-sm text-slate-400">
                                Defina as capacidades do quadro de energia
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-8">
                    {/* Tipo de Sistema */}
                    <div>
                        <label className="block text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">
                            Sistema de Fases
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={() => handleSystemTypeChange('single')}
                                className={`p-4 rounded-xl border-2 transition-all group ${config.systemType === 'single'
                                    ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                                    : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                                    }`}
                            >
                                <div className="text-center">
                                    <Zap className={`w-8 h-8 mx-auto mb-2 transition-colors ${config.systemType === 'single' ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
                                    <p className={`font-bold text-sm ${config.systemType === 'single' ? 'text-white' : 'text-slate-400'}`}>Monofásico</p>
                                    <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">1 Fase (A)</p>
                                </div>
                            </button>

                            <button
                                onClick={() => handleSystemTypeChange('two-phase')}
                                className={`p-4 rounded-xl border-2 transition-all group ${config.systemType === 'two-phase'
                                    ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                                    : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                                    }`}
                            >
                                <div className="text-center">
                                    <div className="flex justify-center gap-1 mb-2">
                                        <Zap className={`w-6 h-6 ${config.systemType === 'two-phase' ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
                                        <Zap className={`w-6 h-6 ${config.systemType === 'two-phase' ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
                                    </div>
                                    <p className={`font-bold text-sm ${config.systemType === 'two-phase' ? 'text-white' : 'text-slate-400'}`}>Bifásico</p>
                                    <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">2 Fases (A+B)</p>
                                </div>
                            </button>

                            <button
                                onClick={() => handleSystemTypeChange('three-phase')}
                                className={`p-4 rounded-xl border-2 transition-all group ${config.systemType === 'three-phase'
                                    ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                                    : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                                    }`}
                            >
                                <div className="text-center">
                                    <div className="flex justify-center gap-0.5 mb-2">
                                        <Zap className={`w-5 h-5 ${config.systemType === 'three-phase' ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
                                        <Zap className={`w-5 h-5 ${config.systemType === 'three-phase' ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
                                        <Zap className={`w-5 h-5 ${config.systemType === 'three-phase' ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-400'}`} />
                                    </div>
                                    <p className={`font-bold text-sm ${config.systemType === 'three-phase' ? 'text-white' : 'text-slate-400'}`}>Trifásico</p>
                                    <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">3 Fases (A+B+C)</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Configuração de Canais/Portas */}
                    <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                <Activity className="w-4 h-4" />
                                Capacidade de Canais
                            </h4>
                            {isCapacityInsufficient && (
                                <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded border border-red-500/20 flex items-center gap-1 animate-pulse">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    Insuficiente
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Canais por Fase</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min={1}
                                        max={24}
                                        value={portsPerPhase}
                                        onChange={(e) => setPortsPerPhase(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white font-mono font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold pointer-events-none">
                                        UN
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Total de Canais</label>
                                <div className="relative">
                                    <div className={`w-full bg-slate-900 border rounded-lg p-3 font-mono font-bold flex justify-between items-center ${isCapacityInsufficient ? 'text-red-400 border-red-500' : 'text-emerald-400 border-slate-600'}`}>
                                        <span>{config.totalPorts}</span>
                                        {isCapacityInsufficient ? <X className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-700">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Demanda do Projeto:</span>
                                <span className={`font-bold ${isCapacityInsufficient ? 'text-red-400' : 'text-slate-200'}`}>
                                    {projectPortsCount} Circuitos Necessários
                                </span>
                            </div>
                            {isCapacityInsufficient && (
                                <p className="text-xs text-red-400 mt-2 bg-red-950/30 p-2 rounded border border-red-900/50">
                                    Atenção: O Mainpower configurado tem menos canais ({config.totalPorts}) do que o projeto exige ({projectPortsCount}). Aumente os canais por fase.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Info sobre carga calculada */}
                    {generatorConfig.enabled && (
                        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4 flex items-center gap-3">
                            <Zap className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                            <div>
                                <p className="text-sm font-bold text-white">
                                    Limite Calculado: {calculateMaxAmpsPerPhase(config.systemType).toFixed(0)}A por fase
                                </p>
                                <p className="text-xs text-indigo-300 mt-0.5">
                                    Baseado no Gerador {generatorConfig.powerKVA}kVA
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-800 bg-slate-800/50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-3 text-slate-400 hover:text-white font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isCapacityInsufficient}
                        className={`flex-1 px-4 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2
                            ${isCapacityInsufficient
                                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25'}`}
                    >
                        {isCapacityInsufficient ? 'Capacidade Insuficiente' : 'Confirmar Configuração'}
                    </button>
                </div>
            </div>
        </div>
    );
};
