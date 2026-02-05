
import React, { useState } from 'react';
import { Zap, Calculator, FileText, FolderKanban } from 'lucide-react';
import { EquipmentsView } from './components/EquipmentsView';
import { DataService, syncPendingChanges } from './services/supabaseClient'; // Import sync
import { CalculatorView } from './components/CalculatorView';
import { DistributionView } from './components/DistributionView';
import { ReportsView } from './components/ReportsView';
import { ViewState } from './types';
import { ToastProvider, useToast } from './components/Toast';

export default function App() {
  return (
    <ToastProvider>
      <MainLayout />
    </ToastProvider>
  );
}

function MainLayout() {
  const [currentView, setCurrentView] = useState<ViewState>('equipments');
  const { success, info } = useToast();

  React.useEffect(() => {
    // Tenta sincronizar ao abrir
    syncPendingChanges().then(count => {
      if (count > 0) success(`${count} itens sincronizados!`);
    });

    // Tenta sincronizar quando a internet volta
    const handleOnline = () => {
      console.log('🌐 Online! Syncing...');
      syncPendingChanges().then(count => {
        if (count > 0) success(`Conexão restaurada! ${count} itens enviados.`);
        else info('Conexão restaurada!');
      });
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // Navigations Items
  const navItems = [
    { id: 'equipments', label: 'Equipamentos', icon: Zap },
    { id: 'calculator', label: 'Calc. Rápido', icon: Calculator },
    { id: 'distribution', label: 'Distribuição', icon: FolderKanban },
    { id: 'reports', label: 'Relatórios', icon: FileText },
  ];

  const renderView = () => {
    switch (currentView) {
      case 'equipments':
        return <div className="animate-fade-in"><EquipmentsView /></div>;
      case 'calculator':
        return <div className="animate-fade-in"><CalculatorView /></div>;
      case 'distribution':
        return <div className="animate-fade-in"><DistributionView /></div>;
      case 'reports':
        return <div className="animate-fade-in"><ReportsView /></div>;
      default:
        return <EquipmentsView />;
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans text-slate-200 selection:bg-blue-500/30 selection:text-blue-200">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-background/80 backdrop-blur-md fixed top-0 w-full z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">

            {/* Logo Area */}
            <div className="flex items-center gap-3 group cursor-default">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all duration-300 group-hover:scale-105">
                <Zap className="w-5 h-5 text-white fill-current animate-pulse" />
              </div>
              <div className="leading-tight">
                <h1 className="text-white font-bold text-lg tracking-tight group-hover:text-blue-400 transition-colors">LightLoad Pro</h1>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest group-hover:text-slate-300 transition-colors">Planejamento de Carga</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2">
              {navItems.map((item) => {
                const isActive = currentView === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id as ViewState)}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2
                      ${isActive
                        ? 'bg-blue-600/10 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)] border border-blue-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50 hover:scale-105'}
                    `}
                  >
                    <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-blue-400 fill-blue-400/20' : 'text-slate-500 group-hover:text-white'}`} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation (Bottom Bar) */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-surface/95 backdrop-blur-lg border-t border-slate-800 z-50 px-4 py-2 flex justify-around items-center safe-area-pb">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as ViewState)}
              className={`
                  flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-300
                  ${isActive ? 'text-blue-400 scale-110' : 'text-slate-500 hover:text-slate-300'}
                `}
            >
              <div className={`relative ${isActive ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]' : ''}`}>
                <Icon className={`w-6 h-6 ${isActive ? 'fill-blue-400/20' : ''}`} />
                {isActive && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full"></span>}
              </div>
              <span className={`text-[10px] font-medium transition-all ${isActive ? 'opacity-100 font-bold' : 'opacity-70'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <main className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-28 md:pb-12 min-h-[calc(100vh-80px)]">
        {renderView()}
      </main>
    </div>
  );
}
