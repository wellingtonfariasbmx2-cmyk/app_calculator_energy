import React, { useState, useEffect } from 'react';
import { Sparkles, X, CheckCircle, Smartphone, Paintbrush, Zap } from 'lucide-react';

const CURRENT_VERSION = 'v3.2.0';

export function ChangelogModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const lastSeenVersion = localStorage.getItem('stageflow_changelog_version');
    if (lastSeenVersion !== CURRENT_VERSION) {
      // Delay showing it just a bit for a better entrance
      const timer = setTimeout(() => setIsOpen(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem('stageflow_changelog_version', CURRENT_VERSION);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden animate-slide-in-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600/20 to-violet-600/20 p-6 relative border-b border-slate-800">
          <button 
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-cyan-500 to-violet-500 rounded-xl shadow-lg shadow-cyan-500/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Novidades na Plataforma</h2>
          </div>
          <p className="text-sm text-cyan-200/80 font-medium ml-14">Versão {CURRENT_VERSION}</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          
          {/* Feature 1 */}
          <div className="flex gap-4">
            <div className="mt-1 bg-cyan-500/20 p-2 rounded-lg text-cyan-400 shrink-0 h-min">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-bold mb-1">Responsividade 100% Impecável</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Revisamos todos os modais (Equipamentos, Eventos, Calculadora). Removemos o scroll duplo nos celulares, aumentamos a área de toque dos botões numéricos (+) e (-) e padronizamos os botões flutuantes.
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="flex gap-4">
            <div className="mt-1 bg-violet-500/20 p-2 rounded-lg text-violet-400 shrink-0 h-min">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-bold mb-1">Cálculos Automáticos Perfeitos</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                As conversões de Potência, Tensão e Fator de Potência em Amperes agora são validadas de ponta a ponta na aba de Materiais e Energia.
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="flex gap-4">
            <div className="mt-1 bg-emerald-500/20 p-2 rounded-lg text-emerald-400 shrink-0 h-min">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-bold mb-1">Sincronização à Prova de Falhas</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                O salvamento no banco de dados nas nuvens foi protegido contra falhas de variáveis de ambiente. Se a conexão cair, o sistema te avisa sem quebrar a tela.
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/50">
          <button 
            onClick={handleClose}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 transition-all active:scale-95"
          >
            <CheckCircle className="w-5 h-5" />
            Entendi, vamos lá!
          </button>
        </div>
      </div>
    </div>
  );
}
