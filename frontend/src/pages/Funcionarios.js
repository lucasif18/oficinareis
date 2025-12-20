import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Search, Edit, Trash2, UserCog } from 'lucide-react';
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

const setoresDisponiveis = [
  'Virabrequim',
  'Bloco',
  'Bielas',
  'Cabeçote',
  'Comando',
  'Válvulas',
  'Gerais'
];

const Funcionarios = () => {
  const [funcionarios, setFuncionarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFuncionario, setEditingFuncionario] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    especialidades: []
  });

  useEffect(() => {
    fetchFuncionarios();
  }, []);

  const fetchFuncionarios = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/funcionarios`);
      setFuncionarios(response.data);
    } catch (error) {
      console.error('Erro ao buscar funcionários:', error);
      toast.error('Erro ao carregar funcionários');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingFuncionario) {
        await axios.put(`${API_URL}/api/funcionarios/${editingFuncionario.id}`, formData);
        toast.success('Funcionário atualizado com sucesso!');
      } else {
        await axios.post(`${API_URL}/api/funcionarios`, formData);
        toast.success('Funcionário cadastrado com sucesso!');
      }
      setShowModal(false);
      resetForm();
      fetchFuncionarios();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar funcionário');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deseja realmente excluir este funcionário?')) return;
    try {
      await axios.delete(`${API_URL}/api/funcionarios/${id}`);
      toast.success('Funcionário excluído com sucesso!');
      fetchFuncionarios();
    } catch (error) {
      toast.error('Erro ao excluir funcionário');
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      cpf: '',
      telefone: '',
      especialidades: []
    });
    setEditingFuncionario(null);
  };

  const openEditModal = (funcionario) => {
    setEditingFuncionario(funcionario);
    setFormData({
      nome: funcionario.nome,
      cpf: funcionario.cpf,
      telefone: funcionario.telefone,
      especialidades: funcionario.especialidades || []
    });
    setShowModal(true);
  };

  const toggleEspecialidade = (setor) => {
    if (formData.especialidades.includes(setor)) {
      setFormData({
        ...formData,
        especialidades: formData.especialidades.filter(e => e !== setor)
      });
    } else {
      setFormData({
        ...formData,
        especialidades: [...formData.especialidades, setor]
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-black text-4xl text-slate-900" data-testid="funcionarios-title">Funcionários</h1>
          <p className="text-slate-600 mt-2">Gerencie os funcionários técnicos</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-[#f97316] hover:bg-[#ea580c]"
          data-testid="add-funcionario-button"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Funcionário
        </Button>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nome</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">CPF</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Telefone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Especialidades</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {funcionarios.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                      Nenhum funcionário encontrado
                    </td>
                  </tr>
                ) : (
                  funcionarios.map((func) => (
                    <tr key={func.id} className="hover:bg-slate-50 transition-colors" data-testid={`funcionario-row-${func.id}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <UserCog className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-900">{func.nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-slate-600">{func.cpf}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">{func.telefone}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {func.especialidades && func.especialidades.length > 0 ? (
                            func.especialidades.map((esp, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700"
                              >
                                {esp}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400">Nenhuma</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(func)}
                            className="p-2 text-slate-600 hover:text-[#f97316] hover:bg-slate-100 rounded-md transition-colors"
                            data-testid={`edit-funcionario-${func.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(func.id)}
                            className="p-2 text-slate-600 hover:text-red-600 hover:bg-slate-100 rounded-md transition-colors"
                            data-testid={`delete-funcionario-${func.id}`}
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
        <DialogContent className="max-w-2xl" data-testid="funcionario-modal">
          <DialogHeader>
            <DialogTitle>
              {editingFuncionario ? 'Editar Funcionário' : 'Novo Funcionário'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  data-testid="funcionario-nome"
                  required
                />
              </div>
              <div>
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  data-testid="funcionario-cpf"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="telefone">Telefone *</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                data-testid="funcionario-telefone"
                required
              />
            </div>

            <div>
              <Label>Especialidades (Setores)</Label>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {setoresDisponiveis.map(setor => (
                  <label
                    key={setor}
                    className="flex items-center gap-2 p-3 border border-slate-200 rounded-md hover:border-[#f97316] hover:bg-orange-50 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={formData.especialidades.includes(setor)}
                      onChange={() => toggleEspecialidade(setor)}
                      className="text-[#f97316] focus:ring-[#f97316] rounded"
                      data-testid={`especialidade-${setor}`}
                    />
                    <span className="text-sm">{setor}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Selecione os setores em que o funcionário é especializado
              </p>
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
                data-testid="save-funcionario-button"
              >
                {editingFuncionario ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Funcionarios;
