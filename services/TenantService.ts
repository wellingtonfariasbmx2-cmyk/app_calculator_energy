import { supabase } from './supabaseClient';
import { Profile } from '../types';

export const TenantService = {
    /**
     * Obtém o perfil do usuário logado e os dados de configuração (agora no perfil)
     */
    getCurrentProfile: async (): Promise<{ profile: Profile | null, company: any | null }> => {
        if (!supabase) return { profile: null, company: null };

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return { profile: null, company: null };

            // Buscar perfil
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (profileError || !profileData) return { profile: null, company: null };

            const profile: Profile = {
                id: profileData.id,
                role: profileData.role,
                email: profileData.email,
                createdAt: profileData.created_at,
                updatedAt: profileData.updated_at
            };

            // Criar um pseudo-objeto "Company" para não quebrar o frontend / PDFs que esperam company.name
            const company = {
                id: profileData.id, // Usa o ID do usuário como ID proform
                name: profileData.company_name || 'StageFlow',
                logoUrl: profileData.company_logo || '',
                theme: 'dark'
            };

            return { profile, company };

        } catch (err) {
            console.error('Error fetching profile data:', err);
            return { profile: null, company: null };
        }
    },

    /**
     * Atualiza as configurações de nome/logo no perfil do usuário
     */
    updateCompany: async (userId: string, updates: any): Promise<void> => {
        if (!supabase) return;

        const dbUpdates: any = {};
        if (updates.name !== undefined) dbUpdates.company_name = updates.name;
        if (updates.logoUrl !== undefined) dbUpdates.company_logo = updates.logoUrl;

        const { error } = await supabase
            .from('profiles')
            .update(dbUpdates)
            .eq('id', userId);

        if (error) throw error;
    }
};
