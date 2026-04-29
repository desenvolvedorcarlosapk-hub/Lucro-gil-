/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Rocket, AlertOctagon, TrendingUp, RefreshCcw, Plus } from 'lucide-react';

const META_PONTO_EQUILIBRIO = 100.00;

export default function App() {
  const [revenue, setRevenue] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);

  const registerSale = useCallback((value: number) => {
    setRevenue((prev) => {
      const next = prev + value;
      // Kodular integration if applicable
      if ((window as any).AppInventor) {
        (window as any).AppInventor.setWebViewString("venda_registrada");
        if (next >= META_PONTO_EQUILIBRIO && prev < META_PONTO_EQUILIBRIO) {
          (window as any).AppInventor.setWebViewString("ponto_equilibrio_batido");
        }
      }
      return next;
    });
  }, []);

  const reset = () => {
    if (confirm("Deseja resetar o fluxo diário?")) {
      setRevenue(0);
    }
  };

  const progress = Math.min((revenue / META_PONTO_EQUILIBRIO) * 100, 100);
  const isProfitActive = revenue >= META_PONTO_EQUILIBRIO;

  useEffect(() => {
    if (isProfitActive) {
      setShowConfetti(true);
    }
  }, [isProfitActive]);

  return (
    <main id="app-container" className="h-screen w-full max-w-md mx-auto flex flex-col p-6 relative">
      {/* Header */}
      <header className="text-center mt-6 mb-10">
        <motion.h1 
          className="text-4xl font-extrabold tracking-tighter text-white drop-shadow-[0_0_15px_rgba(0,243,255,0.8)]"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          LUCRO ÁGIL
        </motion.h1>
        <p className="text-[10px] text-neon-blue uppercase tracking-[0.3em] font-semibold mt-1 opacity-80">
          Gestão Inteligente
        </p>
      </header>

      {/* Alert Badge */}
      <AnimatePresence mode="wait">
        {!isProfitActive ? (
          <motion.div
            key="alert"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-neon-red/15 border border-neon-red text-neon-red py-3 px-4 rounded-2xl text-xs font-bold text-center mb-6 neon-shadow-red flex items-center justify-center gap-2"
          >
            <AlertOctagon size={16} />
            ALERTA: CUSTOS FIXOS EM ABERTO
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-neon-green/15 border border-neon-green text-neon-green py-3 px-4 rounded-2xl text-xs font-bold text-center mb-6 neon-shadow-green flex items-center justify-center gap-2"
          >
            <Rocket size={16} />
            FOGUETE DECOLOU: LUCRO ATIVO
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Metric Card */}
      <section className="glass rounded-[32px] p-8 mb-6 shadow-2xl relative overflow-hidden">
        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest mb-2">
          Faturamento Hoje
        </p>
        <motion.div 
          className="text-5xl font-light text-white mb-6 tabular-nums"
          key={revenue}
          initial={{ scale: 1.05 }}
          animate={{ scale: 1 }}
        >
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(revenue)}
        </motion.div>

        <div className="flex justify-between items-end text-xs mb-3">
          <div className="flex flex-col gap-1">
            <span className="text-gray-500 font-medium uppercase tracking-tighter">Ponto de Equilíbrio</span>
            <span className="text-gray-300 font-mono">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(META_PONTO_EQUILIBRIO)}
            </span>
          </div>
          <motion.span 
            className={`font-bold text-lg ${isProfitActive ? 'text-neon-green' : 'text-neon-blue'}`}
            animate={{ color: isProfitActive ? '#34c759' : '#00f3ff' }}
          >
            {Math.floor(progress)}%
          </motion.span>
        </div>

        <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden border border-white/5">
          <motion.div 
            className={`h-full ${isProfitActive ? 'bg-gradient-to-r from-neon-green to-white' : 'bg-gradient-to-r from-neon-blue to-white'}`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: 'spring', stiffness: 50, damping: 20 }}
            style={{ boxShadow: isProfitActive ? '0 0 15px #34c759' : '0 0 15px #00f3ff' }}
          />
        </div>
      </section>

      {/* Instruction Card */}
      <section className="glass rounded-3xl p-4 text-center mb-6 min-h-[60px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          {!isProfitActive ? (
            <motion.p
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-gray-400 font-medium italic"
            >
              Aguardando registro de vendas para atingir a meta...
            </motion.p>
          ) : (
            <motion.p
              key="active"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-xs text-neon-green font-bold uppercase tracking-wide leading-relaxed"
            >
              🚀 MODO PASTEL CHINÊS ATIVO:<br />
              Libere descontos agressivos agora!
            </motion.p>
          )}
        </AnimatePresence>
      </section>

      {/* Content Spacer */}
      <div className="grow" />

      {/* Actions */}
      <div className="flex flex-col gap-4 mb-2">
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={() => registerSale(2.00)}
          className="bg-ios-blue text-white py-5 rounded-2xl text-lg font-semibold shadow-[0_10px_30px_rgba(0,122,255,0.3)] flex items-center justify-center gap-3 active:brightness-90 transition-all"
        >
          <Plus size={20} />
          REGISTRAR VENDA (R$ 2,00)
        </motion.button>
        
        <button 
          onClick={reset}
          className="text-gray-500 text-sm font-medium hover:text-gray-300 transition-colors py-2 flex items-center justify-center gap-2"
        >
          <RefreshCcw size={14} />
          Limpar Dados do Dia
        </button>
      </div>

      {/* Decorative Blur Backgrounds */}
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-ios-blue/20 blur-[80px] rounded-full pointer-events-none" />
      <div className="absolute top-1/2 -right-10 w-40 h-40 bg-neon-green/10 blur-[80px] rounded-full pointer-events-none" />
    </main>
  );
}
