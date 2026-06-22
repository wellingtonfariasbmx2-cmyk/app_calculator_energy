import React, { useState } from 'react';
import { Layers, LogOut, Calendar, TrendingUp, Menu, Activity, Monitor, Wrench, Package, MoreHorizontal } from 'lucide-react';
import { EquipmentsView } from './components/EquipmentsView';
import { EventsView } from './components/EventsView';
import { EquipmentAvailabilityPanel } from './components/EquipmentAvailabilityPanel';
import { DataService, supabase } from './services/supabaseClient';
import { ViewState, DistributionProject } from './types';
import { ToastProvider, useToast } from './components/Toast';
import { LoginView } from './components/LoginView';
import { MobileDrawer } from './components/MobileDrawer';
import NotificationCenter from './components/NotificationCenter';
import { TVDashboardView } from './components/TVDashboardView';
import { MaintenanceView } from './components/MaintenanceView';
import { PartnersView } from './components/PartnersView';
import { EnergyHub } from './components/EnergyHub';
import { ConfigProvider, useConfig } from './components/ConfigContext';
import { ChangelogModal } from './components/ChangelogModal';

export default function App() {
  return (
    <ConfigProvider>
      <ToastProvider>
        <MainLayout />
        <StatusIndicator />
      </ToastProvider>
    </ConfigProvider>
  );
}


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
  const [currentView, setCurrentView] = useState<ViewState>('tv-dashboard');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingProject, setEditingProject] = useState<DistributionProject | null>(null);

  const { success, error, info } = useToast();
  const { company, profile, isLoadingConfig } = useConfig();

  const handleLogout = async () => {
    await supabase.auth.signOut();

    // Clear legacy DataService caches (from supabaseClient.ts)
    localStorage.removeItem('stageflow_profile');
    localStorage.removeItem('stageflow_config');
    localStorage.removeItem('ll_equipments');
    localStorage.removeItem('ll_events');
    localStorage.removeItem('ll_calculations');
    localStorage.removeItem('ll_distribution_projects');
    localStorage.removeItem('ll_sync_queue');

    // Wipe IndexedDB if used by custom sync, or just force hard reload to clear React memory
    success('Você saiu com sucesso.');
    setTimeout(() => {
      window.location.href = '/';
    }, 500);
  };

  React.useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    }).catch(() => {
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


  if (isLoading || isLoadingConfig) {
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

  const baseNavItems = [
    { id: 'events', label: 'Eventos', icon: Calendar },
    { id: 'tv-dashboard', label: 'Dashboard', icon: Monitor },
    { id: 'availability', label: 'Disponibilidade', icon: TrendingUp },
    { id: 'equipments', label: 'Materiais e Equip.', icon: Package },
    { id: 'maintenance', label: 'Manutenção', icon: Wrench },
    { id: 'energy', label: 'Energia', icon: Activity },
  ];
  const navItems = [...baseNavItems];
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
      case 'energy':
        return (
          <div className="animate-fade-in">
            <EnergyHub
              initialProject={editingProject}
              onClearEdit={() => setEditingProject(null)}
              onEditDistribution={(project) => {
                setEditingProject(project);
              }}
            />
          </div>
        );
      case 'tv-dashboard':
        return <div className="animate-fade-in"><TVDashboardView /></div>;
      case 'maintenance':
        return <div className="animate-fade-in"><MaintenanceView /></div>;
      case 'partners':
        return <div className="animate-fade-in"><PartnersView /></div>;

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
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Hamburger Menu - Mobile Only */}
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="md:hidden p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors active:scale-95"
              >
                <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              {/* Logo Area */}
              <div className="flex items-center gap-2 sm:gap-3 group cursor-default">
                {company?.logoUrl ? (
                  <img src={company.logoUrl} alt="Logo" className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg object-contain hover:scale-105 transition-all bg-white/10" />
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-cyan-500 to-violet-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition-all duration-300 group-hover:scale-105 shrink-0">
                    <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-white" strokeWidth={2.5} />
                  </div>
                )}
                <div className="leading-tight min-w-0">
                  <h1 className="text-white font-bold text-base sm:text-lg tracking-tight group-hover:text-cyan-400 transition-colors truncate">
                    {company?.name || <span>Stage<span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">Flow</span></span>}
                  </h1>
                  <div className="hidden sm:flex items-center gap-2">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest group-hover:text-slate-300 transition-colors truncate max-w-[100px] lg:max-w-[200px]">
                      {session.user.email?.split('@')[0]}
                    </p>
                    <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 transition-colors shrink-0" title="Sair">
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
                        ? 'bg-cyan-600/10 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] border border-cyan-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50 hover:scale-105'}
                    `}
                  >
                    <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-cyan-400 fill-cyan-400/20' : 'text-slate-500 group-hover:text-white'}`} />
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
      <main className="pt-20 sm:pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-28 sm:pb-12 min-h-[calc(100vh-80px)] overflow-x-hidden safe-area-content-bottom">
        {renderView()}
      </main>

      {/* Bottom Navigation for Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 z-50 safe-area-pb animate-slide-in-up shadow-[0_-10px_30px_-10px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between px-1 py-1.5">
          {baseNavItems.slice(0, 4).map((item) => {
            const isActive = currentView === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as ViewState)}
                className={`flex flex-col items-center justify-center w-[72px] gap-0.5 p-1 rounded-xl transition-all ${isActive ? 'text-cyan-400 scale-105' : 'text-slate-500 hover:text-slate-300 active:scale-95'}`}
              >
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 shadow-[0_0_12px_rgba(6,182,212,0.25)] ring-1 ring-cyan-500/30' : ''}`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'fill-cyan-400/20 text-cyan-400' : 'text-slate-400'}`} />
                </div>
                <span className="text-[10px] font-semibold truncate w-full text-center mt-0.5 tracking-tight">{item.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex flex-col items-center justify-center w-[72px] gap-0.5 p-1 rounded-xl text-slate-500 hover:text-slate-300 transition-all active:scale-95"
          >
            <div className="p-1.5 rounded-xl">
              <MoreHorizontal className="w-5 h-5 text-slate-400" />
            </div>
            <span className="text-[10px] font-semibold truncate w-full text-center mt-0.5 tracking-tight">Mais</span>
          </button>
        </div>
      </div>

      {/* Changelog Modal */}
      <ChangelogModal />
    </div>
  );
}
