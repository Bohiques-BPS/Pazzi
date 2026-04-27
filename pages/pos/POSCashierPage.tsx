import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalSettings, useTranslation } from '../../contexts/GlobalSettingsContext'; // Imported useTranslation
import { Product, CartItem, Client, Branch, Caja, HeldCart, Estimate, LayawayStatus, User, UserRole, Employee, Project, EstimateStatus, Sale } from '../../types';
import {
    XMarkIcon,
    ArchiveBoxIcon,
    UserPlusIcon,
    EyeIcon,
    ClipboardDocumentListIcon,
    PrinterIcon,
    FloppyDiskIcon,
    UserIcon as UserKeyIcon,
    ExclamationTriangleIcon,
    KeyIcon,
    MagnifyingGlassIcon,
    TrashIconMini, BanknotesIcon, CreditCardIcon, AthMovilIcon,
    ChatBubbleLeftRightIcon,
    DocumentTextIcon, // A generic document icon
    BriefcaseIcon,
    PlusIcon,
    ArrowLeftOnRectangleIcon as ExitIcon,
    TagIcon,
    ArrowUturnLeftIcon,
} from '../../components/icons';
import { ProductAutocomplete } from '../../components/ui/ProductAutocomplete';
import { ClientSearchModal } from '../../components/ClientSearchModal';
import { ClientFormModal } from '../pm/ClientFormModal';
import { HeldCartsModal } from '../../components/ui/HeldCartsModal';
import { ClientEstimatesModal } from '../../components/ui/ClientEstimatesModal';
import { CreateLayawayModal } from '../../components/forms/CreateLayawayModal';
import { UserSwitchModal } from '../../components/ui/UserSwitchModal';
import { POSProjectFormModal } from './POSProjectFormModal';
import { BUTTON_SECONDARY_SM_CLASSES, inputFormStyle, POS_BUTTON_CYAN_CLASSES, BUTTON_PRIMARY_SM_CLASSES, DEFAULT_CLIENT_ID } from '../../constants';
import { PaymentModal, PaymentMethod } from '../../components/forms/PaymentModal';
import { Modal } from '../../components/Modal';
import { EndShiftModal } from '../../components/ui/EndShiftModal';
import { PayoutModal } from '../../components/forms/PayoutModal';
import { DiscountAuthModal } from '../../components/forms/DiscountAuthModal';
import { ReturnModal } from '../../components/forms/ReturnModal';


// Helper component for the live clock in the header
const LiveClock = () => {
    const [time, setTime] = useState(new Date());
    const { settings } = useGlobalSettings();

    useEffect(() => {
        const timerId = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat(settings.language === 'es' ? 'es-ES' : 'en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            timeZone: settings.timezone,
        }).format(date);
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString(settings.language === 'es' ? 'es-ES' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: settings.timezone,
        });
    };

    return (
        <div className="text-center text-white">
            <p className="text-[10px] sm:text-xs opacity-80 leading-tight">{formatDate(time)}</p>
            <p className="text-lg sm:text-2xl font-bold leading-tight">{formatTime(time)}</p>
        </div>
    );
};

const ActionButton: React.FC<{ icon: React.ReactNode; text: string; color: string; onClick?: () => void; disabled?: boolean; }> = ({ icon, text, color, onClick, disabled = false }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`flex-1 flex flex-col sm:flex-row items-center justify-center py-1.5 sm:py-2 px-1 sm:px-3 rounded-md text-white text-[10px] sm:text-sm font-semibold transition-colors ${color} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-90'}`}
        style={{ minHeight: '40px' }}
    >
        {React.cloneElement(icon as React.ReactElement, { className: "w-4 h-4 sm:w-5 sm:h-5 sm:mr-2 mb-0.5 sm:mb-0" })}
        <span className="whitespace-nowrap overflow-hidden text-ellipsis max-w-full">{text}</span>
    </button>
);

const PaymentButton: React.FC<{ icon: React.ReactNode; text: string; color: string; onClick?: () => void; disabled?: boolean; }> = ({ icon, text, color, onClick, disabled = false }) => (
     <button
        onClick={onClick}
        disabled={disabled}
        className={`flex-1 flex flex-col sm:flex-row items-center justify-center p-2 sm:p-4 rounded-md text-white font-semibold transition-colors text-xs sm:text-xl ${color} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-90'}`}
    >
        {icon && React.cloneElement(icon as React.ReactElement, { className: "w-4 h-4 sm:w-5 sm:h-5 sm:mr-2 mb-0.5 sm:mb-0" })}
        <span>{text}</span>
    </button>
);

// Inline Modal for simple authentication prompts
const POSActionAuthModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => Promise<boolean>;
  title: string;
  message: string;
}> = ({ isOpen, onClose, onConfirm, title, message }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isChecking, setIsChecking] = useState(false);
    const { t } = useTranslation();

    useEffect(() => {
        if (isOpen) {
            setPassword('');
            setError('');
            setIsChecking(false);
        }
    }, [isOpen]);

    const handleConfirm = async () => {
        setIsChecking(true);
        setError('');
        const success = await onConfirm(password);
        if (!success) {
            setError('Contraseña incorrecta.');
            setIsChecking(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <form onSubmit={(e) => { e.preventDefault(); handleConfirm(); }} className="space-y-4">
                <p className="text-sm text-neutral-600 dark:text-neutral-300">{message}</p>
                <div>
                    <label className="block text-sm font-medium">Contraseña</label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={inputFormStyle}
                        required
                        autoFocus
                    />
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
                <div className="flex justify-end space-x-2">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
                    <button type="submit" className={BUTTON_SECONDARY_SM_CLASSES} disabled={isChecking}>
                        {isChecking ? 'Verificando...' : t('common.confirm')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

type ReturnItemPayload = CartItem & { customRefundAmount?: number; returnToStock: boolean };

// Main Component
export const POSCashierPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation(); // Hook translation
    const { settings } = useGlobalSettings();
    const {
        products, getProductsWithStockForBranch, branches, cajas, clients, addSale, processReturn,
        heldCarts, holdCurrentCart, recallCart, deleteHeldCart, estimates, addLayaway, projects, addProject, setEstimates, setProjects, addEstimate, sales, setSales
    } = useData();
    const { currentUser, login, allUsers, logout, loginWithPin } = useAuth();
    const [barcodeInput, setBarcodeInput] = useState('');
    const productSearchRef = useRef<HTMLInputElement>(null);
    const barcodeInputRef = useRef<HTMLInputElement>(null);

    // Shift and security states
    const [isPosAuthenticated, setIsPosAuthenticated] = useState(false);
    const [shiftState, setShiftState] = useState<{ active: boolean; openingAmount: number; startTime: string; payouts: {amount: number; reason: string}[] } | null>(null);
    
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [selectedBranchId, setSelectedBranchId] = useState<string>('');
    const [selectedCajaId, setSelectedCajaId] = useState<string>('');
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [posError, setPosError] = useState<string | null>(null);
    const [generalDiscount, setGeneralDiscount] = useState<{ type: 'percentage' | 'fixed'; value: number } | null>(null);

    
    const [branchProducts, setBranchProducts] = useState<Product[]>([]);
    
    // Modal states
    type ActiveModal = 'auth' | 'openShift' | 'deleteItemAuth' | 'endShift' | 'payout' | 'clientSearch' | 'createClient' | 'createProject' | 'heldCarts' | 'clientEstimates' | 'layaway' | 'userSwitch' | 'payment' | 'discountAuth' | 'return' | null;
    const [activeModal, setActiveModal] = useState<ActiveModal>(null);
    
    const [itemToDelete, setItemToDelete] = useState<CartItem | null>(null);
    const [initialPaymentMethod, setInitialPaymentMethod] = useState<PaymentMethod>('Efectivo');
    const [discountTarget, setDiscountTarget] = useState<'general' | string | null>(null); // 'general' or product ID

    const posUsers = useMemo(() => {
        return allUsers.filter(u => (u.role === UserRole.MANAGER || u.role === UserRole.EMPLOYEE) && u.permissions?.accessPOSCashier);
    }, [allUsers]);

    const clientProjects = useMemo(() => {
        if (!selectedClient) return [];
        return projects.filter(p => p.clientId === selectedClient.id);
    }, [selectedClient, projects]);

    const currentDiscountForModal = useMemo(() => {
        if (discountTarget === 'general') return generalDiscount;
        if (discountTarget) return cart.find(i => i.id === discountTarget)?.discount || null;
        return null;
    }, [discountTarget, generalDiscount, cart]);

    // Check auth on mount
    useEffect(() => {
      if (!isPosAuthenticated) {
        setActiveModal('auth');
      }
    }, [isPosAuthenticated]);

    // Check shift state after auth
    useEffect(() => {
      if (isPosAuthenticated) {
        const savedShift = localStorage.getItem(`posShift_${currentUser?.id}_${selectedCajaId}`);
        if (savedShift) {
          setShiftState(JSON.parse(savedShift));
        } else if (currentUser?.role === UserRole.MANAGER) {
            // Auto-start shift for admins with 0 opening amount
            handleStartShift(0);
        } else {
           setActiveModal('openShift');
        }
      }
    }, [isPosAuthenticated, currentUser, selectedCajaId]);

    // Persist shift state
    useEffect(() => {
      if (shiftState && currentUser && selectedCajaId) {
        localStorage.setItem(`posShift_${currentUser.id}_${selectedCajaId}`, JSON.stringify(shiftState));
      }
    }, [shiftState, currentUser, selectedCajaId]);


    const handleInitialAuth = async (password: string): Promise<boolean> => {
        if (currentUser && (allUsers.find(u => u.id === currentUser.id)?.password === password)) {
            setIsPosAuthenticated(true);
            setActiveModal(null);
            return true;
        }
        return false;
    };
    
    const handleStartShift = (amount: number) => {
        setShiftState({
            active: true,
            openingAmount: amount,
            startTime: new Date().toISOString(),
            payouts: []
        });
        setActiveModal(null);
    };

    const handleSwitchUser = async (employee: User, pass: string): Promise<boolean> => {
        const success = await login(employee.email, pass);
        if(success) {
            // Reset POS auth and shift state for the new user
            setIsPosAuthenticated(false);
            setShiftState(null);
            localStorage.removeItem(`posShift_${employee.id}_${selectedCajaId}`);
        }
        return success;
    };

    const handleSwitchUserWithPin = async (userId: string, pin: string): Promise<boolean> => {
        const success = await loginWithPin(userId, pin);
        if (success) {
            setIsPosAuthenticated(false);
            setShiftState(null);
            localStorage.removeItem(`posShift_${userId}_${selectedCajaId}`);
        }
        return success;
    };

    useEffect(() => {
        const firstActiveBranch = branches.find(b => b.isActive);
        if (firstActiveBranch) {
            setSelectedBranchId(firstActiveBranch.id);
            const firstCajaForBranch = cajas.find(c => c.branchId === firstActiveBranch.id && c.isActive);
            if (firstCajaForBranch) {
                setSelectedCajaId(firstCajaForBranch.id);
            }
        }
    }, [branches, cajas]);

    useEffect(() => {
        if (selectedBranchId) {
            setBranchProducts(getProductsWithStockForBranch(selectedBranchId));
        }
    }, [selectedBranchId, getProductsWithStockForBranch, products]);

    // Set default client if none selected
    useEffect(() => {
        if (!selectedClient && clients.length > 0) {
            const defaultClient = clients.find(c => c.id === DEFAULT_CLIENT_ID);
            if (defaultClient) {
                setSelectedClient(defaultClient);
            }
        }
    }, [selectedClient, clients]);

    // Load cart from localStorage on mount/caja change
    useEffect(() => {
        if (currentUser && selectedCajaId) {
            const savedCart = localStorage.getItem(`posCart_${currentUser.id}_${selectedCajaId}`);
            if (savedCart) {
                try {
                    const { cart: sCart, clientId: sClientId, projectId: sProjectId, discount: sDiscount } = JSON.parse(savedCart);
                    if (sCart) setCart(sCart);
                    if (sClientId) {
                        const client = clients.find(c => c.id === sClientId);
                        if (client) setSelectedClient(client);
                    }
                    if (sProjectId) setSelectedProjectId(sProjectId);
                    if (sDiscount) setGeneralDiscount(sDiscount);
                } catch (e) {
                    console.error("Error loading saved cart", e);
                }
            }
        }
    }, [currentUser, selectedCajaId, clients]);

    // Persist cart to localStorage on changes
    useEffect(() => {
        if (currentUser && selectedCajaId) {
            const cartData = {
                cart,
                clientId: selectedClient?.id,
                projectId: selectedProjectId,
                discount: generalDiscount
            };
            localStorage.setItem(`posCart_${currentUser.id}_${selectedCajaId}`, JSON.stringify(cartData));
        }
    }, [cart, selectedClient, selectedProjectId, generalDiscount, currentUser, selectedCajaId]);

    const { subtotal, globalDiscountAmount, tax, total } = useMemo(() => {
        let sub = 0;
        const selectedCaja = cajas.find(c => c.id === selectedCajaId);
        const applyIVU = selectedCaja?.applyIVU ?? true;

        // Calculate Subtotal based on Item Price (Item Price - Item Discount)
        cart.forEach(item => {
            let itemPrice = item.unitPrice;
            if (item.discount) {
                if (item.discount.type === 'percentage') {
                    itemPrice = itemPrice * (1 - item.discount.value / 100);
                } else { // fixed
                    itemPrice = Math.max(0, itemPrice - item.discount.value);
                }
            }
            sub += itemPrice * item.quantity;
        });

        // Calculate Global Discount Amount
        let discountAmt = 0;
        if (generalDiscount) {
            if (generalDiscount.type === 'percentage') {
                discountAmt = sub * (generalDiscount.value / 100);
            } else {
                discountAmt = Math.min(sub, generalDiscount.value);
            }
        }

        const netSubtotal = Math.max(0, sub - discountAmt);

        let tx = 0;
         if (applyIVU) {
            cart.forEach(item => {
                // Tax is calculated on the discounted price
                let itemPrice = item.unitPrice;
                 if (item.discount) {
                    if (item.discount.type === 'percentage') {
                        itemPrice = itemPrice * (1 - item.discount.value / 100);
                    } else { // fixed
                        itemPrice = Math.max(0, itemPrice - item.discount.value);
                    }
                }

                let lineTotal = itemPrice * item.quantity;
                
                // Distribute global discount proportionally to calculate tax correctly per item
                let taxableAmount = lineTotal;
                if (sub > 0 && discountAmt > 0) {
                    const proportion = lineTotal / sub;
                    taxableAmount = lineTotal - (discountAmt * proportion);
                }
                
                if (!(currentUser?.isEmergencyOrderActive && item.isEmergencyTaxExempt)) {
                    const rate = item.ivuRate ?? (settings.defaultTaxRate * 100);
                    tx += taxableAmount * (rate / 100);
                }
            });
        }
        
        return { subtotal: sub, globalDiscountAmount: discountAmt, tax: tx, total: netSubtotal + tx };
    }, [cart, selectedCajaId, cajas, currentUser?.isEmergencyOrderActive, generalDiscount, settings.defaultTaxRate]);

    const addProductToCart = (product: Product) => {
        setPosError(null);
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { ...product, quantity: 1 }];
        });
        if (barcodeInputRef.current) {
            barcodeInputRef.current.focus();
        } else if (productSearchRef.current) {
            productSearchRef.current.focus();
        }
    };

    const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const barcode = barcodeInput.trim();
            if (barcode) {
                const product = branchProducts.find(p => 
                    p.barcode13Digits === barcode || 
                    p.barcode2 === barcode ||
                    (p.skus && p.skus.includes(barcode))
                );
                
                if (product) {
                    addProductToCart(product);
                    setBarcodeInput('');
                } else {
                    setBarcodeInput('');
                }
            }
        }
    };
    
    const updateQuantity = (productId: string, quantity: number) => {
        setPosError(null);
        setCart(prev => {
            if (quantity <= 0) return prev.filter(item => item.id !== productId);
            return prev.map(item => item.id === productId ? { ...item, quantity } : item);
        });
    };
    
    const handleRequestItemDelete = (item: CartItem) => {
        setItemToDelete(item);
        setActiveModal('deleteItemAuth');
    };

    const handleConfirmItemDelete = async (password: string): Promise<boolean> => {
        if (currentUser && (allUsers.find(u => u.id === currentUser.id)?.password === password) && itemToDelete) {
            updateQuantity(itemToDelete.id, 0);
            setActiveModal(null);
            setItemToDelete(null);
            return true;
        }
        return false;
    };

    const handleOpenDiscountModal = (target: 'general' | string) => {
        setDiscountTarget(target);
        setActiveModal('discountAuth');
    };

    const handleApplyDiscount = (discount: { type: 'percentage' | 'fixed'; value: number }) => {
        if (discountTarget === 'general') {
            setGeneralDiscount(discount);
        } else if (discountTarget) {
            setCart(prevCart => prevCart.map(item => 
                item.id === discountTarget ? { ...item, discount } : item
            ));
        }
        setDiscountTarget(null);
    };

    const clearCart = () => {
        setCart([]);
        const defaultClient = clients.find(c => c.id === DEFAULT_CLIENT_ID);
        setSelectedClient(defaultClient || null);
        setSelectedProjectId(null);
        setGeneralDiscount(null);
        if (barcodeInputRef.current) {
            barcodeInputRef.current.focus();
        } else if (productSearchRef.current) {
            productSearchRef.current.focus();
        }
        setPosError(null);
        
        // Clear persisted cart
        if (currentUser && selectedCajaId) {
            localStorage.removeItem(`posCart_${currentUser.id}_${selectedCajaId}`);
        }
    };

    const handleOpenPaymentModal = (method: PaymentMethod) => {
        setPosError(null);
        if (cart.length === 0) {
            setPosError("Debe agregar productos al carrito antes de procesar el pago.");
            return;
        }
        if (!selectedClient) {
            setPosError("Debe seleccionar un cliente para la venta antes de procesar el pago.");
            return;
        }
        setInitialPaymentMethod(method);
        setActiveModal('payment');
    };

    const handleFinalizeSale = (payments: { method: string; amount: number }[]) => {
         if (cart.length === 0 || !currentUser || !selectedCajaId || !selectedBranchId) {
            alert("No se puede completar la venta. Carrito vacío o falta información de empleado/caja/sucursal.");
            return;
        }
        
        const paymentMethodString = payments.length > 1 
            ? 'Múltiple' 
            : payments[0]?.method || 'Desconocido';

        // Identify if current Caja is External
        const currentCaja = cajas.find(c => c.id === selectedCajaId);
        const isExternalSale = currentCaja?.isExternal || false;

        addSale({
            items: cart,
            totalAmount: total,
            paymentMethod: paymentMethodString,
            payments: payments, // Pass the breakdown of payments
            clientId: selectedClient?.id,
            projectId: selectedProjectId || undefined,
            cajaId: selectedCajaId,
            employeeId: currentUser.id,
            isExternal: isExternalSale, // Mark sales from external registers
        }, selectedBranchId);

        setActiveModal(null);
        clearCart();
    };

    const handleRecallCart = (cartId: string) => {
        const recalledCart = recallCart(cartId);
        if (recalledCart) {
            setCart(recalledCart.items);
            if (recalledCart.clientId) {
                const client = clients.find(c => c.id === recalledCart.clientId);
                if (client) {
                    setSelectedClient(client);
                } else {
                    // If client not found, fallback to default or null
                    const defaultClient = clients.find(c => c.id === DEFAULT_CLIENT_ID);
                    setSelectedClient(defaultClient || null);
                }
            } else {
                // If no clientId in recalled cart, reset to default
                const defaultClient = clients.find(c => c.id === DEFAULT_CLIENT_ID);
                setSelectedClient(defaultClient || null);
            }
            setPosError(null);
        }
        setActiveModal(null);
    };

    const handleLoadEstimatesToCart = (items: CartItem[], estimateIds: string[]) => {
        if (cart.length > 0) {
            if (!window.confirm("Cargar los estimados reemplazará los artículos en el carrito actual. ¿Desea continuar?")) {
                return;
            }
        }
        setCart(items);
        setPosError(null);
        setActiveModal(null);
    };

    const handleCreateEstimateFromCart = () => {
        if (!currentUser || !selectedClient || cart.length === 0 || !selectedBranchId) {
            alert("Faltan datos para crear el estimado (cliente, productos, empleado o sucursal).");
            return;
        }

        const newEstimateData: Omit<Estimate, 'id'> = {
            date: new Date().toISOString(),
            clientId: selectedClient.id,
            items: cart,
            totalAmount: total,
            status: EstimateStatus.BORRADOR,
            notes: `Generado desde Punto de Venta (POS).`,
            employeeId: currentUser.id,
            branchId: selectedBranchId
        };
        
        addEstimate(newEstimateData);
        
        alert(`Estimado creado exitosamente para ${selectedClient.name}.`);
        clearCart();
        setActiveModal(null);
    };
    
    const handleAddPayout = (amount: number, reason: string) => {
        if (!shiftState) return;
        setShiftState(prev => ({
            ...prev!,
            payouts: [...prev!.payouts, { amount, reason }]
        }));
    };

    const shiftReportData = useMemo(() => {
        if (!shiftState) return { totalSales: 0, cashSales: 0, cardSales: 0, otherSales: 0, startingCash: 0, payouts: 0, expectedCash: 0 };

        const shiftSales = sales.filter(s => new Date(s.date) >= new Date(shiftState.startTime!));
        
        const totalSales = shiftSales.reduce((sum, s) => sum + s.totalAmount, 0);
        const cashSales = shiftSales.filter(s => s.paymentMethod === 'Efectivo').reduce((sum, s) => sum + s.totalAmount, 0);
        const cardSales = shiftSales.filter(s => s.paymentMethod === 'Tarjeta').reduce((sum, s) => sum + s.totalAmount, 0);
        const otherSales = totalSales - cashSales - cardSales;
        const payouts = shiftState.payouts.reduce((sum, p) => sum + p.amount, 0);
        const expectedCash = shiftState.openingAmount + cashSales - payouts;

        return { totalSales, cashSales, cardSales, otherSales, startingCash: shiftState.openingAmount, payouts, expectedCash };
    }, [shiftState, sales]);

    const handleEndShift = () => {
        // Here you would typically archive the shift report
        console.log("Shift Ended. Report:", shiftReportData);
        if (currentUser && selectedCajaId) {
            localStorage.removeItem(`posShift_${currentUser.id}_${selectedCajaId}`);
        }
        setShiftState(null);
        setActiveModal(null); // Close any active modals
    
        if (currentUser?.role === UserRole.MANAGER) {
            navigate('/');
        } else if (currentUser?.role === UserRole.EMPLOYEE) {
            logout(); // AuthProvider will handle redirecting to /login
        } else {
            // Fallback for any other case, though unlikely in POS
            logout();
        }
    };
    
    const handleProcessReturnFromModal = (originalSaleId: string, itemsToReturn: ReturnItemPayload[], reason: string, adminPassword: string) => {
        const admin = allUsers.find(u => u.role === UserRole.MANAGER && u.password === adminPassword);
        if (!admin) {
            alert('Contraseña de administrador incorrecta. Devolución no autorizada.');
            return;
        }

        const originalSale = sales.find(s => s.id === originalSaleId);
        if (!originalSale) {
            alert('Venta original no encontrada.');
            return;
        }
        if (!currentUser) {
            alert('Usuario no encontrado.');
            return;
        }

        processReturn(originalSale, itemsToReturn, currentUser.id, selectedCajaId, selectedBranchId, reason);
        setActiveModal(null);
    };


    const isShiftActive = isPosAuthenticated && shiftState?.active;
    
    const currentCajaName = cajas.find(c => c.id === selectedCajaId)?.name || '0008';
    const isCurrentCajaExternal = cajas.find(c => c.id === selectedCajaId)?.isExternal;
    const isCurrentCajaApplyIVU = cajas.find(c => c.id === selectedCajaId)?.applyIVU ?? true;

    const actionButtons = [
        { text: t('pos.clear_cart'), icon: <XMarkIcon />, color: 'bg-[#C62828]', onClick: clearCart },
        { text: t('pos.hold_cart'), icon: <ArchiveBoxIcon />, color: 'bg-[#F9A825]', onClick: () => setActiveModal('heldCarts') },
        { text: t('pos.client'), icon: <UserPlusIcon />, color: 'bg-[#EF6C00]', onClick: () => setActiveModal('clientSearch') },
        { text: t('pos.payout'), icon: <BanknotesIcon/>, color: 'bg-[#8E24AA]', onClick: () => setActiveModal('payout')},
        { text: t('pos.return'), icon: <ArrowUturnLeftIcon />, color: POS_BUTTON_CYAN_CLASSES, onClick: () => setActiveModal('return') },
        { text: t('pos.estimate'), icon: <ClipboardDocumentListIcon />, color: 'bg-[#00897B]', onClick: () => selectedClient && setActiveModal('clientEstimates'), disabled: !selectedClient },
        { text: t('pos.layaway'), icon: <ArchiveBoxIcon />, color: 'bg-[#00ACC1]', onClick: () => setActiveModal('layaway'), disabled: cart.length === 0 || !selectedClient },
        { text: t('pos.reprint'), icon: <PrinterIcon />, color: 'bg-[#546E7A]', onClick: () => alert('Función "Reimprimir" no implementada.') },
        { 
            text: currentUser?.role === UserRole.MANAGER ? 'Salir' : t('pos.close_shift'), 
            icon: <ExitIcon />, 
            color: 'bg-[#B71C1C]', 
            onClick: currentUser?.role === UserRole.MANAGER ? () => navigate('/') : () => setActiveModal('endShift')
        },
        { text: t('pos.user'), icon: <UserKeyIcon />, color: 'bg-[#3949AB]', onClick: () => setActiveModal('userSwitch') },
    ];
    
    // UI Render
    if (!isPosAuthenticated) {
      return <POSActionAuthModal isOpen={true} onClose={() => navigate('/')} onConfirm={handleInitialAuth} title="Acceso a Caja" message="Por favor ingrese su contraseña para acceder al punto de venta." />;
    }
    
    if (!shiftState?.active) {
        return (
            <Modal isOpen={true} onClose={() => navigate('/')} title="Abrir Turno de Caja" size="sm">
                <form onSubmit={(e) => { e.preventDefault(); handleStartShift(parseFloat(e.currentTarget.openingAmount.value)); }} className="space-y-4">
                    <p className="text-sm">Ingrese el monto inicial de efectivo en la caja para comenzar el turno.</p>
                    <div>
                        <label className="block text-sm font-medium">Monto de Apertura</label>
                        <input type="number" name="openingAmount" className={inputFormStyle} required autoFocus step="0.01" min="0" />
                    </div>
                    <div className="flex justify-end space-x-2">
                        <button type="button" onClick={() => navigate('/')} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
                        <button type="submit" className={BUTTON_SECONDARY_SM_CLASSES}>Iniciar Turno</button>
                    </div>
                </form>
            </Modal>
        );
    }
    
    return (
        <div className="flex flex-col h-screen bg-gray-100 dark:bg-neutral-900 font-sans">
            <header className={`flex items-center justify-between px-2 sm:px-4 py-1 flex-shrink-0 shadow-md ${isCurrentCajaExternal ? 'bg-amber-600' : 'bg-[#00897B]'}`}>
                <div className="flex items-center space-x-2 sm:space-x-3">
                    <KeyIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white opacity-75" />
                    <div className="max-w-[120px] sm:max-w-none">
                        <h1 className="text-sm sm:text-lg font-bold text-white leading-tight truncate">{t('pos.title')} ({currentCajaName})</h1>
                        <p className="text-[10px] sm:text-sm text-white flex items-center opacity-90 truncate">
                            Sucursal Central 
                            {isCurrentCajaExternal && <span className="ml-1 px-1 py-0.5 bg-black/20 rounded text-[8px] font-bold border border-white/30">EXTERNA</span>}
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-2 sm:space-x-6">
                    <div className="hidden xs:block">
                        <LiveClock />
                    </div>
                    
                    <div className="flex items-center space-x-2 sm:space-x-3 border-l border-white/20 pl-2 sm:pl-6">
                        <div className="text-right hidden lg:block">
                            <p className="text-[10px] uppercase tracking-wider text-white/70 font-bold leading-none mb-1">Cajero</p>
                            <p className="text-sm font-bold text-white leading-tight">{currentUser?.name}</p>
                        </div>
                        <div className="relative">
                            <img 
                                src={currentUser?.profilePictureUrl || `https://ui-avatars.com/api/?name=${currentUser?.name}+${currentUser?.lastName}&background=0D9488&color=fff`} 
                                alt="User" 
                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-white/50 object-cover shadow-sm"
                                referrerPolicy="no-referrer"
                            />
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[#00897B] rounded-full"></div>
                        </div>
                    </div>

                    <button className="bg-[#F9A825] hover:bg-amber-600 text-white font-bold py-1 px-1.5 sm:py-2 sm:px-4 rounded-md flex items-center space-x-1 sm:space-x-2 text-[9px] sm:text-sm shadow-sm transition-all active:scale-95">
                        <ExclamationTriangleIcon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                        <span className="hidden sm:inline">{t('pos.emergency_mode')}: OFF</span>
                        <span className="sm:hidden">OFF</span>
                    </button>
                </div>
            </header>

            <nav className="bg-gray-200 dark:bg-neutral-700 p-1 sm:p-1.5 grid grid-cols-5 sm:flex sm:items-stretch gap-1 sm:gap-1.5 flex-shrink-0 shadow-sm w-full">
                {actionButtons.map(btn => <ActionButton key={btn.text} {...btn} />)}
            </nav>

            <main className="flex-grow p-3 overflow-hidden">
                <div className="bg-white dark:bg-neutral-800 h-full rounded-lg shadow-lg flex flex-col text-neutral-800 dark:text-neutral-100">
                    <div className="p-3 border-b dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                        {!selectedClient ? (
                             <div className="flex items-center justify-center">
                                <button onClick={() => setActiveModal('clientSearch')} className="flex items-center justify-center w-full py-2 px-4 border-2 border-primary bg-primary/5 rounded-md text-primary hover:bg-primary/10 transition-colors text-lg font-medium">
                                    <UserPlusIcon className="w-6 h-6 mr-2" /> {t('pos.client_search')}
                                </button>
                            </div>
                        ) : (
                            <div>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-xl text-primary">{selectedClient.name} {selectedClient.lastName}</p>
                                        <p className="text-base text-neutral-500">{selectedClient.email} | {selectedClient.phone}</p>
                                        {selectedClient.companyName && <p className="text-base text-neutral-500">{selectedClient.companyName}</p>}
                                    </div>
                                    <div className="flex space-x-2 flex-shrink-0">
                                        <button onClick={() => setActiveModal('clientSearch')} className="text-[10px] sm:text-xs py-1 px-2 rounded bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900">Cambiar</button>
                                        <button onClick={() => { setSelectedClient(null); setSelectedProjectId(null); setPosError(null); }} className="text-[10px] sm:text-xs py-1 px-2 rounded bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900">Quitar</button>
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <label className="flex items-center text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1">
                                        <BriefcaseIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" /> Asociar a Proyecto:
                                    </label>
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                        <select value={selectedProjectId || ''} onChange={(e) => setSelectedProjectId(e.target.value || null)} className="flex-grow text-sm sm:text-base px-3 py-1.5 sm:py-2 border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 rounded-md shadow-sm focus:ring-primary focus:border-primary">
                                            <option value="">Venta General (Sin Proyecto)</option>
                                            {clientProjects.map(proj => (<option key={proj.id} value={proj.id}>{proj.name}</option>))}
                                        </select>
                                        <button type="button" onClick={() => setActiveModal('createProject')} className="flex items-center justify-center flex-shrink-0 bg-green-600 hover:bg-green-700 text-white font-semibold text-xs sm:text-base py-1.5 sm:py-2 px-3 sm:px-3.5 rounded-md shadow-sm transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-green-400 dark:focus:ring-offset-neutral-800" title="Crear un nuevo proyecto para este cliente">
                                            <PlusIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5"/> {t('pos.new_project')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="p-3 border-b dark:border-neutral-700 space-y-3">
                        {/* Barcode Scanner Input */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <svg className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                </svg>
                            </div>
                            <input
                                ref={barcodeInputRef}
                                type="text"
                                value={barcodeInput}
                                onChange={(e) => setBarcodeInput(e.target.value)}
                                onKeyDown={handleBarcodeScan}
                                placeholder={t('pos.barcode_placeholder')}
                                disabled={!isShiftActive}
                                className="block w-full pl-10 pr-3 py-2 border border-neutral-300 rounded-md leading-5 bg-white dark:bg-neutral-700 dark:border-neutral-600 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm h-12 font-mono"
                                autoFocus
                            />
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <span className="text-[10px] text-neutral-400 uppercase font-bold">{t('pos.barcode_scan')}</span>
                            </div>
                        </div>

                        <ProductAutocomplete products={branchProducts} onProductSelect={addProductToCart} inputRef={productSearchRef} placeholder={t('pos.search_placeholder')} />
                    </div>
                    <div className="flex-grow overflow-y-auto">
                        {cart.length === 0 ? (
                            <div className="flex items-center justify-center h-full"><p className="text-neutral-400 dark:text-neutral-500">{t('pos.empty_cart')}</p></div>
                        ) : (
                            <div className="divide-y divide-gray-200 dark:divide-neutral-700">
                                {cart.map(item => (
                                    <div key={item.id} className="flex flex-col sm:grid sm:grid-cols-12 items-start sm:items-center p-2 sm:p-3 gap-2 sm:gap-3">
                                        <div className="flex w-full sm:col-span-6 items-center gap-3">
                                            <div className="flex-shrink-0">
                                                <img 
                                                    src={item.imageUrl || 'https://picsum.photos/seed/defaultprod/100/100'} 
                                                    alt={item.name} 
                                                    className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-md shadow-sm" 
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold leading-tight text-sm sm:text-base truncate">{item.name}</p>
                                                <p className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 truncate">Ref: {item.skus?.[0] || 'N/A'}</p>
                                                
                                                <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
                                                    {item.discount ? (
                                                        <>
                                                            <span className="text-xs text-gray-400 line-through">${item.unitPrice.toFixed(2)}</span>
                                                            <span className="text-sm sm:text-base font-bold text-neutral-800 dark:text-neutral-100">
                                                                ${ (item.discount.type === 'percentage' 
                                                                    ? item.unitPrice * (1 - item.discount.value / 100) 
                                                                    : item.unitPrice - item.discount.value).toFixed(2) }
                                                            </span>
                                                            <span className="text-[10px] font-bold px-1 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border border-green-200 dark:border-green-700 whitespace-nowrap">
                                                                -{item.discount.type === 'percentage' ? `${item.discount.value}%` : `$${item.discount.value.toFixed(2)}`}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <span className="text-xs sm:text-base text-neutral-500">${item.unitPrice.toFixed(2)} /u</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex w-full sm:col-span-6 items-center justify-between sm:justify-end gap-3">
                                            <div className="flex items-center">
                                                <input 
                                                    type="number" 
                                                    value={item.quantity} 
                                                    onChange={e => updateQuantity(item.id, parseInt(e.target.value) || 0)} 
                                                    className="w-16 sm:w-20 text-center text-base sm:text-xl font-semibold bg-gray-100 dark:bg-neutral-900 rounded-lg border border-gray-300 dark:border-neutral-600 p-1 sm:p-2 focus:ring-primary focus:border-primary"
                                                    aria-label={`Cantidad para ${item.name}`}
                                                />
                                            </div>
                                            <div className="text-right font-semibold text-base sm:text-lg min-w-[80px]">
                                                ${( (item.discount 
                                                    ? (item.discount.type === 'percentage' ? item.unitPrice * (1 - item.discount.value/100) : item.unitPrice - item.discount.value) 
                                                    : item.unitPrice) * item.quantity).toFixed(2)}
                                            </div>
                                            <div className="flex items-center justify-end gap-x-0.5 sm:gap-x-1">
                                                <button 
                                                    onClick={() => handleOpenDiscountModal(item.id)} 
                                                    className="p-1.5 sm:p-2 rounded-full text-blue-500 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors" 
                                                    title="Aplicar/Editar descuento"
                                                >
                                                    <TagIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                                                </button>
                                                <button 
                                                    onClick={() => handleRequestItemDelete(item)} 
                                                    className="p-1.5 sm:p-2 rounded-full text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors" 
                                                    title="Eliminar producto"
                                                >
                                                    <TrashIconMini className="w-5 h-5 sm:w-6 sm:h-6" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="p-4 border-t dark:border-neutral-700 mt-auto text-right space-y-1">
                        <div className="flex justify-between items-center pb-2">
                            <button 
                                onClick={() => handleOpenDiscountModal('general')} 
                                className={`flex items-center px-3 py-1.5 rounded-md transition-colors ${generalDiscount 
                                    ? 'bg-orange-100 text-orange-800 hover:bg-orange-200 border border-orange-200' 
                                    : 'text-blue-600 hover:bg-blue-50'}`}
                            >
                                <TagIcon className="w-4 h-4 mr-2" />
                                {generalDiscount ? (
                                    <span className="font-semibold">
                                        Descuento General Activo: {generalDiscount.type === 'percentage' ? `${generalDiscount.value}%` : `$${generalDiscount.value}`}
                                        <span className="ml-2 text-xs opacity-75">(Click para editar)</span>
                                    </span>
                                ) : (
                                    'Aplicar Descuento General'
                                )}
                            </button>
                            <div className="flex justify-end items-center gap-2 sm:gap-4 text-sm sm:text-lg">
                                <span className="text-neutral-500">{t('pos.subtotal')}:</span>
                                <span className="font-medium w-24 sm:w-32">${subtotal.toFixed(2)}</span>
                            </div>
                        </div>
                        
                        {globalDiscountAmount > 0 && (
                            <div className="flex justify-end items-center gap-2 sm:gap-4 text-sm sm:text-lg text-red-600 dark:text-red-400">
                                <span>Descuento Global:</span>
                                <span className="font-medium w-24 sm:w-32">-${globalDiscountAmount.toFixed(2)}</span>
                            </div>
                        )}

                         <div className="flex justify-end items-center gap-2 sm:gap-4 text-sm sm:text-lg">
                            <span className="text-neutral-500">{t('pos.tax')}:</span>
                            <span className="font-medium w-24 sm:w-32">${tax.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-end items-center gap-2 sm:gap-4 text-lg sm:text-2xl font-bold pt-2 border-t dark:border-neutral-600">
                            <span className="text-[#00897B]">{t('pos.total')}:</span>
                            <span className="w-24 sm:w-32 text-[#00897B]">${total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </main>
            <footer className="bg-gray-100 dark:bg-neutral-900 p-1 sm:p-1.5 flex-shrink-0 relative">
                 {posError && (<div className="absolute bottom-full left-0 right-0 p-2 bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-400 text-center text-xs sm:text-sm font-medium" role="alert">{posError}</div>)}
                <div className="grid grid-cols-3 sm:flex sm:items-center gap-1 sm:gap-1.5 w-full">
                    <PaymentButton text="Efectivo" icon={<BanknotesIcon/>} color="bg-[#1E88E5]" onClick={() => handleOpenPaymentModal('Efectivo')} />
                    <PaymentButton text="Tarjeta" icon={<CreditCardIcon/>} color="bg-[#1E88E5]" onClick={() => handleOpenPaymentModal('Tarjeta')} />
                    <PaymentButton text="ATH Móvil" icon={<AthMovilIcon/>} color="bg-[#D81B60]" onClick={() => handleOpenPaymentModal('ATH Móvil')} />
                    <PaymentButton text="Crédito C." icon={null} color="bg-[#039BE5]" onClick={() => handleOpenPaymentModal('Crédito C.')} />
                    <PaymentButton text="Cheque" icon={<DocumentTextIcon />} color="bg-[#00897B]" onClick={() => handleOpenPaymentModal('Cheque')} />
                    <PaymentButton text="Factura" icon={<ClipboardDocumentListIcon />} color="bg-[#7CB342]" onClick={() => handleOpenPaymentModal('Factura')} />
                </div>
            </footer>
            
            {/* MODALS */}
            <ClientSearchModal isOpen={activeModal === 'clientSearch'} onClose={() => setActiveModal(null)} clients={clients} onClientSelect={(client) => { setSelectedClient(client); setActiveModal(null); setSelectedProjectId(null); setPosError(null); }} onOpenCreateClient={() => setActiveModal('createClient')} />
            <ClientFormModal isOpen={activeModal === 'createClient'} onClose={(client) => {setActiveModal(null); if(client) setSelectedClient(client);}} client={null} />
            <POSProjectFormModal isOpen={activeModal === 'createProject'} onClose={() => setActiveModal(null)} clientId={selectedClient?.id || ''} onProjectCreated={(newProject) => { setSelectedProjectId(newProject.id); setActiveModal(null); }} />
            <HeldCartsModal isOpen={activeModal === 'heldCarts'} onClose={() => setActiveModal(null)} onHoldCart={() => { if (cart.length > 0) { holdCurrentCart(cart, `Venta para ${selectedClient?.name || 'Contado'}`, selectedClient?.id); clearCart(); return true; } return false; }} onRecallCart={handleRecallCart} onDeleteHeldCart={deleteHeldCart} heldCarts={heldCarts} />
            <ClientEstimatesModal isOpen={activeModal === 'clientEstimates'} onClose={() => setActiveModal(null)} client={selectedClient} onLoadItems={handleLoadEstimatesToCart} onCreateFromCart={handleCreateEstimateFromCart} isCartEmpty={cart.length === 0} />
            <CreateLayawayModal isOpen={activeModal === 'layaway'} onClose={() => setActiveModal(null)} cart={cart} total={total} selectedClient={selectedClient} onOpenClientSearch={() => setActiveModal('clientSearch')} onCreateLayaway={(payment, notes) => { if (!currentUser) return; addLayaway({ items: cart, totalAmount: total, clientId: selectedClient!.id, status: LayawayStatus.ACTIVO, branchId: selectedBranchId, employeeId: currentUser.id, notes }, payment); clearCart(); setActiveModal(null); }} />
            <UserSwitchModal isOpen={activeModal === 'userSwitch'} onClose={() => setActiveModal(null)} employees={posUsers} onSwitchUser={handleSwitchUser} onSwitchUserWithPin={handleSwitchUserWithPin} />
            <PaymentModal isOpen={activeModal === 'payment'} onClose={() => setActiveModal(null)} totalAmount={total} initialMethod={initialPaymentMethod} onFinalizeSale={handleFinalizeSale} />
            <POSActionAuthModal isOpen={activeModal === 'deleteItemAuth'} onClose={() => setActiveModal(null)} onConfirm={handleConfirmItemDelete} title="Confirmar Eliminación" message="Ingrese su contraseña para eliminar el artículo del carrito." />
            <EndShiftModal isOpen={activeModal === 'endShift'} onClose={() => setActiveModal(null)} onConfirm={handleEndShift} shiftData={shiftReportData} />
            <PayoutModal isOpen={activeModal === 'payout'} onClose={() => setActiveModal(null)} onConfirm={handleAddPayout} currentCashInDrawer={(shiftState?.openingAmount || 0) + shiftReportData.cashSales - shiftReportData.payouts} />
            <DiscountAuthModal 
                isOpen={activeModal === 'discountAuth'} 
                onClose={() => setActiveModal(null)} 
                onApply={handleApplyDiscount} 
                currentDiscount={currentDiscountForModal}
            />
            <ReturnModal isOpen={activeModal === 'return'} onClose={() => setActiveModal(null)} onProcessReturn={handleProcessReturnFromModal} />
        </div>
    );
};