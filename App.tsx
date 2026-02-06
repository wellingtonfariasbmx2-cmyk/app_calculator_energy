
import React, { useState } from 'react';
import { Zap, Calculator, FileText, FolderKanban, LogOut, Calendar, TrendingUp } from 'lucide-react';
import { EquipmentsView } from './components/EquipmentsView';
import { EventsView } from './components/EventsView';
import { EquipmentAvailabilityPanel } from './components/EquipmentAvailabilityPanel';
import { DataService, syncPendingChanges } from './services/supabaseClient'; // Import sync
import { CalculatorView } from './components/CalculatorView';
import { DistributionView } from './components/DistributionView';
import { ReportsView } from './components/ReportsView';
import { ViewState } from './types';
import { ToastProvider, useToast } from './components/Toast';
import { LoginView } from './components/LoginView';
import { supabase } from './services/supabaseClient';

export default function App() {
  return (
    <ToastProvider>
      <MainLayout />
      <StatusIndicator />
    </ToastProvider>
  );
}

import { DistributionProject } from './types'; // Ensure imported logic

function StatusIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isDbConnected, setIsDbConnected] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  React.useEffect(() => {
    // Network Listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Sync Listener (Custom Event or Polling - Simplified here via interval check if needed, 
    // but better to expose state. For now, we will simulate sync state via window event or simple check)
    // To make it real, we could expose a global state or simple event bus.
    // For simplicity, let's assume sync is fast. We will check DB connection periodically.

    const checkDb = async () => {
      if (!navigator.onLine) {
        setIsDbConnected(false);
        return;
      }
      const ok = await DataService.checkConnection();
      setIsDbConnected(ok);
    };

    const interval = setInterval(checkDb, 30000); // Check every 30s
    checkDb(); // Initial check

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 w-full bg-orange-500 text-white text-[10px] font-bold text-center py-0.5 z-[60]">
        OFFLINE - MODO LOCAL
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-[60] flex flex-col gap-1 items-end pointer-events-none">
      {/* DB Status */}
      <div className={`
          flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold backdrop-blur-md border shadow-lg transition-all
          ${isDbConnected ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}
       `}>
        <div className={`w-1.5 h-1.5 rounded-full ${isDbConnected ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></div>
        {isDbConnected ? 'DB CONECTADO' : 'ERRO NO BANCO'}
      </div>
    </div>
  );
}

function MainLayout() {
  const [session, setSession] = useState<any>(null);
  const [currentView, setCurrentView] = useState<ViewState>('equipments');
  const [editingProject, setEditingProject] = useState<DistributionProject | null>(null);
  const { success, info } = useToast();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    success('Você saiu com sucesso.');
  };

  React.useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  React.useEffect(() => {
    // Tenta sincronizar ao abrir
    syncPendingChanges().then(count => {
      if (count > 0) success(`${count} itens sincronizados!`);
    });

    const handleOnline = () => {
      console.log('🌐 Online! Syncing...');
      syncPendingChanges().then(count => {
        if (count > 0) success(`Conexão restaurada! ${count} itens enviados.`);
        else info('Conexão restaurada! Sincronizado.');
      });
    };

    const handleOffline = () => {
      info('Você está offline. Agora usando modo offline. 📡');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Render Login if no session
  if (!session) {
    return <LoginView onLoginSuccess={() => success('Login realizado com sucesso!')} />;
  }

  // Navigations Items
  const navItems = [
    { id: 'events', label: 'Eventos', icon: Calendar },
    { id: 'availability', label: 'Disponibilidade', icon: TrendingUp },
    { id: 'equipments', label: 'Equipamentos', icon: Zap },
    { id: 'calculator', label: 'Calc. Rápido', icon: Calculator },
    { id: 'distribution', label: 'Distribuição', icon: FolderKanban },
    { id: 'reports', label: 'Relatórios', icon: FileText },
  ];

  const renderView = () => {
    switch (currentView) {
      case 'events':
        return (
          <div className="animate-fade-in">
            <EventsView
              onNavigateToDistribution={async (projectId) => {
                // Carregar o projeto do banco de dados
                try {
                  const allProjects = await DataService.getReports();
                  const project = allProjects.find(p => p.id === projectId);

                  if (project && project.type === 'distribution') {
                    setEditingProject(project as DistributionProject);
                    setCurrentView('distribution');
                    info(`Abrindo projeto: ${project.name}`);
                  } else {
                    // Se não encontrou o projeto, apenas navega para criar novo
                    setCurrentView('distribution');
                  }
                } catch (err) {
                  console.error('Error loading project:', err);
                  setCurrentView('distribution');
                }
              }}
            />
          </div>
        );
      case 'availability':
        return <div className="animate-fade-in"><EquipmentAvailabilityPanel /></div>;
      case 'equipments':
        return <div className="animate-fade-in"><EquipmentsView /></div>;
      case 'calculator':
        return <div className="animate-fade-in"><CalculatorView /></div>;
      case 'distribution':
        return (
          <div className="animate-fade-in">
            <DistributionView
              initialProject={editingProject}
              onClearEdit={() => setEditingProject(null)}
            />
          </div>
        );
      case 'reports':
        return (
          <div className="animate-fade-in">
            <ReportsView
              onEditDistribution={(project) => {
                setEditingProject(project);
                setCurrentView('distribution');
              }}
            />
          </div>
        );
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
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest group-hover:text-slate-300 transition-colors">
                    {session.user.email?.split('@')[0]}
                  </p>
                  <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 transition-colors" title="Sair">
                    <LogOut className="w-3 h-3" />
                  </button>
                </div>
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
