import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, CreditCard, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { SaasPlan, PlanCreateRequest } from '@/types';

export function PlansList() {
  const [plans, setPlans] = useState<SaasPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<SaasPlan | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<PlanCreateRequest>({
    name: '',
    description: '',
    monthlyPrice: 0,
    trialDays: 15,
    maxUsers: 5,
    maxActiveLoans: 100,
    maxPortfolioVolume: 50000,
    maxCollectors: 3,
    maxClients: 200,
    maxCustomRoles: 1,
    maxCustomInterestRates: 2,
    features: '{}',
    supportLevel: 'EMAIL',
  });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const response = await api.get('/admin/plans');
      setPlans(response.data);
    } catch (error) {
      console.error('Error loading plans:', error);
      toast.error('Error al cargar los planes');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (plan?: SaasPlan) => {
    if (plan) {
      setIsEditing(true);
      setCurrentPlan(plan);
      setFormData({
        name: plan.name,
        description: plan.description || '',
        monthlyPrice: plan.monthlyPrice,
        trialDays: plan.trialDays || 15,
        maxUsers: plan.maxUsers,
        maxActiveLoans: plan.maxActiveLoans,
        maxPortfolioVolume: plan.maxPortfolioVolume,
        maxCollectors: plan.maxCollectors,
        maxClients: plan.maxClients,
        maxCustomRoles: plan.maxCustomRoles,
        maxCustomInterestRates: plan.maxCustomInterestRates,
        features: plan.features || '{}',
        supportLevel: plan.supportLevel || 'EMAIL',
      });
    } else {
      setIsEditing(false);
      setCurrentPlan(null);
      setFormData({
        name: '',
        description: '',
        monthlyPrice: 0,
        trialDays: 15,
        maxUsers: 5,
        maxActiveLoans: 100,
        maxPortfolioVolume: 50000,
        maxCollectors: 3,
        maxClients: 200,
        maxCustomRoles: 1,
        maxCustomInterestRates: 2,
        features: '{}',
        supportLevel: 'EMAIL',
      });
    }
    setIsModalOpen(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name.includes('Price') || name.includes('Volume') ? parseFloat(value) || 0 : 
              name.includes('max') || name.includes('Days') ? parseInt(value) || 0 : value,
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || formData.monthlyPrice <= 0) {
      toast.error('Nombre y precio mensual son obligatorios');
      return;
    }

    setIsSaving(true);
    try {
      if (isEditing && currentPlan) {
        await api.put(`/admin/plans/${currentPlan.id}`, formData);
        toast.success('Plan actualizado correctamente');
      } else {
        await api.post('/admin/plans', formData);
        toast.success('Plan creado correctamente');
      }
      setIsModalOpen(false);
      loadPlans();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al guardar el plan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (plan: SaasPlan) => {
    if (!confirm(`¿Estás seguro de eliminar el plan "${plan.name}"?`)) return;

    try {
      await api.delete(`/admin/plans/${plan.id}`);
      toast.success('Plan eliminado correctamente');
      loadPlans();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar el plan');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando planes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Planes SaaS</h1>
          <p className="text-gray-500 mt-1">Gestión de planes y precios de la plataforma</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Plan
        </Button>
      </div>

      {/* Métricas Rápidas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Total Planes</p>
                <p className="text-2xl font-bold">{plans.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Planes Activos</p>
                <p className="text-2xl font-bold">
                  {plans.filter((p) => p.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-sm text-gray-500">Planes Inactivos</p>
                <p className="text-2xl font-bold">
                  {plans.filter((p) => !p.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Planes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Lista de Planes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No hay planes registrados</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Precio/Mes</TableHead>
                  <TableHead>Días Trial</TableHead>
                  <TableHead>Máx. Usuarios</TableHead>
                  <TableHead>Máx. Préstamos</TableHead>
                  <TableHead>Máx. Clientes</TableHead>
                  <TableHead>Soporte</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell className="font-bold text-green-600">
                      {formatCurrency(plan.monthlyPrice)}
                    </TableCell>
                    <TableCell>{plan.trialDays || 0} días</TableCell>
                    <TableCell>{plan.maxUsers}</TableCell>
                    <TableCell>{plan.maxActiveLoans}</TableCell>
                    <TableCell>{plan.maxClients}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{plan.supportLevel || 'EMAIL'}</Badge>
                    </TableCell>
                    <TableCell>
                      {plan.isActive ? (
                        <Badge className="bg-green-100 text-green-800">Activo</Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800">Inactivo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenModal(plan)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(plan)}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Plan' : 'Nuevo Plan SaaS'}</DialogTitle>
            <DialogDescription>
              {isEditing ? 'Modifica la información del plan' : 'Crea un nuevo plan para tus tenants'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Plan *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ej: Plan Básico"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="monthlyPrice">Precio Mensual ($) *</Label>
                <Input
                  id="monthlyPrice"
                  name="monthlyPrice"
                  type="number"
                  step="0.01"
                  value={formData.monthlyPrice}
                  onChange={handleChange}
                  placeholder="29.99"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Input
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Descripción del plan"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="trialDays">Días de Trial</Label>
                <Input
                  id="trialDays"
                  name="trialDays"
                  type="number"
                  value={formData.trialDays}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportLevel">Nivel de Soporte</Label>
                <Select
                  value={formData.supportLevel}
                  onValueChange={(value) => setFormData({ ...formData, supportLevel: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-white">
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="CHAT">Chat</SelectItem>
                    <SelectItem value="PHONE">Teléfono</SelectItem>
                    <SelectItem value="PREMIUM">Premium 24/7</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-900 mb-3">Límites del Plan</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxUsers">Máx. Usuarios</Label>
                  <Input
                    id="maxUsers"
                    name="maxUsers"
                    type="number"
                    value={formData.maxUsers}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxCollectors">Máx. Cobradores</Label>
                  <Input
                    id="maxCollectors"
                    name="maxCollectors"
                    type="number"
                    value={formData.maxCollectors}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxClients">Máx. Clientes</Label>
                  <Input
                    id="maxClients"
                    name="maxClients"
                    type="number"
                    value={formData.maxClients}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxActiveLoans">Máx. Préstamos Activos</Label>
                  <Input
                    id="maxActiveLoans"
                    name="maxActiveLoans"
                    type="number"
                    value={formData.maxActiveLoans}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxPortfolioVolume">Máx. Volumen de Cartera ($)</Label>
                  <Input
                    id="maxPortfolioVolume"
                    name="maxPortfolioVolume"
                    type="number"
                    step="0.01"
                    value={formData.maxPortfolioVolume}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxCustomRoles">Máx. Roles Personalizados</Label>
                  <Input
                    id="maxCustomRoles"
                    name="maxCustomRoles"
                    type="number"
                    value={formData.maxCustomRoles}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxCustomInterestRates">Máx. Tasas de Interés</Label>
                  <Input
                    id="maxCustomInterestRates"
                    name="maxCustomInterestRates"
                    type="number"
                    value={formData.maxCustomInterestRates}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}