import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { TrendingUp, TrendingDown, ArrowRight, Calendar, DollarSign, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const FluxoCaixa = () => {
  const [fluxo, setFluxo] = useState(null);
  const [contasPagar, setContasPagar] = useState([]);
  const [contasReceber, setContasReceber] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState({
    data_inicio: '',
    data_fim: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (params = {}) => {
    try {
      setLoading(true);
      const [fluxoRes, pagarRes, receberRes] = await Promise.all([
        axios.get(`${API_URL}/api/financeiro/fluxo-caixa`, { params }),
        axios.get(`${API_URL}/api/financeiro/contas-pagar`),
        axios.get(`${API_URL}/api/financeiro/contas-receber`)
      ]);
      
      setFluxo(fluxoRes.data);
      setContasPagar(pagarRes.data);
      setContasReceber(receberRes.data);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar fluxo de caixa');
    } finally {
      setLoading(false);
    }
  };

  const handleFiltrar = () => {
    const params = {};
    if (filtro.data_inicio) params.data_inicio = filtro.data_inicio;
    if (filtro.data_fim) params.data_fim = filtro.data_fim;
    fetchData(params);
  };

  const limparFiltro = () => {
    setFiltro({ data_inicio: '', data_fim: '' });
    fetchData();
  };

  // Agrupar por mês para visualização
  const getContasPorMes = (contas, tipoData) => {
    const agrupado = {};
    contas.forEach(conta => {
      const data = new Date(conta[tipoData]);
      const mesAno = `${data.getMonth() + 1}/${data.getFullYear()}`;
      if (!agrupado[mesAno]) {
        agrupado[mesAno] = { pendente: 0, efetivado: 0 };
      }
      if (conta.status === 'pendente') {
        agrupado[mesAno].pendente += conta.valor;
      } else {
        agrupado[mesAno].efetivado += conta.valor;
      }
    });
    return agrupado;
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
        <h1 className="font-heading font-black text-4xl text-slate-900" data-testid="fluxo-caixa-title">Fluxo de Caixa</h1>
        <p className="text-slate-600 mt-2">Visualize suas entradas e saídas</p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <p className="text-white/80 text-sm mb-1">Recebido</p>
          <p className="font-heading font-black text-3xl">
            R$ {fluxo?.contas_receber?.recebido?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6" />
            </div>
          </div>
          <p className="text-white/80 text-sm mb-1">Pago</p>
          <p className="font-heading font-black text-3xl">
            R$ {fluxo?.contas_pagar?.pago?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
          <p className="text-white/80 text-sm mb-1">Saldo Atual</p>
          <p className="font-heading font-black text-3xl">
            R$ {fluxo?.saldo_atual?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
          <p className="text-white/80 text-sm mb-1">Saldo Previsto</p>
          <p className="font-heading font-black text-3xl">
            R$ {fluxo?.saldo_previsto?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
          </p>
        </div>
      </div>

      {/* Filtro por período */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h3 className="font-heading font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Filtrar por Período
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <Label>Data Início</Label>
            <Input
              type="date"
              value={filtro.data_inicio}
              onChange={(e) => setFiltro({ ...filtro, data_inicio: e.target.value })}
            />
          </div>
          <div>
            <Label>Data Fim</Label>
            <Input
              type="date"
              value={filtro.data_fim}
              onChange={(e) => setFiltro({ ...filtro, data_fim: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleFiltrar} className="bg-[#1e3a5f] hover:bg-[#152d4a]">
              Filtrar
            </Button>
            <Button variant="outline" onClick={limparFiltro}>
              Limpar
            </Button>
          </div>
        </div>
      </div>

      {/* Detalhamento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Entradas */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-200 bg-emerald-50">
            <h3 className="font-heading font-bold text-lg text-emerald-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Entradas (Contas a Receber)
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-lg">
                <span className="text-emerald-700">Já Recebido</span>
                <span className="font-mono font-bold text-emerald-800">
                  R$ {fluxo?.contas_receber?.recebido?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-amber-50 rounded-lg">
                <span className="text-amber-700">A Receber (Pendente)</span>
                <span className="font-mono font-bold text-amber-800">
                  R$ {fluxo?.contas_receber?.pendente?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-100 rounded-lg border-t-2 border-emerald-500">
                <span className="font-bold text-slate-800">Total de Entradas</span>
                <span className="font-mono font-black text-lg text-slate-900">
                  R$ {fluxo?.contas_receber?.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Lista das últimas entradas */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-slate-600 mb-3">Últimas Contas a Receber</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {contasReceber.slice(0, 5).map((conta) => (
                  <div key={conta.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-md">
                    <div>
                      <p className="text-sm font-medium text-slate-900 truncate" style={{ maxWidth: '200px' }}>
                        {conta.descricao}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(conta.data_vencimento).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-bold text-slate-900">
                        R$ {conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        conta.status === 'recebido' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {conta.status === 'recebido' ? 'Recebido' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Saídas */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="p-6 border-b border-slate-200 bg-red-50">
            <h3 className="font-heading font-bold text-lg text-red-800 flex items-center gap-2">
              <TrendingDown className="w-5 h-5" />
              Saídas (Contas a Pagar)
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                <span className="text-red-700">Já Pago</span>
                <span className="font-mono font-bold text-red-800">
                  R$ {fluxo?.contas_pagar?.pago?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-amber-50 rounded-lg">
                <span className="text-amber-700">A Pagar (Pendente)</span>
                <span className="font-mono font-bold text-amber-800">
                  R$ {fluxo?.contas_pagar?.pendente?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-100 rounded-lg border-t-2 border-red-500">
                <span className="font-bold text-slate-800">Total de Saídas</span>
                <span className="font-mono font-black text-lg text-slate-900">
                  R$ {fluxo?.contas_pagar?.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Lista das últimas saídas */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-slate-600 mb-3">Últimas Contas a Pagar</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {contasPagar.slice(0, 5).map((conta) => (
                  <div key={conta.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-md">
                    <div>
                      <p className="text-sm font-medium text-slate-900 truncate" style={{ maxWidth: '200px' }}>
                        {conta.descricao}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(conta.data_vencimento).toLocaleDateString('pt-BR')} • {conta.categoria}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-bold text-slate-900">
                        R$ {conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        conta.status === 'pago' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {conta.status === 'pago' ? 'Pago' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resumo Visual */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h3 className="font-heading font-bold text-lg text-slate-800 mb-6">Resumo do Fluxo</h3>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <div className="text-center p-6 bg-emerald-50 rounded-lg min-w-[200px]">
            <p className="text-sm text-emerald-600 mb-2">Total Entradas</p>
            <p className="font-mono font-black text-2xl text-emerald-700">
              R$ {fluxo?.contas_receber?.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          
          <ArrowRight className="w-8 h-8 text-slate-400 hidden md:block" />
          
          <div className="text-center p-6 bg-red-50 rounded-lg min-w-[200px]">
            <p className="text-sm text-red-600 mb-2">Total Saídas</p>
            <p className="font-mono font-black text-2xl text-red-700">
              R$ {fluxo?.contas_pagar?.total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          
          <ArrowRight className="w-8 h-8 text-slate-400 hidden md:block" />
          
          <div className={`text-center p-6 rounded-lg min-w-[200px] ${
            (fluxo?.saldo_previsto || 0) >= 0 ? 'bg-blue-50' : 'bg-amber-50'
          }`}>
            <p className={`text-sm mb-2 ${
              (fluxo?.saldo_previsto || 0) >= 0 ? 'text-blue-600' : 'text-amber-600'
            }`}>Saldo Previsto</p>
            <p className={`font-mono font-black text-2xl ${
              (fluxo?.saldo_previsto || 0) >= 0 ? 'text-blue-700' : 'text-amber-700'
            }`}>
              R$ {fluxo?.saldo_previsto?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FluxoCaixa;
