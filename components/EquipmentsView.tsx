import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2, Zap, X, Save, Info, Package, Activity, Search, Filter, Download } from 'lucide-react';
import { Equipment } from '../types';
import { DataService } from '../services/supabaseClient';
import { useToast } from './Toast';
import { ExportService } from '../services/ExportService';
import { useConfirm } from './ConfirmModal';

export const EquipmentsView: React.FC = () => {
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<Equipment>>({});

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const { success, error, info } = useToast();
  const { confirm, ConfirmModalComponent } = useConfirm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await DataService.getEquipments();
    setEquipments(data);
  };

  const filteredEquipments = useMemo(() => {
    return equipments.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.model.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [equipments, searchQuery, categoryFilter]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const confirmed = await confirm({
      title: 'Remover Equipamento',
      message: 'Tem certeza que deseja remover este equipamento? Esta ação não pode ser desfeita.',
      variant: 'danger',
      confirmText: 'Remover',
      cancelText: 'Cancelar'
    });

    if (confirmed) {
      try {
        setEquipments(prev => prev.filter(item => item.id !== id));
        await DataService.deleteEquipment(id);
        success('Equipamento removido com sucesso!');
      } catch (err) {
        error('Erro ao remover equipamento.');
        loadData(); // Revert
      }
    }
  };

  const openModal = (item?: Equipment) => {
    if (item) {
      setEditingItem({ ...item });
    } else {
      setEditingItem({
        name: '',
        brand: '',
        model: '',
        category: 'Moving Head',
        watts: 0,
        voltage: 220,
        amperes: 0,
        powerFactor: 0.95,
        quantityOwned: 1,
        status: 'active'
      });
    }
    setIsModalOpen(true);
  };

  const handleFieldChange = (field: keyof Equipment, value: any) => {
    const newItem = { ...editingItem, [field]: value };

    // Auto-cálculo de Amperes
    if (['watts', 'voltage', 'powerFactor'].includes(field)) {
      const w = Number(newItem.watts || 0);
      const v = Number(newItem.voltage || 0);
      const pf = Number(newItem.powerFactor) || 1;

      if (w > 0 && v > 0) {
        const calculatedAmps = w / (v * pf);
        newItem.amperes = parseFloat(calculatedAmps.toFixed(2));
      }
    }

    setEditingItem(newItem);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem.name) return;

    try {
      await DataService.saveEquipment(editingItem as Equipment);
      setIsModalOpen(false);
      loadData();
      success(editingItem.id ? 'Equipamento atualizado!' : 'Novo equipamento cadastrado!');
    } catch (err) {
      error('Erro ao salvar equipamento. Tente novamente.');
    }
  };

  const inventoryStats = useMemo(() => {
    const totalItems = equipments.reduce((acc, item) => acc + (item.quantityOwned || 0), 0);
    let totalVA = 0;
    equipments.forEach(item => {
      const pf = item.powerFactor || 1;
      const itemVA = (item.watts / pf) * (item.quantityOwned || 0);
      totalVA += itemVA;
    });
    const totalKVA = (totalVA / 1000).toFixed(2);
    return { totalItems, totalKVA };
  }, [equipments]);

  const formatNum = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

  const categories = ['Moving Head', 'Par Led', 'Blinder', 'Strobo', 'Console', 'Outros'];

  return (
    <div className="animate-fade-in pb-20 relative">
      <ConfirmModalComponent />
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-lg shadow-blue-900/20 shrink-0">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Equipamentos</h1>
              <p className="text-slate-400 text-xs sm:text-sm font-medium">Gerencie seu inventário técnico</p>
            </div>
          </div>

          {/* Inventory Summary Cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full lg:w-auto">
            <div className="bg-surface border border-slate-700/50 rounded-xl p-3 flex items-center gap-3 shadow-lg hover:border-slate-600 transition-colors group">
              <div className="p-2 bg-slate-800 rounded-lg text-blue-400 shrink-0 group-hover:scale-110 transition-transform">
                <Package className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider truncate">Total Itens</span>
                <span className="text-xl font-bold text-white leading-none">{inventoryStats.totalItems}</span>
              </div>
            </div>
            <div className="bg-surface border border-slate-700/50 rounded-xl p-3 flex items-center gap-3 shadow-lg hover:border-slate-600 transition-colors group">
              <div className="p-2 bg-slate-800 rounded-lg text-yellow-500 shrink-0 group-hover:scale-110 transition-transform">
                <Activity className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <span className="block text-[10px] text-slate-500 uppercase font-bold tracking-wider truncate">Capacidade</span>
                <span className="text-xl font-bold text-white leading-none">{inventoryStats.totalKVA} <span className="text-xs font-normal text-slate-400">kVA</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Action & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 p-1">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
            <input
              type="text"
              placeholder="Buscar equipamento..."
              className="w-full bg-surface border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="relative min-w-[160px]">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <select
              className="w-full bg-surface border border-slate-700 rounded-xl pl-10 pr-8 py-2.5 text-white appearance-none focus:border-blue-500 outline-none cursor-pointer hover:bg-slate-800 transition-colors"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">Todas as Categorias</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none border-l border-slate-700 pl-3">
              <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-slate-400"></div>
            </div>
          </div>

          <button
            onClick={() => ExportService.exportToCSV(equipments, 'Lista_Equipamentos')}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 border border-slate-700 transition-colors w-full sm:w-auto"
            title="Exportar para CSV"
          >
            <Download className="w-5 h-5" />
            <span className="hidden sm:inline">Exportar</span>
          </button>
          <button
            onClick={() => openModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all w-full sm:w-auto hover:shadow-blue-500/30"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Novo</span>
            <span className="sm:hidden">Novo Equipamento</span>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {filteredEquipments.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-surface/30 rounded-xl border border-dashed border-slate-800">
            <div className="bg-slate-800/50 p-4 rounded-full mx-auto w-fit mb-3">
              <Search className="w-8 h-8 opacity-50" />
            </div>
            <p className="font-medium">Nenhum equipamento encontrado</p>
            <p className="text-xs mt-1">Tente ajustar seus filtros de busca</p>
          </div>
        ) : (
          filteredEquipments.map((item, index) => (
            <div
              key={item.id}
              className="bg-surface border border-slate-700/50 rounded-xl p-4 hover:border-blue-500/30 transition-all duration-300 group hover:shadow-lg hover:shadow-black/20 animate-slide-in-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-4 overflow-hidden">
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105
                    ${item.category === 'Moving Head' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                      item.category === 'Par Led' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                        item.category === 'Console' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                          'bg-slate-800 border-slate-700 text-slate-400'}
                  `}>
                    <Zap className="w-6 h-6" />
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="text-lg font-bold text-white mb-0.5 truncate group-hover:text-blue-400 transition-colors">{item.name}</h3>
                    <p className="text-xs text-slate-400 mb-2 truncate font-medium">{item.brand} <span className="mx-1 text-slate-600">•</span> {item.model}</p>
                    <span className="bg-slate-800/80 text-slate-300 text-[10px] px-2.5 py-0.5 rounded-full border border-slate-700 font-bold uppercase tracking-wide">
                      {item.category}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openModal(item)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 border-t border-slate-800/50 pt-4 mt-2">
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase font-bold mb-0.5">Potência</span>
                  <span className="text-white text-sm font-bold font-mono">{item.watts}<span className="text-slate-500 text-xs ml-0.5">W</span></span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase font-bold mb-0.5">Tensão</span>
                  <span className="text-white text-sm font-bold font-mono">{item.voltage}<span className="text-slate-500 text-xs ml-0.5">V</span></span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase font-bold mb-0.5">Corrente</span>
                  <span className="text-blue-400 text-sm font-bold font-mono">{formatNum(item.amperes)}<span className="text-blue-500/50 text-xs ml-0.5">A</span></span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase font-bold mb-0.5">F.P.</span>
                  <span className="text-slate-300 text-sm font-bold font-mono">{formatNum(item.powerFactor)}</span>
                </div>
                <div className="col-span-2 lg:col-span-1 lg:text-right">
                  <span className="block text-[10px] text-slate-500 uppercase font-bold mb-0.5">Estoque</span>
                  <span className="text-white text-sm font-bold bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{item.quantityOwned}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-surface border border-slate-700 rounded-xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 my-auto max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center p-3 sm:p-6 border-b border-slate-700 bg-slate-900/50 rounded-t-xl sticky top-0 z-10">
              <h2 className="text-base sm:text-xl font-bold text-white flex items-center gap-2">
                <div className="p-1 sm:p-1.5 bg-blue-600 rounded-lg">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                {editingItem.id ? 'Editar Equipamento' : 'Novo Equipamento'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded-lg">
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-3 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Nome do Equipamento</label>
                <input required className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-600"
                  value={editingItem.name}
                  onChange={e => handleFieldChange('name', e.target.value)}
                  placeholder="Ex: Sharpy Plus, MA3 Light..."
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-1 gap-4 md:col-span-1">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Marca</label>
                  <input className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:border-blue-500 outline-none transition-all"
                    value={editingItem.brand}
                    onChange={e => handleFieldChange('brand', e.target.value)}
                    placeholder="Ex: Clay Paky"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Modelo</label>
                  <input className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:border-blue-500 outline-none transition-all"
                    value={editingItem.model}
                    onChange={e => handleFieldChange('model', e.target.value)}
                    placeholder="Ex: Hibrido"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-1 gap-4 md:col-span-1">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Categoria</label>
                  <div className="relative">
                    <select className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:border-blue-500 outline-none appearance-none cursor-pointer"
                      value={editingItem.category}
                      onChange={e => handleFieldChange('category', e.target.value)}
                    >
                      {categories.map(c => <option key={c}>{c}</option>)}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-slate-500"></div>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Estoque (Qtd)</label>
                  <input
                    type="number"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:border-blue-500 outline-none"
                    value={editingItem.quantityOwned === 0 ? '' : editingItem.quantityOwned}
                    onChange={e => handleFieldChange('quantityOwned', e.target.value === '' ? 0 : parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="md:col-span-2 border-t border-slate-700/50 pt-4 mt-2">
                <h3 className="text-white text-sm font-bold mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-yellow-500" /> Especificações Elétricas
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4 md:col-span-2">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Potência (W)</label>
                  <input type="number" step="0.1" required className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:border-blue-500 outline-none font-mono"
                    value={editingItem.watts === 0 ? '' : editingItem.watts}
                    onChange={e => handleFieldChange('watts', e.target.value === '' ? 0 : parseFloat(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Tensão (V)</label>
                  <select className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:border-blue-500 outline-none font-mono"
                    value={editingItem.voltage}
                    onChange={e => handleFieldChange('voltage', Number(e.target.value))}
                  >
                    <option value={110}>110V</option>
                    <option value={220}>220V</option>
                    <option value={380}>380V</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Amperes (A)</label>
                  <input type="number" readOnly className="w-full bg-slate-800/50 border border-slate-800 rounded-lg px-3 py-2.5 text-blue-400 font-bold font-mono cursor-not-allowed"
                    value={editingItem.amperes}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Fator de Pot.</label>
                  <input type="number" step="0.01" max="1" min="0" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:border-blue-500 outline-none font-mono"
                    value={editingItem.powerFactor}
                    onChange={e => handleFieldChange('powerFactor', parseFloat(e.target.value))}
                  />
                </div>
              </div>

              <div className="md:col-span-2 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-slate-700 sticky bottom-0 bg-surface">
                <button type="button" onClick={() => setIsModalOpen(false)} className="order-2 sm:order-1 px-6 py-3 sm:py-2.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors font-medium text-sm">Cancelar</button>
                <button type="submit" className="order-1 sm:order-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 sm:py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                  <Save className="w-4 h-4" /> Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};