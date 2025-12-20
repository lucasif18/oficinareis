import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Check, X, Calendar, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ContasPagar = () => {
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    data_vencimento: '',
    categoria: 'Fornecedores',
    observacoes: ''
  });

  const categorias = [
    'Fornecedores',
    'Funcionários',
    'Impostos',
    'Aluguel',
    'Energia',
    'Água',
    'Internet',
    'Manutenção',
    'Materiais',
    'Outras'
  ];

  useEffect(() => {
    fetchContas();
  }, [filterStatus]);

  const fetchContas = async () => {
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      
      const response = await axios.get(`${API_URL}/api/financeiro/contas-pagar`, { params });
      setContas(response.data);
    } catch (error) {
      console.error('Erro ao buscar contas:', error);
      toast.error('Erro ao carregar contas a pagar');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        valor: parseFloat(formData.valor),
        data_vencimento: new Date(formData.data_vencimento + 'T12:00:00').toISOString()
      };

      await axios.post(`${API_URL}/api/financeiro/contas-pagar`, submitData);
      toast.success('Conta cadastrada com sucesso!');
      setShowModal(false);
      resetForm();
      fetchContas();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao cadastrar conta');
    }
  };

  const marcarComoPago = async (id) => {
    if (!window.confirm('Marcar esta conta como paga?')) return;
    try {
      await axios.put(`${API_URL}/api/financeiro/contas-pagar/${id}/pagar`);
      toast.success('Conta marcada como paga!');
      fetchContas();
    } catch (error) {
      toast.error('Erro ao atualizar conta');
    }
  };

  const deletarConta = async (id) => {
    if (!window.confirm('Deseja realmente excluir esta conta?')) return;
    try {
      await axios.delete(`${API_URL}/api/financeiro/contas-pagar/${id}`);
      toast.success('Conta excluída com sucesso!');
      fetchContas();
    } catch (error) {
      toast.error('Erro ao excluir conta');
    }
  };

  const resetForm = () => {
    setFormData({
      descricao: '',
      valor: '',
      data_vencimento: '',
      categoria: 'Fornecedores',
      observacoes: ''
    });
  };

  const getStatusBadge = (status) => {
    return status === 'pago' ? (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700">
        Pago
      </span>
    ) : (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700">
        Pendente
      </span>
    );
  };

  const totalPendente = contas.filter(c => c.status === 'pendente').reduce((sum, c) => sum + c.valor, 0);
  const totalPago = contas.filter(c => c.status === 'pago').reduce((sum, c) => sum + c.valor, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-black text-4xl text-slate-900" data-testid="contas-pagar-title">Contas a Pagar</h1>
          <p className="text-slate-600 mt-2">Gerencie suas despesas</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-[#f97316] hover:bg-[#ea580c]"
          data-testid="add-conta-button"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Conta
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-red-50 rounded-lg border border-red-200 p-6">
          <p className="text-sm text-red-600 font-medium mb-2">Pendente</p>
          <p className="font-heading font-black text-3xl text-red-700">
            R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-6">
          <p className="text-sm text-emerald-600 font-medium mb-2">Pago</p>
          <p className="font-heading font-black text-3xl text-emerald-700">
            R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <p className="text-sm text-blue-600 font-medium mb-2">Total</p>
          <p className="font-heading font-black text-3xl text-blue-700">
            R$ {(totalPendente + totalPago).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <div className="flex gap-4">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#f97316]"
            data-testid="filter-status"
          >
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
          </select>
        </div>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Descrição</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Categoria</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Vencimento</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Valor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contas.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                      Nenhuma conta a pagar encontrada
                    </td>
                  </tr>
                ) : (
                  contas.map((conta) => (
                    <tr key={conta.id} className="hover:bg-slate-50 transition-colors" data-testid={`conta-row-${conta.id}`}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{conta.descricao}</p>
                          {conta.observacoes && (
                            <p className="text-xs text-slate-500 mt-1">{conta.observacoes}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">{conta.categoria}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Calendar className="w-4 h-4" />
                          {new Date(conta.data_vencimento).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono text-sm font-bold text-slate-900">
                          R$ {conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(conta.status)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {conta.status === 'pendente' && (
                            <button
                              onClick={() => marcarComoPago(conta.id)}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                              data-testid={`pagar-conta-${conta.id}`}
                              title="Marcar como pago"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => deletarConta(conta.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            data-testid={`delete-conta-${conta.id}`}
                            title="Excluir"
                          >
                            <X className="w-4 h-4" />
                          </button>
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

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl" data-testid="conta-modal">
          <DialogHeader>
            <DialogTitle>Nova Conta a Pagar</DialogTitle>
            <DialogDescription>
              Preencha os dados para cadastrar uma nova conta a pagar
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="descricao">Descrição *</Label>
              <Input
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Ex: Fornecedor de peças"
                data-testid="conta-descricao"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="valor">Valor (R$) *</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                  data-testid="conta-valor"
                  required
                />
              </div>
              <div>
                <Label htmlFor="data_vencimento">Data de Vencimento *</Label>
                <Input
                  id="data_vencimento"
                  type="date"
                  value={formData.data_vencimento}
                  onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                  data-testid="conta-vencimento"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="categoria">Categoria *</Label>
              <select
                id="categoria"
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#f97316]"
                data-testid="conta-categoria"
                required
              >
                {categorias.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#f97316]"
                rows="3"
                data-testid="conta-observacoes"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
                data-testid="cancel-button"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#f97316] hover:bg-[#ea580c]"
                data-testid="save-conta-button"
              >
                Cadastrar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContasPagar;
