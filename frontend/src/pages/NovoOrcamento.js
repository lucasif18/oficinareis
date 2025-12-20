import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { X, Plus } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const NovoOrcamento = () => {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [pecas, setPecas] = useState([]);
  const [tabelaPrecos, setTabelaPrecos] = useState([]);
  
  const [formData, setFormData] = useState({
    numero: `ORC-${Date.now()}`,
    cliente_id: '',
    veiculo_tipo: '',
    veiculo_modelo: ''
  });

  const [servicosSelecionados, setServicosSelecionados] = useState([]);
  const [pecasSelecionadas, setPecasSelecionadas] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [clientesRes, pecasRes, tabelaRes] = await Promise.all([
        axios.get(`${API_URL}/api/clientes`),
        axios.get(`${API_URL}/api/pecas`),
        axios.get(`${API_URL}/api/tabela-precos`)
      ]);
      setClientes(clientesRes.data);
      setPecas(pecasRes.data);
      setTabelaPrecos(tabelaRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    }
  };

  const addServico = (setor, servico, valor) => {
    setServicosSelecionados([...servicosSelecionados, {
      setor,
      servico,
      funcionario_id: null,
      funcionario_nome: null,
      valor
    }]);
  };

  const removeServico = (index) => {
    setServicosSelecionados(servicosSelecionados.filter((_, i) => i !== index));
  };

  const addPeca = () => {
    setPecasSelecionadas([...pecasSelecionadas, {
      peca_id: '',
      peca_nome: '',
      quantidade: 1,
      valor_unitario: 0,
      valor_total: 0
    }]);
  };

  const removePeca = (index) => {
    setPecasSelecionadas(pecasSelecionadas.filter((_, i) => i !== index));
  };

  const updatePeca = (index, field, value) => {
    const updated = [...pecasSelecionadas];
    updated[index][field] = value;
    
    if (field === 'peca_id') {
      const peca = pecas.find(p => p.id === value);
      if (peca) {
        updated[index].peca_nome = peca.nome;
        updated[index].valor_unitario = peca.valor_unitario;
        updated[index].valor_total = peca.valor_unitario * updated[index].quantidade;
      }
    }
    
    if (field === 'quantidade') {
      updated[index].valor_total = updated[index].valor_unitario * parseFloat(value);
    }
    
    setPecasSelecionadas(updated);
  };

  const calcularTotal = () => {
    const valorServicos = servicosSelecionados.reduce((sum, s) => sum + parseFloat(s.valor || 0), 0);
    const valorPecas = pecasSelecionadas.reduce((sum, p) => sum + parseFloat(p.valor_total || 0), 0);
    return valorServicos + valorPecas;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.cliente_id) {
      toast.error('Selecione um cliente');
      return;
    }
    
    if (servicosSelecionados.length === 0 && pecasSelecionadas.length === 0) {
      toast.error('Adicione ao menos um serviço ou peça');
      return;
    }

    try {
      const orcamentoData = {
        ...formData,
        servicos: servicosSelecionados,
        pecas: pecasSelecionadas
      };

      await axios.post(`${API_URL}/api/orcamentos`, orcamentoData);
      toast.success('Orçamento criado com sucesso!');
      navigate('/orcamentos');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar orçamento');
    }
  };

  const total = calcularTotal();
  const servicosPorSetor = tabelaPrecos.reduce((acc, item) => {
    if (!acc[item.setor]) acc[item.setor] = [];
    acc[item.setor].push(item);
    return acc;
  }, {});

  const setores = ['Virabrequim', 'Bloco', 'Bielas', 'Cabeçote', 'Comando', 'Válvulas', 'Gerais'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-black text-4xl text-slate-900" data-testid="novo-orcamento-title">Novo Orçamento</h1>
        <p className="text-slate-600 mt-2">Preencha os dados do orçamento</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h2 className="font-heading font-bold text-xl text-slate-800 mb-4">Dados Básicos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="numero">Número do Orçamento *</Label>
              <Input
                id="numero"
                value={formData.numero}
                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                data-testid="orc-numero"
                required
              />
            </div>
            <div>
              <Label htmlFor="cliente_id">Cliente *</Label>
              <select
                id="cliente_id"
                value={formData.cliente_id}
                onChange={(e) => setFormData({ ...formData, cliente_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#f97316]"
                data-testid="orc-cliente"
                required
              >
                <option value="">Selecione um cliente</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h2 className="font-heading font-bold text-xl text-slate-800 mb-4">Veículo</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="veiculo_tipo">Tipo *</Label>
              <Input
                id="veiculo_tipo"
                value={formData.veiculo_tipo}
                onChange={(e) => setFormData({ ...formData, veiculo_tipo: e.target.value })}
                placeholder="Ex: Caminhão, Trator"
                data-testid="orc-veiculo-tipo"
                required
              />
            </div>
            <div>
              <Label htmlFor="veiculo_modelo">Modelo *</Label>
              <Input
                id="veiculo_modelo"
                value={formData.veiculo_modelo}
                onChange={(e) => setFormData({ ...formData, veiculo_modelo: e.target.value })}
                placeholder="Ex: Scania R450"
                data-testid="orc-veiculo-modelo"
                required
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h2 className="font-heading font-bold text-xl text-slate-800 mb-4">Serviços</h2>
          <div className="space-y-4">
            {setores.map(setor => {
              const servicos = servicosPorSetor[setor] || [];
              if (servicos.length === 0) return null;
              
              return (
                <div key={setor} className="border border-slate-200 rounded-lg p-4">
                  <h3 className="font-heading font-bold text-sm text-slate-700 mb-3">{setor}</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {servicos.map(servico => (
                      <button
                        key={servico.id}
                        type="button"
                        onClick={() => addServico(setor, servico.servico, servico.valor)}
                        className="text-left px-3 py-2 border border-slate-200 rounded-md hover:border-[#f97316] hover:bg-orange-50 transition-colors text-sm"
                      >
                        <div className="flex justify-between items-center">
                          <span>{servico.servico}</span>
                          <span className="font-mono font-medium text-[#1e3a5f]">R$ {servico.valor.toFixed(2)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {servicosSelecionados.length > 0 && (
            <div className="mt-6 border-t pt-6">
              <h3 className="font-heading font-bold text-sm text-slate-700 mb-3">Serviços Selecionados</h3>
              <div className="space-y-3">
                {servicosSelecionados.map((servico, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-md">
                    <div className="flex-1">
                      <span className="text-xs text-slate-500 block mb-1">{servico.setor}</span>
                      <span className="text-sm font-medium text-slate-900">{servico.servico}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-[#1e3a5f]">
                        R$ {parseFloat(servico.valor).toFixed(2)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeServico(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-bold text-xl text-slate-800">Peças</h2>
            <Button type="button" onClick={addPeca} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Peça
            </Button>
          </div>

          {pecasSelecionadas.length > 0 && (
            <div className="space-y-3">
              {pecasSelecionadas.map((peca, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-md">
                  <div className="flex-1 grid grid-cols-4 gap-3">
                    <select
                      value={peca.peca_id}
                      onChange={(e) => updatePeca(index, 'peca_id', e.target.value)}
                      className="text-sm px-2 py-1 border border-slate-300 rounded-md"
                    >
                      <option value="">Selecione uma peça</option>
                      {pecas.map(p => (
                        <option key={p.id} value={p.id}>{p.nome}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={peca.quantidade}
                      onChange={(e) => updatePeca(index, 'quantidade', e.target.value)}
                      className="text-sm px-2 py-1 border border-slate-300 rounded-md"
                      placeholder="Qtd"
                    />
                    <div className="text-sm text-slate-600">
                      Unit: R$ {peca.valor_unitario.toFixed(2)}
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-[#1e3a5f]">
                        R$ {peca.valor_total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePeca(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[#1e3a5f] text-white rounded-lg shadow-lg p-6">
          <h2 className="font-heading font-bold text-2xl mb-4">Total do Orçamento</h2>
          <div className="text-4xl font-mono font-black" data-testid="orc-total">
            R$ {total.toFixed(2)}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/orcamentos')}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="bg-[#f97316] hover:bg-[#ea580c]"
            data-testid="save-orcamento"
          >
            Salvar Orçamento
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NovoOrcamento;
