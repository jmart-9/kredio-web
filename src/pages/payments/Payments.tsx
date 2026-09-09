import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Plus, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Payment, Loan, User } from '@/types';

export function Payments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    loanId: '',
    collectorId: '',
    amountPaid: 0,
    method: 'CASH',
    isPrinted: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // ✅ CORREGIDO: Usar /payments/history para evitar conflicto de rutas
      const [paymentsRes, loansRes, usersRes] = await Promise.all([
        api.get('/payments/history'),
        api.get('/loans'),
        api.get('/users'),
      ]);
      setPayments(paymentsRes.data);
      setLoans(loansRes.data.filter((l: any) => l.status === 'ACTIVE'));
      setUsers(usersRes.data.filter((u: any) => u.role === 'COBRADOR' || u.role === 'ADMIN_TENANT'));
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.loanId || !formData.collectorId || formData.amountPaid <= 0) {
      toast.error('Completa todos los campos obligatorios con valores válidos');
      return;
    }

    setIsSaving(true);
    try {
      await api.post('/payments', formData);
      toast.success('Pago registrado correctamente');
      setIsModalOpen(false);
      setFormData({ loanId: '', collectorId: '', amountPaid: 0, method: 'CASH', isPrinted: false });
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al registrar el pago');
    } finally {
      setIsSaving(false);
    }
  };

  const getMethodBadge = (method: string) => {
    const variants: Record<string, string> = {
      CASH: 'bg-green-100 text-green-800',
      TRANSFER: 'bg-blue-100 text-blue-800',
      CARD: 'bg-purple-100 text-purple-800',
      OTHER: 'bg-gray-100 text-gray-800',
    };
    const labels: Record<string, string> = {
      CASH: 'Efectivo',
      TRANSFER: 'Transferencia',
      CARD: 'Tarjeta',
      OTHER: 'Otro',
    };
    return <Badge className={variants[method] || 'bg-gray-100'}>{labels[method] || method}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Cargando pagos...</p></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Pagos</h1>
          <p className="text-gray-500 mt-1">Registro y historial de pagos de préstamos</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Registrar Pago
        </Button>
      </div>

      {/* Métricas Rápidas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Total Pagos</p>
                <p className="text-2xl font-bold">{payments.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Monto Total Cobrado</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(payments.reduce((sum, p) => sum + p.amountPaid, 0))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">Pagos Hoy</p>
                <p className="text-2xl font-bold">
                  {payments.filter(p => new Date(p.paymentDate).toDateString() === new Date().toDateString()).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Pagos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Historial de Pagos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No hay pagos registrados aún</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Préstamo</TableHead>
                  <TableHead>Cobrador</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="text-xs">{formatDate(payment.paymentDate)}</TableCell>
                    <TableCell className="font-medium truncate max-w-[150px]" title={payment.loanId}>
                      {payment.loanId}
                    </TableCell>
                    <TableCell className="truncate max-w-[150px]" title={payment.collectorId}>
                      {payment.collectorId}
                    </TableCell>
                    <TableCell className="font-bold text-green-600">
                      {formatCurrency(payment.amountPaid)}
                    </TableCell>
                    <TableCell>{getMethodBadge(payment.method)}</TableCell>
                    <TableCell>
                      {payment.isVoided ? (
                        <Badge className="bg-red-100 text-red-800">Anulado</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800">Válido</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de Registro de Pago */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Nuevo Pago</DialogTitle>
            <DialogDescription className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="w-4 h-4" />
              Completa la información del pago
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Préstamo Activo *</Label>
              <Select value={formData.loanId} onValueChange={(value) => setFormData({ ...formData, loanId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un préstamo" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-white">
                  {loans.map((loan) => (
                    <SelectItem key={loan.id} value={loan.id}>
                      {loan.id} - Saldo: {formatCurrency(loan.currentBalance)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cobrador *</Label>
              <Select value={formData.collectorId} onValueChange={(value) => setFormData({ ...formData, collectorId: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un cobrador" />
                </SelectTrigger>
                <SelectContent className="z-50 bg-white">
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Monto Pagado *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amountPaid || ''}
                onChange={(e) => setFormData({ ...formData, amountPaid: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Método de Pago *</Label>
              <Select value={formData.method} onValueChange={(value) => setFormData({ ...formData, method: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-50 bg-white">
                  <SelectItem value="CASH">Efectivo</SelectItem>
                  <SelectItem value="TRANSFER">Transferencia</SelectItem>
                  <SelectItem value="CARD">Tarjeta</SelectItem>
                  <SelectItem value="OTHER">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isPrinted"
                checked={formData.isPrinted}
                onChange={(e) => setFormData({ ...formData, isPrinted: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <Label htmlFor="isPrinted" className="cursor-pointer text-sm">Imprimir recibo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? 'Registrando...' : 'Registrar Pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}