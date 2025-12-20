import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { TrendingUp, TrendingDown, DollarSign, Receipt } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Financeiro = () => {
  const [fluxoCaixa, setFluxoCaixa] = useState(null);
  const [dre, setDre] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [fluxoRes, dreRes] = await Promise.all([
        axios.get(`${API_URL}/api/financeiro/fluxo-caixa`),
        axios.get(`${API_URL}/api/financeiro/dre`)
      ]);
      setFluxoCaixa(fluxoRes.data);
      setDre(dreRes.data);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
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
      <div>
        <h1 className="font-heading font-black text-4xl text-slate-900" data-testid="financeiro-title">Financeiro</h1>
        <p className="text-slate-600 mt-2">Controle financeiro completo</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <p className="text-white/80 text-sm mb-1">Entradas do Mês</p>
          <p className="font-heading font-black text-3xl">
            R$ {fluxoCaixa?.contas_receber?.recebido?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
          </p>
          <p className="text-white/70 text-xs mt-2">Já recebido</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6" />
            </div>
          </div>
          <p className="text-white/80 text-sm mb-1">Saídas do Mês</p>
          <p className="font-heading font-black text-3xl">
            R$ {fluxoCaixa?.contas_pagar?.pago?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
          </p>
          <p className="text-white/70 text-xs mt-2">Já pago</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Receipt className="w-6 h-6" />
            </div>
          </div>
          <p className="text-white/80 text-sm mb-1">Saldo do Mês</p>
          <p className="font-heading font-black text-3xl">
            R$ {fluxoCaixa?.saldo_atual?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
          </p>
          <p className="text-white/70 text-xs mt-2">Atual</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <p className="text-white/80 text-sm mb-1">A Receber</p>
          <p className="font-heading font-black text-3xl">
            R$ {fluxoCaixa?.contas_receber?.pendente?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
          </p>
          <p className="text-white/70 text-xs mt-2">Pendente</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link to="/financeiro/fluxo-caixa" className="block">
          <div className="bg-white rounded-lg border-2 border-slate-200 hover:border-[#f97316] shadow-sm p-6 transition-all hover:shadow-md">
            <h3 className="font-heading font-bold text-lg text-slate-800 mb-2">Fluxo de Caixa</h3>
            <p className="text-slate-600 text-sm">Visualize entradas e saídas detalhadas</p>
          </div>
        </Link>

        <Link to="/financeiro/contas-pagar" className="block">
          <div className="bg-white rounded-lg border-2 border-slate-200 hover:border-[#f97316] shadow-sm p-6 transition-all hover:shadow-md">
            <h3 className="font-heading font-bold text-lg text-slate-800 mb-2">Contas a Pagar</h3>
            <p className="text-slate-600 text-sm">Gerencie suas despesas e pagamentos</p>
          </div>
        </Link>

        <Link to="/financeiro/contas-receber" className="block">
          <div className="bg-white rounded-lg border-2 border-slate-200 hover:border-[#f97316] shadow-sm p-6 transition-all hover:shadow-md">
            <h3 className="font-heading font-bold text-lg text-slate-800 mb-2">Contas a Receber</h3>
            <p className="text-slate-600 text-sm">Controle seus recebimentos</p>
          </div>
        </Link>

        <Link to="/financeiro/dre" className="block">
          <div className="bg-white rounded-lg border-2 border-slate-200 hover:border-[#f97316] shadow-sm p-6 transition-all hover:shadow-md">
            <h3 className="font-heading font-bold text-lg text-slate-800 mb-2">DRE</h3>
            <p className="text-slate-600 text-sm">Demonstração do Resultado do Exercício</p>
          </div>
        </Link>
      </div>

      {dre && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h2 className="font-heading font-bold text-xl text-slate-800 mb-4">
            Demonstração de Resultado - {dre.mes < 10 ? '0' : ''}{dre.mes}/{dre.ano}
          </h2>
          
          <div className="space-y-4">
            <div className="bg-emerald-50 p-4 rounded-lg">
              <p className="text-sm text-emerald-600 font-medium mb-1">RECEITAS</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Receita de Serviços</span>
                  <span className="font-mono font-bold text-slate-900">R$ {dre.receita_servicos.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Receita de Peças</span>
                  <span className="font-mono font-bold text-slate-900">R$ {dre.receita_pecas.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center border-t border-emerald-200 pt-2">
                  <span className="font-medium text-slate-800">Receita Bruta</span>
                  <span className="font-mono font-black text-emerald-700 text-lg">R$ {dre.receita_bruta.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-sm text-red-600 font-medium mb-1">(-) DESPESAS OPERACIONAIS</p>
              <div className="space-y-2">
                {Object.entries(dre.despesas.por_categoria).map(([categoria, valor]) => (
                  <div key={categoria} className="flex justify-between items-center">
                    <span className="text-slate-600">{categoria}</span>
                    <span className="font-mono text-slate-900">-R$ {valor.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center border-t border-red-200 pt-2">
                  <span className="font-medium text-slate-800">Total Despesas</span>
                  <span className="font-mono font-black text-red-700 text-lg">-R$ {dre.despesas.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-heading font-bold text-slate-800 text-lg">RESULTADO OPERACIONAL</span>
                <span className={`font-mono font-black text-2xl ${
                  dre.lucro_bruto >= 0 ? 'text-emerald-700' : 'text-red-700'
                }`}>
                  R$ {dre.lucro_bruto.toFixed(2)}
                </span>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-200">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Margem de Lucro</span>
                  <span className="font-mono font-bold text-slate-900">{dre.margem_lucro.toFixed(2)}%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="bg-slate-50 p-3 rounded-lg text-center">
                <p className="text-xs text-slate-500 mb-1">OS Concluídas</p>
                <p className="font-heading font-black text-2xl text-slate-900">{dre.quantidade_os}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg text-center">
                <p className="text-xs text-slate-500 mb-1">Ticket Médio</p>
                <p className="font-mono font-bold text-lg text-slate-900">
                  R$ {dre.quantidade_os > 0 ? (dre.receita_bruta / dre.quantidade_os).toFixed(2) : '0.00'}
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg text-center">
                <p className="text-xs text-slate-500 mb-1">Custo Médio por OS</p>
                <p className="font-mono font-bold text-lg text-slate-900">
                  R$ {dre.quantidade_os > 0 ? (dre.despesas.total / dre.quantidade_os).toFixed(2) : '0.00'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Financeiro;
