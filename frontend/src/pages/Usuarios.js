import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Users, Plus, Edit2, Trash2, Search, Shield, Truck, Wrench, User, X, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Usuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    role: 'funcionario',
    ativo: true
  });

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/usuarios`);
      setUsuarios(response.data);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        // Atualizar usuário existente
        const updateData = { ...formData };
        if (!updateData.senha) delete updateData.senha; // Não enviar senha vazia
        await axios.put(`${API_URL}/api/usuarios/${editingUser.id}`, updateData);
        toast.success('Usuário atualizado com sucesso!');
      } else {
        // Criar novo usuário
        await axios.post(`${API_URL}/api/usuarios`, formData);
        toast.success('Usuário criado com sucesso!');
      }
      setShowModal(false);
      resetForm();
      fetchUsuarios();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar usuário');
    }
  };

  const handleDelete = async (id, nome) => {
    if (!window.confirm(`Deseja realmente excluir o usuário "${nome}"?`)) return;
    try {
      await axios.delete(`${API_URL}/api/usuarios/${id}`);
      toast.success('Usuário excluído com sucesso!');
      fetchUsuarios();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao excluir usuário');
    }
  };

  const toggleAtivo = async (id, ativo) => {
    try {
      await axios.patch(`${API_URL}/api/usuarios/${id}/toggle-ativo`);
      toast.success(ativo ? 'Usuário desativado' : 'Usuário ativado');
      fetchUsuarios();
    } catch (error) {
      toast.error('Erro ao alterar status do usuário');
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      senha: '',
      role: 'funcionario',
      ativo: true
    });
    setEditingUser(null);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      nome: user.nome,
      email: user.email,
      senha: '',
      role: user.role,
      ativo: user.ativo
    });
    setShowModal(true);
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <Shield className="w-4 h-4 text-purple-600" />;
      case 'motorista': return <Truck className="w-4 h-4 text-blue-600" />;
      case 'funcionario': return <Wrench className="w-4 h-4 text-amber-600" />;
      case 'cliente': return <User className="w-4 h-4 text-emerald-600" />;
      default: return <User className="w-4 h-4 text-slate-600" />;
    }
  };

  const getRoleBadge = (role) => {
    const styles = {
      admin: 'bg-purple-100 text-purple-700',
      motorista: 'bg-blue-100 text-blue-700',
      funcionario: 'bg-amber-100 text-amber-700',
      cliente: 'bg-emerald-100 text-emerald-700'
    };
    const labels = {
      admin: 'Administrador',
      motorista: 'Motorista',
      funcionario: 'Funcionário',
      cliente: 'Cliente'
    };
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[role]}`}>
        {getRoleIcon(role)}
        {labels[role]}
      </span>
    );
  };

  const filteredUsuarios = usuarios.filter(user => {
    const matchesSearch = user.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !filterRole || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  // Contar por role
  const countByRole = {
    admin: usuarios.filter(u => u.role === 'admin').length,
    motorista: usuarios.filter(u => u.role === 'motorista').length,
    funcionario: usuarios.filter(u => u.role === 'funcionario').length,
    cliente: usuarios.filter(u => u.role === 'cliente').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f97316]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="usuarios-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-black text-4xl text-slate-900">Usuários</h1>
          <p className="text-slate-600 mt-2">Gerencie os usuários do sistema</p>
        </div>
        <Button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="bg-[#f97316] hover:bg-[#ea580c]"
          data-testid="novo-usuario-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Resumo por Perfil */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{countByRole.admin}</p>
              <p className="text-xs text-slate-500">Administradores</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{countByRole.motorista}</p>
              <p className="text-xs text-slate-500">Motoristas</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Wrench className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{countByRole.funcionario}</p>
              <p className="text-xs text-slate-500">Funcionários</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <User className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{countByRole.cliente}</p>
              <p className="text-xs text-slate-500">Clientes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="search-usuarios"
              />
            </div>
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]"
            data-testid="filter-role"
          >
            <option value="">Todos os perfis</option>
            <option value="admin">Administrador</option>
            <option value="motorista">Motorista</option>
            <option value="funcionario">Funcionário</option>
            <option value="cliente">Cliente</option>
          </select>
        </div>
      </div>

      {/* Tabela de Usuários */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Usuário</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Perfil</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsuarios.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                    Nenhum usuário encontrado
                  </td>
                </tr>
              ) : (
                filteredUsuarios.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 transition-colors" data-testid={`user-row-${user.id}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-[#1e3a5f] rounded-full flex items-center justify-center text-white font-bold">
                          {user.nome.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-slate-900">{user.nome}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">{user.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleAtivo(user.id, user.ativo)}
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
                          user.ativo 
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                        data-testid={`toggle-ativo-${user.id}`}
                      >
                        {user.ativo ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                        {user.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 text-slate-600 hover:text-[#f97316] hover:bg-slate-100 rounded-md transition-colors"
                          data-testid={`edit-user-${user.id}`}
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {user.email !== 'admin@oficinareis.com' && (
                          <button
                            onClick={() => handleDelete(user.id, user.nome)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            data-testid={`delete-user-${user.id}`}
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Criar/Editar Usuário */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md" data-testid="usuario-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#f97316]" />
              {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome completo"
                required
                data-testid="input-nome"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
                required
                data-testid="input-email"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Senha {editingUser ? '(deixe em branco para manter)' : '*'}
              </label>
              <Input
                type="password"
                value={formData.senha}
                onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                placeholder="••••••••"
                required={!editingUser}
                data-testid="input-senha"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Perfil *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]"
                required
                data-testid="select-role"
              >
                <option value="admin">Administrador</option>
                <option value="motorista">Motorista</option>
                <option value="funcionario">Funcionário</option>
                <option value="cliente">Cliente</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="ativo"
                checked={formData.ativo}
                onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                className="w-4 h-4 text-[#f97316] rounded focus:ring-[#f97316]"
              />
              <label htmlFor="ativo" className="text-sm text-slate-700">Usuário ativo</label>
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#f97316] hover:bg-[#ea580c]"
                data-testid="submit-usuario"
              >
                {editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Usuarios;
