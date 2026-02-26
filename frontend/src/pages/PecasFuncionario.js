import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Search, Package, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '../components/ui/input';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Página de Peças para Funcionário - APENAS VISUALIZAÇÃO SEM PREÇOS
const PecasFuncionario = () => {
  const [pecas, setPecas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPecas();
  }, [searchTerm]);

  const fetchPecas = async () => {
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      
      const response = await axios.get(`${API_URL}/api/pecas`, { params });
      setPecas(response.data);
    } catch (error) {
      console.error('Erro ao buscar peças:', error);
      toast.error('Erro ao carregar peças');
    } finally {
      setLoading(false);
    }
  };

  const isEstoqueBaixo = (peca) => peca.quantidade <= peca.quantidade_minima;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-black text-4xl text-slate-900">Estoque de Peças</h1>
        <p className="text-slate-600 mt-2">Consulte a disponibilidade de peças</p>
      </div>

      {/* Busca */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Buscar por nome ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabela - SEM coluna de valor */}
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Peça</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Código</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tipo</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Quantidade</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Localização</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pecas.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                      Nenhuma peça encontrada
                    </td>
                  </tr>
                ) : (
                  pecas.map((peca) => (
                    <tr 
                      key={peca.id} 
                      className={`hover:bg-slate-50 transition-colors ${
                        isEstoqueBaixo(peca) ? 'bg-amber-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-900">{peca.nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-slate-600">{peca.codigo || '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          peca.tipo === 'nova' 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {peca.tipo === 'nova' ? 'Nova' : 'Usada'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-2">
                            {isEstoqueBaixo(peca) && (
                              <AlertTriangle className="w-4 h-4 text-amber-600" />
                            )}
                            <span className={`font-mono text-sm font-medium ${
                              isEstoqueBaixo(peca) ? 'text-amber-700' : 'text-slate-900'
                            }`}>
                              {peca.quantidade}
                            </span>
                          </div>
                          {isEstoqueBaixo(peca) && (
                            <span className="text-xs text-amber-600">Estoque baixo</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-600">{peca.localizacao || '-'}</span>
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

export default PecasFuncionario;
