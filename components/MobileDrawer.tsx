import React from 'react';
import { X, Zap } from 'lucide-react';
import { ViewState } from '../types';

interface MobileDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    currentView: ViewState;
    onNavigate: (view: ViewState) => void;
    navItems: Array<{
        id: string;
        label: string;
        icon: React.ComponentType<any>;
    }>;
    userEmail?: string;
    onLogout: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
    isOpen,
    onClose,
    currentView,
    onNavigate,
    navItems,
    userEmail,
    onLogout
}) => {
    const handleNavigate = (view: ViewState) => {
        onNavigate(view);
        onClose();
    };

    return (
        <>
            {/* Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] md:hidden animate-fade-in"
                    onClick={onClose}
                />
            )}

            {/* Drawer */}
            <div
                className={`
          fixed top-0 left-0 h-full w-[280px] bg-surface border-r border-slate-700 z-[80] md:hidden
          transform transition-transform duration-300 ease-out shadow-2xl
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
            >
                {/* Header */}
                <div className="p-4 border-b border-slate-700 bg-slate-900/50">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <Zap className="w-6 h-6 text-white fill-current" />
                            </div>
                            <div>
                                <h2 className="text-white font-bold text-lg">LightLoad Pro</h2>
                                <p className="text-xs text-slate-400">{userEmail?.split('@')[0]}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Navigation Items */}
                <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100%-180px)]">
                    {navItems.map((item) => {
                        const isActive = currentView === item.id;
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                onClick={() => handleNavigate(item.id as ViewState)}
                                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                  ${isActive
                                        ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-500/10'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                                    }
                `}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                                <span className="font-medium text-sm">{item.label}</span>
                                {isActive && (
                                    <div className="ml-auto w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700 bg-slate-900/50">
                    <button
                        onClick={onLogout}
                        className="w-full bg-red-600/10 hover:bg-red-600/20 text-red-400 px-4 py-3 rounded-xl font-medium text-sm transition-all border border-red-500/20 flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sair
                    </button>
                </div>
            </div>
        </>
    );
};
