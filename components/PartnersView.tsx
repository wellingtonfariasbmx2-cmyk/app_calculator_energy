import React, { useState, useEffect, useMemo } from 'react';
import { Users, Plus, Edit2, Trash2, X, Save, Search, Phone, Mail, Package, ArrowLeftRight, RotateCcw, User, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { Partner, Equipment, EquipmentAllocation } from '../types';
import { PartnerService } from '../services/PartnerService';
import { DataService } from '../services/supabaseClient';
import { EventService } from '../services/EventService';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmModal';
import { LoadingScreen } from './LoadingScreen';
import { ErrorScreen } from './ErrorScreen';

export const PartnersView: React.FC = () => {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [availabilityMap, setAvailabilityMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal States
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [isAllocModalOpen, setIsAllocModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partial<Partner>>({});
  const [expandedPartnerId, setExpandedPartnerId] = useState<string | null>(null);

  // Allocation modal state
  const [allocPartnerId, setAllocPartnerId] = useState<string>('');
  const [allocEquipmentId, setAllocEquipmentId] = useState<string>('');
  const [allocQuantity, setAllocQuantity] = useState<number>(1);
  const [allocSearchQuery, setAllocSearchQuery] = useState('');

  const { success, error, info } = useToast();
  const { confirm, ConfirmModalComponent } = useConfirm();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (isPartnerModalOpen || isAllocModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isPartnerModalOpen, isAllocModalOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorState(null);
      const [partnersData, equipmentsData, availability] = await Promise.all([
        PartnerService.getPartners(),
        DataService.getEquipments(),
        EventService.checkAllAvailability()
      ]);
      setPartners(partnersData);
      setEquipments(equipmentsData);
      setAvailabilityMap(availability);
    } catch (err) {
      console.error('Error loading partners:', err);
      setErrorState('Falha ao carregar parceiros.');
      error('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  const filteredPartners = useMemo(() => {
    return partners.filter(p => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.contactName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.contactEmail || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [partners, searchQuery, statusFilter]);

  const openPartnerModal = (partner?: Partner) => {
    if (partner) {
      setEditingPartner({ ...partner });
    } else {
      setEditingPartner({
        name: '',
        contactName: '',
        contactPhone: '',
        contactEmail: '',
        notes: '',
        status: 'active',
      });
    }
    setIsPartnerModalOpen(true);
  };

  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPartner.name) return;

    try {
      if (editingPartner.id) {
        await PartnerService.updatePartner(editingPartner.id, editingPartner);
        success('Parceiro atualizado!');
      } else {
        await PartnerService.createPartner(editingPartner);
        success('Novo parceiro cadastrado!');
      }
      setIsPartnerModalOpen(false);
      loadData();
    } catch (err) {
      error('Erro ao salvar parceiro.');
    }
  };

  const handleDeletePartner = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const confirmed = await confirm({
      title: 'Remover Parceiro',
      message: 'Tem certeza? Todas as alocações deste parceiro serão removidas.',
      variant: 'danger',
      confirmText: 'Remover',
      cancelText: 'Cancelar'
    });

    if (confirmed) {
      try {
        await PartnerService.deletePartner(id);
        success('Parceiro removido!');
        if (expandedPartnerId === id) setExpandedPartnerId(null);
        loadData();
      } catch (err) {
        error('Erro ao remover parceiro.');
      }
    }
  };

  const openAllocModal = (partnerId: string) => {
    setAllocPartnerId(partnerId);
    setAllocEquipmentId('');
    setAllocQuantity(1);
    setAllocSearchQuery('');
    setIsAllocModalOpen(true);
  };

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocEquipmentId || allocQuantity < 1) return;

    try {
      await PartnerService.allocateEquipment(allocPartnerId, allocEquipmentId, allocQuantity);
      success('Equipamento alocado ao parceiro!');
      setIsAllocModalOpen(false);
      loadData();
    } catch (err) {
      error('Erro ao alocar equipamento.');
    }
  };

  const handleRemoveAllocation = async (allocationId: string) => {
    const confirmed = await confirm({
      title: 'Remover Alocação',
      message: 'Deseja remover este equipamento do parceiro?',
      variant: 'danger',
      confirmText: 'Remover',
      cancelText: 'Cancelar'
    });

    if (confirmed) {
      try {
        await PartnerService.removeAllocation(allocationId);
        success('Alocação removida!');
        loadData();
      } catch (err) {
        error('Erro ao remover alocação.');
      }
    }
  };

  const handleReturnAll = async (partnerId: string) => {
    const confirmed = await confirm({
      title: 'Devolver Todos',
      message: 'Devolver todos os equipamentos deste parceiro?',
      variant: 'warning',
      confirmText: 'Devolver Todos',
      cancelText: 'Cancelar'
    });

    if (confirmed) {
      try {
        await PartnerService.returnAllEquipment(partnerId);
        success('Todos os equipamentos devolvidos!');
        loadData();
      } catch (err) {
        error('Erro ao devolver equipamentos.');
      }
    }
  };

  const filteredAllocEquipments = useMemo(() => {
    return equipments.filter(eq => {
      if (!allocSearchQuery) return true;
      const q = allocSearchQuery.toLowerCase();
      return eq.name.toLowerCase().includes(q) ||
        eq.brand.toLowerCase().includes(q) ||
        eq.category.toLowerCase().includes(q);
    });
  }, [equipments, allocSearchQuery]);

  const getAvailable = (eqId: string) => availabilityMap.get(eqId) ?? 0;

  if (loading) return <LoadingScreen />;
  if (errorState) return <ErrorScreen message={errorState} onRetry={loadData} />;

  const totalPartners = partners.length;
  const activePartners = partners.filter(p => p.status === 'active').length;
  const totalAllocations = partners.reduce((sum, p) => sum + (p.equipmentAllocations?.length || 0), 0);

  return (
    <div className="animate-fade-in pb-20 relative">
      <ConfirmModalComponent />

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-violet-600 to-violet-700 rounded-xl shadow-lg shadow-violet-900/20 shrink-0">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Parceiros</h1>
              <p className="text-slate-400 text-xs sm:text-sm font-medium">Gerencie alocações de equipamentos para parceiros</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full lg:w-auto">
            <div className="bg-surface border border-slate-700/50 rounded-xl p-2.5 sm:p-3 flex items-center gap-2 sm:gap-3 shadow-lg hover:border-slate-600 transition-colors group">
              <div className="p-1.5 sm:p-2 bg-slate-800 rounded-lg text-violet-400 shrink-0 group-hover:scale-110 transition-transform">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="overflow-hidden">
                <span className="block text-[9px] sm:text-[10px] text-slate-500 uppercase font-bold tracking-wider truncate">Parceiros</span>
                <span className="text-base sm:text-xl font-bold text-white leading-none">{activePartners}</span>
              </div>
            </div>
            <div className="bg-surface border border-slate-700/50 rounded-xl p-2.5 sm:p-3 flex items-center gap-2 sm:gap-3 shadow-lg hover:border-slate-600 transition-colors group">
              <div className="p-1.5 sm:p-2 bg-slate-800 rounded-lg text-blue-400 shrink-0 group-hover:scale-110 transition-transform">
                <Package className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="overflow-hidden">
                <span className="block text-[9px] sm:text-[10px] text-slate-500 uppercase font-bold tracking-wider truncate">Alocações</span>
                <span className="text-base sm:text-xl font-bold text-white leading-none">{totalAllocations}</span>
              </div>
            </div>
            <div className="bg-surface border border-slate-700/50 rounded-xl p-2.5 sm:p-3 flex items-center gap-2 sm:gap-3 shadow-lg hover:border-slate-600 transition-colors group">
              <div className="p-1.5 sm:p-2 bg-slate-800 rounded-lg text-emerald-400 shrink-0 group-hover:scale-110 transition-transform">
                <ArrowLeftRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="overflow-hidden">
                <span className="block text-[9px] sm:text-[10px] text-slate-500 uppercase font-bold tracking-wider truncate">Total</span>
                <span className="text-base sm:text-xl font-bold text-white leading-none">{totalPartners}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex flex-col sm:flex-row gap-3 p-1">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-violet-400 transition-colors" />
            <input
              type="text"
              placeholder="Buscar parceiro..."
              className="w-full bg-surface border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder:text-slate-500 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 outline-none transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="relative min-w-[140px]">
            <select
              className="w-full bg-surface border border-slate-700 rounded-xl px-3 pr-8 py-2.5 text-white appearance-none focus:border-violet-500 outline-none cursor-pointer hover:bg-slate-800 transition-colors"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-slate-400"></div>
            </div>
          </div>
          <button
            onClick={() => openPartnerModal()}
            className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20 active:scale-95 transition-all w-full sm:w-auto hover:shadow-violet-500/30"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Novo</span>
            <span className="sm:hidden">Novo Parceiro</span>
          </button>
        </div>
      </div>

      {/* Partner List */}
      <div className="space-y-3">
        {filteredPartners.length === 0 ? (
          <div className="text-center py-12 text-slate-500 bg-surface/30 rounded-xl border border-dashed border-slate-800">
            <div className="bg-slate-800/50 p-4 rounded-full mx-auto w-fit mb-3">
              <Users className="w-8 h-8 opacity-50" />
            </div>
            <p className="font-medium">Nenhum parceiro encontrado</p>
            <p className="text-xs mt-1">Adicione um parceiro para começar a alocar equipamentos</p>
          </div>
        ) : (
          filteredPartners.map((partner, index) => {
            const isExpanded = expandedPartnerId === partner.id;
            const allocations = partner.equipmentAllocations || [];
            const allocCount = allocations.length;

            return (
              <div
                key={partner.id}
                className="bg-surface border border-slate-700/50 rounded-xl overflow-hidden hover:border-violet-500/30 transition-all duration-300 group hover:shadow-lg hover:shadow-black/20 animate-slide-in-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Partner Header */}
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedPartnerId(isExpanded ? null : partner.id)}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex gap-3 sm:gap-4 overflow-hidden flex-1">
                      <div className={`
                        w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border shrink-0 transition-transform group-hover:scale-105
                        ${partner.status === 'active'
                          ? 'bg-violet-500/10 border-violet-500/20 text-violet-400'
                          : 'bg-slate-800 border-slate-700 text-slate-500'}
                      `}>
                        <User className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="overflow-hidden flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="text-base sm:text-lg font-bold text-white truncate group-hover:text-violet-400 transition-colors leading-tight">{partner.name}</h3>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide shrink-0 ${
                            partner.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-800 text-slate-500 border border-slate-700'
                          }`}>
                            {partner.status === 'active' ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] sm:text-xs text-slate-400">
                          {partner.contactName && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" /> {partner.contactName}
                            </span>
                          )}
                          {partner.contactPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {partner.contactPhone}
                            </span>
                          )}
                          {partner.contactEmail && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {partner.contactEmail}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px] sm:text-xs font-bold text-slate-500">
                            <Package className="w-3 h-3 inline mr-1" />
                            {allocCount} {allocCount === 1 ? 'equipamento' : 'equipamentos'} alocados
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); openPartnerModal(partner); }}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDeletePartner(partner.id, e)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="p-2 text-slate-500">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-slate-800/50 p-4 animate-fade-in bg-slate-900/30">
                    {partner.notes && (
                      <p className="text-xs text-slate-400 mb-4 bg-slate-800/50 px-3 py-2 rounded-lg italic">{partner.notes}</p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <button
                        onClick={() => openAllocModal(partner.id)}
                        className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-violet-500/10 active:scale-95 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" /> Alocar Equipamento
                      </button>
                      {allocCount > 0 && (
                        <button
                          onClick={() => handleReturnAll(partner.id)}
                          className="bg-amber-600/10 hover:bg-amber-600/20 text-amber-400 px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 border border-amber-500/20 transition-all"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Devolver Todos
                        </button>
                      )}
                    </div>

                    {/* Allocations Table */}
                    {allocCount === 0 ? (
                      <div className="text-center py-6 text-slate-500 text-xs">
                        <Package className="w-6 h-6 mx-auto mb-2 opacity-50" />
                        Nenhum equipamento alocado
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {allocations.map((alloc) => (
                          <div key={alloc.id} className="flex items-center justify-between bg-slate-800/50 border border-slate-700/30 rounded-lg px-3 py-2.5 group/item hover:border-slate-600 transition-colors">
                            <div className="flex items-center gap-3 overflow-hidden flex-1">
                              <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
                                <Package className="w-4 h-4" />
                              </div>
                              <div className="overflow-hidden">
                                <p className="text-sm font-bold text-white truncate">{alloc.equipment?.name || 'Equipamento'}</p>
                                <p className="text-[10px] text-slate-500">
                                  {alloc.equipment?.brand} • {alloc.equipment?.category}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-sm font-bold text-white bg-slate-700/50 px-2.5 py-1 rounded-lg border border-slate-600/50 min-w-[2rem] text-center">
                                {alloc.quantityAllocated}
                              </span>
                              <button
                                onClick={() => handleRemoveAllocation(alloc.id)}
                                className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover/item:opacity-100"
                                title="Remover alocação"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ========== PARTNER MODAL ========== */}
      {isPartnerModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm overflow-hidden">
          <div className="bg-surface border-x sm:border border-slate-700 sm:rounded-xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 my-auto h-full sm:h-auto sm:max-h-[95vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-3 sm:p-6 border-b border-slate-700 bg-slate-900/50 rounded-t-xl sticky top-0 z-10">
              <h2 className="text-base sm:text-xl font-bold text-white flex items-center gap-2">
                <div className="p-1 sm:p-1.5 bg-violet-600 rounded-lg">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                {editingPartner.id ? 'Editar Parceiro' : 'Novo Parceiro'}
              </h2>
              <button onClick={() => setIsPartnerModalOpen(false)} className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded-lg">
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <form onSubmit={handleSavePartner} className="p-3 sm:p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Nome do Parceiro *</label>
                <input
                  required
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50 outline-none transition-all placeholder:text-slate-600"
                  value={editingPartner.name}
                  onChange={e => setEditingPartner(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Produtora XYZ"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Contato</label>
                  <input
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:border-violet-500 outline-none transition-all"
                    value={editingPartner.contactName}
                    onChange={e => setEditingPartner(prev => ({ ...prev, contactName: e.target.value }))}
                    placeholder="Nome do contato"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Telefone</label>
                  <input
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:border-violet-500 outline-none transition-all"
                    value={editingPartner.contactPhone}
                    onChange={e => setEditingPartner(prev => ({ ...prev, contactPhone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Email</label>
                <input
                  type="email"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:border-violet-500 outline-none transition-all"
                  value={editingPartner.contactEmail}
                  onChange={e => setEditingPartner(prev => ({ ...prev, contactEmail: e.target.value }))}
                  placeholder="contato@parceiro.com"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Status</label>
                <div className="relative">
                  <select
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:border-violet-500 outline-none appearance-none cursor-pointer"
                    value={editingPartner.status}
                    onChange={e => setEditingPartner(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-slate-500"></div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Observações</label>
                <textarea
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:border-violet-500 outline-none transition-all resize-none"
                  rows={3}
                  value={editingPartner.notes}
                  onChange={e => setEditingPartner(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Anotações sobre o parceiro..."
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-700">
                <button type="button" onClick={() => setIsPartnerModalOpen(false)} className="order-2 sm:order-1 px-6 py-3 sm:py-2.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors font-medium text-sm">Cancelar</button>
                <button type="submit" className="order-1 sm:order-2 bg-violet-600 hover:bg-violet-700 text-white px-8 py-3 sm:py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20 active:scale-95 transition-all">
                  <Save className="w-4 h-4" /> Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== ALLOCATION MODAL ========== */}
      {isAllocModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm overflow-hidden">
          <div className="bg-surface border-x sm:border border-slate-700 sm:rounded-xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 my-auto h-full sm:h-auto sm:max-h-[95vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-3 sm:p-6 border-b border-slate-700 bg-slate-900/50 rounded-t-xl sticky top-0 z-10">
              <h2 className="text-base sm:text-xl font-bold text-white flex items-center gap-2">
                <div className="p-1 sm:p-1.5 bg-violet-600 rounded-lg">
                  <Package className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                Alocar Equipamento
              </h2>
              <button onClick={() => setIsAllocModalOpen(false)} className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded-lg">
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <form onSubmit={handleAllocate} className="p-3 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {/* Search Equipment */}
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-violet-400 transition-colors" />
                <input
                  type="text"
                  placeholder="Buscar equipamento..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-slate-500 focus:border-violet-500 outline-none transition-all text-sm"
                  value={allocSearchQuery}
                  onChange={(e) => setAllocSearchQuery(e.target.value)}
                />
              </div>

              {/* Equipment List */}
              <div className="max-h-[300px] overflow-y-auto space-y-1.5 border border-slate-700/50 rounded-lg p-2 bg-slate-900/30">
                {filteredAllocEquipments.length === 0 ? (
                  <p className="text-center text-slate-500 text-xs py-4">Nenhum equipamento encontrado</p>
                ) : (
                  filteredAllocEquipments.map(eq => {
                    const available = getAvailable(eq.id);
                    const isSelected = allocEquipmentId === eq.id;
                    const isUnavailable = available <= 0;

                    return (
                      <button
                        key={eq.id}
                        type="button"
                        disabled={isUnavailable}
                        onClick={() => {
                          setAllocEquipmentId(eq.id);
                          setAllocQuantity(1);
                        }}
                        className={`
                          w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all text-sm
                          ${isSelected ? 'bg-violet-600/10 border border-violet-500/30 text-white' :
                            isUnavailable ? 'bg-slate-800/30 text-slate-600 cursor-not-allowed opacity-50' :
                              'hover:bg-slate-800 text-slate-300 border border-transparent'}
                        `}
                      >
                        <div className="overflow-hidden flex-1">
                          <p className="font-bold text-sm truncate">{eq.name}</p>
                          <p className="text-[10px] text-slate-500">{eq.brand} • {eq.category}</p>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <span className={`text-xs font-bold ${available > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {available} disp.
                          </span>
                          <span className="text-[10px] text-slate-600 block">de {eq.quantityOwned}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Quantity */}
              {allocEquipmentId && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Quantidade</label>
                  <input
                    type="number"
                    min={1}
                    max={getAvailable(allocEquipmentId)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white focus:border-violet-500 outline-none font-mono"
                    value={allocQuantity}
                    onChange={e => setAllocQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                  {allocQuantity > getAvailable(allocEquipmentId) && (
                    <p className="text-red-400 text-[10px] mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Quantidade excede o disponível
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-700">
                <button type="button" onClick={() => setIsAllocModalOpen(false)} className="order-2 sm:order-1 px-6 py-3 sm:py-2.5 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors font-medium text-sm">Cancelar</button>
                <button
                  type="submit"
                  disabled={!allocEquipmentId || allocQuantity < 1 || allocQuantity > getAvailable(allocEquipmentId)}
                  className="order-1 sm:order-2 bg-violet-600 hover:bg-violet-700 text-white px-8 py-3 sm:py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowLeftRight className="w-4 h-4" /> Alocar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
