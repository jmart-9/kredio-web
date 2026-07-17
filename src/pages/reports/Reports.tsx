import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileText, Download, Users, CreditCard, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

export function Reports() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const downloadFile = (data: Blob, filename: string) => {
    const url = window.URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleExportClientsExcel = async () => {
    try {
      const response = await api.get('/reports/clients/excel', {
        responseType: 'blob',
      });
      downloadFile(response.data, `clientes_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Clientes exportados correctamente');
    } catch (error) {
      console.error('Error exporting clients:', error);
      toast.error('Error al exportar clientes');
    }
  };

  const handleExportLoansExcel = async () => {
    try {
      const response = await api.get('/reports/loans/excel', {
        responseType: 'blob',
      });
      downloadFile(response.data, `prestamos_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Préstamos exportados correctamente');
    } catch (error) {
      console.error('Error exporting loans:', error);
      toast.error('Error al exportar préstamos');
    }
  };

  const handleExportPaymentsExcel = async () => {
    try {
      const startDate = new Date(dateRange.startDate + 'T00:00:00').toISOString();
      const endDate = new Date(dateRange.endDate + 'T23:59:59').toISOString();
      
      const response = await api.get('/reports/payments/excel', {
        params: { startDate, endDate },
        responseType: 'blob',
      });
      
      downloadFile(response.data, `pagos_${dateRange.startDate}_al_${dateRange.endDate}.xlsx`);
      toast.success('Pagos exportados correctamente');
    } catch (error) {
      console.error('Error exporting payments:', error);
      toast.error('Error al exportar pagos');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Reportes</h1>
        <p className="text-gray-500 mt-1">Exporta información de tu financiera</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Clientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Clientes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              Exporta el listado completo de clientes con su información de contacto.
            </p>
            <Button onClick={handleExportClientsExcel} className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Exportar a Excel
            </Button>
          </CardContent>
        </Card>

        {/* Préstamos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-green-600" />
              Préstamos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              Exporta todos los préstamos con montos, tasas y estados.
            </p>
            <Button onClick={handleExportLoansExcel} className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Exportar a Excel
            </Button>
          </CardContent>
        </Card>

        {/* Pagos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-purple-600" />
              Pagos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">
              Exporta los pagos realizados en un período específico.
            </p>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Fecha Inicio</Label>
                <Input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha Fin</Label>
                <Input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                />
              </div>
              <Button onClick={handleExportPaymentsExcel} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Exportar a Excel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Nota informativa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Información Adicional
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            <strong>PDF Individual:</strong> Para generar el PDF de un cliente o préstamo específico, 
            ve a la página de detalle del cliente o del préstamo y haz clic en el botón "Generar PDF".
          </p>
        </CardContent>
      </Card>
    </div>
  );
}