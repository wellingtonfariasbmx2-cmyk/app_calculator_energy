import React, { createContext, useContext, useState, useEffect } from 'react';
import { Company, Profile } from '../types';
import { TenantService } from '../services/TenantService';
import { supabase } from '../services/supabaseClient';

interface ConfigContextType {
    company: Company | null;
    profile: Profile | null;
    reloadConfig: () => Promise<void>;
    isLoadingConfig: boolean;
}

const ConfigContext = createContext<ConfigContextType>({
    company: null,
    profile: null,
    reloadConfig: async () => { },
    isLoadingConfig: true,
});

export const useConfig = () => useContext(ConfigContext);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [company, setCompany] = useState<Company | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoadingConfig, setIsLoadingConfig] = useState(true);

    const loadConfig = async () => {
        setIsLoadingConfig(true);
        try {
            const { profile, company } = await TenantService.getCurrentProfile();
            setProfile(profile);
            setCompany(company);
        } catch (err) {
            console.error("Error loading config:", err);
            setProfile(null);
            setCompany(null);
        } finally {
            setIsLoadingConfig(false);
        }
    };

    useEffect(() => {
        // Checagem inicial
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                loadConfig();
            } else {
                setIsLoadingConfig(false);
            }
        });

        // Escuta mudanças de auth para recarregar config se usuário logar/deslogar
        const { data: authListener } = supabase?.auth.onAuthStateChange(
            (event, session) => {
                if (session) {
                    loadConfig();
                } else {
                    setProfile(null);
                    setCompany(null);
                    setIsLoadingConfig(false);
                }
            }
        ) || { data: null };

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, []);

    // Efeito para aplicar THEME na tag <html> removido a pedido do usuário

    // Efeito para aplicar Nome dinâmico na aba do navegador
    useEffect(() => {
        if (company && company.name) {
            document.title = `${company.name} | StageFlow Pro`;
        }
    }, [company?.name]);

    return (
        <ConfigContext.Provider value={{ company, profile, reloadConfig: loadConfig, isLoadingConfig }}>
            {children}
        </ConfigContext.Provider>
    );
};
