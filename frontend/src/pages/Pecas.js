import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Search, Edit, Trash2, AlertTriangle, Package, PackagePlus } from 'lucide-react';
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

const Pecas = () => {
  const [pecas, setPecas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showEntradaModal, setShowEntradaModal] = useState(false);
  const [entradaPeca, setEntradaPeca] = useState(null);
  const [entradaQuantidade, setEntradaQuantidade] = useState(1);
  const [editingPeca, setEditingPeca] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'nova',
    codigo: '',
    quantidade: 0,
    quantidade_minima: 0,
    fornecedor: '',
    valor_unitario: 0,
    localizacao: ''
  });

  useEffect(() => {
    fetchPecas();
  }, [searchTerm, filterTipo]);

  const fetchPecas = async () => {
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (filterTipo) params.tipo = filterTipo;
      
      const response = await axios.get(`${API_URL}/api/pecas`, { params });
      setPecas(response.data);
    } catch (error) {
      console.error('Erro ao buscar peças:', error);
      toast.error('Erro ao carregar peças');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        ...formData,
        quantidade: parseInt(formData.quantidade),
        quantidade_minima: parseInt(formData.quantidade_minima),
        valor_unitario: parseFloat(formData.valor_unitario)
      };

      if (editingPeca) {
        await axios.put(`${API_URL}/api/pecas/${editingPeca.id}`, submitData);
        toast.success('Peça atualizada com sucesso!');
      } else {
        await axios.post(`${API_URL}/api/pecas`, submitData);
        toast.success('Peça cadastrada com sucesso!');
      }
      setShowModal(false);
      resetForm();
      fetchPecas();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar peça');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deseja realmente excluir esta peça?')) return;
    try {
      await axios.delete(`${API_URL}/api/pecas/${id}`);
      toast.success('Peça excluída com sucesso!');
      fetchPecas();
    } catch (error) {
      toast.error('Erro ao excluir peça');
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      tipo: 'nova',
      codigo: '',
      quantidade: 0,
      quantidade_minima: 0,
      fornecedor: '',
      valor_unitario: 0,
      localizacao: ''
    });
    setEditingPeca(null);
  };

  const openEditModal = (peca) => {
    setEditingPeca(peca);
    setFormData({
      nome: peca.nome,
      tipo: peca.tipo,
      codigo: peca.codigo || '',
      quantidade: peca.quantidade,
      quantidade_minima: peca.quantidade_minima,
      fornecedor: peca.fornecedor || '',
      valor_unitario: peca.valor_unitario,
      localizacao: peca.localizacao || ''
    });
    setShowModal(true);
  };

  const isEstoqueBaixo = (peca) => peca.quantidade <= peca.quantidade_minima;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-black text-4xl text-slate-900" data-testid="pecas-title">Peças</h1>
          <p className="text-slate-600 mt-2">Controle seu estoque</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-[#f97316] hover:bg-[#ea580c]"
          data-testid="add-peca-button"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Peça
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Buscar por nome ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="search-pecas"
            />
          </div>
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#f97316]"
            data-testid="filter-tipo"
          >
            <option value="">Todos os tipos</option>
            <option value="nova">Nova</option>
            <option value="usada">Usada</option>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Peça</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Código</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tipo</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Estoque</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fornecedor</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Valor Unitário</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pecas.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                      Nenhuma peça encontrada
                    </td>
                  </tr>
                ) : (
                  pecas.map((peca) => (
                    <tr 
                      key={peca.id} 
                      className={`hover:bg-slate-50 transition-colors ${
                        isEstoqueBaixo(peca) ? 'bg-amber-50' : ''
                      }`}
                      data-testid={`peca-row-${peca.id}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-900">{peca.nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-slate-600">{peca.codigo || '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          peca.tipo === 'nova' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {peca.tipo === 'nova' ? 'Nova' : 'Usada'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-2">
                            {isEstoqueBaixo(peca) && (
                              <AlertTriangle className="w-4 h-4 text-amber-600" data-testid="low-stock-icon" />
                            )}
                            <span className={`font-mono text-sm font-medium ${
                              isEstoqueBaixo(peca) ? 'text-amber-700' : 'text-slate-900'
                            }`}>
                              {peca.quantidade}
                            </span>
                          </div>
                          <span className="text-xs text-slate-500">Mín: {peca.quantidade_minima}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">{peca.fornecedor || '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono text-sm font-medium text-slate-900">
                          R$ {peca.valor_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(peca)}
                            className="p-2 text-slate-600 hover:text-[#f97316] hover:bg-slate-100 rounded-md transition-colors"
                            data-testid={`edit-peca-${peca.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(peca.id)}
                            className="p-2 text-slate-600 hover:text-red-600 hover:bg-slate-100 rounded-md transition-colors"
                            data-testid={`delete-peca-${peca.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
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
        <DialogContent className="max-w-2xl" data-testid="peca-modal">
          <DialogHeader>
            <DialogTitle>
              {editingPeca ? 'Editar Peça' : 'Nova Peça'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome">Nome da Peça *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  data-testid="peca-nome"
                  required
                />
              </div>
              <div>
                <Label htmlFor="codigo">Código</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                  data-testid="peca-codigo"
                />
              </div>
            </div>

            <div>
              <Label>Tipo *</Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="nova"
                    checked={formData.tipo === 'nova'}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    className="text-[#f97316] focus:ring-[#f97316]"
                  />
                  <span className="text-sm">Nova</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="usada"
                    checked={formData.tipo === 'usada'}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    className="text-[#f97316] focus:ring-[#f97316]"
                  />
                  <span className="text-sm">Usada</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="quantidade">Quantidade *</Label>
                <Input
                  id="quantidade"
                  type="number"
                  min="0"
                  value={formData.quantidade}
                  onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
                  data-testid="peca-quantidade"
                  required
                />
              </div>
              <div>
                <Label htmlFor="quantidade_minima">Quantidade Mínima *</Label>
                <Input
                  id="quantidade_minima"
                  type="number"
                  min="0"
                  value={formData.quantidade_minima}
                  onChange={(e) => setFormData({ ...formData, quantidade_minima: e.target.value })}
                  data-testid="peca-quantidade-minima"
                  required
                />
              </div>
              <div>
                <Label htmlFor="valor_unitario">Valor Unitário *</Label>
                <Input
                  id="valor_unitario"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.valor_unitario}
                  onChange={(e) => setFormData({ ...formData, valor_unitario: e.target.value })}
                  data-testid="peca-valor"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fornecedor">Fornecedor</Label>
                <Input
                  id="fornecedor"
                  value={formData.fornecedor}
                  onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
                  data-testid="peca-fornecedor"
                />
              </div>
              <div>
                <Label htmlFor="localizacao">Localização</Label>
                <Input
                  id="localizacao"
                  value={formData.localizacao}
                  onChange={(e) => setFormData({ ...formData, localizacao: e.target.value })}
                  data-testid="peca-localizacao"
                  placeholder="Ex: Prateleira A3"
                />
              </div>
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
                data-testid="save-peca-button"
              >
                {editingPeca ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Pecas;
