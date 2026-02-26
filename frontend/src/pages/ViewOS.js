import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Printer, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ViewOS = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [os, setOs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOS();
  }, [id]);

  const fetchOS = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/ordens-servico/${id}`);
      setOs(response.data);
    } catch (error) {
      console.error('Erro ao buscar OS:', error);
      toast.error('Erro ao carregar ordem de serviço');
      navigate('/ordens-servico');
    } finally {
      setLoading(false);
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
      toast.error('Erro ao baixar PDF');
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

  if (!os) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={() => navigate('/ordens-servico')}
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

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8" id="printable-area">
        <div className="mb-8 border-b border-slate-200 pb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-heading font-black text-3xl text-[#1e3a5f]">Oficina Reis</h1>
              <p className="text-slate-600 text-sm mt-1">Retificação de Motores</p>
            </div>
            <div className="text-right">
              <div className="font-mono text-2xl font-bold text-slate-900 mb-2">OS #{os.numero_fisico}</div>
              {getStatusBadge(os.status)}
            </div>
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

        <div className="mb-8">
          <h2 className="font-heading font-bold text-lg text-slate-800 mb-3">Veículo</h2>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Tipo:</span>
              <p className="font-medium text-slate-900">{os.veiculo_tipo}</p>
            </div>
            <div>
              <span className="text-slate-500">Modelo:</span>
              <p className="font-medium text-slate-900">{os.veiculo_modelo}</p>
            </div>
            <div>
              <span className="text-slate-500">Série/Potência:</span>
              <p className="font-medium text-slate-900">{os.veiculo_serie || '-'}</p>
            </div>
            <div>
              <span className="text-slate-500">Categoria:</span>
              <p className="font-medium text-slate-900 capitalize">{os.categoria}</p>
            </div>
          </div>
        </div>

        {os.servicos && os.servicos.length > 0 && (
          <div className="mb-8">
            <h2 className="font-heading font-bold text-lg text-slate-800 mb-3">Serviços</h2>
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Setor</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Serviço</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Funcionário</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {os.servicos.map((servico, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 text-slate-600">{servico.setor}</td>
                    <td className="px-4 py-3 text-slate-900">{servico.servico}</td>
                    <td className="px-4 py-3 text-slate-600">{servico.funcionario_nome || '-'}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-slate-900">
                      R$ {servico.valor.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {os.pecas && os.pecas.length > 0 && (
          <div className="mb-8">
            <h2 className="font-heading font-bold text-lg text-slate-800 mb-3">Peças Utilizadas</h2>
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-600">Peça</th>
                  <th className="px-4 py-2 text-center font-medium text-slate-600">Quantidade</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">Valor Unit.</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-600">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {os.pecas.map((peca, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 text-slate-900">{peca.peca_nome}</td>
                    <td className="px-4 py-3 text-center font-mono text-slate-600">{peca.quantidade}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">
                      R$ {peca.valor_unitario.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-slate-900">
                      R$ {peca.valor_total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-slate-200 pt-6">
          <div className="space-y-2 text-right">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Subtotal Serviços:</span>
              <span className="font-mono font-medium text-slate-900">R$ {os.valor_servicos.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Subtotal Peças:</span>
              <span className="font-mono font-medium text-slate-900">R$ {os.valor_pecas.toFixed(2)}</span>
            </div>
            {os.valor_desconto > 0 && (
              <div className="flex justify-between text-sm text-amber-700">
                <span>Desconto:</span>
                <span className="font-mono font-medium">- R$ {os.valor_desconto.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold border-t border-slate-200 pt-3 mt-3">
              <span className="text-slate-900">TOTAL:</span>
              <span className="font-mono text-[#1e3a5f]">R$ {os.valor_total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewOS;
