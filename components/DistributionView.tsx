import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../services/supabaseClient'; // Make sure supabase is imported
import { FolderKanban, Plus, Save, Trash2, Zap, Settings, X, AlertTriangle, ShieldCheck, Flame, LayoutGrid, Edit2, Wrench, RotateCcw, Search, Download, Cable, Plug } from 'lucide-react';
import { Equipment, Port, DistributionProject, GeneratorConfig, MainpowerConfig } from '../types';
import { DataService } from '../services/supabaseClient';
import { useToast } from './Toast';
import { ExportService } from '../services/ExportService';
import { isCompatible } from '../services/utils';
import { useConfirm } from './ConfirmModal';
import { QuantityInput } from './QuantityInput';
import { MoveOrCopyModal } from './MoveOrCopyModal';
import { PowerConfigPanel } from './PowerConfigPanel';
import { balancePhases, updatePhaseLoads } from '../services/phaseBalancing';
import { getCableSpecs, getCableColorClass } from '../utils/cableCalculations';

const STORAGE_KEY = 'lightload_distribution_state';

const PORT_COLORS = [
   { label: 'Cinza', value: '#334155', bg: 'bg-slate-700' },
   { label: 'Vermelho', value: '#ef4444', bg: 'bg-red-500' },
   { label: 'Rosa', value: '#ec4899', bg: 'bg-pink-500' },
   { label: 'Laranja', value: '#f97316', bg: 'bg-orange-500' },
   { label: 'Amarelo', value: '#eab308', bg: 'bg-yellow-500' },
   { label: 'Lima', value: '#84cc16', bg: 'bg-lime-500' },
   { label: 'Verde', value: '#22c55e', bg: 'bg-green-500' },
   { label: 'Esmeralda', value: '#10b981', bg: 'bg-emerald-500' },
   { label: 'Ciano', value: '#06b6d4', bg: 'bg-cyan-500' },
   { label: 'Azul', value: '#3b82f6', bg: 'bg-blue-500' },
   { label: 'Indigo', value: '#6366f1', bg: 'bg-indigo-500' },
   { label: 'Roxo', value: '#a855f7', bg: 'bg-purple-500' },
];

export const DistributionView: React.FC<{ initialProject?: DistributionProject | null; onClearEdit?: () => void }> = ({ initialProject, onClearEdit }) => {
   const [equipments, setEquipments] = useState<Equipment[]>([]);
   const [voltage, setVoltage] = useState(220);
   const [ports, setPorts] = useState<Port[]>([]);
   const [projectName, setProjectName] = useState('');
   const isFirstRender = React.useRef(true);

   // Modal de Adicionar Item
   const [activePortId, setActivePortId] = useState<string | null>(null);
   const [isEquipModalOpen, setIsEquipModalOpen] = useState(false);
   const [searchQuery, setSearchQuery] = useState(''); // Search state

   // Modal de Criar/Editar Circuito
   const [isPortModalOpen, setIsPortModalOpen] = useState(false);
   const [editingPortId, setEditingPortId] = useState<string | null>(null);
   const [portFormData, setPortFormData] = useState({ name: '', abbr: '', amps: 32, color: PORT_COLORS[7].value });

   // Modal de Configuração Rápida (Bulk)
   const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
   const [bulkData, setBulkData] = useState({ quantity: 6, amps: 32, prefix: 'Dimmer' });

   // Modal de Salvar
   const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
   const [saveDesc, setSaveDesc] = useState('');
   const [techResponsible, setTechResponsible] = useState('');

   // Modal Mover/Copiar state
   const [moveOrCopyModal, setMoveOrCopyModal] = useState<{
      isOpen: boolean;
      sourcePortIndex: number;
      targetPortIndex: number;
      itemIndex: number;
   } | null>(null);

   // Sistema de Balanceamento de Fases
   const [generatorConfig, setGeneratorConfig] = useState<GeneratorConfig>({
      enabled: false,
      powerKVA: 50,
      isThreePhase: true,
      voltage: 220
   });

   const [mainpowerConfig, setMainpowerConfig] = useState<MainpowerConfig>({
      enabled: false,
      systemType: 'three-phase',
      totalPorts: 12,
      phases: [
         { phaseId: 'A', color: '#ef4444', maxAmps: 63, currentLoad: 0, ports: [] },
         { phaseId: 'B', color: '#3b82f6', maxAmps: 63, currentLoad: 0, ports: [] },
         { phaseId: 'C', color: '#eab308', maxAmps: 63, currentLoad: 0, ports: [] }
      ],
      autoBalance: true
   });

   const { success, error, info } = useToast();
   const { confirm, ConfirmModalComponent } = useConfirm();

   useEffect(() => {
      DataService.getEquipments().then(setEquipments);
   }, []);

   // Load Initial Project (Edit Mode)
   useEffect(() => {
      if (initialProject) {
         setPorts(initialProject.ports);
         setVoltage(initialProject.voltageSystem);
         setProjectName(initialProject.name);
         setSaveDesc(initialProject.description || '');
         setTechResponsible(initialProject.technicalResponsible || '');
         if (initialProject.generatorConfig) setGeneratorConfig(initialProject.generatorConfig);
         if (initialProject.mainpowerConfig) setMainpowerConfig(initialProject.mainpowerConfig);
         success(`Editando projeto: ${initialProject.name} `);

         // --- REALTIME SUBSCRIPTION ---
         if (!supabase) return;

         const channel = supabase
            .channel(`distribution_project_${initialProject.id} `)
            .on(
               'postgres_changes',
               {
                  event: 'UPDATE',
                  schema: 'public',
                  table: 'calculations', // All projects are in 'calculations' table
                  filter: `id = eq.${initialProject.id} `
               },
               (payload) => {
                  console.log('🔔 Realtime Update received:', payload);
                  const newProject = payload.new as any;

                  // Optional: Check if we are the ones who triggered this update (to avoid overwrite/jump)
                  // For now, simpler: Just notify or auto-update.
                  // Auto-update to show multiplayer magic:

                  if (newProject.ports) {
                     setPorts(newProject.ports);
                     setVoltage(Number(newProject.voltage_system));
                     setProjectName(newProject.name);
                     setSaveDesc(newProject.description || '');
                     setTechResponsible(newProject.technical_responsible || '');
                     info('Projeto atualizado por outro usuário!');
                  }
               }
            )
            .subscribe((status) => {
               if (status === 'SUBSCRIBED') {
                  console.log(`✅ Listening for updates on project ${initialProject.id} `);
               }
            });

         return () => {
            supabase.removeChannel(channel);
         };
      }
   }, [initialProject]);

   // Load state from localStorage on mount (only if NOT editing)
   useEffect(() => {
      if (initialProject) return; // Don't load if editing existing project

      try {
         const saved = localStorage.getItem(STORAGE_KEY);
         console.log('🔍 [Distribution] Carregando do localStorage:', saved);
         if (saved) {
            const state = JSON.parse(saved);
            console.log('✅ [Distribution] Estado carregado:', state);
            setPorts(state.ports || []);
            setVoltage(state.voltage || 220);
            setProjectName(state.projectName || '');
            if (state.generatorConfig) setGeneratorConfig(state.generatorConfig);
            if (state.mainpowerConfig) setMainpowerConfig(state.mainpowerConfig);
         }
      } catch (error) {
         console.error('❌ [Distribution] Erro ao carregar estado:', error);
      }
   }, []);

   // Save state to localStorage whenever it changes (only if NOT editing)
   useEffect(() => {
      if (initialProject) return; // Don't save if editing existing project

      // Skip saving on first render
      if (isFirstRender.current) {
         isFirstRender.current = false;
         return;
      }

      try {
         const state = {
            ports,
            voltage,
            projectName,
            generatorConfig,
            mainpowerConfig
         };
         console.log('💾 [Distribution] Salvando no localStorage:', state);
         localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (error) {
         console.error('❌ [Distribution] Erro ao salvar estado:', error);
      }
   }, [ports, voltage, projectName, generatorConfig, mainpowerConfig, initialProject]);

   // --- LOGIC ---

   // CREATE OR EDIT PORT
   const handleSavePort = (e: React.FormEvent) => {
      e.preventDefault();

      if (editingPortId) {
         // Edit Mode
         setPorts(ports.map(p => {
            if (p.id === editingPortId) {
               return {
                  ...p,
                  name: portFormData.name,
                  abbreviation: portFormData.abbr.toUpperCase().slice(0, 5),
                  color: portFormData.color,
                  breakerAmps: Number(portFormData.amps)
               };
            }
            return p;
         }));
         success('Circuito atualizado!');
      } else {
         // Create Mode
         const newPort: Port = {
            id: Date.now().toString(36) + Math.random().toString(36).slice(2),
            name: portFormData.name,
            abbreviation: portFormData.abbr.toUpperCase().slice(0, 5),
            color: portFormData.color,
            breakerAmps: Number(portFormData.amps),
            items: []
         };
         setPorts([...ports, newPort]);
         success('Circuito criado!');
      }

      setIsPortModalOpen(false);
      setEditingPortId(null);
      setPortFormData({ name: '', abbr: '', amps: 32, color: PORT_COLORS[7].value });
   };

   const openNewPortModal = () => {
      setEditingPortId(null);
      setPortFormData({ name: '', abbr: '', amps: 32, color: PORT_COLORS[Math.floor(Math.random() * PORT_COLORS.length)].value });
      setIsPortModalOpen(true);
   };

   const openEditPortModal = (port: Port) => {
      setEditingPortId(port.id);
      setPortFormData({
         name: port.name,
         abbr: port.abbreviation,
         amps: port.breakerAmps,
         color: port.color
      });
      setIsPortModalOpen(true);
   };

   // BULK CREATE LOGIC
   const handleBulkCreate = (e: React.FormEvent) => {
      e.preventDefault();
      const newPorts: Port[] = [];

      // Start generating
      for (let i = 1; i <= bulkData.quantity; i++) {
         // Cycle through colors to make it pretty
         const colorIndex = (ports.length + i) % PORT_COLORS.length;

         newPorts.push({
            id: Date.now().toString(36) + Math.random().toString(36).slice(2),
            name: `${bulkData.prefix} ${i} `,
            abbreviation: `${bulkData.prefix.substring(0, 3).toUpperCase()}${i} `,
            breakerAmps: Number(bulkData.amps),
            color: PORT_COLORS[colorIndex].value,
            items: []
         });
      }

      setPorts([...ports, ...newPorts]);
      setIsBulkModalOpen(false);
      success(`${bulkData.quantity} circuitos gerados!`);
   };



   const removePort = async (id: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      const confirmed = await confirm({
         title: 'Remover Circuito',
         message: 'Tem certeza que deseja remover este circuito e todos os equipamentos nele?',
         variant: 'danger',
         confirmText: 'Remover',
         cancelText: 'Cancelar'
      });

      if (confirmed) {
         setPorts(ports.filter(p => p.id !== id));
         success('Circuito removido.');
      }
   };

   const resetAllPorts = async () => {
      if (ports.length === 0) return;
      const confirmed = await confirm({
         title: 'Limpar Tudo',
         message: 'ATENÇÃO: Isso apagará todos os circuitos e configurações atuais. Deseja continuar?',
         variant: 'warning',
         confirmText: 'Limpar Tudo',
         cancelText: 'Cancelar'
      });

      if (confirmed) {
         setPorts([]);
         setVoltage(220);
         setProjectName('');
         localStorage.removeItem(STORAGE_KEY);
         info('Todos os dados foram limpos.');
      }
   };

   // --- FUNÇÕES DE BALANCEAMENTO DE FASES ---

   const handleGeneratorChange = (config: GeneratorConfig) => {
      setGeneratorConfig(config);
      success('Configuração do gerador atualizada!');
   };

   const handleMainpowerChange = (config: MainpowerConfig) => {
      // Se ativou o auto-balanceamento, aplicar imediatamente
      if (config.autoBalance && !mainpowerConfig.autoBalance && ports.length > 0) {
         const balanced = balancePhases(ports, voltage, config);
         setMainpowerConfig(balanced);
         success('Balanceamento automático aplicado!');
      } else {
         setMainpowerConfig(config);
      }
   };

   const applyAutoBalance = () => {
      if (ports.length === 0) {
         info('Adicione circuitos para balancear.');
         return;
      }

      const balanced = balancePhases(ports, voltage, mainpowerConfig);
      setMainpowerConfig(balanced);
      success('Balanceamento automático aplicado!');
   };

   // Atualizar cargas das fases quando circuitos mudarem
   useEffect(() => {
      if (mainpowerConfig.enabled && mainpowerConfig.autoBalance && ports.length > 0) {
         const updated = updatePhaseLoads(mainpowerConfig, ports, voltage);
         // Só atualizar se houver mudança real nas cargas
         const hasChanged = updated.phases.some((phase, idx) =>
            Math.abs(phase.currentLoad - mainpowerConfig.phases[idx].currentLoad) > 0.01
         );
         if (hasChanged) {
            setMainpowerConfig(updated);
         }
      }
   }, [ports, voltage, mainpowerConfig.enabled, mainpowerConfig.autoBalance]);

   const openEquipModal = (portId: string) => {
      setActivePortId(portId);
      setSearchQuery('');
      setIsEquipModalOpen(true);
   };

   const addItemToPort = (equipment: Equipment) => {
      if (!activePortId) return;

      if (!isCompatible(voltage, equipment.voltage)) {
         error(`Bloqueado: Item ${equipment.voltage}V incompatível com sistema ${voltage} V`);
         return;
      }

      setPorts(ports.map(p => {
         if (p.id !== activePortId) return p;

         const existingItem = p.items.find(i => i.equipmentId === equipment.id);
         let newItems;
         if (existingItem) {
            newItems = p.items.map(i => i.equipmentId === equipment.id ? { ...i, quantity: i.quantity + 1 } : i);
         } else {
            newItems = [...p.items, { equipmentId: equipment.id, quantity: 1, equipment }];
         }
         return { ...p, items: newItems };
      }));
      success('Equipamento adicionado!');
      // Keep modal open for faster adding
      // setIsEquipModalOpen(false);
   };

   const updateItemQty = (portId: string, itemId: string, change: number) => {
      setPorts(ports.map(p => {
         if (p.id !== portId) return p;
         const newItems = p.items.map(i => {
            if (i.equipmentId === itemId) return { ...i, quantity: i.quantity + change };
            return i;
         }).filter(i => i.quantity > 0);
         return { ...p, items: newItems };
      }));
   };

   const removeItemFromPort = (portId: string, itemId: string) => {
      setPorts(ports.map(p => {
         if (p.id !== portId) return p;
         return {
            ...p,
            items: p.items.filter(i => i.equipmentId !== itemId)
         };
      }));
      success('Equipamento removido do circuito.');
   };

   // --- CALCULATIONS ---

   // --- DRAG AND DROP LOGIC ---
   const [draggedItem, setDraggedItem] = useState<{ portIndex: number; itemIndex: number } | null>(null);

   const handleDragStart = (e: React.DragEvent, portIndex: number, itemIndex: number) => {
      setDraggedItem({ portIndex, itemIndex });
      e.dataTransfer.effectAllowed = 'move';
      // Visual drag ghost customization can go here
   };

   const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
   };

   const handleDrop = (e: React.DragEvent, targetPortIndex: number) => {
      e.preventDefault();
      if (!draggedItem) return;

      const { portIndex: sourcePortIndex, itemIndex } = draggedItem;

      // Se for o mesmo porto, ignorar
      if (sourcePortIndex === targetPortIndex) {
         setDraggedItem(null);
         return;
      }

      // Abrir modal para escolher entre mover ou copiar
      setMoveOrCopyModal({
         isOpen: true,
         sourcePortIndex,
         targetPortIndex,
         itemIndex
      });

      setDraggedItem(null);
   };

   const handleMoveItem = () => {
      if (!moveOrCopyModal) return;

      const { sourcePortIndex, targetPortIndex, itemIndex } = moveOrCopyModal;
      const newPorts = [...ports];
      const sourcePort = newPorts[sourcePortIndex];
      const targetPort = newPorts[targetPortIndex];

      // Remover do origem
      const [itemToMove] = sourcePort.items.splice(itemIndex, 1);

      // Adicionar ao destino
      targetPort.items.push(itemToMove);

      setPorts(newPorts);
      success(`Item movido para ${targetPort.name} `);
      setMoveOrCopyModal(null);
   };

   const handleCopyItem = () => {
      if (!moveOrCopyModal) return;

      const { sourcePortIndex, targetPortIndex, itemIndex } = moveOrCopyModal;
      const newPorts = [...ports];
      const sourcePort = newPorts[sourcePortIndex];
      const targetPort = newPorts[targetPortIndex];

      // Copiar item (mantém no origem)
      const itemToCopy = { ...sourcePort.items[itemIndex] };

      // Adicionar ao destino
      targetPort.items.push(itemToCopy);

      setPorts(newPorts);
      success(`Item copiado para ${targetPort.name} `);
      setMoveOrCopyModal(null);
   };

   const getPortTotals = (port: Port) => {
      let watts = 0;
      let va = 0;
      let amps = 0;

      port.items.forEach(i => {
         const w = i.equipment.watts * i.quantity;
         const pf = i.equipment.powerFactor || 1;

         watts += w;
         va += w / pf;
         amps += w / (voltage * pf);
      });
      return { watts, va, amps };
   };

   const globalTotals = useMemo(() => {
      let totalWatts = 0;
      let totalVA = 0;
      let totalAmperes = 0;

      ports.forEach(p => {
         const t = getPortTotals(p);
         totalWatts += t.watts;
         totalVA += t.va;
         totalAmperes += t.amps;
      });

      return { totalWatts, totalVA, totalAmperes };
   }, [ports, voltage]);

   const handleSave = async () => {
      if (!projectName) {
         error("Dê um nome ao projeto.");
         return;
      }

      // VALIDATION: Check all circuits have valid breaker amperage
      const portsWithoutBreaker = ports.filter(p => !p.breakerAmps || p.breakerAmps <= 0);

      if (portsWithoutBreaker.length > 0) {
         const circuitNames = portsWithoutBreaker.map(p => p.name).join(', ');
         error(`Bloqueado: Configure a amperagem do disjuntor para os circuitos: ${circuitNames} `);
         return;
      }

      const project: DistributionProject = {
         id: initialProject ? initialProject.id : '', // Keep ID if editing
         type: 'distribution',
         name: projectName,
         description: saveDesc,
         technicalResponsible: techResponsible,
         voltageSystem: voltage,
         ports: ports,
         totalWatts: globalTotals.totalWatts,
         totalAmperes: globalTotals.totalAmperes,
         createdAt: '',
         generatorConfig: generatorConfig.enabled ? generatorConfig : undefined,
         mainpowerConfig: mainpowerConfig.enabled ? mainpowerConfig : undefined
      };

      try {
         await DataService.saveDistribution(project);
         setIsSaveModalOpen(false);
         setSaveDesc('');
         setProjectName('');
         setTechResponsible('');
         success("Projeto salvo com sucesso!");
      } catch (e) {
         console.error(e);
         error("Erro ao salvar projeto.");
      }

      // Clear edit mode after save
      if (onClearEdit) onClearEdit();
   };

   // Filter for modal
   const filteredEquipmentsToAdd = equipments.filter(eq =>
      eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.brand.toLowerCase().includes(searchQuery.toLowerCase())
   );

   // --- RENDER ---

   return (
      <div className="animate-fade-in pb-20 relative">
         <ConfirmModalComponent />

         {/* Modal Mover/Copiar */}
         {moveOrCopyModal && (
            <MoveOrCopyModal
               isOpen={moveOrCopyModal.isOpen}
               onClose={() => setMoveOrCopyModal(null)}
               onMove={handleMoveItem}
               onCopy={handleCopyItem}
               itemName={ports[moveOrCopyModal.sourcePortIndex]?.items[moveOrCopyModal.itemIndex]?.equipment.name || ''}
               sourceCircuit={ports[moveOrCopyModal.sourcePortIndex]?.name || ''}
               targetCircuit={ports[moveOrCopyModal.targetPortIndex]?.name || ''}
            />
         )}

         {/* HEADER */}
         <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
               <div className="flex items-center gap-3 mb-2">
                  <div className="p-2.5 bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl shadow-lg shadow-purple-900/20">
                     <FolderKanban className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-3xl font-bold text-white tracking-tight">Distribuição</h1>
               </div>
               <p className="text-slate-400 text-sm">Gerencie múltiplos circuitos e balanceamento de carga</p>
            </div>

            <div className="flex gap-3 items-center">
               <div className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 flex flex-col items-end min-w-[140px]">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Total Sistema</span>
                  <span className="text-xl font-bold text-yellow-500 leading-none">{(globalTotals.totalVA / 1000).toFixed(1)} <span className="text-sm text-slate-400 font-normal">kVA</span></span>
               </div>

               <button
                  onClick={() => ExportService.exportDistributionProject({ name: projectName || 'Projeto_Distribuicao', ports, voltageSystem: voltage })}
                  disabled={ports.length === 0}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
                  title="Exportar CSV"
               >
                  <Download className="w-4 h-4" />
               </button>

               <button
                  onClick={() => setIsSaveModalOpen(true)}
                  disabled={ports.length === 0}
                  className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all shadow-purple-900/20"
               >
                  <Save className="w-4 h-4" /> Salvar
               </button>
            </div>
         </div>

         {/* POWER CONFIG PANEL REMOVED (Moved to Power System tab) */}

         {/* SETTINGS BAR */}
         <div className="bg-surface border border-slate-700/50 rounded-xl p-3 mb-6 flex flex-wrap gap-4 items-center justify-between shadow-lg">
            <div className="flex items-center gap-4">
               <div>
                  <label className="text-[10px] text-slate-500 block font-bold mb-1 uppercase">Tensão Global</label>
                  <div className="relative">
                     <select value={voltage} onChange={e => setVoltage(Number(e.target.value))} className="bg-slate-900 border border-slate-700 text-white text-sm rounded-lg px-3 py-1.5 outline-none focus:border-purple-500 font-mono">
                        <option value={110}>110V</option>
                        <option value={208}>208V</option>
                        <option value={220}>220V</option>
                        <option value={380}>380V</option>
                     </select>
                  </div>
               </div>

               {ports.length > 0 && (
                  <div className="flex gap-2">
                     <button
                        onClick={resetAllPorts}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-red-500/10 border border-slate-700 hover:border-red-500/30 rounded-lg text-xs text-slate-400 hover:text-red-400 transition-all active:scale-95 h-9"
                        title="Limpar todos os dados"
                     >
                        <RotateCcw className="w-3.5 h-3.5" /> Limpar Tudo
                     </button>
                  </div>
               )}
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
               <button onClick={() => setIsBulkModalOpen(true)} className="flex-1 sm:flex-none items-center justify-center gap-2 text-xs bg-slate-800 hover:bg-slate-700 text-blue-300 px-4 py-2.5 rounded-lg border border-slate-700 active:scale-95 flex transition-colors font-medium">
                  <Wrench className="w-3.5 h-3.5" /> Assistente
               </button>
               <button onClick={openNewPortModal} className="flex-1 sm:flex-none items-center justify-center gap-2 text-xs bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-lg border border-slate-700 active:scale-95 flex transition-colors font-bold shadow-sm">
                  <Plus className="w-3.5 h-3.5" /> Novo Circuito
               </button>
            </div>
         </div>

         {/* EMPTY STATE */}
         {ports.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500 border border-dashed border-slate-800 rounded-xl bg-surface/30">
               <div className="bg-slate-800/50 p-4 rounded-full mb-4 ring-1 ring-slate-700">
                  <FolderKanban className="w-12 h-12 opacity-50 text-purple-500" />
               </div>
               <p className="text-base font-bold text-white mb-1">Nenhum circuito criado</p>
               <p className="text-sm text-slate-400 text-center max-w-xs mb-6">Comece criando circuitos para distribuir e organizar a carga elétrica do seu evento.</p>
               <button onClick={openNewPortModal} className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-purple-900/20 flex items-center gap-2 transition-colors">
                  <Plus className="w-4 h-4" /> Criar Primeiro Circuito
               </button>
            </div>
         ) : (
            /* PORTS GRID */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
               {ports.map((port, index) => {
                  const totals = getPortTotals(port);
                  const loadPercent = port.breakerAmps > 0 ? (totals.amps / port.breakerAmps) * 100 : 0;

                  // Cable specifications
                  const cableSpecs = getCableSpecs(totals.amps);

                  // Status Logic
                  let status = { color: 'emerald', text: 'SEGURO', icon: ShieldCheck };
                  if (loadPercent > 100) status = { color: 'red', text: 'SOBRECARGA', icon: Flame };
                  else if (loadPercent > 80) status = { color: 'orange', text: 'ATENÇÃO', icon: AlertTriangle };

                  return (
                     <div
                        key={port.id}
                        className={`
                           bg-surface rounded-xl border transition-all duration-300 flex flex-col relative overflow-hidden group/card hover:shadow-xl
                              ${status.color === 'red' ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)]' :
                              status.color === 'orange' ? 'border-orange-500/50' : 'border-slate-700 hover:border-slate-600'
                           }
                              ${draggedItem && draggedItem.portIndex !== index ? 'border-dashed border-blue-500 bg-blue-500/5 ring-2 ring-blue-500/20' : ''}
                           animate-in fade-in zoom-in-95
                        `}
                        style={{ animationDelay: `${index * 0.05}s` }}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                     >
                        {/* Color Tag Line */}
                        <div className="h-1.5 w-full shrink-0" style={{ backgroundColor: port.color }}></div>

                        {/* Header */}
                        <div className="p-4 border-b border-slate-700/50 bg-slate-800/30">
                           <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-2 overflow-hidden">
                                 <span className="text-[10px] font-bold text-slate-900 px-1.5 py-0.5 rounded shrink-0 shadow-sm" style={{ backgroundColor: port.color }}>
                                    {port.abbreviation || 'CIRT'}
                                 </span>
                                 <h3 className="text-lg font-bold text-white truncate" title={port.name}>{port.name}</h3>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                 <button
                                    onClick={() => openEditPortModal(port)}
                                    className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-slate-700 transition-colors"
                                    title="Editar Circuito"
                                 >
                                    <Edit2 className="w-3.5 h-3.5" />
                                 </button>
                                 <button
                                    onClick={(e) => removePort(port.id, e)}
                                    className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                                    title="Remover Circuito"
                                 >
                                    <Trash2 className="w-3.5 h-3.5" />
                                 </button>
                              </div>
                           </div>

                           <div className="flex items-center gap-2 text-xs text-slate-400 mb-2 font-mono">
                              <Zap className="w-3 h-3 text-slate-500" /> Disjuntor: <span className="text-white bg-slate-700 px-1.5 rounded">{port.breakerAmps}A</span>
                           </div>

                           {/* Cable Specs */}
                           <div className="grid grid-cols-2 gap-2 mb-3">
                              <div className="flex items-center gap-1.5 text-xs">
                                 <Cable className="w-3 h-3 text-slate-500 shrink-0" />
                                 <span className="text-slate-500 text-[10px]">Cabo:</span>
                                 <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-xs ${getCableColorClass(cableSpecs.color)}`}>
                                    {cableSpecs.gauge}mm²
                                 </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs">
                                 <Plug className="w-3 h-3 text-slate-500 shrink-0" />
                                 <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${getCableColorClass(cableSpecs.color)} truncate`} title={cableSpecs.connectorType}>
                                    {cableSpecs.connectorAmps}A
                                 </span>
                              </div>
                           </div>

                           {/* Alert Status Box */}
                           <div className={`
                              flex items-center gap-3 p-2.5 rounded-lg border mb-3 transition-colors
                              ${status.color === 'red' ? 'bg-red-500/10 border-red-500/30 text-red-200' :
                                 status.color === 'orange' ? 'bg-orange-500/10 border-orange-500/30 text-orange-200' :
                                    'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                              }
                           `}>
                              <status.icon className={`w-5 h-5 shrink-0 ${status.color === 'red' ? 'animate-pulse' : ''}`} />
                              <div className="overflow-hidden flex-1">
                                 <div className="font-bold text-xs truncate">{status.text}</div>
                                 <div className="text-[10px] opacity-80">{loadPercent.toFixed(1)}% carga</div>
                              </div>
                              <div className="ml-auto text-lg font-bold font-mono tracking-tight">
                                 {totals.amps.toFixed(1)}A
                              </div>
                           </div>

                           {/* Load Bar */}
                           <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                              <div
                                 className={`h-full transition-all duration-500 ${status.color === 'red' ? 'bg-red-500' :
                                    status.color === 'orange' ? 'bg-orange-500' : 'bg-emerald-500'
                                    }`}
                                 style={{ width: `${Math.min(loadPercent, 100)}%` }}
                              ></div>
                           </div>
                        </div>

                        {/* Items List */}
                        <div className="flex-1 p-2 overflow-y-auto max-h-[300px] min-h-[150px] space-y-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                           {port.items.length === 0 ? (
                              <div className="h-full flex flex-col items-center justify-center text-slate-600 text-sm py-8">
                                 <LayoutGrid className="w-8 h-8 opacity-20 mb-2" />
                                 <p className="text-xs">Sem equipamentos</p>
                                 <button onClick={() => openEquipModal(port.id)} className="text-purple-400 hover:text-purple-300 hover:underline mt-2 text-xs font-medium">Adicionar agora</button>
                              </div>
                           ) : (
                              port.items.map((item, idx) => (
                                 <div
                                    key={item.equipmentId}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, index, idx)}
                                    className={`
                                       flex items-center justify-between p-2 rounded-lg group border border-transparent transition-colors cursor-grab active:cursor-grabbing
                                       ${draggedItem?.portIndex === index && draggedItem?.itemIndex === idx ? 'opacity-50 bg-slate-800 border-dashed border-slate-600' : 'hover:bg-slate-800 hover:border-slate-700'}
                                    `}
                                 >
                                    <div className="overflow-hidden pr-2">
                                       <div className="text-xs sm:text-sm font-bold text-slate-300 group-hover:text-white transition-colors truncate">{item.equipment.name}</div>
                                       <div className="text-[10px] text-slate-500 flex gap-1 font-mono">
                                          <span>{item.equipment.watts}W</span>
                                          <span>•</span>
                                          <span>FP {item.equipment.powerFactor}</span>
                                       </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                       <QuantityInput
                                          value={item.quantity}
                                          onChange={(newQty) => updateItemQty(port.id, item.equipmentId, newQty - item.quantity)}
                                          min={1}
                                       />
                                       <button
                                          onClick={() => removeItemFromPort(port.id, item.equipmentId)}
                                          className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                                          title="Remover item"
                                       >
                                          <X className="w-4 h-4" />
                                       </button>
                                    </div>
                                 </div>
                              ))
                           )}
                        </div>

                        {/* Footer Action */}
                        <div className="p-3 border-t border-slate-700/50 shrink-0 bg-slate-800/20">
                           <button
                              onClick={() => openEquipModal(port.id)}
                              className="w-full py-2 rounded-lg border border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-purple-500 hover:bg-purple-500/10 text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 group"
                           >
                              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" /> Adicionar Equipamento
                           </button>

                           {status.color === 'red' && (
                              <div className="mt-2 text-[10px] text-red-400 flex items-center justify-center gap-1 font-bold animate-pulse bg-red-950/30 rounded py-1">
                                 <Flame className="w-3 h-3" /> SOBRECARGA DETECTADA
                              </div>
                           )}
                        </div>
                     </div>
                  );
               })}
            </div>
         )}

         {/* MODAL DE CRIAÇÃO RÁPIDA (BULK) */}
         {isBulkModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
               <div className="bg-surface border border-slate-700 rounded-xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="p-5 border-b border-slate-700 bg-slate-900 rounded-t-xl flex justify-between items-center">
                     <h3 className="font-bold text-white flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-blue-400" /> Assistente de Criação
                     </h3>
                     <button onClick={() => setIsBulkModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
                  </div>
                  <form onSubmit={handleBulkCreate} className="p-6 space-y-4">
                     <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-lg text-xs text-blue-200 mb-4">
                        Crie múltiplos circuitos de uma vez com o mesmo padrão.
                     </div>
                     <div>
                        <label className="block text-sm text-slate-400 mb-1">Quantidade</label>
                        <input required type="number" min="1" max="50" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none transition-colors"
                           value={bulkData.quantity}
                           onChange={e => setBulkData({ ...bulkData, quantity: Number(e.target.value) })}
                        />
                     </div>
                     <div>
                        <label className="block text-sm text-slate-400 mb-1">Prefixo do Nome</label>
                        <input required className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none transition-colors"
                           placeholder="Ex: Dimmer, Canal, Aux"
                           value={bulkData.prefix}
                           onChange={e => setBulkData({ ...bulkData, prefix: e.target.value })}
                        />
                     </div>
                     <div>
                        <label className="block text-sm text-slate-400 mb-1">Amperagem Padrão (A)</label>
                        <input required type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-blue-500 outline-none transition-colors"
                           value={bulkData.amps}
                           onChange={e => setBulkData({ ...bulkData, amps: Number(e.target.value) })}
                        />
                     </div>

                     <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg mt-4 shadow-lg active:scale-95 transition-all">
                        Gerar Circuitos
                     </button>
                  </form>
               </div>
            </div>
         )}

         {/* MODAL DE NOVO/EDITAR CIRCUITO */}
         {isPortModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
               <div className="bg-surface border border-slate-700 rounded-xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 my-auto">
                  <div className="p-5 border-b border-slate-700 bg-slate-900 rounded-t-xl flex justify-between items-center">
                     <h3 className="font-bold text-white flex items-center gap-2">
                        <Settings className="w-4 h-4 text-purple-500" /> {editingPortId ? 'Editar Circuito' : 'Novo Circuito'}
                     </h3>
                     <button onClick={() => setIsPortModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
                  </div>
                  <form onSubmit={handleSavePort} className="p-6 space-y-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Nome do Circuito</label>
                        <input required autoFocus className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-purple-500 outline-none transition-colors placeholder:text-slate-600"
                           placeholder="Ex: Dimmer 1, Palco, Som"
                           value={portFormData.name}
                           onChange={e => setPortFormData({ ...portFormData, name: e.target.value })}
                        />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Abreviação</label>
                           <input required maxLength={5} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:border-purple-500 outline-none uppercase font-mono transition-colors"
                              placeholder="DIM1"
                              value={portFormData.abbr}
                              onChange={e => setPortFormData({ ...portFormData, abbr: e.target.value })}
                           />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Disjuntor (A)</label>
                           <input required type="number" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:border-purple-500 outline-none font-mono transition-colors"
                              placeholder="32"
                              value={portFormData.amps}
                              onChange={e => setPortFormData({ ...portFormData, amps: Number(e.target.value) })}
                           />
                        </div>
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Tag de Cor</label>
                        <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto p-1">
                           {PORT_COLORS.map(c => (
                              <button
                                 type="button"
                                 key={c.value}
                                 onClick={() => setPortFormData({ ...portFormData, color: c.value })}
                                 className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${c.bg} ${portFormData.color === c.value ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'}`}
                                 title={c.label}
                              />
                           ))}
                        </div>
                     </div>

                     <button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg mt-4 shadow-lg active:scale-95 transition-all">
                        {editingPortId ? 'Salvar Alterações' : 'Criar Circuito'}
                     </button>
                  </form>
               </div>
            </div>
         )}

         {/* MODAL DE ADICIONAR EQUIPAMENTO */}
         {isEquipModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
               <div className="bg-surface border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh] my-auto">
                  <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900 rounded-t-xl shrink-0">
                     <h3 className="font-bold text-white flex items-center gap-2">
                        <Plus className="w-5 h-5 text-purple-500" /> Adicionar ao Circuito
                     </h3>
                     <button onClick={() => setIsEquipModalOpen(false)}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
                  </div>

                  <div className="p-3 border-b border-slate-700 bg-slate-900/50">
                     <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                           autoFocus
                           className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-slate-500 focus:border-purple-500 outline-none"
                           placeholder="Buscar equipamento..."
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                        />
                     </div>
                  </div>

                  <div className="overflow-y-auto p-2 space-y-2 flex-1 scrollbar-thin scrollbar-thumb-slate-700">
                     {filteredEquipmentsToAdd.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                           <p>Nenhum equipamento encontrado.</p>
                        </div>
                     ) : (
                        filteredEquipmentsToAdd.map(eq => (
                           <button
                              key={eq.id}
                              onClick={() => addItemToPort(eq)}
                              className="w-full text-left p-3.5 bg-slate-800/40 hover:bg-slate-700 rounded-lg flex items-center justify-between group transition-colors border border-transparent hover:border-slate-600 active:bg-slate-700/80"
                           >
                              <div className="overflow-hidden">
                                 <div className="text-white font-bold text-sm truncate group-hover:text-purple-300 transition-colors">{eq.name}</div>
                                 <div className="text-xs text-slate-400 font-mono mt-0.5">{eq.watts}W • {eq.voltage}V</div>
                              </div>
                              <div className="bg-purple-500/10 p-1.5 rounded-lg text-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-all">
                                 <Plus className="w-4 h-4" />
                              </div>
                           </button>
                        ))
                     )}
                  </div>
               </div>
            </div>
         )}

         {/* MODAL DE SALVAR PROJETO */}
         {isSaveModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
               <div className="bg-surface border border-slate-700 rounded-xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 my-auto">
                  <div className="p-6">
                     <div className="flex items-center gap-3 mb-6 text-purple-400">
                        <div className="p-2 bg-purple-500/10 rounded-lg">
                           <FolderKanban className="w-6 h-6" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Salvar Projeto</h2>
                     </div>

                     <div className="space-y-4">
                        <div>
                           <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Nome do Projeto / Evento</label>
                           <input
                              autoFocus
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-purple-500 outline-none transition-colors placeholder:text-slate-600"
                              value={projectName}
                              onChange={(e) => setProjectName(e.target.value)}
                              placeholder="Ex: Palco Mundo - Rock in Rio"
                           />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Responsável Técnico</label>
                           <input
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-purple-500 outline-none transition-colors placeholder:text-slate-600"
                              value={techResponsible}
                              onChange={(e) => setTechResponsible(e.target.value)}
                              placeholder="Nome do responsável"
                           />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Observações</label>
                           <textarea
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-purple-500 outline-none resize-none h-24 placeholder:text-slate-600"
                              value={saveDesc}
                              onChange={(e) => setSaveDesc(e.target.value)}
                              placeholder="Localização, data, detalhes..."
                           />
                        </div>
                     </div>

                     {/* ALERTS */}
                     {(() => {
                        const missingBreakers = ports.filter(p => !p.breakerAmps || p.breakerAmps <= 0);
                        const overloadedPorts = ports.filter(p => {
                           const metrics = getPortTotals(p);
                           const breaker = p.breakerAmps;
                           return breaker > 0 && metrics.amps > breaker;
                        });

                        return (
                           <>
                              {missingBreakers.length > 0 && (
                                 <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                    <div>
                                       <p className="text-yellow-300 text-xs font-bold uppercase mb-0.5">Disjuntores Faltando</p>
                                       <p className="text-yellow-200/70 text-xs">
                                          Os seguintes circuitos precisam ter a amperagem do disjuntor definida: <span className="font-bold">{missingBreakers.map(p => p.name).join(', ')}</span>
                                       </p>
                                    </div>
                                 </div>
                              )}

                              {overloadedPorts.length > 0 && (
                                 <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3 animate-pulse">
                                    <Flame className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                    <div>
                                       <p className="text-red-300 text-xs font-bold uppercase mb-0.5">Atenção: Sobrecarga Detectada</p>
                                       <p className="text-red-200/70 text-xs">
                                          Os seguintes circuitos estão sobrecarregados: <span className="font-bold">{overloadedPorts.map(p => p.name).join(', ')}</span>
                                       </p>
                                    </div>
                                 </div>
                              )}
                           </>
                        );
                     })()}

                  </div>
                  <div className="flex gap-3 mt-6">
                     <button onClick={() => setIsSaveModalOpen(false)} className="flex-1 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors">Cancelar</button>
                     <button onClick={handleSave} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold shadow-lg shadow-purple-900/20 active:scale-95 transition-all">Salvar Projeto</button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};