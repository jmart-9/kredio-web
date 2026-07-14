import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Briefcase, Edit, Trash2, Eye, DollarSign, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface Portfolio {
  id: string;
  name: string;
  description: string;
  assignedUserId: string | null;
  assignedUserName: string | null;
  isActive: boolean;
  totalClients: number;
  activeLoans: number;
  totalBalance: number;
  createdAt: string;
}

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

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export function Portfolios() {
  const navigate = useNavigate();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [metrics, setMetrics] = useState<PortfolioMetrics | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para el modal de crear/editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPortfolio, setCurrentPortfolio] = useState<Portfolio | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    assignedUserId: '',
  });

  // Estados para el modal de eliminación
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [portfolioToDelete, setPortfolioToDelete] = useState<Portfolio | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [portfoliosRes, metricsRes, usersRes] = await Promise.all([
        api.get('/portfolios'),
        api.get('/portfolios/metrics'),
        api.get('/users'),
      ]);
      setPortfolios(portfoliosRes.data);
      setMetrics(metricsRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (portfolio?: Portfolio) => {
    if (portfolio) {
      setIsEditing(true);
      setCurrentPortfolio(portfolio);
      setFormData({
        name: portfolio.name,
        description: portfolio.description || '',
        assignedUserId: portfolio.assignedUserId || '',
      });
    } else {
      setIsEditing(false);
      setCurrentPortfolio(null);
      setFormData({ name: '', description: '', assignedUserId: '' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        assignedUserId: formData.assignedUserId || null,
      };

      if (isEditing && currentPortfolio) {
        await api.put(`/portfolios/${currentPortfolio.id}`, payload);
        toast.success('Cartera actualizada correctamente');
      } else {
        await api.post('/portfolios', payload);
        toast.success('Cartera creada correctamente');
      }

      setIsModalOpen(false);
      loadData();
    } catch (error: any) {
      console.error('Error saving portfolio:', error);
      toast.error(error.response?.data?.message || 'Error al guardar la cartera');
    }
  };

  const handleOpenDeleteModal = (portfolio: Portfolio) => {
    setPortfolioToDelete(portfolio);
    setDeleteConfirmText('');
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== 'ELIMINAR') {
      toast.error('Debes escribir "ELIMINAR" para confirmar');
      return;
    }

    if (!portfolioToDelete) return;

    setIsDeleting(true);
    try {
      await api.delete(`/portfolios/${portfolioToDelete.id}`);
      toast.success('Cartera eliminada correctamente');
      setIsDeleteModalOpen(false);
      setDeleteConfirmText('');
      setPortfolioToDelete(null);
      loadData();
    } catch (error: any) {
      console.error('Error deleting portfolio:', error);
      toast.error(error.response?.data?.message || 'Error al eliminar la cartera');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando carteras...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Carteras</h1>
          <p className="text-gray-500 mt-1">Gestión y métricas de carteras</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Cartera
        </Button>
      </div>

      {/* Dashboard de Métricas Consolidadas */}
      {metrics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Cartera Total</CardTitle>
                <DollarSign className="w-4 h-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(metrics.totalPortfolio)}
                </div>
                <p className="text-xs text-gray-500 mt-1">{metrics.totalLoans} préstamos totales</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Cartera Activa</CardTitle>
                <TrendingUp className="w-4 h-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(metrics.activePortfolio)}
                </div>
                <p className="text-xs text-gray-500 mt-1">{metrics.activeLoans} préstamos activos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Cartera Vencida</CardTitle>
                <TrendingDown className="w-4 h-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(metrics.overduePortfolio)}
                </div>
                <p className="text-xs text-gray-500 mt-1">{metrics.overdueLoans} préstamos vencidos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Tasa de Morosidad</CardTitle>
                <AlertTriangle className="w-4 h-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {metrics.defaultRate?.toFixed(2) || '0.00'}%
                </div>
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
        </>
      )}

      {/* Lista de Carteras */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Carteras de la Financiera
          </CardTitle>
        </CardHeader>
        <CardContent>
          {portfolios.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay carteras registradas
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Cobrador Asignado</TableHead>
                  <TableHead className="text-center">Clientes</TableHead>
                  <TableHead className="text-center">Préstamos Activos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {portfolios.map((portfolio) => (
                  <TableRow key={portfolio.id}>
                    <TableCell className="font-medium">{portfolio.name}</TableCell>
                    <TableCell>
                      {portfolio.assignedUserName || <span className="text-gray-400">Sin asignar</span>}
                    </TableCell>
                    <TableCell className="text-center">{portfolio.totalClients}</TableCell>
                    <TableCell className="text-center">{portfolio.activeLoans}</TableCell>
                    <TableCell>
                      <Badge className={portfolio.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {portfolio.isActive ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/portfolios/${portfolio.id}`)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenModal(portfolio)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDeleteModal(portfolio)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Modal de Crear/Editar */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md" style={{ overflow: 'visible' }}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Cartera' : 'Nueva Cartera'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Modifica la información de la cartera' : 'Completa la información de la nueva cartera'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Cartera Zona Norte"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción de la cartera"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignedUserId">Cobrador Asignado</Label>
              <Select
                value={formData.assignedUserId}
                onValueChange={(value) => setFormData({ ...formData, assignedUserId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un cobrador" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-50 bg-white border border-gray-200 shadow-lg" sideOffset={4}>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.fullName} ({user.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {isEditing ? 'Guardar Cambios' : 'Crear Cartera'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmación para Eliminar */}
      <Dialog 
        open={isDeleteModalOpen} 
        onOpenChange={(open) => {
          setIsDeleteModalOpen(open);
          if (!open) {
            setDeleteConfirmText('');
            setPortfolioToDelete(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Eliminar Cartera
            </DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. La cartera será marcada como inactiva.
            </DialogDescription>
          </DialogHeader>

          {/* Información de la cartera a eliminar */}
          {portfolioToDelete && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{portfolioToDelete.name}</p>
                  <p className="text-sm text-gray-500">
                    {portfolioToDelete.totalClients} clientes | {portfolioToDelete.activeLoans} préstamos activos
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Campo de confirmación */}
          <div className="space-y-2 mt-4">
            <Label htmlFor="deleteConfirm">
              Para confirmar, escribe <span className="font-bold text-red-600">ELIMINAR</span> en el campo de abajo:
            </Label>
            <Input
              id="deleteConfirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Escribe ELIMINAR aquí..."
              className="border-red-300 focus:border-red-500 focus:ring-red-500"
              autoComplete="off"
            />
          </div>

          {/* Advertencia */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
            <div className="flex items-start gap-2">
              <span className="text-red-600 text-lg">⚠️</span>
              <div>
                <p className="text-sm font-medium text-red-800">Advertencia</p>
                <p className="text-xs text-red-600 mt-1">
                  {portfolioToDelete && portfolioToDelete.totalClients > 0 
                    ? `No puedes eliminar esta cartera porque tiene ${portfolioToDelete.totalClients} clientes asignados. Transfiere los clientes primero.`
                    : 'La cartera será marcada como inactiva y no aparecerá en la lista.'}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeleteConfirmText('');
                setPortfolioToDelete(null);
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleDelete} 
              disabled={isDeleting || deleteConfirmText !== 'ELIMINAR' || (portfolioToDelete?.totalClients || 0) > 0}
              className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
            >
              {isDeleting ? 'Eliminando...' : 'Sí, Eliminar Cartera'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}