import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, DollarSign, Calendar, User, TrendingUp, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Loan {
  id: string;
  clientId: string;
  principalAmount: number;
  interestRate: number;
  termMonths: number;
  status: string;
  currentBalance: number;
  openingDate: string;
  amortizationMethod: string;
  paymentFrequency: string;
  // ✅ NUEVOS CAMPOS para Flujo de Aprobación
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
}

interface LoanSchedule {
  id: string;
  installmentNumber: number;
  dueDate: string;
  expectedAmount: number;
  expectedPrincipal: number;
  expectedInterest: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  paidDate?: string;
}

interface Client {
  id: string;
  fullName: string;
  dpiOrId: string;
  phone: string;
  email: string;
  portfolioId?: string;
}

export function LoanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [loan, setLoan] = useState<Loan | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [schedules, setSchedules] = useState<LoanSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para modal de pago
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<LoanSchedule | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amountPaid: '',
    method: 'CASH',
  });

  // ✅ NUEVOS Estados para aprobación/rechazo
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadLoanData();
  }, [id]);

  const loadLoanData = async () => {
    try {
      const [loanRes, schedulesRes] = await Promise.all([
        api.get(`/loans/${id}`),
        api.get(`/loans/${id}/schedules`),
      ]);

      setLoan(loanRes.data);
      setSchedules(schedulesRes.data);

      // Cargar información del cliente
      const clientRes = await api.get(`/clients/${loanRes.data.clientId}`);
      setClient(clientRes.data);
    } catch (error) {
      console.error('Error loading loan:', error);
      toast.error('Error al cargar el préstamo');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPaymentModal = (schedule: LoanSchedule) => {
    setSelectedSchedule(schedule);
    setPaymentForm({
      amountPaid: schedule.expectedAmount.toString(),
      method: 'CASH',
    });
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async () => {
    if (!selectedSchedule || !loan) {
      toast.error('Error: No se encontró el préstamo');
      return;
    }

    if (!user?.id) {
      toast.error('Error de sesión: Inicia sesión nuevamente.');
      return;
    }

    setIsSaving(true);
    try {
      await api.post('/payments', {
        loanId: loan.id,
        amountPaid: parseFloat(paymentForm.amountPaid),
        collectorId: user.id,
        method: paymentForm.method,
        isPrinted: false,
        syncedFromOffline: false,
      });

      toast.success('Pago registrado correctamente');
      setIsPaymentModalOpen(false);
      loadLoanData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al registrar el pago');
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ NUEVO: Aprobar préstamo
  const handleApprove = async () => {
    if (!loan) return;
    setIsProcessing(true);
    try {
      await api.post(`/loans/${loan.id}/approve`);
      toast.success('✅ Préstamo aprobado y activado correctamente');
      setIsApproveModalOpen(false);
      loadLoanData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al aprobar el préstamo');
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ NUEVO: Rechazar préstamo
  const handleReject = async () => {
    if (!loan) return;
    if (!rejectReason.trim()) {
      toast.error('Debes ingresar una razón para el rechazo');
      return;
    }
    setIsProcessing(true);
    try {
      await api.post(`/loans/${loan.id}/reject`, { reason: rejectReason });
      toast.success('❌ Préstamo rechazado correctamente');
      setIsRejectModalOpen(false);
      setRejectReason('');
      loadLoanData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al rechazar el préstamo');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      PAID: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      OVERDUE: 'bg-red-100 text-red-800',
      ACTIVE: 'bg-blue-100 text-blue-800',
      DEFAULTED: 'bg-red-100 text-red-800',
    };

    const labels: Record<string, string> = {
      PAID: 'Pagada',
      PENDING: 'Pendiente',
      OVERDUE: 'En mora',
      ACTIVE: 'Activo',
      DEFAULTED: 'Vencido',
    };

    return <Badge className={variants[status] || 'bg-gray-100'}>{labels[status] || status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando información...</p>
      </div>
    );
  }

  if (!loan || !client) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Préstamo no encontrado</p>
        <Button onClick={() => navigate('/loans')} className="mt-4">
          Volver a Préstamos
        </Button>
      </div>
    );
  }

  // Calcular totales
  const totalPaid = schedules
    .filter((s) => s.status === 'PAID')
    .reduce((sum, s) => sum + s.expectedAmount, 0);

  const totalPending = schedules
    .filter((s) => s.status === 'PENDING' || s.status === 'OVERDUE')
    .reduce((sum, s) => sum + s.expectedAmount, 0);

  const totalInterest = schedules.reduce((sum, s) => sum + s.expectedInterest, 0);
  const overdueSchedules = schedules.filter((s) => s.status === 'OVERDUE');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/loans')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Detalle del Préstamo</h1>
          <p className="text-gray-500 mt-1">Información completa del préstamo</p>
        </div>
      </div>

      {/* Alerta de mora */}
      {overdueSchedules.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
            <div>
              <p className="font-semibold text-red-900">
                Préstamo con {overdueSchedules.length} cuota(s) vencida(s)
              </p>
              <p className="text-sm text-red-700">
                Total en mora: {formatCurrency(overdueSchedules.reduce((sum, s) => sum + s.expectedAmount, 0))}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ✅ NUEVO: Panel de Aprobación (si está pendiente) */}
      {loan.status === 'PENDING' && loan.approvalStatus === 'PENDING' && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-amber-900 text-lg">
                    Préstamo Pendiente de Aprobación
                  </p>
                  <p className="text-sm text-amber-700">
                    Este préstamo debe ser aprobado antes de activarse
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setIsApproveModalOpen(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Aprobar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsRejectModalOpen(true)}
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Rechazar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ✅ NUEVO: Info si ya fue aprobado */}
      {loan.approvalStatus === 'APPROVED' && loan.approvedAt && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center gap-3 py-4">
            <CheckCircle className="w-6 h-6 text-green-600" />
            <div>
              <p className="font-semibold text-green-900">Préstamo Aprobado</p>
              <p className="text-sm text-green-700">
                Aprobado el {formatDate(loan.approvedAt)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ✅ NUEVO: Info si fue rechazado */}
      {loan.approvalStatus === 'REJECTED' && loan.approvedAt && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 py-4">
            <XCircle className="w-6 h-6 text-red-600" />
            <div>
              <p className="font-semibold text-red-900">Préstamo Rechazado</p>
              <p className="text-sm text-red-700">
                Rechazado el {formatDate(loan.approvedAt)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Información General */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Información del Cliente */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Información del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Nombre</p>
              <p className="font-medium">{client.fullName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">DUI/ID</p>
              <p className="font-medium">{client.dpiOrId}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Teléfono</p>
              <p className="font-medium">{client.phone || 'No disponible'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{client.email || 'No disponible'}</p>
            </div>
            <Button
              variant="outline"
              className="w-full mt-4"
              onClick={() => navigate(`/clients/${client.id}`)}
            >
              Ver Perfil Completo
            </Button>
          </CardContent>
        </Card>

        {/* Información del Préstamo */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Información del Préstamo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Monto Principal</p>
                <p className="text-xl font-bold text-blue-900">{formatCurrency(loan.principalAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tasa de Interés</p>
                <p className="text-xl font-bold">{loan.interestRate}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Plazo</p>
                <p className="text-xl font-bold">{loan.termMonths} meses</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Saldo Pendiente</p>
                <p className="text-xl font-bold text-orange-600">{formatCurrency(loan.currentBalance)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Interés Total</p>
                <p className="text-xl font-bold text-purple-600">{formatCurrency(totalInterest)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Estado</p>
                <div className="mt-1">
                  {getStatusBadge(loan.status)}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Método de Amortización</p>
                <p className="font-medium">
                  {loan.amortizationMethod === 'FRENCH' ? 'Francés' : 'Simple'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Frecuencia de Pago</p>
                <p className="font-medium">
                  {loan.paymentFrequency === 'MONTHLY' ? 'Mensual' : 
                   loan.paymentFrequency === 'WEEKLY' ? 'Semanal' : 
                   loan.paymentFrequency === 'BIWEEKLY' ? 'Quincenal' : loan.paymentFrequency}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Fecha de Apertura</p>
                <p className="font-medium">{formatDate(loan.openingDate)}</p>
              </div>
            </div>

            {/* Resumen de Pagos */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Pagado</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Pendiente</p>
                <p className="text-2xl font-bold text-orange-700">{formatCurrency(totalPending)}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total a Pagar</p>
                <p className="text-2xl font-bold text-blue-700">
                  {formatCurrency(loan.principalAmount + totalInterest)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendario de Pagos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Calendario de Pagos
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay cuotas registradas
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Cuota</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Capital</TableHead>
                  <TableHead>Interés</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha de Pago</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">
                      {String(schedule.installmentNumber).padStart(2, '0')}
                    </TableCell>
                    <TableCell>{formatDate(schedule.dueDate)}</TableCell>
                    <TableCell>{formatCurrency(schedule.expectedAmount)}</TableCell>
                    <TableCell>{formatCurrency(schedule.expectedPrincipal)}</TableCell>
                    <TableCell>{formatCurrency(schedule.expectedInterest)}</TableCell>
                    <TableCell>{getStatusBadge(schedule.status)}</TableCell>
                    <TableCell>
                      {schedule.paidDate ? formatDate(schedule.paidDate) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      {(schedule.status === 'PENDING' || schedule.status === 'OVERDUE') && (
                        <Button
                          size="sm"
                          onClick={() => handleOpenPaymentModal(schedule)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <DollarSign className="w-4 h-4 mr-1" />
                          Pagar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de Pago */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <DollarSign className="w-5 h-5" />
              Registrar Pago
            </DialogTitle>
            <DialogDescription>
              Cuota #{selectedSchedule?.installmentNumber} - Vence: {selectedSchedule ? formatDate(selectedSchedule.dueDate) : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm font-medium text-blue-900">Información del Préstamo</p>
              <p className="text-xs text-blue-700 mt-1">
                Saldo pendiente: {loan ? formatCurrency(loan.currentBalance) : 'N/A'}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amountPaid">Monto a Pagar *</Label>
              <Input
                id="amountPaid"
                type="number"
                step="0.01"
                value={paymentForm.amountPaid}
                onChange={(e) => setPaymentForm({ ...paymentForm, amountPaid: e.target.value })}
              />
              <p className="text-xs text-gray-500">
                Monto esperado: {selectedSchedule ? formatCurrency(selectedSchedule.expectedAmount) : ''}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="method">Método de Pago</Label>
              <Select
                value={paymentForm.method}
                onValueChange={(value) => setPaymentForm({ ...paymentForm, method: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className="z-50 bg-white border border-gray-200 shadow-lg">
                  <SelectItem value="CASH">Efectivo</SelectItem>
                  <SelectItem value="TRANSFER">Transferencia</SelectItem>
                  <SelectItem value="CHECK">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handlePaymentSubmit} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
              {isSaving ? 'Procesando...' : 'Confirmar Pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ NUEVO: Modal de Aprobación */}
      <Dialog open={isApproveModalOpen} onOpenChange={setIsApproveModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              Aprobar Préstamo
            </DialogTitle>
            <DialogDescription>
              Al aprobar este préstamo, se activará y el cliente podrá comenzar a pagar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
            <p className="text-sm text-green-800">
              <strong>⚠️ Importante:</strong> Esta acción activará el préstamo inmediatamente.
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleApprove} 
              disabled={isProcessing}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? 'Aprobando...' : '✅ Aprobar y Activar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ NUEVO: Modal de Rechazo */}
      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <XCircle className="w-5 h-5" />
              Rechazar Préstamo
            </DialogTitle>
            <DialogDescription>
              Indica la razón del rechazo. Esta información quedará registrada.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 py-4">
            <Label htmlFor="rejectReason">Razón del rechazo *</Label>
            <Textarea
              id="rejectReason"
              value={rejectReason}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectReason(e.target.value)}
              placeholder="Ej: Documentación incompleta, no cumple con requisitos de scoring, etc."
              rows={4}
              className="resize-none"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsRejectModalOpen(false);
              setRejectReason('');
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleReject} 
              disabled={isProcessing || !rejectReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? 'Rechazando...' : '❌ Rechazar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}