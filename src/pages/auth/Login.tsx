import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import type { LoginRequest, LoginResponse, User } from '@/types';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginRequest) => {
    setLoading(true);
    setError('');

    try {
      console.log('🔐 Intentando login con:', data.email);
      
      const response = await api.post<LoginResponse>('/auth/login', data);
      console.log('✅ Respuesta del backend:', response.data);
      
      const userData: User = {
        id: response.data.userId,
        fullName: response.data.fullName,
        email: response.data.email,
        role: response.data.role,
        roleName: response.data.roleName || response.data.role,
        tenantId: response.data.tenantId,
        permissions: response.data.permissions || [],
      };
      
      console.log(' Datos de usuario:', userData);
      
      login(userData, response.data.token);
      
      toast.success('¡Bienvenido, ' + userData.fullName + '!');
      
      // ✅ REDIRIGIR AL DASHBOARD (no a /)
      navigate('/dashboard');
    } catch (err: any) {
      console.error('❌ Error en login:', err);
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-blue-600">Kredio</CardTitle>
          <CardDescription>Sistema de Gestión de Préstamos</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="admin@oroplata.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && (
                <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">{error}</div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}