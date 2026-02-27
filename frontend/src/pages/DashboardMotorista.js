import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Truck, Package, CheckCircle, Clock, AlertTriangle, FileText, Phone, User, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

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

const DashboardMotorista = () => {
  const [stats, setStats] = useState({
    romaneios_pendentes: 0,
    romaneios_em_rota: 0,
    romaneios_concluidos: 0,
    total_entregas_hoje: 0
  });
  const [romaneiosRecentes, setRomaneiosRecentes] = useState([]);
  const [inadimplentes, setInadimplentes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [romaneiosRes, inadimplentesRes] = await Promise.all([
        axios.get(`${API_URL}/api/romaneios`),
        axios.get(`${API_URL}/api/financeiro/inadimplentes`)
      ]);
      
      const romaneios = romaneiosRes.data;
      
      // Calcular estatísticas
      setStats({
        romaneios_pendentes: romaneios.filter(r => r.status === 'pendente').length,
        romaneios_em_rota: romaneios.filter(r => r.status === 'em_rota').length,
        romaneios_concluidos: romaneios.filter(r => r.status === 'concluido').length,
        total_entregas_hoje: romaneios.filter(r => {
          const dataEntrega = new Date(r.data_entrega);
          const hoje = new Date();
          return dataEntrega.toDateString() === hoje.toDateString();
        }).length
      });
      
      // Romaneios recentes (últimos 10)
      setRomaneiosRecentes(romaneios.slice(0, 10));
      
      // Inadimplentes
      setInadimplentes(inadimplentesRes.data || []);
      
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
      em_rota: 'bg-blue-100 text-blue-700',
      concluido: 'bg-emerald-100 text-emerald-700'
    };
    const labels = {
      pendente: 'Pendente',
      em_rota: 'Em Rota',
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
    <div className="space-y-8" data-testid="dashboard-motorista">
      <div>
        <h1 className="font-heading font-black text-4xl text-slate-900">Dashboard do Motorista</h1>
        <p className="text-slate-600 mt-2">Visão geral das entregas e cobranças</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Pendentes"
          value={stats.romaneios_pendentes}
          subtitle="Aguardando saída"
          icon={Clock}
          color="bg-amber-500"
        />
        <StatCard
          title="Em Rota"
          value={stats.romaneios_em_rota}
          subtitle="Em andamento"
          icon={Truck}
          color="bg-blue-500"
        />
        <StatCard
          title="Concluídos"
          value={stats.romaneios_concluidos}
          subtitle="Entregas finalizadas"
          icon={CheckCircle}
          color="bg-emerald-500"
        />
        <StatCard
          title="Entregas Hoje"
          value={stats.total_entregas_hoje}
          subtitle="Programadas"
          icon={Package}
          color="bg-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Romaneios Recentes */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-heading font-bold text-xl text-slate-800 flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#f97316]" />
              Romaneios Recentes
            </h2>
            <Link to="/romaneio" className="text-sm font-medium text-[#f97316] hover:text-[#ea580c]">
              Ver todos →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Número</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">OS</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {romaneiosRecentes.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-4 py-8 text-center text-slate-500">
                      Nenhum romaneio encontrado
                    </td>
                  </tr>
                ) : (
                  romaneiosRecentes.map((rom) => (
                    <tr key={rom.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link to={`/romaneio/${rom.id}`} className="font-mono text-sm font-bold text-[#1e3a5f] hover:underline">
                          #{rom.numero}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">{rom.os_ids.length} OS</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">
                          {new Date(rom.data_entrega).toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(rom.status)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabela de Inadimplência */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-red-50">
            <h2 className="font-heading font-bold text-xl text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Clientes Inadimplentes
              <span className="ml-2 px-2 py-0.5 bg-red-200 text-red-800 text-xs rounded-full">
                {inadimplentes.length}
              </span>
            </h2>
            <p className="text-sm text-red-600 mt-1">Débitos em atraso há mais de 30 dias</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Telefone</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inadimplentes.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-4 py-8 text-center text-slate-500">
                      <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      Nenhum cliente inadimplente
                    </td>
                  </tr>
                ) : (
                  inadimplentes.map((cliente, idx) => (
                    <tr key={idx} className="hover:bg-red-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-900">{cliente.nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <a 
                            href={`tel:${cliente.telefone}`} 
                            className="text-sm text-blue-600 hover:underline"
                          >
                            {cliente.telefone}
                          </a>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono text-sm font-bold text-red-600">
                          R$ {cliente.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {inadimplentes.length > 0 && (
            <div className="p-4 bg-red-50 border-t border-red-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-red-800">Total em Atraso</span>
                <span className="font-mono text-lg font-bold text-red-600">
                  R$ {inadimplentes.reduce((sum, c) => sum + c.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardMotorista;
