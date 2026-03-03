import React, { useState } from 'react';
import { Calculator, FolderKanban, Activity, Zap } from 'lucide-react';
import { CalculatorView } from './CalculatorView';
import { DistributionView } from './DistributionView';
import { PowerSystemView } from './PowerSystemView';
import { DistributionProject } from '../types';

interface EnergyHubProps {
    initialProject?: DistributionProject | null;
    onClearEdit?: () => void;
}

type EnergyTab = 'calculator' | 'distribution' | 'power-system';

export const EnergyHub: React.FC<EnergyHubProps> = ({ initialProject, onClearEdit }) => {
    const [activeTab, setActiveTab] = useState<EnergyTab>(initialProject ? 'distribution' : 'calculator');

    const tabs = [
        { id: 'calculator' as EnergyTab, label: 'Calculadora', icon: Calculator, desc: 'Calcule consumo de equipamentos' },
        { id: 'distribution' as EnergyTab, label: 'Distribuição', icon: FolderKanban, desc: 'Distribua circuitos entre fases' },
        { id: 'power-system' as EnergyTab, label: 'Elétrica', icon: Activity, desc: 'Mainpower trifásico' },
    ];

    // If initialProject changes, switch to distribution tab
    React.useEffect(() => {
        if (initialProject) {
            setActiveTab('distribution');
        }
    }, [initialProject]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Central de Energia</h1>
                    <p className="text-sm text-slate-400">Calculadora, distribuição e sistema elétrico</p>
                </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-2 bg-surface/50 p-1.5 rounded-xl border border-slate-700/50">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                                ${isActive
                                    ? 'bg-gradient-to-r from-amber-600/20 to-orange-600/20 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-500/10'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}
                            `}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            <div className="animate-fade-in">
                {activeTab === 'calculator' && <CalculatorView />}
                {activeTab === 'distribution' && (
                    <DistributionView
                        initialProject={initialProject}
                        onClearEdit={onClearEdit}
                    />
                )}
                {activeTab === 'power-system' && <PowerSystemView />}
            </div>
        </div>
    );
};
