import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Eye, CreditCard, DollarSign, AlertCircle, Search, TrendingUp, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Loan } from '@/types';

export function Loans() {
  const navigate = useNavigate();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [approvalFilter, setApprovalFilter] = useState('all');
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [loanToDelete, setLoanToDelete] = useState<Loan | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => { loadLoans(); }, [statusFilter, approvalFilter]);
  useEffect(() => {
    const timer = setTimeout(() => { loadLoans(); }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadLoans = async () => {
    try {
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search) params.search = search;
      const response = await api.get('/loans', { params });
      setLoans(response.data);
    } catch (error) {
      console.error('Error loading loans:', error);
      toast.error('Error al cargar los préstamos');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedLoan) return;
    setIsProcessing(true);
    try {
      await api.post(`/loans/${selectedLoan.id}/approve`);
      toast.success('✅ Préstamo aprobado y activado correctamente');
      setIsApproveModalOpen(false);
      setSelectedLoan(null);
      loadLoans();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al aprobar el préstamo');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedLoan) return;
    if (!rejectReason.trim()) {
      toast.error('Debes ingresar una razón para el rechazo');
      return;
    }
    setIsProcessing(true);
    try {
      await api.post(`/loans/${selectedLoan.id}/reject`, { reason: rejectReason });
      toast.success('❌ Préstamo rechazado correctamente');
      setIsRejectModalOpen(false);
      setSelectedLoan(null);
      setRejectReason('');
      loadLoans();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al rechazar el préstamo');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteLoan = async () => {
    if (!loanToDelete) return;
    setIsProcessing(true);
    try {
      await api.delete(`/loans/${loanToDelete.id}`);
      toast.success('🗑️ Préstamo y toda su información relacionados eliminados correctamente');
      setIsDeleteModalOpen(false);
      setLoanToDelete(null);
      loadLoans();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar el préstamo');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800 hover:bg-green-100',
      PENDING: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
      DEFAULTED: 'bg-red-100 text-red-800 hover:bg-red-100',
      PAID: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
      REJECTED: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
    };
    const labels: Record<string, string> = {
      ACTIVE: 'Activo', PENDING: 'Pendiente', DEFAULTED: 'Vencido', PAID: 'Pagado', REJECTED: 'Rechazado',
    };
    return <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>{labels[status] || status}</Badge>;
  };

  const getApprovalBadge = (loan: Loan) => {
    if (loan.status !== 'PENDING') return null;
    const approvalStatus = loan.approvalStatus || 'PENDING';
    if (approvalStatus === 'APPROVED') {
      return (
        <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> Aprobado
        </Badge>
      );
    }
    if (approvalStatus === 'REJECTED') {
      return (
        <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
          <XCircle className="w-3 h-3" /> Rechazado
        </Badge>
      );
    }
    return (
      <Badge className="bg-amber-100 text-amber-800 flex items-center gap-1">
        <Clock className="w-3 h-3" /> Por Aprobar
      </Badge>
    );
  };

  const getAmortizationBadge = (method: string) => {
    const variants: Record<string, string> = {
      FRENCH: 'bg-blue-100 text-blue-800',
      FLAT: 'bg-purple-100 text-purple-800',
      GERMAN: 'bg-orange-100 text-orange-800',
    };
    const labels: Record<string, string> = {
      FRENCH: 'Francés', FLAT: 'Flat', GERMAN: 'Alemán',
    };
    return <Badge className={variants[method] || 'bg-gray-100'}>{labels[method] || method}</Badge>;
  };

  const filteredLoans = loans.filter((loan) => {
    if (approvalFilter === 'pending-approval') {
      return loan.status === 'PENDING' && loan.approvalStatus === 'PENDING';
    }
    if (approvalFilter === 'approved') {
      return loan.approvalStatus === 'APPROVED';
    }
    if (approvalFilter === 'rejected') {
      return loan.approvalStatus === 'REJECTED';
    }
    return true;
  });

  const pendingApprovalCount = loans.filter(
    l => l.status === 'PENDING' && l.approvalStatus === 'PENDING'
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Cargando préstamos...</p>
      </div>
    );
  }

  const totalLoans = filteredLoans.length;
  const activeLoans = filteredLoans.filter(l => l.status === 'ACTIVE').length;
  const totalPortfolio = filteredLoans.reduce((sum, loan) => sum + loan.principalAmount, 0);
  const totalBalance = filteredLoans.reduce((sum, loan) => sum + loan.currentBalance, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Préstamos</h1>
          <p className="text-gray-500 mt-1">Gestión de préstamos de la financiera</p>
        </div>
        <Button onClick={() => navigate('/loans/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Préstamo
        </Button>
      </div>

      {pendingApprovalCount > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-900">
                  {pendingApprovalCount} préstamo(s) pendiente(s) de aprobación
                </p>
                <p className="text-sm text-amber-700">
                  Revisa y aprueba o rechaza los préstamos pendientes
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="border-amber-300 bg-white hover:bg-amber-50"
              onClick={() => setApprovalFilter('pending-approval')}
            >
              Ver Pendientes
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Total Préstamos</p>
                <p className="text-2xl font-bold">{totalLoans}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Activos</p>
                <p className="text-2xl font-bold">{activeLoans}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">Cartera Total</p>
                <p className="text-2xl font-bold">{formatCurrency(totalPortfolio)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-500">Saldo Pendiente</p>
                <p className="text-2xl font-bold">{formatCurrency(totalBalance)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-white">
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="ACTIVE">Activos</SelectItem>
                <SelectItem value="PENDING">Pendientes</SelectItem>
                <SelectItem value="DEFAULTED">Vencidos</SelectItem>
                <SelectItem value="PAID">Pagados</SelectItem>
                <SelectItem value="REJECTED">Rechazados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={approvalFilter} onValueChange={setApprovalFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Aprobación" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-white">
                <SelectItem value="all">Todas las aprobaciones</SelectItem>
                <SelectItem value="pending-approval">⏳ Por Aprobar</SelectItem>
                <SelectItem value="approved">✅ Aprobados</SelectItem>
                <SelectItem value="rejected">❌ Rechazados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Lista de Préstamos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLoans.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay préstamos registrados
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>Tasa</TableHead>
                  <TableHead>Plazo</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Aprobación</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLoans.map((loan) => (
                  <TableRow
                    key={loan.id}
                    className={
                      loan.status === 'DEFAULTED' ? 'bg-red-50 hover:bg-red-100' :
                      loan.status === 'PENDING' && loan.approvalStatus === 'PENDING' ? 'bg-amber-50 hover:bg-amber-100' : ''
                    }
                  >
                    <TableCell className="font-medium">{loan.clientName}</TableCell>
                    <TableCell>{formatCurrency(loan.principalAmount)}</TableCell>
                    <TableCell>{formatCurrency(loan.currentBalance)}</TableCell>
                    <TableCell>{loan.interestRate}%</TableCell>
                    <TableCell>{loan.termMonths} meses</TableCell>
                    <TableCell>{getAmortizationBadge(loan.amortizationMethod)}</TableCell>
                    <TableCell>{getStatusBadge(loan.status)}</TableCell>
                    <TableCell>{getApprovalBadge(loan)}</TableCell>
                    <TableCell>{formatDate(loan.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {loan.status === 'PENDING' && loan.approvalStatus === 'PENDING' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => {
                                setSelectedLoan(loan);
                                setIsApproveModalOpen(true);
                              }}
                              title="Aprobar préstamo"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setSelectedLoan(loan);
                                setIsRejectModalOpen(true);
                              }}
                              title="Rechazar préstamo"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {(loan.approvalStatus === 'PENDING' || loan.approvalStatus === 'REJECTED') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setLoanToDelete(loan);
                              setIsDeleteModalOpen(true);
                            }}
                            title="Eliminar préstamo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/loans/${loan.id}`)}
                        >
                          <Eye className="w-4 h-4" />
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

      <div className="text-sm text-gray-500">
        Mostrando {filteredLoans.length} préstamo(s)
        {pendingApprovalCount > 0 && ` · ${pendingApprovalCount} pendiente(s) de aprobación`}
      </div>

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
          {selectedLoan && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Cliente:</span>
                  <span className="font-medium">{selectedLoan.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Monto:</span>
                  <span className="font-bold text-blue-700">{formatCurrency(selectedLoan.principalAmount)}</span>
                </div> 
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Tasa:</span>
                  <span className="font-medium">{selectedLoan.interestRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Plazo:</span>
                  <span className="font-medium">{selectedLoan.termMonths} meses</span>
                </div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-800">
                  <strong>️ Importante:</strong> Esta acción activará el préstamo inmediatamente.
                  Asegúrate de haber revisado la documentación del cliente.
                </p>
              </div>
            </div>
          )}
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
          {selectedLoan && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Cliente:</span>
                  <span className="font-medium">{selectedLoan.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Monto:</span>
                  <span className="font-bold">{formatCurrency(selectedLoan.principalAmount)}</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Razón del rechazo *
                </label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ej: Documentación incompleta, no cumple con requisitos de scoring, etc."
                  rows={4}
                  className="resize-none"
                />
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">
                  <strong>️ Importante:</strong> El préstamo quedará en estado rechazado y no podrá ser activado.
                </p>
              </div>
            </div>
          )}
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
              {isProcessing ? 'Rechazando...' : '❌ Rechazar Préstamo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <Trash2 className="w-5 h-5" />
              Eliminar Préstamo
            </DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar este préstamo? Esta acción no se puede deshacer y se eliminará toda la información asociada (calendario de pagos, historial, etc.).
            </DialogDescription>
          </DialogHeader>
          {loanToDelete && (
            <div className="space-y-4 py-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Cliente:</span>
                  <span className="font-medium">{loanToDelete.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Monto:</span>
                  <span className="font-bold text-red-700">{formatCurrency(loanToDelete.principalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Estado:</span>
                  <span className="font-medium">{loanToDelete.status}</span>
                </div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">
                  <strong>⚠️ Advertencia:</strong> Asegúrate de que este préstamo no tenga pagos registrados ni actividad financiera. Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsDeleteModalOpen(false);
              setLoanToDelete(null);
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleDeleteLoan} 
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isProcessing ? 'Eliminando...' : '️ Sí, eliminar definitivamente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}