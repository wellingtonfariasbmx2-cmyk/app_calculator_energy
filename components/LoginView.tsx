import React, { useState } from 'react';
import { Layers, Mail, Lock, ArrowRight, Chrome, Sparkles } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { useToast } from './Toast';

interface LoginViewProps {
    onLoginSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const { error, success } = useToast();

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isSignUp) {
                const { error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (signUpError) throw signUpError;
                success('Cadastro realizado! Verifique seu e-mail.');
            } else {
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (signInError) throw signInError;
                onLoginSuccess();
            }
        } catch (err: any) {
            error(err.message || 'Erro na autenticação');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const { error: googleError } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/`,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent select_account',
                    },
                }
            });
            if (googleError) throw googleError;
        } catch (err: any) {
            error('Erro ao conectar com Google');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Gradient Orbs */}
                <div className="absolute top-1/4 -left-20 w-[500px] h-[500px] bg-cyan-600/15 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-1/4 -right-20 w-[500px] h-[500px] bg-violet-600/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1.5s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-emerald-600/8 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '3s' }}></div>

                {/* Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.03]" style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                    backgroundSize: '60px 60px'
                }}></div>

                {/* Stage Light Beams */}
                <div className="absolute top-0 left-1/3 w-px h-40 bg-gradient-to-b from-cyan-400/30 to-transparent animate-pulse" style={{ animationDuration: '3s' }}></div>
                <div className="absolute top-0 right-1/3 w-px h-32 bg-gradient-to-b from-violet-400/30 to-transparent animate-pulse" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}></div>
                <div className="absolute top-0 left-1/2 w-px h-48 bg-gradient-to-b from-emerald-400/20 to-transparent animate-pulse" style={{ animationDuration: '3.5s', animationDelay: '1s' }}></div>
            </div>

            <div className="bg-surface/80 backdrop-blur-2xl border border-slate-700/40 p-8 sm:p-10 rounded-3xl shadow-2xl shadow-black/50 w-full max-w-md relative z-10 animate-fade-in">
                {/* Logo & Title */}
                <div className="text-center mb-8">
                    <div className="relative inline-block mb-5">
                        <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 via-blue-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-cyan-500/30 mx-auto rotate-3 hover:rotate-0 transition-transform duration-500">
                            <Layers className="w-10 h-10 text-white" strokeWidth={2.5} />
                        </div>
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                            <Sparkles className="w-3 h-3 text-white" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-black text-white mb-1 tracking-tight">
                        Stage<span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">Flow</span>
                    </h1>
                    <p className="text-slate-500 text-sm">Gestão Inteligente de Eventos</p>
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">E-mail</label>
                        <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="email"
                                required
                                className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl px-4 py-3.5 pl-11 text-white focus:border-cyan-500 focus:bg-slate-900 focus:ring-1 focus:ring-cyan-500/20 outline-none transition-all placeholder:text-slate-600"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Senha</label>
                        <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="password"
                                required
                                minLength={6}
                                className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl px-4 py-3.5 pl-11 text-white focus:border-cyan-500 focus:bg-slate-900 focus:ring-1 focus:ring-cyan-500/20 outline-none transition-all placeholder:text-slate-600"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-cyan-900/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                    >
                        {loading ? (
                            <span className="animate-pulse">Carregando...</span>
                        ) : (
                            <>
                                {isSignUp ? 'Criar Conta' : 'Entrar'} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-700/50"></div></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-surface px-3 text-slate-500">Ou continue com</span></div>
                </div>

                <button
                    onClick={handleGoogleLogin}
                    type="button"
                    className="w-full bg-white hover:bg-slate-50 text-slate-900 font-bold py-3.5 rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                    <Chrome className="w-5 h-5 text-blue-500" /> Google
                </button>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-sm text-slate-400 hover:text-cyan-400 transition-colors hover:underline"
                    >
                        {isSignUp ? 'Já tem uma conta? Entre' : 'Não tem conta? Cadastre-se'}
                    </button>
                </div>
            </div>

            <div className="absolute bottom-4 text-slate-600 text-xs flex items-center gap-2">
                <Layers className="w-3 h-3" />
                StageFlow Pro v3.0 • Design by Farias Light
            </div>
        </div>
    );
};
