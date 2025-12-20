import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ViewRomaneio = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [romaneio, setRomaneio] = useState(null);
  const [osDetalhes, setOsDetalhes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRomaneio();
  }, [id]);

  const fetchRomaneio = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/romaneios/${id}`);
      setRomaneio(response.data);
      
      // Buscar detalhes de cada OS
      const osPromises = response.data.os_ids.map(osId => 
        axios.get(`${API_URL}/api/ordens-servico/${osId}`)
      );
      const osResponses = await Promise.all(osPromises);
      setOsDetalhes(osResponses.map(r => r.data));
    } catch (error) {
      console.error('Erro ao buscar romaneio:', error);
      toast.error('Erro ao carregar romaneio');
      navigate('/romaneio');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/romaneios/${id}/pdf`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Romaneio-${romaneio.numero}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('PDF baixado com sucesso!');
    } catch (error) {
      toast.error('Erro ao baixar PDF');
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
      <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${styles[status]}`}>
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

  if (!romaneio) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={() => navigate('/romaneio')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900"
          data-testid="back-button"
        >
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </button>
        <div className="flex gap-2">
          <Button
            onClick={handlePrint}
            variant="outline"
            data-testid="print-button"
          >
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
          <Button
            onClick={handleDownloadPDF}
            className="bg-[#f97316] hover:bg-[#ea580c]"
            data-testid="download-pdf-button"
          >
            <Download className="w-4 h-4 mr-2" />
            Baixar PDF
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8">
        <div className="mb-8 border-b border-slate-200 pb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-heading font-black text-3xl text-[#1e3a5f]">Oficina Reis</h1>
              <p className="text-slate-600 text-sm mt-1">Retificação de Motores</p>
            </div>
            <div className="text-right">
              <div className="font-mono text-2xl font-bold text-slate-900 mb-2">Romaneio #{romaneio.numero}</div>
              {getStatusBadge(romaneio.status)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="font-heading font-bold text-lg text-slate-800 mb-3">Motorista</h2>
            <p className="font-medium text-slate-900">{romaneio.motorista_nome}</p>
          </div>
          <div>
            <h2 className="font-heading font-bold text-lg text-slate-800 mb-3">Data de Entrega</h2>
            <p className="text-slate-600">
              {new Date(romaneio.data_entrega).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="font-heading font-bold text-lg text-slate-800 mb-4">Ordens de Serviço para Entrega</h2>
          <div className="space-y-4">
            {osDetalhes.map((os, idx) => (
              <div key={idx} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-mono text-lg font-bold text-[#1e3a5f]">OS #{os.numero_fisico}</div>
                    <div className="text-sm text-slate-600 mt-1">
                      Cliente: <span className="font-medium text-slate-900">{os.cliente_nome}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-slate-900">
                      R$ {os.valor_total.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Veículo:</span>
                    <p className="font-medium text-slate-900">{os.veiculo_tipo} - {os.veiculo_modelo}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Categoria:</span>
                    <p className="font-medium text-slate-900 capitalize">{os.categoria}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <div className="flex justify-between items-center">
            <div className="text-slate-600">
              <p className="font-medium">Total de OS: {osDetalhes.length}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-500 mb-1">Valor Total das Entregas</div>
              <div className="text-2xl font-bold font-mono text-[#1e3a5f]">
                R$ {osDetalhes.reduce((sum, os) => sum + os.valor_total, 0).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <p className="text-sm text-slate-500 mb-4">Assinatura do Motorista</p>
              <div className="border-b-2 border-slate-300"></div>
            </div>
            <div>
              <p className="text-sm text-slate-500 mb-4">Assinatura do Recebedor</p>
              <div className="border-b-2 border-slate-300"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewRomaneio;
