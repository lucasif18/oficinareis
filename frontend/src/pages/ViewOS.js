import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Printer, Download, Camera, Trash2, Image, MessageCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ViewOS = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [os, setOs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTipo, setUploadTipo] = useState('antes');
  const [uploading, setUploading] = useState(false);
  const [whatsappLink, setWhatsappLink] = useState('');
  const fileInputRef = useRef(null);

  const isAdmin = user?.role === 'admin';
  const isFuncionario = user?.role === 'funcionario';
  const canUploadPhotos = isAdmin || isFuncionario;

  useEffect(() => {
    fetchOS();
  }, [id]);

  const fetchOS = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/ordens-servico/${id}`);
      setOs(response.data);
      // Buscar link do WhatsApp
      fetchWhatsAppLink();
    } catch (error) {
      console.error('Erro ao buscar OS:', error);
      toast.error('Erro ao carregar ordem de serviço');
      navigate('/ordens-servico');
    } finally {
      setLoading(false);
    }
  };

  const fetchWhatsAppLink = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/ordens-servico/${id}/whatsapp-link`);
      setWhatsappLink(response.data.whatsapp_link);
    } catch (error) {
      console.error('Erro ao buscar link WhatsApp:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/ordens-servico/${id}/pdf`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `OS-${os.numero_fisico}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('PDF baixado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar PDF');
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Verificar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione apenas arquivos de imagem');
      return;
    }

    // Converter para base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      setUploading(true);
      try {
        await axios.post(`${API_URL}/api/ordens-servico/${id}/fotos`, {
          tipo: uploadTipo,
          imagem_base64: reader.result
        });
        toast.success('Foto adicionada com sucesso!');
        setShowUploadModal(false);
        fetchOS();
      } catch (error) {
        toast.error('Erro ao fazer upload da foto');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteFoto = async (fotoId) => {
    if (!window.confirm('Deseja realmente excluir esta foto?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/ordens-servico/${id}/fotos/${fotoId}`);
      toast.success('Foto removida com sucesso!');
      fetchOS();
    } catch (error) {
      toast.error('Erro ao remover foto');
    }
  };

  const handleWhatsApp = () => {
    if (whatsappLink) {
      window.open(whatsappLink, '_blank');
    } else {
      toast.error('Link do WhatsApp não disponível');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f59e0b]"></div>
      </div>
    );
  }

  if (!os) return null;

  const getStatusBadge = (status) => {
    const styles = {
      pendente: 'bg-amber-100 text-amber-700',
      andamento: 'bg-blue-100 text-blue-700',
      concluido: 'bg-emerald-100 text-emerald-700',
      enviando: 'bg-purple-100 text-purple-700',
      entregue: 'bg-slate-100 text-slate-700'
    };
    const labels = {
      pendente: 'Pendente',
      andamento: 'Em Andamento',
      concluido: 'Concluído',
      enviando: 'Em Trânsito',
      entregue: 'Entregue'
    };
    return (
      <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const fotosAntes = os.fotos?.filter(f => f.tipo === 'antes') || [];
  const fotosDepois = os.fotos?.filter(f => f.tipo === 'depois') || [];

  return (
    <div className="space-y-6" data-testid="view-os-page">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/ordens-servico')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-slate-600" />
          </button>
          <div>
            <h1 className="font-heading font-black text-2xl text-slate-900">
              Ordem de Serviço #{os.numero_fisico}
            </h1>
            <div className="mt-1">{getStatusBadge(os.status)}</div>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Botão WhatsApp */}
          {os.cliente_telefone && (
            <Button
              onClick={handleWhatsApp}
              className="bg-emerald-500 hover:bg-emerald-600"
              data-testid="whatsapp-button"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
          )}
          {/* Botão Upload de Fotos (apenas ADM) */}
          {isAdmin && (
            <Button
              onClick={() => setShowUploadModal(true)}
              variant="outline"
              className="border-[#f59e0b] text-[#f59e0b] hover:bg-[#f59e0b] hover:text-white"
              data-testid="upload-foto-button"
            >
              <Camera className="w-4 h-4 mr-2" />
              Adicionar Foto
            </Button>
          )}
          <Button onClick={handlePrint} variant="outline">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
          <Button onClick={handleDownloadPDF} className="bg-[#1e3a5f] hover:bg-[#152a47]">
            <Download className="w-4 h-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8">
        <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#f59e0b] rounded-lg flex items-center justify-center">
              <span className="font-heading font-black text-xl text-[#1e3a5f]">OR</span>
            </div>
            <div>
              <h2 className="font-heading font-black text-2xl text-[#1e3a5f]">Oficina Reis</h2>
              <p className="text-sm text-slate-500">Retificação de Motores</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-heading font-black text-3xl text-[#1e3a5f]">#{os.numero_fisico}</p>
            <p className="text-sm text-slate-500">{new Date(os.criado_em).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="font-heading font-bold text-lg text-slate-800 mb-3">Cliente</h2>
            <div className="space-y-1 text-sm">
              <p className="font-medium text-slate-900">{os.cliente_nome}</p>
              {os.cliente_documento && (
                <p className="text-slate-600">
                  {os.cliente_tipo === 'pf' ? 'CPF' : 'CNPJ'}: {os.cliente_documento}
                </p>
              )}
              {os.cliente_telefone && (
                <p className="text-slate-600">Tel: {os.cliente_telefone}</p>
              )}
              {os.cliente_email && (
                <p className="text-slate-600">{os.cliente_email}</p>
              )}
            </div>
          </div>
          <div>
            <h2 className="font-heading font-bold text-lg text-slate-800 mb-3">Data</h2>
            <div className="space-y-1 text-sm">
              <p className="text-slate-600">
                Criado em: {new Date(os.criado_em).toLocaleDateString('pt-BR')}
              </p>
              {os.concluido_em && (
                <p className="text-slate-600">
                  Concluído em: {new Date(os.concluido_em).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Galeria de Fotos */}
        {(fotosAntes.length > 0 || fotosDepois.length > 0 || isAdmin) && (
          <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-yellow-50 rounded-lg border border-slate-200">
            <h2 className="font-heading font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
              <Image className="w-5 h-5 text-[#f59e0b]" />
              Relatório Visual de Qualidade
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Fotos Antes */}
              <div>
                <h3 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wide">
                  📷 Antes (Recebimento)
                </h3>
                {fotosAntes.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {fotosAntes.map((foto) => (
                      <div key={foto.id} className="relative group">
                        <img
                          src={foto.url}
                          alt="Antes"
                          className="w-full h-32 object-cover rounded-lg border border-slate-200"
                        />
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteFoto(foto.id)}
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-32 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-sm">
                    <Camera className="w-6 h-6 mr-2" />
                    Aguardando registro fotográfico
                  </div>
                )}
              </div>
              
              {/* Fotos Depois */}
              <div>
                <h3 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wide">
                  ✨ Depois (Finalizado)
                </h3>
                {fotosDepois.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {fotosDepois.map((foto) => (
                      <div key={foto.id} className="relative group">
                        <img
                          src={foto.url}
                          alt="Depois"
                          className="w-full h-32 object-cover rounded-lg border border-slate-200"
                        />
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteFoto(foto.id)}
                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-32 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-sm">
                    <Camera className="w-6 h-6 mr-2" />
                    Aguardando registro fotográfico
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h2 className="font-heading font-bold text-lg text-slate-800 mb-3">Veículo</h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Tipo</p>
              <p className="font-medium text-slate-900">{os.veiculo_tipo}</p>
            </div>
            <div>
              <p className="text-slate-500">Modelo</p>
              <p className="font-medium text-slate-900">{os.veiculo_modelo}</p>
            </div>
            <div>
              <p className="text-slate-500">Categoria</p>
              <p className="font-medium text-slate-900 capitalize">{os.categoria}</p>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="font-heading font-bold text-lg text-slate-800 mb-3">Serviços</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Setor</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Serviço</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {os.servicos.map((servico, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2 text-sm text-slate-600">{servico.setor}</td>
                    <td className="px-4 py-2 text-sm text-slate-900">{servico.servico}</td>
                    <td className="px-4 py-2 text-sm text-slate-900 text-right font-mono">
                      {servico.valor !== null ? `R$ ${servico.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {os.pecas.length > 0 && (
          <div className="mb-8">
            <h2 className="font-heading font-bold text-lg text-slate-800 mb-3">Peças</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Peça</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-slate-500 uppercase">Qtd</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Unit.</th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {os.pecas.map((peca, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm text-slate-900">{peca.peca_nome}</td>
                      <td className="px-4 py-2 text-sm text-slate-600 text-center">{peca.quantidade}</td>
                      <td className="px-4 py-2 text-sm text-slate-900 text-right font-mono">
                        {peca.valor_unitario !== null ? `R$ ${peca.valor_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-slate-900 text-right font-mono">
                        {peca.valor_total !== null ? `R$ ${peca.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="border-t border-slate-200 pt-6">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Serviços:</span>
                <span className="font-mono">
                  {os.valor_servicos !== null ? `R$ ${os.valor_servicos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Peças:</span>
                <span className="font-mono">
                  {os.valor_pecas !== null ? `R$ ${os.valor_pecas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                </span>
              </div>
              {os.valor_desconto > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Desconto:</span>
                  <span className="font-mono">- R$ {os.valor_desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-200">
                <span>Total:</span>
                <span className="font-mono text-[#1e3a5f]">
                  {os.valor_total !== null ? `R$ ${os.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Upload de Foto */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-md" data-testid="upload-foto-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#f59e0b]" />
              Adicionar Foto
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tipo de Foto
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setUploadTipo('antes')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    uploadTipo === 'antes' 
                      ? 'border-[#f59e0b] bg-yellow-50' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="font-medium text-slate-800">📷 Antes</p>
                  <p className="text-xs text-slate-500">Peça bruta/recebimento</p>
                </button>
                <button
                  onClick={() => setUploadTipo('depois')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    uploadTipo === 'depois' 
                      ? 'border-[#f59e0b] bg-yellow-50' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="font-medium text-slate-800">✨ Depois</p>
                  <p className="text-xs text-slate-500">Peça retificada</p>
                </button>
              </div>
            </div>

            <div>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full p-6 border-2 border-dashed border-slate-300 rounded-lg hover:border-[#f59e0b] transition-colors flex flex-col items-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f59e0b]"></div>
                    <span className="text-sm text-slate-500">Enviando...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-10 h-10 text-slate-400" />
                    <span className="text-sm font-medium text-slate-600">Clique para tirar foto ou selecionar</span>
                    <span className="text-xs text-slate-400">Suporta JPG, PNG até 10MB</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ViewOS;
