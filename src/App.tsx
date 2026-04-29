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
            ui.setWebViewString("meta_batida");
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
    <main id="app-container" className="h-screen w-full max-w-[400px] mx-auto flex flex-col p-5 gap-5 relative">
      {/* Header */}
      <header className="text-center pt-5">
        <motion.h1 
          className="text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_0_20px_rgba(0,243,255,0.3)]"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          LUCRO ÁGIL
        </motion.h1>
      </header>

      {/* Status Badge */}
      <motion.div 
        key={isProfitActive ? 'active' : 'pending'}
        className={isProfitActive ? 'status-badge-success' : 'status-badge-pending'}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {isProfitActive ? '🚀 MODO LUCRO ATIVO' : 'Custos Pendentes'}
      </motion.div>

      {/* Main Card */}
      <section className="glass-clean rounded-[24px] py-8 px-5 text-center shadow-xl relative overflow-hidden">
        <p className="text-[13px] text-gray-400 uppercase font-medium tracking-wide mb-2.5">
          FATURAMENTO HOJE
        </p>
        
        {loading ? (
          <div className="h-[78px] flex items-center justify-center">
            <Loader2 className="animate-spin text-neon-blue" size={32} />
          </div>
        ) : (
          <motion.div 
            className="text-[52px] font-light text-white mb-6 tracking-tight tabular-nums"
            key={revenue}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(revenue)}
          </motion.div>
        )}

        <div className="w-full">
          <div className="flex justify-between items-center text-[12px] font-medium text-neon-blue mb-2">
            <span>Progresso</span>
            <span id="display-percent">{Math.floor((revenue / metaPE) * 100)}%</span>
          </div>
          <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <motion.div 
              className="h-full"
              initial={{ width: 0 }}
              animate={{ 
                width: `${progress}%`,
                backgroundColor: isProfitActive ? '#34c759' : '#00f3ff',
                boxShadow: isProfitActive ? '0 0 15px #34c759' : '0 0 15px #00f3ff'
              }}
              transition={{ type: 'spring', stiffness: 50, damping: 20 }}
            />
          </div>
        </div>
      </section>

      {/* Content Spacer */}
      <div className="grow" />

      {/* Action Button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        disabled={registering || loading}
        onClick={() => registerSale(2.00)}
        className="bg-ios-blue text-white py-5 rounded-[20px] text-[17px] font-semibold border-none shadow-[0_10px_25px_rgba(0,122,255,0.4)] flex items-center justify-center gap-3 active:opacity-90 transition-all disabled:opacity-50 mb-7"
      >
        {registering ? <Loader2 className="animate-spin" /> : <Plus size={20} />}
        REGISTRAR VENDA (+ R$ 2,00)
      </motion.button>
    </main>
  );
}


