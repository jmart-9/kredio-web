import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Login } from '@/pages/auth/Login';
import { Dashboard } from '@/pages/dashboard/Dashboard';
import { Clients } from '@/pages/clients/Clients';
import { ClientDetail } from '@/pages/clients/ClientDetail';
import { useAuthStore } from '@/store/useAuthStore';
import { Portfolios } from '@/pages/portfolios/Portfolios';
import { PortfolioDetail } from '@/pages/portfolios/PortfolioDetail';
import { LoanForm } from '@/pages/loans/LoanForm';
import { Loans } from '@/pages/loans/Loans';
import { LoanDetail } from '@/pages/loans/LoanDetail';
import { Users } from '@/pages/users/Users';
import { Reports } from '@/pages/reports/Reports';

// ✅ NUEVAS IMPORTACIONES: Admin Global
import { GlobalDashboard } from '@/pages/admin/GlobalDashboard';
import { TenantsList } from '@/pages/admin/TenantsList';
import { PlansList } from '@/pages/admin/PlansList';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  return token ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública */}
        <Route path="/login" element={<Login />} />

        {/* Rutas protegidas */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard del Tenant (por defecto) */}
          <Route index element={<Dashboard />} />

          {/* Clientes */}
          <Route path="clients" element={<Clients />} />
          <Route path="clients/:id" element={<ClientDetail />} />

          {/* Préstamos */}
          <Route path="loans" element={<Loans />} />
          <Route path="loans/new" element={<LoanForm />} />
          <Route path="loans/:id" element={<LoanDetail />} />

          {/* Carteras */}
          <Route path="portfolios" element={<Portfolios />} />
          <Route path="portfolios/:id" element={<PortfolioDetail />} />

          {/* Usuarios y Reportes */}
          <Route path="users" element={<Users />} />
          <Route path="reports" element={<Reports />} />

          {/* ✅ NUEVAS RUTAS: Admin Global */}
          <Route path="admin" element={<GlobalDashboard />} />
          <Route path="admin/tenants" element={<TenantsList />} />
          <Route path="admin/plans" element={<PlansList />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;