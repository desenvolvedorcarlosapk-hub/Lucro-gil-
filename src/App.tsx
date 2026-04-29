/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Rocket, AlertOctagon, TrendingUp, RefreshCcw, Plus, Loader2, BarChart2, DollarSign, Settings } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Configuration from your request
const SB_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ozszexhkdiggsxymmtgo.supabase.co';
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96c3pleGhrZGlnZ3NjeW1tdGdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MDY5NzUsImV4cCI6MjA5Mjk4Mjk3NX0.C_XrfLUWQ13coyzgFzqaKhP7pjaFZ5-sJIctqrr7MCk';
const supabase = createClient(SB_URL, SB_KEY);

type TabType = 'dash' | 'vendas' | 'config';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dash');
  
  const [revenue, setRevenue] = useState(0);
  const [metaPE, setMetaPE] = useState(100);
  const [metaId, setMetaId] = useState<string | number | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  // Input states
  const [saleValue, setSaleValue] = useState<string>('');
  const [settingMeta, setSettingMeta] = useState<string>('');

  // 1. CARREGA O PONTO DE EQUILÍBRIO DA TABELA 'METAS'
  const fetchMeta = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('metas').select('id, valor_pe').single();
      if (data && !error) {
        setMetaPE(parseFloat(data.valor_pe));
        setSettingMeta(data.valor_pe.toString());
        if (data.id) setMetaId(data.id);
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
  const registerSale = useCallback(async () => {
    if (!saleValue) return;
    const value = parseFloat(saleValue.replace(',', '.'));
    if (isNaN(value)) return;

    setRegistering(true);
    try {
      const { error } = await supabase.from('vendas').insert([{ valor: value }]);
      
      if (!error) {
        setSaleValue('');
        await fetchDailyRevenue();
        setActiveTab('dash');
        
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
  }, [fetchDailyRevenue, revenue, metaPE, saleValue]);

  // Salvar a Configuração de Meta
  const saveMeta = async () => {
    const newVal = parseFloat(settingMeta.replace(',', '.'));
    if (isNaN(newVal)) return;

    setRegistering(true);
    try {
      if (metaId) {
        const { error } = await supabase.from('metas').update({ valor_pe: newVal }).eq('id', metaId);
        if (!error) {
          setMetaPE(newVal);
          alert("Meta atualizada com sucesso!");
        } else {
          alert("Erro ao atualizar meta: " + error.message);
        }
      } else {
        // Fallback or handle if no id was present
        setMetaPE(newVal);
        alert("Meta atualizada localmente! (Pois o ID não foi encontrado no banco)");
      }
    } catch (err) {
      console.error("Erro ao salvar config:", err);
    } finally {
      setRegistering(false);
    }
  };

  const progress = Math.min((revenue / metaPE) * 100, 100);
  const isProfitActive = revenue >= metaPE;

  return (
    <div className="h-screen w-full flex flex-col bg-black overflow-hidden relative" style={{ backgroundImage: 'radial-gradient(circle at top right, #1c1c2e, #000)' }}>
      {/* Content Area */}
      <main className="flex-1 w-full max-w-[400px] mx-auto p-6 overflow-y-auto pb-[90px] no-scrollbar">
        <AnimatePresence mode="wait">
          {/* DASHBOARD LAYER */}
          {activeTab === 'dash' && (
            <motion.div
              key="dash"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-5 full-height"
            >
              <h2 className="text-[28px] font-bold text-white mb-2 drop-shadow-[0_0_20px_rgba(0,243,255,0.3)]">
                Painel
              </h2>

              <section className="bg-[rgba(28,28,30,0.6)] backdrop-blur-[20px] rounded-[24px] py-8 px-6 border border-white/5 relative overflow-hidden shadow-2xl">
                <p className="text-[12px] text-gray-400 uppercase font-medium tracking-widest mb-3">
                  Faturamento Diário
                </p>
                
                {loading ? (
                  <div className="h-[72px] flex items-center justify-start">
                    <Loader2 className="animate-spin text-neon-blue" size={28} />
                  </div>
                ) : (
                  <div className="text-[48px] font-extralight text-white mb-6 tabular-nums tracking-tight">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(revenue)}
                  </div>
                )}

                <div className="w-full">
                  <div className="flex justify-between items-center text-[12px] font-medium text-neon-blue mb-2.5">
                    <span>Progresso Meta</span>
                    <span>{Math.floor((revenue / metaPE) * 100)}%</span>
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

              <div className="text-center mt-2">
                {isProfitActive ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-[13px] font-bold text-neon-green uppercase tracking-wide"
                    style={{ textShadow: '0 0 10px rgba(52, 199, 89, 0.4)' }}
                  >
                    🚀 MODO PASTEL CHINÊS ATIVO
                  </motion.div>
                ) : (
                  <p className="text-[13px] text-[#8e8e93]">
                    Aguardando operações...
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* VENDAS LAYER */}
          {activeTab === 'vendas' && (
            <motion.div
              key="vendas"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-5 full-height"
            >
              <h2 className="text-[28px] font-bold text-white mb-2">
                Nova Venda
              </h2>

              <section className="bg-[rgba(28,28,30,0.6)] backdrop-blur-[20px] rounded-[24px] py-6 px-5 border border-white/5 relative shadow-xl">
                <p className="text-[12px] text-[#8e8e93] uppercase font-medium tracking-wide mb-3">
                  Valor da Operação
                </p>
                
                <div className="bg-white/5 rounded-xl p-4 mb-4 flex items-center border border-white/5 focus-within:border-ios-blue/50 transition-colors">
                  <span className="text-gray-400 mr-2 font-medium">R$</span>
                  <input 
                    type="number" 
                    value={saleValue}
                    onChange={(e) => setSaleValue(e.target.value)}
                    placeholder="0.00" 
                    step="0.01"
                    className="bg-transparent border-none text-white text-[20px] w-full outline-none placeholder:text-gray-600 font-light tabular-nums"
                  />
                </div>
                
                <button 
                  onClick={registerSale}
                  disabled={registering || !saleValue}
                  className="bg-ios-blue text-white w-full py-[18px] rounded-2xl font-bold text-[16px] shadow-[0_8px_20px_rgba(0,122,255,0.3)] active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                >
                  {registering ? <Loader2 className="animate-spin" size={18} /> : null}
                  Confirmar Venda
                </button>
              </section>
            </motion.div>
          )}

          {/* CONFIG LAYER */}
          {activeTab === 'config' && (
            <motion.div
              key="config"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-5 full-height"
            >
              <h2 className="text-[28px] font-bold text-white mb-2">
                Ajustes
              </h2>

              <section className="bg-[rgba(28,28,30,0.6)] backdrop-blur-[20px] rounded-[24px] py-6 px-5 border border-white/5 relative shadow-xl">
                <p className="text-[12px] text-[#8e8e93] uppercase font-medium tracking-wide mb-3">
                  Ponto de Equilíbrio (Meta)
                </p>
                
                <div className="bg-white/5 rounded-xl p-4 mb-4 flex items-center border border-white/5 focus-within:border-white/20 transition-colors">
                  <span className="text-gray-400 mr-2 font-medium">R$</span>
                  <input 
                    type="number" 
                    value={settingMeta}
                    onChange={(e) => setSettingMeta(e.target.value)}
                    placeholder="Ex: 100.00" 
                    step="0.01"
                    className="bg-transparent border-none text-white text-[20px] w-full outline-none placeholder:text-gray-600 font-light tabular-nums"
                  />
                </div>
                
                <button 
                  onClick={saveMeta}
                  disabled={registering}
                  className="bg-[#333] text-white w-full py-[18px] rounded-2xl font-bold text-[16px] active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                >
                  {registering ? <Loader2 className="animate-spin" size={18} /> : null}
                  Salvar Configuração
                </button>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom NAVIGATION BAR (iPhone Style) */}
      <nav className="absolute bottom-0 left-0 right-0 h-[85px] bg-[#141414]/80 backdrop-blur-[20px] border-t-[0.5px] border-white/10 flex justify-around items-center px-4 pt-1 pb-5 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <button 
          onClick={() => setActiveTab('dash')}
          className={`flex flex-col items-center justify-center w-20 transition-colors duration-200 ${activeTab === 'dash' ? 'text-ios-blue' : 'text-[#8e8e93]'}`}
        >
          <BarChart2 size={24} strokeWidth={activeTab === 'dash' ? 2.5 : 2} className="mb-1" />
          <span className="text-[10px] font-medium tracking-wide">Painel</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('vendas')}
          className={`flex flex-col items-center justify-center w-20 transition-colors duration-200 ${activeTab === 'vendas' ? 'text-ios-blue' : 'text-[#8e8e93]'}`}
        >
          <DollarSign size={24} strokeWidth={activeTab === 'vendas' ? 2.5 : 2} className="mb-1" />
          <span className="text-[10px] font-medium tracking-wide">Vendas</span>
        </button>

        <button 
          onClick={() => setActiveTab('config')}
          className={`flex flex-col items-center justify-center w-20 transition-colors duration-200 ${activeTab === 'config' ? 'text-ios-blue' : 'text-[#8e8e93]'}`}
        >
          <Settings size={22} strokeWidth={activeTab === 'config' ? 2.5 : 2} className="mb-1" />
          <span className="text-[10px] font-medium tracking-wide">Ajustes</span>
        </button>
      </nav>
    </div>
  );
}


