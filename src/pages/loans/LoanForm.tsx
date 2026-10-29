import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Calculator, ChevronsUpDown, Search, AlertCircle, Wallet, Percent, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Client {
  id: string;
  fullName: string;
  dpiOrId: string;
  portfolioId?: string;
}

interface Portfolio {
  id: string;
  name: string;
}

interface SchedulePreview {
  installmentNumber: number;
  dueDate: string;
  expectedAmount: number;
  expectedPrincipal: number;
  expectedInterest: number;
  initialBalance: number;
}

export function LoanForm() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [openClientSelect, setOpenClientSelect] = useState(false);
  const [schedulePreview, setSchedulePreview] = useState<SchedulePreview[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState('section1');

  const [formData, setFormData] = useState({
    clientId: '',
    portfolioId: '',
    disbursementMethod: 'CASH',
    openingDate: new Date().toISOString().split('T')[0],
    firstPaymentDate: new Date().toISOString().split('T')[0],
    principalAmount: '',
    administrativeFee: '0',
    feeCollectionMode: 'DEDUCTED',
    interestRate: '',
    rateType: 'NOMINAL',
    paymentFrequency: 'MONTHLY',
    amortizationMethod: 'FRENCH',
    numberOfPayments: '',
    dayCountConvention: 'ACTUAL_360',
    graceDays: '0',
    moratoryType: 'PERCENTAGE',
    moratoryValue: '0.10',
    adjustForBusinessDays: false,
    earlyRepaymentPolicy: 'WITH_CONDONATION',
  });

  useEffect(() => {
    loadClients();
    loadPortfolios();
  }, []);

  const loadClients = async () => {
    try {
      const res = await api.get('/clients');
      setClients(res.data);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  const loadPortfolios = async () => {
    try {
      const res = await api.get('/portfolios');
      setPortfolios(res.data);
    } catch (error) {
      console.error('Error loading portfolios:', error);
    }
  };

  const handleClientSelect = (client: Client) => {
    setFormData({
      ...formData,
      clientId: client.id,
      portfolioId: client.portfolioId || '',
    });
    setOpenClientSelect(false);
    setClientSearch('');
  };

  // ✅ VALIDACIÓN COMPLETA
  const validateForm = (): boolean => {
    if (!formData.clientId) {
      toast.error('Selecciona un cliente');
      setActiveTab('section1');
      return false;
    }
    if (!formData.portfolioId) {
      toast.error('Selecciona una cartera');
      setActiveTab('section1');
      return false;
    }
    if (!formData.principalAmount || parseFloat(formData.principalAmount) <= 0) {
      toast.error('Ingresa un monto principal válido');
      setActiveTab('section2');
      return false;
    }
    if (!formData.interestRate || parseFloat(formData.interestRate) <= 0) {
      toast.error('Ingresa una tasa de interés válida');
      setActiveTab('section2');
      return false;
    }
    if (!formData.numberOfPayments || parseInt(formData.numberOfPayments) <= 0) {
      toast.error('Ingresa un número de cuotas válido');
      setActiveTab('section2');
      return false;
    }
    if (!formData.openingDate) {
      toast.error('Selecciona la fecha de apertura');
      setActiveTab('section1');
      return false;
    }
    if (!formData.firstPaymentDate) {
      toast.error('Selecciona la fecha del primer pago');
      setActiveTab('section1');
      return false;
    }
    if (new Date(formData.firstPaymentDate) <= new Date(formData.openingDate)) {
      toast.error('La fecha del primer pago debe ser posterior a la fecha de apertura');
      setActiveTab('section1');
      return false;
    }
    return true;
  };

  const calculateSchedule = async () => {
    if (!validateForm()) return;

    try {
      const response = await api.post('/loans/simulate', {
        clientId: formData.clientId,
        principalAmount: parseFloat(formData.principalAmount),
        interestRate: parseFloat(formData.interestRate),
        rateType: formData.rateType,
        paymentFrequency: formData.paymentFrequency,
        amortizationMethod: formData.amortizationMethod,
        term: parseInt(formData.numberOfPayments),
        openingDate: formData.openingDate,
        firstPaymentDate: formData.firstPaymentDate,
        dayCountConvention: formData.dayCountConvention,
        earlyRepaymentPolicy: formData.earlyRepaymentPolicy,
        graceDays: parseInt(formData.graceDays),
        adjustForBusinessDays: formData.adjustForBusinessDays,
        administrativeFee: parseFloat(formData.administrativeFee) || 0,
        feeCollectionMode: formData.feeCollectionMode,
      });

      const mappedData = response.data.map((item: any) => ({
        installmentNumber: item.installmentNumber,
        dueDate: item.dueDate,
        expectedAmount: item.installmentAmount,
        expectedPrincipal: item.principalAmount,
        expectedInterest: item.interestAmount,
        remainingBalance: item.remainingBalance,
      }));

      let balance = parseFloat(formData.principalAmount);
      const scheduleWithBalance = mappedData.map((item: any) => {
        const result = {
          ...item,
          initialBalance: balance,
        };
        balance -= item.expectedPrincipal;
        return result;
      });

      setSchedulePreview(scheduleWithBalance);
      setShowPreview(true);
      setActiveTab('section3');
      toast.success('✅ Calendario calculado correctamente');
    } catch (error: any) {
      console.error('Error al calcular:', error);
      toast.error(error.response?.data?.message || 'Error al calcular el calendario');
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await api.post('/loans', {
        clientId: formData.clientId,
        portfolioId: formData.portfolioId || null,
        principalAmount: parseFloat(formData.principalAmount),
        interestRate: parseFloat(formData.interestRate),
        rateType: formData.rateType,
        paymentFrequency: formData.paymentFrequency,
        amortizationMethod: formData.amortizationMethod,
        term: parseInt(formData.numberOfPayments),
        openingDate: formData.openingDate,
        firstPaymentDate: formData.firstPaymentDate,
        dayCountConvention: formData.dayCountConvention,
        earlyRepaymentPolicy: formData.earlyRepaymentPolicy,
        graceDays: parseInt(formData.graceDays),
        adjustForBusinessDays: formData.adjustForBusinessDays,
        disbursementMethod: formData.disbursementMethod,
        administrativeFee: parseFloat(formData.administrativeFee) || 0,
        feeCollectionMode: formData.feeCollectionMode,
        moratoryType: formData.moratoryType,
        moratoryValue: parseFloat(formData.moratoryValue) || 0,
      });
      toast.success('✅ Préstamo creado. Quedó en estado PENDIENTE de aprobación.');
      navigate('/loans');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al crear el préstamo');
    } finally {
      setSubmitting(false);
    }
  };


  const filteredClients = clients.filter((c) =>
    c.fullName.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.dpiOrId.toLowerCase().startsWith(clientSearch.toLowerCase())
  );

  const selectedClient = clients.find(c => c.id === formData.clientId);

  const principal = parseFloat(formData.principalAmount) || 0;
  const commission = parseFloat(formData.administrativeFee) || 0;
  const totalCapital = schedulePreview.reduce((sum, s) => sum + (s.expectedPrincipal || 0), 0);
  const totalInterest = schedulePreview.reduce((sum, s) => sum + (s.expectedInterest || 0), 0);
  const totalToPay = schedulePreview.reduce((sum, s) => sum + (s.expectedAmount || 0), 0);
  const netDisbursement = formData.feeCollectionMode === 'DEDUCTED' ? principal - commission : principal;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-500">Cargando...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Crear Préstamo</h1>
          <p className="text-gray-500 mt-1">Completa la información del nuevo préstamo</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="section1">
            <Wallet className="w-4 h-4 mr-2" />
            Datos Operativos
          </TabsTrigger>
          <TabsTrigger value="section2">
            <Percent className="w-4 h-4 mr-2" />
            Condiciones Financieras
          </TabsTrigger>
          <TabsTrigger value="section3">
            <Calendar className="w-4 h-4 mr-2" />
            Simulación
          </TabsTrigger>
        </TabsList>

        {/* SECCIÓN 1: Datos Operativos */}
        <TabsContent value="section1">
          <Card>
            <CardHeader>
              <CardTitle>Datos Operativos y de Identificación</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Cliente *</Label>
                  <Popover open={openClientSelect} onOpenChange={setOpenClientSelect}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between bg-white hover:bg-gray-50">
                        {selectedClient ? (
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{selectedClient.fullName}</span>
                            <span className="text-xs text-gray-500">DUI: {selectedClient.dpiOrId}</span>
                          </div>
                        ) : (
                          <span className="text-gray-500">Buscar cliente...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <div className="p-2 border-b">
                        <div className="flex items-center border rounded-md px-3">
                          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                          <input
                            placeholder="Buscar por nombre o DUI..."
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                            className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-gray-500"
                          />
                        </div>
                      </div>
                      <div className="max-h-64 overflow-auto">
                        {filteredClients.length === 0 ? (
                          <div className="py-6 text-center text-sm text-gray-500">No encontrado</div>
                        ) : (
                          filteredClients.map((client) => (
                            <div
                              key={client.id}
                              onClick={() => handleClientSelect(client)}
                              className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{client.fullName}</span>
                                <span className="text-xs text-gray-500">DUI: {client.dpiOrId}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Cartera / Ruta / Cobrador *</Label>
                  <Select value={formData.portfolioId} onValueChange={(v) => setFormData({ ...formData, portfolioId: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cartera..." />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-white">
                      {portfolios.map((portfolio) => (
                        <SelectItem key={portfolio.id} value={portfolio.id}>
                          {portfolio.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">Se precarga con la cartera del cliente</p>
                </div>

                <div className="space-y-2">
                  <Label>Método de Desembolso *</Label>
                  <Select value={formData.disbursementMethod} onValueChange={(v) => setFormData({ ...formData, disbursementMethod: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-white">
                      <SelectItem value="CASH">Efectivo</SelectItem>
                      <SelectItem value="TRANSFER">Transferencia Bancaria</SelectItem>
                      <SelectItem value="CHECK">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Fecha de Apertura *</Label>
                  <Input
                    type="date"
                    value={formData.openingDate}
                    onChange={(e) => setFormData({ ...formData, openingDate: e.target.value })}
                  />
                  <p className="text-xs text-gray-500">Fecha en que se desembolsa el préstamo</p>
                </div>

                <div className="space-y-2">
                  <Label>Fecha del Primer Pago *</Label>
                  <Input
                    type="date"
                    value={formData.firstPaymentDate}
                    onChange={(e) => setFormData({ ...formData, firstPaymentDate: e.target.value })}
                  />
                  <p className="text-xs text-gray-500">Fecha del primer vencimiento</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SECCIÓN 2: Condiciones Financieras */}
        <TabsContent value="section2">
          <Card>
            <CardHeader>
              <CardTitle>Condiciones Financieras, Parámetros y Mora</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Monto Principal *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.principalAmount}
                    onChange={(e) => setFormData({ ...formData, principalAmount: e.target.value })}
                    placeholder="600.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Gastos Administrativos / Comisión</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.administrativeFee}
                    onChange={(e) => setFormData({ ...formData, administrativeFee: e.target.value })}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500">Comisión por apertura (valor fijo)</p>
                </div>

                {parseFloat(formData.administrativeFee) > 0 && (
                  <div className="space-y-2 md:col-span-2">
                    <Label>Modo de Cobro de Comisión</Label>
                    <div className="flex gap-4">
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="feeCollectionMode"
                          value="DEDUCTED"
                          checked={formData.feeCollectionMode === 'DEDUCTED'}
                          onChange={(e) => setFormData({ ...formData, feeCollectionMode: e.target.value })}
                        />
                        <span>Descontar del desembolso</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="feeCollectionMode"
                          value="FINANCED"
                          checked={formData.feeCollectionMode === 'FINANCED'}
                          onChange={(e) => setFormData({ ...formData, feeCollectionMode: e.target.value })}
                        />
                        <span>Financiar en cuotas</span>
                      </label>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Tasa de Interés Anual (%) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.interestRate}
                    onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                    placeholder="180.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Tasa *</Label>
                  <Select value={formData.rateType} onValueChange={(v) => setFormData({ ...formData, rateType: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-white">
                      <SelectItem value="NOMINAL">Nominal</SelectItem>
                      <SelectItem value="EFFECTIVE">Efectiva</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Modalidad de Pago *</Label>
                  <Select value={formData.paymentFrequency} onValueChange={(v) => setFormData({ ...formData, paymentFrequency: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-white">
                      <SelectItem value="DAILY">Diario</SelectItem>
                      <SelectItem value="WEEKLY">Semanal</SelectItem>
                      <SelectItem value="BIWEEKLY">Quincenal</SelectItem>
                      <SelectItem value="MONTHLY">Mensual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Método de Amortización *</Label>
                  <Select value={formData.amortizationMethod} onValueChange={(v) => setFormData({ ...formData, amortizationMethod: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-white">
                      <SelectItem value="FRENCH">Francés (Cuota Fija)</SelectItem>
                      <SelectItem value="GERMAN">Alemán</SelectItem>
                      <SelectItem value="FLAT">Flat (Interés Fijo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Número de Cuotas *</Label>
                  <Input
                    type="number"
                    value={formData.numberOfPayments}
                    onChange={(e) => setFormData({ ...formData, numberOfPayments: e.target.value })}
                    placeholder="12"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Convención de Días</Label>
                  <Select value={formData.dayCountConvention} onValueChange={(v) => setFormData({ ...formData, dayCountConvention: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-white">
                      <SelectItem value="ACTUAL_360">Actual/360</SelectItem>
                      <SelectItem value="ACTUAL_365">Actual/365</SelectItem>
                      <SelectItem value="THIRTY_360">30/360</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Días de Gracia</Label>
                  <Input
                    type="number"
                    value={formData.graceDays}
                    onChange={(e) => setFormData({ ...formData, graceDays: e.target.value })}
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500">Días de tolerancia antes de aplicar mora</p>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Mora</Label>
                  <Select value={formData.moratoryType} onValueChange={(v) => setFormData({ ...formData, moratoryType: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-white">
                      <SelectItem value="PERCENTAGE">Porcentaje Diario sobre Saldo Vencido</SelectItem>
                      <SelectItem value="FIXED">Cargo Fijo por Incumplimiento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Valor de Mora {formData.moratoryType === 'PERCENTAGE' ? '(%)' : '($)'}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.moratoryValue}
                    onChange={(e) => setFormData({ ...formData, moratoryValue: e.target.value })}
                    placeholder={formData.moratoryType === 'PERCENTAGE' ? '0.10' : '5.00'}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="adjustForBusinessDays"
                      checked={formData.adjustForBusinessDays}
                      onCheckedChange={(checked) => setFormData({ ...formData, adjustForBusinessDays: checked as boolean })}
                    />
                    <Label htmlFor="adjustForBusinessDays" className="cursor-pointer">
                      Ajustar vencimientos a días hábiles
                    </Label>
                  </div>
                  <p className="text-xs text-gray-500">Si cae en fin de semana, mueve al lunes</p>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Política de Prepago</Label>
                  <Select value={formData.earlyRepaymentPolicy} onValueChange={(v) => setFormData({ ...formData, earlyRepaymentPolicy: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-50 bg-white">
                      <SelectItem value="WITH_CONDONATION">Con Condonación</SelectItem>
                      <SelectItem value="NO_CONDONATION">Sin Condonación</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SECCIÓN 3: Simulación */}
        <TabsContent value="section3">
          <Card>
            <CardHeader>
              <CardTitle>Simulación, Calendario de Pagos y Resumen Financiero</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 mb-6">
                <Button onClick={calculateSchedule}>
                  <Calculator className="w-4 h-4 mr-2" /> Calcular Cuotas
                </Button>
              </div>

              {showPreview && schedulePreview.length > 0 && (
                <>
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-3">Calendario de Pagos</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nº</TableHead>
                          <TableHead>Vencimiento</TableHead>
                          <TableHead>Saldo Inicial</TableHead>
                          <TableHead>Capital</TableHead>
                          <TableHead>Interés</TableHead>
                          <TableHead>Cuota Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {schedulePreview.map((s) => (
                          <TableRow key={s.installmentNumber}>
                            <TableCell>{s.installmentNumber}</TableCell>
                            <TableCell>{formatDate(s.dueDate)}</TableCell>
                            <TableCell>{formatCurrency(s.initialBalance)}</TableCell>
                            <TableCell>{formatCurrency(s.expectedPrincipal)}</TableCell>
                            <TableCell>{formatCurrency(s.expectedInterest)}</TableCell>
                            <TableCell className="font-semibold">{formatCurrency(s.expectedAmount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-blue-50 border-blue-200">
                      <CardContent className="pt-6">
                        <p className="text-sm text-gray-600">Total Capital</p>
                        <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalCapital)}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-purple-50 border-purple-200">
                      <CardContent className="pt-6">
                        <p className="text-sm text-gray-600">Total Interés</p>
                        <p className="text-2xl font-bold text-purple-900">{formatCurrency(totalInterest)}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-green-50 border-green-200">
                      <CardContent className="pt-6">
                        <p className="text-sm text-gray-600">Total a Pagar</p>
                        <p className="text-2xl font-bold text-green-900">{formatCurrency(totalToPay)}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-emerald-50 border-emerald-200">
                      <CardContent className="pt-6">
                        <p className="text-sm text-gray-600">Monto Neto a Desembolsar</p>
                        <p className="text-2xl font-bold text-emerald-900">{formatCurrency(netDisbursement)}</p>
                        {commission > 0 && formData.feeCollectionMode === 'DEDUCTED' && (
                          <p className="text-xs text-emerald-700 mt-1">
                            (Principal ${principal} - Comisión ${commission})
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}

              <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">
                      Los préstamos creados quedan en estado PENDIENTE
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      Un administrador deberá revisar y aprobar este préstamo antes de que se active.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={calculateSchedule}>
                  <Calculator className="w-4 h-4 mr-2" /> Calcular Cuotas
                </Button>
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Creando...' : 'Crear Préstamo'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}