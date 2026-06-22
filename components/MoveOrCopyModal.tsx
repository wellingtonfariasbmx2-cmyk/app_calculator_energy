import React from 'react';
import { Copy, Move, X } from 'lucide-react';

interface MoveOrCopyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onMove: () => void;
    onCopy: () => void;
    itemName: string;
    sourceCircuit: string;
    targetCircuit: string;
}

export const MoveOrCopyModal: React.FC<MoveOrCopyModalProps> = ({
    isOpen,
    onClose,
    onMove,
    onCopy,
    itemName,
    sourceCircuit,
    targetCircuit
}) => {
    if (!isOpen) return null;

    const handleAction = (action: 'move' | 'copy') => {
        if (action === 'move') {
            onMove();
        } else {
            onCopy();
        }
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
            <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 w-full max-w-md animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
                    <div>
                        <h3 className="text-xl font-bold text-white">
                            Mover ou Copiar?
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">
                            Escolha a ação para o equipamento
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Item Info */}
                    <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/30">
                        <p className="text-sm text-slate-400 mb-1">Equipamento:</p>
                        <p className="text-white font-medium">{itemName}</p>

                        <div className="mt-3 flex items-center gap-2 text-sm">
                            <span className="text-slate-400">De:</span>
                            <span className="text-blue-400 font-medium">{sourceCircuit}</span>
                            <span className="text-slate-500">→</span>
                            <span className="text-slate-400">Para:</span>
                            <span className="text-emerald-400 font-medium">{targetCircuit}</span>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                        {/* Move Button */}
                        <button
                            onClick={() => handleAction('move')}
                            className="group relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl p-4 transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25"
                        >
                            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
                            <div className="relative flex flex-col items-center gap-2">
                                <Move className="w-6 h-6" />
                                <span className="font-semibold">Mover</span>
                                <span className="text-xs text-blue-100 opacity-90">
                                    Remove da origem
                                </span>
                            </div>
                        </button>

                        {/* Copy Button */}
                        <button
                            onClick={() => handleAction('copy')}
                            className="group relative overflow-hidden bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white rounded-xl p-4 transition-all duration-200 hover:scale-105 hover:shadow-lg hover:shadow-emerald-500/25"
                        >
                            <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
                            <div className="relative flex flex-col items-center gap-2">
                                <Copy className="w-6 h-6" />
                                <span className="font-semibold">Copiar</span>
                                <span className="text-xs text-emerald-100 opacity-90">
                                    Mantém na origem
                                </span>
                            </div>
                        </button>
                    </div>

                    {/* Info Note */}
                    <div className="bg-slate-700/20 border border-slate-600/30 rounded-lg p-3">
                        <p className="text-xs text-slate-400 leading-relaxed">
                            <span className="font-semibold text-blue-400">Mover:</span> Remove o equipamento do circuito de origem e adiciona ao destino.
                            <br />
                            <span className="font-semibold text-emerald-400">Copiar:</span> Mantém o equipamento na origem e adiciona uma cópia ao destino.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-700/50 bg-slate-800/50">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2.5 bg-slate-700/50 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors font-medium"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};
