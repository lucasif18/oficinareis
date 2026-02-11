import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import ConsultaOS from './pages/ConsultaOS';
import Institucional from './pages/Institucional';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Pecas from './pages/Pecas';
import OrdensServico from './pages/OrdensServico';
import NovaOS from './pages/NovaOS';
import ViewOS from './pages/ViewOS';
import EditarOS from './pages/EditarOS';
import Orcamentos from './pages/Orcamentos';
import NovoOrcamento from './pages/NovoOrcamento';
import ViewOrcamento from './pages/ViewOrcamento';
import Romaneio from './pages/Romaneio';
import ViewRomaneio from './pages/ViewRomaneio';
import Motoristas from './pages/Motoristas';
import TabelaPrecos from './pages/TabelaPrecos';
import Funcionarios from './pages/Funcionarios';
import Financeiro from './pages/Financeiro';
import FluxoCaixa from './pages/FluxoCaixa';
import ContasPagar from './pages/ContasPagar';
import ContasReceber from './pages/ContasReceber';
import DRE from './pages/DRE';
import Relatorios from './pages/Relatorios';
import './App.css';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f97316]"></div>
      </div>
    );
  }
  
  return user ? <Layout>{children}</Layout> : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f97316]"></div>
      </div>
    );
  }
  
  return user ? <Navigate to="/dashboard" /> : children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          
          <Route path="/cadastro" element={
            <PublicRoute>
              <Cadastro />
            </PublicRoute>
          } />
          
          {/* Rota pública para consulta de OS */}
          <Route path="/consulta-os" element={<ConsultaOS />} />
          
          <Route path="/dashboard" element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } />
          
          <Route path="/clientes" element={
            <PrivateRoute>
              <Clientes />
            </PrivateRoute>
          } />
          
          <Route path="/pecas" element={
            <PrivateRoute>
              <Pecas />
            </PrivateRoute>
          } />
          
          <Route path="/ordens-servico" element={
            <PrivateRoute>
              <OrdensServico />
            </PrivateRoute>
          } />
          
          <Route path="/ordens-servico/nova" element={
            <PrivateRoute>
              <NovaOS />
            </PrivateRoute>
          } />
          
          <Route path="/ordens-servico/:id" element={
            <PrivateRoute>
              <ViewOS />
            </PrivateRoute>
          } />
          
          <Route path="/orcamentos" element={
            <PrivateRoute>
              <Orcamentos />
            </PrivateRoute>
          } />
          
          <Route path="/orcamentos/novo" element={
            <PrivateRoute>
              <NovoOrcamento />
            </PrivateRoute>
          } />
          
          <Route path="/orcamentos/:id" element={
            <PrivateRoute>
              <ViewOrcamento />
            </PrivateRoute>
          } />
          
          <Route path="/romaneio" element={
            <PrivateRoute>
              <Romaneio />
            </PrivateRoute>
          } />
          
          <Route path="/romaneio/:id" element={
            <PrivateRoute>
              <ViewRomaneio />
            </PrivateRoute>
          } />
          
          <Route path="/funcionarios" element={
            <PrivateRoute>
              <Funcionarios />
            </PrivateRoute>
          } />
          
          <Route path="/motoristas" element={
            <PrivateRoute>
              <Motoristas />
            </PrivateRoute>
          } />
          
          <Route path="/tabela-precos" element={
            <PrivateRoute>
              <TabelaPrecos />
            </PrivateRoute>
          } />
          
          <Route path="/financeiro" element={
            <PrivateRoute>
              <Financeiro />
            </PrivateRoute>
          } />
          
          <Route path="/financeiro/fluxo-caixa" element={
            <PrivateRoute>
              <FluxoCaixa />
            </PrivateRoute>
          } />
          
          <Route path="/financeiro/contas-pagar" element={
            <PrivateRoute>
              <ContasPagar />
            </PrivateRoute>
          } />
          
          <Route path="/financeiro/contas-receber" element={
            <PrivateRoute>
              <ContasReceber />
            </PrivateRoute>
          } />
          
          <Route path="/financeiro/dre" element={
            <PrivateRoute>
              <DRE />
            </PrivateRoute>
          } />
          
          <Route path="/relatorios" element={
            <PrivateRoute>
              <Relatorios />
            </PrivateRoute>
          } />
          
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
