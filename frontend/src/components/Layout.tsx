import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  Megaphone,
  ListFilter,
  Columns3,
  Users,
  LogOut,
  Inbox,
  FolderKanban,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import NotificationBell from './NotificationBell';


const roleLabels: Record<string, string> = {
  vendedor: 'Vendedor',
  orcamentista: 'Orçamentista',
  projetista: 'Projetista',
  gerente: 'Gerente',
};

export default function Layout() {
  const { user, logout, isGerente, isOrcamentista, isProjetista } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    {
      to: '/',
      icon: LayoutDashboard,
      label: 'Dashboard',
      show: true,
    },
    {
      to: '/demands/new',
      icon: PlusCircle,
      label: 'Nova Demanda',
      show: true,
    },
    {
      to: '/campaigns',
      icon: Megaphone,
      label: 'Campanhas',
      show: true,
    },
    {
      to: '/queue/triage',
      icon: ListFilter,
      label: 'Triagem',
      show: isOrcamentista || isGerente,
    },
    {
      to: '/queue/project',
      icon: Inbox,
      label: 'Decupagem',
      show: isProjetista || isGerente,
    },
    {
      to: '/kanban',
      icon: FolderKanban,
      label: 'Kanban',
      show: isGerente,
    },
    {
      to: '/users',
      icon: Users,
      label: 'Usuários',
      show: isGerente,
    },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="flex w-64 flex-col bg-slate-800">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-6">
          <Columns3 className="h-8 w-8 text-teal-400" />
          <span className="text-xl font-bold text-white tracking-wide">
            GEKA
          </span>
        </div>

        {/* Navigation */}
        <nav className="mt-2 flex-1 space-y-1 px-3">
          {navItems
            .filter((item) => item.show)
            .map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  isActive ? 'sidebar-link-active' : 'sidebar-link'
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            ))}
        </nav>

        {/* User info at bottom */}
        <div className="border-t border-white/10 p-4">
          <div className="mb-3">
            <p className="text-sm font-medium text-white">{user?.nome}</p>
            <p className="text-xs text-gray-400">
              {user?.role ? roleLabels[user.role] || user.role : ''}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
          <div />
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-sm font-medium text-white">
                {user?.nome?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="text-sm font-medium text-gray-700">
                {user?.nome}
              </span>
              {user?.role && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {roleLabels[user.role] || user.role}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
