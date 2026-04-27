
import React, { useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { Sale, SupplierOrder } from '../../types';
import { DataTable, TableColumn } from '../../components/DataTable';
import { PrinterIcon, ArrowDownIcon, ArrowUpIcon } from '../../components/icons';
import { useECommerceSettings } from '../../contexts/ECommerceSettingsContext';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ReceivableEditModal } from './ReceivableEditModal';
import { SupplierOrderFormModal } from '../ecommerce/SupplierOrderFormModal';

// Unified interface for the table
interface HistoryItem {
    id: string;
    originalId: string;
    date: string;
    entityName: string; // Client or Supplier
    type: 'Venta' | 'CxC' | 'CxP';
    total: number;
    status: string;
    isExternal: boolean;
    paymentMethod: string;
    rawObject: Sale | SupplierOrder;
}

export const POSSalesHistoryPage: React.FC = () => {
  const { t } = useTranslation();
  const { sales, supplierOrders, getProductById, getEmployeeById, getClientById, getSupplierById } = useData();
  const { getDefaultSettings } = useECommerceSettings();

  // States for Modals
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  
  const [selectedOrder, setSelectedOrder] = useState<SupplierOrder | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  const combinedHistory: HistoryItem[] = useMemo(() => {
      // Process Sales (Ventas & CxC)
      const salesItems: HistoryItem[] = sales.map(sale => {
          const client = sale.clientId ? getClientById(sale.clientId) : null;
          const isCxC = sale.paymentMethod === 'Crédito C.' || sale.paymentStatus === 'Pendiente de Pago';
          
          return {
              id: sale.id,
              originalId: sale.id,
              date: sale.date,
              entityName: client ? `${client.name} ${client.lastName}` : 'Cliente Contado',
              type: isCxC ? 'CxC' : 'Venta',
              total: sale.totalAmount,
              status: sale.paymentStatus,
              isExternal: !!sale.isExternal,
              paymentMethod: sale.paymentMethod || 'N/A',
              rawObject: sale
          };
      });

      // Process Supplier Orders (CxP)
      const supplierItems: HistoryItem[] = supplierOrders.map(order => {
          const supplier = getSupplierById(order.supplierId);
          return {
              id: order.id,
              originalId: order.id,
              date: order.orderDate + 'T00:00:00', // Normalize date for sorting
              entityName: supplier ? supplier.name : 'Proveedor Desconocido',
              type: 'CxP',
              total: order.totalCost,
              status: order.paymentStatus,
              isExternal: false,
              paymentMethod: 'N/A',
              rawObject: order
          };
      });

      return [...salesItems, ...supplierItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, supplierOrders, getClientById, getSupplierById]);

  const handleTypeClick = (item: HistoryItem) => {
      if (item.type === 'CxC' || item.type === 'Venta') {
          setSelectedSale(item.rawObject as Sale);
          setIsSaleModalOpen(true);
      } else if (item.type === 'CxP') {
          setSelectedOrder(item.rawObject as SupplierOrder);
          setIsOrderModalOpen(true);
      }
  };

  const generateSaleReceiptPDF = async (sale: Sale) => {
    const doc = new jsPDF();
    const currentStoreSettings = getDefaultSettings();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let currentY = margin;

    if (currentStoreSettings.logoUrl && !currentStoreSettings.logoUrl.startsWith('https://picsum.photos')) {
         doc.setFontSize(10);
         doc.text("Logo Pazzi (URL)", margin, currentY + 5);
         currentY += 10;
    } else {
        doc.setFontSize(18);
        doc.setTextColor(6, 182, 161);
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
    
    const tableColumnStyles: any = {
        '0': { cellWidth: 'auto' },
        '1': { cellWidth: 20, halign: 'right' },
        '2': { cellWidth: 30, halign: 'right' },
        '3': { cellWidth: 25, halign: 'right' },
        '4': { cellWidth: 30, halign: 'right' }
    };
    
    const head = [['Producto', 'Cant.', 'P. Unit.', 'IVU %', 'Total']];
    const body = sale.items.map(item => {
        const product = getProductById(item.id);
        const unitPrice = item.unitPrice;
        const ivuRate = product?.ivuRate !== undefined ? product.ivuRate : 0.16;
        const itemTotal = item.quantity * unitPrice * (1 + ivuRate);
        return [
            item.name,
            item.quantity.toString(),
            `$${unitPrice.toFixed(2)}`,
            `${(ivuRate * 100).toFixed(0)}%`,
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
    currentY += 8;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    if (sale.payments && sale.payments.length > 1) {
        const paymentDetails = sale.payments.map(p => `${p.method}: $${p.amount.toFixed(2)}`).join(', ');
        doc.text(`Método de Pago: ${paymentDetails}`, pageWidth - margin, currentY, { align: 'right' });
    } else {
        doc.text(`Método de Pago: ${sale.paymentMethod}`, pageWidth - margin, currentY, { align: 'right' });
    }
    currentY += 15;
    
    const qrText = `Recibo de Venta Pazzi\nID: VTA-${sale.id.slice(-6).toUpperCase()}\nTotal: $${sale.totalAmount.toFixed(2)}\nFecha: ${new Date(sale.date).toLocaleDateString('es-ES')}`;
    let qrCodeDataUrl = '';
    if ((window as any).QRCode) {
        try {
            qrCodeDataUrl = await (window as any).QRCode.toDataURL(qrText);
        } catch (err) {
            console.error("Failed to generate QR code", err);
        }
    } else {
        console.error("QRCode library is not loaded.");
    }

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        if (qrCodeDataUrl) {
            const qrSize = 20;
            const qrX = margin;
            const qrY = pageHeight - margin - qrSize - 5;
            doc.addImage(qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
            doc.setFontSize(7);
            doc.setTextColor(150);
            doc.text("Escanear para detalles", qrX + qrSize / 2, qrY + qrSize + 3, { align: 'center' });
        }
        
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text("¡Gracias por su compra!", pageWidth / 2, pageHeight - margin - 5, { align: 'center' });
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - margin - 5, { align: 'right' });
    }
    
    doc.save(`recibo_venta_${sale.id.slice(-6).toUpperCase()}.pdf`);
  };

  const columns: TableColumn<HistoryItem>[] = [
    { 
        header: t('pos.sales_history.col.id'), 
        accessor: (item) => (
            <span className="font-mono text-sm">
                {item.originalId.substring(0, 8).toUpperCase()}
                {item.isExternal && <span className="ml-1 text-[10px] text-amber-600 font-bold">(EXT)</span>}
            </span>
        )
    },
    { 
        header: 'Tipo', 
        accessor: (item) => (
            <button 
                onClick={() => handleTypeClick(item)}
                className={`px-2 py-0.5 rounded-full text-xs font-bold flex items-center w-fit cursor-pointer hover:opacity-80 transition-opacity ${
                item.type === 'Venta' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200 ring-1 ring-green-300' :
                item.type === 'CxC' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 ring-1 ring-blue-300' :
                'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 ring-1 ring-red-300'
            }`}
                title="Ver Detalles"
            >
                {item.type === 'CxP' ? <ArrowDownIcon className="w-3 h-3 mr-1"/> : <ArrowUpIcon className="w-3 h-3 mr-1"/>}
                {item.type}
            </button>
        )
    },
    { header: t('pos.sales_history.col.date'), accessor: (item) => new Date(item.date).toLocaleString('es-ES') },
    { header: 'Cliente / Proveedor', accessor: 'entityName' },
    { 
        header: t('pos.sales_history.col.method'), 
        accessor: (item) => {
            if (item.type === 'CxP') return <span className="text-neutral-400 italic">N/A</span>;
            const sale = item.rawObject as Sale;
            
            if (sale.payments && sale.payments.length > 1) {
                return (
                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Múltiple</span>
                        <span className="text-[10px] text-neutral-500">
                            {sale.payments.map(p => p.method).join(', ')}
                        </span>
                    </div>
                );
            }
            
            return (
                <span className="text-sm font-medium">
                    {sale.paymentMethod || 'N/A'}
                </span>
            );
        }
    },
    { 
        header: t('pos.sales_history.col.total'), 
        accessor: (item) => (
            <span className={`font-semibold ${item.type === 'CxP' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {item.type === 'CxP' ? '-' : '+'}${item.total.toFixed(2)}
            </span>
        )
    },
    { header: 'Estado', accessor: (item) => item.status },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200 mb-6">
          Historial de Movimientos (Ventas, CxC y CxP)
      </h1>
      <DataTable<HistoryItem>
        data={combinedHistory}
        columns={columns}
        actions={(item) => (
          item.type !== 'CxP' ? (
              <button 
                onClick={() => generateSaleReceiptPDF(item.rawObject as Sale)} 
                className="text-primary hover:text-secondary p-1"
                title={t('pos.sales_history.print_receipt')}
                aria-label={`${t('pos.sales_history.print_receipt')} ${item.id.substring(0,8)}`}
              >
                <PrinterIcon />
              </button>
          ) : (
              <span className="text-xs text-neutral-400">N/A</span>
          )
        )}
      />

      {/* Modal for Sales/CxC Details */}
      <ReceivableEditModal 
        isOpen={isSaleModalOpen} 
        onClose={() => setIsSaleModalOpen(false)} 
        saleToEdit={selectedSale} 
      />

      {/* Modal for CxP Details */}
      <SupplierOrderFormModal 
        isOpen={isOrderModalOpen} 
        onClose={() => setIsOrderModalOpen(false)} 
        orderToEdit={selectedOrder} 
      />
    </div>
  );
};
