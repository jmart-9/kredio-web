import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, DollarSign, Calendar, User, TrendingUp, AlertCircle, CheckCircle, XCircle, 
  Clock, Info, Gift, TrendingDown, AlertTriangle, FileText, Lock 
} from 'lucide-react';
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
  rateType?: string;
  dayCountConvention?: string;
  earlyRepaymentPolicy?: string;
  graceDays?: number;
  adjustForBusinessDays?: boolean;
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
  paidAmount?: number;
  moratoryInterest?: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'PARTIAL' | 'CONDONATED';
  paidDate?: string;
  isCondonated?: boolean;
  condonatedAmount?: number;
  condonatedInterest?: number;
  adjustedPrincipal?: number;
  adjustedInterest?: number;
  adjustedAmount?: number;
}

interface Client {
  id: string;
  fullName: string;
  dpiOrId: string;
  phone: string;
  email: string;
  portfolioId?: string;
}

interface Payment {
  id: string;
  amountPaid: number;
  appliedToMoratory?: number;
  appliedToInterest?: number;
  appliedToPrincipal?: number;
  excessAmount?: number;
  method: string;
  paymentDate: string;
  isVoided: boolean;
}

export function LoanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [loan, setLoan] = useState<Loan | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [schedules, setSchedules] = useState<LoanSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<LoanSchedule | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amountPaid: '', method: 'CASH' });

  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [isCondonationModalOpen, setIsCondonationModalOpen] = useState(false);

  // ✅ NUEVOS ESTADOS PARA ANULACIÓN
  const [isAnnulmentModalOpen, setIsAnnulmentModalOpen] = useState(false);
  const [selectedPaymentToAnnul, setSelectedPaymentToAnnul] = useState<Payment | null>(null);
  const [annulmentReason, setAnnulmentReason] = useState('');
  const [supervisorPin, setSupervisorPin] = useState('');
  const [isAnnulling, setIsAnnulling] = useState(false);

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

      const clientRes = await api.get(`/clients/${loanRes.data.clientId}`);
      setClient(clientRes.data);

      try {
        const paymentsRes = await api.get(`/payments/loan/${id}`);
        setPaymentHistory(paymentsRes.data);
      } catch (error) {
        console.error('Error loading payments:', error);
      }
    } catch (error) {
      console.error('Error loading loan:', error);
      toast.error('Error al cargar el préstamo');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPaymentModal = (schedule: LoanSchedule) => {
    setSelectedSchedule(schedule);
    if (!loan) return;

    const expectedAmount = schedule.adjustedAmount ?? schedule.expectedAmount;
    const paidAmount = schedule.paidAmount || 0;
    const moratoryInterest = schedule.moratoryInterest || 0;
    
    const pendingAmount = Math.max(0, expectedAmount - paidAmount) + moratoryInterest;

    setPaymentForm({
      amountPaid: pendingAmount > 0 ? pendingAmount.toFixed(2) : '0.00',
      method: 'CASH',
    });
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async () => {
    if (!selectedSchedule || !loan || !user?.id) {
      toast.error('Error de sesión o datos faltantes');
      return;
    }

    if (loan.status !== 'ACTIVE' && loan.status !== 'DEFAULTED') {
      toast.error(`El préstamo debe estar ACTIVO o VENCIDO para registrar pagos. Estado actual: ${loan.status}`);
      return;
    }

    const amountToPay = parseFloat(paymentForm.amountPaid);
    if (amountToPay <= 0) {
      toast.error('El monto a pagar debe ser mayor a cero');
      return;
    }

    setIsSaving(true);
    try {
      await api.post('/payments', {
        loanId: loan.id,
        scheduleId: selectedSchedule.id,
        amountPaid: amountToPay,
        collectorId: user.id,
        method: paymentForm.method,
        isPrinted: false,
        syncedFromOffline: false,
      });

      toast.success('✅ Pago registrado y distribuido correctamente');
      setIsPaymentModalOpen(false);
      loadLoanData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al registrar el pago');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!loan) return;
    setIsProcessing(true);
    try {
      await api.post(`/loans/${loan.id}/approve`);
      toast.success('✅ Préstamo aprobado y activado correctamente');
      setIsApproveModalOpen(false);
      loadLoanData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al aprobar');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!loan || !rejectReason.trim()) {
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
      toast.error(error.response?.data?.message || 'Error al rechazar');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTotalPaymentWithCondonation = async () => {
    if (!loan || !user?.id) {
      toast.error('Error de sesión o datos faltantes');
      return;
    }
    if (loan.status !== 'ACTIVE' && loan.status !== 'DEFAULTED') {
      toast.error('El préstamo debe estar ACTIVO o VENCIDO para aplicar pago con condonación');
      return;
    }
    const totalCapitalPending = loan.currentBalance;
    setIsSaving(true);
    try {
      await api.post('/payments', {
        loanId: loan.id,
        amountPaid: totalCapitalPending,
        collectorId: user.id,
        method: 'CASH',
        isPrinted: false,
        syncedFromOffline: false,
      });
      toast.success('✅ Pago total con condonación aplicado correctamente');
      setIsCondonationModalOpen(false);
      loadLoanData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al aplicar pago con condonación');
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ FUNCIÓN PARA DESCARGAR RECIBO PDF
  const handleDownloadReceipt = async (paymentId: string) => {
    try {
      const response = await api.get(`/payments/${paymentId}/receipt`, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `recibo_pago_${paymentId.substring(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('✅ Recibo descargado correctamente');
    } catch (error: any) {
      console.error('Error al descargar recibo:', error);
      toast.error(error.response?.data?.error || 'Error al descargar el recibo');
    }
  };

  // ✅ FUNCIONES PARA ANULAR PAGO
  const handleOpenAnnulmentModal = (payment: Payment) => {
    setSelectedPaymentToAnnul(payment);
    setAnnulmentReason('');
    setSupervisorPin('');
    setIsAnnulmentModalOpen(true);
  };

  const handleAnnulPayment = async () => {
    if (!selectedPaymentToAnnul) return;
    
    if (!annulmentReason.trim()) {
      toast.error('Debes ingresar un motivo para la anulación');
      return;
    }

    if (!supervisorPin.trim() || supervisorPin.length !== 4) {
      toast.error('El PIN debe ser de 4 dígitos');
      return;
    }

    setIsAnnulling(true);
    try {
      await api.post(`/payments/${selectedPaymentToAnnul.id}/annul`, {
        reason: annulmentReason,
        supervisorPin: supervisorPin,
      });

      toast.success('✅ Pago anulado correctamente');
      setIsAnnulmentModalOpen(false);
      setAnnulmentReason('');
      setSupervisorPin('');
      loadLoanData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al anular el pago');
    } finally {
      setIsAnnulling(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      DEFAULTED: 'bg-red-100 text-red-800',
      PAID: 'bg-blue-100 text-blue-800',
      REJECTED: 'bg-gray-100 text-gray-800',
    };
    const labels: Record<string, string> = {
      ACTIVE: 'Activo',
      PENDING: 'Pendiente',
      DEFAULTED: 'Vencido',
      PAID: 'Pagado',
      REJECTED: 'Rechazado',
    };
    return <Badge className={variants[status] || 'bg-gray-100'}>{labels[status] || status}</Badge>;
  };

  const getScheduleStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      PAID: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      PARTIAL: 'bg-blue-100 text-blue-800',
      OVERDUE: 'bg-red-100 text-red-800',
      CONDONATED: 'bg-purple-100 text-purple-800',
    };
    const labels: Record<string, string> = {
      PAID: 'Pagada',
      PENDING: 'Pendiente',
      PARTIAL: 'Pago Parcial',
      OVERDUE: 'En mora',
      CONDONATED: 'Condonada',
    };
    return <Badge className={variants[status] || 'bg-gray-100'}>{labels[status] || status}</Badge>;
  };

  const getAmortizationLabel = (method: string) => {
    const labels: Record<string, string> = {
      FRENCH: 'Francés (Cuota Fija)',
      FLAT: 'Flat (Interés Fijo)',
      GERMAN: 'Alemán (Capital Fijo)',
    };
    return labels[method] || method;
  };

  const getFrequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      DAILY: 'Diaria',
      WEEKLY: 'Semanal',
      BIWEEKLY: 'Quincenal',
      MONTHLY: 'Mensual',
      QUARTERLY: 'Trimestral',
      SEMIANNUAL: 'Semestral',
      ANNUAL: 'Anual',
    };
    return labels[freq] || freq;
  };

  const calculatePendingAmounts = (schedule: LoanSchedule) => {
    const expectedPrincipal = schedule.adjustedPrincipal ?? schedule.expectedPrincipal;
    const expectedInterest = schedule.adjustedInterest ?? schedule.expectedInterest;
    const moratoryInterest = schedule.moratoryInterest || 0;
    const paidAmount = schedule.paidAmount || 0;

    if (schedule.status === 'CONDONATED' || schedule.isCondonated) {
      return {
        pendingAmount: 0,
        pendingPrincipal: 0,
        pendingInterest: 0,
        pendingMoratory: 0,
        isCondonated: true,
        isPartialCondonation: false,
        condonatedAmount: schedule.condonatedAmount || 0,
        condonatedInterest: schedule.condonatedInterest || 0,
        originalPrincipal: schedule.expectedPrincipal,
        originalAmount: schedule.expectedAmount,
      };
    }

    if (schedule.status === 'PAID') {
      return {
        pendingAmount: 0,
        pendingPrincipal: 0,
        pendingInterest: 0,
        pendingMoratory: 0,
        isCondonated: false,
        isPartialCondonation: false,
      };
    }

    const hasPartialCondonation = schedule.adjustedPrincipal !== undefined && 
                                  schedule.adjustedPrincipal !== null &&
                                  schedule.adjustedPrincipal < schedule.expectedPrincipal &&
                                  schedule.adjustedPrincipal > 0;

    let remainingToApply = paidAmount;
    let appliedToMoratory = 0;
    let appliedToInterest = 0;
    let appliedToPrincipal = 0;

    if (moratoryInterest > 0 && remainingToApply > 0) {
      appliedToMoratory = Math.min(remainingToApply, moratoryInterest);
      remainingToApply -= appliedToMoratory;
    }

    if (expectedInterest > 0 && remainingToApply > 0) {
      appliedToInterest = Math.min(remainingToApply, expectedInterest);
      remainingToApply -= appliedToInterest;
    }

    if (expectedPrincipal > 0 && remainingToApply > 0) {
      appliedToPrincipal = Math.min(remainingToApply, expectedPrincipal);
      remainingToApply -= appliedToPrincipal;
    }

    return {
      pendingAmount: (moratoryInterest - appliedToMoratory) + (expectedInterest - appliedToInterest) + (expectedPrincipal - appliedToPrincipal),
      pendingPrincipal: expectedPrincipal - appliedToPrincipal,
      pendingInterest: expectedInterest - appliedToInterest,
      pendingMoratory: moratoryInterest - appliedToMoratory,
      isCondonated: false,
      isPartialCondonation: hasPartialCondonation,
      condonatedAmount: schedule.condonatedAmount || 0,
      condonatedInterest: schedule.condonatedInterest || 0,
      originalPrincipal: schedule.expectedPrincipal,
      originalAmount: schedule.expectedAmount,
    };
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-500">Cargando...</p>
    </div>
  );

  if (!loan || !client) return (
    <div className="text-center py-8">
      <p className="text-gray-500">Préstamo no encontrado</p>
      <Button onClick={() => navigate('/loans')} className="mt-4">Volver</Button>
    </div>
  );

  const totalPaid = paymentHistory.reduce((sum, p) => {
    if (!p.isVoided) {
      return sum + (p.amountPaid || 0);
    }
    return sum;
  }, 0);

  const totalExpected = schedules.reduce((sum, s) => {
    const amount = s.adjustedAmount ?? s.expectedAmount;
    return sum + amount;
  }, 0);
  
  const totalPending = totalExpected - totalPaid;
  const totalInterest = schedules.reduce((sum, s) => sum + (s.adjustedInterest ?? s.expectedInterest), 0);
  const overdueSchedules = schedules.filter((s) => s.status === 'OVERDUE');
  const paidSchedules = schedules.filter((s) => s.status === 'PAID');
  const condonatedSchedules = schedules.filter((s) => s.status === 'CONDONATED' || s.isCondonated);

  const totalCondonedInterest = condonatedSchedules.reduce((sum, s) => {
    return sum + (s.condonatedInterest || 0);
  }, 0);

  const totalCapitalPending = loan.currentBalance;
  const totalInterestPending = schedules
    .filter(s => s.status !== 'PAID' && s.status !== 'CONDONATED')
    .reduce((sum, s) => sum + (s.adjustedInterest ?? s.expectedInterest), 0);

  const totalMoratory = schedules.reduce((sum, s) => sum + (s.moratoryInterest || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/loans')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Detalle del Préstamo</h1>
          <p className="text-gray-500 mt-1">Información completa del préstamo</p>
        </div>
      </div>

      {overdueSchedules.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
            <div>
              <p className="font-semibold text-red-900">Préstamo con {overdueSchedules.length} cuota(s) vencida(s)</p>
              <p className="text-sm text-red-700">
                Total en mora: {formatCurrency(totalMoratory)} | 
                Cuotas vencidas: {formatCurrency(overdueSchedules.reduce((sum, s) => sum + (s.expectedAmount - (s.paidAmount || 0)), 0))}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {loan.status === 'PENDING' && loan.approvalStatus === 'PENDING' && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-amber-900 text-lg">Préstamo Pendiente de Aprobación</p>
                  <p className="text-sm text-amber-700">Este préstamo debe ser aprobado antes de activarse y permitir pagos</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setIsApproveModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white">
                  <CheckCircle className="w-4 h-4 mr-2" /> Aprobar
                </Button>
                <Button variant="outline" onClick={() => setIsRejectModalOpen(true)} className="border-red-300 text-red-700 hover:bg-red-50">
                  <XCircle className="w-4 h-4 mr-2" /> Rechazar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" /> Información del Cliente
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
            <Button variant="outline" className="w-full mt-4" onClick={() => navigate(`/clients/${client.id}`)}>
              Ver Perfil Completo
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" /> Información del Préstamo
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
                <p className="text-sm text-gray-500">Capital Total</p>
                <p className="text-xl font-bold">{formatCurrency(loan.principalAmount)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Cuotas Pagadas: {paidSchedules.length} de {schedules.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Saldo Pendiente (Capital)</p>
                <p className="text-xl font-bold text-orange-600">{formatCurrency(loan.currentBalance)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Interés Total</p>
                <p className="text-xl font-bold text-purple-600">{formatCurrency(totalInterest)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Estado</p>
                <div className="mt-1">{getStatusBadge(loan.status)}</div>
              </div>
            </div>

            {condonatedSchedules.length > 0 && (
              <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Gift className="w-5 h-5 text-purple-600" />
                  <h4 className="font-semibold text-purple-900">Cuotas Condonadas</h4>
                </div>
                <p className="text-sm text-purple-700">
                  {condonatedSchedules.length} cuota(s) condonada(s) por pagos anticipados
                </p>
                <p className="text-sm text-purple-700">
                  Capital condonado: {formatCurrency(condonatedSchedules.reduce((sum, s) => sum + (s.condonatedAmount || 0), 0))}
                </p>
                <p className="text-sm text-purple-700">
                  Interés condonado: {formatCurrency(totalCondonedInterest)}
                </p>
              </div>
            )}

            <div className="mt-6 pt-6 border-t">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Configuración Financiera
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Método de Amortización</p>
                  <p className="text-sm font-semibold text-gray-900">{getAmortizationLabel(loan.amortizationMethod)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Frecuencia de Pago</p>
                  <p className="text-sm font-semibold text-gray-900">{getFrequencyLabel(loan.paymentFrequency)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Tipo de Tasa</p>
                  <p className="text-sm font-semibold text-gray-900">{loan.rateType === 'EFFECTIVE' ? 'Efectiva' : 'Nominal'}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Convención de Días</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {loan.dayCountConvention === 'ACTUAL_365' ? 'Actual/365' :
                     loan.dayCountConvention === 'THIRTY_360' ? '30/360' : 'Actual/360'}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Días de Gracia</p>
                  <p className="text-sm font-semibold text-gray-900">{loan.graceDays || 0} días</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Política de Prepago</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {loan?.earlyRepaymentPolicy === 'WITH_CONDONATION' ? 'Con Condonación' : 'Sin Condonación'}
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Ajuste Días Inhábiles</p>
                  <p className="text-sm font-semibold text-gray-900">{loan.adjustForBusinessDays ? 'Sí' : 'No'}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total Pagado</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Pendiente (Total)</p>
                <p className="text-2xl font-bold text-orange-700">{formatCurrency(totalPending)}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Total a Pagar</p>
                <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalExpected)}</p>
              </div>
            </div>

            {loan.status === 'ACTIVE' && loan.earlyRepaymentPolicy === 'WITH_CONDONATION' && (
              <div className="mt-6 pt-6 border-t">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Gift className="w-6 h-6 text-purple-600 mt-1" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-purple-900">Pago Total con Condonación</h4>
                      <p className="text-sm text-purple-700 mt-1">
                        Paga el capital pendiente ({formatCurrency(totalCapitalPending)}) y condona todo el interés futuro ({formatCurrency(totalInterestPending)})
                      </p>
                      <Button
                        onClick={() => setIsCondonationModalOpen(true)}
                        className="mt-3 bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        <Gift className="w-4 h-4 mr-2" />
                        Aplicar Pago Total con Condonación
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" /> Calendario de Pagos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No hay cuotas registradas</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No.</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead className="text-blue-700">Monto Pendiente</TableHead>
                  <TableHead>Capital Pend.</TableHead>
                  <TableHead className="text-purple-700">Abono Anticipado</TableHead>
                  <TableHead>Interés Pend.</TableHead>
                  <TableHead className="text-red-600">Mora</TableHead>
                  <TableHead className="text-green-700">Monto Pagado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Pago</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => {
                  const { 
                    pendingAmount, 
                    pendingPrincipal, 
                    pendingInterest, 
                    isCondonated, 
                    isPartialCondonation,
                    condonatedAmount,
                    condonatedInterest,
                    originalPrincipal,
                    originalAmount
                  } = calculatePendingAmounts(schedule);
                  const paidAmount = schedule.paidAmount || 0;
                  const moratoryInterest = schedule.moratoryInterest || 0;
                  
                  const canPay = (loan?.status === 'ACTIVE' || loan?.status === 'DEFAULTED') &&
                                (schedule.status === 'PENDING' || schedule.status === 'OVERDUE' || schedule.status === 'PARTIAL') &&
                                pendingAmount > 0;

                  return (
                    <TableRow 
                      key={schedule.id}
                      className={
                        schedule.status === 'PAID' ? 'bg-green-50' :
                        schedule.status === 'CONDONATED' || isCondonated ? 'bg-purple-50' :
                        schedule.status === 'OVERDUE' ? 'bg-red-50' :
                        isPartialCondonation ? 'bg-blue-50' : ''
                      }
                    >
                      <TableCell className="font-medium">{String(schedule.installmentNumber).padStart(2, '0')}</TableCell>
                      <TableCell>{formatDate(schedule.dueDate)}</TableCell>
                      <TableCell className="font-semibold text-blue-700">
                        {isCondonated ? (
                          <span className="text-purple-600 line-through">{formatCurrency(originalAmount || 0)}</span>
                        ) : isPartialCondonation ? (
                          <div>
                            <div className="text-blue-700">{formatCurrency(pendingAmount)}</div>
                            <div className="text-xs text-gray-400 line-through">{formatCurrency(originalAmount || 0)}</div>
                          </div>
                        ) : (
                          formatCurrency(pendingAmount)
                        )}
                      </TableCell>
                      <TableCell>
                        {isCondonated ? (
                          <span className="text-purple-600 line-through">{formatCurrency(originalPrincipal || 0)}</span>
                        ) : isPartialCondonation ? (
                          <div>
                            <div className="text-blue-700">{formatCurrency(pendingPrincipal)}</div>
                            <div className="text-xs text-gray-400 line-through">{formatCurrency(originalPrincipal || 0)}</div>
                          </div>
                        ) : (
                          formatCurrency(pendingPrincipal)
                        )}
                      </TableCell>
                      <TableCell>
                        {(condonatedAmount || 0) > 0 ? (
                          <span className="font-semibold text-purple-700">
                            {formatCurrency(condonatedAmount || 0)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isCondonated ? (
                          <span className="text-purple-600 line-through">{formatCurrency(schedule.expectedInterest || 0)}</span>
                        ) : (
                          formatCurrency(pendingInterest)
                        )}
                      </TableCell>
                      <TableCell className={moratoryInterest > 0 ? 'text-red-600 font-semibold' : 'text-gray-400'}>
                        {moratoryInterest > 0 ? formatCurrency(moratoryInterest) : '-'}
                      </TableCell>
                      <TableCell className="text-green-700 font-medium">
                        {(paidAmount || 0) > 0 ? formatCurrency(paidAmount || 0) : '-'}
                      </TableCell>
                      <TableCell>
                        {schedule.status === 'CONDONATED' || isCondonated ? (
                          <Badge className="bg-purple-100 text-purple-800 border border-purple-300">
                            <Gift className="w-3 h-3 mr-1" />
                            Condonada
                          </Badge>
                        ) : schedule.status === 'OVERDUE' ? (
                          <Badge className="bg-red-100 text-red-800 border border-red-300">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            En mora
                          </Badge>
                        ) : isPartialCondonation ? (
                          <Badge className="bg-blue-100 text-blue-800 border border-blue-300">
                            <TrendingDown className="w-3 h-3 mr-1" />
                            Abono Anticipado
                          </Badge>
                        ) : (
                          getScheduleStatusBadge(schedule.status)
                        )}
                      </TableCell>
                      <TableCell>{schedule.paidDate ? formatDate(schedule.paidDate) : 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        {canPay ? (
                          <Button
                            size="sm"
                            onClick={() => handleOpenPaymentModal(schedule)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <DollarSign className="w-4 h-4 mr-1" /> Pagar
                          </Button>
                        ) : isCondonated ? (
                          <div className="text-xs text-purple-600">
                            {(condonatedAmount || 0) > 0 && (
                              <div>Capital condonado: {formatCurrency(condonatedAmount || 0)}</div>
                            )}
                            {(condonatedInterest || 0) > 0 && (
                              <div>Interés condonado: {formatCurrency(condonatedInterest || 0)}</div>
                            )}
                          </div>
                        ) : isPartialCondonation ? (
                          <div className="text-xs text-blue-600">
                            <div>Abono anticipado: {formatCurrency((originalPrincipal || 0) - pendingPrincipal)}</div>
                          </div>
                        ) : loan?.status === 'PENDING' ? (
                          <Badge variant="secondary" className="text-xs">Pendiente Aprobación</Badge>
                        ) : loan?.status === 'REJECTED' ? (
                          <Badge variant="destructive" className="text-xs">Rechazado</Badge>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {paymentHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" /> Historial de Pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Monto Pagado</TableHead>
                  <TableHead className="text-red-600">A Mora</TableHead>
                  <TableHead className="text-blue-600">A Capital</TableHead>
                  <TableHead className="text-purple-600">A Interés</TableHead>
                  <TableHead className="text-orange-600">Excedente</TableHead>
                  <TableHead>Destino Excedente</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentHistory.map((payment) => (
                  <TableRow key={payment.id} className={payment.isVoided ? 'bg-red-50 opacity-50' : ''}>
                    <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(payment.amountPaid)}</TableCell>
                    <TableCell className="text-red-600">{formatCurrency(payment.appliedToMoratory || 0)}</TableCell>
                    <TableCell className="text-blue-600">{formatCurrency(payment.appliedToPrincipal || 0)}</TableCell>
                    <TableCell className="text-purple-600">{formatCurrency(payment.appliedToInterest || 0)}</TableCell>
                    <TableCell className="text-orange-600 font-semibold">{formatCurrency(payment.excessAmount || 0)}</TableCell>
                    <TableCell>
                      {(payment.excessAmount ?? 0) > 0 ? (
                        <Badge
                          variant="outline"
                          className={
                            loan?.earlyRepaymentPolicy === 'WITH_CONDONATION'
                              ? 'bg-blue-100 text-blue-800 border-blue-300'
                              : 'bg-purple-100 text-purple-800 border-purple-300'
                          }
                        >
                          {loan?.earlyRepaymentPolicy === 'WITH_CONDONATION'
                            ? '→ Capital'
                            : '→ Interés'}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell><Badge variant="outline">{payment.method}</Badge></TableCell>
                    <TableCell>
                      {payment.isVoided ? (
                        <Badge variant="destructive">Anulado</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800">Válido</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!payment.isVoided ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownloadReceipt(payment.id)}
                              className="text-blue-600 border-blue-300 hover:bg-blue-50"
                            >
                              <FileText className="w-4 h-4 mr-1" /> Recibo
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenAnnulmentModal(payment)}
                              className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                              <Lock className="w-4 h-4 mr-1" /> Anular
                            </Button>
                          </>
                        ) : (
                          <Badge variant="destructive">Anulado</Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Modal de Pago */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <DollarSign className="w-5 h-5" /> Registrar Pago
            </DialogTitle>
            <DialogDescription>
              Cuota #{selectedSchedule?.installmentNumber} - Vence: {selectedSchedule ? formatDate(selectedSchedule.dueDate) : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1">
              <p className="text-sm font-medium text-blue-900">Resumen del Pago</p>
              <p className="text-xs text-blue-700">
                Capital pendiente: {selectedSchedule ? formatCurrency(calculatePendingAmounts(selectedSchedule).pendingPrincipal) : 'N/A'}
              </p>
              <p className="text-xs text-blue-700">
                Interés pendiente: {selectedSchedule ? formatCurrency(calculatePendingAmounts(selectedSchedule).pendingInterest) : 'N/A'}
              </p>
              {selectedSchedule && (selectedSchedule.moratoryInterest || 0) > 0 && (
                <p className="text-xs text-red-700 font-semibold flex items-center gap-1 mt-2">
                  <AlertTriangle className="w-3 h-3" />
                  Mora acumulada: {formatCurrency(selectedSchedule.moratoryInterest || 0)}
                </p>
              )}
              <p className="text-xs text-blue-700 mt-2">
                Saldo total del préstamo: {loan ? formatCurrency(loan.currentBalance) : 'N/A'}
              </p>
              {loan?.earlyRepaymentPolicy === 'WITH_CONDONATION' && (
                <p className="text-xs text-green-700 flex items-center gap-1 mt-2">
                  <Gift className="w-3 h-3" /> Con condonación: El excedente reduce capital futuro
                </p>
              )}
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
            <Button
              onClick={handlePaymentSubmit}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving ? 'Procesando...' : 'Confirmar Pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Condonación */}
      <Dialog open={isCondonationModalOpen} onOpenChange={setIsCondonationModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-700">
              <Gift className="w-5 h-5" />
              Pago Total con Condonación
            </DialogTitle>
            <DialogDescription>
              Esta acción pagará todo el capital pendiente y condonará (perdonará) todo el interés futuro.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-purple-900">Resumen de la Operación</p>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-purple-700">Capital a pagar:</span>
                  <span className="font-semibold">{formatCurrency(totalCapitalPending)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-purple-700">Interés a condonar:</span>
                  <span className="font-semibold text-green-600">{formatCurrency(totalInterestPending)}</span>
                </div>
                <div className="flex justify-between text-xs border-t border-purple-200 pt-1 mt-1">
                  <span className="text-purple-900 font-medium">Total a pagar:</span>
                  <span className="font-bold text-purple-900">{formatCurrency(totalCapitalPending)}</span>
                </div>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800">
                <strong>⚠️ Importante:</strong> Esta acción no se puede deshacer. El préstamo quedará completamente pagado y el interés futuro será perdonado.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCondonationModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleTotalPaymentWithCondonation}
              disabled={isSaving}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isSaving ? 'Procesando...' : '✅ Confirmar Pago con Condonación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Aprobación */}
      <Dialog open={isApproveModalOpen} onOpenChange={setIsApproveModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" /> Aprobar Préstamo
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

      {/* Modal de Rechazo */}
      <Dialog open={isRejectModalOpen} onOpenChange={setIsRejectModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <XCircle className="w-5 h-5" /> Rechazar Préstamo
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
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ej: Documentación incompleta..."
              rows={4}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setIsRejectModalOpen(false); setRejectReason(''); }}
            >
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

      {/* ✅ NUEVO: Modal de Anulación de Pago */}
      <Dialog open={isAnnulmentModalOpen} onOpenChange={setIsAnnulmentModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Lock className="w-5 h-5" />
              Anular Pago
            </DialogTitle>
            <DialogDescription>
              Esta acción requiere autorización de administrador/supervisor con PIN.
            </DialogDescription>
          </DialogHeader>
          
          {selectedPaymentToAnnul && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-red-900">Detalles del Pago a Anular</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-red-700">Fecha:</p>
                  <p className="font-semibold">{formatDate(selectedPaymentToAnnul.paymentDate)}</p>
                </div>
                <div>
                  <p className="text-red-700">Monto:</p>
                  <p className="font-semibold">{formatCurrency(selectedPaymentToAnnul.amountPaid)}</p>
                </div>
                <div>
                  <p className="text-red-700">A Capital:</p>
                  <p className="font-semibold">{formatCurrency(selectedPaymentToAnnul.appliedToPrincipal || 0)}</p>
                </div>
                <div>
                  <p className="text-red-700">A Interés:</p>
                  <p className="font-semibold">{formatCurrency(selectedPaymentToAnnul.appliedToInterest || 0)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4 py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800">
                <strong>⚠️ Importante:</strong> La anulación restaurará el saldo del préstamo y revertirá los montos aplicados a las cuotas. Esta acción quedará registrada en el libro contable.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="annulmentReason">Motivo de Anulación *</Label>
              <Textarea
                id="annulmentReason"
                value={annulmentReason}
                onChange={(e) => setAnnulmentReason(e.target.value)}
                placeholder="Ej: Pago duplicado, error en el monto, solicitud del cliente..."
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="supervisorPin">PIN de Supervisor/Administrador *</Label>
              <Input
                id="supervisorPin"
                type="password"
                maxLength={4}
                value={supervisorPin}
                onChange={(e) => setSupervisorPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="text-center text-2xl tracking-widest"
              />
              <p className="text-xs text-gray-500">Ingrese su PIN de 4 dígitos</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAnnulmentModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAnnulPayment}
              disabled={isAnnulling || !annulmentReason.trim() || supervisorPin.length !== 4}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isAnnulling ? 'Anulando...' : '🔒 Confirmar Anulación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}