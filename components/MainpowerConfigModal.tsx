import React, { useState, useEffect } from 'react';
import { Zap, X, Activity, AlertTriangle, ShieldCheck, Gauge, SplitSquareVertical, Cable, ChevronRight, Equal } from 'lucide-react';
import { MainpowerConfig, GeneratorConfig, PhaseConfig } from '../types';

interface MainpowerConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: MainpowerConfig) => void;
    initialConfig: MainpowerConfig;
    generatorConfig: GeneratorConfig;
    projectPortsCount: number;
}

const BREAKER_PRESETS = [32, 40, 50, 63, 80, 100, 125, 150, 200];
const PHASE_COLORS: Record<string, string> = {
    A: '#ef4444',
    B: '#3b82f6',
    C: '#eab308',
};
const PHASE_LABELS: Record<string, string> = {
    A: 'Fase A (Vermelho)',
    B: 'Fase B (Azul)',
    C: 'Fase C (Amarelo)',
};

export const MainpowerConfigModal: React.FC<MainpowerConfigModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialConfig,
    generatorConfig,
    projectPortsCount
}) => {
    const [config, setConfig] = useState<MainpowerConfig>(initialConfig);

    // Reinicializar estado quando o modal abrir
    useEffect(() => {
        if (isOpen) {
            // Garantir que os novos campos existam (migração de dados antigos)
            const migrated: MainpowerConfig = {
                ...initialConfig,
                mainBreakerAmps: initialConfig.mainBreakerAmps || 63,

                phases: initialConfig.phases.map((phase, idx) => ({
                    ...phase,
                    portsCount: phase.portsCount || Math.ceil(initialConfig.totalPorts / initialConfig.phases.length),
                    breakerAmps: phase.breakerAmps || phase.maxAmps || 63,
                })),
            };
            setConfig(migrated);
        }
    }, [isOpen, initialConfig]);

    // Recalcular totalPorts quando portsCount das fases mudar
    useEffect(() => {
        const total = config.phases.reduce((sum, p) => sum + (p.portsCount || 0), 0);
        if (total !== config.totalPorts) {
            setConfig(prev => ({ ...prev, totalPorts: total }));
        }
    }, [config.phases]);

    // Atualizar fases quando o tipo de sistema mudar
    const handleSystemTypeChange = (systemType: 'single' | 'two-phase' | 'three-phase') => {
        const breakerPerPhase = config.mainBreakerAmps || 63;

        const makePhase = (id: 'A' | 'B' | 'C', portsCount: number): PhaseConfig => ({
            phaseId: id,
            color: PHASE_COLORS[id],
            maxAmps: breakerPerPhase,
            breakerAmps: breakerPerPhase,
            currentLoad: 0,
            ports: [],
            portsCount,
        });

        let phases: PhaseConfig[];
        const totalPorts = config.totalPorts || 12;

        switch (systemType) {
            case 'single':
                phases = [makePhase('A', totalPorts)];
                break;
            case 'two-phase': {
                const perPhase = Math.ceil(totalPorts / 2);
                phases = [makePhase('A', perPhase), makePhase('B', totalPorts - perPhase)];
                break;
            }
            case 'three-phase':
            default: {
                const perPhase = Math.floor(totalPorts / 3);
                const remainder = totalPorts % 3;
                phases = [
                    makePhase('A', perPhase + (remainder > 0 ? 1 : 0)),
                    makePhase('B', perPhase + (remainder > 1 ? 1 : 0)),
                    makePhase('C', perPhase),
                ];
                break;
            }
        }

        setConfig(prev => ({
            ...prev,
            systemType,
            phases,
            totalPorts: phases.reduce((s, p) => s + p.portsCount, 0),
        }));
    };

    // Mudar a quantidade de portas de uma fase específica
    const handlePhasePortsChange = (phaseIdx: number, value: string) => {
        const num = parseInt(value) || 0;
        setConfig(prev => {
            const newPhases = [...prev.phases];
            newPhases[phaseIdx] = {
                ...newPhases[phaseIdx],
                portsCount: Math.max(0, Math.min(48, num)),
            };
            return { ...prev, phases: newPhases };
        });
    };

    // Mudar o disjuntor de uma fase específica
    const handlePhaseBreakerChange = (phaseIdx: number, value: string) => {
        const num = parseInt(value) || 0;
        setConfig(prev => {
            const newPhases = [...prev.phases];
            newPhases[phaseIdx] = {
                ...newPhases[phaseIdx],
                breakerAmps: Math.max(0, num),
                maxAmps: Math.max(0, num),
            };
            return { ...prev, phases: newPhases };
        });
    };

    // Dividir portas igualmente entre fases
    const handleEqualDistribution = () => {
        const numPhases = config.phases.length;
        if (numPhases === 0) return;

        const totalPorts = config.totalPorts || 12;
        const perPhase = Math.floor(totalPorts / numPhases);
        const remainder = totalPorts % numPhases;

        setConfig(prev => ({
            ...prev,
            phases: prev.phases.map((phase, idx) => ({
                ...phase,
                portsCount: perPhase + (idx < remainder ? 1 : 0),
            })),
        }));
    };

    // Aplicar o mesmo disjuntor para todas as fases
    const handleEqualBreakers = () => {
        const breakerValue = config.mainBreakerAmps || 63;
        setConfig(prev => ({
            ...prev,
            phases: prev.phases.map(phase => ({
                ...phase,
                breakerAmps: breakerValue,
                maxAmps: breakerValue,
            })),
        }));
    };

    if (!isOpen) return null;

    const handleSave = () => {
        // Atualizar totalPorts e maxAmps antes de salvar
        const finalConfig: MainpowerConfig = {
            ...config,
            enabled: true,
            totalPorts: config.phases.reduce((s, p) => s + p.portsCount, 0),
            phases: config.phases.map(p => ({
                ...p,
                maxAmps: p.breakerAmps || p.maxAmps,
            })),
        };
        onSave(finalConfig);
        onClose();
    };

    const computedTotalPorts = config.phases.reduce((s, p) => s + p.portsCount, 0);
    const isCapacityInsufficient = computedTotalPorts < projectPortsCount;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 w-full max-w-2xl animate-scale-in overflow-hidden max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-800/50 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
                            <Activity className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">
                                Configuração do Mainpower
                            </h3>
                            <p className="text-sm text-slate-400">
                                Defina as especificações do seu quadro de energia
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

                {/* Scrollable Content */}
                <div className="p-5 space-y-6 overflow-y-auto flex-1">

                    {/* ====== SEÇÃO 1: DISJUNTOR GERAL ====== */}
                    <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                        <div className="flex items-center gap-2 mb-4">
                            <Gauge className="w-5 h-5 text-amber-400" />
                            <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                                Disjuntor Geral
                            </h4>
                            <span className="text-[10px] text-slate-500 bg-slate-700 px-2 py-0.5 rounded-full ml-auto">
                                Parte traseira do Mainpower
                            </span>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-3">
                            {BREAKER_PRESETS.map(amp => (
                                <button
                                    key={amp}
                                    onClick={() => setConfig(prev => ({ ...prev, mainBreakerAmps: amp }))}
                                    className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                                        config.mainBreakerAmps === amp
                                            ? 'bg-amber-500/20 text-amber-400 border-2 border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.15)]'
                                            : 'bg-slate-900 text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-slate-300'
                                    }`}
                                >
                                    {amp}A
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-3">
                            <label className="text-xs text-slate-400 font-medium whitespace-nowrap">Personalizado:</label>
                            <div className="relative flex-1 max-w-[150px]">
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    min={1}
                                    max={600}
                                    value={config.mainBreakerAmps || ''}
                                    onChange={(e) => setConfig(prev => ({ ...prev, mainBreakerAmps: parseInt(e.target.value) || 0 }))}
                                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-white font-mono font-bold focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none text-center"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold pointer-events-none">
                                    A
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ====== SEÇÃO 2: TIPO DE SISTEMA ====== */}
                    <div>
                        <label className="block text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider flex items-center gap-2">
                            <SplitSquareVertical className="w-4 h-4 text-indigo-400" />
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


                    {/* ====== SEÇÃO 3: CONFIGURAÇÃO POR FASE ====== */}
                    <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Cable className="w-5 h-5 text-indigo-400" />
                                <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                                    Configuração por Fase
                                </h4>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleEqualDistribution}
                                    className="px-2.5 py-1.5 bg-slate-700 hover:bg-indigo-500/20 text-slate-400 hover:text-indigo-400 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 border border-slate-600 hover:border-indigo-500/30"
                                    title="Distribuir portas igualmente entre as fases"
                                >
                                    <Equal className="w-3.5 h-3.5" />
                                    Dividir Portas
                                </button>
                                <button
                                    onClick={handleEqualBreakers}
                                    className="px-2.5 py-1.5 bg-slate-700 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 border border-slate-600 hover:border-amber-500/30"
                                    title="Aplicar o disjuntor geral para todas as fases"
                                >
                                    <Gauge className="w-3.5 h-3.5" />
                                    Igualar Disj.
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {config.phases.map((phase, idx) => (
                                <div
                                    key={phase.phaseId}
                                    className="bg-slate-900/80 rounded-xl p-4 border border-slate-700/50 hover:border-slate-600 transition-colors"
                                >
                                    <div className="flex items-center gap-3 mb-3">
                                        <div
                                            className="w-3 h-3 rounded-full shadow-lg"
                                            style={{
                                                backgroundColor: phase.color,
                                                boxShadow: `0 0 8px ${phase.color}60`
                                            }}
                                        />
                                        <span className="text-sm font-bold text-white">
                                            {PHASE_LABELS[phase.phaseId] || `Fase ${phase.phaseId}`}
                                        </span>
                                        <ChevronRight className="w-4 h-4 text-slate-600" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Portas nesta fase */}
                                        <div>
                                            <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">
                                                Portas / Canais
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    inputMode="numeric"
                                                    min={0}
                                                    max={48}
                                                    value={phase.portsCount || ''}
                                                    onChange={(e) => handlePhasePortsChange(idx, e.target.value)}
                                                    onFocus={(e) => e.target.select()}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white font-mono font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-center"
                                                />
                                                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-bold pointer-events-none">
                                                    UN
                                                </div>
                                            </div>
                                        </div>

                                        {/* Disjuntor desta fase */}
                                        <div>
                                            <label className="block text-[11px] text-slate-400 mb-1.5 font-medium">
                                                Disjuntor da Fase
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    inputMode="numeric"
                                                    min={1}
                                                    max={600}
                                                    value={phase.breakerAmps || ''}
                                                    onChange={(e) => handlePhaseBreakerChange(idx, e.target.value)}
                                                    onFocus={(e) => e.target.select()}
                                                    className="w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-white font-mono font-bold focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none text-center"
                                                />
                                                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-bold pointer-events-none">
                                                    A
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ====== SEÇÃO 4: RESUMO ====== */}
                    <div className="bg-gradient-to-br from-slate-800 to-slate-800/50 rounded-xl p-5 border border-slate-700">
                        <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-400" />
                            Resumo do Mainpower
                        </h4>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                            <div className="bg-slate-900 rounded-lg p-3 text-center border border-slate-700">
                                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Disj. Geral</p>
                                <p className="text-lg font-black text-amber-400 font-mono">{config.mainBreakerAmps || 0}A</p>
                            </div>
                            <div className="bg-slate-900 rounded-lg p-3 text-center border border-slate-700">
                                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Fases</p>
                                <p className="text-lg font-black text-indigo-400 font-mono">{config.phases.length}</p>
                            </div>
                            <div className="bg-slate-900 rounded-lg p-3 text-center border border-slate-700">
                                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Total Portas</p>
                                <p className={`text-lg font-black font-mono ${isCapacityInsufficient ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {computedTotalPorts}
                                </p>
                            </div>
                            <div className="bg-slate-900 rounded-lg p-3 text-center border border-slate-700">
                                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Demanda</p>
                                <p className={`text-lg font-black font-mono ${isCapacityInsufficient ? 'text-red-400' : 'text-slate-300'}`}>
                                    {projectPortsCount}
                                </p>
                            </div>
                        </div>

                        {/* Visualização das fases */}
                        <div className="flex gap-1 h-8 rounded-lg overflow-hidden border border-slate-700">
                            {config.phases.map(phase => {
                                const widthPercent = computedTotalPorts > 0 ? (phase.portsCount / computedTotalPorts) * 100 : 0;
                                return (
                                    <div
                                        key={phase.phaseId}
                                        className="flex items-center justify-center text-[10px] font-bold text-white/90 transition-all duration-300"
                                        style={{
                                            width: `${widthPercent}%`,
                                            backgroundColor: phase.color + '40',
                                            borderLeft: `3px solid ${phase.color}`,
                                        }}
                                    >
                                        {phase.phaseId}: {phase.portsCount}p / {phase.breakerAmps}A
                                    </div>
                                );
                            })}
                        </div>

                        {isCapacityInsufficient && (
                            <div className="mt-3 bg-red-950/40 border border-red-900/50 rounded-lg p-3 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                <p className="text-xs text-red-400">
                                    O Mainpower tem <strong>{computedTotalPorts}</strong> portas mas o projeto exige <strong>{projectPortsCount}</strong> circuitos. Aumente as portas por fase.
                                </p>
                            </div>
                        )}

                        {/* Info sobre carga calculada pelo gerador */}
                        {generatorConfig.enabled && (
                            <div className="mt-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-3 flex items-center gap-3">
                                <Zap className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                                <div>
                                    <p className="text-xs font-bold text-white">
                                        Gerador: {generatorConfig.powerKVA}kVA • {generatorConfig.voltage}V
                                    </p>
                                    <p className="text-[10px] text-indigo-300 mt-0.5">
                                        O gerador alimenta o disjuntor geral do Mainpower
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-800 bg-slate-800/50 flex gap-3 flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-3 text-slate-400 hover:text-white font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 px-4 py-3 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25"
                    >
                        Confirmar Configuração
                    </button>
                </div>
            </div>
        </div>
    );
};
