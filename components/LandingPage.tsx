import React from 'react';
import { Zap, Cable, FileText, Activity, BookOpen, ChevronRight, Sparkles, TrendingUp, Shield, Music, Lightbulb, Users, CheckCircle } from 'lucide-react';

interface LandingPageProps {
    onEnter: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white overflow-hidden">
            {/* Simplified Animated Background - Performance Optimized */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40">
                {/* Glowing Orbs - Reduced to 2 for performance */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/30 rounded-full blur-3xl animate-pulse" style={{ willChange: 'opacity' }}></div>
                <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-purple-600/30 rounded-full blur-3xl animate-pulse" style={{ willChange: 'opacity', animationDelay: '1.5s' }}></div>

                {/* Stage Lights Effect - Simple & Performant */}
                <div className="absolute top-0 left-1/2 w-1 h-64 bg-gradient-to-b from-yellow-400/40 to-transparent transform -translate-x-1/2 blur-sm animate-pulse" style={{ animationDuration: '3s' }}></div>
                <div className="absolute top-0 left-1/3 w-1 h-48 bg-gradient-to-b from-blue-400/40 to-transparent blur-sm animate-pulse" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}></div>
                <div className="absolute top-0 right-1/3 w-1 h-48 bg-gradient-to-b from-pink-400/40 to-transparent blur-sm animate-pulse" style={{ animationDuration: '2.8s', animationDelay: '1s' }}></div>
            </div>

            <div className="relative z-10">
                {/* Hero Section */}
                <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-20">
                    <div className="max-w-6xl mx-auto text-center space-y-8">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-full text-purple-300 text-sm font-bold uppercase tracking-wider backdrop-blur-sm">
                            <Music className="w-5 h-5" />
                            <span>LightLoad Pro</span>
                            <span className="text-xs bg-emerald-500/20 px-2 py-0.5 rounded-full text-emerald-400">Para Eventos</span>
                        </div>

                        {/* Main Heading */}
                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-tight">
                            <span className="block bg-gradient-to-r from-white via-purple-100 to-pink-200 bg-clip-text text-transparent">
                                Distribuição Elétrica
                            </span>
                            <span className="block bg-gradient-to-r from-purple-400 via-pink-500 to-rose-600 bg-clip-text text-transparent">
                                Para Shows e Eventos
                            </span>
                        </h1>

                        {/* Subtitle */}
                        <p className="text-xl sm:text-2xl text-slate-300 max-w-4xl mx-auto leading-relaxed">
                            <Lightbulb className="inline w-7 h-7 text-yellow-400 mr-2" />
                            Sistema profissional para calcular carga de <strong className="text-white">iluminação</strong>,
                            <strong className="text-white"> som</strong>, <strong className="text-white">vídeo</strong> e gerar
                            <strong className="text-white"> mapas de energia</strong> completos
                        </p>

                        {/* Use Cases */}
                        <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-slate-400 pt-4">
                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700 backdrop-blur-sm">
                                <Music className="w-4 h-4 text-purple-400" />
                                <span>Festivais</span>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700 backdrop-blur-sm">
                                <Users className="w-4 h-4 text-pink-400" />
                                <span>Shows</span>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700 backdrop-blur-sm">
                                <Lightbulb className="w-4 h-4 text-yellow-400" />
                                <span>Produção Técnica</span>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700 backdrop-blur-sm">
                                <Activity className="w-4 h-4 text-blue-400" />
                                <span>Palcos</span>
                            </div>
                        </div>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
                            <button
                                onClick={onEnter}
                                className="group px-10 py-5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-2xl font-bold text-xl shadow-2xl shadow-purple-500/30 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center gap-3"
                            >
                                <Zap className="w-6 h-6" />
                                <span>Acessar Plataforma</span>
                                <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button
                                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                                className="px-10 py-5 bg-slate-800/80 hover:bg-slate-700 border-2 border-slate-600 hover:border-purple-500/50 rounded-2xl font-bold text-xl transition-all duration-300 hover:scale-105 backdrop-blur-sm"
                            >
                                Ver Recursos
                            </button>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-16 max-w-4xl mx-auto">
                            <div className="p-6 bg-slate-800/60 rounded-2xl border border-slate-700/50 hover:border-purple-500/50 transition-all duration-300 backdrop-blur-sm">
                                <div className="text-3xl font-black bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">100%</div>
                                <div className="text-sm text-slate-400 mt-1 font-medium">Gratuito</div>
                            </div>
                            <div className="p-6 bg-slate-800/60 rounded-2xl border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 backdrop-blur-sm">
                                <div className="flex items-center justify-center">
                                    <Shield className="w-7 h-7 text-blue-400 mr-1" />
                                    <span className="text-3xl font-black text-blue-400">NBR</span>
                                </div>
                                <div className="text-sm text-slate-400 mt-1 font-medium">5410</div>
                            </div>
                            <div className="p-6 bg-slate-800/60 rounded-2xl border border-slate-700/50 hover:border-purple-500/50 transition-all duration-300 backdrop-blur-sm">
                                <div className="flex items-center justify-center">
                                    <FileText className="w-7 h-7 text-purple-400 mr-1" />
                                    <span className="text-3xl font-black text-purple-400">PDF</span>
                                </div>
                                <div className="text-sm text-slate-400 mt-1 font-medium">Relatórios</div>
                            </div>
                            <div className="p-6 bg-slate-800/60 rounded-2xl border border-slate-700/50 hover:border-pink-500/50 transition-all duration-300 backdrop-blur-sm">
                                <div className="flex items-center justify-center">
                                    <TrendingUp className="w-7 h-7 text-pink-400 mr-1" />
                                    <span className="text-3xl font-black text-pink-400">AUTO</span>
                                </div>
                                <div className="text-sm text-slate-400 mt-1 font-medium">Balance</div>
                            </div>
                        </div>
                    </div>

                    {/* Scroll Indicator */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
                        <div className="w-6 h-10 border-2 border-purple-500/50 rounded-full p-1">
                            <div className="w-1.5 h-3 bg-purple-400 rounded-full mx-auto animate-pulse"></div>
                        </div>
                    </div>
                </div>

                {/* Event-Specific Use Cases */}
                <div className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900/50 to-slate-900">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16 space-y-4">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-300 text-sm font-bold uppercase tracking-wider">
                                <Music className="w-4 h-4" />
                                <span>Para Profissionais</span>
                            </div>
                            <h2 className="text-4xl sm:text-5xl font-black">
                                <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                                    Ideal Para Seu Evento
                                </span>
                            </h2>
                        </div>

                        {/* Event Type Cards */}
                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="group p-8 bg-gradient-to-br from-slate-800/80 to-purple-900/20 border border-slate-700 hover:border-purple-500/50 rounded-2xl transition-all duration-300 hover:scale-105">
                                <Music className="w-12 h-12 text-purple-400 mb-4" />
                                <h3 className="text-2xl font-bold mb-3">Shows & Festivais</h3>
                                <p className="text-slate-400 mb-6 leading-relaxed">
                                    Calcule carga de iluminação moving head, LED wall, som line array e backline completo.
                                </p>
                                <ul className="space-y-2 text-sm text-slate-300">
                                    <li className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                        <span>Distribuição por palco</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                        <span>Mapa de mainpower 3Ø</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                        <span>Cálculo de gerador</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="group p-8 bg-gradient-to-br from-slate-800/80 to-pink-900/20 border border-slate-700 hover:border-pink-500/50 rounded-2xl transition-all duration-300 hover:scale-105">
                                <Lightbulb className="w-12 h-12 text-pink-400 mb-4" />
                                <h3 className="text-2xl font-bold mb-3">Produção Técnica</h3>
                                <p className="text-slate-400 mb-6 leading-relaxed">
                                    Projete infraestrutura elétrica para palcos, camarotes, áreas VIP e backstage.
                                </p>
                                <ul className="space-y-2 text-sm text-slate-300">
                                    <li className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                        <span>Especificação de cabos</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                        <span>Disjuntores NBR 5410</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                        <span>Relatórios técnicos</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="group p-8 bg-gradient-to-br from-slate-800/80 to-blue-900/20 border border-slate-700 hover:border-blue-500/50 rounded-2xl transition-all duration-300 hover:scale-105">
                                <Users className="w-12 h-12 text-blue-400 mb-4" />
                                <h3 className="text-2xl font-bold mb-3">Empresas & Locadoras</h3>
                                <p className="text-slate-400 mb-6 leading-relaxed">
                                    Valide projetos de clientes e gere orçamentos técnicos profissionais rapidamente.
                                </p>
                                <ul className="space-y-2 text-sm text-slate-300">
                                    <li className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                        <span>Biblioteca de equipamentos</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                        <span>Export PDF/CSV</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                                        <span>Projetos ilimitados</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Features Section */}
                <div id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900/80">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16 space-y-4">
                            <h2 className="text-4xl sm:text-5xl font-black">
                                <span className="bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                                    Recursos Completos
                                </span>
                            </h2>
                            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                                Tudo que você precisa para distribuição elétrica em eventos
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[
                                {
                                    icon: Zap,
                                    title: "Cálculo Preciso",
                                    desc: "Calcule watts, amperes e VA de moving heads, LEDs, amplificadores e qualquer equipamento.",
                                    color: "purple"
                                },
                                {
                                    icon: TrendingUp,
                                    title: "Auto Balanceamento",
                                    desc: "Distribua circuitos automaticamente entre fases A, B e C para máxima eficiência.",
                                    color: "pink"
                                },
                                {
                                    icon: Cable,
                                    title: "Cabos & Conectores",
                                    desc: "Recomendação de bitola (2.5mm², 4mm², 6mm²) e tipo de conector seguindo NBR 5410.",
                                    color: "blue"
                                },
                                {
                                    icon: Activity,
                                    title: "Mainpower 3Ø",
                                    desc: "Configure mainpower trifásico, gerador e visualize distribuição por racks/fases.",
                                    color: "indigo"
                                },
                                {
                                    icon: FileText,
                                    title: "Relatórios PDF",
                                    desc: "Gere mapas de energia profissionais com alertas, status e especificações completas.",
                                    color: "emerald"
                                },
                                {
                                    icon: BookOpen,
                                    title: "Banco de Dados",
                                    desc: "Biblioteca completa de equipamentos para iluminação, som, vídeo e estrutura.",
                                    color: "orange"
                                },
                            ].map((feature, i) => (
                                <div
                                    key={i}
                                    className={`group p-6 bg-slate-800/60 border border-slate-700 hover:border-${feature.color}-500/50 rounded-2xl transition-all duration-300 hover:-translate-y-1 backdrop-blur-sm`}
                                >
                                    <div className={`w-14 h-14 bg-gradient-to-br from-${feature.color}-500 to-${feature.color}-600 rounded-xl flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110`}>
                                        <feature.icon className="w-7 h-7 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                                    <p className="text-slate-400 leading-relaxed text-sm">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Final CTA */}
                <div className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900 to-slate-950">
                    <div className="max-w-5xl mx-auto text-center space-y-10">
                        <h2 className="text-5xl sm:text-6xl font-black">
                            <span className="bg-gradient-to-r from-white via-purple-200 to-pink-300 bg-clip-text text-transparent">
                                Pronto Para o Próximo Show?
                            </span>
                        </h2>
                        <p className="text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
                            Junte-se aos técnicos e produtores que já usam LightLoad Pro em eventos pelo Brasil.
                        </p>
                        <button
                            onClick={onEnter}
                            className="group px-12 py-6 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 hover:from-purple-500 hover:via-pink-500 hover:to-rose-500 rounded-2xl font-bold text-2xl shadow-2xl shadow-purple-500/40 transition-all duration-300 hover:scale-105 active:scale-95 inline-flex items-center gap-4"
                        >
                            <Zap className="w-8 h-8" />
                            <span>Começar Gratuitamente</span>
                            <ChevronRight className="w-8 h-8 group-hover:translate-x-2 transition-transform" />
                        </button>
                        <p className="text-slate-500 text-sm mt-6">
                            100% Gratuito • Sem Cadastro de Cartão • Projetos Ilimitados
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-800/50 bg-slate-950 py-10 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
                                <Zap className="w-5 h-5 text-white" />
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-white">LightLoad Pro</div>
                                <div className="text-sm text-slate-400">Distribuição Elétrica para Eventos</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-slate-500">
                            <div className="flex items-center gap-2">
                                <Shield className="w-4 h-4 text-emerald-400" />
                                <span>Seguro</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Music className="w-4 h-4 text-purple-400" />
                                <span>Para Eventos</span>
                            </div>
                            <div>© {new Date().getFullYear()}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
