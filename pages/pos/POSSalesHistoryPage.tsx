
import React from 'react';
import { useData } from '../../contexts/DataContext'; // Adjusted path
import { Sale, ECommerceSettings } from '../../types'; // Adjusted path, Added ECommerceSettings
import { DataTable, TableColumn } from '../../components/DataTable'; // Adjusted path
import { PrinterIcon } from '../../components/icons'; // Adjusted path
import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import { useECommerceSettings } from '../../contexts/ECommerceSettingsContext';

type JsPdfAutoTableColumnStyles = UserOptions['columnStyles'];

export const POSSalesHistoryPage: React.FC = () => {
  const { sales, getProductById, getEmployeeById } = useData();
  const { getDefaultSettings } = useECommerceSettings(); // Changed to use getDefaultSettings

  const generateSaleReceiptPDF = (sale: Sale) => {
    const doc = new jsPDF();
    const currentStoreSettings = getDefaultSettings(); // Get current default settings
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let currentY = margin;

    // Header (Simplified, adapt from ProjectsListPage if more detail needed)
    if (currentStoreSettings.logoUrl && !currentStoreSettings.logoUrl.startsWith('https://picsum.photos')) {
         doc.setFontSize(10);
         doc.text("Logo Pazzi (URL)", margin, currentY + 5); // Placeholder for actual image
         currentY += 10;
    } else {
        doc.setFontSize(18);
        doc.setTextColor(6, 182, 161); // Primary color
        doc.setFont("helvetica", "bold");
        doc.text("Pazzi", margin, currentY + 5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0,0,0);
        currentY += 10;
    }
    
    doc.setFontSize(10);
    doc.text(currentStoreSettings.storeName || "Pazzi Tienda", pageWidth - margin, currentY, { align: 'right' });
    currentY += 10;
    doc.setLineWidth(0.5);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 10;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("RECIBO DE VENTA", pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Número de Venta: VTA-${sale.id.slice(-6).toUpperCase()}`, margin, currentY);
    doc.text(`Fecha: ${new Date(sale.date).toLocaleString('es-ES')}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 7;
    const employee = getEmployeeById(sale.employeeId);
    doc.text(`Cajero: ${employee ? employee.name + ' ' + employee.lastName : 'N/A'}`, margin, currentY);
    doc.text(`Método de Pago: ${sale.paymentMethod}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 10;
    
    const tableColumnStyles: JsPdfAutoTableColumnStyles = {
        '0': { cellWidth: 'auto' }, // Item
        '1': { cellWidth: 20, halign: 'right' }, // Cant.
        '2': { cellWidth: 30, halign: 'right' }, // P. Unit.
        '3': { cellWidth: 25, halign: 'right' }, // IVA %
        '4': { cellWidth: 30, halign: 'right' }  // Subtotal
    };
    
    const head = [['Producto', 'Cant.', 'P. Unit.', 'IVA %', 'Total']];
    const body = sale.items.map(item => {
        const product = getProductById(item.id);
        const unitPrice = item.unitPrice;
        const ivaRate = product?.ivaRate !== undefined ? product.ivaRate : 0.16; // Default IVA if not specified
        const itemTotal = item.quantity * unitPrice * (1 + ivaRate);
        return [
            item.name,
            item.quantity.toString(),
            `$${unitPrice.toFixed(2)}`,
            `${(ivaRate * 100).toFixed(0)}%`,
            `$${itemTotal.toFixed(2)}`
        ];
    });

    autoTable(doc as any, {
        head: head,
        body: body,
        startY: currentY,
        theme: 'striped',
        headStyles: { fillColor: [6, 182, 161], textColor: 255 },
        columnStyles: tableColumnStyles,
        margin: { left: margin, right: margin },
        didDrawPage: (data: any) => { currentY = data.cursor.y; }
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL VENTA: $${sale.totalAmount.toFixed(2)}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 15;

    doc.setFontSize(9);
    doc.text("¡Gracias por su compra!", pageWidth / 2, currentY, { align: 'center' });
    
    doc.save(`recibo_venta_${sale.id.slice(-6).toUpperCase()}.pdf`);
};


  const columns: TableColumn<Sale>[] = [
    { header: 'ID Venta', accessor: (sale) => sale.id.substring(0, 8).toUpperCase() },
    { header: 'Fecha', accessor: (sale) => new Date(sale.date).toLocaleString('es-ES') },
    { header: 'Total', accessor: (sale) => `$${sale.totalAmount.toFixed(2)}` },
    { header: 'Items', accessor: (sale) => sale.items.reduce((sum, item) => sum + item.quantity, 0) },
    { header: 'Método Pago', accessor: 'paymentMethod' },
    { 
        header: 'Cajero', 
        accessor: (sale) => {
            const emp = getEmployeeById(sale.employeeId);
            return emp ? `${emp.name} ${emp.lastName}` : 'N/A';
        } 
    },
    { header: 'ID Caja', accessor: 'cajaId' }
  ];

  const sortedSales = [...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200 mb-6">Historial de Ventas POS</h1>
      <DataTable<Sale>
        data={sortedSales}
        columns={columns}
        actions={(sale) => (
          <button 
            onClick={() => generateSaleReceiptPDF(sale)} 
            className="text-primary hover:text-secondary p-1"
            title="Imprimir Recibo"
            aria-label={`Imprimir recibo de venta ${sale.id.substring(0,8)}`}
          >
            <PrinterIcon />
          </button>
        )}
      />
    </div>
  );
};
