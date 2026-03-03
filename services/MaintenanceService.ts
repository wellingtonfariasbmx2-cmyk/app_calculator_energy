import { supabase } from './supabaseClient';
import { MaintenanceRecord, Equipment } from '../types';

/**
 * MaintenanceService - Serviço para gestão de manutenção de equipamentos
 */
export const MaintenanceService = {

    // Buscar todos os registros de manutenção
    async getMaintenanceRecords(): Promise<MaintenanceRecord[]> {
        if (!supabase) return [];

        const { data, error } = await supabase
            .from('maintenance_records')
            .select('*, equipments(*)')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching maintenance records:', error);
            return [];
        }

        return (data || []).map(this.mapFromDb);
    },

    // Buscar registros por equipamento
    async getByEquipment(equipmentId: string): Promise<MaintenanceRecord[]> {
        if (!supabase) return [];

        const { data, error } = await supabase
            .from('maintenance_records')
            .select('*, equipments(*)')
            .eq('equipment_id', equipmentId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching maintenance by equipment:', error);
            return [];
        }

        return (data || []).map(this.mapFromDb);
    },

    // Criar registro de manutenção
    async create(record: Partial<MaintenanceRecord>): Promise<MaintenanceRecord> {
        if (!supabase) throw new Error('Database not configured');

        const dbData = this.mapToDb(record);

        const { data, error } = await supabase
            .from('maintenance_records')
            .insert(dbData)
            .select('*, equipments(*)')
            .single();

        if (error) throw error;
        return this.mapFromDb(data);
    },

    // Atualizar registro
    async update(id: string, updates: Partial<MaintenanceRecord>): Promise<MaintenanceRecord> {
        if (!supabase) throw new Error('Database not configured');

        const dbData = this.mapToDb(updates);
        dbData.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('maintenance_records')
            .update(dbData)
            .eq('id', id)
            .select('*, equipments(*)')
            .single();

        if (error) throw error;
        return this.mapFromDb(data);
    },

    // Deletar registro
    async delete(id: string): Promise<void> {
        if (!supabase) throw new Error('Database not configured');

        const { error } = await supabase
            .from('maintenance_records')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Completar manutenção
    async complete(id: string, notes?: string): Promise<MaintenanceRecord> {
        return this.update(id, {
            status: 'completed',
            completedDate: new Date().toISOString(),
            notes: notes || undefined,
        });
    },

    // Equipamentos que precisam de manutenção (baseado na data)
    async getEquipmentNeedingMaintenance(): Promise<MaintenanceRecord[]> {
        if (!supabase) return [];

        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await supabase
            .from('maintenance_records')
            .select('*, equipments(*)')
            .lte('next_maintenance_date', today)
            .in('status', ['pending', 'in_progress'])
            .order('priority', { ascending: false });

        if (error) {
            console.error('Error fetching equipment needing maintenance:', error);
            return [];
        }

        return (data || []).map(this.mapFromDb);
    },

    // Stats de manutenção
    async getStats(): Promise<{
        total: number;
        pending: number;
        inProgress: number;
        completed: number;
        overdue: number;
        totalCost: number;
    }> {
        const records = await this.getMaintenanceRecords();
        const today = new Date().toISOString().split('T')[0];

        return {
            total: records.length,
            pending: records.filter(r => r.status === 'pending').length,
            inProgress: records.filter(r => r.status === 'in_progress').length,
            completed: records.filter(r => r.status === 'completed').length,
            overdue: records.filter(r =>
                r.status !== 'completed' &&
                r.scheduledDate &&
                r.scheduledDate < today
            ).length,
            totalCost: records
                .filter(r => r.status === 'completed')
                .reduce((sum, r) => sum + (r.cost || 0), 0),
        };
    },

    // Mapper: DB -> TypeScript
    mapFromDb(dbItem: any): MaintenanceRecord {
        const eq = dbItem.equipments;
        return {
            id: dbItem.id,
            equipmentId: dbItem.equipment_id,
            equipment: eq ? {
                id: eq.id,
                name: eq.name,
                brand: eq.brand,
                model: eq.model,
                category: eq.category,
                watts: eq.watts,
                voltage: eq.voltage,
                amperes: eq.amperes,
                powerFactor: eq.power_factor,
                quantityOwned: eq.quantity_owned,
                status: eq.status,
                panelWidth: eq.panel_width,
                panelHeight: eq.panel_height,
                panelsPerCase: eq.panels_per_case,
            } as Equipment : undefined,
            equipmentNumber: dbItem.equipment_number,
            type: dbItem.type,
            description: dbItem.description,
            status: dbItem.status,
            priority: dbItem.priority,
            cost: dbItem.cost,
            parts: dbItem.parts,
            technician: dbItem.technician,
            scheduledDate: dbItem.scheduled_date,
            completedDate: dbItem.completed_date,
            nextMaintenanceDate: dbItem.next_maintenance_date,
            notes: dbItem.notes,
            createdAt: dbItem.created_at,
            updatedAt: dbItem.updated_at,
        };
    },

    // Mapper: TypeScript -> DB
    mapToDb(record: Partial<MaintenanceRecord>): any {
        const result: any = {};
        if (record.equipmentId !== undefined) result.equipment_id = record.equipmentId;
        if (record.equipmentNumber !== undefined) result.equipment_number = record.equipmentNumber;
        if (record.type !== undefined) result.type = record.type;
        if (record.description !== undefined) result.description = record.description;
        if (record.status !== undefined) result.status = record.status;
        if (record.priority !== undefined) result.priority = record.priority;
        if (record.cost !== undefined) result.cost = record.cost;
        if (record.parts !== undefined) result.parts = record.parts;
        if (record.technician !== undefined) result.technician = record.technician;
        if (record.scheduledDate !== undefined) result.scheduled_date = record.scheduledDate;
        if (record.completedDate !== undefined) result.completed_date = record.completedDate;
        if (record.nextMaintenanceDate !== undefined) result.next_maintenance_date = record.nextMaintenanceDate;
        if (record.notes !== undefined) result.notes = record.notes;
        return result;
    }
};
