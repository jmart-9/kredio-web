import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, Calculator, Check, ChevronsUpDown, Search } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

interface Client { id: string; fullName: string; dpiOrId: string; }
interface SchedulePreview { installmentNumber: number; dueDate: string; expectedAmount: number; expectedPrincipal: number; expectedInterest: number; }

export function LoanForm() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [schedulePreview, setSchedulePreview] = useState<SchedulePreview[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [openClientSelect, setOpenClientSelect] = useState(false);
  const [formData, setFormData] = useState({
    clientId: '', principalAmount: '', interestRate: '', paymentFrequency: 'MONTHLY',
    amortizationMethod: 'FRENCH', numberOfPayments: '',
    openingDate: new Date().toISOString().split('T')[0],
    firstPaymentDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => { loadClients(); }, []);

  const loadClients = async () => {
    try {
      const response = await api.get('/clients');
      setClients(response.data);
    } catch (error) { toast.error('Error al cargar los clientes'); } 
    finally { setLoading(false); }
  };

  const calculateSchedule = () => {
    const principal = parseFloat(formData.principalAmount);
    const annualRate = parseFloat(formData.interestRate) / 100;
    const numberOfPayments = parseInt(formData.numberOfPayments);

    if (!principal || !annualRate || !numberOfPayments) {
      toast.error('Completa todos los campos para calcular');
      return;
    }

    // 1. Calcular tasa del período (Igual que el backend)
    const monthlyRate = annualRate / 12;
    let periodRate: number;
    switch (formData.paymentFrequency) {
      case 'DAILY': periodRate = monthlyRate / 30; break;
      case 'WEEKLY': periodRate = monthlyRate / 4.33; break;
      case 'BIWEEKLY': periodRate = monthlyRate / 2; break;
      case 'MONTHLY': periodRate = monthlyRate; break;
      case 'QUARTERLY': periodRate = monthlyRate * 3; break;
      case 'SEMIANNUAL': periodRate = monthlyRate * 6; break;
      case 'ANNUAL': periodRate = monthlyRate * 12; break;
      default: periodRate = monthlyRate;
    }

    const schedule: SchedulePreview[] = [];
    let remainingBalance = principal;

    if (formData.amortizationMethod === 'SIMPLE') {
      const fixedInterest = principal * periodRate;
      const fixedPrincipal = principal / numberOfPayments;
      const payment = fixedPrincipal + fixedInterest;

      for (let i = 1; i <= numberOfPayments; i++) {
        const dueDate = new Date(formData.firstPaymentDate);
        switch (formData.paymentFrequency) {
          case 'DAILY': dueDate.setDate(dueDate.getDate() + (i - 1)); break;
          case 'WEEKLY': dueDate.setDate(dueDate.getDate() + (i - 1) * 7); break;
          case 'BIWEEKLY': dueDate.setDate(dueDate.getDate() + (i - 1) * 14); break;
          case 'MONTHLY': dueDate.setMonth(dueDate.getMonth() + (i - 1)); break;
          case 'QUARTERLY': dueDate.setMonth(dueDate.getMonth() + (i - 1) * 3); break;
          case 'SEMIANNUAL': dueDate.setMonth(dueDate.getMonth() + (i - 1) * 6); break;
          case 'ANNUAL': dueDate.setFullYear(dueDate.getFullYear() + (i - 1)); break;
        }

        let principalPayment = fixedPrincipal;
        let paymentAmount = payment;
        if (i === numberOfPayments) {
          principalPayment = remainingBalance;
          paymentAmount = principalPayment + fixedInterest;
        }
        remainingBalance -= principalPayment;

        schedule.push({ installmentNumber: i, dueDate: dueDate.toISOString().split('T')[0], expectedAmount: paymentAmount, expectedPrincipal: principalPayment, expectedInterest: fixedInterest });
      }
    } else {
      // FRENCH
      let payment: number;
      if (periodRate === 0) {
        payment = principal / numberOfPayments;
      } else {
        const onePlusRate = 1 + periodRate;
        const numerator = periodRate * Math.pow(onePlusRate, numberOfPayments);
        const denominator = Math.pow(onePlusRate, numberOfPayments) - 1;
        payment = principal * (numerator / denominator);
      }

      for (let i = 1; i <= numberOfPayments; i++) {
        const dueDate = new Date(formData.firstPaymentDate);
        switch (formData.paymentFrequency) {
          case 'DAILY': dueDate.setDate(dueDate.getDate() + (i - 1)); break;
          case 'WEEKLY': dueDate.setDate(dueDate.getDate() + (i - 1) * 7); break;
          case 'BIWEEKLY': dueDate.setDate(dueDate.getDate() + (i - 1) * 14); break;
          case 'MONTHLY': dueDate.setMonth(dueDate.getMonth() + (i - 1)); break;
          case 'QUARTERLY': dueDate.setMonth(dueDate.getMonth() + (i - 1) * 3); break;
          case 'SEMIANNUAL': dueDate.setMonth(dueDate.getMonth() + (i - 1) * 6); break;
          case 'ANNUAL': dueDate.setFullYear(dueDate.getFullYear() + (i - 1)); break;
        }

        const interest = remainingBalance * periodRate;
        let principalPayment = payment - interest;

        if (i === numberOfPayments) {
          principalPayment = remainingBalance;
          payment = principalPayment + interest;
        }
        remainingBalance -= principalPayment;

        schedule.push({ installmentNumber: i, dueDate: dueDate.toISOString().split('T')[0], expectedAmount: payment, expectedPrincipal: principalPayment, expectedInterest: interest });
      }
    }

    setSchedulePreview(schedule);
    setShowPreview(true);
  };

  const handleSubmit = async () => {
    if (!formData.clientId || !formData.principalAmount || !formData.interestRate || !formData.numberOfPayments || !formData.openingDate || !formData.firstPaymentDate) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/loans', {
        clientId: formData.clientId, principalAmount: parseFloat(formData.principalAmount),
        interestRate: parseFloat(formData.interestRate), rateType: 'ANNUAL',
        paymentFrequency: formData.paymentFrequency, amortizationMethod: formData.amortizationMethod,
        term: parseInt(formData.numberOfPayments), openingDate: formData.openingDate, firstPaymentDate: formData.firstPaymentDate,
      });
      toast.success('Préstamo creado correctamente');
      navigate('/clients');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al crear el préstamo');
    } finally { setSubmitting(false); }
  };

  const filteredClients = clients.filter((c) => c.fullName.toLowerCase().includes(clientSearch.toLowerCase()) || c.dpiOrId.toLowerCase().startsWith(clientSearch.toLowerCase()));
  const selectedClient = clients.find(c => c.id === formData.clientId);
  const totalCapital = schedulePreview.reduce((sum, s) => sum + s.expectedPrincipal, 0);
  const totalInterest = schedulePreview.reduce((sum, s) => sum + s.expectedInterest, 0);
  const totalToPay = schedulePreview.reduce((sum, s) => sum + s.expectedAmount, 0);

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-500">Cargando...</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></Button>
        <div><h1 className="text-3xl font-bold text-gray-800">Crear Préstamo</h1><p className="text-gray-500 mt-1">Completa la información del nuevo préstamo</p></div>
      </div>

      <Card>
        <CardHeader><CardTitle>Información del Préstamo</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Popover open={openClientSelect} onOpenChange={setOpenClientSelect}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between bg-white hover:bg-gray-50">
                    {selectedClient ? <span className="truncate">{selectedClient.fullName} - {selectedClient.dpiOrId}</span> : <span>Busca un cliente...</span>}
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0 bg-white border border-gray-200 shadow-lg" align="start">
                  <div className="bg-white">
                    <div className="flex items-center border-b border-gray-200 px-3 py-2">
                      <Search className="mr-2 h-4 w-4 opacity-50" />
                      <input type="text" placeholder="Buscar..." value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} className="flex h-8 w-full bg-transparent py-1 text-sm outline-none" autoFocus />
                    </div>
                    <div className="max-h-64 overflow-auto">
                      {filteredClients.length === 0 ? <div className="py-6 text-center text-sm text-gray-500">No encontrado</div> : filteredClients.map((client) => (
                        <div key={client.id} onClick={() => { setFormData({ ...formData, clientId: client.id }); setOpenClientSelect(false); setClientSearch(''); }} className={`flex cursor-pointer items-center px-3 py-2 hover:bg-gray-100 ${formData.clientId === client.id ? 'bg-blue-50' : ''}`}>
                          <Check className={`mr-2 h-4 w-4 ${formData.clientId === client.id ? "opacity-100" : "opacity-0"}`} />
                          <div className="flex flex-col"><span className="font-medium">{client.fullName}</span><span className="text-xs text-gray-500">DUI: {client.dpiOrId}</span></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2"><Label>Monto Principal *</Label><Input type="number" step="0.01" value={formData.principalAmount} onChange={(e) => setFormData({ ...formData, principalAmount: e.target.value })} placeholder="10000.00" /></div>
            <div className="space-y-2"><Label>Tasa de Interés Anual (%) *</Label><Input type="number" step="0.01" value={formData.interestRate} onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })} placeholder="180.00" /></div>
            <div className="space-y-2">
              <Label>Modalidad de Pago *</Label>
              <Select value={formData.paymentFrequency} onValueChange={(v) => setFormData({ ...formData, paymentFrequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-50 bg-white">
                  <SelectItem value="DAILY">Diaria</SelectItem><SelectItem value="WEEKLY">Semanal</SelectItem><SelectItem value="BIWEEKLY">Quincenal</SelectItem>
                  <SelectItem value="MONTHLY">Mensual</SelectItem><SelectItem value="QUARTERLY">Trimestral</SelectItem><SelectItem value="SEMIANNUAL">Semestral</SelectItem><SelectItem value="ANNUAL">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Interés *</Label>
              <Select value={formData.amortizationMethod} onValueChange={(v) => setFormData({ ...formData, amortizationMethod: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="z-50 bg-white">
                  <SelectItem value="FRENCH">Sobre Saldo (Variable)</SelectItem>
                  <SelectItem value="SIMPLE">Fijo (1 mes completo)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">{formData.amortizationMethod === 'FRENCH' ? 'Interés sobre saldo insoluto (disminuye con cada pago)' : 'Interés fijo: siempre cobra 1 mes completo de interés sobre el capital'}</p>
            </div>
            <div className="space-y-2"><Label>Número de Cuotas *</Label><Input type="number" value={formData.numberOfPayments} onChange={(e) => setFormData({ ...formData, numberOfPayments: e.target.value })} placeholder="12" /></div>
            <div className="space-y-2"><Label>Fecha de Apertura *</Label><Input type="date" value={formData.openingDate} onChange={(e) => setFormData({ ...formData, openingDate: e.target.value })} /><p className="text-xs text-gray-500">Fecha en que se desembolsa el préstamo</p></div>
            <div className="space-y-2"><Label>Fecha del Primer Pago *</Label><Input type="date" value={formData.firstPaymentDate} onChange={(e) => setFormData({ ...formData, firstPaymentDate: e.target.value })} /></div>
          </div>
          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={calculateSchedule}><Calculator className="w-4 h-4 mr-2" /> Calcular Cuotas</Button>
            <Button onClick={handleSubmit} disabled={submitting}>{submitting ? 'Creando...' : 'Crear Préstamo'}</Button>
          </div>
        </CardContent>
      </Card>

      {showPreview && schedulePreview.length > 0 && (
        <>
          <Card>
            <CardHeader><CardTitle>Vista Previa del Calendario</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>No.</TableHead><TableHead>Vencimiento</TableHead><TableHead>Cuota</TableHead><TableHead>Capital</TableHead><TableHead>Interés</TableHead></TableRow></TableHeader>
                <TableBody>
                  {schedulePreview.map((s) => (
                    <TableRow key={s.installmentNumber}>
                      <TableCell>{s.installmentNumber}</TableCell>
                      <TableCell>{formatDate(s.dueDate)}</TableCell>
                      <TableCell>{formatCurrency(s.expectedAmount)}</TableCell>
                      <TableCell>{formatCurrency(s.expectedPrincipal)}</TableCell>
                      <TableCell>{formatCurrency(s.expectedInterest)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader><CardTitle className="text-blue-900">Resumen del Préstamo</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border border-blue-200"><p className="text-sm text-gray-600">Total Capital</p><p className="text-2xl font-bold text-blue-900">{formatCurrency(totalCapital)}</p></div>
                <div className="bg-white p-4 rounded-lg border border-blue-200"><p className="text-sm text-gray-600">Total Interés ({formData.amortizationMethod === 'SIMPLE' ? 'Fijo' : 'Variable'})</p><p className="text-2xl font-bold text-blue-900">{formatCurrency(totalInterest)}</p></div>
                <div className="bg-white p-4 rounded-lg border border-blue-200"><p className="text-sm text-gray-600">Total a Pagar</p><p className="text-2xl font-bold text-green-700">{formatCurrency(totalToPay)}</p></div>
              </div>
              {formData.amortizationMethod === 'SIMPLE' && (
                <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                  <p className="text-sm text-blue-800"><strong>Interés Fijo:</strong> Se cobra 1 mes completo de interés ({formatCurrency(parseFloat(formData.principalAmount) * (parseFloat(formData.interestRate) / 100 / 12))}) sobre el capital inicial, sin importar el plazo del préstamo.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}