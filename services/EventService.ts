import { supabase } from './supabaseClient';
import { Event, EquipmentAllocation, Equipment } from '../types';

/**
 * EventService - Serviço para gestão de eventos
 * Responsável por CRUD de eventos e gestão automática de estoque
 */
export class EventService {
    /**
     * Buscar todos os eventos
     */
    static async getEvents(): Promise<Event[]> {
        const { data, error } = await supabase
            .from('events')
            .select(`
        *,
        equipment_allocations (
          *,
          equipment:equipments (*)
        )
      `)
            .order('start_date', { ascending: false });

        if (error) {
            console.error('Error fetching events:', error);
            throw error;
        }

        return (data || []).map(this.mapFromDatabase);
    }

    /**
     * Buscar evento por ID
     */
    static async getEventById(id: string): Promise<Event | null> {
        const { data, error } = await supabase
            .from('events')
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
            console.error('Error fetching event:', error);
            return null;
        }

        return data ? this.mapFromDatabase(data) : null;
    }

    /**
     * Criar novo evento com alocações de equipamentos
     */
    static async createEvent(event: Partial<Event>): Promise<Event> {
        // 1. Criar o evento
        const { data: eventData, error: eventError } = await supabase
            .from('events')
            .insert([this.mapToDatabase(event)])
            .select()
            .single();

        if (eventError) {
            console.error('Error creating event:', eventError);
            throw eventError;
        }

        // 2. Criar alocações de equipamentos se houver
        if (event.equipmentAllocations && event.equipmentAllocations.length > 0) {
            const allocations = event.equipmentAllocations.map(alloc => ({
                event_id: eventData.id,
                equipment_id: alloc.equipmentId,
                quantity_allocated: alloc.quantityAllocated,
                status: 'allocated',
            }));

            const { error: allocError } = await supabase
                .from('equipment_allocations')
                .insert(allocations);

            if (allocError) {
                console.error('Error creating allocations:', allocError);
                // Rollback: deletar o evento criado
                await supabase.from('events').delete().eq('id', eventData.id);
                throw allocError;
            }
        }

        // 3. Buscar evento completo com alocações
        return (await this.getEventById(eventData.id))!;
    }

    /**
     * Atualizar evento existente
     */
    static async updateEvent(id: string, event: Partial<Event>): Promise<Event> {
        const { data, error } = await supabase
            .from('events')
            .update(this.mapToDatabase(event))
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating event:', error);
            throw error;
        }

        return (await this.getEventById(id))!;
    }

    /**
     * Deletar evento (alocações são deletadas automaticamente via CASCADE)
     */
    static async deleteEvent(id: string): Promise<void> {
        const { error } = await supabase
            .from('events')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting event:', error);
            throw error;
        }
    }

    /**
     * Adicionar equipamento ao evento
     */
    static async allocateEquipment(
        eventId: string,
        equipmentId: string,
        quantity: number
    ): Promise<void> {
        // Verificar disponibilidade primeiro
        const available = await this.checkAvailability(equipmentId, eventId);

        if (available < quantity) {
            throw new Error(`Apenas ${available} unidades disponíveis`);
        }

        const { error } = await supabase
            .from('equipment_allocations')
            .insert([{
                event_id: eventId,
                equipment_id: equipmentId,
                quantity_allocated: quantity,
                status: 'allocated',
            }]);

        if (error) {
            console.error('Error allocating equipment:', error);
            throw error;
        }
    }

    /**
     * Remover equipamento do evento
     */
    static async removeEquipmentAllocation(allocationId: string): Promise<void> {
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
     * Verificar disponibilidade de equipamento para um evento
     * Retorna a quantidade disponível
     */
    static async checkAvailability(
        equipmentId: string,
        excludeEventId?: string
    ): Promise<number> {
        // Buscar equipamento
        const { data: equipment, error: eqError } = await supabase
            .from('equipments')
            .select('quantity_owned')
            .eq('id', equipmentId)
            .single();

        if (eqError || !equipment) {
            return 0;
        }

        // Buscar alocações ativas (eventos planejados ou em andamento)
        let query = supabase
            .from('equipment_allocations')
            .select(`
        quantity_allocated,
        event:events!inner (status)
      `)
            .eq('equipment_id', equipmentId)
            .eq('status', 'allocated')
            .in('event.status', ['planned', 'in_progress']);

        // Excluir evento atual se fornecido
        if (excludeEventId) {
            query = query.neq('event_id', excludeEventId);
        }

        const { data: allocations, error: allocError } = await query;

        if (allocError) {
            console.error('Error checking availability:', allocError);
            return equipment.quantity_owned;
        }

        // Calcular total alocado
        const totalAllocated = (allocations || []).reduce(
            (sum, alloc) => sum + alloc.quantity_allocated,
            0
        );

        return equipment.quantity_owned - totalAllocated;
    }

    /**
     * Buscar disponibilidade de TODOS os equipamentos de uma vez (otimizado)
     * Retorna um Map com equipment_id => quantity_available
     */
    static async checkAllAvailability(): Promise<Map<string, number>> {
        if (!supabase) return new Map();

        // Buscar todos os equipamentos
        const { data: equipments, error: eqError } = await supabase
            .from('equipments')
            .select('id, quantity_owned');

        if (eqError || !equipments) {
            console.error('Error fetching equipments:', eqError);
            return new Map();
        }

        // Buscar todas as alocações ativas
        const { data: allocations, error: allocError } = await supabase
            .from('equipment_allocations')
            .select(`
                equipment_id,
                quantity_allocated,
                event:events!inner (status)
            `)
            .eq('status', 'allocated')
            .in('event.status', ['planned', 'in_progress']);

        if (allocError) {
            console.error('Error fetching allocations:', allocError);
            return new Map();
        }

        // Calcular disponibilidade para cada equipamento
        const availabilityMap = new Map<string, number>();

        equipments.forEach(eq => {
            const totalAllocated = (allocations || [])
                .filter(alloc => alloc.equipment_id === eq.id)
                .reduce((sum, alloc) => sum + alloc.quantity_allocated, 0);

            const available = eq.quantity_owned - totalAllocated;
            availabilityMap.set(eq.id, available);
        });

        return availabilityMap;
    }

    /**
     * Finalizar evento - devolve todos os equipamentos ao estoque
     */
    static async completeEvent(eventId: string): Promise<void> {
        // Atualizar status do evento
        const { error: eventError } = await supabase
            .from('events')
            .update({ status: 'completed' })
            .eq('id', eventId);

        if (eventError) {
            console.error('Error completing event:', eventError);
            throw eventError;
        }

        // Marcar todas as alocações como devolvidas
        const { error: allocError } = await supabase
            .from('equipment_allocations')
            .update({
                status: 'returned',
                returned_at: new Date().toISOString(),
            })
            .eq('event_id', eventId)
            .eq('status', 'allocated');

        if (allocError) {
            console.error('Error returning equipment:', allocError);
            throw allocError;
        }
    }

    /**
     * Cancelar evento - devolve equipamentos imediatamente
     */
    static async cancelEvent(eventId: string): Promise<void> {
        // Atualizar status do evento
        const { error: eventError } = await supabase
            .from('events')
            .update({ status: 'cancelled' })
            .eq('id', eventId);

        if (eventError) {
            console.error('Error cancelling event:', eventError);
            throw eventError;
        }

        // Marcar todas as alocações como devolvidas
        const { error: allocError } = await supabase
            .from('equipment_allocations')
            .update({
                status: 'returned',
                returned_at: new Date().toISOString(),
            })
            .eq('event_id', eventId)
            .eq('status', 'allocated');

        if (allocError) {
            console.error('Error returning equipment:', allocError);
            throw allocError;
        }
    }

    /**
     * Buscar projetos de distribuição vinculados ao evento
     */
    static async getDistributionProjects(eventId: string) {
        const { data, error } = await supabase
            .from('calculations')
            .select('*')
            .eq('event_id', eventId)
            .eq('type', 'distribution');

        if (error) {
            console.error('Error fetching distribution projects:', error);
            return [];
        }

        return data || [];
    }

    /**
     * Mapear dados do banco para o tipo Event
     */
    private static mapFromDatabase(data: any): Event {
        return {
            id: data.id,
            name: data.name,
            clientName: data.client_name,
            venue: data.location,
            startDate: data.start_date,
            endDate: data.end_date,
            status: data.status,
            notes: data.notes,
            technicalResponsible: data.technical_responsible,
            equipmentAllocations: data.equipment_allocations?.map((alloc: any) => ({
                id: alloc.id,
                eventId: alloc.event_id,
                equipmentId: alloc.equipment_id,
                equipment: alloc.equipment,
                quantityAllocated: alloc.quantity_allocated,
                status: alloc.status,
                allocatedAt: alloc.allocated_at,
                returnedAt: alloc.returned_at
            })) || [],
            createdAt: data.created_at,
            updatedAt: data.updated_at
        };
    }

    /**
     * Mapear tipo Event para dados do banco
     */
    private static mapToDatabase(event: Partial<Event>): any {
        return {
            name: event.name,
            client_name: event.clientName,
            location: event.venue,
            start_date: event.startDate,
            end_date: event.endDate,
            status: event.status || 'planning',
            notes: event.notes,
            technical_responsible: event.technicalResponsible,
        };
    }


}
