import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Lock, Eye, EyeOff } from 'lucide-react';

interface ChangePasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordModal({ open, onOpenChange }: ChangePasswordModalProps) {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    // Validaciones
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      toast.error('Todos los campos son obligatorios');
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Las nuevas contraseñas no coinciden');
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      toast.error('La nueva contraseña debe ser diferente a la actual');
      return;
    }

    setIsSaving(true);
    try {
      await api.put('/users/change-password', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
      });

      toast.success('✅ Contraseña cambiada correctamente');
      
      // Limpiar formulario y cerrar modal
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error changing password:', error);
      const errorMessage = error.response?.data?.error || 'Error al cambiar la contraseña';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Cambiar Contraseña
          </DialogTitle>
          <DialogDescription>
            Actualiza tu contraseña de forma segura. La nueva contraseña debe tener al menos 6 caracteres.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Contraseña Actual */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Contraseña Actual *</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                name="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder="Ingresa tu contraseña actual"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Nueva Contraseña */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">Nueva Contraseña *</Label>
            <div className="relative">
              <Input
                id="newPassword"
                name="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={handleChange}
                placeholder="Ingresa tu nueva contraseña"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500">Mínimo 6 caracteres</p>
          </div>

          {/* Confirmar Nueva Contraseña */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña *</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirma tu nueva contraseña"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? 'Cambiando...' : 'Cambiar Contraseña'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}