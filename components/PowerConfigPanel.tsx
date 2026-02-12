import React, { useState } from 'react';
import { Power, Zap, Settings, TrendingUp, Activity } from 'lucide-react';
import { GeneratorConfig, MainpowerConfig, Port } from '../types';
import { GeneratorConfigModal } from './GeneratorConfigModal';
import { MainpowerConfigModal } from './MainpowerConfigModal';
import { PhaseCard } from './PhaseCard';

interface PowerConfigPanelProps {
    generatorConfig: GeneratorConfig;
    mainpowerConfig: MainpowerConfig;
    onGeneratorChange: (config: GeneratorConfig) => void;
    onMainpowerChange: (config: MainpowerConfig) => void;
    allPorts: Port[];
}

export const PowerConfigPanel: React.FC<PowerConfigPanelProps> = ({
    generatorConfig,
    mainpowerConfig,
    onGeneratorChange,
    onMainpowerChange,
    allPorts
}) => {
    const [showGeneratorModal, setShowGeneratorModal] = useState(false);
    const [showMainpowerModal, setShowMainpowerModal] = useState(false);

    const totalLoad = mainpowerConfig.phases.reduce((sum, phase) => sum + phase.currentLoad, 0);
    const avgLoadPercent = mainpowerConfig.phases.length > 0
        ? (mainpowerConfig.phases.reduce((sum, phase) => sum + (phase.currentLoad / phase.maxAmps) * 100, 0) / mainpowerConfig.phases.length)
        : 0;

    const getBalanceStatus = () => {
        const loads = mainpowerConfig.phases.map(p => (p.currentLoad / p.maxAmps) * 100);
        const max = Math.max(...loads);
        const min = Math.min(...loads);
        const diff = max - min;

        if (diff <= 10) return { text: 'Excelente', color: 'text-emerald-400', icon: 'bg-emerald-500' };
        if (diff <= 25) return { text: 'Bom', color: 'text-blue-400', icon: 'bg-blue-500' };
        if (diff <= 40) return { text: 'Regular', color: 'text-yellow-400', icon: 'bg-yellow-500' };
        return { text: 'Desbalanceado', color: 'text-red-400', icon: 'bg-red-500' };
    };

    const balanceStatus = getBalanceStatus();

    const getSystemTypeLabel = () => {
        switch (mainpowerConfig.systemType) {
            case 'single': return 'Monofásico';
            case 'two-phase': return 'Bifásico';
            case 'three-phase': return 'Trifásico';
            default: return 'Trifásico';
        }
    };

    return (
        <div className="space-y-4">
            {/* Generator Modal */}
            <GeneratorConfigModal
                isOpen={showGeneratorModal}
                onClose={() => setShowGeneratorModal(false)}
                onSave={onGeneratorChange}
                initialConfig={generatorConfig}
            />

            {/* Mainpower Modal */}
            <MainpowerConfigModal
                isOpen={showMainpowerModal}
                onClose={() => setShowMainpowerModal(false)}
                onSave={onMainpowerChange}
                initialConfig={mainpowerConfig}
                generatorConfig={generatorConfig}
            />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Activity className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Configuração de Energia</h3>
                        <p className="text-sm text-slate-400">Gerador e Mainpower</p>
                    </div>
                </div>
            </div>

            {/* Generator Status */}
            <div className="bg-slate-700/30 rounded-xl border border-slate-600/30 p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <Power className={`w-5 h-5 ${generatorConfig.enabled ? 'text-yellow-400' : 'text-slate-500'}`} />
                        <div>
                            <h4 className="font-semibold text-white">Gerador</h4>
                            <p className="text-xs text-slate-400">
                                {generatorConfig.enabled
                                    ? `${generatorConfig.powerKVA} kVA • ${generatorConfig.isThreePhase ? 'Trifásico' : 'Monofásico'} • ${generatorConfig.voltage}V`
                                    : 'Desativado'
                                }
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowGeneratorModal(true)}
                        className="px-3 py-1.5 bg-slate-600/50 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
                    >
                        <Settings className="w-4 h-4" />
                        Configurar
                    </button>
                </div>
            </div>

            {/* Mainpower Status */}
            <div className="bg-slate-700/30 rounded-xl border border-slate-600/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        <Zap className="w-5 h-5 text-blue-400" />
                        <div>
                            <h4 className="font-semibold text-white">Mainpower {getSystemTypeLabel()}</h4>
                            <p className="text-xs text-slate-400">{mainpowerConfig.totalPorts} portas • {mainpowerConfig.phases.length} fase{mainpowerConfig.phases.length > 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setShowMainpowerModal(true)}
                            className="px-3 py-1.5 bg-slate-600/50 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors text-xs sm:text-sm font-medium flex items-center gap-2"
                        >
                            <Settings className="w-4 h-4" />
                            Configurar
                        </button>
                        <button
                            onClick={() => onMainpowerChange({ ...mainpowerConfig, autoBalance: !mainpowerConfig.autoBalance })}
                            className={`px-3 py-1.5 rounded-lg transition-all text-sm font-medium flex items-center gap-2 ${mainpowerConfig.autoBalance
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                                : 'bg-slate-600/50 text-slate-300 hover:bg-slate-600'
                                }`}
                        >
                            <TrendingUp className="w-4 h-4" />
                            {mainpowerConfig.autoBalance ? 'Auto ON' : 'Auto OFF'}
                        </button>
                    </div>
                </div>

                {/* Balance Status */}
                <div className="bg-slate-800/50 rounded-lg p-3 mb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${balanceStatus.icon}`} />
                            <span className="text-sm text-slate-300">Status de Balanceamento:</span>
                        </div>
                        <span className={`text-sm font-semibold ${balanceStatus.color}`}>
                            {balanceStatus.text}
                        </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-400">
                        Carga média: {avgLoadPercent.toFixed(1)}% • Total: {totalLoad.toFixed(1)}A
                    </div>
                </div>

                {/* Phase Cards */}
                <div className={`grid gap-3 ${mainpowerConfig.phases.length === 1 ? 'grid-cols-1' :
                    mainpowerConfig.phases.length === 2 ? 'grid-cols-2' :
                        'grid-cols-3'
                    }`}>
                    {mainpowerConfig.phases.map((phase) => {
                        const loadPercent = (phase.currentLoad / phase.maxAmps) * 100;
                        return (
                            <PhaseCard
                                key={phase.phaseId}
                                phase={phase}
                                loadPercent={loadPercent}
                                allPorts={allPorts}
                            />
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
