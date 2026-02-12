import React, { useState } from 'react';
import { Zap, X, Power } from 'lucide-react';
import { GeneratorConfig } from '../types';

interface GeneratorConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: GeneratorConfig) => void;
    initialConfig?: GeneratorConfig;
}

export const GeneratorConfigModal: React.FC<GeneratorConfigModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialConfig
}) => {
    const [config, setConfig] = useState<GeneratorConfig>(initialConfig || {
        enabled: false,
        powerKVA: 50,
        isThreePhase: true,
        voltage: 220
    });

    if (!isOpen) return null;

    const handleSave = () => {
        onSave(config);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 w-full max-w-lg animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-500/20 rounded-lg">
                            <Power className="w-6 h-6 text-yellow-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">
                                Configuração do Gerador
                            </h3>
                            <p className="text-sm text-slate-400 mt-1">
                                Configure a fonte de energia alternativa
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Habilitar Gerador */}
                    <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                        <div>
                            <label className="text-white font-medium">Usar Gerador</label>
                            <p className="text-sm text-slate-400 mt-1">
                                Ativar fonte de energia alternativa
                            </p>
                        </div>
                        <button
                            onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                            className={`relative w-14 h-7 rounded-full transition-colors ${config.enabled ? 'bg-emerald-500' : 'bg-slate-600'
                                }`}
                        >
                            <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${config.enabled ? 'translate-x-7' : ''
                                }`} />
                        </button>
                    </div>

                    {config.enabled && (
                        <>
                            {/* Potência */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Potência (kVA)
                                </label>
                                <input
                                    type="number"
                                    value={config.powerKVA}
                                    onChange={(e) => setConfig({ ...config, powerKVA: Number(e.target.value) })}
                                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                                    min="1"
                                    step="5"
                                />
                                <p className="text-xs text-slate-400 mt-1">
                                    Potência nominal do gerador em kVA
                                </p>
                            </div>

                            {/* Tipo de Sistema */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-3">
                                    Tipo de Sistema
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setConfig({ ...config, isThreePhase: false })}
                                        className={`p-4 rounded-lg border-2 transition-all ${!config.isThreePhase
                                                ? 'border-yellow-500 bg-yellow-500/10'
                                                : 'border-slate-600/50 bg-slate-700/30 hover:border-slate-500'
                                            }`}
                                    >
                                        <div className="text-center">
                                            <Zap className={`w-6 h-6 mx-auto mb-2 ${!config.isThreePhase ? 'text-yellow-400' : 'text-slate-400'
                                                }`} />
                                            <p className={`font-medium ${!config.isThreePhase ? 'text-white' : 'text-slate-300'
                                                }`}>Monofásico</p>
                                            <p className="text-xs text-slate-400 mt-1">1 fase</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setConfig({ ...config, isThreePhase: true })}
                                        className={`p-4 rounded-lg border-2 transition-all ${config.isThreePhase
                                                ? 'border-yellow-500 bg-yellow-500/10'
                                                : 'border-slate-600/50 bg-slate-700/30 hover:border-slate-500'
                                            }`}
                                    >
                                        <div className="text-center">
                                            <div className="flex justify-center gap-0.5 mb-2">
                                                <Zap className={`w-4 h-4 ${config.isThreePhase ? 'text-yellow-400' : 'text-slate-400'
                                                    }`} />
                                                <Zap className={`w-4 h-4 ${config.isThreePhase ? 'text-yellow-400' : 'text-slate-400'
                                                    }`} />
                                                <Zap className={`w-4 h-4 ${config.isThreePhase ? 'text-yellow-400' : 'text-slate-400'
                                                    }`} />
                                            </div>
                                            <p className={`font-medium ${config.isThreePhase ? 'text-white' : 'text-slate-300'
                                                }`}>Trifásico</p>
                                            <p className="text-xs text-slate-400 mt-1">3 fases</p>
                                        </div>
                                    </button>
                                </div>
                            </div>

                            {/* Tensão */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Tensão (V)
                                </label>
                                <select
                                    value={config.voltage}
                                    onChange={(e) => setConfig({ ...config, voltage: Number(e.target.value) })}
                                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                                >
                                    <option value={110}>110V</option>
                                    <option value={220}>220V</option>
                                    <option value={380}>380V</option>
                                </select>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-700/50 bg-slate-800/50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white rounded-lg transition-all font-medium shadow-lg shadow-yellow-500/25"
                    >
                        Salvar Configuração
                    </button>
                </div>
            </div>
        </div>
    );
};
