import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Wrench, AlertCircle, Search, Mail, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Login = () => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userData = await login(email, senha);
      toast.success('Login realizado com sucesso!');
      
      // Redirecionar baseado no role do usuário
      const role = userData?.role || 'admin';
      switch(role) {
        case 'motorista':
          navigate('/dashboard-motorista');
          break;
        case 'funcionario':
          navigate('/dashboard-funcionario');
          break;
        case 'cliente':
          navigate('/area-cliente');
          break;
        default:
          navigate('/dashboard');
      }
    } catch (err) {
      const message = err.response?.data?.detail || 'Erro ao fazer login';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error('Digite seu email');
      return;
    }
    
    setResetLoading(true);
    try {
      await axios.post(`${API_URL}/api/auth/forgot-password`, { email: resetEmail });
      toast.success('Email de recuperação enviado! Verifique sua caixa de entrada.');
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (err) {
      const message = err.response?.data?.detail || 'Erro ao enviar email de recuperação';
      toast.error(message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1e3a5f] via-[#2d5a8a] to-[#1e3a5f] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-[#f59e0b] rounded-lg flex items-center justify-center mb-4">
              <Wrench className="w-10 h-10 text-[#1e3a5f]" />
            </div>
            <h1 className="font-heading font-black text-3xl text-[#1e3a5f]">Oficina Reis</h1>
            <p className="text-yellow-600 text-sm mt-1">Retificação de Motores</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2" data-testid="login-error">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {!showForgotPassword ? (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                data-testid="login-email"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:border-transparent"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Senha
              </label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                data-testid="login-password"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              data-testid="login-submit"
              className="w-full bg-[#f97316] hover:bg-[#ea580c] text-white font-medium py-2.5 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 space-y-3">
            <div className="text-center">
              <p className="text-sm text-slate-600">
                Não tem uma conta?{' '}
                <Link to="/cadastro" className="text-[#f97316] hover:text-[#ea580c] font-medium">
                  Cadastre-se
                </Link>
              </p>
            </div>
            
            <div className="border-t border-slate-200 pt-4">
              <Link 
                to="/consulta-os" 
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-[#1e3a5f] text-[#1e3a5f] rounded-md hover:bg-[#1e3a5f] hover:text-white transition-colors font-medium"
              >
                <Search className="w-4 h-4" />
                Consultar Ordem de Serviço
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
