import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Briefcase, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CreditCard } from 'lucide-react';

const menuItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/clients', label: 'Clientes', icon: Users },
  { to: '/loans', label: 'Préstamos', icon: CreditCard },
  { to: '/portfolios', label: 'Carteras', icon: Briefcase },
  { to: '/Users', label: 'Usuarios', icon: Settings },
  
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
            F
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Free Finanzas</h1>
            <p className="text-xs text-gray-500">Kredio</p>
          </div>
        </div>
      </div>

      {/* Menú */}
      <nav className="p-4 space-y-1 flex-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm',
                  isActive
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                )
              }
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <p className="text-xs text-gray-400 text-center">© 2026 Kredio SaaS</p>
      </div>
    </aside>
  );
}