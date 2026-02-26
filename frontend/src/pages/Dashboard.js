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
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);

  // Conectar WebSocket para notificações em tempo real
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    const wsUrl = API_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    
    try {
      wsRef.current = new WebSocket(`${wsUrl}/ws/servicos`);
      
      wsRef.current.onopen = () => {
        setWsConnected(true);
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'servico_concluido') {
            // Adicionar notificação quando um serviço é concluído
            const newNotification = {
              id: Date.now(),
              type: 'servico_concluido',
              message: `Serviço concluído por ${data.funcionario_nome}`,
              timestamp: new Date(),
              read: false
            };
            setNotifications(prev => [newNotification, ...prev].slice(0, 20));
            
            // Mostrar toast
            toast.success(`Serviço concluído por ${data.funcionario_nome}!`, {
              icon: <CheckCircle className="w-5 h-5 text-emerald-500" />
            });
            
            // Atualizar dados do dashboard
            fetchDashboardData();
          }
          
          if (data.type === 'servico_bloqueado') {
            const newNotification = {
              id: Date.now(),
              type: 'servico_iniciado',
              message: `${data.funcionario_nome} iniciou um serviço`,
              timestamp: new Date(),
              read: false
            };
            setNotifications(prev => [newNotification, ...prev].slice(0, 20));
          }
        } catch (e) {
          console.error('Erro ao processar mensagem WS:', e);
        }
      };
      
      wsRef.current.onclose = () => {
        setWsConnected(false);
        setTimeout(() => connectWebSocket(), 3000);
      };
      
      wsRef.current.onerror = () => {
        setWsConnected(false);
      };
    } catch (error) {
      setWsConnected(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

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

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
    setShowNotifications(false);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-black text-4xl text-slate-900" data-testid="dashboard-title">Dashboard</h1>
          <p className="text-slate-600 mt-2">Bem-vindo ao sistema da Oficina Reis</p>
        </div>
        
        {/* Notificações */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-lg bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
            data-testid="notifications-button"
          >
            <Bell className="w-6 h-6 text-slate-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          
          {/* Indicador de conexão */}
          <div className="absolute -bottom-1 -left-1">
            {wsConnected ? (
              <Wifi className="w-3 h-3 text-emerald-500" />
            ) : (
              <WifiOff className="w-3 h-3 text-slate-400" />
            )}
          </div>
          
          {/* Painel de Notificações */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg border border-slate-200 shadow-lg z-50" data-testid="notifications-panel">
              <div className="p-3 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-bold text-slate-800">Notificações</h3>
                <div className="flex gap-2">
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="text-xs text-[#f97316] hover:underline"
                    >
                      Marcar como lidas
                    </button>
                  )}
                  <button 
                    onClick={() => setShowNotifications(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 text-sm">
                    Nenhuma notificação
                  </div>
                ) : (
                  notifications.map(notification => (
                    <div 
                      key={notification.id}
                      className={`p-3 border-b border-slate-100 ${!notification.read ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        {notification.type === 'servico_concluido' ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" />
                        ) : (
                          <Clock className="w-4 h-4 text-blue-500 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm text-slate-700">{notification.message}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {notification.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {notifications.length > 0 && (
                <div className="p-2 border-t border-slate-200">
                  <button 
                    onClick={clearNotifications}
                    className="w-full text-center text-sm text-slate-500 hover:text-slate-700"
                  >
                    Limpar todas
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
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
