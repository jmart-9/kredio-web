import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Download, Pencil, Trash2, User, Briefcase, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/lib/api';
import { formatCurrency, formatDate, formatPhone, cleanPhone, getPhoneExample } from '@/lib/utils';
import type { Client, Loan } from '@/types';

interface LoanSchedule {
  id: string;
  loanId: string;
  installmentNumber: number;
  dueDate: string;
  expectedAmount: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  paidDate?: string;
}

interface Portfolio {
  id: string;
  name: string;
}

export function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { countryCode, user } = useAuthStore();
  
  const [client, setClient] = useState<Client | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [schedules, setSchedules] = useState<LoanSchedule[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para el modal de edición
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    dpiOrId: '',
    phone: '',
    email: '',
    address: '',
    portfolioId: '',
  });

  // Estados para el modal de pago
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<LoanSchedule | null>(null);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amountPaid: '',
    method: 'CASH',
  });

  // Estados para el modal de eliminación
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    loadClientData();
    loadPortfolios();
  }, [id]);

  const loadClientData = async () => {
    try {
      const [clientRes, loansRes] = await Promise.all([
        api.get(`/clients/${id}`),
        api.get(`/loans?clientId=${id}`),
      ]);

      setClient(clientRes.data);
      setLoans(loansRes.data);

      const schedulesPromises = loansRes.data.map((loan: Loan) =>
        api.get(`/loans/${loan.id}/schedules`)
      );
      const schedulesResponses = await Promise.all(schedulesPromises);
      const allSchedules = schedulesResponses.flatMap((res, index) => 
        res.data.map((schedule: any) => ({
          ...schedule,
          loanId: loansRes.data[index]?.id // ✅ CORREGIDO: Asignar el loanId correcto
        }))
      );
      setSchedules(allSchedules);
    } catch (error) {
      console.error('Error loading client:', error);
      toast.error('Error al cargar la información del cliente');
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

  const handleExportPDF = () => {
    window.open(`http://localhost:8080/api/v1/export/clients/excel`, '_blank');
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async () => {
    setIsSaving(true);
    try {
      const dataToSend = {
        fullName: editForm.fullName,
        dpiOrId: editForm.dpiOrId,
        phone: cleanPhone(editForm.phone),
        email: editForm.email,
        address: editForm.address,
        portfolioId: editForm.portfolioId === 'none' ? null : editForm.portfolioId || null,
      };
      
      await api.put(`/clients/${id}`, dataToSend);
      toast.success('Cliente actualizado correctamente');
      setIsEditModalOpen(false);
      loadClientData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Error al actualizar el cliente';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenPaymentModal = (schedule: LoanSchedule) => {
    setSelectedSchedule(schedule);
    const loan = loans.find(l => l.id === schedule.loanId);
    setSelectedLoan(loan || null);
    setPaymentForm({
      amountPaid: schedule.expectedAmount.toString(),
      method: 'CASH',
    });
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async () => {
    if (!selectedSchedule || !selectedLoan) {
      toast.error('Error: No se encontró el préstamo');
      return;
    }

    // ✅ VALIDACIÓN CRÍTICA: Evita que se quede "colgado" si no hay usuario
    if (!user?.id) {
      toast.error('Error de sesión: No se pudo identificar al cobrador. Inicia sesión nuevamente.');
      return;
    }
    
    setIsSaving(true);
    try {
      const payload = {
        loanId: selectedLoan.id,
        amountPaid: parseFloat(paymentForm.amountPaid),
        collectorId: user.id,
        method: paymentForm.method,
        isPrinted: false,
        syncedFromOffline: false,
      };

      console.log('📤 Enviando pago:', payload); // ✅ LOG DE DEPURACIÓN

      await api.post('/payments', payload);
      
      toast.success('Pago registrado correctamente');
      setIsPaymentModalOpen(false);
      loadClientData(); // Recarga los datos para actualizar el estado de la cuota
    } catch (error: any) {
      console.error('❌ Error al registrar el pago:', error);
      console.error('❌ Respuesta del servidor:', error.response?.data); // ✅ LOG DE ERROR DETALLADO
      
      const errorMessage = error.response?.data?.message || 
                           error.response?.data?.errors?.[0]?.defaultMessage || 
                           'Error al registrar el pago';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false); // ✅ SIEMPRE se ejecuta, evitando que se quede "Confirmando..."
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmText !== 'ELIMINAR') {
      toast.error('Debes escribir "ELIMINAR" para confirmar');
      return;
    }

    setIsDeleting(true);
    try {
      await api.delete(`/clients/${id}`);
      toast.success('Cliente eliminado correctamente');
      setIsDeleteModalOpen(false);
      setDeleteConfirmText('');
      navigate('/clients');
    } catch (error: any) {
      console.error('Error deleting client:', error);
      const errorMessage = error.response?.data?.message || 'Error al eliminar el cliente';
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (client && isEditModalOpen) {
      setEditForm({
        fullName: client.fullName || '',
        dpiOrId: client.dpiOrId || '',
        phone: client.phone || '',
        email: client.email || '',
        address: client.address || '',
        portfolioId: (client as any).portfolioId || 'none',
      });
    }
  }, [client, isEditModalOpen]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando información...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Cliente no encontrado</p>
        <Button onClick={() => navigate('/clients')} className="mt-4">
          Volver a Clientes
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      PAID: 'bg-green-100 text-green-800 hover:bg-green-100',
      PENDING: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
      OVERDUE: 'bg-red-100 text-red-800 hover:bg-red-100',
    };

    const labels: Record<string, string> = {
      PAID: 'Pagada',
      PENDING: 'Pendiente',
      OVERDUE: 'En mora',
    };

    return (
      <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>
        {labels[status] || status}
      </Badge>
    );
  };

  // ✅ CÁLCULOS 100% PRECISOS BASADOS EN EL CALENDARIO DE PAGOS REAL
  const totalLoanAmount = loans.reduce((sum, loan) => sum + loan.principalAmount, 0);
  
  const totalPaid = schedules
    .filter((s) => s.status === 'PAID')
    .reduce((sum, s) => sum + s.expectedAmount, 0);

  const totalPending = schedules
    .filter((s) => s.status === 'PENDING' || s.status === 'OVERDUE')
    .reduce((sum, s) => sum + s.expectedAmount, 0);

  const totalExpectedToPay = totalPaid + totalPending; // Suma exacta de todas las cuotas generadas

  const currentPortfolio = portfolios.find(p => p.id === (client as any).portfolioId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/clients')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Detalle del Cliente</h1>
          <p className="text-gray-500 mt-1">Información completa del cliente</p>
        </div>
      </div>

      {/* Información General */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Información General del Cliente</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)}>
                <Pencil className="w-4 h-4 mr-2" />
                Modificar
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => setIsDeleteModalOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
                {client.fullName ? (
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(client.fullName)}&background=1a56db&color=fff`}
                    alt={client.fullName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="w-10 h-10 text-gray-400" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{client.fullName}</h3>
                <p className="text-sm text-gray-500">#{client.id.slice(0, 8)}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500">DUI:</p>
              <p className="font-medium">{client.dpiOrId}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Teléfono:</p>
              <p className="font-medium">{formatPhone(client.phone, countryCode)}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Email:</p>
              <p className="font-medium">{client.email || 'No disponible'}</p>
            </div>

            <div className="md:col-span-2">
              <p className="text-sm text-gray-500">Dirección:</p>
              <p className="font-medium">{client.address || 'No disponible'}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Cartera Asignada:</p>
              {currentPortfolio ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-sm font-medium">
                  <Briefcase className="w-3 h-3" />
                  {currentPortfolio.name}
                </span>
              ) : (
                <span className="text-gray-400">Sin asignar</span>
              )}
            </div>

            <div>
              <p className="text-sm text-gray-500">Monto Pagado:</p>
              <p className="font-medium text-green-600">{formatCurrency(totalPaid)}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Saldo Pendiente:</p>
              <p className="font-medium text-orange-600">{formatCurrency(totalPending)}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Capital Prestado:</p>
              <p className="font-medium">{formatCurrency(totalLoanAmount)}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Total a Pagar (Capital + Interés):</p>
              <p className="font-medium text-blue-600">
                {formatCurrency(totalExpectedToPay)} {/* ✅ CÁLCULO REAL BASADO EN EL CALENDARIO */}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendario de Pagos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Calendario de Pagos</h2>
            <Button onClick={handleExportPDF} variant="destructive" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Generar PDF
            </Button>
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
                  <TableHead>NO. Cuota</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha de Vencimiento</TableHead>
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
                    <TableCell>{formatCurrency(schedule.expectedAmount)}</TableCell>
                    <TableCell>{getStatusBadge(schedule.status)}</TableCell>
                    <TableCell>{formatDate(schedule.dueDate)}</TableCell>
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

      {/* Modal de Edición */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Modifica la información del cliente. Haz clic en guardar cuando termines.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nombre Completo</Label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={editForm.fullName}
                  onChange={handleEditChange}
                  disabled
                  className="bg-gray-100 cursor-not-allowed"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dpiOrId">DUI/Identificación</Label>
                <Input
                  id="dpiOrId"
                  name="dpiOrId"
                  value={editForm.dpiOrId}
                  disabled
                  className="bg-gray-100 cursor-not-allowed"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={editForm.phone}
                  onChange={handleEditChange}
                  placeholder={getPhoneExample(countryCode)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={editForm.email}
                  onChange={handleEditChange}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                name="address"
                value={editForm.address}
                onChange={handleEditChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portfolioId">Cartera Asignada</Label>
              <Select
                value={editForm.portfolioId || 'none'}
                onValueChange={(value) => setEditForm({ ...editForm, portfolioId: value === 'none' ? '' : value })}
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
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditSubmit} disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Registro de Pago */}
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
                Saldo pendiente: {selectedLoan ? formatCurrency(selectedLoan.currentBalance) : 'N/A'}
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
              <p className="text-xs text-gray-500">Monto esperado: {selectedSchedule ? formatCurrency(selectedSchedule.expectedAmount) : ''}</p>
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

      {/* Modal de Confirmación para Eliminar */}
      <Dialog 
        open={isDeleteModalOpen} 
        onOpenChange={(open) => {
          setIsDeleteModalOpen(open);
          if (!open) {
            setDeleteConfirmText('');
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Eliminar Cliente
            </DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. Se eliminarán todos los datos asociados al cliente.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                {client?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{client?.fullName}</p>
                <p className="text-sm text-gray-500">DUI: {client?.dpiOrId}</p>
              </div>
            </div>
          </div>

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

          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
            <div className="flex items-start gap-2">
              <span className="text-red-600 text-lg">⚠️</span>
              <div>
                <p className="text-sm font-medium text-red-800">Advertencia</p>
                <p className="text-xs text-red-600 mt-1">
                  Se eliminarán todos los préstamos, pagos y calendarios asociados a este cliente permanentemente.
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
              }}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete} 
              disabled={isDeleting || deleteConfirmText !== 'ELIMINAR'}
              className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
            >
              {isDeleting ? 'Eliminando...' : 'Sí, Eliminar Cliente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}