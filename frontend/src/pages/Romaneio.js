import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, Truck } from 'lucide-react';
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

const Romaneio = () => {
  const [romaneios, setRomaneios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [motoristas, setMotoristas] = useState([]);
  const [osDisponiveis, setOsDisponiveis] = useState([]);
  const [formData, setFormData] = useState({
    numero: `ROM-${Date.now()}`,
    motorista_id: '',
    os_ids: [],
    data_entrega: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchRomaneios();
  }, []);

  const fetchRomaneios = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/romaneios`);
      setRomaneios(response.data);
    } catch (error) {
      console.error('Erro ao buscar romaneios:', error);
      toast.error('Erro ao carregar romaneios');
    } finally {
      setLoading(false);
    }
  };

  const fetchModalData = async () => {
    try {
      const [motoristasRes, osRes] = await Promise.all([
        axios.get(`${API_URL}/api/motoristas`),
        axios.get(`${API_URL}/api/romaneios/os-disponiveis/list`)
      ]);
      setMotoristas(motoristasRes.data);
      setOsDisponiveis(osRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.os_ids.length === 0) {
      toast.error('Selecione ao menos uma OS');
      return;
    }

    try {
      const submitData = {
        ...formData,
        data_entrega: new Date(formData.data_entrega + 'T12:00:00').toISOString()
      };

      await axios.post(`${API_URL}/api/romaneios`, submitData);
      toast.success('Romaneio criado com sucesso!');
      setShowModal(false);
      resetForm();
      fetchRomaneios();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar romaneio');
    }
  };

  const resetForm = () => {
    setFormData({
      numero: `ROM-${Date.now()}`,
      motorista_id: '',
      os_ids: [],
      data_entrega: new Date().toISOString().split('T')[0]
    });
  };

  const toggleOS = (osId) => {
    if (formData.os_ids.includes(osId)) {
      setFormData({
        ...formData,
        os_ids: formData.os_ids.filter(id => id !== osId)
      });
    } else {
      setFormData({
        ...formData,
        os_ids: [...formData.os_ids, osId]
      });
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pendente: 'bg-amber-100 text-amber-700',
      em_rota: 'bg-blue-100 text-blue-700',
      concluido: 'bg-emerald-100 text-emerald-700'
    };
    const labels = {
      pendente: 'Pendente',
      em_rota: 'Em Rota',
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
      await axios.put(`${API_URL}/api/romaneios/${id}/status?status=${newStatus}`);
      toast.success('Status atualizado com sucesso!');
      fetchRomaneios();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-black text-4xl text-slate-900" data-testid="romaneio-title">Romaneio</h1>
          <p className="text-slate-600 mt-2">Controle de entregas</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            fetchModalData();
            setShowModal(true);
          }}
          className="bg-[#f97316] hover:bg-[#ea580c]"
          data-testid="novo-romaneio-button"
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Romaneio
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Número</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Motorista</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Qtd OS</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Data Entrega</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {romaneios.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-slate-500">
                      Nenhum romaneio encontrado
                    </td>
                  </tr>
                ) : (
                  romaneios.map((rom) => (
                    <tr key={rom.id} className="hover:bg-slate-50 transition-colors" data-testid={`romaneio-row-${rom.numero}`}>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-bold text-[#1e3a5f]">#{rom.numero}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-900">{rom.motorista_nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">{rom.os_ids.length} OS</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">
                          {new Date(rom.data_entrega).toLocaleDateString('pt-BR')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(rom.status)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {rom.status === 'pendente' && (
                            <button
                              onClick={() => updateStatus(rom.id, 'em_rota')}
                              className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                              data-testid={`start-romaneio-${rom.id}`}
                            >
                              Iniciar Rota
                            </button>
                          )}
                          {rom.status === 'em_rota' && (
                            <button
                              onClick={() => updateStatus(rom.id, 'concluido')}
                              className="px-3 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200 transition-colors"
                              data-testid={`complete-romaneio-${rom.id}`}
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

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-3xl" data-testid="romaneio-modal">
          <DialogHeader>
            <DialogTitle>Novo Romaneio</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="numero">Número do Romaneio *</Label>
                <Input
                  id="numero"
                  value={formData.numero}
                  onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                  data-testid="romaneio-numero"
                  required
                />
              </div>
              <div>
                <Label htmlFor="motorista_id">Motorista *</Label>
                <select
                  id="motorista_id"
                  value={formData.motorista_id}
                  onChange={(e) => setFormData({ ...formData, motorista_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#f97316]"
                  data-testid="romaneio-motorista"
                  required
                >
                  <option value="">Selecione um motorista</option>
                  {motoristas.map(m => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="data_entrega">Data de Entrega *</Label>
              <Input
                id="data_entrega"
                type="date"
                value={formData.data_entrega}
                onChange={(e) => setFormData({ ...formData, data_entrega: e.target.value })}
                data-testid="romaneio-data"
                required
              />
            </div>

            <div>
              <Label>Ordens de Serviço Disponíveis *</Label>
              <div className="mt-2 max-h-64 overflow-y-auto border border-slate-200 rounded-md">
                {osDisponiveis.length === 0 ? (
                  <div className="p-4 text-center text-slate-500">
                    Nenhuma OS concluída disponível para entrega
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {osDisponiveis.map(os => (
                      <label
                        key={os.id}
                        className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer"
                        data-testid={`os-option-${os.id}`}
                      >
                        <input
                          type="checkbox"
                          checked={formData.os_ids.includes(os.id)}
                          onChange={() => toggleOS(os.id)}
                          className="text-[#f97316] focus:ring-[#f97316] rounded"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-sm font-medium text-slate-900">#{os.numero_fisico}</span>
                            <span className="text-xs text-slate-500">{os.cliente_nome}</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {os.veiculo_tipo} - {os.veiculo_modelo}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {formData.os_ids.length} OS selecionada(s)
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
                data-testid="save-romaneio-button"
              >
                Criar Romaneio
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Romaneio;
