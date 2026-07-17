import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Edit, Trash2, Shield, Users as UsersIcon, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/lib/api';

interface UserData {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
}

export function Users() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: 'COBRADOR',
    isActive: true,
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Error al cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateSubmit = async () => {
    if (!formData.fullName.trim() || !formData.email.trim()) {
      toast.error('Nombre y email son obligatorios');
      return;
    }

    setIsSaving(true);
    try {
      await api.post('/users', {
        fullName: formData.fullName,
        email: formData.email,
        role: formData.role,
      });
      toast.success('Usuario creado correctamente. Contraseña inicial: 123456');
      setIsCreateModalOpen(false);
      setFormData({ fullName: '', email: '', role: 'COBRADOR', isActive: true });
      loadUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al crear el usuario');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditSubmit = async () => {
    if (!selectedUser) return;

    setIsSaving(true);
    try {
      await api.put(`/users/${selectedUser.id}`, {
        fullName: formData.fullName,
        email: formData.email,
        role: formData.role,
        isActive: formData.isActive,
      });
      toast.success('Usuario actualizado correctamente');
      setIsEditModalOpen(false);
      loadUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al actualizar el usuario');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (user: UserData) => {
    if (user.id === currentUser?.id) {
      toast.error('No puedes eliminar tu propio usuario');
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar al usuario "${user.fullName}"?`)) return;

    try {
      await api.delete(`/users/${user.id}`);
      toast.success('Usuario eliminado correctamente');
      loadUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar el usuario');
    }
  };

  const openEditModal = (user: UserData) => {
    setSelectedUser(user);
    setFormData({
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    });
    setIsEditModalOpen(true);
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, string> = {
      ADMIN_TENANT: 'bg-purple-100 text-purple-800',
      COBRADOR: 'bg-blue-100 text-blue-800',
      AUDITOR: 'bg-green-100 text-green-800',
    };

    const labels: Record<string, string> = {
      ADMIN_TENANT: 'Admin Tenant',
      COBRADOR: 'Cobrador/Cajero',
      AUDITOR: 'Auditor',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[role] || 'bg-gray-100 text-gray-800'}`}>
        {labels[role] || role}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando usuarios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Usuarios</h1>
          <p className="text-gray-500 mt-1">Gestión de usuarios y permisos de tu financiera</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Métricas Rápidas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <UsersIcon className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Total Usuarios</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Usuarios Activos</p>
                <p className="text-2xl font-bold">
                  {users.filter((u) => u.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">Administradores</p>
                <p className="text-2xl font-bold">
                  {users.filter((u) => u.role === 'ADMIN_TENANT').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Usuarios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5" />
            Lista de Usuarios
          </CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay usuarios registrados
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.fullName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      {user.isActive ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Inactivo
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(user)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleDelete(user)}
                          disabled={user.id === currentUser?.id}
                          title={user.id === currentUser?.id ? "No puedes eliminar tu propio usuario" : "Eliminar usuario"}
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
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
            <DialogDescription className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="w-4 h-4" />
              La contraseña inicial será: <strong>123456</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre Completo *</Label>
              <Input
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleCreateChange}
                placeholder="Ej: Juan Pérez"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleCreateChange}
                placeholder="ejemplo@kredio.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rol *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-white">
                  <SelectItem value="COBRADOR">Cobrador / Cajero</SelectItem>
                  <SelectItem value="AUDITOR">Auditor</SelectItem>
                  <SelectItem value="ADMIN_TENANT">Admin Tenant</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateSubmit} disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Crear Usuario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Edición */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Modifica la información y permisos del usuario.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre Completo *</Label>
              <Input
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleCreateChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleCreateChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rol *</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-50 bg-white">
                  <SelectItem value="COBRADOR">Cobrador / Cajero</SelectItem>
                  <SelectItem value="AUDITOR">Auditor</SelectItem>
                  <SelectItem value="ADMIN_TENANT">Admin Tenant</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="isActive" className="cursor-pointer">Usuario Activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditSubmit} disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}