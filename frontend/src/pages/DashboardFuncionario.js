import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FileText, Clock, CheckCircle, Play } from 'lucide-react';
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

const DashboardFuncionario = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [atividades, setAtividades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, atividadesRes] = await Promise.all([
        axios.get(`${API_URL}/api/dashboard/funcionario/stats`),
        axios.get(`${API_URL}/api/dashboard/funcionario/atividades`)
      ]);
      setStats(statsRes.data);
      setAtividades(atividadesRes.data);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      disponivel: 'bg-emerald-100 text-emerald-700',
      em_andamento: 'bg-blue-100 text-blue-700',
      concluido: 'bg-slate-100 text-slate-700'
    };
    const labels = {
      disponivel: 'Disponível',
      em_andamento: 'Em Andamento',
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
        <h1 className="font-heading font-black text-4xl text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-2">Bem-vindo, {user?.nome}</p>
      </div>

      {/* Cards de Estatísticas - SEM valores monetários */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Serviços Disponíveis"
          value={stats?.servicos_disponiveis || 0}
          subtitle="Aguardando execução"
          icon={FileText}
          color="bg-emerald-500"
        />
        <StatCard
          title="Em Andamento"
          value={stats?.servicos_em_andamento || 0}
          subtitle="Sendo executados"
          icon={Play}
          color="bg-blue-500"
        />
        <StatCard
          title="Concluídos Hoje"
          value={stats?.servicos_concluidos_hoje || 0}
          subtitle="Finalizados"
          icon={CheckCircle}
          color="bg-amber-500"
        />
        <StatCard
          title="Meus Serviços"
          value={stats?.meus_servicos || 0}
          subtitle="Atribuídos a mim"
          icon={Clock}
          color="bg-purple-500"
        />
      </div>

      {/* Atividades Recentes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-2xl text-slate-800">Atividades Recentes</h2>
          <Link 
            to="/servicos" 
            className="text-sm font-medium text-[#f97316] hover:text-[#ea580c]"
          >
            Ver todos serviços →
          </Link>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">OS</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Setor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Serviço</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {atividades.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                      Nenhuma atividade recente
                    </td>
                  </tr>
                ) : (
                  atividades.map((atividade, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-medium text-slate-900">#{atividade.os_numero}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#1e3a5f] text-white">
                          {atividade.setor}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-700">{atividade.servico}</span>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(atividade.status)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">
                          {new Date(atividade.data).toLocaleDateString('pt-BR')}
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

export default DashboardFuncionario;
