import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { 
  Wrench, Search, FileText, Clock, CheckCircle, AlertCircle, Package, Settings, 
  Truck, MapPin, Camera, User, Phone, Mail, Car, History, ChevronDown, ChevronUp,
  Image, Calendar, Cog
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Timeline de Progresso
const TimelineStep = ({ label, icon: Icon, isActive, isCompleted, isPulsing, description }) => {
  return (
    <div className="flex flex-col items-center relative">
      <div 
        className={`
          w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
          ${isCompleted 
            ? 'bg-emerald-500 text-white' 
            : isActive 
              ? `bg-[#f59e0b] text-[#1e3a5f] ${isPulsing ? 'animate-pulse shadow-lg shadow-yellow-400/50' : ''}` 
              : 'bg-slate-200 text-slate-400'
          }
        `}
      >
        <Icon className="w-6 h-6" />
      </div>
      <p className={`mt-2 text-xs font-medium text-center ${isCompleted || isActive ? 'text-slate-800' : 'text-slate-400'}`}>
        {label}
      </p>
      {description && (isActive || isCompleted) && (
        <p className="text-xs text-slate-500 text-center mt-1">{description}</p>
      )}
    </div>
  );
};

const TimelineConnector = ({ isCompleted }) => (
  <div className={`flex-1 h-1 mx-2 mt-6 ${isCompleted ? 'bg-emerald-500' : 'bg-slate-200'}`} />
);

const AreaCliente = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState('os'); // 'os' ou 'cpf'
  const [os, setOs] = useState(null);
  const [historicoOS, setHistoricoOS] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showHistorico, setShowHistorico] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);

  // Ref para manter a OS atual acessível no WebSocket
  const osRef = useRef(null);
  
  // Atualizar ref quando os mudar
  useEffect(() => {
    osRef.current = os;
  }, [os]);

  // Conectar WebSocket para atualizações em tempo real
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    const wsUrl = API_URL.replace('https://', 'wss://').replace('http://', 'ws://');
    
    try {
      wsRef.current = new WebSocket(`${wsUrl}/ws/servicos`);
      
      wsRef.current.onopen = () => {
        setWsConnected(true);
      };
      
      wsRef.current.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          // Atualizar OS se houver mudança
          if (data.type === 'servico_concluido' || data.type === 'servico_bloqueado') {
            const currentOs = osRef.current;
            if (currentOs?.numero_fisico) {
              // Refetch OS data
              try {
                const response = await axios.get(`${API_URL}/api/consulta-os/${currentOs.numero_fisico}`);
                setOs(response.data);
              } catch (err) {
                console.error('Erro ao atualizar OS:', err);
              }
            }
          }
        } catch (e) {
          console.error('Erro ao processar mensagem WS:', e);
        }
      };
      
      wsRef.current.onclose = () => {
        setWsConnected(false);
        setTimeout(() => connectWebSocket(), 5000);
      };
      
      wsRef.current.onerror = () => {
        setWsConnected(false);
      };
    } catch (error) {
      setWsConnected(false);
    }
  }, []);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [connectWebSocket]);

  const handleSearch = async (e, termOverride, typeOverride) => {
    if (e) e.preventDefault();
    const term = termOverride || searchTerm;
    const type = typeOverride || searchType;
    
    setError('');
    setOs(null);
    setHistoricoOS([]);
    setLoading(true);

    try {
      if (type === 'os') {
        const response = await axios.get(`${API_URL}/api/consulta-os/${term}`);
        setOs(response.data);
        toast.success('Ordem de Serviço encontrada!');
      } else {
        // Buscar por CPF/CNPJ
        const response = await axios.get(`${API_URL}/api/consulta-os/cliente/${term.replace(/\D/g, '')}`);
        if (response.data.length > 0) {
          setOs(response.data[0]); // Mostrar a mais recente
          setHistoricoOS(response.data);
          toast.success(`${response.data.length} OS encontrada(s)!`);
        } else {
          setError('Nenhuma OS encontrada para este CPF/CNPJ');
        }
      }
    } catch (err) {
      const message = err.response?.data?.detail || 'Erro ao buscar Ordem de Serviço';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Calcular status da timeline baseado na OS
  const getTimelineStatus = (osData) => {
    if (!osData) return { recebido: false, desmontagem: false, retifica: false, montagem: false, enviando: false, entregue: false };
    
    const status = osData.status;
    const emRomaneio = osData.romaneio_id;
    const entregue = osData.entregue;
    
    // Verificar se há serviços em andamento (retífica)
    const servicosEmAndamento = osData.servicos?.some(s => s.status === 'em_andamento');
    const servicosConcluidos = osData.servicos?.filter(s => s.status === 'concluido').length || 0;
    const totalServicos = osData.servicos?.length || 0;
    
    return {
      recebido: true, // Sempre ativo quando a OS existe
      desmontagem: status !== 'pendente', // Ativo quando em andamento ou concluído
      retifica: status === 'andamento' || status === 'concluido',
      retificaPulsing: servicosEmAndamento,
      montagem: servicosConcluidos === totalServicos && totalServicos > 0,
      enviando: emRomaneio || status === 'enviando',
      entregue: entregue || status === 'entregue'
    };
  };

  const timeline = getTimelineStatus(os);

  // Setores técnicos para exibir
  const setoresTecnicos = ['Bloco', 'Cabeçote', 'Virabrequim', 'Bielas', 'Comando', 'Válvulas'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] via-[#2d5a8a] to-[#1e3a5f] px-4 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-[#f59e0b] rounded-lg flex items-center justify-center">
              <Wrench className="w-10 h-10 text-[#1e3a5f]" />
            </div>
          </div>
          <h1 className="font-heading font-black text-4xl text-white">Portal do Cliente</h1>
          <p className="text-yellow-300 mt-2">Acompanhe o status da sua Ordem de Serviço em tempo real</p>
          {wsConnected && (
            <p className="text-emerald-400 text-xs mt-1 flex items-center justify-center gap-1">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
              Conectado em tempo real
            </p>
          )}
        </div>

        {/* Search Box */}
        <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
          <div className="flex gap-4 mb-4">
            <button
              onClick={() => setSearchType('os')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                searchType === 'os' 
                  ? 'bg-[#1e3a5f] text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Buscar por Número da OS
            </button>
            <button
              onClick={() => setSearchType('cpf')}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                searchType === 'cpf' 
                  ? 'bg-[#1e3a5f] text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <User className="w-4 h-4 inline mr-2" />
              Buscar por CPF/CNPJ
            </button>
          </div>

          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#f97316] text-lg"
                placeholder={searchType === 'os' ? 'Digite o número da OS' : 'Digite seu CPF ou CNPJ'}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-[#f59e0b] hover:bg-[#d97706] text-[#1e3a5f] font-bold py-3 px-6 rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Search className="w-5 h-5" />
              {loading ? 'Buscando...' : 'Consultar'}
            </button>
          </form>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* OS Result */}
        {os && (
          <div className="space-y-6">
            {/* Timeline de Progresso */}
            <div className="bg-white rounded-lg shadow-xl p-6">
              <h3 className="font-heading font-bold text-xl text-slate-800 mb-6 text-center">
                Progresso da sua Ordem de Serviço
              </h3>
              <div className="flex items-start justify-between">
                <TimelineStep
                  label="Recebido"
                  icon={FileText}
                  isCompleted={timeline.recebido}
                  isActive={timeline.recebido && !timeline.desmontagem}
                  description="OS aberta"
                />
                <TimelineConnector isCompleted={timeline.desmontagem} />
                <TimelineStep
                  label="Desmontagem"
                  icon={Cog}
                  isCompleted={timeline.desmontagem && timeline.retifica}
                  isActive={timeline.desmontagem && !timeline.retifica}
                  description="Serviço iniciado"
                />
                <TimelineConnector isCompleted={timeline.retifica && timeline.montagem} />
                <TimelineStep
                  label="Retífica"
                  icon={Settings}
                  isCompleted={timeline.montagem}
                  isActive={timeline.retifica && !timeline.montagem}
                  isPulsing={timeline.retificaPulsing}
                  description="Em processo"
                />
                <TimelineConnector isCompleted={timeline.montagem && timeline.enviando} />
                <TimelineStep
                  label="Montagem"
                  icon={Wrench}
                  isCompleted={timeline.enviando}
                  isActive={timeline.montagem && !timeline.enviando}
                  description="Finalização"
                />
                <TimelineConnector isCompleted={timeline.enviando} />
                <TimelineStep
                  label="Enviando"
                  icon={Truck}
                  isCompleted={timeline.entregue}
                  isActive={timeline.enviando && !timeline.entregue}
                  description="Em rota"
                />
                <TimelineConnector isCompleted={timeline.entregue} />
                <TimelineStep
                  label="Entregue"
                  icon={MapPin}
                  isCompleted={timeline.entregue}
                  isActive={false}
                  description="Concluído"
                />
              </div>
            </div>

            {/* Card Principal da OS */}
            <div className="bg-white rounded-lg shadow-xl overflow-hidden">
              {/* Header */}
              <div className="bg-[#1e3a5f] p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 rounded-lg flex items-center justify-center">
                      <FileText className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-white font-bold text-2xl">OS #{os.numero_fisico}</h2>
                      <p className="text-slate-300">{os.cliente_nome}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${
                      os.status === 'concluido' || os.status === 'entregue' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : os.status === 'andamento' || os.status === 'enviando'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                    }`}>
                      {os.status === 'entregue' ? 'Entregue' : 
                       os.status === 'enviando' ? 'Em Trânsito' :
                       os.status === 'concluido' ? 'Pronto p/ Entrega' :
                       os.status === 'andamento' ? 'Em Processo' : 'Aguardando'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Coluna Principal */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Galeria de Fotos - Relatório Visual de Qualidade */}
                    <div className="bg-gradient-to-r from-blue-50 to-yellow-50 rounded-lg p-6 border border-slate-200">
                      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Camera className="w-5 h-5 text-[#f59e0b]" />
                        Relatório Visual de Qualidade
                      </h3>
                      {os.fotos && os.fotos.length > 0 ? (
                        <div className="grid grid-cols-2 gap-6">
                          {os.fotos.filter(f => f.tipo === 'antes').length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wide">
                                📷 Antes (Recebimento)
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                {os.fotos.filter(f => f.tipo === 'antes').map((foto, idx) => (
                                  <img 
                                    key={idx}
                                    src={foto.url} 
                                    alt={`Antes ${idx + 1}`}
                                    className="w-full h-28 object-cover rounded-lg border border-slate-200 shadow-sm"
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                          {os.fotos.filter(f => f.tipo === 'depois').length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wide">
                                ✨ Depois (Finalizado)
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                {os.fotos.filter(f => f.tipo === 'depois').map((foto, idx) => (
                                  <img 
                                    key={idx}
                                    src={foto.url} 
                                    alt={`Depois ${idx + 1}`}
                                    className="w-full h-28 object-cover rounded-lg border border-slate-200 shadow-sm"
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-32 bg-white/50 rounded-lg border border-dashed border-slate-300">
                          <div className="text-center text-slate-400">
                            <Camera className="w-8 h-8 mx-auto mb-2" />
                            <p className="text-sm">Aguardando registro fotográfico do setor técnico</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Serviços */}
                    <div>
                      <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-[#f97316]" />
                        Serviços Realizados
                      </h3>
                      <div className="bg-slate-50 rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-slate-100">
                            <tr>
                              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Setor</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Serviço</th>
                              <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                              <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Valor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {os.servicos.map((servico, index) => (
                              <tr key={index}>
                                <td className="px-4 py-3 text-sm text-slate-600">{servico.setor}</td>
                                <td className="px-4 py-3 text-sm text-slate-900">{servico.servico}</td>
                                <td className="px-4 py-3 text-sm">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                    servico.status === 'concluido' 
                                      ? 'bg-emerald-100 text-emerald-700' 
                                      : servico.status === 'em_andamento'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-slate-100 text-slate-600'
                                  }`}>
                                    {servico.status === 'concluido' ? 'Concluído' : 
                                     servico.status === 'em_andamento' ? 'Em Andamento' : 'Aguardando'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-slate-900 text-right font-mono">
                                  R$ {(servico.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Peças */}
                    {os.pecas && os.pecas.length > 0 && (
                      <div>
                        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                          <Package className="w-5 h-5 text-[#f97316]" />
                          Peças Utilizadas
                        </h3>
                        <div className="bg-slate-50 rounded-lg overflow-hidden">
                          <table className="w-full">
                            <thead className="bg-slate-100">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Peça</th>
                                <th className="px-4 py-2 text-center text-xs font-medium text-slate-500 uppercase">Qtd</th>
                                <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Total</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {os.pecas.map((peca, index) => (
                                <tr key={index}>
                                  <td className="px-4 py-3 text-sm text-slate-900">{peca.peca_nome}</td>
                                  <td className="px-4 py-3 text-sm text-slate-600 text-center">{peca.quantidade}</td>
                                  <td className="px-4 py-3 text-sm text-slate-900 text-right font-mono">
                                    R$ {(peca.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Total */}
                    <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2d5a8a] rounded-lg p-6">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold text-xl">VALOR TOTAL</span>
                        <span className="text-white font-black text-3xl font-mono">
                          R$ {(os.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Sidebar */}
                  <div className="space-y-4">
                    {/* Card do Veículo */}
                    <div className="bg-slate-50 rounded-lg p-4">
                      <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <Car className="w-4 h-4 text-[#f97316]" />
                        Veículo
                      </h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-slate-500">Tipo:</span> <span className="font-medium">{os.veiculo_tipo}</span></p>
                        <p><span className="text-slate-500">Modelo:</span> <span className="font-medium">{os.veiculo_modelo}</span></p>
                        {os.veiculo_serie && (
                          <p><span className="text-slate-500">Série:</span> <span className="font-medium">{os.veiculo_serie}</span></p>
                        )}
                        <p><span className="text-slate-500">Categoria:</span> <span className="font-medium capitalize">{os.categoria}</span></p>
                      </div>
                    </div>

                    {/* Card de Contato */}
                    {(os.cliente_telefone || os.cliente_email) && (
                      <div className="bg-slate-50 rounded-lg p-4">
                        <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                          <User className="w-4 h-4 text-[#f97316]" />
                          Seus Dados
                        </h4>
                        <div className="space-y-2 text-sm">
                          {os.cliente_documento && (
                            <p><span className="text-slate-500">{os.cliente_tipo === 'PF' ? 'CPF' : 'CNPJ'}:</span> <span className="font-medium">{os.cliente_documento}</span></p>
                          )}
                          {os.cliente_telefone && (
                            <p className="flex items-center gap-2">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span className="font-medium">{os.cliente_telefone}</span>
                            </p>
                          )}
                          {os.cliente_email && (
                            <p className="flex items-center gap-2">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span className="font-medium text-xs">{os.cliente_email}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Técnicos Responsáveis */}
                    {os.servicos.some(s => s.funcionario_nome) && (
                      <div className="bg-slate-50 rounded-lg p-4">
                        <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                          <Wrench className="w-4 h-4 text-[#f97316]" />
                          Técnicos
                        </h4>
                        <div className="space-y-2">
                          {[...new Set(os.servicos.filter(s => s.funcionario_nome).map(s => s.funcionario_nome))].map((nome, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-[#1e3a5f] rounded-full flex items-center justify-center">
                                <span className="text-white text-xs font-bold">{nome.charAt(0)}</span>
                              </div>
                              <span className="text-sm font-medium">{nome}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Datas */}
                    <div className="bg-slate-50 rounded-lg p-4">
                      <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#f97316]" />
                        Datas
                      </h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-slate-500">Abertura:</span> <span className="font-medium">{new Date(os.criado_em).toLocaleDateString('pt-BR')}</span></p>
                        {os.concluido_em && (
                          <p><span className="text-slate-500">Conclusão:</span> <span className="font-medium text-emerald-600">{new Date(os.concluido_em).toLocaleDateString('pt-BR')}</span></p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Histórico de OS (quando busca por CPF) */}
            {historicoOS.length > 1 && (
              <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                <button
                  onClick={() => setShowHistorico(!showHistorico)}
                  className="w-full p-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-[#f97316]" />
                    <span className="font-bold text-slate-800">Histórico de Ordens de Serviço ({historicoOS.length})</span>
                  </div>
                  {showHistorico ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>
                
                {showHistorico && (
                  <div className="p-4">
                    <div className="space-y-3">
                      {historicoOS.map((osItem, idx) => (
                        <div 
                          key={osItem.id}
                          onClick={() => setOs(osItem)}
                          className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                            os.id === osItem.id 
                              ? 'border-[#f97316] bg-orange-50' 
                              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-mono font-bold text-[#1e3a5f]">OS #{osItem.numero_fisico}</span>
                              <p className="text-sm text-slate-600 mt-1">{osItem.veiculo_tipo} - {osItem.veiculo_modelo}</p>
                            </div>
                            <div className="text-right">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                osItem.status === 'concluido' || osItem.status === 'entregue'
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : osItem.status === 'andamento'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-amber-100 text-amber-700'
                              }`}>
                                {osItem.status === 'entregue' ? 'Entregue' : 
                                 osItem.status === 'concluido' ? 'Concluído' :
                                 osItem.status === 'andamento' ? 'Em Andamento' : 'Pendente'}
                              </span>
                              <p className="text-xs text-slate-500 mt-1">
                                {new Date(osItem.criado_em).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Footer Links */}
        <div className="mt-8 text-center space-y-2">
          <p className="text-slate-300">
            <Link to="/login" className="text-[#f97316] hover:text-[#ea580c] font-medium">
              Fazer Login
            </Link>
            {' '}ou{' '}
            <Link to="/cadastro" className="text-[#f97316] hover:text-[#ea580c] font-medium">
              Criar Conta
            </Link>
          </p>
          <p className="text-slate-400 text-sm">
            <Link to="/" className="hover:text-white">
              ← Voltar para a página inicial
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AreaCliente;
