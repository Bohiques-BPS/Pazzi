

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, CartItem, Sale, UserRole, POSShift, HeldCart, Caja, Client } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Modal, ConfirmationModal } from '../../components/Modal';
import { ProductAutocomplete } from '../../components/ui/ProductAutocomplete';
import { ClientSearchModal } from '../../components/ClientSearchModal'; // New
import { ClientFormModal } from '../pm/ClientFormModal'; // Existing
import { 
    POS_BUTTON_BLUE_CLASSES, POS_BUTTON_RED_CLASSES, POS_BUTTON_SECONDARY_CLASSES, 
    POS_BUTTON_YELLOW_CLASSES, POS_BUTTON_PURPLE_CLASSES, POS_BUTTON_DARK_RED_CLASSES, 
    POS_BUTTON_GREEN_CLASSES, POS_BUTTON_TEAL_CLASSES, POS_BUTTON_ORANGE_CLASSES,
    POS_BUTTON_INDIGO_CLASSES, POS_BUTTON_CREDIT_CLASSES, POS_BUTTON_PINK_CLASSES,
    inputFormStyle, INITIAL_BRANCHES, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, authInputStyle, BUTTON_PRIMARY_CLASSES
} from '../../constants';
import { 
    CashBillIcon, CreditCardIcon, PrinterIcon, TrashIconMini, KeyIcon, ArrowLeftOnRectangleIcon, 
    Cog6ToothIcon, FloppyDiskIcon, EscKeyIcon, MagnifyingGlassIcon, ArrowUturnLeftIcon, 
    ExclamationTriangleIcon, EyeIcon, UserPlusIcon, XMarkIcon as XMarkIconSmall, BanknotesIcon, UserCircleIcon,
    ClipboardDocumentListIcon, PlusIcon, AthMovilIcon
} from '../../components/icons';
import jsPDF from 'jspdf'; 
import autoTable from 'jspdf-autotable'; 
import { useECommerceSettings } from '../../contexts/ECommerceSettingsContext'; 


const DEFAULT_CAJA_ID = "0008"; 
const DEFAULT_BRANCH_ID = INITIAL_BRANCHES.find(b => b.isActive)?.id || 'branch-central';

interface HoldCartModalProps {
    isOpen: boolean;
    onClose: () => void;
    heldCarts: HeldCart[];
    onRecallCart: (cartId: string) => void;
    onDeleteHeldCart: (cartId: string) => void;
    onHoldCurrentCart: (name?: string) => void;
    currentCartHasItems: boolean;
}

const HoldCartModal: React.FC<HoldCartModalProps> = ({ isOpen, onClose, heldCarts, onRecallCart, onDeleteHeldCart, onHoldCurrentCart, currentCartHasItems }) => {
    const [holdName, setHoldName] = useState('');

    const handleHold = () => {
        onHoldCurrentCart(holdName.trim() || undefined);
        setHoldName('');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Carritos en Espera / Poner Actual en Espera" size="lg">
            {currentCartHasItems && (
                <div className="mb-4 p-3 border rounded-md dark:border-neutral-600">
                    <h3 className="text-md font-semibold mb-2 text-neutral-700 dark:text-neutral-200">Poner Carrito Actual en Espera</h3>
                    <div className="flex items-center space-x-2">
                        <input
                            type="text"
                            placeholder="Nombre opcional para este carrito"
                            value={holdName}
                            onChange={(e) => setHoldName(e.target.value)}
                            className={inputFormStyle + " flex-grow"}
                        />
                        <button onClick={handleHold} className={BUTTON_PRIMARY_SM_CLASSES}>
                            <FloppyDiskIcon className="mr-1"/> Poner en Espera
                        </button>
                    </div>
                </div>
            )}

            <h3 className="text-md font-semibold mb-2 text-neutral-700 dark:text-neutral-200">Carritos en Espera</h3>
            {heldCarts.length === 0 ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">No hay carritos en espera.</p>
            ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {heldCarts.map(cart => (
                        <div key={cart.id} className="flex justify-between items-center p-2 bg-neutral-100 dark:bg-neutral-700 rounded-md">
                            <div>
                                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{cart.name || `Carrito #${cart.id.slice(-4)}`}</p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">{cart.items.length} artículo(s) - Total: ${cart.totalAmount.toFixed(2)}</p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">En espera desde: {new Date(cart.date).toLocaleTimeString()}</p>
                            </div>
                            <div className="flex space-x-1">
                                <button onClick={() => { onRecallCart(cart.id); onClose(); }} className={`${BUTTON_SECONDARY_SM_CLASSES} !text-xs`} title="Recuperar Carrito"><ArrowUturnLeftIcon/></button>
                                <button onClick={() => onDeleteHeldCart(cart.id)} className={`${POS_BUTTON_RED_CLASSES} !py-1 !px-1.5 !text-xs`} title="Eliminar Carrito en Espera"><TrashIconMini/></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    );
};

interface PriceCheckModalProps {
    isOpen: boolean;
    onClose: () => void;
    getProductByRef: (ref: string) => Product | undefined; 
    activeBranchId: string | null;
}
const PriceCheckModal: React.FC<PriceCheckModalProps> = ({ isOpen, onClose, getProductByRef, activeBranchId }) => {
    const [searchInput, setSearchInput] = useState('');
    const [foundProduct, setFoundProduct] = useState<Product | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const { getProductStockForBranch } = useData();

    const handleSearch = (e?: React.FormEvent) => {
        e?.preventDefault();
        setErrorMsg(null);
        setFoundProduct(null);
        if (!searchInput.trim()) {
            setErrorMsg("Ingrese una referencia de producto.");
            return;
        }
        const product = getProductByRef(searchInput.trim());
        if (product) {
            setFoundProduct(product);
        } else {
            setErrorMsg(`Producto "${searchInput}" no encontrado.`);
        }
    };
    
    useEffect(() => { 
        if (!isOpen) {
            setSearchInput('');
            setFoundProduct(null);
            setErrorMsg(null);
        }
    }, [isOpen]);

    const stockInActiveBranch = (activeBranchId && foundProduct) ? getProductStockForBranch(foundProduct.id, activeBranchId) : null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Verificar Precio / Información de Producto" size="md">
            <form onSubmit={handleSearch} className="space-y-3">
                <div className="flex items-center space-x-2">
                    <input
                        type="text"
                        placeholder="Referencia (SKU, Nombre, Código Barras)"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className={inputFormStyle + " flex-grow"}
                        autoFocus
                    />
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES}><MagnifyingGlassIcon className="w-4 h-4"/></button>
                </div>
                {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
                {foundProduct && (
                    <div className="mt-3 p-3 border rounded-md dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700/30">
                        <h4 className="text-lg font-semibold text-primary">{foundProduct.name}</h4>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400 my-2">${foundProduct.unitPrice.toFixed(2)}</p>
                        {foundProduct.imageUrl && <img src={foundProduct.imageUrl} alt={foundProduct.name} className="w-24 h-24 object-cover rounded my-2"/>}
                        <p className="text-sm text-neutral-600 dark:text-neutral-300">{foundProduct.description}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">SKU: {foundProduct.skus?.join(', ') || 'N/A'}</p>
                        {stockInActiveBranch !== null && <p className="text-sm text-neutral-600 dark:text-neutral-300">Stock en esta caja: {stockInActiveBranch}</p>}
                    </div>
                )}
            </form>
        </Modal>
    );
};

const PlaceholderModal: React.FC<{isOpen: boolean; onClose: () => void; title: string}> = ({isOpen, onClose, title}) => (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
        <p className="text-center text-neutral-600 dark:text-neutral-300 py-4">Funcionalidad "{title}" estará disponible próximamente.</p>
    </Modal>
);


export const POSCashierPage: React.FC = () => {
  const { 
      products: allProducts, 
      addSale, 
      getCajaById, 
      getBranchById, 
      lastCompletedSale, 
      holdCurrentCart, 
      recallCart: recallCartFromContext, 
      deleteHeldCart: deleteHeldCartFromContext, 
      heldCarts, 
      getEmployeeById,
      updateProductStockForBranch,
      getProductStockForBranch,
      clients // Added clients from context
  } = useData();
  const { getDefaultSettings } = useECommerceSettings();
  const { currentUser, logout, login, allUsers } = useAuth(); // Added login, allUsers
  const navigate = useNavigate();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(true);
  const [currentShift, setCurrentShift] = useState<POSShift | null>(null);
  const [initialCashInput, setInitialCashInput] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPOSEmergencyModeActive, setIsPOSEmergencyModeActive] = useState(false); 

  const productAutocompleteRef = useRef<HTMLInputElement>(null);

  const [showHoldCartModal, setShowHoldCartModal] = useState(false);
  const [showPriceCheckModal, setShowPriceCheckModal] = useState(false);
  const [showReprintConfirmModal, setShowReprintConfirmModal] = useState(false);
  const [showClearCartConfirmModal, setShowClearCartConfirmModal] = useState(false);
  const [showEndShiftConfirmModal, setShowEndShiftConfirmModal] = useState(false);

  // New state for modals
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [initialPaymentMethodForModal, setInitialPaymentMethodForModal] = useState('Efectivo');
  const [isSwitchUserModalOpen, setIsSwitchUserModalOpen] = useState(false);
  const [showInvoicePrompt, setShowInvoicePrompt] = useState(false);
  const [saleForInvoice, setSaleForInvoice] = useState<Sale | null>(null);
  
  // Client Management State
  const [selectedPOSClient, setSelectedPOSClient] = useState<Client | null>(null);
  const [isClientSearchModalOpen, setIsClientSearchModalOpen] = useState(false);
  const [isClientFormModalOpen, setIsClientFormModalOpen] = useState(false);
  const [clientToEditInPOS, setClientToEditInPOS] = useState<Client | null>(null);
  const [clientSearchPurpose, setClientSearchPurpose] = useState<'sale' | 'estimate'>('sale');


  const activeCaja = useMemo(() => currentShift ? getCajaById(currentShift.cajaId) : null, [currentShift, getCajaById]);
  const activeBranch = useMemo(() => currentShift ? getBranchById(currentShift.branchId) : null, [currentShift, getBranchById]);
  
  const totals = useMemo(() => {
    let subtotal = 0;
    let totalIVA = 0;
    const defaultSystemIVARate = 0.16; 

    cart.forEach(item => {
        const itemSubtotal = item.unitPrice * item.quantity;
        subtotal += itemSubtotal;
        
        let ivaRateToApply = item.ivaRate !== undefined ? item.ivaRate : defaultSystemIVARate;
        if (activeCaja && !activeCaja.applyIVA) {
             ivaRateToApply = 0;
        }
        
        if (isPOSEmergencyModeActive && item.isEmergencyTaxExempt) {
            ivaRateToApply = 0; 
        }
        
        totalIVA += itemSubtotal * ivaRateToApply;
    });
    
    const grandTotal = subtotal + totalIVA;
    return { subtotal, totalIVA, grandTotal };
  }, [cart, activeCaja, isPOSEmergencyModeActive]);
  
  const { subtotal, totalIVA, grandTotal } = totals;

  const posRelevantProducts = useMemo(() => {
    return allProducts.filter(p => p.storeOwnerId === 'admin-user' || !p.storeOwnerId);
  }, [allProducts]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
   useEffect(() => {
    if (currentShift && productAutocompleteRef.current) {
      productAutocompleteRef.current.focus();
    }
  }, [currentShift]);

  const getProductByRef = useCallback((ref: string): Product | undefined => {
    const trimmedRef = ref.trim().toLowerCase();
    return posRelevantProducts.find(p => // Search only in POS relevant products
        (p.skus?.some(sku => sku.toLowerCase() === trimmedRef)) ||
        (p.barcode13Digits && p.barcode13Digits === trimmedRef) ||
        (p.barcode2 && p.barcode2 === trimmedRef) ||
        (p.name.toLowerCase().includes(trimmedRef) && p.name.toLowerCase().startsWith(trimmedRef.substring(0, Math.max(0, trimmedRef.length -1 ))))
    );
  }, [posRelevantProducts]);
  
  const formatDisplayDate = (date: Date) => {
    return date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };
  const formatDisplayTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const handleStartShift = () => {
    if (!currentUser) {
      alert("No hay un empleado logueado para iniciar caja.");
      return;
    }
    const cashAmount = parseFloat(initialCashInput);
    if (isNaN(cashAmount) || cashAmount < 0) {
      alert("Por favor, ingrese un monto de efectivo inicial válido.");
      return;
    }
    setCurrentShift({
      id: `shift-${Date.now()}`,
      startTime: new Date().toISOString(),
      initialCash: cashAmount,
      totalSales: 0,
      status: 'open',
      employeeId: currentUser.id,
      cajaId: DEFAULT_CAJA_ID, 
      branchId: DEFAULT_BRANCH_ID 
    });
    setIsShiftModalOpen(false);
    setInitialCashInput('');
  };

  const handleEndShift = (isSilent: boolean = false) => {
    if (currentShift) {
        if (!isSilent) {
            alert(`Turno cerrado. Ventas totales del turno: $${currentShift.totalSales.toFixed(2)}`);
        }
        setCurrentShift(null);
        setIsShiftModalOpen(true);
        setIsPOSEmergencyModeActive(false);
        setCart([]);
        setSelectedPOSClient(null);
        setShowEndShiftConfirmModal(false);
    }
  };

  const handleSwitchUser = async (email: string, pass: string): Promise<boolean> => {
    logout();
    const success = await login(email, pass);
    // App.tsx's useEffect will handle successful login redirect and state reset.
    return success;
  };
  
  const handleProductSelect = (product: Product) => {
    if (!currentShift || currentShift.status === 'closed') return;
    addToCart(product);
  };

  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [{ ...product, quantity: 1 }, ...prevCart];
    });
  };

  const updateQuantity = (productId: string, newQuantityStr: string) => {
    const newQuantity = parseInt(newQuantityStr, 10);
    if (isNaN(newQuantity) || newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(prevCart =>
        prevCart.map(item =>
          item.id === productId ? { ...item, quantity: newQuantity } : item
        )
      );
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };
  
  const resetSaleState = useCallback(() => {
    setCart([]);
    setSelectedPOSClient(null);
    setSaleForInvoice(null);
    setShowInvoicePrompt(false);
    if (productAutocompleteRef.current) {
        productAutocompleteRef.current.focus();
    }
  }, []);

  const handleFinalizeSale = (paymentMethodString: string, payments: { method: string, amount: number }[]) => {
      if (cart.length === 0 || !currentUser || !currentShift) {
          return;
      }

      const newSale: Sale = {
          id: `sale-${Date.now()}`,
          date: new Date().toISOString(),
          totalAmount: grandTotal,
          items: cart,
          paymentMethod: paymentMethodString,
          payments,
          cajaId: currentShift.cajaId,
          employeeId: currentUser.id,
          clientId: selectedPOSClient?.id,
          branchId: currentShift.branchId,
          paymentStatus: paymentMethodString === 'Crédito C.' ? 'Pendiente de Pago' : 'Pagado',
      };
      
      addSale(newSale, currentShift.branchId);

      setCurrentShift(prev => prev ? { ...prev, totalSales: prev.totalSales + newSale.totalAmount } : null);
      
      setIsPaymentModalOpen(false);
      setSaleForInvoice(newSale);
      setShowInvoicePrompt(true);
  };
  
  const handleOpenPaymentModal = (initialMethod: string) => {
      if (cart.length > 0) {
          setInitialPaymentMethodForModal(initialMethod);
          setIsPaymentModalOpen(true);
      } else {
          alert("El carrito está vacío.");
      }
  };

  const generateReceiptPDF = (saleToPrint: Sale) => {
      const storeSettings = getDefaultSettings();
      const receiptEmployee = getEmployeeById(saleToPrint.employeeId);
      const receiptCaja = getCajaById(saleToPrint.cajaId);
      const receiptBranch = receiptCaja ? getBranchById(receiptCaja.branchId) : null;
      const receiptClient = saleToPrint.clientId ? clients.find(c => c.id === saleToPrint.clientId) : null;
      
      const doc = new jsPDF();
      let y = 15;
      const lineSpacing = 7;
      const itemLineSpacing = 5;

      doc.setFontSize(16);
      doc.text(storeSettings.storeName || "Pazzi POS", 105, y, { align: 'center' }); y += lineSpacing * 1.5;
      
      doc.setFontSize(10);
      doc.text(`Sucursal: ${receiptBranch?.name || 'N/A'} - Caja: ${receiptCaja?.name || saleToPrint.cajaId}`, 105, y, { align: 'center' }); y += itemLineSpacing;
      doc.text("Tel: (555) 123-PAZZI", 105, y, { align: 'center' }); y += lineSpacing;

      doc.text(`Recibo Venta: ${saleToPrint.id.slice(-8).toUpperCase()}`, 10, y); y += itemLineSpacing;
      doc.text(`Fecha: ${new Date(saleToPrint.date).toLocaleString('es-ES')}`, 10, y); y += itemLineSpacing;
      doc.text(`Cajero: ${receiptEmployee?.name || 'N/A'}`, 10, y); y += itemLineSpacing;
      if (receiptClient) {
        doc.text(`Cliente: ${receiptClient.name} ${receiptClient.lastName}`, 10, y); y += itemLineSpacing;
      }
      doc.text(`Método Pago: ${saleToPrint.paymentMethod}`, 10, y); y += lineSpacing;

      doc.line(10, y, 200, y); y += lineSpacing; 

      const tableHead = [['Cant.', 'Descripción', 'Precio U.', 'Total']];
      const tableBody = saleToPrint.items.map(item => [
          item.quantity.toString(),
          item.name,
          `$${item.unitPrice.toFixed(2)}`,
          `$${(item.unitPrice * item.quantity).toFixed(2)}`
      ]);

      autoTable(doc, {
          head: tableHead, body: tableBody, startY: y, theme: 'plain',
          styles: { fontSize: 9, cellPadding: 1 }, headStyles: { fontStyle: 'bold' },
          columnStyles: {
              0: { cellWidth: 15, halign: 'right' }, 1: { cellWidth: 'auto' },
              2: { cellWidth: 30, halign: 'right' }, 3: { cellWidth: 30, halign: 'right' }
          }
      });

      y = (doc as any).lastAutoTable.finalY + lineSpacing;

      const receiptSubtotal = saleToPrint.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
      const receiptIVA = saleToPrint.totalAmount - receiptSubtotal; 

      doc.text(`Subtotal: $${receiptSubtotal.toFixed(2)}`, 140, y, {align: 'left'}); y += itemLineSpacing;
      doc.text(`IVA: $${receiptIVA.toFixed(2)}`, 140, y, {align: 'left'}); y += itemLineSpacing;
      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text(`TOTAL: $${saleToPrint.totalAmount.toFixed(2)}`, 140, y, {align: 'left'}); y += lineSpacing * 1.5;
      
      doc.setFontSize(9); doc.setFont('helvetica', 'normal');
      doc.text("¡Gracias por su compra!", 105, y, {align: 'center'}); y += itemLineSpacing;
      doc.text("www.pazzi.com", 105, y, {align: 'center'});
      
      doc.save(`Recibo_${saleToPrint.id.slice(-6)}.pdf`);
      setShowReprintConfirmModal(false);
  };
  
  const generateInvoicePDF = (saleToInvoice: Sale) => {
    const storeSettings = getDefaultSettings();
    const invoiceEmployee = getEmployeeById(saleToInvoice.employeeId);
    const invoiceCaja = getCajaById(saleToInvoice.cajaId);
    const invoiceBranch = invoiceCaja ? getBranchById(invoiceCaja.branchId) : null;
    const invoiceClient = saleToInvoice.clientId ? clients.find(c => c.id === saleToInvoice.clientId) : null;

    if (!invoiceClient || !invoiceClient.taxId) {
        alert("Para generar una factura, la venta debe estar asociada a un cliente con un ID Fiscal (RFC/NIF). La última venta no cumple este requisito.");
        return;
    }

    const doc = new jsPDF();
    let y = 15;
    const lineSpacing = 7;
    const itemLineSpacing = 5;

    doc.setFontSize(16);
    doc.text(storeSettings.storeName || "Pazzi POS", 105, y, { align: 'center' }); y += lineSpacing * 1.5;
    
    doc.setFontSize(10);
    doc.text(`Sucursal: ${invoiceBranch?.name || 'N/A'}`, 105, y, { align: 'center' }); y += lineSpacing;

    doc.text(`FACTURA: ${saleToInvoice.id.slice(-8).toUpperCase()}`, 10, y); y += itemLineSpacing;
    doc.text(`Fecha: ${new Date(saleToInvoice.date).toLocaleString('es-ES')}`, 10, y); y += lineSpacing;

    doc.line(10, y, 200, y); y += lineSpacing; 
    
    doc.setFontSize(11);
    doc.text('Cliente:', 10, y); y += itemLineSpacing;
    doc.setFontSize(10);
    doc.text(`${invoiceClient.name} ${invoiceClient.lastName}`, 10, y); y += itemLineSpacing;
    doc.text(`ID Fiscal: ${invoiceClient.taxId}`, 10, y); y += itemLineSpacing;
    doc.text(`Dirección: ${invoiceClient.billingAddress || invoiceClient.address || 'N/A'}`, 10, y); y += lineSpacing;

    doc.line(10, y, 200, y); y += lineSpacing; 

    const tableHead = [['Cant.', 'Descripción', 'Precio U.', 'Total']];
    const tableBody = saleToInvoice.items.map(item => [
        item.quantity.toString(),
        item.name,
        `$${item.unitPrice.toFixed(2)}`,
        `$${(item.unitPrice * item.quantity).toFixed(2)}`
    ]);

    autoTable(doc, {
        head: tableHead, body: tableBody, startY: y, theme: 'plain',
        styles: { fontSize: 9, cellPadding: 1 }, headStyles: { fontStyle: 'bold' }
    });
    y = (doc as any).lastAutoTable.finalY + lineSpacing;

    const receiptSubtotal = saleToInvoice.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const receiptIVA = saleToInvoice.totalAmount - receiptSubtotal; 

    doc.text(`Subtotal: $${receiptSubtotal.toFixed(2)}`, 140, y, {align: 'left'}); y += itemLineSpacing;
    doc.text(`IVA: $${receiptIVA.toFixed(2)}`, 140, y, {align: 'left'}); y += itemLineSpacing;
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL: $${saleToInvoice.totalAmount.toFixed(2)}`, 140, y, {align: 'left'}); y += lineSpacing * 1.5;
    
    doc.save(`Factura_${saleToInvoice.id.slice(-6)}.pdf`);
  };

    const generateEstimatePDF = (client: Client) => {
        const storeSettings = getDefaultSettings();
        const doc = new jsPDF();
        let y = 15;
        const lineSpacing = 7;
        const itemLineSpacing = 5;

        // PDF Header
        doc.setFontSize(16);
        doc.text(storeSettings.storeName || "Pazzi POS", 105, y, { align: 'center' });
        y += lineSpacing;
        doc.setFontSize(10);
        if (activeBranch) {
            doc.text(`Sucursal: ${activeBranch.name}`, 105, y, { align: 'center' });
            y += itemLineSpacing;
        }
        doc.text("Tel: (555) 123-PAZZI", 105, y, { align: 'center' });
        y += lineSpacing;

        // Title
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text("Estimación de Costos", 105, y, { align: 'center' });
        y += lineSpacing * 2;
        doc.setFont('helvetica', 'normal');

        // Intro
        doc.setFontSize(10);
        doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 200, y, { align: 'right' });
        doc.text(`Estimación para: ${client.name} ${client.lastName}`, 15, y);
        y += lineSpacing;
        doc.text(`Agradecemos la oportunidad de presentarle esta estimación para su consideración.`, 15, y);
        y += lineSpacing * 1.5;
        
        doc.line(15, y, 200, y); y += lineSpacing;

        // Items Table
        const tableHead = [['Cant.', 'Descripción', 'P. Unitario', 'Total']];
        const tableBody = cart.map(item => [
            item.quantity.toString(),
            item.name,
            `$${item.unitPrice.toFixed(2)}`,
            `$${(item.unitPrice * item.quantity).toFixed(2)}`
        ]);

        autoTable(doc, {
            head: tableHead,
            body: tableBody,
            startY: y,
            theme: 'striped',
            headStyles: { fillColor: [6, 182, 161] },
        });

        y = (doc as any).lastAutoTable.finalY + lineSpacing;

        // Totals
        doc.setFontSize(10);
        doc.text(`Subtotal: $${subtotal.toFixed(2)}`, 140, y, { align: 'left' }); y += itemLineSpacing;
        doc.text(`IVA: $${totalIVA.toFixed(2)}`, 140, y, { align: 'left' }); y += itemLineSpacing;
        doc.setFontSize(12); doc.setFont('helvetica', 'bold');
        doc.text(`TOTAL ESTIMADO: $${grandTotal.toFixed(2)}`, 140, y, { align: 'left' }); y += lineSpacing * 2;
        doc.setFont('helvetica', 'normal');

        // Footer / Terms
        doc.setFontSize(9);
        doc.text("Términos:", 15, y); y += itemLineSpacing;
        doc.text("- Esta estimación es válida por 30 días.", 15, y); y += itemLineSpacing;
        doc.text("- Los precios no incluyen costos de instalación o envío a menos que se indique explícitamente.", 15, y); y += itemLineSpacing;
        doc.text("- Los precios pueden variar según la disponibilidad de los productos.", 15, y); y += lineSpacing;

        doc.text("¡Esperamos poder servirle!", 105, y, { align: 'center' });

        doc.save(`Estimacion_${client.name.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    const handleOpenEstimateFlow = () => {
        if (cart.length === 0) {
            alert("El carrito está vacío. Agregue productos para crear una estimación.");
            return;
        }
        setClientSearchPurpose('estimate');
        setIsClientSearchModalOpen(true);
    };

    const handleClientSelectedForEstimate = (client: Client) => {
        setIsClientSearchModalOpen(false);
        generateEstimatePDF(client);
    };


  const handleRecallCart = (cartId: string) => {
    const recalledItems = recallCartFromContext(cartId);
    if (recalledItems) {
        setCart(recalledItems);
    }
    setShowHoldCartModal(false);
  };

  const handleHoldCurrentCart = (name?: string) => {
    if (cart.length === 0) {
        alert("El carrito está vacío. No hay nada que poner en espera.");
        return;
    }
    holdCurrentCart(cart, name);
    setCart([]); 
    setSelectedPOSClient(null); // Clear client when cart is held
  };

  const handleDeleteHeldCart = (cartId: string) => {
    deleteHeldCartFromContext(cartId);
  };

  const handleClientSelected = (client: Client) => {
    setSelectedPOSClient(client);
    setIsClientSearchModalOpen(false);
    productAutocompleteRef.current?.focus();
  };

  const handleOpenCreateClientModal = () => {
      setClientToEditInPOS(null); // Ensure it's for creation
      setIsClientFormModalOpen(true);
  };
  
  const handleClientFormClose = (newClient?: Client) => {
      setIsClientFormModalOpen(false);
      if (newClient) { // If a new client was created and passed back
          setSelectedPOSClient(newClient);
          setIsClientSearchModalOpen(false); 
      }
      productAutocompleteRef.current?.focus();
  };

  if (isShiftModalOpen && !currentShift) {
      return (
          <div className="fixed inset-0 bg-neutral-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-neutral-800 p-6 sm:p-8 rounded-lg shadow-xl w-full max-w-md">
                  <h2 className="text-xl sm:text-2xl font-semibold text-center text-primary mb-6">Iniciar Turno de Caja</h2>
                  <form onSubmit={(e) => { e.preventDefault(); handleStartShift(); }} className="space-y-4">
                      <div>
                          <label htmlFor="initialCash" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Efectivo Inicial en Caja</label>
                          <input
                              type="number" id="initialCash" value={initialCashInput}
                              onChange={(e) => setInitialCashInput(e.target.value)}
                              className={inputFormStyle + " mt-1"} placeholder="Ej: 100.00"
                              min="0" step="0.01" required autoFocus
                          />
                      </div>
                      <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES + " w-full !py-2.5 !text-base"}>
                          Iniciar Turno
                      </button>
                  </form>
                  <button 
                    onClick={() => navigate(-1)} 
                    className={`${BUTTON_SECONDARY_SM_CLASSES} w-full !py-2.5 !text-base mt-3 flex items-center justify-center`}
                  >
                    <ArrowUturnLeftIcon className="mr-1.5"/> Salir de Caja
                  </button>
              </div>
          </div>
      );
  }
  if (!currentShift) return <p className="p-6 text-center text-neutral-500 dark:text-neutral-400">Cargando información de caja...</p>;

  return (
    <div className="h-screen flex flex-col bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100">
        <header className="bg-primary text-white p-3 flex justify-between items-center shadow-md flex-shrink-0">
            <div className="flex items-center">
                <KeyIcon className="w-5 h-5 mr-2"/>
                <div>
                    <p className="text-sm font-semibold">{activeCaja?.name || `Caja ${currentShift.cajaId}`}</p>
                    <p className="text-xs opacity-90">{activeBranch?.name || `Suc. ${currentShift.branchId}`}</p>
                </div>
            </div>
            <div className="text-center">
                <p className="text-sm font-medium">{formatDisplayDate(currentTime)}</p>
                <p className="text-xl font-bold">{formatDisplayTime(currentTime)}</p>
            </div>
             <div className="flex items-center space-x-2">
                 <button 
                    onClick={() => setIsPOSEmergencyModeActive(prev => !prev)} 
                    className={`${isPOSEmergencyModeActive ? 'bg-red-500 hover:bg-red-600' : 'bg-amber-500 hover:bg-amber-600'} text-white px-2 py-1 rounded-md text-xs flex items-center shadow-sm`}
                    title={isPOSEmergencyModeActive ? "Desactivar Modo Emergencia" : "Activar Modo Emergencia"}
                  >
                    <ExclamationTriangleIcon className="w-4 h-4 mr-1"/> Modo Emergencia: {isPOSEmergencyModeActive ? 'ON' : 'OFF'}
                 </button>
            </div>
        </header>

        <div className="flex-grow flex flex-col p-3 gap-3 overflow-hidden">
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                 <button onClick={() => setShowClearCartConfirmModal(true)} className={`${POS_BUTTON_RED_CLASSES} text-xs h-14 flex flex-col items-center justify-center`}><EscKeyIcon className="w-5 h-5 mb-0.5"/>Borrar</button>
                 <button onClick={() => setShowHoldCartModal(true)} className={`${POS_BUTTON_YELLOW_CLASSES} text-xs h-14 flex flex-col items-center justify-center`}><FloppyDiskIcon className="w-5 h-5 mb-0.5"/>Espera</button>
                 <button onClick={() => { setClientSearchPurpose('sale'); setIsClientSearchModalOpen(true); }} className={`${POS_BUTTON_ORANGE_CLASSES} text-xs h-14 flex flex-col items-center justify-center`}><UserPlusIcon className="w-5 h-5 mb-0.5"/>Cliente</button>
                 <button onClick={() => setShowPriceCheckModal(true)} className={`${POS_BUTTON_PURPLE_CLASSES} text-xs h-14 flex flex-col items-center justify-center`}><EyeIcon className="w-5 h-5 mb-0.5"/>Verificar</button>
                 <button onClick={handleOpenEstimateFlow} className={`${POS_BUTTON_TEAL_CLASSES} text-xs h-14 flex flex-col items-center justify-center`}><ClipboardDocumentListIcon className="w-5 h-5 mb-0.5"/>Estimación</button>
                 <button onClick={() => lastCompletedSale ? setShowReprintConfirmModal(true) : alert("No hay última venta para reimprimir.") } className={`${POS_BUTTON_SECONDARY_CLASSES} text-xs h-14 flex flex-col items-center justify-center`}><PrinterIcon className="w-5 h-5 mb-0.5"/>Reimprimir</button>
                 <button onClick={() => setShowEndShiftConfirmModal(true)} className={`${POS_BUTTON_DARK_RED_CLASSES} text-xs h-14 flex flex-col items-center justify-center`}><ArrowLeftOnRectangleIcon className="w-5 h-5 mb-0.5"/>Finalizar</button>
                 <button onClick={() => setIsSwitchUserModalOpen(true)} className={`${POS_BUTTON_INDIGO_CLASSES} text-xs h-14 flex flex-col items-center justify-center`}><KeyIcon className="w-5 h-5 mb-0.5"/>Usuario</button>
            </div>

            <div className="bg-white dark:bg-neutral-800 rounded-lg shadow">
                 <div className="p-3">
                     <ProductAutocomplete
                        products={posRelevantProducts} onProductSelect={handleProductSelect}
                        placeholder="SKU, Código Barras o Nombre Parcial"
                        disabled={!currentShift || currentShift.status === 'closed'}
                        inputRef={productAutocompleteRef}
                    />
                 </div>
                {selectedPOSClient && (
                    <div className="p-2 text-xs bg-blue-50 dark:bg-blue-900/30 border-t dark:border-neutral-700 flex justify-between items-center">
                        <span className="text-blue-700 dark:text-blue-300">Cliente: <span className="font-medium">{selectedPOSClient.name} {selectedPOSClient.lastName}</span></span>
                        <button onClick={() => setSelectedPOSClient(null)} className="text-red-500 hover:text-red-700 p-0.5 rounded-full" title="Quitar Cliente">
                            <XMarkIconSmall className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>
            
            <div className="flex-grow bg-white dark:bg-neutral-800 rounded-lg shadow overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-600">
                {cart.length === 0 && <p className="text-sm text-center text-neutral-500 dark:text-neutral-400 py-10">El carrito está vacío</p>}
                {cart.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-neutral-50 dark:bg-neutral-700/60 rounded-md hover:shadow-sm transition-shadow">
                        <div className="flex-grow overflow-hidden">
                            <p className="text-sm font-medium truncate" title={item.name}>{item.name}</p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">${item.unitPrice.toFixed(2)} c/u</p>
                        </div>
                        <div className="flex items-center flex-shrink-0 ml-2">
                            <input type="number" value={item.quantity} onChange={(e) => updateQuantity(item.id, e.target.value)}
                                className="w-12 text-center text-sm border border-neutral-300 dark:border-neutral-600 rounded-md p-1 bg-white dark:bg-neutral-700" min="1"/>
                            <p className="w-20 text-right text-sm font-semibold mx-2">${(item.unitPrice * item.quantity).toFixed(2)}</p>
                            <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1" title="Quitar artículo">
                                <TrashIconMini className="w-4 h-4"/>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <div className="p-3 bg-white dark:bg-neutral-800 rounded-lg shadow text-sm space-y-1">
                <div className="flex justify-between"><span className="text-neutral-500 dark:text-neutral-400">Subtotal:</span> <span>${subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-neutral-500 dark:text-neutral-400">IVA:</span> <span>${totalIVA.toFixed(2)}</span></div>
                <div className="flex justify-between text-xl font-bold pt-1 border-t dark:border-neutral-600 text-primary"><span className="dark:text-accent">TOTAL:</span> <span>${grandTotal.toFixed(2)}</span></div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <button onClick={() => handleOpenPaymentModal('Efectivo')} className={`${POS_BUTTON_BLUE_CLASSES} h-16 text-lg flex items-center justify-center`}><CashBillIcon className="w-6 h-6 mr-2"/>Efectivo</button>
                <button onClick={() => handleOpenPaymentModal('Tarjeta')} className={`${POS_BUTTON_BLUE_CLASSES} h-16 text-lg flex items-center justify-center`}><CreditCardIcon className="w-6 h-6 mr-2"/>Tarjeta</button>
                <button onClick={() => handleOpenPaymentModal('ATH Móvil')} className={`${POS_BUTTON_PINK_CLASSES} h-16 text-lg flex items-center justify-center`}><AthMovilIcon className="w-6 h-6 mr-2"/>ATH Móvil</button>
                <button onClick={() => handleOpenPaymentModal('Crédito C.')} className={`${POS_BUTTON_CREDIT_CLASSES} h-16 text-lg`}>Crédito C.</button>
                <button onClick={() => handleOpenPaymentModal('Cheque')} className={`${POS_BUTTON_TEAL_CLASSES} h-16 text-lg flex items-center justify-center`}><BanknotesIcon className="w-6 h-6 mr-2"/>Cheque</button>
                <button 
                    onClick={() => {
                        if (lastCompletedSale) {
                            generateInvoicePDF(lastCompletedSale);
                        }
                    }} 
                    className={`${POS_BUTTON_GREEN_CLASSES} h-16 text-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed`}
                    disabled={cart.length > 0 || !lastCompletedSale}
                    title={cart.length > 0 ? "Finalice la venta actual antes de facturar la anterior" : !lastCompletedSale ? "No hay una venta reciente para facturar" : "Generar factura para la última venta"}
                >
                    <PrinterIcon className="w-6 h-6 mr-2"/>Factura
                </button>
            </div>
        </div>

        <HoldCartModal 
            isOpen={showHoldCartModal} onClose={() => setShowHoldCartModal(false)}
            heldCarts={heldCarts} onRecallCart={handleRecallCart}
            onDeleteHeldCart={handleDeleteHeldCart} onHoldCurrentCart={handleHoldCurrentCart}
            currentCartHasItems={cart.length > 0}
        />
         <PriceCheckModal 
            isOpen={showPriceCheckModal} onClose={() => setShowPriceCheckModal(false)}
            getProductByRef={getProductByRef} activeBranchId={currentShift.branchId}
        />
        {lastCompletedSale && 
            <ConfirmationModal
                isOpen={showReprintConfirmModal} onClose={() => setShowReprintConfirmModal(false)}
                onConfirm={() => generateReceiptPDF(lastCompletedSale)}
                title="Reimprimir Último Recibo"
                message={`¿Desea reimprimir el recibo de la venta #${lastCompletedSale.id.slice(-6)} por $${lastCompletedSale.totalAmount.toFixed(2)}?`}
                confirmButtonText="Sí, Reimprimir"
            />
        }
        <ConfirmationModal
            isOpen={showClearCartConfirmModal} onClose={() => setShowClearCartConfirmModal(false)}
            onConfirm={() => { setCart([]); setSelectedPOSClient(null); setShowClearCartConfirmModal(false); }}
            title="Confirmar Borrar Carrito"
            message="¿Está seguro que desea borrar todos los artículos del carrito actual? Esta acción no se puede deshacer."
            confirmButtonText="Sí, Borrar Carrito"
        />
        <ConfirmationModal
            isOpen={showEndShiftConfirmModal}
            onClose={() => setShowEndShiftConfirmModal(false)}
            onConfirm={() => handleEndShift()}
            title="Confirmar Finalizar Turno"
            message="¿Está seguro que desea finalizar el turno actual?"
            confirmButtonText="Sí, Finalizar"
        />
        <ConfirmationModal
            isOpen={showInvoicePrompt}
            onClose={resetSaleState}
            onConfirm={() => {
                if (saleForInvoice) {
                    generateInvoicePDF(saleForInvoice);
                }
                resetSaleState();
            }}
            title="Venta Completada"
            message="¿Desea generar una factura para esta venta?"
            confirmButtonText="Sí, Generar Factura"
            cancelButtonText="No, Nueva Venta"
        />
        <ClientSearchModal
            isOpen={isClientSearchModalOpen}
            onClose={() => setIsClientSearchModalOpen(false)}
            clients={clients}
            onClientSelect={clientSearchPurpose === 'sale' ? handleClientSelected : handleClientSelectedForEstimate}
            onOpenCreateClient={handleOpenCreateClientModal}
        />
         <ClientFormModal 
            isOpen={isClientFormModalOpen} 
            onClose={() => handleClientFormClose()} 
            client={clientToEditInPOS}
        />
        {isPaymentModalOpen && (
            <MultiPaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                total={grandTotal}
                onConfirmSale={handleFinalizeSale}
                initialMethod={initialPaymentMethodForModal}
            />
        )}
        <SwitchUserModal
            isOpen={isSwitchUserModalOpen}
            onClose={() => setIsSwitchUserModalOpen(false)}
            onSwitchUser={handleSwitchUser}
            posUsers={allUsers.filter(u => u.role === UserRole.EMPLOYEE || u.role === UserRole.MANAGER)}
        />
    </div>
  );
};


const MultiPaymentModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    total: number;
    onConfirmSale: (paymentMethodString: string, payments: { method: string; amount: number }[]) => void;
    initialMethod: string;
}> = ({ isOpen, onClose, total, onConfirmSale, initialMethod }) => {
    const [appliedPayments, setAppliedPayments] = useState<{ method: string; amount: number }[]>([]);
    const [selectedMethod, setSelectedMethod] = useState(initialMethod);
    const [amountInput, setAmountInput] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    const totalPaid = useMemo(() => appliedPayments.reduce((sum, p) => sum + p.amount, 0), [appliedPayments]);
    const remainingBalance = total - totalPaid;
    const change = totalPaid > total ? totalPaid - total : 0;

    const paymentMethods = ['Efectivo', 'Tarjeta', 'ATH Móvil', 'Crédito C.', 'Cheque'];

    useEffect(() => {
        if (isOpen) {
            setAppliedPayments([]);
            setSelectedMethod(initialMethod);
            setAmountInput(total.toFixed(2));
            setTimeout(() => inputRef.current?.select(), 100);
        }
    }, [isOpen, initialMethod, total]);
    
    useEffect(() => {
        setAmountInput(remainingBalance > 0.005 ? remainingBalance.toFixed(2) : '0.00');
    }, [remainingBalance]);


    const handleAddPayment = () => {
        const amount = parseFloat(amountInput);
        if (isNaN(amount) || amount <= 0) {
            alert("Ingrese un monto válido.");
            return;
        }
        if (amount > remainingBalance + 0.005) { // Allow for small rounding errors
            alert(`El monto a agregar ($${amount.toFixed(2)}) no puede ser mayor al saldo pendiente ($${remainingBalance.toFixed(2)}).`);
            return;
        }
        setAppliedPayments(prev => [...prev, { method: selectedMethod, amount }]);
    };
    
    const handleRemovePayment = (indexToRemove: number) => {
        setAppliedPayments(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    const handleFinalize = () => {
        if (remainingBalance > 0.005) {
            alert("Aún queda un saldo pendiente por pagar.");
            return;
        }
        const paymentMethodString = appliedPayments.length > 1 ? 'Mixto' : appliedPayments[0]?.method || 'Desconocido';
        onConfirmSale(paymentMethodString, appliedPayments);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Procesar Venta" size="xl">
            <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-2/5 space-y-3">
                    <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-900/40">
                        <p className="text-sm">Saldo Pendiente</p>
                        <p className="text-4xl font-bold text-red-600 dark:text-red-400">${remainingBalance.toFixed(2)}</p>
                    </div>
                    {change > 0 && (
                        <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-900/40">
                            <p className="text-sm">Cambio</p>
                            <p className="text-4xl font-bold text-amber-600">${change.toFixed(2)}</p>
                        </div>
                    )}
                    <div>
                        <h4 className="text-sm font-semibold mb-1">Pagos Aplicados:</h4>
                        {appliedPayments.length > 0 ? (
                            <ul className="space-y-1 text-sm max-h-24 overflow-y-auto pr-1">
                                {appliedPayments.map((p, i) => (
                                    <li key={i} className="flex justify-between items-center bg-neutral-100 dark:bg-neutral-700 p-1.5 rounded">
                                        <span>{p.method}: <span className="font-medium">${p.amount.toFixed(2)}</span></span>
                                        <button onClick={() => handleRemovePayment(i)} className="text-red-500 hover:text-red-700 p-0.5" aria-label={`Quitar pago ${p.method}`}>
                                            <TrashIconMini className="w-3.5 h-3.5"/>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (<p className="text-xs text-center py-2">Ningún pago aplicado.</p>)}
                        <p className="text-right font-bold mt-1">Total Pagado: ${totalPaid.toFixed(2)}</p>
                    </div>
                </div>
                <div className="w-full md:w-3/5 space-y-4">
                    <h4 className="text-sm font-semibold">Seleccione Método y Monto:</h4>
                    <div className="grid grid-cols-2 gap-2">
                        {paymentMethods.map(method => (
                            <button key={method} type="button" onClick={() => setSelectedMethod(method)}
                                className={`p-3 rounded-md text-sm font-medium border-2 transition-colors ${selectedMethod === method ? 'border-primary dark:border-accent ring-2 ring-primary/30 dark:ring-accent/30 bg-primary/5 dark:bg-accent/10' : 'border-neutral-300 dark:border-neutral-600'}`}>
                                {method}
                            </button>
                        ))}
                    </div>
                    <form onSubmit={e => { e.preventDefault(); handleAddPayment(); }} className="flex items-end gap-2">
                        <div className="flex-grow">
                            <label className="block text-xs font-medium">Monto para {selectedMethod}</label>
                            <input ref={inputRef} type="number" value={amountInput} onChange={e => setAmountInput(e.target.value)} className={inputFormStyle + " text-lg"} min="0.01" step="0.01" />
                        </div>
                        <button type="submit" className={`${BUTTON_SECONDARY_SM_CLASSES} h-11 flex items-center`} disabled={remainingBalance <= 0.005}>
                            <PlusIcon className="mr-1"/> Agregar Pago
                        </button>
                    </form>
                </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4 mt-4 border-t dark:border-neutral-700">
                <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                <button type="button" onClick={handleFinalize} className={`${BUTTON_PRIMARY_CLASSES} ${POS_BUTTON_GREEN_CLASSES} disabled:opacity-50`} disabled={remainingBalance > 0.005}>
                    Finalizar Venta
                </button>
            </div>
        </Modal>
    );
};

const SwitchUserModal: React.FC<{isOpen: boolean, onClose: () => void, posUsers: any[], onSwitchUser: (email: string, pass: string) => Promise<boolean>}> = ({ isOpen, onClose, posUsers, onSwitchUser }) => {
    const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setSelectedUserEmail(null);
            setPassword('');
            setError('');
            setIsLoggingIn(false);
        }
    }, [isOpen]);

    const handleLoginAttempt = async () => {
        if (!selectedUserEmail || !password) {
            setError("Seleccione un usuario e ingrese la clave.");
            return;
        }
        setIsLoggingIn(true);
        setError('');
        const success = await onSwitchUser(selectedUserEmail, password);
        if (!success) {
            setError("Clave incorrecta. Intente de nuevo.");
            setIsLoggingIn(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Cambiar de Usuario" size="md">
            <div className="space-y-4">
                {error && <p className="text-sm text-red-600 dark:text-red-400 p-2 bg-red-50 dark:bg-red-900/30 rounded-md">{error}</p>}
                
                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Seleccionar Usuario</label>
                    <select
                        value={selectedUserEmail || ''}
                        onChange={(e) => setSelectedUserEmail(e.target.value)}
                        className={inputFormStyle + " w-full mt-1"}
                        disabled={isLoggingIn}
                    >
                        <option value="" disabled>Seleccione...</option>
                        {posUsers.map(user => (
                            <option key={user.id} value={user.email}>{user.name} {user.lastName} ({user.role})</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Contraseña</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={authInputStyle + " w-full mt-1"}
                        disabled={isLoggingIn}
                    />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES} disabled={isLoggingIn}>Cancelar</button>
                    <button type="button" onClick={handleLoginAttempt} className={BUTTON_PRIMARY_SM_CLASSES} disabled={isLoggingIn}>
                        {isLoggingIn ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};