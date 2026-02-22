
import React, { useState } from 'react';
import { Zap, Calculator, FileText, FolderKanban, LogOut, Calendar, TrendingUp, Menu, Activity, BookOpen } from 'lucide-react';
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
import { MobileDrawer } from './components/MobileDrawer';
import { PowerSystemView } from './components/PowerSystemView';
import { EducationView } from './components/EducationView';
import NotificationCenter from './components/NotificationCenter';

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
  const [isVisible, setIsVisible] = useState(true);

  React.useEffect(() => {
    // Network Listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    const checkDb = async () => {
      if (!navigator.onLine) {
        setIsDbConnected(false);
        return;
      }
      const ok = await DataService.checkConnection();
      setIsDbConnected(ok);
    };

    const interval = setInterval(checkDb, 30000);
    checkDb();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  // Auto-hide on mobile after 4 seconds if connected
  React.useEffect(() => {
    if (isDbConnected && isOnline) {
      const timer = setTimeout(() => setIsVisible(false), 4000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(true);
    }
  }, [isDbConnected, isOnline]);

  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 w-full bg-orange-500 text-white text-[10px] font-bold text-center py-0.5 z-[60]">
        OFFLINE - MODO LOCAL
      </div>
    );
  }

  // If DB is connected and auto-hidden, show nothing (clean mobile UI)
  if (!isVisible && isDbConnected) return null;

  return (
    <div className="fixed top-[72px] right-3 md:top-4 md:right-4 z-40 flex flex-col gap-1 items-end pointer-events-none transition-all duration-500">
      {/* DB Status */}
      <div className={`
          flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold backdrop-blur-md border shadow-lg transition-all
          ${isDbConnected ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}
       `}>
        <div className={`w-1.5 h-1.5 rounded-full ${isDbConnected ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></div>
        {isDbConnected ? 'DB CONECTADO' : 'ERRO NO BANCO'}
      </div>
    </div>
  );
}

function MainLayout() {
  const [currentView, setCurrentView] = useState<ViewState>('calculator'); // Default=distribution
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProject, setEditingProject] = useState<DistributionProject | null>(null);

  const { success, error, info } = useToast();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    success('Você saiu com sucesso.');
  };

  React.useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsLoading(false);
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


  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

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
    { id: 'power-system', label: 'Elétrica', icon: Activity },
    { id: 'reports', label: 'Relatórios', icon: FileText },
    { id: 'education', label: 'Aprenda', icon: BookOpen },
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
      case 'power-system':
        return <div className="animate-fade-in"><PowerSystemView /></div>;
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
      case 'education':
        return <div className="animate-fade-in"><EducationView /></div>;
      default:
        return <EquipmentsView />;
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans text-slate-200 selection:bg-blue-500/30 selection:text-blue-200">
      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentView={currentView}
        onNavigate={setCurrentView}
        navItems={navItems}
        userEmail={session.user.email}
        onLogout={handleLogout}
      />

      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-background/80 backdrop-blur-md fixed top-0 w-full z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">

            {/* Mobile Menu Button + Logo */}
            <div className="flex items-center gap-3">
              {/* Hamburger Menu - Mobile Only */}
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors active:scale-95"
              >
                <Menu className="w-6 h-6" />
              </button>

              {/* Logo Area */}
              <div className="flex items-center gap-3 group cursor-default">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all duration-300 group-hover:scale-105">
                  <Zap className="w-5 h-5 text-white fill-current animate-pulse" />
                </div>
                <div className="leading-tight">
                  <h1 className="text-white font-bold text-lg tracking-tight group-hover:text-blue-400 transition-colors">LightLoad Pro</h1>
                  <div className="hidden sm:flex items-center gap-2">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest group-hover:text-slate-300 transition-colors">
                      {session.user.email?.split('@')[0]}
                    </p>
                    <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 transition-colors" title="Sair">
                      <LogOut className="w-3 h-3" />
                    </button>
                  </div>
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

            {/* Notification Bell */}
            <div className="flex items-center">
              <NotificationCenter
                onNavigateToEvent={(eventId) => {
                  setCurrentView('events');
                  // Como o estado de selectedEventId está dentro do EventsView, 
                  // passamos uma flag ou usamos um mecanismo para EventsView abrir direto.
                  // Para simplificar, configuramos para navegar e o usuário clica no evento.
                  // Mas se quisermos ser precisos, podemos passar o ID via localStorage ou um Context.
                  localStorage.setItem('autoOpenEventId', eventId);
                }}
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-12 min-h-[calc(100vh-80px)]">
        {renderView()}
      </main>
    </div>
  );
}
