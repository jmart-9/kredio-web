import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Users, FileText, TrendingUp, AlertCircle, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

interface UpcomingPayment {
  loanId: string;
  clientName: string;
  dueDate: string;
  amount: number;
  installmentNumber: number;
}

interface MonthlyData {
  month: string;
  disbursed: number;
  collected: number;
}

interface DashboardStats {
  totalClients: number;
  totalLoans: number;
  activeLoans: number;
  paidLoans: number;
  overdueLoans: number;
  totalPortfolio: number;
  activePortfolio: number;
  overdueAmount: number;
  collectedAmount: number;
  upcomingPaymentsAmount: number;
  upcomingPaymentsCount: number;
  upcomingPayments: UpcomingPayment[];
  monthlyLoans: MonthlyData[];
  loansByStatus: Record<string, number>;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await api.get('/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      loadBasicStats();
    } finally {
      setLoading(false);
    }
  };

  const loadBasicStats = async () => {
    try {
      const [loansRes, clientsRes] = await Promise.all([
        api.get('/loans'),
        api.get('/clients'),
      ]);

      const loans = loansRes.data;
      const clients = clientsRes.data;

      const activeLoans = loans.filter((l: any) => l.status === 'ACTIVE').length;
      const paidLoans = loans.filter((l: any) => l.status === 'PAID').length;
      const overdueLoans = loans.filter((l: any) => l.status === 'DEFAULTED').length;

      setStats({
        totalClients: clients.length,
        totalLoans: loans.length,
        activeLoans,
        paidLoans,
        overdueLoans,
        totalPortfolio: loans.reduce((sum: number, loan: any) => sum + loan.principalAmount, 0),
        activePortfolio: loans.filter((l: any) => l.status === 'ACTIVE').reduce((sum: number, loan: any) => sum + loan.currentBalance, 0),
        overdueAmount: 0,
        collectedAmount: 0,
        upcomingPaymentsAmount: 0,
        upcomingPaymentsCount: 0,
        upcomingPayments: [],
        monthlyLoans: [],
        loansByStatus: {
          ACTIVE: activeLoans,
          PAID: paidLoans,
          DEFAULTED: overdueLoans,
        },
      });
    } catch (error) {
      console.error('Error loading basic stats:', error);
    }
  };

  const handleUpdateOverdue = async () => {
    try {
      const response = await api.post('/overdue/update');
      const { updatedSchedules } = response.data;
      
      if (updatedSchedules > 0) {
        alert(`✅ Se actualizaron ${updatedSchedules} cuotas vencidas`);
        loadStats();
      } else {
        alert('ℹ️ No hay cuotas vencidas para actualizar');
      }
    } catch (error) {
      console.error('Error updating overdue:', error);
      alert('❌ Error al actualizar morosidad');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando estadísticas...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500">Error al cargar el dashboard</p>
      </div>
    );
  }

  const barChartData = stats.monthlyLoans.map(m => ({
    name: m.month,
    'Desembolsado': m.disbursed,
    'Recaudado': m.collected,
  }));

  const pieChartData = Object.entries(stats.loansByStatus).map(([status, count]) => ({
    name: status === 'ACTIVE' ? 'Activos' : status === 'PAID' ? 'Pagados' : status === 'DEFAULTED' ? 'Morosos' : status,
    value: count,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 mt-1">Resumen general de tu financiera</p>
        </div>
        <button
          onClick={handleUpdateOverdue}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
        >
          🔄 Actualizar Morosidad
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Préstamos</CardTitle>
            <FileText className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLoans}</div>
            <p className="text-xs text-gray-500 mt-1">{stats.activeLoans} activos · {stats.paidLoans} pagados</p>
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
            <CardTitle className="text-sm font-medium text-gray-500">Cartera Activa</CardTitle>
            <TrendingUp className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.activePortfolio)}</div>
            <p className="text-xs text-gray-500 mt-1">Saldo pendiente actual</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Recaudado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.collectedAmount)}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Mora Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.overdueAmount)}</div>
            <p className="text-xs text-gray-500 mt-1">{stats.overdueLoans} préstamos en mora</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Próximos Vencimientos (7 días)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.upcomingPaymentsAmount)}</div>
            <p className="text-xs text-gray-500 mt-1">{stats.upcomingPaymentsCount} cuotas por cobrar</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Préstamos por Mes (Últimos 6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            {barChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  {/* ✅ CORREGIDO: Manejar undefined en value */}
                  <Tooltip formatter={(value) => formatCurrency(Number(value) || 0)} />
                  <Legend />
                  <Bar dataKey="Desembolsado" fill="#3b82f6" />
                  <Bar dataKey="Recaudado" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                Sin datos disponibles
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribución de Préstamos por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                Sin datos disponibles
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {stats.upcomingPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Próximos Vencimientos (7 días)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.upcomingPayments.map((payment, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{payment.clientName}</p>
                      <p className="text-xs text-gray-500">
                        Cuota #{payment.installmentNumber} · Vence: {formatDate(payment.dueDate)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{formatCurrency(payment.amount)}</p>
                    <p className="text-xs text-gray-500">Pendiente</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {stats.overdueAmount > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
            <div>
              <p className="font-semibold text-red-900">Atención: Cartera en Mora</p>
              <p className="text-sm text-red-700">
                Tienes {formatCurrency(stats.overdueAmount)} en cuotas vencidas correspondientes a {stats.overdueLoans} préstamo(s).
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}