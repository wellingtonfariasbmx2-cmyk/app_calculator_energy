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

        const events = (data || []).map(this.mapFromDatabase);

        // Auto-update statuses based on dates
        await this.reconcileEventStatuses(events);

        return events;
    }

    /**
     * Reconcilia os status dos eventos baseados nas datas atuais
     */
    private static async reconcileEventStatuses(events: Event[]): Promise<void> {
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Consideramos apenas a data, sem o horário para o início/fim

        for (const event of events) {
            if (event.status === 'cancelled' || event.status === 'completed') continue;

            const startDate = new Date(event.startDate);
            startDate.setHours(0, 0, 0, 0);

            const endDate = new Date(event.endDate || event.startDate);
            endDate.setHours(23, 59, 59, 999);

            let newStatus: Event['status'] | null = null;

            if (now > endDate) {
                newStatus = 'completed';
            } else if (now >= startDate && now <= endDate && event.status === 'planned') {
                newStatus = 'in_progress';
            }

            if (newStatus) {
                try {
                    // Atualiza localmente o objeto para refletir na UI imediatamente
                    event.status = newStatus;

                    // Persiste no banco de dados de forma silenciosa
                    await supabase
                        .from('events')
                        .update({ status: newStatus })
                        .eq('id', event.id);

                    console.log(`Status do evento ${event.name} atualizado automaticamente para ${newStatus}`);
                } catch (err) {
                    console.error('Erro ao atualizar status automático do evento:', err);
                }
            }
        }
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
     * Retorna a quantidade disponível baseado em conflito de datas.
     */
    static async checkAvailability(
        equipmentId: string,
        excludeEventId?: string
    ): Promise<number> {
        if (!supabase) return -1;

        // 1. Determinar de qual data estamos falando
        let targetStart = new Date();
        let targetEnd = new Date();
        targetStart.setHours(0, 0, 0, 0);
        targetEnd.setHours(23, 59, 59, 999);

        if (excludeEventId) {
            const { data: targetEvent } = await supabase
                .from('events')
                .select('start_date, end_date')
                .eq('id', excludeEventId)
                .single();
            if (targetEvent) {
                targetStart = new Date(targetEvent.start_date);
                targetStart.setHours(0, 0, 0, 0);
                targetEnd = new Date(targetEvent.end_date || targetEvent.start_date);
                targetEnd.setHours(23, 59, 59, 999);
            }
        }

        // Buscar equipamento
        const { data: equipment, error: eqError } = await supabase
            .from('equipments')
            .select('quantity_owned')
            .eq('id', equipmentId)
            .single();

        if (eqError || !equipment) {
            return -1;
        }

        // Buscar alocações ativas
        const { data: allocations, error: allocError } = await supabase
            .from('equipment_allocations')
            .select(`
                quantity_allocated,
                event_id,
                event:events!inner (status, start_date, end_date)
            `)
            .eq('equipment_id', equipmentId)
            .eq('status', 'allocated')
            .in('event.status', ['planned', 'in_progress']);

        if (allocError) {
            console.error('Error checking availability:', allocError);
            return equipment.quantity_owned;
        }

        // Calcular total alocado considerando CONFLITO DE DATAS
        const totalAllocated = (allocations || [])
            .filter(alloc => alloc.event_id !== excludeEventId)
            .filter(alloc => {
                const allocEvent = alloc.event as any;
                const allocStart = new Date(allocEvent.start_date);
                allocStart.setHours(0, 0, 0, 0);
                const allocEnd = new Date(allocEvent.end_date || allocEvent.start_date);
                allocEnd.setHours(23, 59, 59, 999);

                // Há conflito se o evento B começa antes de A terminar E B termina depois de A começar
                return (allocStart <= targetEnd && allocEnd >= targetStart);
            })
            .reduce((sum, alloc) => sum + alloc.quantity_allocated, 0);

        return equipment.quantity_owned - totalAllocated;
    }

    /**
     * Buscar disponibilidade de TODOS os equipamentos de uma vez (otimizado)
     * Retorna a quantidade livre HOJE (eventos que estão ocorrendo na data atual)
     */
    static async checkAllAvailability(): Promise<Map<string, number>> {
        if (!supabase) return new Map();

        const { data: equipments, error: eqError } = await supabase
            .from('equipments')
            .select('id, quantity_owned');

        if (eqError || !equipments) {
            console.error('Error fetching equipments:', eqError);
            return new Map();
        }

        const { data: allocations, error: allocError } = await supabase
            .from('equipment_allocations')
            .select(`
                equipment_id,
                quantity_allocated,
                event:events!inner (status, start_date, end_date)
            `)
            .eq('status', 'allocated')
            .in('event.status', ['planned', 'in_progress']);

        if (allocError) {
            console.error('Error fetching allocations:', allocError);
            return new Map();
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tonight = new Date();
        tonight.setHours(23, 59, 59, 999);

        const availabilityMap = new Map<string, number>();

        equipments.forEach(eq => {
            const totalAllocated = (allocations || [])
                .filter(alloc => alloc.equipment_id === eq.id)
                .filter(alloc => {
                    const allocEvent = alloc.event as any;
                    const allocStart = new Date(allocEvent.start_date);
                    allocStart.setHours(0, 0, 0, 0);
                    const allocEnd = new Date(allocEvent.end_date || allocEvent.start_date);
                    allocEnd.setHours(23, 59, 59, 999);

                    // Verifica se o evento está ocorrendo HOJE
                    return (allocStart <= tonight && allocEnd >= today);
                })
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
            type: 'event',
            name: data.name,
            clientName: data.client_name,
            venue: data.location,
            address: data.address,
            startDate: data.start_date,
            endDate: data.end_date,
            setupTime: data.setup_time,
            eventTime: data.event_time,
            status: data.status,
            notes: data.notes,
            technicalResponsible: data.technical_responsible,
            equipmentAllocations: data.equipment_allocations?.map((alloc: any) => ({
                id: alloc.id,
                eventId: alloc.event_id,
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
            address: event.address,
            start_date: event.startDate,
            end_date: event.endDate,
            setup_time: event.setupTime,
            event_time: event.eventTime,
            status: event.status || 'planned',
            notes: event.notes,
            technical_responsible: event.technicalResponsible,
        };
    }


}
