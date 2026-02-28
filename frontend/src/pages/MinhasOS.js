import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FileText, Eye, Clock, CheckCircle, Truck, Camera, Settings, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Timeline de Progresso
const TimelineStep = ({ label, isActive, isCompleted, isPulsing }) => {
  return (
    <div className="flex flex-col items-center relative">
      <div 
        className={`
          w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 text-xs font-bold
          ${isCompleted 
            ? 'bg-emerald-500 text-white' 
            : isActive 
              ? `bg-[#f59e0b] text-[#1e3a5f] ${isPulsing ? 'animate-pulse shadow-lg shadow-yellow-400/50' : ''}` 
              : 'bg-slate-200 text-slate-400'
          }
        `}
      >
        {isCompleted ? '✓' : '•'}
      </div>
      <p className={`mt-1 text-xs text-center ${isCompleted || isActive ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
        {label}
      </p>
    </div>
  );
};

const TimelineConnector = ({ isCompleted }) => (
  <div className={`flex-1 h-0.5 mx-1 mt-4 ${isCompleted ? 'bg-emerald-500' : 'bg-slate-200'}`} />
);

const MinhasOS = () => {
  const { user } = useAuth();
  const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOS, setExpandedOS] = useState(null);

  useEffect(() => {
    fetchOrdens();
  }, []);

  const fetchOrdens = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/cliente/minhas-os`);
      setOrdens(response.data);
    } catch (error) {
      console.error('Erro ao buscar OS:', error);
      toast.error('Erro ao carregar suas ordens de serviço');
    } finally {
      setLoading(false);
    }
  };

  const getTimelineStatus = (os) => {
    const status = os.status;
    const emRomaneio = os.romaneio_id;
    const entregue = os.entregue || status === 'entregue';
    
    const servicosEmAndamento = os.servicos?.some(s => s.status === 'em_andamento');
    const servicosConcluidos = os.servicos?.filter(s => s.status === 'concluido').length || 0;
    const totalServicos = os.servicos?.length || 0;
    
    return {
      recebido: true,
      emProcesso: status !== 'pendente',
      emProcessoPulsing: servicosEmAndamento,
      pronto: servicosConcluidos === totalServicos && totalServicos > 0,
      enviando: emRomaneio || status === 'enviando',
      entregue: entregue
    };
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
      pendente: 'Recebido',
      andamento: 'Em Processo',
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
    <div className="space-y-6" data-testid="minhas-os-page">
      <div>
        <h1 className="font-heading font-black text-4xl text-slate-900">Minhas Ordens de Serviço</h1>
        <p className="text-slate-600 mt-2">Acompanhe o status e detalhes de cada serviço</p>
      </div>

      {ordens.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Você ainda não possui ordens de serviço</p>
        </div>
      ) : (
        <div className="space-y-4">
          {ordens.map((os) => {
            const timeline = getTimelineStatus(os);
            const isExpanded = expandedOS === os.id;
            
            return (
              <div key={os.id} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                {/* Header da OS */}
                <div 
                  className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedOS(isExpanded ? null : os.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-mono font-bold text-lg text-[#1e3a5f]">OS #{os.numero_fisico}</h3>
                        <p className="text-sm text-slate-600">{os.veiculo_tipo} - {os.veiculo_modelo}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {getStatusBadge(os.status)}
                      <span className="font-mono font-bold text-lg text-[#1e3a5f]">
                        R$ {(os.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                    </div>
                  </div>
                  
                  {/* Mini Timeline */}
                  <div className="flex items-center justify-center mt-4 px-8">
                    <TimelineStep label="Recebido" isCompleted={timeline.recebido} isActive={!timeline.emProcesso} />
                    <TimelineConnector isCompleted={timeline.emProcesso} />
                    <TimelineStep label="Em Processo" isCompleted={timeline.pronto} isActive={timeline.emProcesso && !timeline.pronto} isPulsing={timeline.emProcessoPulsing} />
                    <TimelineConnector isCompleted={timeline.pronto} />
                    <TimelineStep label="Pronto" isCompleted={timeline.enviando} isActive={timeline.pronto && !timeline.enviando} />
                    <TimelineConnector isCompleted={timeline.enviando} />
                    <TimelineStep label="Enviando" isCompleted={timeline.entregue} isActive={timeline.enviando && !timeline.entregue} />
                    <TimelineConnector isCompleted={timeline.entregue} />
                    <TimelineStep label="Entregue" isCompleted={timeline.entregue} isActive={false} />
                  </div>
                </div>

                {/* Conteúdo Expandido */}
                {isExpanded && (
                  <div className="border-t border-slate-200 p-4 bg-slate-50">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Serviços */}
                      <div>
                        <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                          <Settings className="w-4 h-4 text-[#f97316]" />
                          Serviços ({os.servicos?.length || 0})
                        </h4>
                        <div className="space-y-2">
                          {os.servicos?.map((servico, idx) => (
                            <div key={idx} className="bg-white rounded-lg p-3 border border-slate-200">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-[#1e3a5f] text-white mr-2">
                                    {servico.setor}
                                  </span>
                                  <span className="text-sm font-medium text-slate-900">{servico.servico}</span>
                                </div>
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  servico.status === 'concluido' ? 'bg-emerald-100 text-emerald-700' :
                                  servico.status === 'em_andamento' ? 'bg-blue-100 text-blue-700' :
                                  'bg-slate-100 text-slate-600'
                                }`}>
                                  {servico.status === 'concluido' ? 'Concluído' : 
                                   servico.status === 'em_andamento' ? 'Em Andamento' : 'Aguardando'}
                                </span>
                              </div>
                              {servico.funcionario_nome && (
                                <p className="text-xs text-slate-500 mt-1">Técnico: {servico.funcionario_nome}</p>
                              )}
                              <p className="text-sm font-mono text-right text-slate-700 mt-1">
                                R$ {(servico.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Peças */}
                      {os.pecas && os.pecas.length > 0 && (
                        <div>
                          <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <Package className="w-4 h-4 text-[#f97316]" />
                            Peças ({os.pecas.length})
                          </h4>
                          <div className="space-y-2">
                            {os.pecas.map((peca, idx) => (
                              <div key={idx} className="bg-white rounded-lg p-3 border border-slate-200 flex items-center justify-between">
                                <div>
                                  <span className="text-sm font-medium text-slate-900">{peca.peca_nome}</span>
                                  <span className="text-xs text-slate-500 ml-2">x{peca.quantidade}</span>
                                </div>
                                <span className="text-sm font-mono text-slate-700">
                                  R$ {(peca.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Galeria de Fotos */}
                    {os.fotos && os.fotos.length > 0 && (
                      <div className="mt-6">
                        <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                          <Camera className="w-4 h-4 text-[#f97316]" />
                          Relatório Visual de Qualidade
                        </h4>
                        <div className="grid grid-cols-2 gap-6">
                          {/* Fotos Antes */}
                          {os.fotos.filter(f => f.tipo === 'antes').length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                                Antes (Recebimento)
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                {os.fotos.filter(f => f.tipo === 'antes').map((foto, idx) => (
                                  <div key={idx} className="relative group">
                                    <img 
                                      src={foto.url} 
                                      alt={`Antes ${idx + 1}`}
                                      className="w-full h-24 object-cover rounded-lg border border-slate-200"
                                    />
                                    {foto.setor && (
                                      <span className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                                        {foto.setor}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Fotos Depois */}
                          {os.fotos.filter(f => f.tipo === 'depois').length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                                Depois (Finalizado)
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                {os.fotos.filter(f => f.tipo === 'depois').map((foto, idx) => (
                                  <div key={idx} className="relative group">
                                    <img 
                                      src={foto.url} 
                                      alt={`Depois ${idx + 1}`}
                                      className="w-full h-24 object-cover rounded-lg border border-slate-200"
                                    />
                                    {foto.setor && (
                                      <span className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                                        {foto.setor}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Resumo Financeiro */}
                    <div className="mt-6 bg-gradient-to-r from-[#1e3a5f] to-[#2d5a8a] rounded-lg p-4">
                      <div className="grid grid-cols-3 gap-4 text-white">
                        <div>
                          <p className="text-xs text-slate-300">Serviços</p>
                          <p className="font-mono font-bold">R$ {(os.valor_servicos || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-300">Peças</p>
                          <p className="font-mono font-bold">R$ {(os.valor_pecas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-300">TOTAL</p>
                          <p className="font-mono font-black text-xl text-[#f59e0b]">R$ {(os.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        </div>
                      </div>
                    </div>

                    {/* Datas */}
                    <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                      <span>Abertura: {new Date(os.criado_em).toLocaleDateString('pt-BR')}</span>
                      {os.concluido_em && (
                        <span>Conclusão: {new Date(os.concluido_em).toLocaleDateString('pt-BR')}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MinhasOS;
