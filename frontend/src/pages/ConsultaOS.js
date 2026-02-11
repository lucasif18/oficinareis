import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Wrench, Search, FileText, Clock, CheckCircle, AlertCircle, Package, Settings } from 'lucide-react';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ConsultaOS = () => {
  const [numeroOS, setNumeroOS] = useState('');
  const [os, setOs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setError('');
    setOs(null);
    setLoading(true);

    try {
      const response = await axios.get(`${API_URL}/api/consulta-os/${numeroOS}`);
      setOs(response.data);
      toast.success('Ordem de Serviço encontrada!');
    } catch (err) {
      const message = err.response?.data?.detail || 'Erro ao buscar Ordem de Serviço';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      pendente: { label: 'Pendente', color: 'bg-amber-100 text-amber-700', icon: Clock },
      andamento: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-700', icon: Settings },
      concluido: { label: 'Concluído', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle }
    };
    return statusMap[status] || statusMap.pendente;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] via-[#2d5a8a] to-[#1e3a5f] px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-[#f97316] rounded-lg flex items-center justify-center">
              <Wrench className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="font-heading font-black text-4xl text-white">Oficina Reis</h1>
          <p className="text-slate-300 mt-2">Consulte o status da sua Ordem de Serviço</p>
        </div>

        {/* Search Box */}
        <div className="bg-white rounded-lg shadow-xl p-6 mb-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Número da Ordem de Serviço
              </label>
              <input
                type="text"
                value={numeroOS}
                onChange={(e) => setNumeroOS(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#f97316] text-lg"
                placeholder="Digite o número da OS"
                required
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-[#f97316] hover:bg-[#ea580c] text-white font-medium py-3 px-6 rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Search className="w-5 h-5" />
                {loading ? 'Buscando...' : 'Consultar'}
              </button>
            </div>
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
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-[#1e3a5f] p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-2xl">OS #{os.numero_fisico}</h2>
                    <p className="text-slate-300">{os.cliente_nome}</p>
                  </div>
                </div>
                <div>
                  {(() => {
                    const statusInfo = getStatusInfo(os.status);
                    const StatusIcon = statusInfo.icon;
                    return (
                      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${statusInfo.color}`}>
                        <StatusIcon className="w-4 h-4" />
                        {statusInfo.label}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Veículo */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="font-bold text-slate-800 mb-2">Veículo</h3>
                <p className="text-slate-600">{os.veiculo_tipo} - {os.veiculo_modelo}</p>
              </div>

              {/* Serviços */}
              <div>
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-[#f97316]" />
                  Serviços
                </h3>
                <div className="bg-slate-50 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Setor</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Serviço</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {os.servicos.map((servico, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 text-sm text-slate-600">{servico.setor}</td>
                          <td className="px-4 py-3 text-sm text-slate-900">{servico.servico}</td>
                          <td className="px-4 py-3 text-sm text-slate-900 text-right font-mono">
                            R$ {servico.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Peças */}
              {os.pecas.length > 0 && (
                <div>
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Package className="w-5 h-5 text-[#f97316]" />
                    Peças
                  </h3>
                  <div className="bg-slate-50 rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Peça</th>
                          <th className="px-4 py-2 text-center text-xs font-medium text-slate-500 uppercase">Qtd</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Valor Unit.</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {os.pecas.map((peca, index) => (
                          <tr key={index}>
                            <td className="px-4 py-3 text-sm text-slate-900">{peca.peca_nome}</td>
                            <td className="px-4 py-3 text-sm text-slate-600 text-center">{peca.quantidade}</td>
                            <td className="px-4 py-3 text-sm text-slate-900 text-right font-mono">
                              R$ {peca.valor_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-900 text-right font-mono">
                              R$ {peca.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="bg-[#1e3a5f] rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold text-xl">VALOR TOTAL</span>
                  <span className="text-white font-black text-3xl font-mono">
                    R$ {os.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-slate-500 mb-1">Data de Criação</p>
                  <p className="font-medium text-slate-800">
                    {os.criado_em ? new Date(os.criado_em).toLocaleDateString('pt-BR') : '-'}
                  </p>
                </div>
                {os.concluido_em && (
                  <div className="bg-emerald-50 rounded-lg p-4">
                    <p className="text-emerald-600 mb-1">Data de Conclusão</p>
                    <p className="font-medium text-emerald-800">
                      {new Date(os.concluido_em).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}
              </div>
            </div>
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
        </div>
      </div>
    </div>
  );
};

export default ConsultaOS;
