import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, DollarSign } from 'lucide-react';
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

const setores = [
  'Virabrequim',
  'Bloco',
  'Bielas',
  'Cabeçote',
  'Comando',
  'Válvulas',
  'Gerais'
];

const TabelaPrecos = () => {
  const [tabela, setTabela] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    setor: 'Virabrequim',
    servico: '',
    valor: 0
  });

  useEffect(() => {
    fetchTabela();
  }, []);

  const fetchTabela = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/tabela-precos`);
      setTabela(response.data);
    } catch (error) {
      console.error('Erro ao buscar tabela:', error);
      toast.error('Erro ao carregar tabela de preços');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        valor: parseFloat(formData.valor)
      };

      if (editingItem) {
        await axios.put(`${API_URL}/api/tabela-precos/${editingItem.id}`, submitData);
        toast.success('Serviço atualizado com sucesso!');
      } else {
        await axios.post(`${API_URL}/api/tabela-precos`, submitData);
        toast.success('Serviço cadastrado com sucesso!');
      }
      setShowModal(false);
      resetForm();
      fetchTabela();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar serviço');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deseja realmente excluir este serviço?')) return;
    try {
      await axios.delete(`${API_URL}/api/tabela-precos/${id}`);
      toast.success('Serviço excluído com sucesso!');
      fetchTabela();
    } catch (error) {
      toast.error('Erro ao excluir serviço');
    }
  };

  const resetForm = () => {
    setFormData({
      setor: 'Virabrequim',
      servico: '',
      valor: 0
    });
    setEditingItem(null);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      setor: item.setor,
      servico: item.servico,
      valor: item.valor
    });
    setShowModal(true);
  };

  const tabelaPorSetor = tabela.reduce((acc, item) => {
    if (!acc[item.setor]) acc[item.setor] = [];
    acc[item.setor].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-black text-4xl text-slate-900" data-testid="tabela-title">Tabela de Preços</h1>
          <p className="text-slate-600 mt-2">Gerencie os valores dos serviços</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-[#f97316] hover:bg-[#ea580c]"
          data-testid="add-servico-button"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Serviço
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f97316]"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {setores.map(setor => {
            const servicos = tabelaPorSetor[setor] || [];
            if (servicos.length === 0) return null;

            return (
              <div key={setor} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
                  <h2 className="font-heading font-bold text-lg text-slate-800">{setor}</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Serviço</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Valor</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {servicos.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors" data-testid={`servico-row-${item.id}`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-slate-400" />
                              <span className="text-sm font-medium text-slate-900">{item.servico}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="font-mono text-sm font-bold text-[#1e3a5f]">
                              R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditModal(item)}
                                className="p-2 text-slate-600 hover:text-[#f97316] hover:bg-slate-100 rounded-md transition-colors"
                                data-testid={`edit-servico-${item.id}`}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="p-2 text-slate-600 hover:text-red-600 hover:bg-slate-100 rounded-md transition-colors"
                                data-testid={`delete-servico-${item.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {tabela.length === 0 && (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-12 text-center">
              <p className="text-slate-500">Nenhum serviço cadastrado na tabela de preços</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent data-testid="servico-modal">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Editar Serviço' : 'Novo Serviço'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="setor">Setor *</Label>
              <select
                id="setor"
                value={formData.setor}
                onChange={(e) => setFormData({ ...formData, setor: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#f97316]"
                data-testid="servico-setor"
                required
              >
                {setores.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="servico">Nome do Serviço *</Label>
              <Input
                id="servico"
                value={formData.servico}
                onChange={(e) => setFormData({ ...formData, servico: e.target.value })}
                placeholder="Ex: Retífica de Virabrequim"
                data-testid="servico-nome"
                required
              />
            </div>

            <div>
              <Label htmlFor="valor">Valor (R$) *</Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0"
                value={formData.valor}
                onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                data-testid="servico-valor"
                required
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
                data-testid="save-servico-button"
              >
                {editingItem ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TabelaPrecos;
