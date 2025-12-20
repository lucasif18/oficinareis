import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Search, Edit, Trash2, TruckIcon } from 'lucide-react';
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

const Motoristas = () => {
  const [motoristas, setMotoristas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMotorista, setEditingMotorista] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    cnh: '',
    veiculo_modelo: '',
    veiculo_placa: ''
  });

  useEffect(() => {
    fetchMotoristas();
  }, []);

  const fetchMotoristas = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/motoristas`);
      setMotoristas(response.data);
    } catch (error) {
      console.error('Erro ao buscar motoristas:', error);
      toast.error('Erro ao carregar motoristas');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingMotorista) {
        await axios.put(`${API_URL}/api/motoristas/${editingMotorista.id}`, formData);
        toast.success('Motorista atualizado com sucesso!');
      } else {
        await axios.post(`${API_URL}/api/motoristas`, formData);
        toast.success('Motorista cadastrado com sucesso!');
      }
      setShowModal(false);
      resetForm();
      fetchMotoristas();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar motorista');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deseja realmente excluir este motorista?')) return;
    try {
      await axios.delete(`${API_URL}/api/motoristas/${id}`);
      toast.success('Motorista excluído com sucesso!');
      fetchMotoristas();
    } catch (error) {
      toast.error('Erro ao excluir motorista');
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      cpf: '',
      telefone: '',
      cnh: '',
      veiculo_modelo: '',
      veiculo_placa: ''
    });
    setEditingMotorista(null);
  };

  const openEditModal = (motorista) => {
    setEditingMotorista(motorista);
    setFormData({
      nome: motorista.nome,
      cpf: motorista.cpf,
      telefone: motorista.telefone,
      cnh: motorista.cnh,
      veiculo_modelo: motorista.veiculo_modelo || '',
      veiculo_placa: motorista.veiculo_placa || ''
    });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-black text-4xl text-slate-900" data-testid="motoristas-title">Motoristas</h1>
          <p className="text-slate-600 mt-2">Gerencie os motoristas</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-[#f97316] hover:bg-[#ea580c]"
          data-testid="add-motorista-button"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Motorista
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">CNH</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Veículo</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {motoristas.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                      Nenhum motorista encontrado
                    </td>
                  </tr>
                ) : (
                  motoristas.map((motorista) => (
                    <tr key={motorista.id} className="hover:bg-slate-50 transition-colors" data-testid={`motorista-row-${motorista.id}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <TruckIcon className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-900">{motorista.nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-slate-600">{motorista.cpf}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">{motorista.telefone}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-slate-600">{motorista.cnh}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-600">
                          {motorista.veiculo_modelo && (
                            <div>{motorista.veiculo_modelo}</div>
                          )}
                          {motorista.veiculo_placa && (
                            <div className="text-xs text-slate-500">{motorista.veiculo_placa}</div>
                          )}
                          {!motorista.veiculo_modelo && '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(motorista)}
                            className="p-2 text-slate-600 hover:text-[#f97316] hover:bg-slate-100 rounded-md transition-colors"
                            data-testid={`edit-motorista-${motorista.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(motorista.id)}
                            className="p-2 text-slate-600 hover:text-red-600 hover:bg-slate-100 rounded-md transition-colors"
                            data-testid={`delete-motorista-${motorista.id}`}
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
        <DialogContent className="max-w-2xl" data-testid="motorista-modal">
          <DialogHeader>
            <DialogTitle>
              {editingMotorista ? 'Editar Motorista' : 'Novo Motorista'}
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
                  data-testid="motorista-nome"
                  required
                />
              </div>
              <div>
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  data-testid="motorista-cpf"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="telefone">Telefone *</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                  data-testid="motorista-telefone"
                  required
                />
              </div>
              <div>
                <Label htmlFor="cnh">CNH *</Label>
                <Input
                  id="cnh"
                  value={formData.cnh}
                  onChange={(e) => setFormData({ ...formData, cnh: e.target.value })}
                  data-testid="motorista-cnh"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="veiculo_modelo">Modelo do Veículo</Label>
                <Input
                  id="veiculo_modelo"
                  value={formData.veiculo_modelo}
                  onChange={(e) => setFormData({ ...formData, veiculo_modelo: e.target.value })}
                  placeholder="Ex: Ford Cargo"
                  data-testid="motorista-veiculo-modelo"
                />
              </div>
              <div>
                <Label htmlFor="veiculo_placa">Placa do Veículo</Label>
                <Input
                  id="veiculo_placa"
                  value={formData.veiculo_placa}
                  onChange={(e) => setFormData({ ...formData, veiculo_placa: e.target.value })}
                  placeholder="Ex: ABC-1234"
                  data-testid="motorista-veiculo-placa"
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
                data-testid="save-motorista-button"
              >
                {editingMotorista ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Motoristas;
