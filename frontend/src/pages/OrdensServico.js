import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Eye, Edit, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const OrdensServico = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');

  // Funcionário não pode ver valores
  const canSeeValues = user?.role !== 'funcionario';
  // Funcionário não pode criar/editar/excluir OS
  const canCreateOS = user?.role !== 'funcionario';
  const canEditOS = user?.role === 'admin' || user?.role === 'motorista';
  const canDeleteOS = user?.role === 'admin';

  useEffect(() => {
    fetchOrdens();
  }, [filterStatus]);

  const fetchOrdens = async () => {
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      
      const response = await axios.get(`${API_URL}/api/ordens-servico`, { params });
      setOrdens(response.data);
    } catch (error) {
      console.error('Erro ao buscar OS:', error);
      toast.error('Erro ao carregar ordens de serviço');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pendente: 'bg-amber-100 text-amber-700',
      andamento: 'bg-blue-100 text-blue-700',
      concluido: 'bg-emerald-100 text-emerald-700'
    };
    const labels = {
      pendente: 'Pendente',
      andamento: 'Em Andamento',
      concluido: 'Concluído'
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const updateStatus = async (id, newStatus) => {
    try {
      await axios.put(`${API_URL}/api/ordens-servico/${id}/status?status=${newStatus}`);
      toast.success('Status atualizado com sucesso!');
      fetchOrdens();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDelete = async (id, numeroFisico) => {
    if (!window.confirm(`Tem certeza que deseja excluir a OS #${numeroFisico}? Esta ação não pode ser desfeita.`)) {
      return;
    }
    
    try {
      await axios.delete(`${API_URL}/api/ordens-servico/${id}`);
      toast.success('Ordem de Serviço excluída com sucesso!');
      fetchOrdens();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao excluir OS');
    }
  };

  const handleEdit = (id) => {
    navigate(`/ordens-servico/${id}/editar`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-black text-4xl text-slate-900" data-testid="os-title">Ordens de Serviço</h1>
          <p className="text-slate-600 mt-2">Gerencie suas OS</p>
        </div>
        {canCreateOS && (
          <Link to="/ordens-servico/nova">
            <Button className="bg-[#f97316] hover:bg-[#ea580c]" data-testid="nova-os-button">
              <Plus className="w-4 h-4 mr-2" />
              Nova OS
            </Button>
          </Link>
        )}
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
            <option value="andamento">Em Andamento</option>
            <option value="concluido">Concluído</option>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Número</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Veículo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Categoria</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  {canSeeValues && (
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Valor Total</th>
                  )}
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ordens.length === 0 ? (
                  <tr>
                    <td colSpan={canSeeValues ? "7" : "6"} className="px-4 py-8 text-center text-slate-500">
                      Nenhuma ordem de serviço encontrada
                    </td>
                  </tr>
                ) : (
                  ordens.map((os) => (
                    <tr key={os.id} className="hover:bg-slate-50 transition-colors" data-testid={`os-row-${os.numero_fisico}`}>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-bold text-[#1e3a5f]">#{os.numero_fisico}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-slate-900">{os.cliente_nome}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-700">
                          <div className="font-medium">{os.veiculo_tipo}</div>
                          <div className="text-xs text-slate-500">{os.veiculo_modelo}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600 capitalize">{os.categoria}</span>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(os.status)}
                      </td>
                      {canSeeValues && (
                        <td className="px-4 py-3 text-right">
                          <span className="font-mono text-sm font-bold text-slate-900">
                            R$ {os.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/ordens-servico/${os.id}`}>
                            <button
                              className="p-2 text-slate-600 hover:text-[#f97316] hover:bg-slate-100 rounded-md transition-colors"
                              data-testid={`view-os-${os.id}`}
                              title="Visualizar"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </Link>
                          {canEditOS && os.status !== 'concluido' && (
                            <button
                              onClick={() => handleEdit(os.id)}
                              className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                              data-testid={`edit-os-${os.id}`}
                              title="Editar"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {canDeleteOS && (
                            <button
                              onClick={() => handleDelete(os.id, os.numero_fisico)}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                              data-testid={`delete-os-${os.id}`}
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          {os.status === 'pendente' && canCreateOS && (
                            <button
                              onClick={() => updateStatus(os.id, 'andamento')}
                              className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                              data-testid={`start-os-${os.id}`}
                            >
                              Iniciar
                            </button>
                          )}
                          {os.status === 'andamento' && canCreateOS && (
                            <button
                              onClick={() => updateStatus(os.id, 'concluido')}
                              className="px-3 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200 transition-colors"
                              data-testid={`complete-os-${os.id}`}
                            >
                              Concluir
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
        )}
      </div>
    </div>
  );
};

export default OrdensServico;
