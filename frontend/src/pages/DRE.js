import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { TrendingUp, TrendingDown, DollarSign, Percent, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DRE = () => {
  const [dre, setDre] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mesAtual, setMesAtual] = useState(new Date().getMonth() + 1);
  const [anoAtual, setAnoAtual] = useState(new Date().getFullYear());

  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  useEffect(() => {
    fetchDRE();
  }, [mesAtual, anoAtual]);

  const fetchDRE = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/financeiro/dre`, {
        params: { mes: mesAtual, ano: anoAtual }
      });
      setDre(response.data);
    } catch (error) {
      console.error('Erro ao buscar DRE:', error);
      toast.error('Erro ao carregar DRE');
    } finally {
      setLoading(false);
    }
  };

  const mesAnterior = () => {
    if (mesAtual === 1) {
      setMesAtual(12);
      setAnoAtual(anoAtual - 1);
    } else {
      setMesAtual(mesAtual - 1);
    }
  };

  const mesSeguinte = () => {
    if (mesAtual === 12) {
      setMesAtual(1);
      setAnoAtual(anoAtual + 1);
    } else {
      setMesAtual(mesAtual + 1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f97316]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-black text-4xl text-slate-900" data-testid="dre-title">DRE - Demonstração do Resultado</h1>
          <p className="text-slate-600 mt-2">Análise detalhada de receitas e despesas</p>
        </div>
      </div>

      {/* Navegação de mês */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" size="icon" onClick={mesAnterior}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="text-center min-w-[200px]">
            <p className="font-heading font-bold text-xl text-[#1e3a5f]">
              {meses[mesAtual - 1]} {anoAtual}
            </p>
          </div>
          <Button variant="outline" size="icon" onClick={mesSeguinte}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Cards de KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <p className="text-white/80 text-sm mb-1">Receita Bruta</p>
          <p className="font-heading font-black text-3xl">
            R$ {dre?.receita_bruta?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6" />
            </div>
          </div>
          <p className="text-white/80 text-sm mb-1">Total Despesas</p>
          <p className="font-heading font-black text-3xl">
            R$ {dre?.despesas?.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
          </p>
        </div>

        <div className={`bg-gradient-to-br rounded-lg shadow-lg p-6 text-white ${
          (dre?.lucro_bruto || 0) >= 0 
            ? 'from-blue-500 to-blue-600' 
            : 'from-amber-500 to-amber-600'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <p className="text-white/80 text-sm mb-1">Resultado</p>
          <p className="font-heading font-black text-3xl">
            R$ {dre?.lucro_bruto?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
          </p>
        </div>

        <div className={`bg-gradient-to-br rounded-lg shadow-lg p-6 text-white ${
          (dre?.margem_lucro || 0) >= 0 
            ? 'from-purple-500 to-purple-600' 
            : 'from-amber-500 to-amber-600'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Percent className="w-6 h-6" />
            </div>
          </div>
          <p className="text-white/80 text-sm mb-1">Margem de Lucro</p>
          <p className="font-heading font-black text-3xl">
            {dre?.margem_lucro?.toFixed(1) || '0'}%
          </p>
        </div>
      </div>

      {/* DRE Detalhado */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-[#1e3a5f]">
          <h2 className="font-heading font-bold text-xl text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Demonstração do Resultado - {meses[mesAtual - 1]}/{anoAtual}
          </h2>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Receitas */}
          <div className="bg-emerald-50 rounded-lg p-6">
            <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wider mb-4">RECEITAS</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-emerald-200">
                <span className="text-slate-700">Receita de Serviços</span>
                <span className="font-mono font-bold text-slate-900">
                  R$ {dre?.receita_servicos?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-emerald-200">
                <span className="text-slate-700">Receita de Peças</span>
                <span className="font-mono font-bold text-slate-900">
                  R$ {dre?.receita_pecas?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 bg-emerald-100 rounded px-3 mt-2">
                <span className="font-bold text-emerald-800">RECEITA BRUTA</span>
                <span className="font-mono font-black text-xl text-emerald-800">
                  R$ {dre?.receita_bruta?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                </span>
              </div>
            </div>
          </div>

          {/* Despesas */}
          <div className="bg-red-50 rounded-lg p-6">
            <h3 className="text-sm font-bold text-red-700 uppercase tracking-wider mb-4">(-) DESPESAS OPERACIONAIS</h3>
            <div className="space-y-3">
              {dre?.despesas?.por_categoria && Object.entries(dre.despesas.por_categoria).length > 0 ? (
                Object.entries(dre.despesas.por_categoria).map(([categoria, valor]) => (
                  <div key={categoria} className="flex justify-between items-center py-2 border-b border-red-200">
                    <span className="text-slate-700">{categoria}</span>
                    <span className="font-mono text-slate-900">- R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-slate-500">
                  Nenhuma despesa registrada neste período
                </div>
              )}
              <div className="flex justify-between items-center py-3 bg-red-100 rounded px-3 mt-2">
                <span className="font-bold text-red-800">TOTAL DESPESAS</span>
                <span className="font-mono font-black text-xl text-red-800">
                  - R$ {dre?.despesas?.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                </span>
              </div>
            </div>
          </div>

          {/* Resultado */}
          <div className={`rounded-lg p-6 ${
            (dre?.lucro_bruto || 0) >= 0 ? 'bg-blue-50' : 'bg-amber-50'
          }`}>
            <div className="flex justify-between items-center">
              <div>
                <h3 className={`text-sm font-bold uppercase tracking-wider mb-1 ${
                  (dre?.lucro_bruto || 0) >= 0 ? 'text-blue-700' : 'text-amber-700'
                }`}>RESULTADO OPERACIONAL</h3>
                <p className="text-sm text-slate-500">
                  {(dre?.lucro_bruto || 0) >= 0 ? 'Lucro' : 'Prejuízo'} do período
                </p>
              </div>
              <span className={`font-mono font-black text-3xl ${
                (dre?.lucro_bruto || 0) >= 0 ? 'text-blue-800' : 'text-amber-800'
              }`}>
                R$ {dre?.lucro_bruto?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
              </span>
            </div>
          </div>

          {/* Indicadores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-lg text-center">
              <p className="text-xs text-slate-500 mb-1">OS Concluídas no Período</p>
              <p className="font-heading font-black text-3xl text-slate-900">{dre?.quantidade_os || 0}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg text-center">
              <p className="text-xs text-slate-500 mb-1">Ticket Médio</p>
              <p className="font-mono font-bold text-xl text-slate-900">
                R$ {dre?.quantidade_os > 0 
                  ? (dre.receita_bruta / dre.quantidade_os).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
                  : '0,00'}
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg text-center">
              <p className="text-xs text-slate-500 mb-1">Margem de Lucro</p>
              <p className={`font-heading font-black text-3xl ${
                (dre?.margem_lucro || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {dre?.margem_lucro?.toFixed(1) || '0'}%
              </p>
            </div>
          </div>

          {/* Composição da Receita */}
          {dre?.receita_bruta > 0 && (
            <div className="bg-slate-50 rounded-lg p-6">
              <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">COMPOSIÇÃO DA RECEITA</h3>
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">Serviços</span>
                    <span className="font-medium text-slate-900">
                      {((dre.receita_servicos / dre.receita_bruta) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div 
                      className="bg-[#1e3a5f] h-3 rounded-full" 
                      style={{ width: `${(dre.receita_servicos / dre.receita_bruta) * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600">Peças</span>
                    <span className="font-medium text-slate-900">
                      {((dre.receita_pecas / dre.receita_bruta) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div 
                      className="bg-[#f97316] h-3 rounded-full" 
                      style={{ width: `${(dre.receita_pecas / dre.receita_bruta) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DRE;
