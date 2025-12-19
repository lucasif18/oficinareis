import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { X, Plus } from 'lucide-react';

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

const NovaOS = () => {
  const navigate = useNavigate();
  const [clientes, setClientes] = useState([]);
  const [pecas, setPecas] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [tabelaPrecos, setTabelaPrecos] = useState([]);
  
  const [formData, setFormData] = useState({
    numero_fisico: '',
    cliente_id: '',
    veiculo_tipo: '',
    veiculo_modelo: '',
    veiculo_serie: '',
    categoria: 'leve'
  });

  const [servicosSelecionados, setServicosSelecionados] = useState([]);
  const [pecasSelecionadas, setPecasSelecionadas] = useState([]);
  const [desconto, setDesconto] = useState({ tipo: 'fixo', valor: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [clientesRes, pecasRes, funcRes, tabelaRes] = await Promise.all([
        axios.get(`${API_URL}/api/clientes`),
        axios.get(`${API_URL}/api/pecas`),
        axios.get(`${API_URL}/api/funcionarios`),
        axios.get(`${API_URL}/api/tabela-precos`)
      ]);
      setClientes(clientesRes.data);
      setPecas(pecasRes.data);
      setFuncionarios(funcRes.data);
      setTabelaPrecos(tabelaRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    }
  };

  const addServico = (setor, servico, valor) => {
    setServicosSelecionados([...servicosSelecionados, {
      setor,
      servico,
      funcionario_id: '',
      funcionario_nome: '',
      valor
    }]);
  };

  const removeServico = (index) => {
    setServicosSelecionados(servicosSelecionados.filter((_, i) => i !== index));
  };

  const updateServico = (index, field, value) => {
    const updated = [...servicosSelecionados];
    updated[index][field] = value;
    if (field === 'funcionario_id') {
      const func = funcionarios.find(f => f.id === value);
      updated[index].funcionario_nome = func?.nome || '';
    }
    setServicosSelecionados(updated);
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
    const subtotal = valorServicos + valorPecas;
    
    let valorDesconto = 0;
    if (desconto.tipo === 'percentual') {
      valorDesconto = subtotal * (parseFloat(desconto.valor) / 100);
    } else {
      valorDesconto = parseFloat(desconto.valor || 0);
    }
    
    return {
      valorServicos,
      valorPecas,
      valorDesconto,
      total: subtotal - valorDesconto
    };
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
      const osData = {
        ...formData,
        servicos: servicosSelecionados,
        pecas: pecasSelecionadas,
        desconto_tipo: desconto.tipo,
        desconto_valor: parseFloat(desconto.valor)
      };

      await axios.post(`${API_URL}/api/ordens-servico`, osData);
      toast.success('Ordem de Serviço criada com sucesso!');
      navigate('/ordens-servico');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar OS');
    }
  };

  const totais = calcularTotal();
  const servicosPorSetor = tabelaPrecos.reduce((acc, item) => {
    if (!acc[item.setor]) acc[item.setor] = [];
    acc[item.setor].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-black text-4xl text-slate-900" data-testid="nova-os-title">Nova Ordem de Serviço</h1>
        <p className="text-slate-600 mt-2">Preencha os dados da OS</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h2 className="font-heading font-bold text-xl text-slate-800 mb-4">Dados Básicos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="numero_fisico">Número da OS *</Label>
              <Input
                id="numero_fisico"
                value={formData.numero_fisico}
                onChange={(e) => setFormData({ ...formData, numero_fisico: e.target.value })}
                data-testid="os-numero"
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
                data-testid="os-cliente"
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
                data-testid="os-veiculo-tipo"
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
                data-testid="os-veiculo-modelo"
                required
              />
            </div>
            <div>
              <Label htmlFor="veiculo_serie">Série/Potência</Label>
              <Input
                id="veiculo_serie"
                value={formData.veiculo_serie}
                onChange={(e) => setFormData({ ...formData, veiculo_serie: e.target.value })}
                data-testid="os-veiculo-serie"
              />
            </div>
            <div>
              <Label>Categoria *</Label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="leve"
                    checked={formData.categoria === 'leve'}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="text-[#f97316] focus:ring-[#f97316]"
                  />
                  <span className="text-sm">Leve</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="pesada"
                    checked={formData.categoria === 'pesada'}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="text-[#f97316] focus:ring-[#f97316]"
                  />
                  <span className="text-sm">Pesada</span>
                </label>
              </div>
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
                        data-testid={`add-servico-${servico.servico}`}
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
                  <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-md" data-testid={`servico-selecionado-${index}`}>
                    <div className="flex-1 grid grid-cols-3 gap-3">
                      <div>
                        <span className="text-xs text-slate-500 block mb-1">{servico.setor}</span>
                        <span className="text-sm font-medium text-slate-900">{servico.servico}</span>
                      </div>
                      <select
                        value={servico.funcionario_id}
                        onChange={(e) => updateServico(index, 'funcionario_id', e.target.value)}
                        className="text-sm px-2 py-1 border border-slate-300 rounded-md"
                        data-testid={`servico-funcionario-${index}`}
                      >
                        <option value="">Selecione funcionário</option>
                        {funcionarios
                          .filter(f => f.especialidades.includes(servico.setor))
                          .map(f => (
                            <option key={f.id} value={f.id}>{f.nome}</option>
                          ))
                        }
                      </select>
                      <div className="text-right">
                        <span className="font-mono font-bold text-[#1e3a5f]">
                          R$ {parseFloat(servico.valor).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeServico(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                      data-testid={`remove-servico-${index}`}
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
            <Button type="button" onClick={addPeca} variant="outline" size="sm" data-testid="add-peca-button">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Peça
            </Button>
          </div>

          {pecasSelecionadas.length > 0 && (
            <div className="space-y-3">
              {pecasSelecionadas.map((peca, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-md" data-testid={`peca-selecionada-${index}`}>
                  <div className="flex-1 grid grid-cols-4 gap-3">
                    <select
                      value={peca.peca_id}
                      onChange={(e) => updatePeca(index, 'peca_id', e.target.value)}
                      className="text-sm px-2 py-1 border border-slate-300 rounded-md"
                      data-testid={`peca-select-${index}`}
                    >
                      <option value="">Selecione uma peça</option>
                      {pecas.map(p => (
                        <option key={p.id} value={p.id}>{p.nome} ({p.quantidade} disponíveis)</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={peca.quantidade}
                      onChange={(e) => updatePeca(index, 'quantidade', e.target.value)}
                      className="text-sm px-2 py-1 border border-slate-300 rounded-md"
                      placeholder="Qtd"
                      data-testid={`peca-quantidade-${index}`}
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
                    data-testid={`remove-peca-${index}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h2 className="font-heading font-bold text-xl text-slate-800 mb-4">Desconto</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={desconto.tipo}
              onChange={(e) => setDesconto({ ...desconto, tipo: e.target.value })}
              className="px-3 py-2 border border-slate-300 rounded-md"
              data-testid="desconto-tipo"
            >
              <option value="fixo">Fixo (R$)</option>
              <option value="percentual">Percentual (%)</option>
            </select>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={desconto.valor}
              onChange={(e) => setDesconto({ ...desconto, valor: e.target.value })}
              placeholder="Valor do desconto"
              data-testid="desconto-valor"
            />
          </div>
        </div>

        <div className="bg-[#1e3a5f] text-white rounded-lg shadow-lg p-6">
          <h2 className="font-heading font-bold text-2xl mb-4">Resumo</h2>
          <div className="space-y-2">
            <div className="flex justify-between text-lg">
              <span>Serviços:</span>
              <span className="font-mono font-bold">R$ {totais.valorServicos.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg">
              <span>Peças:</span>
              <span className="font-mono font-bold">R$ {totais.valorPecas.toFixed(2)}</span>
            </div>
            {totais.valorDesconto > 0 && (
              <div className="flex justify-between text-lg text-amber-300">
                <span>Desconto:</span>
                <span className="font-mono font-bold">- R$ {totais.valorDesconto.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-white/20 pt-3 mt-3">
              <div className="flex justify-between text-2xl">
                <span className="font-heading font-black">TOTAL:</span>
                <span className="font-mono font-black" data-testid="os-total">
                  R$ {totais.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/ordens-servico')}
            data-testid="cancel-os-button"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            className="bg-[#f97316] hover:bg-[#ea580c]"
            data-testid="save-os-button"
          >
            Salvar OS
          </Button>
        </div>
      </form>
    </div>
  );
};

export default NovaOS;
