import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Save, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const EditarOS = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [pecas, setPecas] = useState([]);
  const [tabelaPrecos, setTabelaPrecos] = useState([]);
  
  const [formData, setFormData] = useState({
    numero_fisico: '',
    cliente_id: '',
    veiculo_tipo: '',
    veiculo_modelo: '',
    veiculo_serie: '',
    categoria: 'leve',
    servicos: [],
    pecas: [],
    desconto_tipo: 'fixo',
    desconto_valor: 0
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [osRes, clientesRes, funcionariosRes, pecasRes, tabelaRes] = await Promise.all([
        axios.get(`${API_URL}/api/ordens-servico/${id}`),
        axios.get(`${API_URL}/api/clientes`),
        axios.get(`${API_URL}/api/funcionarios`),
        axios.get(`${API_URL}/api/pecas`),
        axios.get(`${API_URL}/api/tabela-precos`)
      ]);

      const os = osRes.data;
      setFormData({
        numero_fisico: os.numero_fisico,
        cliente_id: os.cliente_id,
        veiculo_tipo: os.veiculo_tipo,
        veiculo_modelo: os.veiculo_modelo,
        veiculo_serie: os.veiculo_serie || '',
        categoria: os.categoria,
        servicos: os.servicos || [],
        pecas: os.pecas || [],
        desconto_tipo: os.desconto_tipo || 'fixo',
        desconto_valor: os.desconto_valor || 0
      });

      setClientes(clientesRes.data);
      setFuncionarios(funcionariosRes.data);
      setPecas(pecasRes.data);
      setTabelaPrecos(tabelaRes.data);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast.error('Erro ao carregar dados da OS');
      navigate('/ordens-servico');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await axios.put(`${API_URL}/api/ordens-servico/${id}`, formData);
      toast.success('Ordem de Serviço atualizada com sucesso!');
      navigate('/ordens-servico');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao atualizar OS');
    } finally {
      setSaving(false);
    }
  };

  const adicionarServico = () => {
    setFormData({
      ...formData,
      servicos: [
        ...formData.servicos,
        { setor: '', servico: '', funcionario_id: '', funcionario_nome: '', valor: 0 }
      ]
    });
  };

  const removerServico = (index) => {
    const novosServicos = formData.servicos.filter((_, i) => i !== index);
    setFormData({ ...formData, servicos: novosServicos });
  };

  const atualizarServico = (index, field, value) => {
    const novosServicos = [...formData.servicos];
    novosServicos[index][field] = value;

    if (field === 'servico') {
      const servicoPreco = tabelaPrecos.find(t => t.nome === value);
      if (servicoPreco) {
        novosServicos[index].valor = servicoPreco.valor;
        novosServicos[index].setor = servicoPreco.setor;
      }
    }

    if (field === 'funcionario_id') {
      const func = funcionarios.find(f => f.id === value);
      novosServicos[index].funcionario_nome = func ? func.nome : '';
    }

    setFormData({ ...formData, servicos: novosServicos });
  };

  const adicionarPeca = () => {
    setFormData({
      ...formData,
      pecas: [
        ...formData.pecas,
        { peca_id: '', peca_nome: '', quantidade: 1, valor_unitario: 0, valor_total: 0 }
      ]
    });
  };

  const removerPeca = (index) => {
    const novasPecas = formData.pecas.filter((_, i) => i !== index);
    setFormData({ ...formData, pecas: novasPecas });
  };

  const atualizarPeca = (index, field, value) => {
    const novasPecas = [...formData.pecas];
    novasPecas[index][field] = value;

    if (field === 'peca_id') {
      const peca = pecas.find(p => p.id === value);
      if (peca) {
        novasPecas[index].peca_nome = peca.nome;
        novasPecas[index].valor_unitario = peca.valor_venda;
        novasPecas[index].valor_total = peca.valor_venda * novasPecas[index].quantidade;
      }
    }

    if (field === 'quantidade') {
      novasPecas[index].valor_total = novasPecas[index].valor_unitario * value;
    }

    setFormData({ ...formData, pecas: novasPecas });
  };

  const calcularTotal = () => {
    const totalServicos = formData.servicos.reduce((sum, s) => sum + (s.valor || 0), 0);
    const totalPecas = formData.pecas.reduce((sum, p) => sum + (p.valor_total || 0), 0);
    const subtotal = totalServicos + totalPecas;
    
    let desconto = 0;
    if (formData.desconto_tipo === 'percentual') {
      desconto = subtotal * (formData.desconto_valor / 100);
    } else {
      desconto = formData.desconto_valor;
    }
    
    return { totalServicos, totalPecas, subtotal, desconto, total: subtotal - desconto };
  };

  const totais = calcularTotal();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f97316]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/ordens-servico')}
          className="p-2 hover:bg-slate-100 rounded-md transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-heading font-black text-3xl text-slate-900">Editar Ordem de Serviço</h1>
          <p className="text-slate-600">OS #{formData.numero_fisico}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados Básicos */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h2 className="font-heading font-bold text-lg text-slate-800 mb-4">Dados Básicos</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Número da OS</Label>
              <Input
                value={formData.numero_fisico}
                onChange={(e) => setFormData({ ...formData, numero_fisico: e.target.value })}
                required
              />
            </div>
            <div>
              <Label>Cliente</Label>
              <select
                value={formData.cliente_id}
                onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#f97316]"
                required
              >
                <option value="">Selecione...</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Categoria</Label>
              <select
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#f97316]"
              >
                <option value="leve">Leve</option>
                <option value="pesado">Pesado</option>
                <option value="agricola">Agrícola</option>
              </select>
            </div>
          </div>
        </div>

        {/* Veículo */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h2 className="font-heading font-bold text-lg text-slate-800 mb-4">Veículo / Motor</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Tipo</Label>
              <Input
                value={formData.veiculo_tipo}
                onChange={(e) => setFormData({ ...formData, veiculo_tipo: e.target.value })}
                placeholder="Ex: Caminhão, Carro, Trator"
                required
              />
            </div>
            <div>
              <Label>Modelo</Label>
              <Input
                value={formData.veiculo_modelo}
                onChange={(e) => setFormData({ ...formData, veiculo_modelo: e.target.value })}
                placeholder="Ex: Scania R450"
                required
              />
            </div>
            <div>
              <Label>Série / Potência</Label>
              <Input
                value={formData.veiculo_serie}
                onChange={(e) => setFormData({ ...formData, veiculo_serie: e.target.value })}
                placeholder="Ex: DC13"
              />
            </div>
          </div>
        </div>

        {/* Serviços */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-lg text-slate-800">Serviços</h2>
            <Button type="button" onClick={adicionarServico} size="sm" className="bg-[#f97316] hover:bg-[#ea580c]">
              <Plus className="w-4 h-4 mr-1" /> Serviço
            </Button>
          </div>
          
          {formData.servicos.length === 0 ? (
            <p className="text-slate-500 text-center py-4">Nenhum serviço adicionado</p>
          ) : (
            <div className="space-y-3">
              {formData.servicos.map((servico, index) => (
                <div key={index} className="flex gap-3 items-end p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <Label className="text-xs">Serviço</Label>
                    <select
                      value={servico.servico}
                      onChange={(e) => atualizarServico(index, 'servico', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-md"
                    >
                      <option value="">Selecione...</option>
                      {tabelaPrecos.map(t => (
                        <option key={t.id} value={t.nome}>{t.setor} - {t.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-40">
                    <Label className="text-xs">Funcionário</Label>
                    <select
                      value={servico.funcionario_id || ''}
                      onChange={(e) => atualizarServico(index, 'funcionario_id', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-md"
                    >
                      <option value="">Selecione...</option>
                      {funcionarios.map(f => (
                        <option key={f.id} value={f.id}>{f.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-28">
                    <Label className="text-xs">Valor</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={servico.valor}
                      onChange={(e) => atualizarServico(index, 'valor', parseFloat(e.target.value) || 0)}
                      className="text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removerServico(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Peças */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-lg text-slate-800">Peças</h2>
            <Button type="button" onClick={adicionarPeca} size="sm" className="bg-[#f97316] hover:bg-[#ea580c]">
              <Plus className="w-4 h-4 mr-1" /> Peça
            </Button>
          </div>
          
          {formData.pecas.length === 0 ? (
            <p className="text-slate-500 text-center py-4">Nenhuma peça adicionada</p>
          ) : (
            <div className="space-y-3">
              {formData.pecas.map((peca, index) => (
                <div key={index} className="flex gap-3 items-end p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <Label className="text-xs">Peça</Label>
                    <select
                      value={peca.peca_id}
                      onChange={(e) => atualizarPeca(index, 'peca_id', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-md"
                    >
                      <option value="">Selecione...</option>
                      {pecas.map(p => (
                        <option key={p.id} value={p.id}>{p.nome} (Estoque: {p.quantidade})</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-20">
                    <Label className="text-xs">Qtd</Label>
                    <Input
                      type="number"
                      min="1"
                      value={peca.quantidade}
                      onChange={(e) => atualizarPeca(index, 'quantidade', parseInt(e.target.value) || 1)}
                      className="text-sm"
                    />
                  </div>
                  <div className="w-28">
                    <Label className="text-xs">Valor Unit.</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={peca.valor_unitario}
                      onChange={(e) => atualizarPeca(index, 'valor_unitario', parseFloat(e.target.value) || 0)}
                      className="text-sm"
                      readOnly
                    />
                  </div>
                  <div className="w-28">
                    <Label className="text-xs">Total</Label>
                    <Input
                      value={`R$ ${peca.valor_total.toFixed(2)}`}
                      className="text-sm bg-slate-100"
                      readOnly
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removerPeca(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desconto e Totais */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h2 className="font-heading font-bold text-lg text-slate-800 mb-4">Desconto e Totais</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <Label>Tipo de Desconto</Label>
              <select
                value={formData.desconto_tipo}
                onChange={(e) => setFormData({ ...formData, desconto_tipo: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              >
                <option value="fixo">Valor Fixo (R$)</option>
                <option value="percentual">Percentual (%)</option>
              </select>
            </div>
            <div>
              <Label>Valor do Desconto</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.desconto_valor}
                onChange={(e) => setFormData({ ...formData, desconto_valor: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="space-y-2 text-right border-t border-slate-200 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Subtotal Serviços:</span>
              <span className="font-mono font-medium">R$ {totais.totalServicos.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Subtotal Peças:</span>
              <span className="font-mono font-medium">R$ {totais.totalPecas.toFixed(2)}</span>
            </div>
            {totais.desconto > 0 && (
              <div className="flex justify-between text-sm text-amber-600">
                <span>Desconto:</span>
                <span className="font-mono font-medium">- R$ {totais.desconto.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold border-t border-slate-200 pt-3 mt-3">
              <span className="text-slate-900">TOTAL:</span>
              <span className="font-mono text-[#1e3a5f]">R$ {totais.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/ordens-servico')}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving} className="bg-[#f97316] hover:bg-[#ea580c]">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditarOS;
