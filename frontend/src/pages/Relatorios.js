import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FileText, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const COLORS = ['#f97316', '#1e3a5f', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];

const Relatorios = () => {
  const [stats, setStats] = useState(null);
  const [osData, setOsData] = useState([]);
  const [faturamentoMensal, setFaturamentoMensal] = useState([]);
  const [servicosRealizados, setServicosRealizados] = useState([]);
  const [topClientes, setTopClientes] = useState([]);
  const [totalAFaturar, setTotalAFaturar] = useState(0);
  const [loading, setLoading] = useState(true);
  const [anoSelecionado, setAnoSelecionado] = useState(new Date().getFullYear());

  // Anos disponíveis para seleção (últimos 5 anos)
  const anosDisponiveis = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    fetchData();
  }, [anoSelecionado]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, osRes] = await Promise.all([
        axios.get(`${API_URL}/api/dashboard/stats`),
        axios.get(`${API_URL}/api/ordens-servico`)
      ]);
      
      setStats(statsRes.data);
      const todasOS = osRes.data;
      
      // Filtrar OS pelo ano selecionado
      const osAno = todasOS.filter(os => {
        const osDate = new Date(os.criado_em);
        return osDate.getFullYear() === anoSelecionado;
      });
      
      setOsData(osAno);
      
      // Calcular total a faturar (OS em andamento)
      const osAndamento = osAno.filter(os => os.status === 'andamento');
      const totalFaturar = osAndamento.reduce((sum, os) => sum + os.valor_total, 0);
      setTotalAFaturar(totalFaturar);
      
      // Preparar dados para gráficos
      processarDadosGraficos(osAno);
      
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  };

  const processarDadosGraficos = (osCompletas) => {
    // Faturamento mensal (todos os 12 meses do ano selecionado)
    const mesesData = {};
    const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    for (let i = 0; i < 12; i++) {
      mesesData[mesesNomes[i]] = { valor: 0, quantidade: 0 };
    }
    
    osCompletas
      .filter(os => os.status === 'concluido')
      .forEach(os => {
        const data = new Date(os.concluido_em || os.criado_em);
        if (data.getFullYear() === anoSelecionado) {
          const mesIndex = data.getMonth();
          mesesData[mesesNomes[mesIndex]].valor += os.valor_total;
          mesesData[mesesNomes[mesIndex]].quantidade += 1;
        }
      });
    
    setFaturamentoMensal(
      Object.entries(mesesData).map(([mes, dados]) => ({
        mes,
        valor: parseFloat(dados.valor.toFixed(2)),
        quantidade: dados.quantidade
      }))
    );
    
    // Serviços mais realizados
    const servicosCount = {};
    osCompletas.forEach(os => {
      os.servicos?.forEach(servico => {
        const key = servico.servico;
        servicosCount[key] = (servicosCount[key] || 0) + 1;
      });
    });
    
    const topServicos = Object.entries(servicosCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([servico, quantidade]) => ({ servico, quantidade }));
    
    setServicosRealizados(topServicos);
    
    // Top 5 clientes por faturamento
    const clientesValor = {};
    osCompletas
      .filter(os => os.status === 'concluido')
      .forEach(os => {
        clientesValor[os.cliente_nome] = (clientesValor[os.cliente_nome] || 0) + os.valor_total;
      });
    
    const top5 = Object.entries(clientesValor)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cliente, valor]) => ({ cliente, valor: parseFloat(valor.toFixed(2)) }));
    
    setTopClientes(top5);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f97316]"></div>
      </div>
    );
  }

  const osPorStatus = [
    { name: 'Pendente', value: osData.filter(os => os.status === 'pendente').length },
    { name: 'Andamento', value: osData.filter(os => os.status === 'andamento').length },
    { name: 'Concluído', value: osData.filter(os => os.status === 'concluido').length }
  ];

  const faturamentoTotal = faturamentoMensal.reduce((sum, m) => sum + m.valor, 0);
  const osTotal = faturamentoMensal.reduce((sum, m) => sum + m.quantidade, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-black text-4xl text-slate-900" data-testid="relatorios-title">Relatórios</h1>
          <p className="text-slate-600 mt-2">Análise de desempenho da oficina</p>
        </div>
        
        {/* Seletor de Ano */}
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
          <Calendar className="w-5 h-5 text-[#f97316]" />
          <select
            value={anoSelecionado}
            onChange={(e) => setAnoSelecionado(parseInt(e.target.value))}
            className="font-bold text-lg text-[#1e3a5f] bg-transparent border-none focus:outline-none cursor-pointer"
            data-testid="seletor-ano"
          >
            {anosDisponiveis.map(ano => (
              <option key={ano} value={ano}>{ano}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Resumo do Ano */}
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d4a6f] rounded-lg shadow-lg p-6 text-white">
        <h2 className="text-lg font-medium mb-4">Resumo Anual - {anoSelecionado}</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <p className="text-white/70 text-sm">Faturamento Total</p>
            <p className="font-heading font-black text-3xl">
              R$ {faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-white/70 text-sm">Total de OS</p>
            <p className="font-heading font-black text-3xl">{osData.length}</p>
          </div>
          <div>
            <p className="text-white/70 text-sm">OS Concluídas</p>
            <p className="font-heading font-black text-3xl">{osTotal}</p>
          </div>
          <div>
            <p className="text-white/70 text-sm">Ticket Médio</p>
            <p className="font-heading font-black text-3xl">
              R$ {osTotal > 0 ? (faturamentoTotal / osTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0,00'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <p className="text-white/80 text-sm mb-1">Total de OS</p>
          <p className="font-heading font-black text-3xl">{osData.length}</p>
          <p className="text-white/70 text-xs mt-2">em {anoSelecionado}</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-lg p-6 text-white">
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-3">
            <DollarSign className="w-6 h-6" />
          </div>
          <p className="text-white/80 text-sm mb-1">Ticket Médio</p>
          <p className="font-heading font-black text-3xl">
            R$ {osTotal > 0 
              ? (faturamentoTotal / osTotal).toFixed(0)
              : '0'
            }
          </p>
          <p className="text-white/70 text-xs mt-2">por OS</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg shadow-lg p-6 text-white">
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-3">
            <TrendingUp className="w-6 h-6" />
          </div>
          <p className="text-white/80 text-sm mb-1">OS Concluídas</p>
          <p className="font-heading font-black text-3xl">{osTotal}</p>
          <p className="text-white/70 text-xs mt-2">finalizadas</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-3">
            <DollarSign className="w-6 h-6" />
          </div>
          <p className="text-white/80 text-sm mb-1">A Faturar</p>
          <p className="font-heading font-black text-2xl">
            R$ {totalAFaturar.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-white/70 text-xs mt-2">OS em andamento</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h2 className="font-heading font-bold text-xl text-slate-800 mb-4">Faturamento Mensal - {anoSelecionado}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={faturamentoMensal}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="mes" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px'
                }}
                formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              />
              <Line 
                type="monotone" 
                dataKey="valor" 
                stroke="#f97316" 
                strokeWidth={3}
                dot={{ fill: '#f97316', r: 5 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h2 className="font-heading font-bold text-xl text-slate-800 mb-4">OS por Status</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={osPorStatus}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {osPorStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h2 className="font-heading font-bold text-xl text-slate-800 mb-4">Quantidade de OS por Mês - {anoSelecionado}</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={faturamentoMensal}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="mes" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
              <Bar dataKey="quantidade" fill="#1e3a5f" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h2 className="font-heading font-bold text-xl text-slate-800 mb-4">Serviços Mais Realizados</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={servicosRealizados} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis dataKey="servico" type="category" width={150} stroke="#64748b" style={{ fontSize: '11px' }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
              <Bar dataKey="quantidade" fill="#10b981" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h2 className="font-heading font-bold text-xl text-slate-800 mb-4">Top 5 Clientes por Faturamento - {anoSelecionado}</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={topClientes}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="cliente" stroke="#64748b" style={{ fontSize: '12px' }} />
            <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
              formatter={(value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            />
            <Bar dataKey="valor" fill="#f97316" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-6">
        <h3 className="font-heading font-bold text-lg text-slate-800 mb-2">Análise Detalhada de Faturamento - {anoSelecionado}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <p className="text-sm text-slate-600 mb-1">Receita Total</p>
            <p className="font-mono font-bold text-2xl text-emerald-600">
              R$ {faturamentoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-1">Média Mensal</p>
            <p className="font-mono font-bold text-2xl text-blue-600">
              R$ {(faturamentoTotal / 12).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-1">Melhor Mês</p>
            <p className="font-mono font-bold text-2xl text-[#f97316]">
              {faturamentoMensal.reduce((max, m) => m.valor > max.valor ? m : max, { mes: '-', valor: 0 }).mes}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Relatorios;
