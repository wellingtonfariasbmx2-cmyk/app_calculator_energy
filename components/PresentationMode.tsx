import React, { useState, useEffect } from 'react';
import { X, Clock, Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import { MainpowerConfig } from '../types';

interface PresentationModeProps {
    config: MainpowerConfig;
    onClose: () => void;
}

export const PresentationMode: React.FC<PresentationModeProps> = ({ config, onClose }) => {
    const [time, setTime] = useState(new Date());

    // Atualiza o relógio a cada segundo
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Atalho para fechar com ESC
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Helpers de formatação
    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    // Cálculo de totais para exibição
    const totalAmps = config.phases.reduce((acc, phase) => acc + phase.currentLoad, 0);
    const maxAmpsPerPhase = config.phases[0]?.maxAmps || 63; // Assume simetria ou usa 63A default

    // Determina a cor baseada na carga da fase
    const getPhaseColor = (load: number, max: number) => {
        const percentage = (load / max) * 100;
        if (percentage >= 100) return 'text-red-500';
        if (percentage >= 80) return 'text-yellow-400';
        return 'text-emerald-400';
    };

    const getPhaseBarColor = (load: number, max: number) => {
        const percentage = (load / max) * 100;
        if (percentage >= 100) return 'bg-red-500';
        if (percentage >= 80) return 'bg-yellow-400';
        return 'bg-emerald-400';
    };

    const getSystemStatus = () => {
        const overload = config.phases.some(p => p.currentLoad > p.maxAmps);
        const warning = config.phases.some(p => p.currentLoad > p.maxAmps * 0.8);

        if (overload) return { text: 'OVERLOAD', color: 'text-red-500', icon: AlertTriangle };
        if (warning) return { text: 'WARNING', color: 'text-yellow-400', icon: AlertTriangle };
        return { text: 'SYSTEM OK', color: 'text-emerald-400', icon: CheckCircle };
    };

    const status = getSystemStatus();
    const StatusIcon = status.icon;

    return (
        <div className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col p-6 animate-in fade-in duration-300">
            {/* Header: Relógio e Botão Fechar */}
            <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-4">
                    <div className="bg-slate-900 rounded-xl px-6 py-3 border border-slate-800 flex items-center gap-3">
                        <Clock className="w-6 h-6 text-slate-400" />
                        <span className="text-4xl font-mono font-bold tracking-wider text-slate-200">
                            {formatTime(time)}
                        </span>
                    </div>
                    {/* Status Global */}
                    <div className={`flex items-center gap-2 px-6 py-3 rounded-xl border bg-slate-900/50 ${status.color} border-current`}>
                        <StatusIcon className="w-8 h-8" />
                        <span className="text-3xl font-black tracking-wide">{status.text}</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right mr-4">
                        <div className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Sistema</div>
                        <div className="text-2xl font-bold">{config.voltageSystem || 220}V / {config.systemType === 'three-phase' ? '3Ø' : '1Ø'}</div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 bg-slate-800 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-white"
                        title="Sair do Modo Apresentação (ESC)"
                    >
                        <X className="w-8 h-8" />
                    </button>
                </div>
            </div>

            {/* Conteúdo Principal: Fases */}
            <div className="flex-1 grid grid-cols-3 gap-8">
                {config.phases.map((phase) => {
                    const percentage = Math.min((phase.currentLoad / phase.maxAmps) * 100, 100);
                    const textColor = getPhaseColor(phase.currentLoad, phase.maxAmps);
                    const barColor = getPhaseBarColor(phase.currentLoad, phase.maxAmps);

                    return (
                        <div key={phase.phaseId} className="bg-slate-900/50 rounded-2xl p-6 border border-slate-800 flex flex-col items-center relative overflow-hidden group">
                            {/* Background Glow Efeito based on status */}
                            <div className={`absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity ${barColor.replace('bg-', 'bg-')}`} />

                            {/* Identificador da Fase */}
                            <div className="text-slate-500 font-black text-2xl mb-4 uppercase tracking-[0.2em]">
                                Fase {phase.phaseId}
                            </div>

                            {/* Valor Principal (Amperes) */}
                            <div className={`mt-auto mb-4 text-[120px] leading-none font-black tracking-tighter ${textColor} transition-all duration-500 tabular-nums`}>
                                {phase.currentLoad.toFixed(1)}
                            </div>
                            <div className="text-slate-400 text-3xl font-medium mb-12">Ameres</div>

                            {/* Barra de Progresso Vertical */}
                            <div className="w-24 h-64 bg-slate-800 rounded-2xl overflow-hidden relative border border-slate-700/50">
                                <div
                                    className={`absolute bottom-0 w-full transition-all duration-1000 ease-out ${barColor}`}
                                    style={{ height: `${percentage}%` }}
                                >
                                    {/* Efeito de brilho no topo da barra */}
                                    <div className="absolute top-0 w-full h-1 bg-white/50" />
                                </div>
                            </div>

                            {/* Footer da Fase */}
                            <div className="mt-8 flex flex-col items-center gap-2">
                                <div className="text-slate-400 font-mono text-xl">Capacity: {phase.maxAmps}A</div>
                                <div className={`text-2xl font-bold ${percentage > 90 ? 'text-red-500' : 'text-slate-300'}`}>
                                    {Math.round(percentage)}% Load
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Rodapé: Totais Globais */}
            <div className="mt-8 grid grid-cols-2 gap-6">
                <div className="bg-slate-900 rounded-xl p-6 flex justify-between items-center border border-slate-800">
                    <div className="items-center gap-3 flex">
                        <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                            <Zap className="w-8 h-8" />
                        </div>
                        <div>
                            <div className="text-slate-400 font-medium">Carga Total (Amperes)</div>
                            <div className="text-3xl font-bold text-white">{totalAmps.toFixed(1)} A</div>
                        </div>
                    </div>
                </div>
                <div className="bg-slate-900 rounded-xl p-6 flex justify-between items-center border border-slate-800">
                    <div className="items-center gap-3 flex">
                        <div className="p-3 bg-yellow-500/10 rounded-lg text-yellow-400">
                            <Zap className="w-8 h-8" />
                        </div>
                        <div>
                            <div className="text-slate-400 font-medium">Potência Total Estimada</div>
                            <div className="text-3xl font-bold text-white">
                                {((totalAmps * (config.voltageSystem || 220)) / 1000).toFixed(1)} kVA
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
