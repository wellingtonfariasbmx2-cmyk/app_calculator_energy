import React, { useState, useEffect } from 'react';
import { useConfig } from './ConfigContext';
import { TenantService } from '../services/TenantService';
import { Building2, Palette, Users, Save, Image as ImageIcon, Link2, Plus, Trash2, Mail, Upload, Copy } from 'lucide-react';
import { useToast } from './Toast';
import { Profile } from '../types';

export function SettingsView() {
    const { company, profile, reloadConfig } = useConfig();
    const { success, error: showError, info } = useToast();

    const [name, setName] = useState('');
    const [logoUrl, setLogoUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (company) {
            setName(company.name || '');
            setLogoUrl(company.logoUrl || '');
        }
    }, [company]);


    const handleSaveCompany = async () => {
        if (!company) return;
        setIsSaving(true);
        try {
            await TenantService.updateCompany(company.id, { name, logoUrl });
            await reloadConfig();
            success('Configurações da empresa atualizadas!');
        } catch (err) {
            showError('Erro ao salvar as configurações.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            showError('A imagem deve ter no máximo 2MB.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setLogoUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
    };



    return (
        <div className="max-w-4xl mx-auto space-y-6 pt-6 animate-fade-in pb-12">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Configurações</h1>
                    <p className="text-slate-400 mt-1">Gerencie a identidade e a equipe da sua empresa.</p>
                </div>
            </div>

            {/* Seção 1: Identidade Visual */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                        <Building2 className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Identidade da Empresa</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Nome da Empresa</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="Ex: StageFlow Eventos"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Logomarca (Upload ou URL)</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        value={logoUrl}
                                        onChange={(e) => setLogoUrl(e.target.value)}
                                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        placeholder="https://exemplo.com/logo.png"
                                    />
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    id="logo-upload"
                                    className="hidden"
                                    onChange={handleLogoUpload}
                                />
                                <label
                                    htmlFor="logo-upload"
                                    className="px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl cursor-pointer flex items-center justify-center transition-all bg-gradient-to-r hover:from-slate-700 hover:to-slate-600 shrink-0"
                                    title="Fazer Upload de Arquivo"
                                >
                                    <Upload className="w-5 h-5 mx-1" />
                                </label>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">Faça upload da imagem ou cole a URL. Ela aparecerá no topo do app e nos PDFs.</p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 rounded-xl bg-slate-900/20">
                        <span className="text-sm text-slate-500 mb-4 font-medium uppercase tracking-wider">Preview da Logo</span>
                        {logoUrl ? (
                            <img src={logoUrl} alt="Logo Preview" className="max-h-32 object-contain" onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Erro+na+Imagem';
                            }} />
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 text-slate-600" />
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-8 flex justify-end">
                    <button
                        onClick={handleSaveCompany}
                        disabled={isSaving}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all disabled:opacity-50"
                    >
                        {isSaving ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <Save className="w-5 h-5" />}
                        {isSaving ? 'Salvando...' : 'Salvar Configurações'}
                    </button>
                </div>
            </div>


        </div>
    );
}
