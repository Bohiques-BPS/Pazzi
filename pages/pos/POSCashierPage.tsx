import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Product, CartItem, Sale, UserRole } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Modal } from '../../components/Modal';
import { 
    POS_BUTTON_BLUE_CLASSES, POS_BUTTON_RED_CLASSES, POS_BUTTON_SECONDARY_CLASSES, POS_BUTTON_YELLOW_CLASSES, POS_BUTTON_PURPLE_CLASSES, POS_BUTTON_DARK_RED_CLASSES, POS_BUTTON_GREEN_CLASSES,
    inputFormStyle, INITIAL_BRANCHES
} from '../../constants';
import { 
    CashBillIcon, CreditCardIcon, PrinterIcon, TrashIconMini, KeyIcon, ArrowLeftOnRectangleIcon, 
    Cog6ToothIcon, FloppyDiskIcon, EscKeyIcon, OneDBarcodeIcon
} from '../../components/icons';

interface POSShift {
  id: string;
  startTime: string;
  endTime?: string;
  initialCash: number;
  totalSales: number;
  status: 'open' | 'closed';
  employeeId: string;
  cajaNumber: string;
  branchId: string; // Added branchId to shift
}

const POS_CAJA_ID = "0008"; // As per image
const firstActiveBranchId = INITIAL_BRANCHES.find(b => b.isActive)?.id || 'branch-central';


export const POSCashierPage: React.FC = () => {
  const { products, addSale, getProductById } = useData();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [cart, setCart] = useState<CartItem[]>([]);
  const [referenceInput, setReferenceInput] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('Efectivo');
  
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(true);
  const [currentShift, setCurrentShift] = useState<POSShift | null>(null);
  const [initialCashInput, setInitialCashInput] = useState('');

  const [currentTime, setCurrentTime] = useState(new Date());

  const referenceInputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
   useEffect(() => {
    if (currentShift && referenceInputRef.current) {
      referenceInputRef.current.focus();
    }
  }, [currentShift]);


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
      cajaNumber: POS_CAJA_ID,
      branchId: firstActiveBranchId // Assign a branch to the shift
    });
    setIsShiftModalOpen(false);
    setInitialCashInput('');
  };

  const handleEndShift = () => {
    if (currentShift) {
      alert(`Turno cerrado. Ventas totales: $${currentShift.totalSales.toFixed(2)}`);
      setCurrentShift(null);
      setIsShiftModalOpen(true); 
    }
  };

  const handleReferenceSubmit = (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!referenceInput.trim() || !currentShift || currentShift.status === 'closed') return;

    const foundProduct = products.find(p => p.skus?.includes(referenceInput.trim()) || p.id === referenceInput.trim() || p.name.toLowerCase() === referenceInput.trim().toLowerCase());
    if (foundProduct) {
      addToCart(foundProduct);
    } else {
      alert(`Producto con referencia "${referenceInput}" no encontrado.`);
    }
    setReferenceInput('');
  };

  const addToCart = (product: Product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
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

  const calculateSubtotal = () => cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  
  // Example tax rates (these should ideally come from settings or product data)
  const ESTATAL_TAX_RATE = 0.00; // Example, adjust as needed
  const REDUCIDO_TAX_RATE = 0.06; // Example
  const MUNICIPAL_TAX_RATE = 0.00; // Example
  const GENERAL_IVA_RATE = 0.16; // Fallback if not on item

  const calculateTaxesAndTotal = () => {
    let subtotal = 0;
    let totalIVA = 0;
    let estatalTax = 0;
    let reducidoTax = 0; // This would apply if specific items have this rate
    let municipalTax = 0;

    cart.forEach(item => {
        const itemSubtotal = item.unitPrice * item.quantity;
        subtotal += itemSubtotal;
        // Apply item-specific IVA if available, else general IVA
        const ivaRate = item.ivaRate !== undefined ? item.ivaRate : GENERAL_IVA_RATE;
        totalIVA += itemSubtotal * ivaRate;

        // Example: if product indicates it has "reducido" tax.
        // This logic needs to be more robust based on actual product properties or categories.
        // For now, let's assume some items might qualify for reducido based on a hypothetical flag or category.
        // if (item.category === "Alimentos Reducido") {
        //    reducidoTax += itemSubtotal * REDUCIDO_TAX_RATE;
        // } else {
        //    estatalTax += itemSubtotal * ESTATAL_TAX_RATE; // Or apply general IVA here if estatal is part of it
        // }
        // municipalTax += itemSubtotal * MUNICIPAL_TAX_RATE;
    });
    
    // Simplified: For now, let's assume estatalTax, reducidoTax, municipalTax are part of the displayed IVA or separate fixed amounts
    // The "Estatal", "T. Reducido 6%", "Municipal" lines in the image seem like distinct additional taxes or specific portions of a general tax.
    // For simplicity, I'll make them fixed percentages of subtotal for demonstration.
    estatalTax = subtotal * ESTATAL_TAX_RATE; // Let's assume it's 0 for now as per image $0.00
    reducidoTax = cart.filter(item => item.category === "HypotheticalReducedCategory").reduce((acc, item) => acc + (item.unitPrice * item.quantity * REDUCIDO_TAX_RATE), 0); // Assume 0 for now
    municipalTax = subtotal * MUNICIPAL_TAX_RATE; // Assume 0 for now

    const discount = 0; // Placeholder for discount logic
    const grandTotal = subtotal + totalIVA + estatalTax + reducidoTax + municipalTax - discount;


    return {
        subtotal,
        totalIVA, // This is the primary IVA calculated
        estatalTax, // Placeholder for now
        reducidoTax, // Placeholder
        municipalTax, // Placeholder
        discount, // Placeholder
        grandTotal
    };
  };
  
  const { subtotal, totalIVA, estatalTax, reducidoTax, municipalTax, discount, grandTotal } = calculateTaxesAndTotal();


  const handleProcessPayment = () => {
    if (cart.length === 0) {
        alert("El carrito está vacío.");
        return;
    }
    if (!currentUser || !currentShift) {
      alert("No hay un turno de caja activo o empleado logueado.");
      return;
    }
    const saleData = {
      totalAmount: grandTotal,
      items: cart,
      paymentMethod: selectedPaymentMethod,
      cajaId: currentShift.cajaNumber, 
      employeeId: currentUser.id
    };
    addSale(saleData, currentShift.branchId); // Pass branchId
    
    setCurrentShift(prev => prev ? {...prev, totalSales: prev.totalSales + saleData.totalAmount} : null);

    alert(`Venta procesada (${selectedPaymentMethod}). Total: $${saleData.totalAmount.toFixed(2)}`);
    setCart([]);
    setReferenceInput('');
    referenceInputRef.current?.focus();
  };
  
  const handleGenericButtonClick = (buttonName: string) => {
      console.log(`${buttonName} button clicked`);
      alert(`Funcionalidad "${buttonName}" no implementada.`);
  };

  const paymentButtonsTop = [
    { name: 'Cash', icon: <CashBillIcon className="w-6 h-6 mx-auto mb-1 text-white filter drop-shadow-sm"/>, action: () => setSelectedPaymentMethod('Efectivo') },
    { name: 'Tar. Débito', action: () => setSelectedPaymentMethod('Débito') },
    { name: 'Tar. Crédito', action: () => setSelectedPaymentMethod('Crédito') },
    { name: 'LayAway', action: () => handleGenericButtonClick('LayAway') },
    { name: 'Cheque', action: () => handleGenericButtonClick('Cheque') },
    { name: 'Crédito C.', action: () => handleGenericButtonClick('Crédito Cliente') }, // Assuming "Crédito" in image is client credit
    { name: 'ATH Movil', action: () => handleGenericButtonClick('ATH Movil') },
    { name: 'Void', action: () => { setCart([]); alert("Carrito vaciado (Void)."); }},
    { name: 'Opciones', action: () => handleGenericButtonClick('Opciones') },
  ];


  if (!currentShift && isShiftModalOpen) {
    return (
        <Modal isOpen={isShiftModalOpen} onClose={() => {}} title="Iniciar Turno de Caja" size="md">
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-center text-blue-600 mb-2"> {/* Primary color for POS */}
                    <KeyIcon className="w-8 h-8" />
                    <span className="ml-2 text-lg font-semibold">Apertura de Caja {POS_CAJA_ID}</span>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                    Bienvenido, {currentUser?.name || 'Empleado'}. Ingresa el monto de efectivo inicial para comenzar tu turno.
                </p>
                <div>
                    <label htmlFor="initialCash" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Efectivo Inicial (USD)</label>
                    <input
                        type="number"
                        id="initialCash"
                        value={initialCashInput}
                        onChange={(e) => setInitialCashInput(e.target.value)}
                        className={inputFormStyle + " w-full mt-1"}
                        placeholder="Ej: 50.00"
                        min="0"
                        step="0.01"
                    />
                </div>
                <button onClick={handleStartShift} className={`${POS_BUTTON_BLUE_CLASSES} w-full !text-base !py-2.5`}>
                    Iniciar Turno
                </button>
                 <button onClick={() => navigate('/pos/dashboard')} className="w-full mt-2 text-sm text-center text-blue-500 hover:underline">
                    Volver al Dashboard POS
                </button>
            </div>
        </Modal>
    );
}


  return (
    <div className="flex flex-col h-screen bg-neutral-800 text-white font-sans text-sm select-none">
      {/* Header */}
      <header className="bg-blue-800 px-3 py-1.5 flex justify-between items-center shadow-md">
        <div className="text-xs">{formatDisplayDate(currentTime)}</div>
        <div className="text-sm font-semibold">Caja : {currentShift?.cajaNumber || '----'}</div>
        <div className="text-xs">{formatDisplayTime(currentTime)}</div>
      </header>

      {/* Top Button Bar */}
      <div className="bg-neutral-700 px-2 py-1.5 flex space-x-1 shadow">
        {paymentButtonsTop.map(btn => (
          <button 
            key={btn.name} 
            onClick={btn.action} 
            className={`${POS_BUTTON_BLUE_CLASSES} !px-2 !py-1.5 !text-xs flex-1 flex flex-col items-center justify-center h-14 ${selectedPaymentMethod === btn.name.split('.')[0] && btn.name !== "Void" && btn.name !== "Opciones" ? '!bg-blue-500 ring-2 ring-white' : ''}`}
            disabled={!currentShift}
            title={btn.name}
          >
            {btn.icon && <div className="h-6 flex items-center justify-center">{btn.icon}</div>}
            <span className={btn.icon ? "mt-0.5" : ""}>{btn.name}</span>
          </button>
        ))}
        <button onClick={() => { handleEndShift(); navigate('/pos/dashboard');}} className={`${POS_BUTTON_RED_CLASSES} !px-2 !py-1.5 !text-xs flex-1 flex flex-col items-center justify-center h-14`} disabled={!currentShift} title="Salir y Cerrar Turno">
            <ArrowLeftOnRectangleIcon className="w-6 h-6 mx-auto mb-1"/> Salir
        </button>
      </div>

      {/* Main Content: Cart & Product Entry */}
      <div className="flex-grow flex flex-col bg-neutral-300 text-black overflow-hidden p-0.5">
        <form onSubmit={handleReferenceSubmit} className="mb-0.5">
            <input
                ref={referenceInputRef}
                type="text"
                placeholder="Referencia (SKU, Nombre o Código de Barras)"
                value={referenceInput}
                onChange={(e) => setReferenceInput(e.target.value)}
                className="w-full px-3 py-2 text-sm border-neutral-400 border bg-white focus:ring-blue-500 focus:border-blue-500"
                disabled={!currentShift}
            />
        </form>
        <div className="flex-grow bg-neutral-400 overflow-y-auto pos-cart-scrollbar">
            <table className="min-w-full">
                <thead className="sticky top-0 bg-neutral-500 text-white z-10">
                    <tr>
                        <th className="px-2 py-1 text-left text-xs font-medium w-2/12">Referencia</th>
                        <th className="px-2 py-1 text-left text-xs font-medium w-5/12">Descripción</th>
                        <th className="px-2 py-1 text-right text-xs font-medium w-1/12">Cantidad</th>
                        <th className="px-2 py-1 text-right text-xs font-medium w-2/12">Precio</th>
                        <th className="px-2 py-1 text-right text-xs font-medium w-2/12">Total</th>
                        <th className="px-1 py-1 text-center text-xs font-medium w-auto"></th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-300">
                {cart.map(item => (
                    <tr key={item.id} className="hover:bg-neutral-100">
                    <td className="px-2 py-1 whitespace-nowrap text-xs">{item.skus?.[0] || item.id.slice(0,8)}</td>
                    <td className="px-2 py-1 whitespace-nowrap text-xs">{item.name}</td>
                    <td className="px-2 py-1 whitespace-nowrap text-xs text-right">
                        <input 
                          type="number" 
                          value={item.quantity} 
                          onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
                          className="w-12 text-right bg-transparent border border-neutral-300 rounded px-1"
                          disabled={!currentShift}
                        />
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap text-xs text-right">${item.unitPrice.toFixed(2)}</td>
                    <td className="px-2 py-1 whitespace-nowrap text-xs text-right font-medium">${(item.unitPrice * item.quantity).toFixed(2)}</td>
                    <td className="px-1 py-1 text-center">
                        <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700" disabled={!currentShift}>
                            <TrashIconMini className="w-3.5 h-3.5"/>
                        </button>
                    </td>
                    </tr>
                ))}
                {cart.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-10 text-neutral-500 text-sm">Carrito vacío</td></tr>
                )}
                </tbody>
            </table>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="bg-neutral-700 text-white p-1.5 grid grid-cols-12 gap-1 items-stretch">
        <div className="col-span-2 space-y-0.5 text-xs pr-1 border-r border-neutral-600">
            <div className="flex justify-between"><span>Peso:</span> <span className="font-mono">0.00 Lbs</span></div>
            <div className="flex justify-between"><span>Cantidad:</span> <span className="font-mono">{cart.reduce((acc, item) => acc + item.quantity, 0) || "1.00"}</span></div>
            <div className="text-center text-yellow-400 mt-1">Caja Inactiva</div> {/* Placeholder */}
            <div className="mt-1">Cajero: <span className="font-mono">{currentUser?.name?.split(' ')[0] || 'N/A'}</span></div>
        </div>

        <div className="col-span-5 grid grid-cols-3 grid-rows-3 gap-1 text-xs">
            {/* Row 1 */}
            <button onClick={() => handleGenericButtonClick('Touch')} className={`${POS_BUTTON_BLUE_CLASSES} row-span-1`}>Touch</button>
            <button onClick={() => handleGenericButtonClick('Hold')} className={`${POS_BUTTON_BLUE_CLASSES} row-span-1`}>Hold</button>
            <button onClick={() => handleGenericButtonClick('Solo Precio')} className={`${POS_BUTTON_BLUE_CLASSES} row-span-1`}>Solo Precio</button>
            {/* Row 2 */}
            <button onClick={() => handleGenericButtonClick('Imprimir')} className={`${POS_BUTTON_YELLOW_CLASSES} row-span-1`}><PrinterIcon className="mx-auto mb-0.5"/>Imprimir</button>
            <button onClick={() => handleGenericButtonClick('Guardar Trans.')} className={`${POS_BUTTON_BLUE_CLASSES} row-span-1`}><FloppyDiskIcon className="mx-auto mb-0.5"/>Guardar</button>
            <button onClick={() => handleGenericButtonClick('Recargas')} className={`${POS_BUTTON_PURPLE_CLASSES} row-span-1`}>Recargas</button>
            {/* Row 3 */}
            <button onClick={() => handleGenericButtonClick('Dev Consignación')} className={`${POS_BUTTON_DARK_RED_CLASSES} row-span-1`}>Dev Consignación</button>
            <button onClick={() => { setReferenceInput(''); referenceInputRef.current?.focus();}} className={`${POS_BUTTON_SECONDARY_CLASSES} row-span-1`}><EscKeyIcon className="mx-auto mb-0.5"/>ESC</button>
            <button onClick={() => handleGenericButtonClick('Eliminar Línea')} className={`${POS_BUTTON_DARK_RED_CLASSES} row-span-1`}>Eliminar</button>
        </div>
        
        <div className="col-span-3 space-y-0 text-xs pl-1 border-l border-neutral-600">
            <div className="flex justify-between"><span>{cart.length} Productos:</span> <span className="font-mono">${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Estatal:</span> <span className="font-mono">+ ${estatalTax.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>T. Reducido 6%:</span> <span className="font-mono">+ ${reducidoTax.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Municipal:</span> <span className="font-mono">+ ${municipalTax.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Descuento:</span> <span className="font-mono">- ${discount.toFixed(2)}</span></div>
            <div className="flex justify-between items-baseline mt-1 pt-1 border-t border-neutral-600">
                <span className="text-lg font-bold">Total:</span>
                <span className="text-2xl font-bold font-mono text-yellow-300">${grandTotal.toFixed(2)}</span>
            </div>
        </div>

        <div className="col-span-2 flex flex-col justify-between pl-1 border-l border-neutral-600">
            <div className="text-xs">
                <div>Cliente Activo:</div>
                <div className="font-semibold">Caja Registradora</div> {/* Placeholder */}
                <div className="mt-1">Puntos: <span className="font-mono">0.00</span></div>
            </div>
            <button 
                onClick={handleProcessPayment} 
                className={`${POS_BUTTON_GREEN_CLASSES} w-full !text-lg !font-bold h-16`}
                disabled={cart.length === 0 || !currentShift}
            >
                COBRAR
            </button>
        </div>

      </footer>
      <style>{`
        .pos-cart-scrollbar::-webkit-scrollbar {
            width: 6px;
        }
        .pos-cart-scrollbar::-webkit-scrollbar-track {
            background: #4a5568; /* neutral-700 */
        }
        .pos-cart-scrollbar::-webkit-scrollbar-thumb {
            background: #a0aec0; /* neutral-400 */
            border-radius: 3px;
        }
        .pos-cart-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #718096; /* neutral-500 */
        }
      `}</style>
    </div>
  );
};
