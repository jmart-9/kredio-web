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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  return token ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="clients" element={<Clients />} />
          <Route path="clients/:id" element={<ClientDetail />} />
          <Route path="/portfolios" element={<Portfolios />} />
          <Route path="/portfolios/:id" element={<PortfolioDetail />} />
          <Route path="/loans/new" element={<LoanForm />} />
          <Route path="/loans" element={<Loans />} />
          <Route path="portfolio" element={<div className="text-2xl font-bold">Cartera - Próximamente</div>} />
          <Route path="users" element={<div className="text-2xl font-bold">Usuarios - Próximamente</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;