import React, { useState, useMemo, useEffect } from 'react';
import { Calculator, Save, Plus, Trash2, ArrowRight, Zap, AlertTriangle, Info, X, ShieldCheck, Flame, Cable, Search, Download, RotateCcw } from 'lucide-react';
import { Equipment, CalculationItem } from '../types';
import { DataService } from '../services/supabaseClient';
import { useToast } from './Toast';
import { ExportService } from '../services/ExportService';
import { isCompatible } from '../services/utils';
import { useConfirm } from './ConfirmModal';
import { QuantityInput } from './QuantityInput';

const STORAGE_KEY = 'lightload_calculator_state';

export const CalculatorView: React.FC = () => {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [networkVoltage, setNetworkVoltage] = useState(220);
  const [phases, setPhases] = useState<1 | 3>(1); // Single or Three-phase
  const [circuitBreaker, setCircuitBreaker] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<CalculationItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); // New search state
  const isFirstRender = React.useRef(true);

  // Save Modal State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');

  const { success, error } = useToast();
  const { confirm, ConfirmModalComponent } = useConfirm();

  useEffect(() => {
    DataService.getEquipments().then(setEquipments);
  }, []);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      console.log('🔍 Carregando do localStorage:', saved);
      if (saved) {
        const state = JSON.parse(saved);
        console.log('✅ Estado carregado:', state);
        setSelectedItems(state.selectedItems || []);
        setNetworkVoltage(state.networkVoltage || 220);
        setPhases(state.phases || 1);
        setCircuitBreaker(state.circuitBreaker || '');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar estado:', error);
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    // Skip saving on first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    try {
      const state = {
        selectedItems,
        networkVoltage,
        phases,
        circuitBreaker
      };
      console.log('💾 Salvando no localStorage:', state);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('❌ Erro ao salvar estado:', error);
    }
  }, [selectedItems, networkVoltage, phases, circuitBreaker]);

  // --- Logic ---
  const addItem = (equipment: Equipment) => {
    if (!isCompatible(networkVoltage, equipment.voltage)) {
      error(`Bloqueado: Tensão incompatível (${equipment.voltage}V em rede ${networkVoltage}V)`);
      return;
    }
    const existing = selectedItems.find(i => i.equipmentId === equipment.id);
    if (existing) {
      setSelectedItems(selectedItems.map(i =>
        i.equipmentId === equipment.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
      success('Quantidade atualizada!');
    } else {
      setSelectedItems([...selectedItems, { equipmentId: equipment.id, quantity: 1, equipment }]);
      success('Equipamento adicionado!');
    }
    // Don't close immediately to allow adding more
    // setIsAdding(false); 
  };

  const updateQuantity = async (id: string, qty: number) => {
    if (qty < 1) {
      const confirmed = await confirm({
        title: 'Remover Item',
        message: 'Tem certeza que deseja remover este item da lista?',
        variant: 'danger',
        confirmText: 'Remover',
        cancelText: 'Cancelar'
      });

      if (confirmed) {
        setSelectedItems(selectedItems.filter(i => i.equipmentId !== id));
        success('Item removido.');
      }
      return;
    }
    setSelectedItems(selectedItems.map(i =>
      i.equipmentId === id ? { ...i, quantity: qty } : i
    ));
  };

  /* --- CHANGED: Prevent saving if critical? No, just warn. */
  const handleSave = async () => {
    if (!saveName) {
      error('Por favor, dê um nome ao cálculo.');
      return;
    }
    try {
      await DataService.saveCalculation({
        id: '',
        type: 'simple',
        name: saveName,
        description: saveDesc,
        voltageSystem: networkVoltage,
        items: selectedItems,
        totalWatts: totals.totalWatts,
        totalAmperes: totals.totalAmperes,
        createdAt: ''
      });
      setIsSaveModalOpen(false);
      setSaveName('');
      setSaveDesc('');
      success('Cálculo salvo com sucesso!');
    } catch (err) {
      error('Erro ao salvar o cálculo.');
    }
  };

  const totals = useMemo(() => {
    let totalWatts = 0;
    let totalVA = 0; // Apparent Power
    let totalAmperes = 0;
    let totalCount = 0;

    selectedItems.forEach(item => {
      const q = item.quantity;
      const w = item.equipment.watts;
      const pf = item.equipment.powerFactor || 1;

      const va = w / pf; // Apparent power for this item

      // Amps calculation depends on voltage. Assuming equipment works at network voltage or is transformed.
      // I = W / (V * PF) for single phase load calc per item
      const amps = w / (networkVoltage * pf);

      totalWatts += w * q;
      totalVA += va * q;
      totalAmperes += amps * q;
      totalCount += q;
    });

    // If 3-phase, amperage is distributed (simplified assumption: balanced load)
    // In 3-phase: Total Watts = V * I * sqrt(3) * PF
    // So I_per_phase = Total Watts / (V * sqrt(3) * PF_avg)
    // Or roughly Total Amps (single phase eq) / 3
    const ampsPerPhase = phases === 3 ? totalAmperes / 3 : totalAmperes;

    return { totalWatts, totalVA, totalAmperes, ampsPerPhase, totalCount };
  }, [selectedItems, networkVoltage, phases]);

  const handleClearAll = async () => {
    const confirmed = await confirm({
      title: 'Limpar Tudo',
      message: 'Tem certeza que deseja limpar todos os dados e começar do zero? Esta ação não pode ser desfeita.',
      variant: 'warning',
      confirmText: 'Limpar Tudo',
      cancelText: 'Cancelar'
    });

    if (confirmed) {
      setSelectedItems([]);
      setNetworkVoltage(220);
      setPhases(1);
      setCircuitBreaker('');
      localStorage.removeItem(STORAGE_KEY);
      success('Dados limpos!');
    }
  };

  const percentLoad = circuitBreaker && !isNaN(Number(circuitBreaker)) && Number(circuitBreaker) > 0
    ? (totals.ampsPerPhase / Number(circuitBreaker)) * 100
    : 0;

  // --- Advanced Cable Calculation ---
  const calculateCableDetails = (amps: number, volts: number, isThreePhase: boolean) => {
    if (amps <= 0) return null;

    // Tabela simplificada de capacidade de condução (Cobre, PVC, Ref B1/Unipolar)
    const cableTable = [
      { mm: 1.5, capacity: 15.5 },
      { mm: 2.5, capacity: 21 },
      { mm: 4.0, capacity: 28 },
      { mm: 6.0, capacity: 36 },
      { mm: 10.0, capacity: 50 },
      { mm: 16.0, capacity: 68 },
      { mm: 25.0, capacity: 89 },
      { mm: 35.0, capacity: 111 },
      { mm: 50.0, capacity: 134 },
      { mm: 70.0, capacity: 171 },
      { mm: 95.0, capacity: 207 },
      { mm: 120.0, capacity: 239 },
    ];

    // 1. Encontrar menor bitola que suporta a corrente (Critério de Capacidade)
    const cable = cableTable.find(c => c.capacity >= amps);

    if (!cable) return { mm: '> 120', capacity: 0, maxDistance: 0 };

    // 2. Calcular Distância Máxima por Queda de Tensão (4% limite)
    // Fórmula: L = (e% * V * S) / (k * rho * I)
    // e% = 0.04 (4%)
    // rho (resistividade cobre) ~= 0.0172 ohm.mm²/m
    // k = 2 (monofásico/bifásico) ou 1.732 (trifásico)

    const dropLimit = 0.04; // 4%
    const rho = 0.0172;
    const k = isThreePhase ? 1.732 : 2;

    const maxDist = (dropLimit * volts * cable.mm) / (k * rho * amps);

    return {
      mm: cable.mm,
      capacity: cable.capacity,
      maxDistance: Math.floor(maxDist)
    };
  };

  const cableInfo = useMemo(() =>
    calculateCableDetails(totals.ampsPerPhase, networkVoltage, phases === 3),
    [totals.ampsPerPhase, networkVoltage, phases]);

  // --- Status Helper ---
  const getStatus = () => {
    if (!circuitBreaker) return { status: 'neutral', color: 'slate', icon: Info, text: 'Defina o Disjuntor' };
    if (percentLoad > 100) return { status: 'danger', color: 'red', icon: Flame, text: 'PERIGO: SOBRECARGA' };
    if (percentLoad > 80) return { status: 'warning', color: 'orange', icon: AlertTriangle, text: 'ATENÇÃO: ALTA CARGA' };
    return { status: 'safe', color: 'emerald', icon: ShieldCheck, text: 'SISTEMA SEGURO' };
  };

  const status = getStatus();

  // Filtered equipments for modal
  const filteredEquipmentsToAdd = equipments.filter(eq =>
    eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    eq.brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- Render ---

  return (
    <div className="animate-fade-in pb-20 relative">
      <ConfirmModalComponent />
      <div className="mb-8 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl shadow-lg shadow-emerald-900/20">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Calcular Consumo</h1>
          </div>
          <p className="text-slate-400 text-sm">Dimensione cabos, disjuntores e carga total do sistema</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleClearAll}
            disabled={selectedItems.length === 0}
            className="bg-slate-800 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed text-slate-400 hover:text-red-400 px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all border border-slate-700 hover:border-red-500/30"
            title="Limpar Tudo"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">Limpar</span>
          </button>
          <button
            onClick={() => ExportService.exportCalculation(selectedItems, networkVoltage, 'Calculo_Carga')}
            disabled={selectedItems.length === 0}
            className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all border border-slate-700"
            title="Exportar CSV"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsSaveModalOpen(true)}
            disabled={selectedItems.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span className="hidden sm:inline">Salvar Cálculo</span>
            <span className="sm:hidden">Salvar</span>
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      <div className="bg-surface border border-slate-700/50 rounded-xl p-6 mb-8 shadow-xl bg-gradient-to-br from-surface to-slate-900/50">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-500" /> Configuração da Rede Elétrica
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Tensão da Rede</label>
            <div className="relative">
              <select
                value={networkVoltage}
                onChange={(e) => setNetworkVoltage(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none appearance-none font-mono"
              >
                <option value={110}>110V - 127V</option>
                <option value={208}>208V</option>
                <option value={220}>220V</option>
                <option value={240}>240V</option>
                <option value={380}>380V</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-slate-500"></div>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Fases</label>
            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-700">
              <button
                onClick={() => setPhases(1)}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${phases === 1 ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                Monofásico
              </button>
              <button
                onClick={() => setPhases(3)}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${phases === 3 ? 'bg-slate-700 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                Trifásico
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Disjuntor Disponível (A)</label>
            <input
              type="number"
              placeholder="Ex: 63"
              value={circuitBreaker}
              onChange={(e) => setCircuitBreaker(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500 outline-none font-mono placeholder:text-slate-600"
            />
          </div>
        </div>
      </div>

      {/* Mobile Alert Bar - Fixed at top (only visible on mobile when breaker is set) */}
      {circuitBreaker && (
        <div className="md:hidden sticky top-16 z-40 mb-4 animate-slide-in-down">
          <div className={`
            bg-surface/95 backdrop-blur-md border-b-2 p-3 shadow-lg transition-all duration-300
            ${status.status === 'danger' ? 'border-red-500 bg-red-500/5' :
              status.status === 'warning' ? 'border-orange-500 bg-orange-500/5' :
                'border-emerald-500 bg-emerald-500/5'}
          `}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`
                p-1.5 rounded-full
                ${status.status === 'danger' ? 'bg-red-500 animate-pulse' :
                  status.status === 'warning' ? 'bg-orange-500' :
                    'bg-emerald-500'}
              `}>
                <status.icon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h4 className={`
                  font-bold text-sm
                  ${status.status === 'danger' ? 'text-red-400' :
                    status.status === 'warning' ? 'text-orange-400' :
                      'text-emerald-400'}
                `}>{status.text}</h4>
                <p className="text-xs text-slate-400">
                  <span className="font-bold">{percentLoad.toFixed(1)}%</span> da capacidade
                </p>
              </div>
            </div>

            {/* Compact Progress Bar */}
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
              <div
                className={`h-full transition-all duration-700
                  ${percentLoad > 100 ? 'bg-gradient-to-r from-red-600 to-red-400' :
                    percentLoad > 80 ? 'bg-gradient-to-r from-orange-500 to-yellow-400' :
                      'bg-gradient-to-r from-emerald-600 to-emerald-400'}`}
                style={{ width: `${Math.min(percentLoad, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
              Itens do Cálculo
            </h3>
            <button
              onClick={() => { setIsAdding(!isAdding); setSearchQuery(''); }}
              className="text-sm bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/50 px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 font-bold shadow-lg shadow-black/20"
            >
              <Plus className="w-4 h-4" /> Adicionar Item
            </button>
          </div>

          <div className="bg-surface border border-slate-700/50 rounded-xl min-h-[500px] p-1 flex flex-col relative overflow-hidden shadow-inner bg-slate-900/20">
            {isAdding && (
              <div className="absolute inset-0 z-20 bg-surface flex flex-col animate-slide-in-up">
                <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/80 backdrop-blur-sm">
                  <span className="font-bold text-white flex items-center gap-2">
                    <Plus className="w-5 h-5 text-emerald-500" /> Adicionar Item
                  </span>
                  <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded transition-colors"><X className="w-6 h-6" /></button>
                </div>

                <div className="p-3 border-b border-slate-700 bg-slate-900/50">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      autoFocus
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-slate-500 focus:border-emerald-500 outline-none"
                      placeholder="Buscar por nome ou marca..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="overflow-y-auto p-2 space-y-2 flex-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
                  {filteredEquipmentsToAdd.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <p>Nenhum equipamento encontrado.</p>
                    </div>
                  ) : (
                    filteredEquipmentsToAdd.map(eq => (
                      <button
                        key={eq.id}
                        onClick={() => addItem(eq)}
                        className="w-full text-left p-3 bg-slate-800/40 hover:bg-slate-700 border border-transparent hover:border-slate-600 rounded-lg flex items-center justify-between group transition-all"
                      >
                        <div>
                          <div className="text-white font-bold group-hover:text-emerald-400 transition-colors">{eq.name}</div>
                          <div className="text-xs text-slate-400">{eq.watts}W • {eq.voltage}V • FP {eq.powerFactor}</div>
                        </div>
                        <div className="bg-emerald-500/10 p-2 rounded-lg group-hover:bg-emerald-500 group-hover:text-white transition-all text-emerald-500">
                          <Plus className="w-4 h-4" />
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {selectedItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-12">
                <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mb-4 border border-slate-700 border-dashed">
                  <Plus className="w-8 h-8 opacity-30" />
                </div>
                <p className="font-medium">Nenhum equipamento selecionado</p>
                <p className="text-sm opacity-60 mt-1 max-w-[200px] text-center">Use o botão "Adicionar" acima para compor sua lista de carga.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/50 overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-slate-700">
                {selectedItems.map((item) => (
                  <div key={item.equipmentId} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-800/30 transition-colors gap-3 group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 border border-slate-700 shrink-0 font-bold bg-gradient-to-br from-slate-800 to-slate-900">
                        {item.quantity}x
                      </div>
                      <div>
                        <h4 className="text-white font-bold group-hover:text-emerald-400 transition-colors">{item.equipment.name}</h4>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                          Unid: {item.equipment.watts}W <span className="text-slate-600">|</span> Total: {(item.equipment.watts * item.quantity).toFixed(0)}W
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-2 sm:mt-0">
                      <QuantityInput
                        value={item.quantity}
                        onChange={(newQty) => updateQuantity(item.equipmentId, newQty)}
                        min={1}
                      />
                      <div className="text-right min-w-[90px]">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-0.5">Corrente</div>
                        <div className="text-emerald-400 font-bold font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 inline-block">
                          {((item.equipment.watts / (networkVoltage * (item.equipment.powerFactor || 1))) * item.quantity).toFixed(2)} A
                        </div>
                      </div>

                      <button
                        onClick={() => updateQuantity(item.equipmentId, 0)}
                        className="w-9 h-9 flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Remover Item"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Advanced Summary */}
        <div className="space-y-4">
          <h3 className="font-bold text-white text-lg flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-emerald-500/10 flex items-center justify-center">
              <ArrowRight className="w-4 h-4 text-emerald-500" />
            </div>
            Análise Técnica
          </h3>

          <div className="bg-surface border border-slate-700/50 rounded-xl p-5 space-y-6 shadow-xl sticky top-24">

            {/* --- STATUS CARD (NEW) --- */}
            {circuitBreaker && (
              <div className={`
                  p-4 rounded-xl border transition-all duration-500 relative overflow-hidden
                  ${status.status === 'danger' ? 'bg-red-500/10 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' :
                  status.status === 'warning' ? 'bg-orange-500/10 border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.15)]' :
                    'bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]'}
                `}>
                <div className="flex items-center gap-3 relative z-10">
                  <div className={`
                        p-2.5 rounded-full shadow-lg
                        ${status.status === 'danger' ? 'bg-red-500 text-white animate-pulse' :
                      status.status === 'warning' ? 'bg-orange-500 text-white' :
                        'bg-emerald-500 text-white'}
                      `}>
                    <status.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className={`font-bold text-lg leading-tight ${status.status === 'danger' ? 'text-red-400' :
                      status.status === 'warning' ? 'text-orange-400' :
                        'text-emerald-400'
                      }`}>{status.text}</h4>
                    <p className="text-xs text-slate-300 w-full mt-1">
                      <span className="font-bold">{percentLoad.toFixed(1)}%</span> da capacidade suportada
                    </p>
                  </div>
                </div>

                {/* Background Status Pulse for Danger */}
                {status.status === 'danger' && (
                  <div className="absolute -right-4 -bottom-4 w-28 h-28 bg-red-500/20 blur-2xl rounded-full animate-pulse"></div>
                )}
              </div>
            )}

            {/* Load Bar */}
            {circuitBreaker && (
              <div className="pt-1">
                <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
                  <div
                    className={`h-full transition-all duration-700 ease-out shadow-sm
                        ${percentLoad > 100 ? 'bg-gradient-to-r from-red-600 to-red-400' :
                        percentLoad > 80 ? 'bg-gradient-to-r from-orange-500 to-yellow-400' :
                          'bg-gradient-to-r from-emerald-600 to-emerald-400'}`}
                    style={{ width: `${Math.min(percentLoad, 100)}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Main Numbers */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Potência Ativa</span>
                <div className="text-xl font-bold text-white mt-1">
                  {(totals.totalWatts / 1000).toFixed(2)} <span className="text-sm text-slate-500 font-normal">kW</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1">{totals.totalWatts.toLocaleString('pt-BR')} Watts</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Pot. Aparente</span>
                <div className="text-xl font-bold text-yellow-500 mt-1">
                  {(totals.totalVA / 1000).toFixed(2)} <span className="text-sm text-slate-500 font-normal">kVA</span>
                </div>
              </div>
            </div>

            {/* Current Display */}
            <div className="bg-blue-900/20 rounded-xl p-5 border border-blue-500/30 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 transition-all group-hover:w-1.5"></div>
              <div className="flex justify-between items-end relative z-10">
                <div>
                  <span className="text-blue-200 text-xs font-bold uppercase tracking-wider block mb-1">Corrente Total {phases === 3 ? '(por Fase)' : ''}</span>
                  <div className="text-4xl font-bold text-blue-400 leading-none tracking-tight shadow-blue-900/50 drop-shadow-lg">
                    {totals.ampsPerPhase.toFixed(1)} <span className="text-lg font-normal text-blue-300">A</span>
                  </div>
                </div>
                <Zap className="w-10 h-10 text-blue-500/20 absolute right-0 bottom-0" />
              </div>
              <div className="text-xs text-blue-300/60 mt-3 flex items-center gap-1.5 pt-3 border-t border-blue-500/20">
                <Info className="w-3.5 h-3.5" /> Sistema {phases === 1 ? 'Monofásico' : 'Trifásico Equilibrado'}
              </div>
            </div>

            {/* ALERTS SECTION */}
            <div className="space-y-3 pt-2">
              {selectedItems.some(i => !isCompatible(networkVoltage, i.equipment.voltage)) && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex gap-3 text-sm text-red-200 animate-pulse">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-xs uppercase mb-1">Incompatibilidade de Tensão</p>
                    <p className="text-xs opacity-80 leading-relaxed">
                      Há itens incompatíveis com {networkVoltage}V na lista. Risco de queima.
                    </p>
                  </div>
                </div>
              )}

              {totals.totalWatts > 0 && totals.totalWatts < totals.totalVA * 0.92 && (
                <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg flex gap-3 text-sm text-purple-200">
                  <Info className="w-5 h-5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-xs uppercase mb-1">Baixo Fator de Potência</p>
                    <p className="text-xs opacity-80 leading-relaxed">
                      EFICIÊNCIA: <strong className="text-white">{(totals.totalWatts / totals.totalVA).toFixed(2)}</strong>.
                      Cabos podem aquecer mais que o esperado devido à energia reativa.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* --- ENHANCED CABLE SUGGESTION --- */}
            {cableInfo && totals.ampsPerPhase > 0 && (
              <div className="border-t border-slate-700 pt-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2 mb-3">
                  <Cable className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-300 font-bold text-sm">Sugestão de Cabeamento</span>
                </div>

                <div className="bg-slate-900 rounded-lg p-4 border border-slate-700 flex flex-col gap-3">
                  <div className="flex justify-between items-end border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Bitola Recomendada</span>
                      <span className="text-2xl font-bold text-white leading-none">{cableInfo.mm} <span className="text-sm text-slate-500">mm²</span></span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Capacidade</span>
                      <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded text-sm">{cableInfo.capacity} A</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 pt-1">
                    <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-300">
                        Distância máxima sem queda de tensão: <strong className="text-white">{cableInfo.maxDistance} metros</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* SAVE MODAL */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-surface border border-slate-700 rounded-xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Save className="w-5 h-5 text-emerald-500" /> Salvar Relatório
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Nome do Evento/Local</label>
                  <input
                    autoFocus
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-emerald-500 outline-none"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="Ex: Palco Principal - Show X"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Descrição (Opcional)</label>
                  <textarea
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:border-emerald-500 outline-none resize-none h-24"
                    value={saveDesc}
                    onChange={(e) => setSaveDesc(e.target.value)}
                    placeholder="Detalhes adicionais..."
                  />
                </div>

                {/* OVERLOAD WARNING */}
                {percentLoad > 100 && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3 mt-2 animate-pulse">
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-red-300 text-xs font-bold uppercase mb-0.5">Atenção: Sobrecarga</p>
                      <p className="text-red-200/70 text-xs">
                        O sistema está operando acima da capacidade do disjuntor ({percentLoad.toFixed(0)}%).
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setIsSaveModalOpen(false)} className="flex-1 py-2.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">Cancelar</button>
                <button onClick={handleSave} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-lg shadow-emerald-900/20 active:scale-95 transition-all">Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};