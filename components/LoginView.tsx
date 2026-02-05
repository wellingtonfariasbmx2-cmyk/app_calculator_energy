import React, { useState } from 'react';
import { Zap, Mail, Lock, ArrowRight, Chrome } from 'lucide-react';
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
            });
            if (googleError) throw googleError;
        } catch (err: any) {
            error('Erro ao conectar com Google');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="bg-surface/80 backdrop-blur-xl border border-slate-700/50 p-8 rounded-2xl shadow-2xl w-full max-w-md relative z-10 animate-fade-in">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mx-auto mb-4">
                        <Zap className="w-8 h-8 text-white fill-current" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Bem-vindo ao LightLoad</h1>
                    <p className="text-slate-400">Faça login para acessar seus projetos.</p>
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">E-mail</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="email"
                                required
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 pl-10 text-white focus:border-blue-500 focus:bg-slate-900 outline-none transition-all placeholder:text-slate-600"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Senha</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="password"
                                required
                                minLength={6}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 pl-10 text-white focus:border-blue-500 focus:bg-slate-900 outline-none transition-all placeholder:text-slate-600"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 group"
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
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-700"></div></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-surface px-2 text-slate-500">Ou continue com</span></div>
                </div>

                <button
                    onClick={handleGoogleLogin}
                    type="button"
                    className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-3.5 rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    <Chrome className="w-5 h-5 text-blue-500" /> Google
                </button>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-sm text-slate-400 hover:text-white transition-colors hover:underline"
                    >
                        {isSignUp ? 'Já tem uma conta? Entre' : 'Não tem conta? Cadastre-se'}
                    </button>
                </div>
            </div>

            <div className="absolute bottom-4 text-slate-500 text-xs opacity-50">
                LightLoad Pro v2.1 • Design by Farias Light
            </div>
        </div>
    );
};
