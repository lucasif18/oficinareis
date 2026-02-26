import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, User, Building, Phone, Mail, MapPin, FileText, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ViewCliente = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cliente, setCliente] = useState(null);
  const [ordensServico, setOrdensServico] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCliente();
  }, [id]);

  const fetchCliente = async () => {
    try {
      const [clienteRes, osRes] = await Promise.all([
        axios.get(`${API_URL}/api/clientes/${id}`),
        axios.get(`${API_URL}/api/ordens-servico?cliente_id=${id}`)
      ]);
      setCliente(clienteRes.data);
      setOrdensServico(osRes.data);
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      toast.error('Erro ao carregar dados do cliente');
      navigate('/clientes');
    } finally {
      setLoading(false);
    }
  };

  const formatCpfCnpj = (value) => {
    if (!value) return '-';
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f97316]"></div>
      </div>
    );
  }

  if (!cliente) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/clientes')}
            className="p-2 hover:bg-slate-100 rounded-md transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-heading font-black text-3xl text-slate-900">{cliente.nome}</h1>
            <p className="text-slate-600">Detalhes do cliente</p>
          </div>
        </div>
        <Link to={`/clientes/${id}/editar`}>
          <Button className="bg-[#f97316] hover:bg-[#ea580c]">
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
        </Link>
      </div>

      {/* Dados do Cliente */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Informações Básicas */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <h2 className="font-heading font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
              {cliente.tipo === 'PF' ? <User className="w-5 h-5 text-blue-500" /> : <Building className="w-5 h-5 text-purple-500" />}
              Informações do Cliente
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase">Tipo</p>
                <p className="text-sm font-medium text-slate-900">
                  {cliente.tipo === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">{cliente.tipo === 'PF' ? 'CPF' : 'CNPJ'}</p>
                <p className="text-sm font-mono font-medium text-slate-900">
                  {formatCpfCnpj(cliente.cpf_cnpj)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Telefone
                </p>
                <p className="text-sm font-medium text-slate-900">{cliente.telefone}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Email
                </p>
                <p className="text-sm font-medium text-slate-900">{cliente.email || '-'}</p>
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
            <h2 className="font-heading font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#f97316]" />
              Endereço
            </h2>
            <div className="space-y-2">
              <p className="text-sm text-slate-900">{cliente.endereco || 'Não informado'}</p>
              <p className="text-sm text-slate-600">
                {cliente.cidade && cliente.estado ? `${cliente.cidade} - ${cliente.estado}` : '-'}
              </p>
            </div>
          </div>
        </div>

        {/* Resumo */}
        <div className="space-y-6">
          <div className="bg-[#1e3a5f] rounded-lg p-6 text-white">
            <h3 className="font-heading font-bold text-lg mb-4">Resumo</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-300">Total de OS</span>
                <span className="font-bold">{ordensServico.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Em Andamento</span>
                <span className="font-bold">{ordensServico.filter(os => os.status === 'andamento').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Concluídas</span>
                <span className="font-bold">{ordensServico.filter(os => os.status === 'concluido').length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Histórico de OS */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="font-heading font-bold text-lg text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#f97316]" />
            Histórico de Ordens de Serviço
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">OS</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Veículo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Data</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ordensServico.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                    Nenhuma ordem de serviço encontrada
                  </td>
                </tr>
              ) : (
                ordensServico.map((os) => (
                  <tr key={os.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link to={`/ordens-servico/${os.id}`} className="font-mono text-sm font-bold text-[#1e3a5f] hover:text-[#f97316]">
                        #{os.numero_fisico}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-700">{os.veiculo_tipo} - {os.veiculo_modelo}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">
                        {new Date(os.criado_em).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(os.status)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-mono text-sm font-bold text-slate-900">
                        R$ {os.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ViewCliente;
