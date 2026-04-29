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
    <div className="h-screen w-full flex flex-col bg-black overflow-hidden relative">
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
              <header className="mb-2 mt-2 relative">
                <div className="absolute right-0 top-0 text-gray-500">
                  {loading && <Loader2 className="animate-spin" size={18} />}
                </div>
                <h2 className="text-[28px] font-[800] text-white tracking-tight">Painel de Controle</h2>
              </header>

              <div className="bg-[rgba(255,255,255,0.06)] backdrop-blur-[15px] rounded-[22px] p-5 border border-white/10 shadow-xl">
                <p className="text-[10px] text-[#888] uppercase tracking-wide mb-[5px]">Faturamento Hoje</p>
                <div className="text-[44px] font-[200] tracking-[-1px] text-white">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(revenue)}
                </div>
                
                <div className="h-2 w-full bg-white/10 rounded-[10px] overflow-hidden my-[15px]">
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
                
                <div className="flex justify-between items-center text-[12px]">
                  <span className={`font-bold ${isProfitActive ? 'text-neon-green' : 'text-neon-blue'}`}>{Math.floor(progress)}%</span>
                  <span className="text-[#666]">Meta: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metaPE)}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-[15px]">
                  <div className="bg-black/30 rounded-[15px] p-3 text-center border border-white/5">
                    <p className="text-[10px] text-[#888] uppercase mb-[5px]">Vendas</p>
                    <div className="text-[18px] text-neon-blue font-semibold">{salesCount}</div>
                  </div>
                  <div className="bg-black/30 rounded-[15px] p-3 text-center border border-white/5">
                    <p className="text-[10px] text-[#888] uppercase mb-[5px]">Ticket Médio</p>
                    <div className="text-[18px] text-neon-blue font-semibold">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(avgTicket)}
                    </div>
                  </div>
                </div>
              </div>

              {isProfitActive && (
                <div className="bg-[rgba(255,255,255,0.06)] backdrop-blur-[15px] rounded-[22px] p-5 border border-white/10 text-center animate-[fadeIn_0.3s_ease]">
                  <span className="font-bold text-[14px] text-neon-green" style={{ textShadow: '0 0 10px rgba(52, 199, 89, 0.4)' }}>
                    🚀 MODO PASTEL CHINÊS ATIVO!
                  </span>
                </div>
              )}
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
              <h2 className="text-[28px] font-[800] text-white mb-2 mt-2">
                Registrar Venda
              </h2>

              <div className="bg-[rgba(255,255,255,0.06)] backdrop-blur-[15px] rounded-[22px] p-5 border border-white/10 shadow-xl">
                <input 
                  type="number" 
                  value={saleValue}
                  onChange={(e) => setSaleValue(e.target.value)}
                  placeholder="0.00" 
                  step="0.01"
                  inputMode="decimal"
                  className="bg-[#111] border border-[#333] text-white p-[18px] rounded-[12px] w-full text-[20px] outline-none mb-[15px] font-light tabular-nums focus:border-ios-blue transition-colors"
                />
                
                <button 
                  onClick={() => registerSale()}
                  disabled={registering || !saleValue}
                  className="bg-ios-blue text-white w-full p-[18px] rounded-[15px] font-bold text-[16px] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {registering && !saleValue ? <Loader2 className="animate-spin" size={18} /> : null}
                  Confirmar Recebimento
                </button>
              </div>

              <p className="text-[10px] text-[#888] uppercase mt-[10px] mb-[2px]">Atalhos rápidos</p>
              <div className="flex gap-[10px]">
                {[2, 5, 10].map(val => (
                  <button 
                    key={val}
                    onClick={() => registerSale(val)}
                    disabled={registering}
                    className="bg-[#1c1c1e] text-white border border-[#333] p-[15px] rounded-[12px] font-bold flex-1 active:bg-ios-blue active:border-ios-blue active:scale-95 transition-all disabled:opacity-50 text-[15px]"
                  >
                    + R$ {val}
                  </button>
                ))}
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
              <h2 className="text-[28px] font-[800] text-white mb-2 mt-2 flex items-center justify-between">
                Extrato Hoje
                <button 
                  onClick={fetchDailyData}
                  className="bg-white/10 p-2 rounded-full active:scale-90 transition-transform"
                >
                  <RefreshCcw size={16} className={loading ? "animate-spin" : ""} />
                </button>
              </h2>

              <div className="bg-[rgba(255,255,255,0.06)] backdrop-blur-[15px] rounded-[22px] border border-white/10 shadow-xl overflow-hidden">
                {sales.length === 0 ? (
                  <p className="p-5 text-[#888] text-[14px]">Nenhuma venda hoje.</p>
                ) : (
                  <div className="flex flex-col">
                    {sales.map((v) => {
                      const dateField = v.criado_em || v.created_at || v.created_time || "";
                      const hora = dateField ? new Date(dateField).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : '--:--';
                      return (
                        <div key={v.id} className="flex justify-between items-center p-[18px] border-b border-white/5 last:border-b-0">
                          <div>
                            <span className="font-semibold text-neon-blue text-[16px]">R$ {parseFloat(v.valor).toFixed(2).replace('.', ',')}</span>
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
              <h2 className="text-[28px] font-[800] text-white mb-2 mt-2">
                Configurações
              </h2>

              <div className="bg-[rgba(255,255,255,0.06)] backdrop-blur-[15px] rounded-[22px] p-5 border border-white/10 shadow-xl">
                <p className="text-[10px] text-[#888] uppercase mb-[5px]">
                  Ponto de Equilíbrio Diário
                </p>
                
                <input 
                  type="number" 
                  value={settingMeta}
                  onChange={(e) => setSettingMeta(e.target.value)}
                  placeholder="100.00" 
                  step="0.01"
                  inputMode="decimal"
                  className="bg-[#111] border border-[#333] text-white p-[18px] rounded-[12px] w-full text-[20px] outline-none mb-[15px] font-light tabular-nums focus:border-ios-blue transition-colors"
                />
                
                <button 
                  onClick={saveMeta}
                  disabled={registering}
                  className="bg-[#1c1c1e] text-white border border-[#333] w-full p-[18px] rounded-[15px] font-bold text-[16px] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {registering ? <Loader2 className="animate-spin" size={18} /> : null}
                  Atualizar Meta
                </button>
              </div>

              <p className="text-[#444] text-[12px] text-center mt-2">
                Lucro Ágil BI
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom NAVIGATION BAR */}
      <nav className="absolute bottom-0 left-0 right-0 h-[85px] bg-[#0a0a0a] border-t border-[#222] flex justify-around items-center px-2 pt-1 pb-[15px] z-50">
        <button 
          onClick={() => setActiveTab('dash')}
          className={`flex flex-col items-center justify-center flex-1 transition-colors duration-300 ${activeTab === 'dash' ? 'text-ios-blue' : 'text-[#555]'}`}
        >
          <BarChart2 size={24} strokeWidth={activeTab === 'dash' ? 2.5 : 2} className="mb-1" />
          <span className="text-[11px] font-medium tracking-wide">Painel</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('vendas')}
          className={`flex flex-col items-center justify-center flex-1 transition-colors duration-300 ${activeTab === 'vendas' ? 'text-ios-blue' : 'text-[#555]'}`}
        >
          <Plus size={24} strokeWidth={activeTab === 'vendas' ? 2.5 : 2} className="mb-1" />
          <span className="text-[11px] font-medium tracking-wide">Vendas</span>
        </button>

        <button 
          onClick={() => setActiveTab('extrato')}
          className={`flex flex-col items-center justify-center flex-1 transition-colors duration-300 ${activeTab === 'extrato' ? 'text-ios-blue' : 'text-[#555]'}`}
        >
          <FileText size={22} strokeWidth={activeTab === 'extrato' ? 2.5 : 2} className="mb-1" />
          <span className="text-[11px] font-medium tracking-wide">Extrato</span>
        </button>

        <button 
          onClick={() => setActiveTab('config')}
          className={`flex flex-col items-center justify-center flex-1 transition-colors duration-300 ${activeTab === 'config' ? 'text-ios-blue' : 'text-[#555]'}`}
        >
          <Settings size={22} strokeWidth={activeTab === 'config' ? 2.5 : 2} className="mb-1" />
          <span className="text-[11px] font-medium tracking-wide">Ajustes</span>
        </button>
      </nav>
    </div>
  );
}


