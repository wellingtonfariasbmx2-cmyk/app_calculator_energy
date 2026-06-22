import { supabase } from './supabaseClient';
import { Partner, EquipmentAllocation, Equipment } from '../types';

/**
 * PartnerService - Serviço para gestão de parceiros
 * Responsável por CRUD de parceiros e gestão de alocações de equipamentos
 */
export class PartnerService {
    /**
     * Buscar todos os parceiros
     */
    static async getPartners(): Promise<Partner[]> {
        if (!supabase) return [];

        const { data, error } = await supabase
            .from('partners')
            .select(`
                *,
                equipment_allocations (
                    *,
                    equipment:equipments (*)
                )
            `)
            .order('name', { ascending: true });

        if (error) {
            console.error('Error fetching partners:', error);
            throw error;
        }

        return (data || []).map(this.mapFromDatabase);
    }

    /**
     * Buscar parceiro por ID
     */
    static async getPartnerById(id: string): Promise<Partner | null> {
        if (!supabase) return null;

        const { data, error } = await supabase
            .from('partners')
            .select(`
                *,
                equipment_allocations (
                    *,
                    equipment:equipments (*)
                )
            `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching partner:', error);
            return null;
        }

        return data ? this.mapFromDatabase(data) : null;
    }

    /**
     * Criar novo parceiro
     */
    static async createPartner(partner: Partial<Partner>): Promise<Partner> {
        if (!supabase) throw new Error('Sem conexão com o servidor.');

        const { data, error } = await supabase
            .from('partners')
            .insert([this.mapToDatabase(partner)])
            .select()
            .single();

        if (error) {
            console.error('Error creating partner:', error);
            throw error;
        }

        return this.mapFromDatabase(data);
    }

    /**
     * Atualizar parceiro existente
     */
    static async updatePartner(id: string, partner: Partial<Partner>): Promise<Partner> {
        if (!supabase) throw new Error('Sem conexão com o servidor.');

        const { data, error } = await supabase
            .from('partners')
            .update(this.mapToDatabase(partner))
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating partner:', error);
            throw error;
        }

        return (await this.getPartnerById(id))!;
    }

    /**
     * Deletar parceiro (alocações deletadas via CASCADE)
     */
    static async deletePartner(id: string): Promise<void> {
        if (!supabase) return;

        const { error } = await supabase
            .from('partners')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting partner:', error);
            throw error;
        }
    }

    /**
     * Alocar equipamento a um parceiro
     */
    static async allocateEquipment(
        partnerId: string,
        equipmentId: string,
        quantity: number
    ): Promise<void> {
        if (!supabase) throw new Error('Sem conexão com o servidor.');

        const { error } = await supabase
            .from('equipment_allocations')
            .insert([{
                partner_id: partnerId,
                equipment_id: equipmentId,
                quantity_allocated: quantity,
                status: 'allocated',
            }]);

        if (error) {
            console.error('Error allocating equipment to partner:', error);
            throw error;
        }
    }

    /**
     * Remover alocação específica
     */
    static async removeAllocation(allocationId: string): Promise<void> {
        if (!supabase) return;

        const { error } = await supabase
            .from('equipment_allocations')
            .delete()
            .eq('id', allocationId);

        if (error) {
            console.error('Error removing allocation:', error);
            throw error;
        }
    }

    /**
     * Devolver todos os equipamentos de um parceiro
     */
    static async returnAllEquipment(partnerId: string): Promise<void> {
        if (!supabase) return;

        const { error } = await supabase
            .from('equipment_allocations')
            .update({
                status: 'returned',
                returned_at: new Date().toISOString(),
            })
            .eq('partner_id', partnerId)
            .eq('status', 'allocated');

        if (error) {
            console.error('Error returning equipment:', error);
            throw error;
        }
    }

    /**
     * Mapear dados do banco para o tipo Partner
     */
    private static mapFromDatabase(data: any): Partner {
        return {
            id: data.id,
            name: data.name,
            contactName: data.contact_name,
            contactPhone: data.contact_phone,
            contactEmail: data.contact_email,
            notes: data.notes,
            status: data.status,
            equipmentAllocations: data.equipment_allocations
                ?.filter((alloc: any) => alloc.status === 'allocated')
                ?.map((alloc: any) => ({
                    id: alloc.id,
                    eventId: alloc.event_id,
                    partnerId: alloc.partner_id,
                    equipmentId: alloc.equipment_id,
                    equipment: alloc.equipment ? {
                        id: alloc.equipment.id,
                        name: alloc.equipment.name,
                        brand: alloc.equipment.brand || '',
                        model: alloc.equipment.model || '',
                        category: alloc.equipment.category || 'Outros',
                        watts: Number(alloc.equipment.watts) || 0,
                        voltage: Number(alloc.equipment.voltage) || 110,
                        amperes: Number(alloc.equipment.amperes) || 0,
                        powerFactor: Number(alloc.equipment.power_factor) || 1.0,
                        quantityOwned: Number(alloc.equipment.quantity_owned) || 0,
                        status: alloc.equipment.status || 'active',
                        panelWidth: alloc.equipment.panel_width ? Number(alloc.equipment.panel_width) : undefined,
                        panelHeight: alloc.equipment.panel_height ? Number(alloc.equipment.panel_height) : undefined,
                        panelsPerCase: alloc.equipment.panels_per_case ? Number(alloc.equipment.panels_per_case) : undefined
                    } : undefined,
                    quantityAllocated: alloc.quantity_allocated,
                    status: alloc.status,
                    allocatedAt: alloc.allocated_at,
                    returnedAt: alloc.returned_at,
                })) || [],
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };
    }

    /**
     * Mapear tipo Partner para dados do banco
     */
    private static mapToDatabase(partner: Partial<Partner>): any {
        return {
            name: partner.name,
            contact_name: partner.contactName,
            contact_phone: partner.contactPhone,
            contact_email: partner.contactEmail,
            notes: partner.notes,
            status: partner.status || 'active',
        };
    }
}
