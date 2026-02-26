import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Play, CheckCircle, Clock, AlertCircle, Filter, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ServicosFuncionario = () => {
  const { user } = useAuth();
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchServicos = useCallback(async () => {
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      
      const response = await axios.get(`${API_URL}/api/servicos-funcionario`, { params });
      setServicos(response.data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Erro ao buscar serviços:', error);
      toast.error('Erro ao carregar serviços');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchServicos();
    
    // Polling para atualizações em tempo real (Observer Pattern simplificado)
    const interval = setInterval(() => {
      fetchServicos();
    }, 5000); // Atualiza a cada 5 segundos
    
    return () => clearInterval(interval);
  }, [fetchServicos]);

  const iniciarServico = async (servicoId) => {
    try {
      await axios.post(`${API_URL}/api/servicos-funcionario/${servicoId}/iniciar`);
      toast.success('Serviço iniciado com sucesso!');
      fetchServicos();
    } catch (error) {
      if (error.response?.status === 409) {
        toast.error('Este serviço já foi selecionado por outro funcionário!');
      } else {
        toast.error(error.response?.data?.detail || 'Erro ao iniciar serviço');
      }
      fetchServicos();
    }
  };

  const concluirServico = async (servicoId) => {
    try {
      await axios.post(`${API_URL}/api/servicos-funcionario/${servicoId}/concluir`);
      toast.success('Serviço concluído com sucesso!');
      fetchServicos();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao concluir serviço');
    }
  };

  const getStatusBadge = (status, bloqueado_por) => {
    if (bloqueado_por && bloqueado_por !== user?.id) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-100 text-red-700">
          <AlertCircle className="w-3 h-3" />
          Em uso
        </span>
      );
    }
    
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

  const servicosBloqueados = servicos.filter(s => s.bloqueado_por && s.bloqueado_por !== user?.id);
  const servicosDisponiveis = servicos.filter(s => !s.bloqueado_por || s.bloqueado_por === user?.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-black text-4xl text-slate-900">Meus Serviços</h1>
          <p className="text-slate-600 mt-2">Selecione e execute serviços do seu setor</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs text-slate-500">
            <RefreshCw className="w-3 h-3 inline mr-1" />
            Atualizado: {lastUpdate.toLocaleTimeString('pt-BR')}
          </div>
          <Button
            onClick={fetchServicos}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-4">
          <Filter className="w-5 h-5 text-slate-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#f97316]"
          >
            <option value="">Todos os status</option>
            <option value="disponivel">Disponíveis</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="concluido">Concluídos</option>
          </select>
        </div>
      </div>

      {/* Aviso de serviços bloqueados */}
      {servicosBloqueados.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <p className="text-amber-800 text-sm">
            <strong>{servicosBloqueados.length}</strong> serviço(s) estão sendo executados por outros funcionários
          </p>
        </div>
      )}

      {/* Lista de Serviços */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f97316]"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">OS</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Setor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Serviço</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {servicos.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                      Nenhum serviço encontrado para seu setor
                    </td>
                  </tr>
                ) : (
                  servicos.map((servico) => {
                    const isBloqueado = servico.bloqueado_por && servico.bloqueado_por !== user?.id;
                    const isMeuServico = servico.bloqueado_por === user?.id;
                    
                    return (
                      <tr 
                        key={servico.id} 
                        className={`transition-colors ${
                          isBloqueado 
                            ? 'bg-red-50 opacity-60' 
                            : isMeuServico 
                              ? 'bg-blue-50' 
                              : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm font-bold text-[#1e3a5f]">#{servico.os_numero}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-900">{servico.cliente_nome}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#1e3a5f] text-white">
                            {servico.setor}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-medium text-slate-900">{servico.servico}</span>
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(servico.status, servico.bloqueado_por)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {servico.status === 'disponivel' && !isBloqueado && (
                              <button
                                onClick={() => iniciarServico(servico.id)}
                                className="px-3 py-1.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200 transition-colors flex items-center gap-1"
                              >
                                <Play className="w-3 h-3" />
                                Iniciar
                              </button>
                            )}
                            {servico.status === 'em_andamento' && isMeuServico && (
                              <button
                                onClick={() => concluirServico(servico.id)}
                                className="px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors flex items-center gap-1"
                              >
                                <CheckCircle className="w-3 h-3" />
                                Concluir
                              </button>
                            )}
                            {servico.status === 'concluido' && (
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Finalizado
                              </span>
                            )}
                            {isBloqueado && (
                              <span className="text-xs text-red-600">
                                Em uso por outro funcionário
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServicosFuncionario;
