import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Check, X, Calendar, FileText, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ContasReceber = () => {
  const [contas, setContas] = useState([]);
  const [osDisponiveis, setOsDisponiveis] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showOsModal, setShowOsModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    data_vencimento: '',
    cliente_id: '',
    observacoes: ''
  });

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  const fetchData = async () => {
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      
      const [contasRes, osRes, clientesRes] = await Promise.all([
        axios.get(`${API_URL}/api/financeiro/contas-receber`, { params }),
        axios.get(`${API_URL}/api/ordens-servico`),
        axios.get(`${API_URL}/api/clientes`)
      ]);
      
      setContas(contasRes.data);
      // Filtrar apenas OS concluídas que ainda não foram adicionadas como contas a receber
      const osConcluidasIds = contasRes.data
        .filter(c => c.os_id)
        .map(c => c.os_id);
      const osConcluidas = osRes.data.filter(
        os => os.status === 'concluido' && !osConcluidasIds.includes(os.id)
      );
      setOsDisponiveis(osConcluidas);
      setClientes(clientesRes.data);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados');
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

      await axios.post(`${API_URL}/api/financeiro/contas-receber`, submitData);
      toast.success('Conta a receber cadastrada com sucesso!');
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao cadastrar conta');
    }
  };

  const adicionarOsComoContaReceber = async (os) => {
    try {
      const hoje = new Date();
      const vencimento = new Date(hoje.setDate(hoje.getDate() + 30));
      
      const submitData = {
        descricao: `OS #${os.numero_fisico} - ${os.cliente_nome}`,
        valor: os.valor_total,
        data_vencimento: vencimento.toISOString(),
        cliente_id: os.cliente_id,
        os_id: os.id,
        observacoes: `Veículo: ${os.veiculo_tipo} - ${os.veiculo_modelo}`
      };

      await axios.post(`${API_URL}/api/financeiro/contas-receber`, submitData);
      toast.success('OS adicionada como conta a receber!');
      setShowOsModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao adicionar conta');
    }
  };

  const marcarComoRecebido = async (id) => {
    if (!window.confirm('Marcar esta conta como recebida?')) return;
    try {
      await axios.put(`${API_URL}/api/financeiro/contas-receber/${id}/receber`);
      toast.success('Conta marcada como recebida!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao atualizar conta');
    }
  };

  const deletarConta = async (id) => {
    if (!window.confirm('Deseja realmente excluir esta conta?')) return;
    try {
      await axios.delete(`${API_URL}/api/financeiro/contas-receber/${id}`);
      toast.success('Conta excluída com sucesso!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao excluir conta');
    }
  };

  const resetForm = () => {
    setFormData({
      descricao: '',
      valor: '',
      data_vencimento: '',
      cliente_id: '',
      observacoes: ''
    });
  };

  const getStatusBadge = (status) => {
    return status === 'recebido' ? (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700">
        Recebido
      </span>
    ) : (
      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700">
        Pendente
      </span>
    );
  };

  const totalPendente = contas.filter(c => c.status === 'pendente').reduce((sum, c) => sum + c.valor, 0);
  const totalRecebido = contas.filter(c => c.status === 'recebido').reduce((sum, c) => sum + c.valor, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-black text-4xl text-slate-900" data-testid="contas-receber-title">Contas a Receber</h1>
          <p className="text-slate-600 mt-2">Controle seus recebimentos e cobranças</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowOsModal(true)}
            variant="outline"
            className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white"
            data-testid="add-os-button"
          >
            <FileText className="w-4 h-4 mr-2" />
            Importar OS
          </Button>
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-amber-50 rounded-lg border border-amber-200 p-6">
          <p className="text-sm text-amber-600 font-medium mb-2">Pendente</p>
          <p className="font-heading font-black text-3xl text-amber-700">
            R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-6">
          <p className="text-sm text-emerald-600 font-medium mb-2">Recebido</p>
          <p className="font-heading font-black text-3xl text-emerald-700">
            R$ {totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <p className="text-sm text-blue-600 font-medium mb-2">Total</p>
          <p className="font-heading font-black text-3xl text-blue-700">
            R$ {(totalPendente + totalRecebido).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {osDisponiveis.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600" />
          <p className="text-orange-800">
            <strong>{osDisponiveis.length}</strong> OS concluída(s) disponível(is) para cobrança.
            <button 
              onClick={() => setShowOsModal(true)}
              className="ml-2 underline text-orange-700 hover:text-orange-900"
            >
              Clique aqui para adicionar
            </button>
          </p>
        </div>
      )}

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
            <option value="recebido">Recebido</option>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cliente</th>
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
                      Nenhuma conta a receber encontrada
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
                          {conta.os_id && (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-blue-100 text-blue-700 mt-1">
                              <FileText className="w-3 h-3 mr-1" />
                              Vinculada a OS
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">{conta.cliente_nome || '-'}</span>
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
                              onClick={() => marcarComoRecebido(conta.id)}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                              data-testid={`receber-conta-${conta.id}`}
                              title="Marcar como recebido"
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

      {/* Modal Nova Conta */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl" data-testid="conta-modal">
          <DialogHeader>
            <DialogTitle>Nova Conta a Receber</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="descricao">Descrição *</Label>
              <Input
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Ex: Pagamento de serviço"
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
              <Label htmlFor="cliente_id">Cliente</Label>
              <select
                id="cliente_id"
                value={formData.cliente_id}
                onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#f97316]"
                data-testid="conta-cliente"
              >
                <option value="">Selecione um cliente (opcional)</option>
                {clientes.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
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

      {/* Modal Importar OS */}
      <Dialog open={showOsModal} onOpenChange={setShowOsModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto" data-testid="os-modal">
          <DialogHeader>
            <DialogTitle>Importar OS Concluídas como Contas a Receber</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Selecione as Ordens de Serviço concluídas que deseja adicionar como contas a receber para cobrança.
            </p>
            
            {osDisponiveis.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>Nenhuma OS concluída disponível para importar</p>
                <p className="text-xs mt-1">As OS concluídas já foram adicionadas como contas a receber</p>
              </div>
            ) : (
              <div className="space-y-3">
                {osDisponiveis.map((os) => (
                  <div 
                    key={os.id} 
                    className="border border-slate-200 rounded-lg p-4 hover:border-[#f97316] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">OS #{os.numero_fisico}</p>
                        <p className="text-sm text-slate-600">{os.cliente_nome}</p>
                        <p className="text-xs text-slate-500">
                          {os.veiculo_tipo} - {os.veiculo_modelo}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold text-lg text-[#1e3a5f]">
                          R$ {os.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <Button
                          size="sm"
                          onClick={() => adicionarOsComoContaReceber(os)}
                          className="mt-2 bg-[#f97316] hover:bg-[#ea580c]"
                          data-testid={`add-os-${os.id}`}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Adicionar
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setShowOsModal(false)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContasReceber;
