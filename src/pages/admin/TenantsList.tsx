import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Building2, Eye, Trash2, Pause, Play, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { Tenant, TenantCreateRequest, SaasPlan } from '@/types';

export function TenantsList() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<SaasPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAssignPlanModalOpen, setIsAssignPlanModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<TenantCreateRequest>({
    name: '',
    subdomain: '',
    adminEmail: '',
    adminPassword: 'admin123',
    adminFullName: '',
  });
  const [planFormData, setPlanFormData] = useState({
    planId: '',
    planEndDate: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tenantsRes, plansRes] = await Promise.all([
        api.get('/admin/global/tenants'),
        api.get('/admin/plans'),
      ]);
      setTenants(tenantsRes.data);
      setPlans(plansRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateSubmit = async () => {
    if (!formData.name.trim() || !formData.subdomain.trim() || !formData.adminEmail.trim()) {
      toast.error('Nombre, subdominio y email son obligatorios');
      return;
    }

    setIsSaving(true);
    try {
      await api.post('/admin/global/tenants', formData);
      toast.success('Tenant creado correctamente');
      setIsCreateModalOpen(false);
      setFormData({
        name: '',
        subdomain: '',
        adminEmail: '',
        adminPassword: 'admin123',
        adminFullName: '',
      });
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al crear el tenant');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (tenant: Tenant, newStatus: 'ACTIVE' | 'SUSPENDED') => {
    try {
      await api.put(`/admin/global/tenants/${tenant.id}/status?status=${newStatus}`);
      toast.success(`Tenant ${newStatus === 'ACTIVE' ? 'activado' : 'suspendido'} correctamente`);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al cambiar el estado');
    }
  };

  const handleDelete = async (tenant: Tenant) => {
    if (!confirm(`¿Estás seguro de eliminar el tenant "${tenant.name}"? Esta acción eliminará todos sus datos.`)) {
      return;
    }

    try {
      await api.delete(`/admin/global/tenants/${tenant.id}`);
      toast.success('Tenant eliminado correctamente');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar el tenant');
    }
  };

  const openAssignPlanModal = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setPlanFormData({
      planId: tenant.planId || '',
      planEndDate: tenant.planEndDate || '',
    });
    setIsAssignPlanModalOpen(true);
  };

  const handleAssignPlan = async () => {
    if (!selectedTenant || !planFormData.planId || !planFormData.planEndDate) {
      toast.error('Plan y fecha de fin son obligatorios');
      return;
    }

    setIsSaving(true);
    try {
      await api.put(
        `/admin/global/tenants/${selectedTenant.id}/plan?planId=${planFormData.planId}&planEndDate=${planFormData.planEndDate}`
      );
      toast.success('Plan asignado correctamente');
      setIsAssignPlanModalOpen(false);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al asignar el plan');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      SUSPENDED: 'bg-red-100 text-red-800',
      CANCELLED: 'bg-gray-100 text-gray-800',
    };
    const labels: Record<string, string> = {
      ACTIVE: 'Activo',
      SUSPENDED: 'Suspendido',
      CANCELLED: 'Cancelado',
    };
    return <Badge className={variants[status] || 'bg-gray-100'}>{labels[status] || status}</Badge>;
  };

  const filteredTenants = tenants.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.subdomain.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando tenants...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Tenants</h1>
          <p className="text-gray-500 mt-1">Gestión de financieras en la plataforma</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Tenant
        </Button>
      </div>

      {/* Métricas Rápidas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Total Tenants</p>
                <p className="text-2xl font-bold">{tenants.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Play className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Activos</p>
                <p className="text-2xl font-bold">
                  {tenants.filter((t) => t.status === 'ACTIVE').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Pause className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-sm text-gray-500">Suspendidos</p>
                <p className="text-2xl font-bold">
                  {tenants.filter((t) => t.status === 'SUSPENDED').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre o subdominio..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Tenants */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Lista de Tenants
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTenants.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No hay tenants registrados</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Subdominio</TableHead>
                  <TableHead>Schema</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Trial</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Fin Plan</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-medium">{tenant.name}</TableCell>
                    <TableCell>{tenant.subdomain}</TableCell>
                    <TableCell className="text-xs text-gray-500">{tenant.schemaName}</TableCell>
                    <TableCell>{getStatusBadge(tenant.status)}</TableCell>
                    <TableCell>
                      {tenant.isTrial ? (
                        <Badge className="bg-blue-100 text-blue-800">Sí</Badge>
                      ) : (
                        <Badge variant="outline">No</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {tenant.planId ? (
                        <Badge variant="outline">Asignado</Badge>
                      ) : (
                        <span className="text-gray-400 text-xs">Sin plan</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {tenant.planEndDate ? formatDate(tenant.planEndDate) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(tenant.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openAssignPlanModal(tenant)}
                          title="Asignar plan"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {tenant.status === 'ACTIVE' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-orange-600 hover:text-orange-700"
                            onClick={() => handleStatusChange(tenant, 'SUSPENDED')}
                            title="Suspender"
                          >
                            <Pause className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => handleStatusChange(tenant, 'ACTIVE')}
                            title="Activar"
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(tenant)}
                          title="Eliminar"
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

      {/* Modal de Creación */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Tenant</DialogTitle>
            <DialogDescription>
              Crea una nueva financiera con su propio schema aislado.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleCreateChange}
                placeholder="Ej: Financiera Demo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subdomain">Subdominio *</Label>
              <Input
                id="subdomain"
                name="subdomain"
                value={formData.subdomain}
                onChange={handleCreateChange}
                placeholder="Ej: demo"
              />
              <p className="text-xs text-gray-500">Se usará para crear el schema: tenant_{'{subdomain}'}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Email del Admin *</Label>
              <Input
                id="adminEmail"
                name="adminEmail"
                type="email"
                value={formData.adminEmail}
                onChange={handleCreateChange}
                placeholder="admin@financiera.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminFullName">Nombre del Admin *</Label>
              <Input
                id="adminFullName"
                name="adminFullName"
                value={formData.adminFullName}
                onChange={handleCreateChange}
                placeholder="Admin de la Financiera"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminPassword">Contraseña Inicial</Label>
              <Input
                id="adminPassword"
                name="adminPassword"
                type="password"
                value={formData.adminPassword}
                onChange={handleCreateChange}
              />
              <p className="text-xs text-gray-500">Contraseña por defecto: admin123</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateSubmit} disabled={isSaving}>
              {isSaving ? 'Creando...' : 'Crear Tenant'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Asignar Plan */}
      <Dialog open={isAssignPlanModalOpen} onOpenChange={setIsAssignPlanModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar Plan a Tenant</DialogTitle>
            <DialogDescription className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="w-4 h-4" />
              Tenant: <strong>{selectedTenant?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="planId">Plan SaaS *</Label>
              <Select
                value={planFormData.planId}
                onValueChange={(value) => setPlanFormData({ ...planFormData, planId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un plan" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-white">
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - {formatCurrency(plan.monthlyPrice)}/mes
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="planEndDate">Fecha de Fin del Plan *</Label>
              <Input
                id="planEndDate"
                type="date"
                value={planFormData.planEndDate}
                onChange={(e) => setPlanFormData({ ...planFormData, planEndDate: e.target.value })}
              />
              <p className="text-xs text-gray-500">Formato: YYYY-MM-DD</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignPlanModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAssignPlan} disabled={isSaving}>
              {isSaving ? 'Asignando...' : 'Asignar Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}