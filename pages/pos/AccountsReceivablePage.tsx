
import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useECommerceSettings } from '../../contexts/ECommerceSettingsContext';
import { Sale, Client } from '../../types';
import { DataTable, TableColumn } from '../../components/DataTable';
import { PrinterIcon, BanknotesIcon } from '../../components/icons';
import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import { ConfirmationModal } from '../../components/Modal';

type JsPdfAutoTableColumnStyles = UserOptions['columnStyles'];

export const AccountsReceivablePage: React.FC = () => {
  const { sales, getClientById, getProductById, recordSalePayment } = useData();
  const { getDefaultSettings } = useECommerceSettings();

  const [showConfirmPaidModal, setShowConfirmPaidModal] = useState(false);
  const [saleToMarkAsPaid, setSaleToMarkAsPaid] = useState<Sale | null>(null);

  const pendingSales = useMemo(() => {
    return sales.filter(sale => sale.paymentStatus === 'Pendiente de Pago')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [sales]);

  const generateReceivablePDF = (sale: Sale) => {
    const doc = new jsPDF();
    const storeSettings = getDefaultSettings();
    const client = getClientById(sale.clientId || '');

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let currentY = margin;

    // Header
    if (storeSettings.logoUrl && !storeSettings.logoUrl.startsWith('https://picsum.photos')) {
      try {
        // Attempt to add image - requires CORS or base64
        // For now, placeholder text if image adding is complex/fails
        doc.setFontSize(10);
        doc.text(`Logo: ${storeSettings.storeName}`, margin, currentY + 5);
        currentY += 10;
      } catch (e) {
        console.error("Error adding logo to PDF:", e);
        doc.setFontSize(10);
        doc.text(`Logo: ${storeSettings.storeName}`, margin, currentY + 5);
        currentY += 10;
      }
    } else {
        doc.setFontSize(18);
        doc.setTextColor(6, 182, 161); // Primary color from constants
        doc.setFont("helvetica", "bold");
        doc.text(storeSettings.storeName || "Pazzi", margin, currentY + 5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0,0,0);
        currentY += 10;
    }
    
    doc.setFontSize(10);
    doc.text(storeSettings.storeName, pageWidth - margin, currentY, { align: 'right' });
    currentY += 5;
    // Add more store address details if available in storeSettings
    doc.text("Tel: (555) 123-4567 | Email: info@pazzi.com", pageWidth - margin, currentY, { align: 'right' });
    currentY += 10;

    doc.setLineWidth(0.5);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 10;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("CUENTA POR COBRAR / FACTURA", pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Número de Venta: VTA-${sale.id.slice(-6).toUpperCase()}`, margin, currentY);
    doc.text(`Fecha: ${new Date(sale.date).toLocaleDateString('es-ES')}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 10;

    doc.setFont("helvetica", "bold");
    doc.text("Cliente:", margin, currentY);
    currentY += 5;
    doc.setFont("helvetica", "normal");
    if (client) {
        doc.text(`${client.name} ${client.lastName}`, margin, currentY);
        currentY += 5;
        doc.text(client.email, margin, currentY);
        currentY += 5;
        doc.text(client.phone || "Teléfono no disponible", margin, currentY);
    } else {
        doc.text("Cliente Contado / Información no disponible.", margin, currentY);
    }
    currentY += 10;

    const tableColumnStyles: JsPdfAutoTableColumnStyles = {
        '0': { cellWidth: 'auto' }, 
        '1': { cellWidth: 20, halign: 'right' }, 
        '2': { cellWidth: 30, halign: 'right' }, 
        '3': { cellWidth: 25, halign: 'right' },
        '4': { cellWidth: 30, halign: 'right' }  
    };
    
    const head = [['Producto', 'Cant.', 'P. Unit.', 'IVA %', 'Total']];
    const body = sale.items.map(item => {
        const product = getProductById(item.id);
        const unitPrice = item.unitPrice;
        // Use item's IVA rate if present (from CartItem), else product's, else default
        const ivaRate = item.ivaRate !== undefined ? item.ivaRate : (product?.ivaRate !== undefined ? product.ivaRate : 0.16);
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
    doc.text(`TOTAL A PAGAR: $${sale.totalAmount.toFixed(2)}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 15;

    doc.setFontSize(9);
    doc.text("Este es un estado de cuenta. Por favor, realice su pago a la brevedad.", margin, currentY);
    currentY += 5;
    doc.text("¡Gracias por su negocio!", margin, currentY);
    
    doc.save(`cuenta_cobrar_VTA-${sale.id.slice(-6).toUpperCase()}.pdf`);
  };

  const handleMarkAsPaid = (saleToUpdate: Sale) => {
    setSaleToMarkAsPaid(saleToUpdate);
    setShowConfirmPaidModal(true);
  };

  const confirmMarkAsPaid = () => {
    if (saleToMarkAsPaid) {
      recordSalePayment(saleToMarkAsPaid.id);
    }
    setShowConfirmPaidModal(false);
    setSaleToMarkAsPaid(null);
  };

  const columns: TableColumn<Sale>[] = [
    { header: 'ID Venta', accessor: (s) => s.id.substring(0, 8).toUpperCase() },
    { header: 'Fecha', accessor: (s) => new Date(s.date).toLocaleDateString() },
    { 
      header: 'Cliente', 
      accessor: (s) => {
        const client = getClientById(s.clientId || '');
        return client ? `${client.name} ${client.lastName}` : (s.clientId ? 'Cliente Contado' : 'N/A');
      } 
    },
    { header: 'Monto Total', accessor: (s) => `$${s.totalAmount.toFixed(2)}` },
    { 
      header: 'Estado Pago', 
      accessor: (s) => (
        <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:text-yellow-100 rounded-full">
          {s.paymentStatus}
        </span>
      )
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200 mb-6">
        Cuentas por Cobrar
      </h1>
      <DataTable<Sale>
        data={pendingSales}
        columns={columns}
        actions={(sale) => (
          <div className="flex space-x-2">
            <button
              onClick={() => generateReceivablePDF(sale)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1"
              title="Imprimir Cuenta por Cobrar"
            >
              <PrinterIcon />
            </button>
            <button
              onClick={() => handleMarkAsPaid(sale)}
              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 p-1"
              title="Marcar como Pagado"
            >
              <BanknotesIcon />
            </button>
          </div>
        )}
      />
      {saleToMarkAsPaid && (
        <ConfirmationModal
            isOpen={showConfirmPaidModal}
            onClose={() => setShowConfirmPaidModal(false)}
            onConfirm={confirmMarkAsPaid}
            title="Confirmar Pago"
            message={`¿Está seguro que desea marcar la venta VTA-${saleToMarkAsPaid.id.slice(-6).toUpperCase()} por $${saleToMarkAsPaid.totalAmount.toFixed(2)} como pagada?`}
            confirmButtonText="Sí, Pagada"
        />
      )}
    </div>
  );
};
