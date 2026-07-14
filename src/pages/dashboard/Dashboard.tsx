import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, FileText, TrendingUp } from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

export function Dashboard() {
  const [stats, setStats] = useState({
    totalLoans: 0,
    totalClients: 0,
    totalPortfolio: 0,
    activeLoans: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [loansRes, clientsRes] = await Promise.all([
        api.get('/loans'),
        api.get('/clients'),
      ]);

      const loans = loansRes.data;
      const clients = clientsRes.data;

      setStats({
        totalLoans: loans.length,
        totalClients: clients.length,
        totalPortfolio: loans.reduce((sum: number, loan: any) => sum + loan.principalAmount, 0),
        activeLoans: loans.filter((l: any) => l.status === 'ACTIVE').length,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando estadísticas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 mt-1">Resumen general de tu financiera</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Préstamos</CardTitle>
            <FileText className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLoans}</div>
            <p className="text-xs text-gray-500 mt-1">{stats.activeLoans} activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Clientes</CardTitle>
            <Users className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClients}</div>
            <p className="text-xs text-gray-500 mt-1">Clientes registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Cartera Total</CardTitle>
            <DollarSign className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalPortfolio)}</div>
            <p className="text-xs text-gray-500 mt-1">Monto total prestado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Tasa de Activos</CardTitle>
            <TrendingUp className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalLoans > 0 
                ? ((stats.activeLoans / stats.totalLoans) * 100).toFixed(1)
                : 0}%
            </div>
            <p className="text-xs text-gray-500 mt-1">Préstamos activos</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}