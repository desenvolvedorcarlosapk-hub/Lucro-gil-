/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCcw, Plus, Loader2, BarChart2, Settings, FileText } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Configuration from your request
const SB_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ozszexhkdiggsxymmtgo.supabase.co';
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96c3pleGhrZGlnZ3NjeW1tdGdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MDY5NzUsImV4cCI6MjA5Mjk4Mjk3NX0.C_XrfLUWQ13coyzgFzqaKhP7pjaFZ5-sJIctqrr7MCk';
const supabase = createClient(SB_URL, SB_KEY);

type TabType = 'dash' | 'vendas' | 'extrato' | 'config';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dash');
  
  const [sales, setSales] = useState<any[]>([]);
  const [revenue, setRevenue] = useState(0);
  const [metaPE, setMetaPE] = useState(100);
  const [metaId, setMetaId] = useState<string | number | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [deletingId, setDeletingId] = useState<any>(null);

  // Input states
  const [saleValue, setSaleValue] = useState<string>('');
  const [settingMeta, setSettingMeta] = useState<string>('100');

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

  // 2. BUSCA AS VENDAS DE HOJE DETALHADAS
  const fetchDailyData = useCallback(async () => {
    try {
      const hoje = new Date().toISOString().split('T')[0];
      let { data, error } = await supabase
        .from('vendas')
        .select('*')
        .gte('criado_em', hoje)
        .order('criado_em', { ascending: false });

      if (error) {
        // Fallback for column name if user used 'created_at'
        const altResponse = await supabase
          .from('vendas')
          .select('*')
          .gte('created_at', hoje)
          .order('created_at', { ascending: false });
        
        if (!altResponse.error && altResponse.data) {
          data = altResponse.data;
        }
      }

      if (data) {
        setSales(data);
        const total = data.reduce((acc, item) => acc + parseFloat(item.valor), 0);
        setRevenue(total);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  }, []);

  // Initialization
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchMeta(), fetchDailyData()]);
      setLoading(false);
    };
    init();
  }, [fetchMeta, fetchDailyData]);

  // 3. REGISTA A VENDA NO BANCO E ATUALIZA A TELA
  const registerSale = useCallback(async (fixedValue?: number) => {
    let valueToRegister = 0;
    if (fixedValue !== undefined) {
      valueToRegister = fixedValue;
    } else {
      if (!saleValue) return;
      valueToRegister = parseFloat(saleValue.replace(',', '.'));
    }
    
    if (isNaN(valueToRegister) || valueToRegister <= 0) return;

    setRegistering(true);
    try {
      const { error } = await supabase.from('vendas').insert([{ valor: valueToRegister }]);
      
      if (!error) {
        setSaleValue('');
        await fetchDailyData();
        setActiveTab('dash');
        
        // Kodular/AppInventor integration
        if ((window as any).AppInventor) {
          const ui = (window as any).AppInventor;
          ui.setWebViewString("venda_registrada");
          
          const newRevenue = revenue + valueToRegister;
          if (newRevenue >= metaPE && revenue < metaPE) {
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
  }, [fetchDailyData, revenue, metaPE, saleValue]);

  // 4. ESTORNAR VENDA
  const deleteVenda = async (id: any) => {
    if (!confirm("Estornar esta venda?")) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from('vendas').delete().eq('id', id);
      if (!error) {
        await fetchDailyData();
      } else {
        alert("Erro ao estornar: " + error.message);
      }
    } catch (err) {
      console.error("Erro ao excluir", err);
    } finally {
      setDeletingId(null);
    }
  };

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
  const salesCount = sales.length;
  const avgTicket = salesCount > 0 ? (revenue / salesCount) : 0;

  return (
    <div className="h-screen w-full flex flex-col bg-black overflow-hidden relative" style={{ backgroundImage: 'radial-gradient(circle at top right, #1c1c2e, #000)' }}>
      {/* Content Area */}
      <main className="flex-1 w-full max-w-[400px] mx-auto p-5 overflow-y-auto pb-[100px] no-scrollbar">
        <AnimatePresence mode="wait">
          {/* DASHBOARD LAYER */}
          {activeTab === 'dash' && (
            <motion.div
              key="dash"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="flex flex-col gap-4"
            >
              <header className="mb-2 mt-2 text-center relative">
                <div className="absolute right-0 top-0 text-gray-500">
                  {loading && <Loader2 className="animate-spin" size={18} />}
                </div>
                <p className="text-neon-blue font-extrabold text-[12px] tracking-wide">DASHBOARD</p>
                <h1 className="text-[28px] font-bold text-white">Lucro Ágil</h1>
              </header>

              <div className="bg-[rgba(28,28,30,0.6)] backdrop-blur-3xl rounded-[24px] p-5 border border-white/10 shadow-xl">
                <p className="text-[11px] text-[#8e8e93] uppercase tracking-widest font-medium mb-2">Faturamento Total</p>
                <div className="text-[42px] font-extralight tracking-tight text-white mb-2 tabular-nums">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(revenue)}
                </div>
                
                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden mt-4 mb-3">
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
                
                <div className="flex justify-between items-center text-[12px] font-semibold">
                  <span className={`${isProfitActive ? 'text-neon-green' : 'text-neon-blue'}`}>{Math.floor(progress)}%</span>
                  <span className="text-[#8e8e93]">Meta: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metaPE)}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[rgba(28,28,30,0.6)] backdrop-blur-3xl rounded-[24px] p-4 border border-white/10">
                  <p className="text-[11px] text-[#8e8e93] uppercase tracking-widest font-medium mb-1">Vendas</p>
                  <div className="text-[24px] text-white font-light tabular-nums">{salesCount}</div>
                </div>
                <div className="bg-[rgba(28,28,30,0.6)] backdrop-blur-3xl rounded-[24px] p-4 border border-white/10">
                  <p className="text-[11px] text-[#8e8e93] uppercase tracking-widest font-medium mb-1">Tkt. Médio</p>
                  <div className="text-[24px] text-white font-light tabular-nums">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(avgTicket)}
                  </div>
                </div>
              </div>

              <div className={`mt-1 bg-[rgba(28,28,30,0.6)] backdrop-blur-3xl rounded-[24px] p-5 border text-center transition-colors ${isProfitActive ? 'border-neon-green/50' : 'border-neon-red/30'}`}>
                <p className={`font-bold text-[14px] ${isProfitActive ? 'text-neon-green' : 'text-neon-red'}`} style={{ textShadow: isProfitActive ? '0 0 10px rgba(52, 199, 89, 0.4)' : 'none' }}>
                  {isProfitActive ? '🚀 MODO PASTEL CHINÊS ATIVO' : '⚠️ ALVO NÃO ATINGIDO'}
                </p>
              </div>
            </motion.div>
          )}

          {/* VENDAS LAYER */}
          {activeTab === 'vendas' && (
            <motion.div
              key="vendas"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="flex flex-col gap-4"
            >
              <h2 className="text-[28px] font-bold text-white mb-2 mt-2">
                Registrar
              </h2>

              <p className="text-[11px] text-[#8e8e93] uppercase tracking-widest font-medium -mb-1">Atalhos rápidos</p>
              <div className="grid grid-cols-3 gap-3 mb-2">
                {[2, 5, 10].map(val => (
                  <button 
                    key={val}
                    onClick={() => registerSale(val)}
                    disabled={registering}
                    className="bg-white/10 border-none text-white p-4 rounded-[15px] font-semibold text-[16px] active:bg-ios-blue active:scale-95 transition-all disabled:opacity-50"
                  >
                    + {val.toFixed(2).replace('.', ',')}
                  </button>
                ))}
              </div>

              <div className="bg-[rgba(28,28,30,0.6)] backdrop-blur-3xl rounded-[24px] p-5 border border-white/10 shadow-xl mt-2">
                <p className="text-[11px] text-[#8e8e93] uppercase tracking-widest font-medium mb-3">
                  Valor Customizado
                </p>
                
                <input 
                  type="number" 
                  value={saleValue}
                  onChange={(e) => setSaleValue(e.target.value)}
                  placeholder="R$ 0,00" 
                  step="0.01"
                  className="bg-white/5 border border-white/10 text-white p-[18px] rounded-[15px] w-full text-[20px] outline-none mb-4 font-light tabular-nums focus:border-ios-blue/50 transition-colors"
                />
                
                <button 
                  onClick={() => registerSale()}
                  disabled={registering || !saleValue}
                  className="bg-ios-blue text-white w-full py-5 rounded-[18px] font-bold text-[16px] shadow-[0_10px_20px_rgba(0,122,255,0.3)] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {registering && !saleValue ? <Loader2 className="animate-spin" size={18} /> : null}
                  Confirmar Lançamento
                </button>
              </div>
            </motion.div>
          )}

          {/* EXTRATO LAYER */}
          {activeTab === 'extrato' && (
            <motion.div
              key="extrato"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="flex flex-col gap-4"
            >
              <h2 className="text-[28px] font-bold text-white mb-2 mt-2 flex items-center justify-between">
                Extrato Hoje
                <button 
                  onClick={fetchDailyData}
                  className="bg-white/10 p-2 rounded-full active:scale-90 transition-transform"
                >
                  <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
                </button>
              </h2>

              <div className="bg-[rgba(28,28,30,0.6)] backdrop-blur-3xl rounded-[24px] p-0 border border-white/10 shadow-xl overflow-hidden">
                {sales.length === 0 ? (
                  <p className="p-5 text-[#666] text-[14px]">Nenhuma venda hoje.</p>
                ) : (
                  <div className="flex flex-col">
                    {sales.map((v) => {
                      // Determine time
                      const dateField = v.criado_em || v.created_at || v.created_time || "";
                      const hora = dateField ? new Date(dateField).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : '--:--';
                      return (
                        <div key={v.id} className="flex justify-between items-center p-[18px] border-b border-white/10 last:border-b-0">
                          <div>
                            <span className="font-bold text-white tracking-wide text-[16px]">R$ {parseFloat(v.valor).toFixed(2).replace('.', ',')}</span>
                            <span className="text-[#666] text-[12px] ml-3 font-medium">{hora}</span>
                          </div>
                          <button 
                            onClick={() => deleteVenda(v.id)}
                            disabled={deletingId === v.id}
                            className="text-neon-red text-[12px] font-bold py-1 px-2 uppercase active:opacity-50 disabled:opacity-50"
                          >
                           {deletingId === v.id ? '...' : 'Estornar'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* CONFIG LAYER */}
          {activeTab === 'config' && (
            <motion.div
              key="config"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="flex flex-col gap-4"
            >
              <h2 className="text-[28px] font-bold text-white mb-2 mt-2">
                Configurações
              </h2>

              <div className="bg-[rgba(28,28,30,0.6)] backdrop-blur-3xl rounded-[24px] p-5 border border-white/10 shadow-xl">
                <p className="text-[11px] text-[#8e8e93] uppercase tracking-widest font-medium mb-3">
                  Ponto de Equilíbrio Diário
                </p>
                
                <input 
                  type="number" 
                  value={settingMeta}
                  onChange={(e) => setSettingMeta(e.target.value)}
                  placeholder="Ex: 100.00" 
                  step="0.01"
                  className="bg-white/5 border border-white/10 text-white p-[18px] rounded-[15px] w-full text-[20px] outline-none mb-4 font-light tabular-nums focus:border-white/20 transition-colors"
                />
                
                <button 
                  onClick={saveMeta}
                  disabled={registering}
                  className="bg-[#333] text-white w-full py-[20px] rounded-[18px] font-bold text-[16px] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {registering ? <Loader2 className="animate-spin" size={18} /> : null}
                  Atualizar Meta
                </button>
              </div>

              <p className="text-[#444] text-[12px] text-center mt-2">
                Lucro Ágil v2.0 - Ultimate Edition
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom NAVIGATION BAR (iPhone Style) */}
      <nav className="absolute bottom-0 left-0 right-0 h-[85px] bg-[#0f0f0f]/90 backdrop-blur-[25px] border-t-[0.5px] border-white/10 flex justify-around items-center px-2 pt-2 pb-6 z-50">
        <button 
          onClick={() => setActiveTab('dash')}
          className={`flex flex-col items-center justify-center flex-1 transition-colors duration-300 ${activeTab === 'dash' ? 'text-ios-blue' : 'text-[#8e8e93]'}`}
        >
          <BarChart2 size={24} strokeWidth={activeTab === 'dash' ? 2.5 : 2} className="mb-1" />
          <span className="text-[10px] font-medium tracking-wide">Painel</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('vendas')}
          className={`flex flex-col items-center justify-center flex-1 transition-colors duration-300 ${activeTab === 'vendas' ? 'text-ios-blue' : 'text-[#8e8e93]'}`}
        >
          <Plus size={24} strokeWidth={activeTab === 'vendas' ? 2.5 : 2} className="mb-1" />
          <span className="text-[10px] font-medium tracking-wide">Venda</span>
        </button>

        <button 
          onClick={() => setActiveTab('extrato')}
          className={`flex flex-col items-center justify-center flex-1 transition-colors duration-300 ${activeTab === 'extrato' ? 'text-ios-blue' : 'text-[#8e8e93]'}`}
        >
          <FileText size={24} strokeWidth={activeTab === 'extrato' ? 2.5 : 2} className="mb-1" />
          <span className="text-[10px] font-medium tracking-wide">Extrato</span>
        </button>

        <button 
          onClick={() => setActiveTab('config')}
          className={`flex flex-col items-center justify-center flex-1 transition-colors duration-300 ${activeTab === 'config' ? 'text-ios-blue' : 'text-[#8e8e93]'}`}
        >
          <Settings size={24} strokeWidth={activeTab === 'config' ? 2.5 : 2} className="mb-1" />
          <span className="text-[10px] font-medium tracking-wide">Ajustes</span>
        </button>
      </nav>
    </div>
  );
}


