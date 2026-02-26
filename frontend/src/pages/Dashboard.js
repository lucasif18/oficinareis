import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { FileText, Users, CheckCircle, Clock, AlertTriangle, FileCheck, TrendingUp, Bell, X, Wifi, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, '-')}`}>
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">{title}</p>
        <p className="font-heading font-black text-3xl text-slate-900">{value}</p>
        {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
      </div>
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

const AlertCard = ({ title, message, link, linkText, icon: Icon, color }) => (
  <div className={`bg-white rounded-lg border-l-4 ${color} shadow-sm p-4`} data-testid={`alert-${title.toLowerCase().replace(/\s+/g, '-')}`}>
    <div className="flex items-start gap-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color.replace('border', 'bg').replace('600', '100')}`}>
        <Icon className={`w-5 h-5 ${color.replace('border', 'text')}`} />
      </div>
      <div className="flex-1">
        <h3 className="font-heading font-bold text-slate-800 mb-1">{title}</h3>
        <p className="text-sm text-slate-600 mb-2">{message}</p>
        <Link 
          to={link} 
          className="text-sm font-medium text-[#f97316] hover:text-[#ea580c] inline-flex items-center gap-1"
          data-testid={`alert-link-${title.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {linkText} →
        </Link>
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState(null);
  const [recentOS, setRecentOS] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, alertsRes, osRes] = await Promise.all([
        axios.get(`${API_URL}/api/dashboard/stats`),
        axios.get(`${API_URL}/api/dashboard/alerts`),
        axios.get(`${API_URL}/api/dashboard/recent-os`)
      ]);
      setStats(statsRes.data);
      setAlerts(alertsRes.data);
      setRecentOS(osRes.data);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pendente: 'bg-amber-100 text-amber-700',
      andamento: 'bg-blue-100 text-blue-700',
      concluido: 'bg-emerald-100 text-emerald-700'
    };
    const labels = {
      pendente: 'Pendente',
      andamento: 'Em Andamento',
      concluido: 'Concluído'
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f97316]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading font-black text-4xl text-slate-900" data-testid="dashboard-title">Dashboard</h1>
        <p className="text-slate-600 mt-2">Bem-vindo ao sistema da Oficina Reis</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Ordens de Serviço"
          value={stats?.total_os || 0}
          subtitle="Total cadastradas"
          icon={FileText}
          color="bg-blue-500"
        />
        <StatCard
          title="Em Andamento"
          value={stats?.os_andamento || 0}
          subtitle="OS em execução"
          icon={Clock}
          color="bg-amber-500"
        />
        <StatCard
          title="Concluídas"
          value={stats?.os_concluidas || 0}
          subtitle="OS finalizadas"
          icon={CheckCircle}
          color="bg-emerald-500"
        />
        <StatCard
          title="Clientes"
          value={stats?.total_clientes || 0}
          subtitle="Cadastrados"
          icon={Users}
          color="bg-purple-500"
        />
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#f97316]" />
            <h2 className="font-heading font-bold text-xl text-slate-800">Faturamento do Mês</h2>
          </div>
        </div>
        <p className="font-mono text-4xl font-bold text-[#1e3a5f]">
          R$ {(stats?.faturamento_mes || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="text-sm text-slate-500 mt-2">0 OS realizadas no mês</p>
      </div>

      {(alerts?.pecas_baixo_estoque?.length > 0 || alerts?.orcamentos_pendentes > 0) && (
        <div>
          <h2 className="font-heading font-bold text-2xl text-slate-800 mb-4">Alertas Proativos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {alerts?.pecas_baixo_estoque?.length > 0 && (
              <AlertCard
                title="Estoque Baixo"
                message={`${alerts.pecas_baixo_estoque.length} peça(s) precisam de reposição`}
                link="/pecas"
                linkText="Ver Peças"
                icon={AlertTriangle}
                color="border-amber-600"
              />
            )}
            {alerts?.orcamentos_pendentes > 0 && (
              <AlertCard
                title="Orçamentos Pendentes"
                message={`${alerts.orcamentos_pendentes} orçamento(s) aguardando aprovação`}
                link="/orcamentos"
                linkText="Ver Orçamentos"
                icon={FileCheck}
                color="border-blue-600"
              />
            )}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-2xl text-slate-800">Ordens de Serviço Recentes</h2>
          <Link 
            to="/ordens-servico" 
            className="text-sm font-medium text-[#f97316] hover:text-[#ea580c]"
            data-testid="view-all-os-link"
          >
            Ver todas →
          </Link>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">OS</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Veículo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOS.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                      Nenhuma ordem de serviço encontrada
                    </td>
                  </tr>
                ) : (
                  recentOS.map((os) => (
                    <tr key={os.id} className="hover:bg-slate-50 transition-colors" data-testid={`os-row-${os.numero_fisico}`}>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-medium text-slate-900">#{os.numero_fisico}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-700">{os.cliente_nome}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">{os.veiculo_tipo} - {os.veiculo_modelo}</span>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(os.status)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono text-sm font-medium text-slate-900">
                          R$ {os.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
