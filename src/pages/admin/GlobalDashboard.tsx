import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, Users, DollarSign, TrendingUp, AlertCircle, 
  CheckCircle, Clock, PieChart as PieChartIcon 
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend 
} from 'recharts';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { GlobalDashboardStats } from '@/types';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export function GlobalDashboard() {
  const [stats, setStats] = useState<GlobalDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await api.get('/admin/global/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Error loading global dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando dashboard global...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">Error al cargar el dashboard global</p>
      </div>
    );
  }

  const planChartData = Object.entries(stats.tenantsByPlan).map(([name, value]) => ({
    name,
    value,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Dashboard Global</h1>
        <p className="text-gray-500 mt-1">Resumen general de la plataforma SaaS</p>
      </div>

      {/* Métricas Principales */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Tenants Activos</CardTitle>
            <Building2 className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.activeTenants}</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.suspendedTenants} suspendidos · {stats.cancelledTenants} cancelados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Usuarios Totales</CardTitle>
            <Users className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.totalUsers}</div>
            <p className="text-xs text-gray-500 mt-1">En toda la plataforma</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">MRR (Ingresos)</CardTitle>
            <DollarSign className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(stats.monthlyRecurringRevenue)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Ingreso mensual recurrente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Cartera Total</CardTitle>
            <TrendingUp className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(stats.totalPortfolioValue)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Valor total de préstamos activos</p>
          </CardContent>
        </Card>
      </div>

      {/* Segunda fila de métricas */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTenants}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge className="bg-green-100 text-green-800">
                {stats.activeTenants} activos
              </Badge>
              <Badge className="bg-red-100 text-red-800">
                {stats.suspendedTenants} suspendidos
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">En Trial</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.trialTenants}</div>
            <p className="text-xs text-gray-500 mt-1">Tenants en período de prueba</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Planes Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(stats.tenantsByPlan).length}</div>
            <p className="text-xs text-gray-500 mt-1">Planes con al menos 1 tenant</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico y Alertas */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Gráfico de Distribución de Planes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="w-5 h-5" />
              Distribución por Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {planChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={planChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {planChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                Sin datos de planes asignados
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alertas de Trials Expirando */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Trials Próximos a Expirar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.expiringTrials.length > 0 ? (
              <div className="space-y-3">
                {stats.expiringTrials.map((alert, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-amber-600" />
                      <div>
                        <p className="font-medium text-gray-900">{alert.tenantName}</p>
                        <p className="text-sm text-gray-500">{alert.message}</p>
                      </div>
                    </div>
                    <Badge className="bg-amber-100 text-amber-700">
                      {alert.daysRemaining} días
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                  <p>No hay trials próximos a expirar 🎉</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}