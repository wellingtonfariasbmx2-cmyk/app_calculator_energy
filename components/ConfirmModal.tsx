import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    onConfirm,
    onCancel,
    variant = 'warning'
}) => {
    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            icon: 'text-red-500',
            bg: 'bg-red-500/10',
            border: 'border-red-500/30',
            button: 'bg-red-600 hover:bg-red-700'
        },
        warning: {
            icon: 'text-orange-500',
            bg: 'bg-orange-500/10',
            border: 'border-orange-500/30',
            button: 'bg-orange-600 hover:bg-orange-700'
        },
        info: {
            icon: 'text-blue-500',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/30',
            button: 'bg-blue-600 hover:bg-blue-700'
        }
    };

    const styles = variantStyles[variant];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-surface border border-slate-700 rounded-xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className={`p-5 border-b ${styles.border} ${styles.bg} rounded-t-xl flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${styles.icon}`}>
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-white text-lg">{title}</h3>
                    </div>
                    <button
                        onClick={onCancel}
                        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <p className="text-slate-300 text-sm leading-relaxed">{message}</p>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-700 flex gap-3 justify-end">
                    <button
                        onClick={onCancel}
                        className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors border border-slate-700"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-5 py-2.5 ${styles.button} text-white rounded-lg font-bold transition-colors shadow-lg active:scale-95`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Hook para usar o modal de confirmação
export const useConfirm = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [config, setConfig] = useState<{
        title: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
        variant?: 'danger' | 'warning' | 'info';
    }>({
        title: '',
        message: ''
    });

    // Store the resolve function of the current promise
    const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

    const confirm = (options: {
        title: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
        variant?: 'danger' | 'warning' | 'info';
    }): Promise<boolean> => {
        return new Promise((resolve) => {
            setResolver(() => resolve);
            setConfig(options);
            setIsOpen(true);
        });
    };

    const handleConfirm = () => {
        setIsOpen(false);
        if (resolver) resolver(true);
    };

    const handleCancel = () => {
        setIsOpen(false);
        if (resolver) resolver(false);
    };

    const ConfirmModalComponent = () => (
        <ConfirmModal
            isOpen={isOpen}
            title={config.title}
            message={config.message}
            confirmText={config.confirmText}
            cancelText={config.cancelText}
            variant={config.variant}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
        />
    );

    return { confirm, ConfirmModalComponent };
};
