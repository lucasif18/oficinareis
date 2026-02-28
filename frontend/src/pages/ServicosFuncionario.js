import React, { useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { Play, CheckCircle, Clock, AlertCircle, Filter, RefreshCw, Wifi, WifiOff, Camera, Upload, X, Image } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ServicosFuncionario = () => {
  const { user } = useAuth();
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  
  // Estado para upload de fotos
  const [showFotoModal, setShowFotoModal] = useState(false);
  const [selectedServico, setSelectedServico] = useState(null);
  const [fotoTipo, setFotoTipo] = useState('antes');
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

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

  // Conectar WebSocket para atualizações em tempo real
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    // Construir URL do WebSocket
    const wsUrl = API_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    
    try {
      wsRef.current = new WebSocket(`${wsUrl}/ws/servicos`);
      
      wsRef.current.onopen = () => {
        console.log('WebSocket conectado');
        setWsConnected(true);
        // Autenticar com user_id
        if (user?.id) {
          wsRef.current.send(JSON.stringify({ type: 'auth', user_id: user.id }));
        }
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket mensagem:', data);
          
          if (data.type === 'servico_bloqueado' || data.type === 'servico_concluido') {
            // Atualizar lista de serviços quando outro funcionário bloqueia/conclui
            fetchServicos();
            
            if (data.type === 'servico_bloqueado' && data.bloqueado_por !== user?.id) {
              toast.info(`Serviço selecionado por ${data.funcionario_nome}`);
            }
          }
        } catch (e) {
          console.error('Erro ao processar mensagem WS:', e);
        }
      };
      
      wsRef.current.onclose = () => {
        console.log('WebSocket desconectado');
        setWsConnected(false);
        // Tentar reconectar após 3 segundos
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };
      
      wsRef.current.onerror = (error) => {
        console.error('WebSocket erro:', error);
        setWsConnected(false);
      };
    } catch (error) {
      console.error('Erro ao criar WebSocket:', error);
      setWsConnected(false);
    }
  }, [user?.id, fetchServicos]);

  useEffect(() => {
    fetchServicos();
    connectWebSocket();
    
    // Fallback: polling a cada 10 segundos caso WebSocket falhe
    const interval = setInterval(() => {
      if (!wsConnected) {
        fetchServicos();
      }
    }, 10000);
    
    return () => {
      clearInterval(interval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [fetchServicos, connectWebSocket, wsConnected]);

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

  // Função para abrir modal de foto
  const openFotoModal = (servico, tipo) => {
    setSelectedServico(servico);
    setFotoTipo(tipo);
    setPreviewImage(null);
    setShowFotoModal(true);
  };

  // Função para processar imagem selecionada
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Imagem deve ter no máximo 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Função para fazer upload da foto
  const uploadFoto = async () => {
    if (!previewImage || !selectedServico) return;
    
    setUploading(true);
    try {
      // Fazer upload da foto para a OS
      await axios.post(`${API_URL}/api/ordens-servico/${selectedServico.os_id}/fotos`, {
        tipo: fotoTipo,
        imagem_base64: previewImage,
        descricao: `${fotoTipo === 'antes' ? 'Antes' : 'Depois'} - Setor: ${selectedServico.setor}`,
        setor: selectedServico.setor
      });
      
      toast.success(`Foto "${fotoTipo}" enviada com sucesso! Cliente e ADM foram notificados.`);
      setShowFotoModal(false);
      setPreviewImage(null);
      fetchServicos();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao enviar foto');
    } finally {
      setUploading(false);
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

  return (
    <div className="space-y-6" data-testid="servicos-funcionario-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-black text-4xl text-slate-900">Meus Serviços</h1>
          <p className="text-slate-600 mt-2">Selecione e execute serviços do seu setor</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {wsConnected ? (
              <>
                <Wifi className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-600">Tempo real</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-slate-400" />
                <span>Offline</span>
              </>
            )}
          </div>
          <div className="text-xs text-slate-500">
            <RefreshCw className="w-3 h-3 inline mr-1" />
            {lastUpdate.toLocaleTimeString('pt-BR')}
          </div>
          <Button
            onClick={fetchServicos}
            variant="outline"
            size="sm"
            data-testid="refresh-servicos-btn"
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
            data-testid="filter-status"
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
                        data-testid={`servico-row-${servico.id}`}
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
                                data-testid={`iniciar-servico-${servico.id}`}
                              >
                                <Play className="w-3 h-3" />
                                Iniciar
                              </button>
                            )}
                            {servico.status === 'em_andamento' && isMeuServico && (
                              <button
                                onClick={() => concluirServico(servico.id)}
                                className="px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors flex items-center gap-1"
                                data-testid={`concluir-servico-${servico.id}`}
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
