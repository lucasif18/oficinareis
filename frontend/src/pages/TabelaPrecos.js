import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Edit, Trash2, DollarSign, Settings, FolderPlus } from 'lucide-react';
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

// Setores padrão
const setoresPadrao = [
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
  const [setores, setSetores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSetorModal, setShowSetorModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingSetor, setEditingSetor] = useState(null);
  const [novoSetor, setNovoSetor] = useState('');
  const [formData, setFormData] = useState({
    setor: '',
    servico: '',
    valor: 0
  });

  useEffect(() => {
    fetchTabela();
    fetchSetores();
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

  const fetchSetores = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/setores`);
      // Combinar setores do banco com setores padrão
      const setoresBanco = response.data.map(s => s.nome);
      const todosSetores = [...new Set([...setoresPadrao, ...setoresBanco])];
      setSetores(todosSetores);
    } catch (error) {
      // Se o endpoint não existir, usar apenas setores padrão
      setSetores(setoresPadrao);
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

  const handleSalvarSetor = async (e) => {
    e.preventDefault();
    const nomeSetor = editingSetor || novoSetor.trim();
    
    if (!nomeSetor) {
      toast.error('Digite o nome do setor');
      return;
    }

    try {
      if (editingSetor) {
        // Renomear setor em todos os serviços
        await axios.put(`${API_URL}/api/setores/${editingSetor}`, { novo_nome: novoSetor });
        toast.success('Setor renomeado com sucesso!');
      } else {
        // Criar novo setor
        await axios.post(`${API_URL}/api/setores`, { nome: nomeSetor });
        toast.success('Setor criado com sucesso!');
      }
      setShowSetorModal(false);
      setNovoSetor('');
      setEditingSetor(null);
      fetchSetores();
      fetchTabela();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar setor');
    }
  };

  const handleDeleteSetor = async (setor) => {
    const servicosDoSetor = tabela.filter(t => t.setor === setor);
    if (servicosDoSetor.length > 0) {
      toast.error(`Não é possível excluir o setor "${setor}" pois ele possui ${servicosDoSetor.length} serviço(s) cadastrado(s)`);
      return;
    }
    
    if (!window.confirm(`Deseja realmente excluir o setor "${setor}"?`)) return;
    
    try {
      await axios.delete(`${API_URL}/api/setores/${setor}`);
      toast.success('Setor excluído com sucesso!');
      fetchSetores();
    } catch (error) {
      toast.error('Erro ao excluir setor');
    }
  };

  const resetForm = () => {
    setFormData({
      setor: setores[0] || 'Virabrequim',
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

  const openEditSetorModal = (setor) => {
    setEditingSetor(setor);
    setNovoSetor(setor);
    setShowSetorModal(true);
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
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setEditingSetor(null);
              setNovoSetor('');
              setShowSetorModal(true);
            }}
            variant="outline"
            className="border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white"
            data-testid="add-setor-button"
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            Novo Setor
          </Button>
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
      </div>

      {/* Card de Setores */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Settings className="w-5 h-5 text-slate-400" />
          <h3 className="font-medium text-slate-700">Setores Cadastrados</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {setores.map(setor => {
            const countServicos = tabela.filter(t => t.setor === setor).length;
            const isPadrao = setoresPadrao.includes(setor);
            return (
              <div 
                key={setor} 
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                  isPadrao 
                    ? 'bg-[#1e3a5f] text-white' 
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}
              >
                <span>{setor}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isPadrao ? 'bg-white/20' : 'bg-emerald-200'
                }`}>
                  {countServicos}
                </span>
                {!isPadrao && (
                  <div className="flex gap-1 ml-1">
                    <button 
                      onClick={() => openEditSetorModal(setor)}
                      className="hover:bg-emerald-200 p-0.5 rounded"
                      data-testid={`edit-setor-${setor}`}
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => handleDeleteSetor(setor)}
                      className="hover:bg-red-200 text-red-600 p-0.5 rounded"
                      data-testid={`delete-setor-${setor}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
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

      {/* Modal de Serviço */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent data-testid="servico-modal">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Editar Serviço' : 'Novo Serviço'}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do serviço para a tabela de preços.
            </DialogDescription>
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

      {/* Modal de Setor */}
      <Dialog open={showSetorModal} onOpenChange={setShowSetorModal}>
        <DialogContent data-testid="setor-modal">
          <DialogHeader>
            <DialogTitle>
              {editingSetor ? 'Editar Setor' : 'Novo Setor'}
            </DialogTitle>
            <DialogDescription>
              {editingSetor 
                ? 'Renomeie o setor. Todos os serviços vinculados serão atualizados.'
                : 'Crie um novo setor para organizar os serviços.'
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSalvarSetor} className="space-y-4">
            <div>
              <Label htmlFor="nomeSetor">Nome do Setor *</Label>
              <Input
                id="nomeSetor"
                value={novoSetor}
                onChange={(e) => setNovoSetor(e.target.value)}
                placeholder="Ex: Turbo, Injeção Eletrônica"
                data-testid="setor-nome"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSetorModal(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#1e3a5f] hover:bg-[#152a47]"
                data-testid="save-setor-button"
              >
                {editingSetor ? 'Renomear' : 'Criar Setor'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TabelaPrecos;
