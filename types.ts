export interface Equipment {
  id: string;
  name: string;
  brand: string;
  model: string;
  category: 'Moving Head' | 'Par Led' | 'Blinder' | 'Strobo' | 'Console' | 'Outros';
  watts: number;
  voltage: number; // 110, 220, or fixed
  amperes: number; // calculated or manual
  powerFactor: number; // 0.0 to 1.0
  quantityOwned: number;
  status: 'active' | 'maintenance' | 'inactive';

  // Campos calculados em runtime para gestão de estoque
  quantityAvailable?: number; // Calculado: owned - allocated
  quantityAllocated?: number; // Em uso em eventos
}

export interface CalculationItem {
  equipmentId: string;
  quantity: number;
  equipment: Equipment;
}

export interface Calculation {
  id: string;
  type: 'simple'; // Legacy single list
  name: string;
  description?: string;
  technicalResponsible?: string; // Novo campo
  voltageSystem: number;
  items: CalculationItem[];
  totalWatts: number;
  totalAmperes: number;
  createdAt: string;
}

// --- NOVOS TIPOS PARA SISTEMA DE BALANCEAMENTO DE FASES ---

export interface GeneratorConfig {
  enabled: boolean;
  powerKVA: number; // Potência em kVA
  isThreePhase: boolean;
  voltage: number; // 110, 220, 380
}

export interface PhaseConfig {
  phaseId: 'A' | 'B' | 'C';
  color: string; // Cor para visualização
  maxAmps: number; // Limite de corrente por fase
  currentLoad: number; // Carga atual em amperes
  ports: string[]; // IDs das portas nesta fase (4 portas por fase)
}

export interface MainpowerConfig {
  enabled: boolean;
  systemType: 'single' | 'two-phase' | 'three-phase'; // Tipo de sistema
  totalPorts: number; // 12 portas (4 por fase para trifásico)
  phases: PhaseConfig[];
  autoBalance: boolean; // Balanceamento automático ativado
}

// --- NOVOS TIPOS PARA DISTRIBUIÇÃO ---

export interface Port {
  id: string;
  name: string; // "Dimmer 1", "Auxiliar", "Som"
  abbreviation: string; // "DIM1", "AUX", "PA"
  color: string; // Hex color for UI tagging
  breakerAmps: number; // Capacidade do disjuntor desta porta
  items: CalculationItem[];
}

export interface DistributionProject {
  id: string;
  type: 'distribution';
  name: string;
  description?: string;
  technicalResponsible?: string; // Novo campo
  voltageSystem: number;
  ports: Port[];
  totalWatts: number;
  totalAmperes: number;
  createdAt: string;

  // Sistema de Energia
  generatorConfig?: GeneratorConfig;
  mainpowerConfig?: MainpowerConfig;

  // NOVO: Vinculação com eventos
  eventId?: string; // ID do evento ao qual este projeto está vinculado
}

// --- NOVOS TIPOS PARA EVENTOS ---

export interface Event {
  id: string;
  type: 'event'; // Discriminated union
  name: string;
  clientName?: string; // Nome do cliente (simplificado)
  venue: string; // Local do evento
  address?: string;
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
  setupTime?: string; // Horário de montagem
  eventTime?: string; // Horário do evento
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  equipmentAllocations?: EquipmentAllocation[];
  distributionProjects?: DistributionProject[]; // Projetos vinculados (carregados via join)
  notes?: string;
  technicalResponsible?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentAllocation {
  id: string;
  eventId: string;
  equipmentId: string;
  equipment?: Equipment; // Carregado via join
  quantityAllocated: number;
  status: 'allocated' | 'returned';
  allocatedAt: string;
  returnedAt?: string;
}

export type AnyReport = Calculation | DistributionProject | Event;

export type ViewState = 'equipments' | 'calculator' | 'distribution' | 'reports' | 'events' | 'availability' | 'power-system' | 'education';