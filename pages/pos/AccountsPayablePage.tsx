
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../contexts/DataContext';
import { useECommerceSettings } from '../../contexts/ECommerceSettingsContext';
import { SupplierOrder, SupplierOrderStatus, Product as ProductType, Supplier } from '../../types'; // Added Supplier type
import { DataTable, TableColumn } from '../../components/DataTable';
import { Modal, ConfirmationModal } from '../../components/Modal';
import { PrinterIcon, BanknotesIcon, EditIcon, TrashIconMini as CancelIcon } from '../../components/icons'; // Changed DeleteIcon to CancelIcon for clarity
import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { SupplierOrderFormModal } from '../ecommerce/SupplierOrderFormModal'; // To edit orders

type JsPdfAutoTableColumnStyles = UserOptions['columnStyles'];

interface RecordPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: SupplierOrder | null;
    onRecordPayment: (orderId: string, amount: number) => void;
    getSupplierById: (id: string) => Supplier | undefined; // Added prop
}

const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({ isOpen, onClose, order, onRecordPayment, getSupplierById }) => {
    const [amountPaidInput, setAmountPaidInput] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            setAmountPaidInput(''); 
        }
    }, [isOpen]);

    if (!isOpen || !order) return null;

    const remainingBalance = order.totalCost - (order.amountPaid || 0);

    const handleSubmitPayment = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(amountPaidInput);
        if (isNaN(amount) || amount <= 0) {
            alert("Por favor, ingrese un monto de pago válido.");
            return;
        }
        if (amount > remainingBalance) {
            alert(`El monto pagado ($${amount.toFixed(2)}) no puede exceder el saldo pendiente ($${remainingBalance.toFixed(2)}).`);
            return;
        }
        onRecordPayment(order.id, amount);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Registrar Pago para Pedido #${order.id.substring(0,8)}`} size="md">
            <form onSubmit={handleSubmitPayment} className="space-y-4">
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                    Pedido a: {getSupplierById(order.supplierId)?.name || order.supplierId} <br/>
                    Total Pedido: ${order.totalCost.toFixed(2)} <br/>
                    Pagado Hasta Ahora: ${ (order.amountPaid || 0).toFixed(2)} <br/>
                    <strong className="text-primary">Saldo Pendiente: ${remainingBalance.toFixed(2)}</strong>
                </p>
                <div>
                    <label htmlFor="paymentAmount" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Monto a Pagar</label>
                    <input
                        type="number"
                        id="paymentAmount"
                        value={amountPaidInput}
                        onChange={(e) => setAmountPaidInput(e.target.value)}
                        className={inputFormStyle + " w-full mt-1"}
                        placeholder={`Máx. ${remainingBalance.toFixed(2)}`}
                        min="0.01"
                        step="0.01"
                        max={remainingBalance.toString()}
                        required
                    />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES}>Registrar Pago</button>
                </div>
            </form>
        </Modal>
    );
};


export const AccountsPayablePage: React.FC = () => {
  const { supplierOrders, getSupplierById, getProductById, recordSupplierOrderPayment, updateSupplierOrderStatus, setSupplierOrders } = useData();
  const { getDefaultSettings } = useECommerceSettings();

  const [paymentModalOrder, setPaymentModalOrder] = useState<SupplierOrder | null>(null);
  const [showEditOrderModal, setShowEditOrderModal] = useState(false);
  const [orderToEdit, setOrderToEdit] = useState<SupplierOrder | null>(null);
  const [showCancelConfirmModal, setShowCancelConfirmModal] = useState(false);
  const [orderToCancelId, setOrderToCancelId] = useState<string | null>(null);


  const outstandingOrders = useMemo(() => {
    return supplierOrders.filter(order => 
        order.paymentStatus !== 'Pagado Completo' && 
        order.status !== SupplierOrderStatus.CANCELADO
      )
      .sort((a, b) => new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime());
  }, [supplierOrders]);

  const generatePayablePDF = (order: SupplierOrder) => {
    const doc = new jsPDF();
    const storeSettings = getDefaultSettings(); 
    const supplier = getSupplierById(order.supplierId);

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let currentY = margin;

    if (storeSettings.logoUrl && !storeSettings.logoUrl.startsWith('https://picsum.photos')) {
        doc.setFontSize(10);
        doc.text(`Logo: ${storeSettings.storeName}`, margin, currentY + 5);
        currentY += 10;
    } else {
        doc.setFontSize(18);
        doc.setTextColor(6, 182, 161);
        doc.setFont("helvetica", "bold");
        doc.text(storeSettings.storeName || "Pazzi", margin, currentY + 5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0,0,0);
        currentY += 10;
    }
    
    doc.setFontSize(10);
    doc.text("Nuestra Información:", margin, currentY);
    currentY += 5;
    doc.text(storeSettings.storeName || "Pazzi Plataforma Integrada", margin, currentY);
    currentY += 5;
    doc.text("Calle Pazzi 789, Ciudad Pazzi | Tel: (555) 987-6543", margin, currentY);
    currentY += 10;

    doc.setLineWidth(0.5);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 10;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("ESTADO DE CUENTA POR PAGAR", pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Número de Pedido: PO-${order.id.slice(-6).toUpperCase()}`, margin, currentY);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 10;

    doc.setFont("helvetica", "bold");
    doc.text("Proveedor:", margin, currentY);
    currentY += 5;
    doc.setFont("helvetica", "normal");
    if (supplier) {
        doc.text(supplier.name, margin, currentY);
        currentY += 5;
        doc.text(supplier.email, margin, currentY);
        currentY += 5;
        doc.text(supplier.address || "Dirección no disponible", margin, currentY);
    } else {
        doc.text("Información del proveedor no disponible.", margin, currentY);
    }
    currentY += 10;
    
    const tableColumnStyles: JsPdfAutoTableColumnStyles = {
        '0': { cellWidth: 'auto' }, 
        '1': { cellWidth: 25, halign: 'right' }, 
        '2': { cellWidth: 30, halign: 'right' }, 
        '3': { cellWidth: 35, halign: 'right' }
    };
    
    const head = [['Producto', 'Cant. Pedida', 'Costo Unit.', 'Subtotal']];
    const body = order.items.map(item => {
        const product = getProductById(item.productId);
        const itemSubtotal = item.quantityOrdered * item.unitCost;
        return [
            product?.name || item.productId,
            item.quantityOrdered.toString(),
            `$${item.unitCost.toFixed(2)}`,
            `$${itemSubtotal.toFixed(2)}`
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

    const amountPaid = order.amountPaid || 0;
    const balanceDue = order.totalCost - amountPaid;

    doc.setFontSize(10);
    let totalsX = pageWidth - margin - 70; 
    doc.text("Costo Total Pedido:", totalsX, currentY, {align: 'left'});
    doc.text(`$${order.totalCost.toFixed(2)}`, pageWidth - margin, currentY, {align: 'right'});
    currentY += 7;
    doc.text("Monto Pagado:", totalsX, currentY, {align: 'left'});
    doc.text(`$${amountPaid.toFixed(2)}`, pageWidth - margin, currentY, {align: 'right'});
    currentY += 7;
    doc.setFont("helvetica", "bold");
    doc.text("SALDO PENDIENTE:", totalsX, currentY, {align: 'left'});
    doc.text(`$${balanceDue.toFixed(2)}`, pageWidth - margin, currentY, {align: 'right'});
    currentY += 15;
    doc.setFont("helvetica", "normal");
    
    doc.save(`cuenta_pagar_PO-${order.id.slice(-6).toUpperCase()}.pdf`);
  };

  const handleRecordPayment = (orderId: string, amount: number) => {
    recordSupplierOrderPayment(orderId, amount);
  };
  
  const handleEditOrder = (order: SupplierOrder) => {
    setOrderToEdit(order);
    setShowEditOrderModal(true);
  };

  const handleCancelOrder = (orderId: string) => {
    setOrderToCancelId(orderId);
    setShowCancelConfirmModal(true);
  };

  const confirmCancelOrder = () => {
    if (orderToCancelId) {
        updateSupplierOrderStatus(orderToCancelId, SupplierOrderStatus.CANCELADO);
    }
    setOrderToCancelId(null);
    setShowCancelConfirmModal(false);
  };

  const columns: TableColumn<SupplierOrder>[] = [
    { header: 'ID Pedido', accessor: (o) => o.id.substring(0, 8).toUpperCase() },
    { 
      header: 'Proveedor', 
      accessor: (o) => {
        const supplier = getSupplierById(o.supplierId);
        return supplier ? supplier.name : 'N/A';
      }
    },
    { header: 'Fecha Pedido', accessor: (o) => new Date(o.orderDate + 'T00:00:00').toLocaleDateString() },
    { header: 'Costo Total', accessor: (o) => `$${o.totalCost.toFixed(2)}` },
    { header: 'Monto Pagado', accessor: (o) => `$${(o.amountPaid || 0).toFixed(2)}` },
    { 
      header: 'Estado Pago', 
      accessor: (o) => (
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
            o.paymentStatus === 'No Pagado' ? 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100' :
            o.paymentStatus === 'Pagado Parcialmente' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:text-yellow-100' :
            'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-100' 
        }`}>
          {o.paymentStatus}
        </span>
      )
    },
    { header: 'Estado Pedido', accessor: (o) => o.status }
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200 mb-6">
        Cuentas por Pagar a Proveedores
      </h1>
      <DataTable<SupplierOrder>
        data={outstandingOrders}
        columns={columns}
        actions={(order) => (
          <div className="flex space-x-1">
            <button
              onClick={() => handleEditOrder(order)}
              className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1"
              title="Editar Pedido"
            >
              <EditIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => generatePayablePDF(order)}
              className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1"
              title="Imprimir Estado de Cuenta"
            >
              <PrinterIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPaymentModalOrder(order)}
              className="text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 p-1"
              title="Registrar Pago"
              disabled={order.paymentStatus === 'Pagado Completo' || order.status === SupplierOrderStatus.CANCELADO}
            >
              <BanknotesIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleCancelOrder(order.id)}
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
              title="Cancelar Pedido"
              disabled={order.status === SupplierOrderStatus.CANCELADO || order.status === SupplierOrderStatus.RECIBIDO_COMPLETO}
            >
              <CancelIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      />
      <RecordPaymentModal
        isOpen={!!paymentModalOrder}
        onClose={() => setPaymentModalOrder(null)}
        order={paymentModalOrder}
        onRecordPayment={handleRecordPayment}
        getSupplierById={getSupplierById} // Pass the function here
      />
      <SupplierOrderFormModal
        isOpen={showEditOrderModal}
        onClose={() => setShowEditOrderModal(false)}
        orderToEdit={orderToEdit}
      />
      {orderToCancelId && (
        <ConfirmationModal
            isOpen={showCancelConfirmModal}
            onClose={() => setShowCancelConfirmModal(false)}
            onConfirm={confirmCancelOrder}
            title="Confirmar Cancelación de Pedido"
            message={`¿Está seguro que desea cancelar el pedido PO-${orderToCancelId.slice(-6).toUpperCase()}? Esta acción no revertirá automáticamente el stock si ya fue recibido.`}
            confirmButtonText="Sí, Cancelar Pedido"
        />
      )}
    </div>
  );
};
