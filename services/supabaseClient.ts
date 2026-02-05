import { createClient } from '@supabase/supabase-js';
import { Equipment, Calculation, DistributionProject, AnyReport } from '../types';

// CONFIGURAÇÃO DO SUPABASE
// VITE_ prefix makes these available in the browser
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || '';

const isConfigured = SUPABASE_URL.length > 0 && SUPABASE_KEY.length > 0;

// DEBUG: Verificar se as variáveis estão sendo carregadas
console.log('🔍 Supabase Debug:');
console.log('  SUPABASE_URL:', SUPABASE_URL ? '✅ Configurado' : '❌ Não configurado');
console.log('  SUPABASE_KEY:', SUPABASE_KEY ? '✅ Configurado (hidden)' : '❌ Não configurado');
console.log('  isConfigured:', isConfigured);

export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

// Função auxiliar robusta para gerar ID (crucial para deletar itens criados localmente)
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Helper to convert Equipment from TypeScript (camelCase) to PostgreSQL (snake_case)
const equipmentToDb = (item: Equipment): any => ({
  id: item.id,
  name: item.name,
  brand: item.brand,
  model: item.model,
  category: item.category,
  watts: item.watts,
  voltage: item.voltage,
  amperes: item.amperes,
  power_factor: item.powerFactor,
  quantity_owned: item.quantityOwned,
  status: item.status
});

// Helper to convert Equipment from PostgreSQL (snake_case) to TypeScript (camelCase)
const equipmentFromDb = (dbItem: any): Equipment => ({
  id: dbItem.id,
  name: dbItem.name,
  brand: dbItem.brand || '',
  model: dbItem.model || '',
  category: dbItem.category || 'Outros',
  watts: Number(dbItem.watts) || 0,
  voltage: Number(dbItem.voltage) || 110,
  amperes: Number(dbItem.amperes) || 0,
  powerFactor: Number(dbItem.power_factor) || 1.0,
  quantityOwned: Number(dbItem.quantity_owned) || 0,
  status: dbItem.status || 'active'
});

// Helper to convert Report from TypeScript (camelCase) to PostgreSQL (snake_case)
const reportToDb = (report: AnyReport): any => ({
  id: report.id,
  type: report.type,
  name: report.name,
  description: report.description,
  technical_responsible: report.technicalResponsible,
  voltage_system: report.voltageSystem,
  total_watts: report.totalWatts,
  total_amperes: report.totalAmperes,
  items: report.type === 'simple' ? (report as Calculation).items : null,
  ports: report.type === 'distribution' ? (report as DistributionProject).ports : null,
  created_at: report.createdAt
});

// Helper to convert Report from PostgreSQL (snake_case) to TypeScript (camelCase)
const reportFromDb = (dbReport: any): AnyReport => {
  const base = {
    id: dbReport.id,
    name: dbReport.name,
    description: dbReport.description,
    technicalResponsible: dbReport.technical_responsible,
    voltageSystem: Number(dbReport.voltage_system),
    totalWatts: Number(dbReport.total_watts),
    totalAmperes: Number(dbReport.total_amperes),
    createdAt: dbReport.created_at
  };

  if (dbReport.type === 'distribution') {
    return {
      ...base,
      type: 'distribution',
      ports: dbReport.ports || []
    } as DistributionProject;
  } else {
    return {
      ...base,
      type: 'simple',
      items: dbReport.items || []
    } as Calculation;
  }
};

// --- OFFLINE SYNC LOGIC ---

interface SyncAction {
  id: string;
  type: 'EQUIPMENT' | 'CALCULATION' | 'DISTRIBUTION';
  action: 'SAVE' | 'DELETE';
  payload: any; // ID (string) or Object
  timestamp: number;
}

const getSyncQueue = (): SyncAction[] => {
  try {
    const queue = localStorage.getItem('ll_sync_queue');
    return queue ? JSON.parse(queue) : [];
  } catch { return []; }
};

const addToSyncQueue = (action: Omit<SyncAction, 'id' | 'timestamp'>) => {
  const queue = getSyncQueue();
  const newAction: SyncAction = {
    ...action,
    id: generateId(),
    timestamp: Date.now()
  };
  queue.push(newAction);
  localStorage.setItem('ll_sync_queue', JSON.stringify(queue));
  console.log('📌 Action queued for sync:', newAction);
};

export const syncPendingChanges = async (): Promise<number> => {
  if (!isConfigured || !supabase) return 0;

  const queue = getSyncQueue();
  if (queue.length === 0) return 0;

  console.log(`🔄 Syncing ${queue.length} pending changes...`);
  const remainingQueue: SyncAction[] = [];
  let syncedCount = 0;

  for (const item of queue) {
    try {
      if (item.type === 'EQUIPMENT') {
        if (item.action === 'SAVE') {
          const dbItem = equipmentToDb(item.payload);
          const { error } = await supabase.from('equipments').upsert(dbItem);
          if (error) throw error;
        } else if (item.action === 'DELETE') {
          const { error } = await supabase.from('equipments').delete().eq('id', item.payload);
          if (error) throw error;
        }
      }
      // Add other types logic here if needed (Calculations/Distributions)

      syncedCount++;
    } catch (err) {
      console.error('❌ Sync failed for item:', item, err);
      remainingQueue.push(item); // Keep in queue to retry later
    }
  }

  localStorage.setItem('ll_sync_queue', JSON.stringify(remainingQueue));
  console.log(`✅ Sync complete. ${syncedCount} synced, ${remainingQueue.length} remaining.`);
  return syncedCount;
};

// --- DATA MOCK INICIAL ---
const INITIAL_EQUIPMENTS: Equipment[] = [];

export const DataService = {
  // --- EQUIPAMENTOS ---
  getEquipments: async (): Promise<Equipment[]> => {
    if (isConfigured && supabase) {
      const { data, error } = await supabase.from('equipments').select('*');
      if (!error && data) {
        const items = data.map(equipmentFromDb);
        localStorage.setItem('ll_equipments', JSON.stringify(items)); // Cache local
        return items;
      }
    }

    try {
      const stored = localStorage.getItem('ll_equipments');
      let data = stored ? JSON.parse(stored) : INITIAL_EQUIPMENTS;

      // AUTO-CORREÇÃO: Garante que todos os itens tenham ID ao carregar
      // Isso resolve problemas de versões antigas do app
      let hasFixes = false;
      const fixedData = data.map((item: Equipment) => {
        if (!item.id) {
          hasFixes = true;
          return { ...item, id: generateId() };
        }
        return item;
      });

      if (hasFixes) {
        localStorage.setItem('ll_equipments', JSON.stringify(fixedData));
      }
      return fixedData;
    } catch (e) {
      console.error("Erro ao ler equipamentos", e);
      return [];
    }
  },

  saveEquipment: async (item: Equipment): Promise<Equipment> => {
    const newItem = { ...item, id: item.id || generateId() };

    console.log('💾 Saving equipment:', newItem.name);
    console.log('  Supabase configured?', isConfigured);
    console.log('  Supabase client?', !!supabase);

    if (isConfigured && supabase) {
      try {
        console.log('  Attempting Supabase insert...');
        const dbItem = equipmentToDb(newItem);
        const { error } = await supabase.from('equipments').upsert(dbItem);

        if (error) throw error;
      } catch (err) {
        console.error('❌ Offline or Error: Queueing for sync', err);
        addToSyncQueue({ type: 'EQUIPMENT', action: 'SAVE', payload: newItem });
      }
    } else {
      console.warn('⚠️ Supabase not configured, saving to local & queue');
      addToSyncQueue({ type: 'EQUIPMENT', action: 'SAVE', payload: newItem });
    }

    const current = await DataService.getEquipments();
    const index = current.findIndex(e => e.id === newItem.id);
    let updated = [];
    if (index >= 0) {
      updated = current.map(e => e.id === newItem.id ? newItem : e);
    } else {
      updated = [...current, newItem];
    }
    localStorage.setItem('ll_equipments', JSON.stringify(updated));
    return newItem;
  },

  deleteEquipment: async (id: string): Promise<void> => {
    if (!id) return;

    if (isConfigured && supabase) {
      try {
        const { error } = await supabase.from('equipments').delete().eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error('❌ Offline or Error: Queueing delete', err);
        addToSyncQueue({ type: 'EQUIPMENT', action: 'DELETE', payload: id });
      }
    } else {
      addToSyncQueue({ type: 'EQUIPMENT', action: 'DELETE', payload: id });
    }

    const current = await DataService.getEquipments();
    const updated = current.filter(e => e.id !== id);
    localStorage.setItem('ll_equipments', JSON.stringify(updated));
  },

  // --- RELATÓRIOS (CÁLCULOS & PROJETOS) ---

  getReports: async (): Promise<AnyReport[]> => {
    if (isConfigured && supabase) {
      const { data } = await supabase.from('calculations').select('*');
      if (data) {
        const reports = data.map(reportFromDb);
        localStorage.setItem('ll_calculations', JSON.stringify(reports)); // Cache local
        return reports;
      }
    }
    try {
      const stored = localStorage.getItem('ll_calculations');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  saveReport: async (report: AnyReport): Promise<void> => {
    const newReport = {
      ...report,
      id: report.id || generateId(),
      createdAt: report.createdAt || new Date().toISOString()
    };

    if (isConfigured && supabase) {
      const dbReport = reportToDb(newReport);
      await supabase.from('calculations').upsert(dbReport);
    }

    const current = await DataService.getReports();
    // Remove versão antiga se existir (update)
    const filtered = current.filter(c => c.id !== newReport.id);
    // Adiciona o novo no topo
    const updated = [newReport, ...filtered];

    localStorage.setItem('ll_calculations', JSON.stringify(updated));
  },

  // Wrappers para compatibilidade de tipos
  saveCalculation: async (calc: Calculation): Promise<void> => {
    return DataService.saveReport({ ...calc, type: 'simple' });
  },

  saveDistribution: async (dist: DistributionProject): Promise<void> => {
    return DataService.saveReport(dist);
  },

  getCalculations: async (): Promise<Calculation[]> => {
    const all = await DataService.getReports();
    return all.filter(r => r.type === 'simple' || !r.type) as Calculation[];
  },

  deleteCalculation: async (id: string): Promise<void> => {
    if (!id) return;

    if (isConfigured && supabase) {
      await supabase.from('calculations').delete().eq('id', id);
    }
    const current = await DataService.getReports();
    const updated = current.filter(c => c.id !== id);
    localStorage.setItem('ll_calculations', JSON.stringify(updated));
  },

  duplicateReport: async (id: string): Promise<void> => {
    const current = await DataService.getReports();
    const reportToClone = current.find(r => r.id === id);
    if (!reportToClone) return;

    const clonedReport = {
      ...reportToClone,
      id: generateId(),
      name: `${reportToClone.name} (Cópia)`,
      createdAt: new Date().toISOString()
    };

    await DataService.saveReport(clonedReport);
  },

  checkConnection: async (): Promise<boolean> => {
    if (!isConfigured || !supabase) return false;
    try {
      const { error } = await supabase.from('equipments').select('count', { count: 'exact', head: true });
      return !error;
    } catch {
      return false;
    }
  }
};