import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Eye, Search, CreditCard, TrendingUp, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Loan {
  id: string;
  clientId: string;
  clientName: string;
  principalAmount: number;
  interestRate: number;
  termMonths: number;
  status: string;
  currentBalance: number;
  openingDate: string;
  createdAt: string;
}

export function Loans() {
  const navigate = useNavigate();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadLoans();
  }, [statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadLoans();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadLoans = async () => {
    try {
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search) params.search = search;

      const response = await api.get('/loans', { params });
      setLoans(response.data);
    } catch (error) {
      console.error('Error loading loans:', error);
      toast.error('Error al cargar los préstamos');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800 hover:bg-green-100',
      PENDING: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
      DEFAULTED: 'bg-red-100 text-red-800 hover:bg-red-100',
      PAID: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
    };
    const labels: Record<string, string> = {
      ACTIVE: 'Activo',
      PENDING: 'Pendiente',
      DEFAULTED: 'Vencido',
      PAID: 'Pagado',
    };
    return (
      <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando préstamos...</p>
      </div>
    );
  }

  // Calcular métricas
  const totalLoans = loans.length;
  const activeLoans = loans.filter(l => l.status === 'ACTIVE').length;
  const totalPortfolio = loans.reduce((sum, loan) => sum + loan.principalAmount, 0);
  const totalBalance = loans.reduce((sum, loan) => sum + loan.currentBalance, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Préstamos</h1>
          <p className="text-gray-500 mt-1">Gestión de préstamos de la financiera</p>
        </div>
        <Button onClick={() => navigate('/loans/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Préstamo
        </Button>
      </div>

      {/* Métricas Rápidas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Total Préstamos</p>
                <p className="text-2xl font-bold">{totalLoans}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Activos</p>
                <p className="text-2xl font-bold">{activeLoans}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">Cartera Total</p>
                <p className="text-2xl font-bold">{formatCurrency(totalPortfolio)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-500">Saldo Pendiente</p>
                <p className="text-2xl font-bold">{formatCurrency(totalBalance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-50 bg-white border border-gray-200 shadow-lg">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ACTIVE">Activos</SelectItem>
                <SelectItem value="PENDING">Pendientes</SelectItem>
                <SelectItem value="DEFAULTED">Vencidos</SelectItem>
                <SelectItem value="PAID">Pagados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Préstamos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Lista de Préstamos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loans.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay préstamos registrados
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>Tasa</TableHead>
                  <TableHead>Plazo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell className="font-medium">{loan.clientName}</TableCell>
                    <TableCell>{formatCurrency(loan.principalAmount)}</TableCell>
                    <TableCell>{formatCurrency(loan.currentBalance)}</TableCell>
                    <TableCell>{loan.interestRate}%</TableCell>
                    <TableCell>{loan.termMonths} meses</TableCell>
                    <TableCell>{getStatusBadge(loan.status)}</TableCell>
                    <TableCell>{formatDate(loan.openingDate || loan.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/clients/${loan.clientId}`)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="text-sm text-gray-500">
        Mostrando {loans.length} préstamo(s)
      </div>
    </div>
  );
}