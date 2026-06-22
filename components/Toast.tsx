import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    message: string;
    duration?: number;
}

interface ToastContextType {
    showToast: (type: ToastType, message: string, duration?: number) => void;
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const showToast = useCallback((type: ToastType, message: string, duration = 3000) => {
        const id = `toast-${Date.now()}-${Math.random()}`;
        const newToast: Toast = { id, type, message, duration };

        setToasts((prev) => [...prev, newToast]);

        if (duration > 0) {
            setTimeout(() => removeToast(id), duration);
        }
    }, [removeToast]);

    const success = useCallback((message: string, duration?: number) => {
        showToast('success', message, duration);
    }, [showToast]);

    const error = useCallback((message: string, duration?: number) => {
        showToast('error', message, duration);
    }, [showToast]);

    const warning = useCallback((message: string, duration?: number) => {
        showToast('warning', message, duration);
    }, [showToast]);

    const info = useCallback((message: string, duration?: number) => {
        showToast('info', message, duration);
    }, [showToast]);

    return (
        <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
};

interface ToastContainerProps {
    toasts: Toast[];
    onRemove: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemove }) => {
    if (toasts.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-[100] flex flex-col gap-3 pointer-events-none">
            {toasts.map((toast, index) => (
                <ToastItem
                    key={toast.id}
                    toast={toast}
                    onRemove={onRemove}
                    index={index}
                />
            ))}
        </div>
    );
};

interface ToastItemProps {
    toast: Toast;
    onRemove: (id: string) => void;
    index: number;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove, index }) => {
    const config = {
        success: {
            icon: CheckCircle,
            bgColor: 'bg-emerald-500/10',
            borderColor: 'border-emerald-500/50',
            textColor: 'text-emerald-200',
            iconColor: 'text-emerald-400',
        },
        error: {
            icon: XCircle,
            bgColor: 'bg-red-500/10',
            borderColor: 'border-red-500/50',
            textColor: 'text-red-200',
            iconColor: 'text-red-400',
        },
        warning: {
            icon: AlertTriangle,
            bgColor: 'bg-orange-500/10',
            borderColor: 'border-orange-500/50',
            textColor: 'text-orange-200',
            iconColor: 'text-orange-400',
        },
        info: {
            icon: Info,
            bgColor: 'bg-blue-500/10',
            borderColor: 'border-blue-500/50',
            textColor: 'text-blue-200',
            iconColor: 'text-blue-400',
        },
    };

    const { icon: Icon, bgColor, borderColor, textColor, iconColor } = config[toast.type];

    return (
        <div
            className={`
        ${bgColor} ${borderColor} ${textColor}
        border backdrop-blur-md rounded-lg p-4 shadow-lg
        flex items-start gap-3 w-full
        pointer-events-auto
        animate-slide-in-right
      `}
            style={{ animationDelay: `${index * 0.1}s` }}
        >
            <Icon className={`w-5 h-5 ${iconColor} shrink-0 mt-0.5`} />
            <p className="flex-1 text-sm font-medium leading-relaxed">{toast.message}</p>
            <button
                onClick={() => onRemove(toast.id)}
                className="text-slate-400 hover:text-white transition-colors shrink-0"
                aria-label="Fechar"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};
