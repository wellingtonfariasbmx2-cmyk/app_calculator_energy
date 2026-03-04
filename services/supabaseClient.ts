import { createClient } from '@supabase/supabase-js';
import { Equipment, Calculation, DistributionProject, AnyReport } from '../types';

// CONFIGURAÇÃO DO SUPABASE
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || '';

const isConfigured = SUPABASE_URL.length > 0 && SUPABASE_KEY.length > 0;

export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

// Helper para geração de ID fallback
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Conversões
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
  status: item.status,
  panel_width: item.panelWidth,
  panel_height: item.panelHeight,
  panels_per_case: item.panelsPerCase
});

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
  status: dbItem.status || 'active',
  panelWidth: dbItem.panel_width ? Number(dbItem.panel_width) : undefined,
  panelHeight: dbItem.panel_height ? Number(dbItem.panel_height) : undefined,
  panelsPerCase: dbItem.panels_per_case ? Number(dbItem.panels_per_case) : undefined
});

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
  generator_config: report.type === 'distribution' ? (report as DistributionProject).generatorConfig : null,
  mainpower_config: report.type === 'distribution' ? (report as DistributionProject).mainpowerConfig : null,
  created_at: report.createdAt
});

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
      ports: dbReport.ports || [],
      generatorConfig: dbReport.generator_config,
      mainpowerConfig: dbReport.mainpower_config
    } as DistributionProject;
  } else {
    return {
      ...base,
      type: 'simple',
      items: dbReport.items || []
    } as Calculation;
  }
};

export const syncPendingChanges = async (): Promise<number> => {
  return 0; // Removido offline sync.
};

export const DataService = {
  getEquipments: async (): Promise<Equipment[]> => {
    if (!isConfigured || !supabase) return [];
    const { data, error } = await supabase.from('equipments').select('*');
    if (error) throw error;
    return data ? data.map(equipmentFromDb) : [];
  },

  saveEquipment: async (item: Equipment): Promise<Equipment> => {
    if (!isConfigured || !supabase) throw new Error("A conexão com o servidor foi perdida. Ação bloqueada para evitar conflitos locais.");
    const newItem = { ...item, id: item.id || generateId() };
    const dbItem = equipmentToDb(newItem);
    const { error } = await supabase.from('equipments').upsert(dbItem);
    if (error) throw error;
    return newItem;
  },

  deleteEquipment: async (id: string): Promise<void> => {
    if (!isConfigured || !supabase || !id) return;
    const { error } = await supabase.from('equipments').delete().eq('id', id);
    if (error) throw error;
  },

  getReports: async (): Promise<AnyReport[]> => {
    if (!isConfigured || !supabase) return [];
    const { data, error } = await supabase.from('calculations').select('*');
    if (error) throw error;
    return data ? data.map(reportFromDb) : [];
  },

  saveReport: async (report: AnyReport): Promise<void> => {
    if (!isConfigured || !supabase) throw new Error("Erro de conexão ao salvar.");
    const newReport = {
      ...report,
      id: report.id || generateId(),
      createdAt: report.createdAt || new Date().toISOString()
    };
    const dbReport = reportToDb(newReport);
    const { error } = await supabase.from('calculations').upsert(dbReport);
    if (error) throw error;
  },

  saveCalculation: async (calc: Calculation): Promise<void> => {
    return DataService.saveReport({ ...calc, type: 'simple' });
  },

  saveDistribution: async (dist: DistributionProject): Promise<void> => {
    return DataService.saveReport(dist);
  },

  getCalculations: async (): Promise<Calculation[]> => {
    if (!isConfigured || !supabase) return [];
    const { data, error } = await supabase.from('calculations').select('*').eq('type', 'simple');
    if (error) throw error;
    return data ? (data.map(reportFromDb) as Calculation[]) : [];
  },

  getDistributionProjects: async (): Promise<DistributionProject[]> => {
    if (!isConfigured || !supabase) return [];
    const { data, error } = await supabase.from('calculations').select('*').eq('type', 'distribution');
    if (error) throw error;
    return data ? (data.map(reportFromDb) as DistributionProject[]) : [];
  },

  updateCalculation: async (id: string, updates: Partial<any>): Promise<void> => {
    if (!isConfigured || !supabase) throw new Error("Erro de conexão.");
    const { error } = await supabase.from('calculations').update(updates).eq('id', id);
    if (error) throw error;
  },

  deleteCalculation: async (id: string): Promise<void> => {
    if (!isConfigured || !supabase || !id) return;
    const { error } = await supabase.from('calculations').delete().eq('id', id);
    if (error) throw error;
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
      const { error } = await supabase.from('equipments').select('id').limit(1);
      return !error;
    } catch { return false; }
  },

  signInWithGitHub: async () => { },
  signOut: async () => { },
  getSession: async () => ({ session: null })
};