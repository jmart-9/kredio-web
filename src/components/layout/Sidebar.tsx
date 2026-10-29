import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, Users, Briefcase, Settings, CreditCard, 
  FileText, Building2, Shield, DollarSign
} from 'lucide-react'; // ✅ Importaciones consolidadas y limpias
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';

const tenantMenuItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, requiredPermission: 'REPORT:VIEW' },
  { to: '/clients', label: 'Clientes', icon: Users, requiredPermission: 'CLIENT:READ' },
  { to: '/loans', label: 'Préstamos', icon: CreditCard, requiredPermission: 'LOAN:READ' },
  { to: '/portfolios', label: 'Carteras', icon: Briefcase, requiredPermission: 'REPORT:VIEW' },
  { to: '/reports', label: 'Reportes', icon: FileText, requiredPermission: 'REPORT:VIEW' },
  { to: '/users', label: 'Usuarios', icon: Settings, requiredPermission: 'USER:READ' },
  { to: '/payments', label: 'Pagos', icon: DollarSign, requiredPermission: 'LOAN:READ' },
];

const adminGlobalMenuItems = [
  { to: '/admin', label: 'Dashboard Global', icon: Shield, requiredPermission: 'GLOBAL:MANAGE' },
  { to: '/admin/tenants', label: 'Tenants', icon: Building2, requiredPermission: 'GLOBAL:MANAGE' },
  { to: '/admin/plans', label: 'Planes SaaS', icon: CreditCard, requiredPermission: 'GLOBAL:MANAGE' },
];

export function Sidebar() {
  const { user, hasPermission } = useAuthStore();
  
  // Verificar si es Admin Global
  const isAdminGlobal = user?.role === 'ADMIN_GLOBAL' || hasPermission('GLOBAL:MANAGE');
  
  // Seleccionar el menú correspondiente
  const menuItems = isAdminGlobal ? adminGlobalMenuItems : tenantMenuItems;

  // Filtrar menú por permisos
  const visibleMenuItems = menuItems.filter(item =>
    !item.requiredPermission || hasPermission(item.requiredPermission)
  );

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
            {user?.fullName?.charAt(0) || 'K'}
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 truncate">{user?.fullName || 'Kredio'}</h1>
            <p className="text-xs text-gray-500">{user?.roleName || 'Rol'}</p>
            {isAdminGlobal && (
              <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                Admin Global
              </span>
            )}
          </div>
        </div>
      </div>

      <nav className="p-4 space-y-1 flex-1">
        {visibleMenuItems.map((item) => {
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

      <div className="p-4 border-t border-gray-200">
        <p className="text-xs text-gray-400 text-center">© 2026 Kredio SaaS</p>
      </div>
    </aside>
  );
}