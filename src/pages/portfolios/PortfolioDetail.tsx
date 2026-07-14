import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, DollarSign, TrendingUp, TrendingDown, AlertTriangle, Users, Briefcase, MoveRight } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface PortfolioMetrics {
  totalPortfolio: number;
  activePortfolio: number;
  overduePortfolio: number;
  par30: number;
  par60: number;
  par90: number;
  totalLoans: number;
  activeLoans: number;
  overdueLoans: number;
  completedLoans: number;
  defaultRate: number;
}

interface Client {
  id: string;
  fullName: string;
  dpiOrId: string;
  phone: string;
  address: string;
}

interface Portfolio {
  id: string;
  name: string;
  description: string;
  assignedUserName: string | null;
}

interface PortfolioOption {
  id: string;
  name: string;
}

export function PortfolioDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [portfolios, setPortfolios] = useState<PortfolioOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [targetPortfolioId, setTargetPortfolioId] = useState('');

  useEffect(() => {
    if (id) {
      loadData(id);
      loadPortfolios();
    }
  }, [id]);

  const loadData = async (portfolioId: string) => {
    try {
      const [metricsRes, clientsRes, portfolioRes] = await Promise.all([
        api.get(`/portfolios/${portfolioId}/metrics`),
        api.get(`/portfolios/${portfolioId}/clients`),
        api.get(`/portfolios/${portfolioId}`),
      ]);
      setMetrics(metricsRes.data);
      setClients(clientsRes.data);
      setPortfolio(portfolioRes.data);
    } catch (error) {
      console.error('Error loading portfolio detail:', error);
      toast.error('Error al cargar el detalle de la cartera');
    } finally {
      setLoading(false);
    }
  };

  const loadPortfolios = async () => {
    try {
      const response = await api.get('/portfolios');
      setPortfolios(response.data.filter((p: PortfolioOption) => p.id !== id));
    } catch (error) {
      console.error('Error loading portfolios:', error);
    }
  };

  const handleTransfer = async () => {
    if (!selectedClient || !targetPortfolioId) {
      toast.error('Selecciona un cliente y una cartera destino');
      return;
    }

    try {
      await api.post('/portfolios/assign-client', {
        clientId: selectedClient.id,
        portfolioId: targetPortfolioId,
      });
      toast.success(`Cliente ${selectedClient.fullName} transferido correctamente`);
      setIsTransferModalOpen(false);
      setSelectedClient(null);
      setTargetPortfolioId('');
      if (id) loadData(id);
    } catch (error: any) {
      console.error('Error transferring client:', error);
      toast.error(error.response?.data?.message || 'Error al transferir el cliente');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando detalle de la cartera...</p>
      </div>
    );
  }

  if (!portfolio || !metrics) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Cartera no encontrada</p>
        <Button onClick={() => navigate('/portfolios')} className="mt-4">
          Volver a Carteras
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/portfolios')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{portfolio.name}</h1>
          <p className="text-gray-500 mt-1">
            {portfolio.description || 'Detalle de la cartera'}
            {portfolio.assignedUserName && ` | Cobrador: ${portfolio.assignedUserName}`}
          </p>
        </div>
      </div>

      {/* Métricas de la Cartera */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cartera Total</CardTitle>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(metrics.totalPortfolio)}</div>
            <p className="text-xs text-gray-500 mt-1">{metrics.totalLoans} préstamos totales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cartera Activa</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(metrics.activePortfolio)}</div>
            <p className="text-xs text-gray-500 mt-1">{metrics.activeLoans} préstamos activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Cartera Vencida</CardTitle>
            <TrendingDown className="w-4 h-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(metrics.overduePortfolio)}</div>
            <p className="text-xs text-gray-500 mt-1">{metrics.overdueLoans} préstamos vencidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Morosidad</CardTitle>
            <AlertTriangle className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{metrics.defaultRate?.toFixed(2) || '0.00'}%</div>
            <p className="text-xs text-gray-500 mt-1">{metrics.completedLoans} préstamos completados</p>
          </CardContent>
        </Card>
      </div>

      {/* PAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-yellow-700">PAR 30 días</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-yellow-600">{formatCurrency(metrics.par30)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-orange-700">PAR 60 días</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-orange-600">{formatCurrency(metrics.par60)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-red-700">PAR 90 días</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-red-600">{formatCurrency(metrics.par90)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Clientes en la Cartera */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Clientes en esta Cartera ({clients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay clientes asignados a esta cartera
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>DUI</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.fullName}</TableCell>
                    <TableCell>{client.dpiOrId}</TableCell>
                    <TableCell>{client.phone}</TableCell>
                    <TableCell>{client.address}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedClient(client);
                          setIsTransferModalOpen(true);
                        }}
                      >
                        <MoveRight className="w-4 h-4 mr-1" />
                        Transferir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de Transferencia */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent className="max-w-md" style={{ overflow: 'visible' }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Transferir Cliente
            </DialogTitle>
            <DialogDescription>
              Transfiere el cliente y sus préstamos a otra cartera.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-900">{selectedClient?.fullName}</p>
              <p className="text-xs text-gray-500">DUI: {selectedClient?.dpiOrId}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Cartera Destino</label>
              <Select value={targetPortfolioId} onValueChange={setTargetPortfolioId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una cartera" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-50 bg-white border border-gray-200 shadow-lg" sideOffset={4}>
                  {portfolios.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTransferModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleTransfer} disabled={!targetPortfolioId}>
              Transferir Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}