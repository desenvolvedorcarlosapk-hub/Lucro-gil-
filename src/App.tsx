/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Rocket, AlertOctagon, RefreshCcw, Plus, Loader2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Configuration from your request
const SB_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ozszexhkdiggsxymmtgo.supabase.co';
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96c3pleGhrZGlnZ3NjeW1tdGdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MDY5NzUsImV4cCI6MjA5Mjk4Mjk3NX0.C_XrfLUWQ13coyzgFzqaKhP7pjaFZ5-sJIctqrr7MCk';
const supabase = createClient(SB_URL, SB_KEY);

export default function App() {
  const [revenue, setRevenue] = useState(0);
  const [metaPE, setMetaPE] = useState(100); // Default fallback
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  // 1. CARREGA O PONTO DE EQUILÍBRIO DA TABELA 'METAS'
  const fetchMeta = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('metas').select('valor_pe').single();
      if (data && !error) {
        setMetaPE(parseFloat(data.valor_pe));
      }
    } catch (e) {
      console.error("Erro meta:", e);
    }
  }, []);

  // 2. SOMA AS VENDAS DE HOJE
  const fetchDailyRevenue = useCallback(async () => {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('vendas')
        .select('valor')
        .gte('criado_em', hoje);

      if (!error && data) {
        const total = data.reduce((acc, item) => acc + parseFloat(item.valor), 0);
        setRevenue(total);
      }
    } catch (err) {
      console.error("Error fetching revenue:", err);
    }
  }, []);

  // Initialization
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchMeta(), fetchDailyRevenue()]);
      setLoading(false);
    };
    init();
  }, [fetchMeta, fetchDailyRevenue]);

  // 3. REGISTA A VENDA NO BANCO E ATUALIZA A TELA
  const registerSale = useCallback(async (value: number) => {
    setRegistering(true);
    try {
      const { error } = await supabase.from('vendas').insert([{ valor: value }]);
      
      if (!error) {
        await fetchDailyRevenue();
        
        // Kodular/AppInventor integration
        if ((window as any).AppInventor) {
          const ui = (window as any).AppInventor;
          ui.setWebViewString("venda_ok");
          
          if (revenue + value >= metaPE && revenue < metaPE) {
            ui.setWebViewString("ponto_equilibrio_batido");
          }
        }
      } else {
        alert("Erro ao gravar: " + error.message);
      }
    } catch (err) {
      console.error("Error registering sale:", err);
    } finally {
      setRegistering(false);
    }
  }, [fetchDailyRevenue, revenue, metaPE]);

  const progress = Math.min((revenue / metaPE) * 100, 100);
  const isProfitActive = revenue >= metaPE;

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
      </header>

      {/* Alert Badge */}
      <AnimatePresence mode="wait">
        {!isProfitActive ? (
          <motion.div
            key="alert"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-neon-red/15 border border-neon-red text-neon-red py-3 px-4 rounded-2xl text-[13px] font-bold text-center mb-6 neon-shadow-red flex items-center justify-center gap-2"
          >
            <AlertOctagon size={16} />
            EM BUSCA DO PONTO DE EQUILÍBRIO
          </motion.div>
        ) : (
          <motion.div
            key="success"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-neon-green/15 border border-neon-green text-neon-green py-3 px-4 rounded-2xl text-[13px] font-bold text-center mb-6 neon-shadow-green flex items-center justify-center gap-2"
            style={{ textShadow: '0 0 10px #34c759' }}
          >
            <Rocket size={16} />
            🚀 MODO LUCRO ATIVO
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Metric Card */}
      <section className="glass rounded-[32px] p-8 mb-6 shadow-2xl relative overflow-hidden">
        <p className="text-[12px] text-gray-400 uppercase font-bold tracking-widest mb-2">
          Faturamento Hoje
        </p>
        
        {loading ? (
          <div className="h-[60px] flex items-center">
            <Loader2 className="animate-spin text-neon-blue" size={32} />
          </div>
        ) : (
          <motion.div 
            className="text-5xl font-light text-white mb-6 tabular-nums"
            key={revenue}
            initial={{ scale: 1.05 }}
            animate={{ scale: 1 }}
          >
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(revenue)}
          </motion.div>
        )}

        <div className="flex justify-between items-end text-[12px] mb-3">
          <div className="flex flex-col gap-1">
            <span className="text-gray-500 font-bold uppercase tracking-tighter">Meta Diária (P.E)</span>
            <span className="text-gray-300 font-medium">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metaPE)}
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
              Aguardando registro de vendas...
            </motion.p>
          ) : (
            <motion.p
              key="active"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-xs text-neon-green font-bold uppercase tracking-wide leading-relaxed"
            >
              🚀 MODO PASTEL CHINÊS:<br />
              Meta batida! Foque no lucro agora.
            </motion.p>
          )}
        </AnimatePresence>
      </section>

      {/* Content Spacer */}
      <div className="grow" />

      {/* Actions */}
      <div className="flex flex-col gap-4 mb-10">
        <motion.button
          whileTap={{ scale: 0.96 }}
          disabled={registering || loading}
          onClick={() => registerSale(2.00)}
          className="bg-ios-blue text-white py-[22px] rounded-3xl text-lg font-semibold shadow-[0_10px_20px_rgba(0,122,255,0.3)] flex items-center justify-center gap-3 active:brightness-90 transition-all disabled:opacity-50"
        >
          {registering ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
          REGISTRAR VENDA (R$ 2,00)
        </motion.button>
        
        <button 
          onClick={async () => {
             if (confirm("Deseja atualizar os dados?")) {
               setLoading(true);
               await fetchDailyRevenue();
               setLoading(false);
             }
          }}
          className="text-gray-500 text-sm font-medium hover:text-gray-300 transition-colors py-2 flex items-center justify-center gap-2"
        >
          <RefreshCcw size={14} />
          Atualizar Fluxo
        </button>
      </div>

      {/* Decorative Blur Backgrounds */}
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-ios-blue/20 blur-[80px] rounded-full pointer-events-none" />
      <div className="absolute top-1/2 -right-10 w-40 h-40 bg-neon-green/10 blur-[80px] rounded-full pointer-events-none" />
    </main>
  );
}


