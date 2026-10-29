import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, Users, TrendingUp, AlertCircle, FileText, 
  RefreshCw, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

// ==========================================
// TIPOS DE DATOS
// ==========================================
interface MonthlyData {
  month: string;
  Desembolsado: number;
  Recaudado: number;
}

interface PieData {
  name: string;
  value: number;
}

interface DashboardStats {
  totalLoans: number;
  activeLoans: number;
  paidLoans: number;
  totalClients: number;
  totalPortfolio: number;
  activePortfolio: number;
  collectedAmount: number;
  overdueAmount: number;
  overdueLoans: number;
  upcomingPaymentsAmount: number;
  upcomingPaymentsCount: number;
  monthlyLoans: MonthlyData[];
  loansByStatus: Record<string, number>;
}

interface RecentLoan {
  id: string;
  clientName: string;
  principalAmount: number;
  currentBalance: number;
  status: string;
  createdAt: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export function Dashboard() {
  const navigate = useNavigate();
  
  // Estados de datos
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentLoans, setRecentLoans] = useState<RecentLoan[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // 1. Cargar estadísticas
      const statsRes = await api.get('/dashboard/stats');
      setStats(statsRes.data);

      // 2. Cargar préstamos recientes (Obtenemos un lote y paginamos en frontend)
      // Nota: Si tu backend ya soporta paginación (?page=1&limit=10), úsalo aquí.
      const loansRes = await api.get('/loans', { params: { limit: 100, sortBy: 'createdAt', order: 'desc' } });
      
      // Mapeamos para simplificar los datos de la tabla
      const mappedLoans = (loansRes.data || []).map((loan: any) => ({
        id: loan.id,
        clientName: loan.clientName || 'Cliente Desconocido', // Asegúrate que tu backend envíe esto o haz un join
        principalAmount: loan.principalAmount,
        currentBalance: loan.currentBalance,
        status: loan.status,
        createdAt: loan.createdAt,
      }));
      
      setRecentLoans(mappedLoans);
    } catch (error) {
      console.error('Error cargando dashboard:', error);
      toast.error('No se pudieron cargar las estadísticas del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOverdue = async () => {
    try {
      toast.loading('Actualizando morosidad...');
      await api.post('/dashboard/update-overdue');
      toast.dismiss();
      toast.success('✅ Morosidad actualizada correctamente');
      loadDashboardData(); // Recargar datos
    } catch (error) {
      toast.dismiss();
      toast.error('Error al actualizar la morosidad');
    }
  };

  // ==========================================
  // LÓGICA DE PAGINACIÓN
  // ==========================================
  const totalPages = Math.ceil(recentLoans.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = recentLoans.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleItemsPerPageChange = (value: string) => {
    setItemsPerPage(Number(value));
    setCurrentPage(1); // Volver a la primera página al cambiar el límite
  };

  // ==========================================
  // PROCESAMIENTO DE DATOS PARA GRÁFICAS
  // ==========================================
  const barChartData: MonthlyData[] = stats?.monthlyLoans?.map((m: any) => ({
    month: m.month,
    Desembolsado: m.disbursed || m.Desembolsado || 0,
    Recaudado: m.collected || m.Recaudado || 0,
  })) || [];

  const pieChartData: PieData[] = stats?.loansByStatus 
    ? Object.entries(stats.loansByStatus).map(([status, count]) => ({
        name: status === 'ACTIVE' ? 'Activos' : 
              status === 'PAID' ? 'Pagados' : 
              status === 'DEFAULTED' ? 'Morosos' : 
              status === 'PENDING' ? 'Pendientes' : status,
        value: count as number,
      }))
    : [];

  // ==========================================
  // RENDERIZADO: ESTADO DE CARGA
  // ==========================================
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-gray-500">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDERIZADO: DASHBOARD
  // ==========================================
  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 mt-1">Resumen general de tu financiera</p>
        </div>
        <Button onClick={handleUpdateOverdue} className="bg-orange-600 hover:bg-orange-700 text-white">
          <RefreshCw className="w-4 h-4 mr-2" /> Actualizar Morosidad
        </Button>
      </div>

      {/* ALERTA DE MORA (Condicional) */}
      {stats && stats.overdueAmount > 0 && (
        <Card className="border-l-4 border-l-red-500 bg-red-50">
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

      {/* TARJETAS DE ESTADÍSTICAS PRINCIPALES */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Préstamos</CardTitle>
            <FileText className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalLoans || 0}</div>
            <p className="text-xs text-gray-500 mt-1">{stats?.activeLoans || 0} activos · {stats?.paidLoans || 0} pagados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Clientes</CardTitle>
            <Users className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalClients || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Clientes registrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Cartera Total</CardTitle>
            <DollarSign className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.totalPortfolio || 0)}</div>
            <p className="text-xs text-gray-500 mt-1">Monto total prestado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total Cobrado</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats?.collectedAmount || 0)}</div>
            <p className="text-xs text-gray-500 mt-1">Histórico de recaudación</p>
          </CardContent>
        </Card>
      </div>

      {/* TARJETAS DE ESTADÍSTICAS SECUNDARIAS */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Cartera Activa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats?.activePortfolio || 0)}</div>
            <p className="text-xs text-gray-500 mt-1">Saldo pendiente actual</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Mora Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(stats?.overdueAmount || 0)}</div>
            <p className="text-xs text-gray-500 mt-1">{stats?.overdueLoans || 0} préstamos en mora</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Próximos Vencimientos (7 días)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(stats?.upcomingPaymentsAmount || 0)}</div>
            <p className="text-xs text-gray-500 mt-1">{stats?.upcomingPaymentsCount || 0} cuotas por cobrar</p>
          </CardContent>
        </Card>
      </div>

      {/* SECCIÓN DE GRÁFICAS */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Gráfica de Barras */}
        <Card>
          <CardHeader>
            <CardTitle>Préstamos por Mes (Últimos 6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            {barChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="Desembolsado" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Recaudado" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg">
                Sin datos disponibles para el gráfico
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfica Circular */}
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
                    label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} préstamos`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500 bg-gray-50 rounded-lg">
                Sin datos disponibles para el gráfico
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* TABLA DE PRÉSTAMOS RECIENTES CON PAGINACIÓN */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" /> Préstamos Recientes
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Mostrar:</span>
              <Select value={String(itemsPerPage)} onValueChange={handleItemsPerPageChange}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="10" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => navigate('/loans')}>
                Ver todos
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {currentItems.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No hay préstamos registrados aún</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Préstamo</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentItems.map((loan) => (
                      <TableRow key={loan.id}>
                        <TableCell className="font-mono text-xs text-gray-500">
                          {loan.id.substring(0, 8)}...
                        </TableCell>
                        <TableCell className="font-medium">{loan.clientName}</TableCell>
                        <TableCell className="text-right font-semibold text-blue-600">
                          {formatCurrency(loan.principalAmount)}
                        </TableCell>
                        <TableCell className="text-right text-gray-600">
                          {formatCurrency(loan.currentBalance)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={
                              loan.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200' :
                              loan.status === 'PAID' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              loan.status === 'DEFAULTED' ? 'bg-red-50 text-red-700 border-red-200' :
                              'bg-gray-50 text-gray-700 border-gray-200'
                            }
                          >
                            {loan.status === 'ACTIVE' ? 'Activo' : 
                             loan.status === 'PAID' ? 'Pagado' : 
                             loan.status === 'DEFAULTED' ? 'Vencido' : loan.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDate(loan.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => navigate(`/loans/${loan.id}`)}
                          >
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* CONTROLES DE PAGINACIÓN */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-gray-500">
                  Mostrando <span className="font-medium">{indexOfFirstItem + 1}</span> a{' '}
                  <span className="font-medium">
                    {Math.min(indexOfLastItem, recentLoans.length)}
                  </span>{' '}
                  de <span className="font-medium">{recentLoans.length}</span> resultados
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                  </Button>
                  
                  {/* Números de página (simplificado para no saturar) */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      // Lógica simple para mostrar páginas cercanas a la actual
                      let pageNum = i + 1;
                      if (totalPages > 5 && currentPage > 3) {
                        pageNum = currentPage - 2 + i;
                      }
                      if (pageNum > totalPages) return null;
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || totalPages === 0}
                  >
                    Siguiente <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}