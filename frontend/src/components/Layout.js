import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, Users, Package, FileText, FileCheck,
  Truck, UserCog, DollarSign, BarChart3, LogOut, Menu, X,
  Wrench
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'funcionario', 'motorista'] },
    { path: '/clientes', icon: Users, label: 'Clientes', roles: ['admin', 'funcionario'] },
    { path: '/pecas', icon: Package, label: 'Peças', roles: ['admin', 'funcionario'] },
    { path: '/ordens-servico', icon: FileText, label: 'Ordens de Serviço', roles: ['admin', 'funcionario'] },
    { path: '/orcamentos', icon: FileCheck, label: 'Orçamentos', roles: ['admin', 'funcionario'] },
    { path: '/romaneio', icon: Truck, label: 'Romaneio', roles: ['admin', 'funcionario', 'motorista'] },
    { path: '/funcionarios', icon: UserCog, label: 'Funcionários', roles: ['admin'] },
    { path: '/motoristas', icon: Truck, label: 'Motoristas', roles: ['admin'] },
    { path: '/financeiro', icon: DollarSign, label: 'Financeiro', roles: ['admin'] },
    { path: '/relatorios', icon: BarChart3, label: 'Relatórios', roles: ['admin', 'funcionario'] },
  ];

  const filteredMenu = menuItems.filter(item => 
    item.roles.includes(user?.role)
  );

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#f1f5f9]">
      <aside 
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-[#1e3a5f] text-slate-300 transition-all duration-300 flex flex-col`}
      >
        <div className="p-6 flex items-center justify-between border-b border-white/10">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#f97316] rounded-lg flex items-center justify-center">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-heading font-black text-white text-lg">Oficina Reis</h1>
                <p className="text-xs text-slate-400">Retificação de Motores</p>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 bg-[#f97316] rounded-lg flex items-center justify-center mx-auto">
              <Wrench className="w-6 h-6 text-white" />
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {filteredMenu.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.path.slice(1)}`}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors
                  ${
                    isActive
                      ? 'bg-white/10 text-white'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                {sidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className={`flex items-center gap-3 mb-3 ${!sidebarOpen && 'justify-center'}`}>
            <div className="w-8 h-8 bg-[#f97316] rounded-full flex items-center justify-center text-white font-bold text-sm">
              {user?.nome?.charAt(0).toUpperCase()}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{user?.nome}</p>
                <p className="text-slate-400 text-xs capitalize">{user?.role}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className={`
              w-full flex items-center gap-3 px-3 py-2 rounded-md
              text-slate-300 hover:bg-white/5 hover:text-white transition-colors
              ${!sidebarOpen && 'justify-center'}
            `}
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span className="text-sm">Sair</span>}
          </button>
        </div>

        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-6 w-6 h-6 bg-[#f97316] rounded-full flex items-center justify-center text-white hover:bg-[#ea580c] transition-colors"
        >
          {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
