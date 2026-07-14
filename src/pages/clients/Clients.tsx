import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Users, Eye, Briefcase } from 'lucide-react';
import { toast } from 'sonner';

import { useAuthStore } from '@/store/useAuthStore';
import { formatPhone, cleanPhone, getPhoneExample } from '@/lib/utils';
import api from '@/lib/api';
import type { Client } from '@/types';

interface Portfolio {
  id: string;
  name: string;
}

export function Clients() {
  const navigate = useNavigate();
  const { countryCode } = useAuthStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: '',
    dpiOrId: '',
    phone: '',
    email: '',
    address: '',
    portfolioId: '',
  });

  useEffect(() => {
    loadClients();
    loadPortfolios();
  }, []);

  const loadClients = async () => {
    try {
      const response = await api.get('/clients');
      setClients(response.data);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPortfolios = async () => {
    try {
      const response = await api.get('/portfolios');
      setPortfolios(response.data);
    } catch (error) {
      console.error('Error loading portfolios:', error);
    }
  };

  const filteredClients = clients.filter((client) =>
    client.fullName.toLowerCase().includes(search.toLowerCase()) ||
    client.dpiOrId.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCreateForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateSubmit = async () => {
    // Validaciones básicas
    if (!createForm.fullName.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    if (!createForm.dpiOrId.trim()) {
      toast.error('El DUI/Identificación es obligatorio');
      return;
    }

    setIsSaving(true);
    try {
      const dataToSend = {
        fullName: createForm.fullName,
        dpiOrId: createForm.dpiOrId,
        phone: cleanPhone(createForm.phone),
        email: createForm.email,
        address: createForm.address,
        portfolioId: createForm.portfolioId === 'none' ? null : createForm.portfolioId || null,
      };

      console.log('Creando cliente:', dataToSend);

      const response = await api.post('/clients', dataToSend);
      console.log('Cliente creado:', response.data);

      toast.success('Cliente creado correctamente');
      setIsCreateModalOpen(false);
      setCreateForm({
        fullName: '',
        dpiOrId: '',
        phone: '',
        email: '',
        address: '',
        portfolioId: '',
      });
      loadClients(); // Recargar lista
    } catch (error: any) {
      console.error('Error creating client:', error);
      const errorMessage = error.response?.data?.message || 
                           error.response?.data?.error || 
                           'Error al crear el cliente';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando clientes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Clientes</h1>
          <p className="text-gray-500 mt-1">Gestión de clientes de tu financiera</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Lista de Clientes
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre o DUI..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {search ? 'No se encontraron clientes' : 'No hay clientes registrados'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>DUI</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Cartera</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client: any) => {
                  const portfolio = portfolios.find(p => p.id === client.portfolioId);
                  return (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.id.slice(0, 8)}...</TableCell>
                      <TableCell>{client.fullName}</TableCell>
                      <TableCell>{client.dpiOrId}</TableCell>
                      <TableCell>{formatPhone(client.phone, countryCode)}</TableCell>
                      <TableCell>
                        {portfolio ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs">
                            <Briefcase className="w-3 h-3" />
                            {portfolio.name}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">Sin asignar</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate(`/clients/${client.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="text-sm text-gray-500">
        Total: {filteredClients.length} cliente(s)
      </div>

      {/* Modal de Creación */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Cliente</DialogTitle>
            <DialogDescription>
              Completa la información del nuevo cliente. Haz clic en guardar cuando termines.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre Completo *</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={createForm.fullName}
                  onChange={handleCreateChange}
                  placeholder="Ej: Juan Pérez"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dpiOrId">DUI/Identificación *</Label>
                <Input
                  id="dpiOrId"
                  name="dpiOrId"
                  value={createForm.dpiOrId}
                  onChange={handleCreateChange}
                  placeholder="Ej: 01234567-8"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={createForm.phone}
                  onChange={handleCreateChange}
                  placeholder={getPhoneExample(countryCode)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={createForm.email}
                  onChange={handleCreateChange}
                  placeholder="ejemplo@email.com"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                name="address"
                value={createForm.address}
                onChange={handleCreateChange}
                placeholder="Dirección completa"
              />
            </div>
            {/* ✅ NUEVO: Selector de Cartera */}
            <div className="space-y-2">
              <Label htmlFor="portfolioId">Cartera Asignada</Label>
              <Select
                value={createForm.portfolioId || 'none'}
                onValueChange={(value) => setCreateForm({ ...createForm, portfolioId: value === 'none' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una cartera" />
                </SelectTrigger>
                <SelectContent position="popper" className="z-50 bg-white border border-gray-200 shadow-lg">
                  <SelectItem value="none">Sin asignar</SelectItem>
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
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateSubmit} disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Crear Cliente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}