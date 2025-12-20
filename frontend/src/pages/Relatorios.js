import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FileText, Users, DollarSign, Package, TrendingUp } from 'lucide-react';
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
  Legend,
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, osRes] = await Promise.all([
        axios.get(`${API_URL}/api/dashboard/stats`),
        axios.get(`${API_URL}/api/ordens-servico`)
      ]);
      
      setStats(statsRes.data);
      const todasOS = osRes.data;
      setOsData(todasOS);
      
      // Calcular total a faturar (OS em andamento)
      const osAndamento = todasOS.filter(os => os.status === 'andamento');
      const totalFaturar = osAndamento.reduce((sum, os) => sum + os.valor_total, 0);
      setTotalAFaturar(totalFaturar);
      
      // Preparar dados para gráficos
      processarDadosGraficos(todasOS);
      
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  };

  const processarDadosGraficos = (osCompletas) => {
    // Gráfico de OS por status
    const statusCount = {
      pendente: osCompletas.filter(os => os.status === 'pendente').length,
      andamento: osCompletas.filter(os => os.status === 'andamento').length,
      concluido: osCompletas.filter(os => os.status === 'concluido').length
    };
    
    // Faturamento mensal (últimos 6 meses)
    const mesesData = {};
    const hoje = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const mesAno = `${data.toLocaleString('pt-BR', { month: 'short' })}/${data.getFullYear().toString().slice(2)}`;
      mesesData[mesAno] = 0;
    }
    
    osCompletas
      .filter(os => os.status === 'concluido')
      .forEach(os => {
        if (os.concluido_em) {
          const data = new Date(os.concluido_em);
          const mesAno = `${data.toLocaleString('pt-BR', { month: 'short' })}/${data.getFullYear().toString().slice(2)}`;
          if (mesesData[mesAno] !== undefined) {
            mesesData[mesAno] += os.valor_total;
          }
        }
      });
    
    setFaturamentoMensal(
      Object.entries(mesesData).map(([mes, valor]) => ({
        mes,
        valor: parseFloat(valor.toFixed(2))
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-black text-4xl text-slate-900" data-testid="relatorios-title">Relatórios</h1>
        <p className="text-slate-600 mt-2">Análise de desempenho da oficina</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <p className="text-white/80 text-sm mb-1">Total de OS</p>
          <p className="font-heading font-black text-3xl">{stats?.total_os || 0}</p>
          <p className="text-white/70 text-xs mt-2">no período</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-lg p-6 text-white">
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-3">
            <DollarSign className="w-6 h-6" />
          </div>
          <p className="text-white/80 text-sm mb-1">Ticket Médio</p>
          <p className="font-heading font-black text-3xl">
            R$ {stats?.total_os > 0 
              ? ((stats?.faturamento_mes || 0) / stats.total_os).toFixed(0)
              : '0'
            }
          </p>
          <p className="text-white/70 text-xs mt-2">por OS</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg shadow-lg p-6 text-white">
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-3">
            <TrendingUp className="w-6 h-6" />
          </div>
          <p className="text-white/80 text-sm mb-1">OS Realizadas</p>
          <p className="font-heading font-black text-3xl">{stats?.os_concluidas || 0}</p>
          <p className="text-white/70 text-xs mt-2">concluídas</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <p className="text-white/80 text-sm mb-1">OS Pendentes</p>
          <p className="font-heading font-black text-3xl">{osData.filter(os => os.status === 'pendente').length}</p>
          <p className="text-white/70 text-xs mt-2">0% do total</p>
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
          <h2 className="font-heading font-bold text-xl text-slate-800 mb-4">Faturamento por Mês</h2>
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
          <h2 className="font-heading font-bold text-xl text-slate-800 mb-4">Quantidade de OS por Mês</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={faturamentoMensal}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="mes" stroke="#64748b" style={{ fontSize: '12px' }} />
              <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
              <Bar dataKey="valor" fill="#1e3a5f" radius={[8, 8, 0, 0]} />
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
        <h2 className="font-heading font-bold text-xl text-slate-800 mb-4">Top 5 Clientes por Faturamento</h2>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-50 rounded-lg p-6 text-center border border-slate-200">
          <p className="text-sm text-slate-500 mb-2">OS Concluídas</p>
          <p className="font-heading font-black text-4xl text-slate-900">{stats?.os_concluidas || 0}</p>
        </div>

        <div className="bg-slate-50 rounded-lg p-6 text-center border border-slate-200">
          <p className="text-sm text-slate-500 mb-2">Total Médio</p>
          <p className="font-mono font-bold text-3xl text-slate-900">
            R$ {stats?.total_os > 0 
              ? ((stats?.faturamento_mes || 0) / stats.total_os).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
              : '0,00'
            }
          </p>
        </div>

        <div className="bg-slate-50 rounded-lg p-6 text-center border border-slate-200">
          <p className="text-sm text-slate-500 mb-2">Custo Médio por OS</p>
          <p className="font-mono font-bold text-3xl text-slate-900">R$ 0,00</p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-6">
        <h3 className="font-heading font-bold text-lg text-slate-800 mb-2">Análise Detalhada de Faturamento</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div>
            <p className="text-sm text-slate-600 mb-1">Receita</p>
            <p className="font-mono font-bold text-2xl text-emerald-600">
              R$ {(stats?.faturamento_mes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-1">Despesas Operacionais</p>
            <p className="font-mono font-bold text-2xl text-red-600">-R$ 0,00</p>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-1">Receita Líquida</p>
            <p className="font-mono font-bold text-2xl text-blue-600">
              R$ {(stats?.faturamento_mes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Relatorios;
