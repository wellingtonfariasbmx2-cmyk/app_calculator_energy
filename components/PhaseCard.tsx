import React, { useState } from 'react';
import { Zap, AlertTriangle, ShieldCheck, Flame } from 'lucide-react'; // Import icons
import { PhaseConfig, Port } from '../types';

interface PhaseCardProps {
    phase: PhaseConfig;
    loadPercent: number;
    allPorts: Port[]; // Lista completa de circuitos para buscar nomes
    onDragStart?: (e: React.DragEvent, circuitId: string) => void;
    onDrop?: (e: React.DragEvent, phaseId: string) => void;
    onDragOver?: (e: React.DragEvent) => void;
}

export const PhaseCard: React.FC<PhaseCardProps> = ({
    phase,
    loadPercent,
    allPorts,
    onDragStart,
    onDrop,
    onDragOver
}) => {
    const [isOver, setIsOver] = useState(false);

    // Definir cores baseadas na fase
    const getPhaseColor = (id: string) => {
        switch (id) {
            case 'A': return { border: 'border-red-500', bg: 'bg-red-500', text: 'text-red-500', light: 'bg-red-500/10' };
            case 'B': return { border: 'border-blue-500', bg: 'bg-blue-500', text: 'text-blue-500', light: 'bg-blue-500/10' };
            case 'C': return { border: 'border-yellow-500', bg: 'bg-yellow-500', text: 'text-yellow-500', light: 'bg-yellow-500/10' };
            default: return { border: 'border-slate-500', bg: 'bg-slate-500', text: 'text-slate-500', light: 'bg-slate-500/10' };
        }
    };

    const phaseParams = getPhaseColor(phase.phaseId);

    // Status da carga total
    const getLoadStatus = () => {
        if (loadPercent >= 100) return { color: 'text-red-500', icon: Flame, text: 'PERIGO' };
        if (loadPercent >= 80) return { color: 'text-orange-400', icon: AlertTriangle, text: 'ALERTA' };
        return { color: 'text-emerald-400', icon: ShieldCheck, text: 'OK' };
    };

    const status = getLoadStatus();
    const StatusIcon = status.icon;

    const handleDragOver = (e: React.DragEvent) => {
        if (onDragOver) onDragOver(e);
        setIsOver(true);
    };

    const handleDragLeave = () => {
        setIsOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        setIsOver(false);
        if (onDrop) onDrop(e, phase.phaseId);
    };

    // Buscar circuitos desta fase com seus totais
    const circuits = phase.ports.map(portId => {
        const port = allPorts.find(p => p.id === portId);
        if (!port) return null;

        let watts = 0;
        port.items.forEach(i => {
            watts += i.equipment.watts * i.quantity;
        });

        return {
            ...port,
            totalWatts: watts
        };
    }).filter(Boolean) as (Port & { totalWatts: number })[];

    return (
        <div
            className={`flex flex-col h-full bg-slate-900 border-t-4 ${phaseParams.border} rounded-xl shadow-xl overflow-hidden transition-all duration-200 ${isOver ? 'ring-2 ring-indigo-400 scale-[1.02] bg-slate-800' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Header / Medidor */}
            <div className={`p-4 ${phaseParams.light} border-b border-slate-800`}>
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className={`text-2xl font-black ${phaseParams.text}`}>FASE {phase.phaseId}</h3>
                            <div className={`px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 border border-slate-700 ${status.color} flex items-center gap-1`}>
                                <StatusIcon className="w-3 h-3" />
                                {status.text}
                            </div>
                        </div>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                            {phase.currentLoad.toFixed(1)}A <span className="text-slate-600">/</span> {Number(phase.maxAmps).toFixed(1)}A
                        </p>
                    </div>
                    <div className="text-right">
                        <span className={`text-xl font-bold ${loadPercent > 90 ? 'text-red-500' : 'text-slate-200'}`}>
                            {loadPercent.toFixed(0)}%
                        </span>
                    </div>
                </div>

                {/* Main Load Bar */}
                <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700 relative">
                    {/* Background grid pattern for "ruler" look */}
                    <div className="absolute inset-0 w-full h-full opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')]"></div>

                    <div
                        className={`h-full transition-all duration-500 ease-out ${phaseParams.bg}`}
                        style={{ width: `${Math.min(loadPercent, 100)}%` }}
                    />
                    {/* Marker for max */}
                    <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10" style={{ left: '90%' }} title="Limite de Segurança (90%)"></div>
                </div>
            </div>

            {/* Circuitos Visualização Rack */}
            <div className="flex-1 p-2 bg-slate-900 overflow-y-auto min-h-[200px]">
                {circuits.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-2 opacity-50">
                        <Zap className="w-8 h-8" />
                        <span className="text-xs uppercase tracking-widest font-bold">Sem Carga</span>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {circuits.map(circuit => (
                            <div
                                key={circuit.id}
                                draggable={!!onDragStart}
                                onDragStart={(e) => onDragStart && onDragStart(e, circuit.id)}
                                className="group relative bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded p-2 flex items-center gap-3 transition-all hover:border-slate-500 cursor-grab active:cursor-grabbing"
                            >
                                {/* Conector Visual */}
                                <div className={`w-1.5 h-8 rounded-full ${phaseParams.bg} opacity-50 group-hover:opacity-100 transition-opacity shadow-[0_0_10px_rgba(0,0,0,0.5)]`}></div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline">
                                        <h5 className="font-bold text-slate-200 text-sm truncate pr-2">{circuit.name}</h5>
                                        <span className="font-mono text-xs text-slate-500 whitespace-nowrap">
                                            {(circuit.items.reduce((acc, i) => acc + (i.equipment.amperes * i.quantity), 0)).toFixed(1)}A
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span
                                            className="text-[10px] px-1.5 rounded font-bold text-slate-900 truncate max-w-[80px]"
                                            style={{ backgroundColor: circuit.color }}
                                        >
                                            {circuit.abbreviation}
                                        </span>
                                        <span className="text-[10px] text-slate-500 truncate">
                                            {circuit.items.length} itens
                                        </span>
                                    </div>
                                </div>

                                {/* Cabo saindo (visual) */}
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-slate-700 rounded-l-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer info */}
            <div className="p-2 border-t border-slate-800 bg-slate-950/50 flex justify-between items-center px-4">
                <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                    {circuits.length} Circuitos
                </span>
                <span className="text-[10px] text-slate-400 font-mono font-bold">
                    Total: {phase.currentLoad.toFixed(1)}A
                </span>
            </div>
        </div>
    );
};
