import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Eye, FileText, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Orcamentos = () => {
  const [orcamentos, setOrcamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [selectedOrcamento, setSelectedOrcamento] = useState(null);
  const [convertData, setConvertData] = useState({
    numero_fisico: '',
    veiculo_serie: '',
    categoria: 'leve'
  });

  useEffect(() => {
    fetchOrcamentos();
  }, []);

  const fetchOrcamentos = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/orcamentos`);
      setOrcamentos(response.data);
    } catch (error) {
      console.error('Erro ao buscar orçamentos:', error);
      toast.error('Erro ao carregar orçamentos');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pendente: 'bg-amber-100 text-amber-700',
      aprovado: 'bg-emerald-100 text-emerald-700',
      rejeitado: 'bg-red-100 text-red-700'
    };
    const labels = {
      pendente: 'Pendente',
      aprovado: 'Aprovado',
      rejeitado: 'Rejeitado'
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.put(`${API_URL}/api/orcamentos/${id}/status?status=${newStatus}`);
      toast.success('Status atualizado com sucesso!');
      fetchOrcamentos();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const openConvertModal = (orcamento) => {
    setSelectedOrcamento(orcamento);
    setConvertData({
      numero_fisico: `OS-${Date.now()}`,
      veiculo_serie: orcamento.veiculo_serie || '',
      categoria: 'leve'
    });
    setShowConvertModal(true);
  };

  const handleConvertToOS = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${API_URL}/api/orcamentos/${selectedOrcamento.id}/converter-os`,
        null,
        {
          params: convertData
        }
      );
      toast.success('Orçamento convertido para OS com sucesso!');
      setShowConvertModal(false);
      fetchOrcamentos();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao converter orçamento');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-black text-4xl text-slate-900" data-testid="orcamentos-title">Orçamentos</h1>
          <p className="text-slate-600 mt-2">Gerencie seus orçamentos</p>
        </div>
        <Link to="/orcamentos/novo">
          <Button className="bg-[#f97316] hover:bg-[#ea580c]" data-testid="novo-orcamento-button">
            <Plus className="w-4 h-4 mr-2" />
            Novo Orçamento
          </Button>
        </Link>
      </div>

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
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Número</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Veículo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Valor Total</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orcamentos.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                      Nenhum orçamento encontrado
                    </td>
                  </tr>
                ) : (
                  orcamentos.map((orc) => (
                    <tr key={orc.id} className="hover:bg-slate-50 transition-colors" data-testid={`orcamento-row-${orc.numero}`}>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-bold text-[#1e3a5f]">#{orc.numero}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-slate-900">{orc.cliente_nome}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-700">
                          <div className="font-medium">{orc.veiculo_tipo}</div>
                          <div className="text-xs text-slate-500">{orc.veiculo_modelo}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(orc.status)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono text-sm font-bold text-slate-900">
                          R$ {orc.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/orcamentos/${orc.id}`}>
                            <button
                              className="px-3 py-1 text-xs font-medium bg-slate-100 text-slate-700 rounded-md hover:bg-slate-200 transition-colors flex items-center gap-1"
                              data-testid={`view-orc-${orc.id}`}
                            >
                              <Eye className="w-3 h-3" />
                              Visualizar
                            </button>
                          </Link>
                          {orc.status === 'pendente' && (
                            <>
                              <button
                                onClick={() => updateStatus(orc.id, 'aprovado')}
                                className="px-3 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200 transition-colors"
                                data-testid={`approve-orc-${orc.id}`}
                              >
                                Aprovar
                              </button>
                              <button
                                onClick={() => updateStatus(orc.id, 'rejeitado')}
                                className="px-3 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                                data-testid={`reject-orc-${orc.id}`}
                              >
                                Rejeitar
                              </button>
                            </>
                          )}
                          {orc.status === 'aprovado' && !orc.convertido_os_id && (
                            <button
                              onClick={() => openConvertModal(orc)}
                              className="px-3 py-1 text-xs font-medium bg-[#f97316] text-white rounded-md hover:bg-[#ea580c] transition-colors flex items-center gap-1"
                              data-testid={`convert-orc-${orc.id}`}
                            >
                              <ArrowRight className="w-3 h-3" />
                              Converter para OS
                            </button>
                          )}
                          {orc.convertido_os_id && (
                            <span className="text-xs text-slate-500">Convertido</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={showConvertModal} onOpenChange={setShowConvertModal}>
        <DialogContent data-testid="convert-modal">
          <DialogHeader>
            <DialogTitle>Converter Orçamento para OS</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleConvertToOS} className="space-y-4">
            <div>
              <Label htmlFor="numero_fisico">Número da OS *</Label>
              <Input
                id="numero_fisico"
                value={convertData.numero_fisico}
                onChange={(e) => setConvertData({ ...convertData, numero_fisico: e.target.value })}
                data-testid="convert-numero"
                required
              />
            </div>

            <div>
              <Label htmlFor="veiculo_serie">Série/Potência do Veículo</Label>
              <Input
                id="veiculo_serie"
                value={convertData.veiculo_serie}
                onChange={(e) => setConvertData({ ...convertData, veiculo_serie: e.target.value })}
                data-testid="convert-serie"
              />
            </div>

            <div>
              <Label>Categoria *</Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="leve"
                    checked={convertData.categoria === 'leve'}
                    onChange={(e) => setConvertData({ ...convertData, categoria: e.target.value })}
                    className="text-[#f97316] focus:ring-[#f97316]"
                  />
                  <span className="text-sm">Leve</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="pesada"
                    checked={convertData.categoria === 'pesada'}
                    onChange={(e) => setConvertData({ ...convertData, categoria: e.target.value })}
                    className="text-[#f97316] focus:ring-[#f97316]"
                  />
                  <span className="text-sm">Pesada</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowConvertModal(false)}
                data-testid="cancel-convert"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#f97316] hover:bg-[#ea580c]"
                data-testid="confirm-convert"
              >
                Converter
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orcamentos;
