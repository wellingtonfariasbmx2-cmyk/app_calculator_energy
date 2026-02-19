import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorScreenProps {
    message: string;
    onRetry?: () => void;
}

export function ErrorScreen({ message, onRetry }: ErrorScreenProps) {
    return (
        <div className="flex flex-col h-full w-full items-center justify-center min-h-[400px] gap-4 text-center p-4">
            <div className="bg-red-500/10 p-4 rounded-full">
                <AlertTriangle className="w-12 h-12 text-red-500" />
            </div>
            <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">Erro ao carregar dados</h3>
                <p className="text-slate-400 max-w-md">{message}</p>
            </div>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Tentar Novamente
                </button>
            )}
        </div>
    );
}
