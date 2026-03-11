import React, { useState, useEffect } from 'react';
import { Zap, Power, Activity, FolderOpen, AlertCircle, Cable, ChevronDown, RotateCcw, RefreshCw, Maximize2, FileText } from 'lucide-react';
import { GeneratorConfig, MainpowerConfig, DistributionProject, Port } from '../types';
import { GeneratorConfigModal } from './GeneratorConfigModal';
import { MainpowerConfigModal } from './MainpowerConfigModal';
import { PhaseCard } from './PhaseCard';
import { DataService } from '../services/supabaseClient';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmModal';
import { balancePhases, updatePhaseLoads } from '../services/phaseBalancing';
import { PresentationMode } from './PresentationMode';
import { LoadingScreen } from './LoadingScreen';
import { ErrorScreen } from './ErrorScreen';
import { ExportService } from '../services/ExportService';

export const PowerSystemView: React.FC = () => {
    const [presentationMode, setPresentationMode] = useState(false);
    const [generatorConfig, setGeneratorConfig] = useState<GeneratorConfig>({
        enabled: false,
        powerKVA: 180,
        isThreePhase: true,
        voltage: 220
    });

    const [mainpowerConfig, setMainpowerConfig] = useState<MainpowerConfig>({
        enabled: false,
        systemType: 'three-phase',
        totalPorts: 12,
        mainBreakerAmps: 63,
        phases: [
            { phaseId: 'A', color: '#ef4444', maxAmps: 63, currentLoad: 0, ports: [], portsCount: 4, breakerAmps: 63 },
            { phaseId: 'B', color: '#3b82f6', maxAmps: 63, currentLoad: 0, ports: [], portsCount: 4, breakerAmps: 63 },
            { phaseId: 'C', color: '#eab308', maxAmps: 63, currentLoad: 0, ports: [], portsCount: 4, breakerAmps: 63 }
        ],
        autoBalance: true
    });

    const [showGeneratorModal, setShowGeneratorModal] = useState(false);
    const [showMainpowerModal, setShowMainpowerModal] = useState(false);
    const [savedProjects, setSavedProjects] = useState<DistributionProject[]>([]);
    const [selectedProject, setSelectedProject] = useState<DistributionProject | null>(null);
    const [allPorts, setAllPorts] = useState<Port[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorState, setErrorState] = useState<string | null>(null);

    const { success, error, info } = useToast();
    const { confirm: confirmAction, ConfirmModalComponent } = useConfirm();

    // Carregar projetos salvos e restaurar estado
    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            setLoading(true);
            setErrorState(null);
            const reports = await DataService.getReports();
            const distProjects = reports.filter(r => r.type === 'distribution') as DistributionProject[];
            setSavedProjects(distProjects);

            // Tentar restaurar o último projeto selecionado
            const lastProjectId = localStorage.getItem('ll_last_power_project');
            if (lastProjectId) {
                const project = distProjects.find(p => p.id === lastProjectId);
                if (project) {
                    handleSelectProject(project, true); // true = silent load (sem toast)
                }
            }
        } catch (err) {
            console.error('Erro ao carregar projetos:', err);
            setErrorState('Falha ao carregar projetos.');
            error('Erro ao carregar projetos.');
        } finally {
            setLoading(false);
        }
    };

    // Quando seleciona um projeto
    const handleSelectProject = (project: DistributionProject, silent = false) => {
        setSelectedProject(project);
        setAllPorts(project.ports);

        // Salvar ID para persistência
        localStorage.setItem('ll_last_power_project', project.id);

        // Restaurar estado do Mainpower (prioridade: LocalStorage > DB > Padrão)
        const localConfig = localStorage.getItem(`ll_power_config_${project.id}`);
        let loadedMainpower: MainpowerConfig | null = null;

        if (localConfig) {
            try {
                loadedMainpower = JSON.parse(localConfig);
            } catch (e) {
                console.error("Erro ao ler config local", e);
            }
        }

        if (!loadedMainpower && project.mainpowerConfig) {
            loadedMainpower = project.mainpowerConfig;
        }

        if (loadedMainpower) {
            setMainpowerConfig(loadedMainpower);
        } else {
            // Se não tem mainpower configurado, resetar para padrão
            setMainpowerConfig({
                enabled: false,
                systemType: 'three-phase',
                totalPorts: 12,
                mainBreakerAmps: 63,
                phases: [
                    { phaseId: 'A', color: '#ef4444', maxAmps: 63, currentLoad: 0, ports: [], portsCount: 4, breakerAmps: 63 },
                    { phaseId: 'B', color: '#3b82f6', maxAmps: 63, currentLoad: 0, ports: [], portsCount: 4, breakerAmps: 63 },
                    { phaseId: 'C', color: '#eab308', maxAmps: 63, currentLoad: 0, ports: [], portsCount: 4, breakerAmps: 63 }
                ],
                autoBalance: false
            });
        }

        // Restaurar estado do Gerador (prioridade: LocalStorage > DB > Padrão)
        const localGenConfig = localStorage.getItem(`ll_generator_config_${project.id}`);
        let loadedGenerator: GeneratorConfig | null = null;

        if (localGenConfig) {
            try {
                loadedGenerator = JSON.parse(localGenConfig);
            } catch (e) {
                console.error("Erro ao ler config gerador local", e);
            }
        }

        if (!loadedGenerator && project.generatorConfig) {
            loadedGenerator = project.generatorConfig;
        }

        if (loadedGenerator) {
            setGeneratorConfig(loadedGenerator);
        } else {
            setGeneratorConfig({
                enabled: false,
                powerKVA: 180,
                isThreePhase: true,
                voltage: 220
            });
        }

        if (!silent) success(`Projeto "${project.name}" carregado!`);
    };

    // Persistir alterações locais (Mainpower e Gerador)
    useEffect(() => {
        if (selectedProject) {
            if (mainpowerConfig.enabled) {
                localStorage.setItem(`ll_power_config_${selectedProject.id}`, JSON.stringify(mainpowerConfig));
            }
            // Persistir gerador
            localStorage.setItem(`ll_generator_config_${selectedProject.id}`, JSON.stringify(generatorConfig));
        }
    }, [mainpowerConfig, generatorConfig, selectedProject]);

    // Drag and Drop Handlers
    const handleDragStart = (e: React.DragEvent, circuitId: string) => {
        e.dataTransfer.setData('circuitId', circuitId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetPhaseId: string) => {
        e.preventDefault();
        const circuitId = e.dataTransfer.getData('circuitId');
        if (!circuitId) return;

        // Encontrar fases de origem e destino
        const sourcePhaseIdx = mainpowerConfig.phases.findIndex(p => p.ports.includes(circuitId));
        const targetPhaseIdx = mainpowerConfig.phases.findIndex(p => p.phaseId === targetPhaseId);

        if (sourcePhaseIdx === -1 || targetPhaseIdx === -1 || sourcePhaseIdx === targetPhaseIdx) return;

        // VALIDAÇÃO DE CAPACIDADE
        const targetPhase = mainpowerConfig.phases[targetPhaseIdx];
        const numPhases = mainpowerConfig.phases.length;
        const maxCircuitsPerPhase = Math.floor(mainpowerConfig.totalPorts / numPhases);

        // Verificar se a fase de destino já está cheia
        const currentCircuits = targetPhase.ports.length;
        if (currentCircuits >= maxCircuitsPerPhase) {
            error(`Fase ${targetPhaseId} está cheia! Limite: ${maxCircuitsPerPhase} circuitos por fase.`);
            return; // CANCELAR operação
        }

        // Clonar configuração
        const newPhases = [...mainpowerConfig.phases];

        // Remover da origem
        newPhases[sourcePhaseIdx] = {
            ...newPhases[sourcePhaseIdx],
            ports: newPhases[sourcePhaseIdx].ports.filter(id => id !== circuitId)
        };

        // Adicionar ao destino
        newPhases[targetPhaseIdx] = {
            ...newPhases[targetPhaseIdx],
            ports: [...newPhases[targetPhaseIdx].ports, circuitId]
        };

        const tempConfig = { ...mainpowerConfig, phases: newPhases };

        // Recalcular cargas
        const updatedConfig = updatePhaseLoads(tempConfig, allPorts, selectedProject?.voltageSystem || 220);

        setMainpowerConfig(updatedConfig);
        success(`Circuito movido para Fase ${targetPhaseId}`);
    };

    const handleGeneratorChange = (config: GeneratorConfig) => {
        setGeneratorConfig(config);
        success('Configuração do gerador atualizada!');
    };

    const handleMainpowerChange = (config: MainpowerConfig) => {
        // Se ativou o auto-balanceamento, aplicar imediatamente
        if (config.autoBalance && !mainpowerConfig.autoBalance && allPorts.length > 0) {
            const balanced = balancePhases(allPorts, selectedProject?.voltageSystem || 220, config);
            setMainpowerConfig(balanced);
            success('Balanceamento automático aplicado!');
        } else {
            setMainpowerConfig(config);
        }
    };

    const applyAutoBalance = () => {
        if (allPorts.length === 0) {
            info('Selecione um projeto com circuitos para balancear.');
            return;
        }

        const balanced = balancePhases(allPorts, selectedProject?.voltageSystem || 220, mainpowerConfig);
        setMainpowerConfig(balanced);
        success('Balanceamento automático aplicado!');
    };

    // Atualizar cargas quando os circuitos mudarem (mantendo distribuição se manual)
    useEffect(() => {
        // Se a lista de portas mudou (ex: adição de equipamento), atualize as cargas mas tente manter a distribuição
        if (mainpowerConfig.enabled && allPorts.length > 0 && selectedProject) {
            // Apenas recalcula cargas baseadas na distribuição atual
            const updated = updatePhaseLoads(mainpowerConfig, allPorts, selectedProject.voltageSystem);

            // Só atualiza se houver mudança de carga significativa para evitar loops
            const hasChanged = updated.phases.some((phase, idx) =>
                Math.abs(phase.currentLoad - mainpowerConfig.phases[idx].currentLoad) > 0.01
            );

            if (hasChanged) {
                setMainpowerConfig(updated);
            }
        }
    }, [allPorts, selectedProject?.voltageSystem]); // Removido mainpowerConfig das deps para evitar loop com DnD

    const handleResetConfiguration = async () => {
        if (!selectedProject) return;

        const confirmed = await confirmAction({
            title: 'Resetar Configuração Elétrica',
            message: 'Tem certeza que deseja apagar todas as configurações de Gerador e Mainpower deste projeto? Esta ação não pode ser desfeita e os dados serão perdidos se não salvos.',
            variant: 'danger',
            confirmText: 'Resetar',
            cancelText: 'Cancelar'
        });

        if (confirmed) {
            try {
                // Resetar estados locais
                setGeneratorConfig({
                    enabled: false,
                    powerKVA: 180,
                    isThreePhase: true,
                    voltage: 220
                });

                setMainpowerConfig({
                    enabled: false,
                    systemType: 'three-phase',
                    totalPorts: 12,
                    mainBreakerAmps: 63,
                    phases: [
                        { phaseId: 'A', color: '#ef4444', maxAmps: 63, currentLoad: 0, ports: [], portsCount: 4, breakerAmps: 63 },
                        { phaseId: 'B', color: '#3b82f6', maxAmps: 63, currentLoad: 0, ports: [], portsCount: 4, breakerAmps: 63 },
                        { phaseId: 'C', color: '#eab308', maxAmps: 63, currentLoad: 0, ports: [], portsCount: 4, breakerAmps: 63 }
                    ],
                    autoBalance: false
                });

                // Opcional: Salvar o estado resetado no banco imediatamente
                const updatedProject: DistributionProject = {
                    ...selectedProject,
                    generatorConfig: undefined,
                    mainpowerConfig: undefined
                };

                await DataService.saveDistribution(updatedProject);
                success('Configuração elétrica resetada com sucesso!');

                // Atualizar lista de projetos
                const reports = await DataService.getReports();
                const distProjects = reports.filter(r => r.type === 'distribution') as DistributionProject[];
                setSavedProjects(distProjects);
            } catch (err) {
                console.error('Erro ao resetar:', err);
                error('Erro ao resetar configuração.');
            }
        }
    };

    const totalLoad = mainpowerConfig.phases.reduce((sum, phase) => sum + phase.currentLoad, 0);
    const avgLoadPercent = mainpowerConfig.phases.length > 0
        ? (mainpowerConfig.phases.reduce((sum, phase) => sum + (phase.currentLoad / phase.maxAmps) * 100, 0) / mainpowerConfig.phases.length)
        : 0;

    const getBalanceStatus = () => {
        const loads = mainpowerConfig.phases.map(p => (p.currentLoad / p.maxAmps) * 100);
        const max = Math.max(...loads);
        const min = Math.min(...loads);
        const diff = max - min;

        if (diff <= 10) return { text: 'Excelente', color: 'text-emerald-400', icon: 'bg-emerald-500' };
        if (diff <= 25) return { text: 'Bom', color: 'text-blue-400', icon: 'bg-blue-500' };
        if (diff <= 40) return { text: 'Regular', color: 'text-yellow-400', icon: 'bg-yellow-500' };
        return { text: 'Desbalanceado', color: 'text-red-400', icon: 'bg-red-500' };
    };

    const balanceStatus = getBalanceStatus();

    const getSystemTypeLabel = () => {
        switch (mainpowerConfig.systemType) {
            case 'single': return 'Monofásico';
            case 'two-phase': return 'Bifásico';
            case 'three-phase': return 'Trifásico';
            default: return 'Trifásico';
        }
    };

    // --- NOVA LÓGICA: Monitoramento do Transformador de 120V (ACT-05) ---
    // Limite documentado pela Pentacústica: 4500W
    const TRANSFORMER_120V_MAX_WATTS = 4500;
    
    // Calcular a soma da potência (W) de todos os equipamentos que estão operando em 110/120V 
    // ligados ao Mainpower 
    let total120VWatts = 0;
    
    if (mainpowerConfig.enabled) {
        allPorts.forEach(port => {
            port.items.forEach(item => {
                const strToSearch = `${port.name} ${item.equipment.name} ${port.description || ''}`.toLowerCase();
                if (strToSearch.includes('120v') || strToSearch.includes('110v') || strToSearch.includes('console') || strToSearch.includes('mesa') || strToSearch.includes('house') || strToSearch.includes('mix')) {
                     total120VWatts += (item.equipment.watts * item.quantity);
                }
            });
        });
    }

    // --- NOVA LÓGICA: Fases do Gerador (R, S, T) ---
    const getGeneratorPhasesData = () => {
        if (!generatorConfig.enabled) return [];
        
        let genMaxAmpsPerPhase = 0;
        let numPhases = generatorConfig.isThreePhase ? 3 : 1;

        if (generatorConfig.isThreePhase) {
            // Formula Trifásica: kVA * 1000 / (Volts * 1.732)
            genMaxAmpsPerPhase = (generatorConfig.powerKVA * 1000) / (generatorConfig.voltage * 1.732);
        } else {
            // Formula Monofásica: kVA * 1000 / Volts
            genMaxAmpsPerPhase = (generatorConfig.powerKVA * 1000) / generatorConfig.voltage;
        }

        const phases = [];
        const phaseNames = generatorConfig.isThreePhase ? ['R', 'S', 'T'] : ['L1'];
        
        for (let i = 0; i < numPhases; i++) {
            // Mapeia Fase do Mainpower para a Fase do Gerador (A->R, B->S, C->T)
            const mainpowerPhase = mainpowerConfig.enabled ? mainpowerConfig.phases[i] : null;
            const currentLoad = mainpowerPhase ? mainpowerPhase.currentLoad : 0;
            
            phases.push({
                name: phaseNames[i],
                maxAmps: genMaxAmpsPerPhase,
                currentLoad: currentLoad,
                percent: Math.min((currentLoad / genMaxAmpsPerPhase) * 100, 100)
            });
        }
        return phases;
    };

    const generatorPhases = getGeneratorPhasesData();

    const handleExportPDF = async () => {
        if (!selectedProject || !mainpowerConfig.enabled) {
            info('Configure o Mainpower antes de exportar o PDF.');
            return;
        }

        try {
            info('Gerando PDF...', 3000);
            const projectToExport = {
                ...selectedProject,
                generatorConfig,
                mainpowerConfig
            };
            
            await ExportService.exportPowerSystemPDF(
                projectToExport,
                generatorPhases,
                total120VWatts,
                TRANSFORMER_120V_MAX_WATTS
            );
            success('PDF gerado com sucesso!');
        } catch (err) {
            console.error('Erro ao exportar PDF:', err);
            error('Erro ao gerar PDF. Verifique os dados e tente novamente.');
        }
    };

    if (loading) return <LoadingScreen />;

    if (errorState) return <ErrorScreen message={errorState} onRetry={loadProjects} />;

    return (
        <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-6 pb-20">
            <ConfirmModalComponent />
            {/* Modals */}
            <GeneratorConfigModal
                isOpen={showGeneratorModal}
                onClose={() => setShowGeneratorModal(false)}
                onSave={handleGeneratorChange}
                initialConfig={generatorConfig}
            />

            <MainpowerConfigModal
                isOpen={showMainpowerModal}
                onClose={() => setShowMainpowerModal(false)}
                onSave={handleMainpowerChange}
                initialConfig={mainpowerConfig}
                generatorConfig={generatorConfig}
                projectPortsCount={allPorts.length}
            />

            {/* BARRA DE TOPO UNIFICADA: Seleção de Projeto + Ações */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 sticky top-0 z-40 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg shadow-lg shadow-indigo-500/20 hidden sm:block">
                        <Activity className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 w-full md:w-auto">
                        <div className="relative">
                            <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <select
                                value={selectedProject?.id || ''}
                                onChange={(e) => {
                                    const p = savedProjects.find(item => item.id === e.target.value);
                                    if (p) handleSelectProject(p);
                                }}
                                className="w-full md:w-80 bg-slate-900 border border-slate-600 text-white rounded-lg pl-10 pr-10 py-2.5 font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none appearance-none cursor-pointer hover:bg-slate-800 transition-colors"
                            >
                                <option value="" disabled>Selecione um Projeto...</option>
                                {savedProjects.map(project => (
                                    <option key={project.id} value={project.id}>
                                        {project.name} ({project.ports.length} circ.)
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {selectedProject && (
                    <div className="flex items-center justify-end gap-3 w-full md:w-auto mt-4 md:mt-0">
                        {mainpowerConfig.enabled && (
                            <button
                                onClick={handleExportPDF}
                                className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white border border-indigo-400/50 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-lg text-sm"
                                title="Exportar PDF do Sistema de Energia"
                            >
                                <FileText className="w-4 h-4" />
                                Exportar PDF
                            </button>
                        )}
                        <button
                            onClick={handleResetConfiguration}
                            className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg font-bold flex items-center justify-center gap-2 transition-all text-sm"
                            title="Resetar Configurações"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Resetar
                        </button>
                    </div>
                )}
            </div>

            {!selectedProject ? (
                <div className="text-center py-20 text-slate-500">
                    <Activity className="w-16 h-16 mx-auto mb-4 text-slate-700" />
                    <h2 className="text-xl font-bold text-slate-400">Nenhum projeto selecionado</h2>
                    <p className="max-w-md mx-auto mt-2 text-slate-600">Selecione um projeto de distribuição na barra acima para visualizar e configurar o sistema elétrico.</p>
                </div>
            ) : (
                <div className="space-y-8 animate-in fade-in duration-500">

                    {/* Alerta de Capacidade Insuficiente */}
                    {mainpowerConfig.enabled && mainpowerConfig.totalPorts < allPorts.length && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 animate-pulse">
                            <div className="p-2 bg-red-500/20 rounded-lg shrink-0">
                                <AlertCircle className="w-6 h-6 text-red-400" />
                            </div>
                            <div className="flex-1 text-center sm:text-left">
                                <h4 className="font-bold text-red-400 text-lg">Capacidade Insuficiente</h4>
                                <p className="text-sm text-red-200/80">
                                    O Mainpower tem <strong className="text-white">{mainpowerConfig.totalPorts} canais</strong> configurados,
                                    mas o projeto exige <strong className="text-white">{allPorts.length} circuitos</strong>.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowMainpowerModal(true)}
                                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg text-sm font-bold border border-red-500/30 transition-colors whitespace-nowrap"
                            >
                                Ajustar Mainpower
                            </button>
                        </div>
                    )}

                    {/* Alerta Transformador ACT-05 (120V) */}
                    {mainpowerConfig.enabled && total120VWatts > TRANSFORMER_120V_MAX_WATTS && (
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-4 animate-bounce-slow">
                            <div className="p-2 bg-orange-500/20 rounded-lg shrink-0">
                                <AlertCircle className="w-6 h-6 text-orange-400" />
                            </div>
                            <div className="flex-1 text-center sm:text-left">
                                <h4 className="font-bold text-orange-400 text-lg">Atenção: Sobrecarga no Transformador 120V (ACT-05)</h4>
                                <p className="text-sm text-orange-200/80">
                                    Identificamos <strong className="text-white">{total120VWatts}W</strong> sendo exigidos de equipamentos 120V/Mesas. <br/>
                                    O transformador ACT-05 (interno do RMP-63) suporta <strong>no máximo {TRANSFORMER_120V_MAX_WATTS}W</strong>. Recomendamos o uso de um RT-05 externo para backup.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* VISTA ESQUEMÁTICA: GERADOR -> MAINPOWER -> STATUS */}
                    <div className="relative bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8 overflow-hidden">
                        {/* Background Lines */}
                        <div className="absolute inset-0 opacity-20 pointer-events-none">
                            <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>
                        </div>

                        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center">

                            {/* 1. GERADOR */}
                            <div className="relative group">
                                <div className={`
                                    relative z-10 bg-slate-800 rounded-xl p-5 border-2 transition-all cursor-pointer hover:scale-105 active:scale-95
                                    ${generatorConfig.enabled ? 'border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.15)]' : 'border-slate-700 hover:border-slate-500'}
                                `}
                                    onClick={() => setShowGeneratorModal(true)}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="p-2 bg-slate-900 rounded-lg">
                                            <Power className={`w-6 h-6 ${generatorConfig.enabled ? 'text-yellow-400' : 'text-slate-500'}`} />
                                        </div>
                                        <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-slate-400 border border-slate-800">
                                            ENTRADA
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-bold text-white">Gerador</h3>
                                    <p className="text-sm text-slate-400 mt-1">
                                        {generatorConfig.enabled
                                            ? <span className="text-yellow-400 font-mono">{generatorConfig.powerKVA} kVA</span>
                                            : 'Não Configurado'}
                                    </p>
                                    <div className="mt-2 text-xs text-slate-500 flex items-center gap-2">
                                        <span>{generatorConfig.enabled ? (generatorConfig.isThreePhase ? 'Trifásico' : 'Monofásico') : '--'}</span>
                                        <span>•</span>
                                        <span>{generatorConfig.enabled ? `${generatorConfig.voltage}V` : '--'}</span>
                                    </div>
                                </div>
                                {/* Linha de conexão animada */}
                                <div className="hidden md:block absolute top-1/2 -right-8 w-16 h-1 bg-slate-800 z-0">
                                    {generatorConfig.enabled && <div className="absolute inset-0 bg-yellow-500/50 animate-pulse"></div>}
                                </div>
                            </div>

                            {/* 2. MAINPOWER (CENTRAL) */}
                            <div className="relative group">
                                <div className={`
                                    relative z-10 bg-slate-800 rounded-xl p-5 border-2 transition-all cursor-pointer hover:scale-105 active:scale-95
                                    ${mainpowerConfig.enabled ? (mainpowerConfig.totalPorts < allPorts.length ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.25)]' : 'border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.15)]') : 'border-slate-700 hover:border-slate-500'}
                                `}
                                    onClick={() => setShowMainpowerModal(true)}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="p-2 bg-slate-900 rounded-lg">
                                            <Zap className={`w-6 h-6 ${mainpowerConfig.enabled ? (mainpowerConfig.totalPorts < allPorts.length ? 'text-red-400' : 'text-indigo-400') : 'text-slate-500'}`} />
                                        </div>
                                        <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-900 text-slate-400 border border-slate-800">
                                            DISTRIBUIÇÃO
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-bold text-white">Mainpower</h3>
                                    <p className="text-sm text-slate-400 mt-1">
                                        {mainpowerConfig.enabled
                                            ? <span className={`font-bold ${mainpowerConfig.totalPorts < allPorts.length ? 'text-red-400' : 'text-indigo-400'}`}>{getSystemTypeLabel()}</span>
                                            : 'Não Configurado'}
                                    </p>
                                    <div className="mt-2 text-xs text-slate-500">
                                        {mainpowerConfig.mainBreakerAmps || '?'}A geral • {mainpowerConfig.totalPorts} portas • {mainpowerConfig.phases.length} fases
                                    </div>
                                </div>
                                {/* Linha de conexão animada */}
                                <div className="hidden md:block absolute top-1/2 -right-8 w-16 h-1 bg-slate-800 z-0">
                                    {mainpowerConfig.enabled && <div className="absolute inset-0 bg-indigo-500/50 animate-pulse delay-75"></div>}
                                </div>
                            </div>

                            {/* 3. STATUS / CARGA */}
                            <div className="relative">
                                <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 h-full flex flex-col justify-center">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Carga Total</span>
                                        <div className={`w-2 h-2 rounded-full ${balanceStatus.icon} animate-pulse`}></div>
                                    </div>

                                    <div className="text-3xl font-black text-white font-mono mb-1">
                                        {totalLoad.toFixed(1)} <span className="text-sm text-slate-500 font-sans font-normal">Amperes</span>
                                    </div>

                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${balanceStatus.color} bg-slate-900`}>
                                            {balanceStatus.text}
                                        </span>
                                        <span className="text-xs text-slate-500 ml-auto">
                                            Méd: {avgLoadPercent.toFixed(1)}%
                                        </span>
                                    </div>

                                    {/* Botão de Auto Balance */}
                                    <div className="mt-4 pt-4 border-t border-slate-700/50 flex gap-2">
                                        <button
                                            onClick={() => handleMainpowerChange({ ...mainpowerConfig, autoBalance: !mainpowerConfig.autoBalance })}
                                            className={`flex-1 py-1.5 px-2 rounded text-xs font-bold transition-colors ${mainpowerConfig.autoBalance
                                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                : 'bg-slate-700 text-slate-400 hover:text-white'
                                                }`}
                                        >
                                            {mainpowerConfig.autoBalance ? 'AUTO BALANCEAR ON' : 'AUTO BALANCEAR OFF'}
                                        </button>
                                        <button
                                            onClick={applyAutoBalance}
                                            className="p-1.5 rounded bg-slate-700 text-slate-300 hover:bg-indigo-600 hover:text-white transition-colors"
                                            title="Rebalancear Agora"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                        </button>
                                        {/* MODO APRESENTAÇÃO - FEATURE FUTURA (SALVO MAS OCULTO)
                                        <button
                                            onClick={() => setPresentationMode(true)}
                                            className="p-1.5 rounded bg-slate-700 text-slate-300 hover:bg-indigo-600 hover:text-white transition-colors"
                                            title="Modo Apresentação (Tela Cheia)"
                                        >
                                            <Maximize2 className="w-4 h-4" />
                                        </button>
                                        */}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* BLOCO DE FASES DO GERADOR */}
                        {generatorConfig.enabled && (
                            <div className="mt-8 border-t border-slate-800 pt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <Power className="w-4 h-4 text-yellow-500" />
                                        Carga nas Fases do Gerador
                                    </h4>
                                    <div className="text-xs text-slate-500">
                                        Max: {generatorPhases.length > 0 ? generatorPhases[0].maxAmps.toFixed(0) : 0}A por Fase
                                    </div>
                                </div>
                                
                                <div className={`grid gap-4 ${generatorPhases.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' : 'grid-cols-1 sm:grid-cols-3'}`}>
                                    {generatorPhases.map(phase => {
                                        let statusColor = "bg-emerald-500";
                                        let textColor = "text-emerald-400";
                                        if (phase.percent > 75) { statusColor = "bg-yellow-500"; textColor = "text-yellow-400"; }
                                        if (phase.percent > 90) { statusColor = "bg-red-500"; textColor = "text-red-400"; }

                                        return (
                                            <div key={phase.name} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                                                <div className="flex justify-between items-end mb-2">
                                                    <div>
                                                        <div className="text-[10px] font-bold text-slate-500 mb-1">FASE</div>
                                                        <div className="text-2xl font-black text-white leading-none">{phase.name}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className={`text-lg font-bold ${textColor} leading-none`}>
                                                            {phase.currentLoad.toFixed(1)}A
                                                        </div>
                                                        <div className="text-[10px] text-slate-500 mt-1">
                                                            {phase.percent.toFixed(1)}% de {phase.maxAmps.toFixed(0)}A
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Progress Bar */}
                                                <div className="w-full bg-slate-900 rounded-full h-1.5 mt-3 overflow-hidden">
                                                    <div 
                                                        className={`h-full ${statusColor} transition-all duration-500`}
                                                        style={{ width: `${phase.percent}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* FASES - GRID PRINCIPAL */}
                    {mainpowerConfig.enabled && (
                        <div className="animate-in slide-in-from-bottom-4 duration-700">
                            <div className="flex items-center justify-between mb-4 px-2">
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Cable className="w-5 h-5 text-indigo-400" />
                                    Distribuição por Fase do Mainpower
                                </h3>
                                <div className="text-xs text-slate-500">
                                    Visualização de Rack
                                </div>
                            </div>

                            <div className={`grid gap-6 ${mainpowerConfig.phases.length === 1 ? 'grid-cols-1 max-w-xl mx-auto' :
                                mainpowerConfig.phases.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
                                    'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
                                }`}>
                                {mainpowerConfig.phases.map((phase) => {
                                    const loadPercent = (phase.currentLoad / phase.maxAmps) * 100;
                                    return (
                                        <div key={phase.phaseId} className="h-[500px]">
                                            <PhaseCard
                                                phase={phase}
                                                loadPercent={loadPercent}
                                                allPorts={allPorts}
                                                onDragStart={handleDragStart}
                                                onDragOver={handleDragOver}
                                                onDrop={handleDrop}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* MODO APRESENTAÇÃO / MONITORAMENTO */}
            {presentationMode && (
                <PresentationMode
                    config={mainpowerConfig}
                    onClose={() => setPresentationMode(false)}
                />
            )}
        </div>
    );
};
