import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FileText, Clock, Truck, CheckCircle, AlertTriangle, CreditCard, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
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

const DashboardCliente = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total_os: 0,
    pendentes: 0,
    enviando: 0,
    entregues: 0
  });
  const [osPendentes, setOsPendentes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Buscar OS do cliente logado
      const response = await axios.get(`${API_URL}/api/cliente/minhas-os`);
      const ordens = response.data;
      
      // Calcular estatísticas
      const pendentes = ordens.filter(os => os.status === 'pendente' || os.status === 'andamento');
      const enviando = ordens.filter(os => os.status === 'enviando');
      const entregues = ordens.filter(os => os.status === 'entregue' || os.status === 'concluido');
      
      setStats({
        total_os: ordens.length,
        pendentes: pendentes.length,
        enviando: enviando.length,
        entregues: entregues.length
      });
      
      // Buscar OS com pagamento pendente
      const osPagamentoPendente = ordens.filter(os => {
        // OS concluídas ou entregues sem pagamento registrado
        return (os.status === 'concluido' || os.status === 'entregue') && !os.pago;
      }).map(os => {
        // Calcular dias de vencimento
        const dataConclusao = new Date(os.concluido_em || os.criado_em);
        const hoje = new Date();
        const diasVencido = Math.floor((hoje - dataConclusao) / (1000 * 60 * 60 * 24));
        return { ...os, diasVencido };
      });
      
      setOsPendentes(osPagamentoPendente);
      
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pendente: 'bg-amber-100 text-amber-700',
      andamento: 'bg-blue-100 text-blue-700',
      concluido: 'bg-emerald-100 text-emerald-700',
      enviando: 'bg-purple-100 text-purple-700',
      entregue: 'bg-emerald-100 text-emerald-700'
    };
    const labels = {
      pendente: 'Pendente',
      andamento: 'Em Andamento',
      concluido: 'Pronto',
      enviando: 'Em Trânsito',
      entregue: 'Entregue'
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
    <div className="space-y-8" data-testid="dashboard-cliente">
      <div>
        <h1 className="font-heading font-black text-4xl text-slate-900">Meu Painel</h1>
        <p className="text-slate-600 mt-2">Bem-vindo, {user?.nome}! Acompanhe suas Ordens de Serviço</p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total de OS"
          value={stats.total_os}
          subtitle="Todas as ordens"
          icon={FileText}
          color="bg-[#1e3a5f]"
        />
        <StatCard
          title="Em Processo"
          value={stats.pendentes}
          subtitle="Aguardando ou em andamento"
          icon={Clock}
          color="bg-amber-500"
        />
        <StatCard
          title="Em Trânsito"
          value={stats.enviando}
          subtitle="Sendo enviadas"
          icon={Truck}
          color="bg-purple-500"
        />
        <StatCard
          title="Entregues"
          value={stats.entregues}
          subtitle="Finalizadas"
          icon={CheckCircle}
          color="bg-emerald-500"
        />
      </div>

      {/* OS Pendentes de Pagamento */}
      {osPendentes.length > 0 && (
        <div className="bg-white rounded-lg border border-red-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-red-200 bg-red-50">
            <h2 className="font-heading font-bold text-xl text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Pagamentos Pendentes
              <span className="ml-2 px-2 py-0.5 bg-red-200 text-red-800 text-xs rounded-full">
                {osPendentes.length}
              </span>
            </h2>
            <p className="text-sm text-red-600 mt-1">Ordens de serviço aguardando pagamento</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">OS</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Veículo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Valor</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Dias Vencido</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {osPendentes.map((os) => (
                  <tr key={os.id} className="hover:bg-red-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-bold text-[#1e3a5f]">#{os.numero_fisico}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">{os.veiculo_tipo} - {os.veiculo_modelo}</span>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(os.status)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-sm font-bold text-red-600">
                        R$ {(os.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        os.diasVencido > 30 ? 'bg-red-100 text-red-700' : 
                        os.diasVencido > 7 ? 'bg-amber-100 text-amber-700' : 
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {os.diasVencido} dias
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to={`/minhas-os/${os.id}`}>
                        <button className="p-2 text-[#1e3a5f] hover:text-[#f97316] hover:bg-slate-100 rounded-md transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {osPendentes.length > 0 && (
            <div className="p-4 bg-red-50 border-t border-red-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-red-800">Total Pendente</span>
                <span className="font-mono text-lg font-bold text-red-600">
                  R$ {osPendentes.reduce((sum, os) => sum + (os.valor_total || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Link para ver todas as OS */}
      <div className="flex justify-center">
        <Link 
          to="/minhas-os"
          className="bg-[#f59e0b] hover:bg-[#d97706] text-[#1e3a5f] font-bold py-3 px-8 rounded-lg transition-colors flex items-center gap-2"
        >
          <Eye className="w-5 h-5" />
          Ver Todas as Minhas OS
        </Link>
      </div>
    </div>
  );
};

export default DashboardCliente;
