import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalSettings, useTranslation } from '../../contexts/GlobalSettingsContext'; // Imported useTranslation
import { Product, CartItem, Client, Branch, Caja, HeldCart, Estimate, LayawayStatus, User, UserRole, Employee, Project, EstimateStatus, Sale, ProductVariation } from '../../types';
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
    CameraIcon,
} from '../../components/icons';
import { ProductAutocomplete } from '../../components/ui/ProductAutocomplete';
import { ReceiptModal, buildReceiptHTML, type ReceiptSale } from '../../components/pos/ReceiptModal';
import { DailyCloseModal } from '../../components/pos/DailyCloseModal';
import { ReprintModal } from '../../components/pos/ReprintModal';
import { PunchModal } from '../../components/pos/PunchModal';
import { productsService } from '../../services/products';

// Lazy: ZXing solo se descarga al abrir la cámara (no infla el bundle inicial del POS).
const CameraScanModal = lazy(() =>
    import('../../components/ui/CameraScanModal').then(m => ({ default: m.CameraScanModal }))
);
import { ClientSearchModal } from '../../components/ClientSearchModal';
import { ClientFormModal } from '../pm/ClientFormModal';
import { HeldCartsModal } from '../../components/ui/HeldCartsModal';
import { ClientEstimatesModal } from '../../components/ui/ClientEstimatesModal';
import { CreateLayawayModal } from '../../components/forms/CreateLayawayModal';
import { UserSwitchModal } from '../../components/ui/UserSwitchModal';
import { POSProjectFormModal } from './POSProjectFormModal';
import { BUTTON_SECONDARY_SM_CLASSES, inputFormStyle, POS_BUTTON_CYAN_CLASSES, BUTTON_PRIMARY_SM_CLASSES, DEFAULT_CLIENT_ID } from '../../constants';
import { PaymentModal, PaymentMethod } from '../../components/forms/PaymentModal';
import { Modal, ConfirmationModal } from '../../components/Modal';
import { EndShiftModal } from '../../components/ui/EndShiftModal';
import { PayoutModal } from '../../components/forms/PayoutModal';
import { DiscountAuthModal } from '../../components/forms/DiscountAuthModal';
import { ReturnModal } from '../../components/forms/ReturnModal';
import { OpenCajaModal } from '../../components/forms/OpenCajaModal';
import { CajaFormModal } from '../../components/forms/CajaFormModal';
import logo from '../../assets/logo.png';
import { authService } from '../../services/auth';
import { cajasService, type CajaSession } from '../../services/cajas';
import { posService } from '../../services/pos';
import { openCashDrawer, isCashDrawerEnabled } from '../../services/cashDrawer';
import { toast } from '../../hooks/useToast';
import { PasswordInput } from '../../components/ui/PasswordInput';


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

const ActionButton: React.FC<{ icon: React.ReactNode; text: string; color: string; shortcut?: string; onClick?: () => void; disabled?: boolean; }> = ({ icon, text, color, shortcut, onClick, disabled = false }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        title={shortcut ? `Atajo: ${shortcut}` : undefined}
        className={`relative flex-1 flex flex-col sm:flex-row items-center justify-center py-1.5 sm:py-2 px-1 sm:px-3 rounded-md text-white text-[10px] sm:text-sm font-semibold transition-colors ${color} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-90'}`}
        style={{ minHeight: '40px' }}
    >
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "w-4 h-4 sm:w-5 sm:h-5 sm:mr-2 mb-0.5 sm:mb-0" })}
        <span className="whitespace-nowrap overflow-hidden text-ellipsis max-w-full">{text}</span>
        {shortcut && <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 border border-white/60 rounded px-1 py-0.5 text-[8px] sm:text-[10px] font-bold leading-none">{shortcut}</span>}
    </button>
);

// Icono según el tipo de método de pago configurado.
const METHOD_ICON: Record<string, React.ReactNode> = {
    cash: <BanknotesIcon />, card: <CreditCardIcon />, ath_movil: <AthMovilIcon />, agilpay: <CreditCardIcon />,
    credit: <UserKeyIcon />, check: <DocumentTextIcon />, invoice: <ClipboardDocumentListIcon />, custom: <BanknotesIcon />,
};

const PaymentButton: React.FC<{ icon: React.ReactNode; text: string; color: string; shortcut?: string; onClick?: () => void; disabled?: boolean; }> = ({ icon, text, color, shortcut, onClick, disabled = false }) => (
     <button
        onClick={onClick}
        disabled={disabled}
        title={shortcut ? `Atajo: ${shortcut}` : undefined}
        style={{ backgroundColor: color }}
        className={`relative flex-1 flex flex-col sm:flex-row items-center justify-center p-2 sm:p-4 rounded-md text-white font-semibold transition-colors text-xs sm:text-xl ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-90'}`}
    >
        {icon && React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "w-4 h-4 sm:w-5 sm:h-5 sm:mr-2 mb-0.5 sm:mb-0" })}
        <span>{text}</span>
        {shortcut && <span className="absolute right-1.5 sm:right-2.5 top-1/2 -translate-y-1/2 border border-white/70 rounded-md px-1 sm:px-2 py-0.5 text-[9px] sm:text-xs font-bold leading-none">{shortcut}</span>}
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
                    <PasswordInput
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
        heldCarts, holdCurrentCart, recallCart, deleteHeldCart, estimates, addLayaway, projects, addProject, setEstimates, setProjects, addEstimate, sales, setSales, employees
    } = useData();
    const { currentUser, login, logout } = useAuth();
    const productSearchRef = useRef<HTMLInputElement>(null);
    const [showScanCamera, setShowScanCamera] = useState(false);
    // Factura generada tras finalizar la venta (muestra el ReceiptModal).
    const [lastReceipt, setLastReceipt] = useState<ReceiptSale | null>(null);
    // Siempre apunta al handler vigente de atajos de pago F1..F6 (sin closures obsoletos).
    const paymentShortcutRef = useRef<(e: KeyboardEvent) => void>(() => {});

    // Shift and security states
    const [isPosAuthenticated, setIsPosAuthenticated] = useState(false);
    // currentSession refleja la CajaSession real del BE para la caja seleccionada.
    const [currentSession, setCurrentSession] = useState<CajaSession | null>(null);
    // shiftState es derivado (mantenemos forma compatible con el resto del componente).
    const shiftState = useMemo(() => {
        if (!currentSession) return null;
        return {
            active: true,
            openingAmount: currentSession.openingFloat,
            startTime: currentSession.openedAt,
            payouts: (currentSession.movements || [])
                .filter(m => m.type === 'PAYOUT')
                .map(m => ({ amount: m.amount, reason: m.reason })),
        };
    }, [currentSession]);
    
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [selectedBranchId, setSelectedBranchId] = useState<string>('');
    const [selectedCajaId, setSelectedCajaId] = useState<string>('');
    // Métodos de pago disponibles en ESTA caja: activos globalmente y no deshabilitados por su
    // sucursal ni por su caja (los overrides viven en settings.paymentMethodScopes).
    const enabledMethods = useMemo(() => {
        const scopes = settings.paymentMethodScopes || { branchDisabled: {}, cajaDisabled: {} };
        const bDisabled = scopes.branchDisabled?.[selectedBranchId] || [];
        const cDisabled = scopes.cajaDisabled?.[selectedCajaId] || [];
        return (settings.paymentMethods || []).filter(m =>
            m.enabled && !bDisabled.includes(m.id) && !cDisabled.includes(m.id)
        );
    }, [settings.paymentMethods, settings.paymentMethodScopes, selectedBranchId, selectedCajaId]);
    // True once useEffect([branches, cajas]) has run with loaded data.
    // Lets us distinguish "still fetching" from "loaded but no active caja found".
    const [cajaInitialized, setCajaInitialized] = useState(false);
    // Modal para crear una caja sin salir del flujo del POS (cuando no hay ninguna).
    const [showCreateCaja, setShowCreateCaja] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [posError, setPosError] = useState<string | null>(null);
    const [generalDiscount, setGeneralDiscount] = useState<{ type: 'percentage' | 'fixed'; value: number } | null>(null);

    
    // Modal states
    type ActiveModal = 'auth' | 'openShift' | 'deleteItemAuth' | 'endShift' | 'payout' | 'clientSearch' | 'createClient' | 'createProject' | 'heldCarts' | 'clientEstimates' | 'layaway' | 'userSwitch' | 'payment' | 'discountAuth' | 'return' | 'dailyClose' | 'punch' | 'reprint' | null;
    const [activeModal, setActiveModal] = useState<ActiveModal>(null);
    
    const [itemToDelete, setItemToDelete] = useState<CartItem | null>(null);
    // Producto con variaciones pendiente de elegir (abre el selector de variación).
    const [variationProduct, setVariationProduct] = useState<Product | null>(null);
    const [initialPaymentMethod, setInitialPaymentMethod] = useState<PaymentMethod>('Efectivo');
    const [pendingCartItems, setPendingCartItems] = useState<CartItem[] | null>(null);
    const [showCartReplaceConfirm, setShowCartReplaceConfirm] = useState(false);
    const [pendingEstimateData, setPendingEstimateData] = useState<{ items: CartItem[], clientId?: string } | null>(null);
    const [showEstimateReplaceConfirm, setShowEstimateReplaceConfirm] = useState(false);
    const [discountTarget, setDiscountTarget] = useState<'general' | string | null>(null); // 'general' or product ID

    // Lista de cajeros para "Cambiar de Usuario": empleados con cuenta de acceso y permiso de POS,
    // excluyendo al usuario actual. Se mapean a la forma `User` que espera UserSwitchModal.
    const posUsers = useMemo<User[]>(() => {
        return employees
            .filter(e => e.email && e.email !== currentUser?.email)
            .filter(e => {
                const p = e.permissions;
                if (!p) return true; // sin info de permisos → no ocultar al empleado
                return !!(p['pos.access'] || p['pos.sell']);
            })
            .map(e => ({
                id: e.id,
                name: e.name,
                lastName: e.lastName,
                email: e.email,
                role: e.role as UserRole,
                profilePictureUrl: e.profilePictureUrl,
                permissions: e.permissions,
            } as unknown as User));
    }, [employees, currentUser?.email]);

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

    // Cargar la sesión real de caja desde el BE cada vez que cambia la caja seleccionada.
    // Si no hay sesión abierta, abrimos el OpenCajaModal (excepto si el usuario no tiene permiso).
    const refreshCurrentSession = useCallback(async () => {
        if (!selectedCajaId) {
            setCurrentSession(null);
            return;
        }
        try {
            const { session } = await cajasService.getCurrentSession(selectedCajaId);
            setCurrentSession(session);
        } catch {
            setCurrentSession(null);
        }
    }, [selectedCajaId]);

    useEffect(() => {
        if (!isPosAuthenticated || !selectedCajaId) return;
        let cancelled = false;
        (async () => {
            try {
                const { session } = await cajasService.getCurrentSession(selectedCajaId);
                if (cancelled) return;
                setCurrentSession(session);
                if (!session) {
                    // No hay turno abierto → invitar a abrirlo si tiene permiso
                    setActiveModal('openShift');
                }
            } catch {
                if (!cancelled) setCurrentSession(null);
            }
        })();
        return () => { cancelled = true; };
    }, [isPosAuthenticated, selectedCajaId]);


    const handleInitialAuth = async (password: string): Promise<boolean> => {
        if (!currentUser) return false;
        try {
            // Verifica la contraseña contra el BE sin crear nueva sesión ni emitir tokens.
            // Usa el endpoint dedicado /auth/verify-password para no tener efectos secundarios
            // (no cambia currentUser, no dispara re-fetches en DataContext, no revoca el JWT actual).
            const { valid } = await authService.verifyPassword(password);
            if (valid) {
                setIsPosAuthenticated(true);
                setActiveModal(null);
                return true;
            }
            return false;
        } catch {
            return false;
        }
    };
    
    // El "abrir turno" real lo hace el OpenCajaModal contra el BE; esta función queda como
    // callback de éxito que refresca la sesión actual.
    const handleShiftOpened = (session: CajaSession) => {
        setCurrentSession(session);
        setActiveModal(null);
        toast.success(`Turno abierto con $${session.openingFloat.toFixed(2)}`);
    };

    const handleSwitchUser = async (employee: User, pass: string): Promise<boolean> => {
        const result = await login(employee.email, pass);
        const success = !('error' in result);
        if (success) {
            // Reset POS auth y sesión para el nuevo usuario
            setIsPosAuthenticated(false);
            setCurrentSession(null);
        }
        return success;
    };

    // Cambio por PIN aún no soportado por el BE; el modal solo muestra PIN si el empleado tiene uno.
    const handleSwitchUserWithPin = async (_userId: string, _pin: string): Promise<boolean> => {
        toast.error('El cambio por PIN no está disponible; usa la contraseña.');
        return false;
    };

    useEffect(() => {
        // Skip while DataContext hasn't loaded yet (both arrays still empty on mount)
        if (!branches.length && !cajas.length) return;

        const firstActiveBranch = branches.find(b => b.isActive);
        if (firstActiveBranch) {
            setSelectedBranchId(firstActiveBranch.id);
            const firstCajaForBranch = cajas.find(c => c.branchId === firstActiveBranch.id && c.isActive);
            if (firstCajaForBranch) {
                setSelectedCajaId(firstCajaForBranch.id);
            }
        }
        // Mark as initialized: data was loaded; if selectedCajaId is still '' after this,
        // it means there is genuinely no active caja configured for this store.
        setCajaInitialized(true);
    }, [branches, cajas]);

    // Atajos F1..Fn: abren el modal de pago con ese método habilitado (solo si NO hay otro modal
    // abierto, para no chocar con los F1..Fn internos del modal de pago).
    // F7 se reserva para el Cuadre Diario (no aparece durante una transacción/cobro).
    paymentShortcutRef.current = (e: KeyboardEvent) => {
        if (activeModal !== null || !isShiftActive) return;
        // "U": cambiar cliente (abre el buscador). Solo si NO estás escribiendo en un campo.
        if (e.key === 'u' || e.key === 'U') {
            const el = document.activeElement as HTMLElement | null;
            const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
            if (typing) return;
            e.preventDefault();
            setActiveModal('clientSearch');
            return;
        }
        if (e.key === 'F7') { e.preventDefault(); setActiveModal('dailyClose'); return; }
        if (e.key === 'F9') { e.preventDefault(); setActiveModal('punch'); return; } // Ponche de empleado
        const fk = /^F([1-9])$/.exec(e.key);
        if (!fk) return;
        const idx = Number(fk[1]) - 1;
        if (idx === 6 || idx === 8) return; // F7 (cuadre) y F9 (ponche) reservados
        const method = enabledMethods[idx];
        if (!method) return;
        e.preventDefault();
        handleOpenPaymentModal(method.name);
    };
    useEffect(() => {
        const handler = (e: KeyboardEvent) => paymentShortcutRef.current(e);
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    // Auto-foco en la búsqueda de productos: cada vez que se vuelve a la vista principal
    // (se cierra cualquier overlay: modal, recibo, cámara, variación, crear-caja), el cursor
    // queda listo para escanear/teclear sin tener que hacer clic.
    useEffect(() => {
        const overlayOpen = activeModal !== null || !!lastReceipt || !!variationProduct || showScanCamera || showCreateCaja;
        if (overlayOpen) return;
        const t = setTimeout(() => productSearchRef.current?.focus(), 60);
        return () => clearTimeout(t);
    }, [activeModal, lastReceipt, variationProduct, showScanCamera, showCreateCaja]);

    // Set default client if none selected
    useEffect(() => {
        if (!selectedClient && clients.length > 0) {
            const defaultClient = (clients.find(c => c.isDefault) || clients.find(c => c.id === DEFAULT_CLIENT_ID));
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
                    // Tasa robusta: usa ivuRate del producto (%) o el default global (fracción→%).
                    // Coacciona a número y cae a 0 si algo llega inválido (evita $NaN en el total).
                    const fallbackPct = (Number(settings.defaultTaxRate) || 0) * 100;
                    const rawRate = item.ivuRate != null ? Number(item.ivuRate) : fallbackPct;
                    const rate = Number.isFinite(rawRate) ? rawRate : 0;
                    tx += taxableAmount * (rate / 100);
                }
            });
        }
        
        return { subtotal: sub, globalDiscountAmount: discountAmt, tax: tx, total: netSubtotal + tx };
    }, [cart, selectedCajaId, cajas, currentUser?.isEmergencyOrderActive, generalDiscount, settings.defaultTaxRate]);

    // Agrega al carrito una línea ya resuelta (producto simple o una variación específica).
    const addResolvedToCart = (item: CartItem) => {
        setCart(prev => {
            const existing = prev.find(ci => ci.id === item.id);
            if (existing) {
                return prev.map(ci => ci.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci);
            }
            return [...prev, item];
        });
        if (productSearchRef.current) productSearchRef.current.focus();
    };

    const addProductToCart = (product: Product) => {
        setPosError(null);
        // Si el producto tiene variaciones, primero se elige cuál (cada una con su precio/SKU).
        if (product.hasVariations && Array.isArray(product.variations) && product.variations.length > 0) {
            setVariationProduct(product);
            return;
        }
        addResolvedToCart({ ...product, quantity: 1 });
    };

    // El usuario eligió una variación: se agrega como línea propia (id compuesto), conservando
    // el productId base para el descuento de inventario y el registro de la venta.
    const handleSelectVariation = (variation: ProductVariation) => {
        const p = variationProduct;
        if (!p) return;
        addResolvedToCart({
            ...p,
            id: `${p.id}::${variation.id}`,
            productId: p.id,
            name: `${p.name} — ${variation.name}`,
            unitPrice: variation.unitPrice,
            skus: variation.sku ? [variation.sku] : p.skus,
            variationId: variation.id,
            variationName: variation.name,
            quantity: 1,
        } as CartItem);
        setVariationProduct(null);
    };

    // El usuario eligió el PRODUCTO BASE (sin variación): se agrega con su precio base.
    const handleSelectBase = () => {
        const p = variationProduct;
        if (!p) return;
        addResolvedToCart({ ...p, quantity: 1 });
        setVariationProduct(null);
    };

    // Búsqueda de productos contra el servidor: siempre datos frescos (incluye productos
    // recién creados) y busca por nombre, código de barras, SKU, categoría, etc.
    const searchProductsRemote = useCallback(async (term: string): Promise<Product[]> => {
        try {
            // slim=true → el backend devuelve un payload mínimo (rápido). Límite alto para no dejar
            // productos fuera cuando el término coincide con muchos.
            const data = await productsService.getAll({ search: term, limit: 100, slim: true });
            if (!Array.isArray(data)) return [];
            return data.map((p: any) => {
                const stockByBranch = Array.isArray(p.stockByBranch)
                    ? p.stockByBranch.map((sb: any) => ({ branchId: sb.branchId, quantity: sb.quantity }))
                    : [];
                const stockEntry = stockByBranch.find((sb: any) => sb.branchId === selectedBranchId);
                const totalStock = stockByBranch.reduce((sum: number, sb: any) => sum + sb.quantity, 0);
                return {
                    ...p,
                    category: typeof p.category === 'object' && p.category ? p.category.name : p.category,
                    skus: Array.isArray(p.skus) ? p.skus.map((s: any) => typeof s === 'string' ? s : s.sku) : [],
                    stockByBranch,
                    stockAtBranch: stockEntry ? stockEntry.quantity : 0,
                    totalStockAcrossAllBranches: totalStock,
                } as Product;
            });
        } catch (e) {
            console.error('Error al buscar productos en la caja:', e);
            return [];
        }
    }, [selectedBranchId]);

    // Código detectado por la cámara: busca el producto exacto y lo agrega al carrito.
    const handleCameraScan = useCallback(async (rawCode: string) => {
        setShowScanCamera(false);
        const code = rawCode.trim();
        if (!code) return;
        const results = await searchProductsRemote(code);
        const exact = results.find(p =>
            p.barcode13Digits === code ||
            p.barcode2 === code ||
            p.supplierProductCode === code ||
            p.chainCode === code ||
            (p.skus && p.skus.includes(code))
        );
        const product = exact || (results.length === 1 ? results[0] : null);
        if (product) {
            addProductToCart(product);
            toast.success(`${product.name} agregado`);
        } else if (results.length > 1) {
            toast.error(`El código "${code}" coincide con varios productos. Búscalo por nombre.`);
        } else {
            toast.error(`No se encontró un producto con el código "${code}".`);
        }
    }, [searchProductsRemote]);

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
        if (!currentUser || !itemToDelete) return false;
        try {
            // Verifica la contraseña sin re-loguear (login() recargaría el carrito desde
            // localStorage y "restauraría" el artículo recién borrado).
            const { valid } = await authService.verifyPassword(password);
            if (valid) {
                updateQuantity(itemToDelete.id, 0);
                setActiveModal(null);
                setItemToDelete(null);
                return true;
            }
        } catch { /* contraseña inválida o error de red */ }
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
        const defaultClient = (clients.find(c => c.isDefault) || clients.find(c => c.id === DEFAULT_CLIENT_ID));
        setSelectedClient(defaultClient || null);
        setSelectedProjectId(null);
        setGeneralDiscount(null);
        if (productSearchRef.current) {
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

    const handleFinalizeSale = async (payments: { method: string; amount: number; reference?: string }[], changeDue?: number) => {
         if (cart.length === 0 || !currentUser || !selectedCajaId || !selectedBranchId) {
            toast.error('No se puede completar la venta. Carrito vacío o falta información de empleado/caja/sucursal.');
            return;
        }

        const paymentMethodString = payments.length > 1
            ? 'Múltiple'
            : payments[0]?.method || 'Desconocido';

        // Identify if current Caja is External
        const currentCaja = cajas.find(c => c.id === selectedCajaId);
        const isExternalSale = currentCaja?.isExternal || false;

        // Snapshot de la venta para la factura (antes de vaciar el carrito).
        const receiptSnapshot: Omit<ReceiptSale, 'saleNumber'> = {
            date: new Date().toISOString(),
            items: cart.map(it => ({ name: it.name, quantity: it.quantity, unitPrice: it.unitPrice })),
            subtotal, tax, discount: globalDiscountAmount, total,
            payments: payments.map(p => ({ method: p.method, amount: p.amount, reference: p.reference })),
            changeDue: changeDue || 0,
            clientName: selectedClient ? `${selectedClient.name} ${selectedClient.lastName || ''}`.trim() : undefined,
            cashierName: currentUser ? `${currentUser.name} ${currentUser.lastName || ''}`.trim() : undefined,
        };

        setActiveModal(null);

        const created = await addSale({
            items: cart,
            totalAmount: total,
            subtotal,
            taxAmount: tax,
            discountAmount: globalDiscountAmount,
            paymentMethod: paymentMethodString,
            paymentStatus: payments.some(p => p.method === 'Crédito C.') ? 'Pendiente de Pago' : 'Pagado',
            payments,
            clientId: selectedClient?.id,
            projectId: selectedProjectId || undefined,
            cajaId: selectedCajaId,
            employeeId: currentUser.id,
            isExternal: isExternalSale,
        } as any, selectedBranchId);

        // Abrir la gaveta si está habilitada y la venta involucra efectivo (o hay vuelto).
        const involvesCash = payments.some(p => /efectivo|cash/i.test(p.method)) || (changeDue || 0) > 0;
        if (isCashDrawerEnabled() && involvesCash) {
            openCashDrawer().catch(err => toast.error(`Gaveta: ${err?.message || 'no se pudo abrir (¿QZ Tray activo?)'}`));
        }

        // Mostrar la factura con el folio secuencial del negocio (Factura #N).
        const folio = (created as any)?.saleNumber;
        const saleNumber = folio ? String(folio) : `V-${Date.now().toString().slice(-6)}`;
        setLastReceipt({ ...receiptSnapshot, saleNumber });

        clearCart();
    };

    // Apertura manual de la gaveta ("Sin venta"): útil para dar cambio.
    const handleOpenDrawer = () => {
        openCashDrawer()
            .then(() => toast.success('Gaveta abierta.'))
            .catch(err => toast.error(`Gaveta: ${err?.message || 'no se pudo abrir (¿QZ Tray activo?)'}`));
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
                    const defaultClient = (clients.find(c => c.isDefault) || clients.find(c => c.id === DEFAULT_CLIENT_ID));
                    setSelectedClient(defaultClient || null);
                }
            } else {
                // If no clientId in recalled cart, reset to default
                const defaultClient = (clients.find(c => c.isDefault) || clients.find(c => c.id === DEFAULT_CLIENT_ID));
                setSelectedClient(defaultClient || null);
            }
            setPosError(null);
        }
        setActiveModal(null);
    };

    const handleLoadEstimatesToCart = (items: CartItem[], estimateIds: string[]) => {
        if (cart.length > 0) {
            setPendingCartItems(items);
            setShowCartReplaceConfirm(true);
            return;
        }
        setCart(items);
        setPosError(null);
        setActiveModal(null);
    };

    const confirmCartReplace = () => {
        if (pendingCartItems) {
            setCart(pendingCartItems);
            setPosError(null);
            setActiveModal(null);
        }
        setPendingCartItems(null);
        setShowCartReplaceConfirm(false);
    };

    const confirmEstimateReplace = () => {
        if (pendingEstimateData) {
            setCart(pendingEstimateData.items);
            if (pendingEstimateData.clientId) {
                const client = clients.find(c => c.id === pendingEstimateData!.clientId);
                if (client) setSelectedClient(client);
            }
            toast.success(`Estimado cargado en el carrito (${pendingEstimateData.items.length} items)`);
        }
        setPendingEstimateData(null);
        setShowEstimateReplaceConfirm(false);
    };

    // Precarga de estimado desde sessionStorage (set por EstimatesListPage "Convertir a venta")
    useEffect(() => {
        if (!isPosAuthenticated || !currentSession) return;
        const stored = sessionStorage.getItem('pazzi_estimate_to_convert');
        if (!stored) return;
        try {
            const parsed = JSON.parse(stored);
            const items: CartItem[] = (parsed.items || []).map((it: any) => ({
                id: it.productId || it.id,
                productId: it.productId || it.id,
                name: it.product?.name || it.name || 'Producto',
                quantity: it.quantity,
                unitPrice: it.unitPrice,
            }));
            sessionStorage.removeItem('pazzi_estimate_to_convert');
            if (cart.length > 0) {
                setPendingEstimateData({ items, clientId: parsed.clientId });
                setShowEstimateReplaceConfirm(true);
                return;
            }
            setCart(items);
            if (parsed.clientId) {
                const client = clients.find(c => c.id === parsed.clientId);
                if (client) setSelectedClient(client);
            }
            toast.success(`Estimado cargado en el carrito (${items.length} items)`);
        } catch {
            sessionStorage.removeItem('pazzi_estimate_to_convert');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPosAuthenticated, currentSession]);

    const handleCreateEstimateFromCart = () => {
        if (!currentUser || !selectedClient || cart.length === 0 || !selectedBranchId) {
            toast.error('Faltan datos para crear el estimado (cliente, productos, empleado o sucursal).');
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
        
        toast.success(`Estimado creado para ${selectedClient.name}.`);
        clearCart();
        setActiveModal(null);
    };
    
    // El payout real se registra en el BE desde PayoutModal (M4-8).
    // Esta función solo refresca la sesión actual para que shiftReportData se actualice.
    const handleAddPayout = (_amount: number, _reason: string) => {
        refreshCurrentSession();
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
        // El cierre real ya lo hizo el BE vía EndShiftModal → cajasService.closeSession.
        setCurrentSession(null);
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
    
    const handleProcessReturnFromModal = async (
        originalSaleId: string,
        itemsToReturn: ReturnItemPayload[],
        reason: string,
        _supervisorPin: string,
    ) => {
        // La autorización del supervisor se hace ahora dentro del propio ReturnModal
        // (o un POSActionAuthModal previo). Aquí sólo procesamos la devolución contra el BE.
        try {
            const result = await posService.processReturn(originalSaleId, {
                items: itemsToReturn.map(it => ({
                    productId: (it as any).productId || it.id,
                    quantity: it.quantity,
                    customRefundAmount: it.customRefundAmount,
                    returnToStock: it.returnToStock,
                })),
                reason,
                refundMethod: 'Efectivo',
            });
            toast.success(result.message || `Devolución por $${result.refundAmount.toFixed(2)} procesada`);
            // Resultado del reembolso automático por AgilPay, si aplicó.
            if (result.agilpayRefund) {
                if (result.agilpayRefund.ok) toast.success(`AgilPay: ${result.agilpayRefund.message}`);
                else toast.warning(`AgilPay: ${result.agilpayRefund.message}`);
            }
            setActiveModal(null);
        } catch (err: any) {
            toast.error(err?.message || 'Error al procesar la devolución');
        }
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
        // "Gaveta" (Sin venta) solo si está configurada la gaveta por QZ Tray en este dispositivo.
        ...(isCashDrawerEnabled() ? [{ text: 'Gaveta', icon: <BanknotesIcon />, color: 'bg-[#5D4037]', onClick: handleOpenDrawer }] : []),
        { text: 'Cuadre', icon: <DocumentTextIcon />, color: 'bg-[#00695C]', shortcut: 'F7', onClick: () => setActiveModal('dailyClose') },
        { text: t('pos.reprint'), icon: <PrinterIcon />, color: 'bg-[#546E7A]', onClick: () => setActiveModal('reprint') },
        { text: t('pos.user'), icon: <UserKeyIcon />, color: 'bg-[#3949AB]', onClick: () => setActiveModal('userSwitch') },
    ];
    
    // UI Render
    if (!isPosAuthenticated) {
      return <POSActionAuthModal isOpen={true} onClose={() => navigate('/')} onConfirm={handleInitialAuth} title="Acceso a Caja" message="Por favor ingrese su contraseña para acceder al punto de venta." />;
    }
    
    if (!shiftState?.active) {
        if (!selectedCajaId) {
            // Data has loaded but no active caja was found for this store
            if (cajaInitialized) {
                return (
                    <>
                    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-neutral-900 gap-4 p-6 text-center">
                        <ExclamationTriangleIcon className="w-14 h-14 text-amber-500" />
                        <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-200">Aún no tienes una caja registradora</h2>
                        <p className="text-neutral-500 dark:text-neutral-400 text-sm max-w-md">
                            Para empezar a vender necesitas al menos una caja. Créala aquí mismo y sigue con tu venta —
                            no perderás este flujo.
                        </p>
                        <div className="flex flex-wrap justify-center gap-3 mt-2">
                            <button onClick={() => setShowCreateCaja(true)} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center gap-1`}>
                                <KeyIcon className="w-4 h-4" /> Crear caja ahora
                            </button>
                            <button onClick={() => navigate('/')} className={BUTTON_SECONDARY_SM_CLASSES}>
                                Volver al inicio
                            </button>
                        </div>
                    </div>
                    {showCreateCaja && (
                        <CajaFormModal
                            isOpen={showCreateCaja}
                            cajaToEdit={null}
                            onClose={() => {
                                // Al crear, CajaFormModal actualiza la lista de cajas del contexto.
                                // El useEffect de auto-selección elige la nueva caja y el flujo
                                // continúa solo hacia "abrir turno" (OpenCajaModal). Nunca sales del POS.
                                setShowCreateCaja(false);
                            }}
                        />
                    )}
                    </>
                );
            }
            // Still fetching branches/cajas from backend
            return (
                <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-neutral-900">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3 flex-shrink-0"></div>
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm">Cargando punto de venta...</p>
                </div>
            );
        }
        const currentCajaForOpen = cajas.find(c => c.id === selectedCajaId);
        // Guard: if caja disappeared from state (race condition during refetch), show spinner
        if (!currentCajaForOpen) {
            return (
                <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-neutral-900">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3 flex-shrink-0"></div>
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm">Cargando caja...</p>
                </div>
            );
        }
        return (
            <OpenCajaModal
                isOpen={true}
                onClose={() => navigate('/')}
                caja={{ id: currentCajaForOpen.id, name: currentCajaForOpen.name }}
                onOpened={handleShiftOpened}
            />
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

                    {/* Ponche de empleado: a la izquierda del bloque del usuario, junto al divisor. */}
                    <button
                        onClick={() => setActiveModal('punch')}
                        title="Ponche de empleado (F9)"
                        className="bg-[#455A64] hover:bg-[#37474F] text-white font-bold py-1 px-1.5 sm:py-2 sm:px-4 rounded-md flex items-center space-x-1 sm:space-x-2 text-[9px] sm:text-sm shadow-sm transition-all active:scale-95"
                    >
                        <UserKeyIcon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                        <span className="hidden sm:inline">Ponche</span>
                        <span className="border border-white/60 rounded px-1 py-0.5 text-[8px] sm:text-[10px] font-bold leading-none">F9</span>
                    </button>

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

                    {/* Salir / Cerrar turno: a la derecha del Modo Emergencia. */}
                    <button
                        onClick={currentUser?.role === UserRole.MANAGER ? () => navigate('/') : () => setActiveModal('endShift')}
                        title={currentUser?.role === UserRole.MANAGER ? 'Salir' : 'Cerrar turno'}
                        className="bg-[#B71C1C] hover:bg-red-800 text-white font-bold py-1 px-1.5 sm:py-2 sm:px-4 rounded-md flex items-center space-x-1 sm:space-x-2 text-[9px] sm:text-sm shadow-sm transition-all active:scale-95"
                    >
                        <ExitIcon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                        <span className="hidden sm:inline">{currentUser?.role === UserRole.MANAGER ? 'Salir' : t('pos.close_shift')}</span>
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
                                        <button onClick={() => setActiveModal('clientSearch')} title="Atajo: U" className="inline-flex items-center gap-1 text-[10px] sm:text-xs py-1 px-2 rounded bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900">Cambiar <span className="border border-blue-400/60 rounded px-1 text-[8px] font-bold leading-none">U</span></button>
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
                    <div className="p-3 border-b dark:border-neutral-700">
                        <div className="flex items-center gap-2">
                            <div className="flex-grow min-w-0">
                                <ProductAutocomplete
                                    onProductSelect={addProductToCart}
                                    inputRef={productSearchRef}
                                    onRemoteSearch={searchProductsRemote}
                                    disabled={!isShiftActive}
                                    autoFocus
                                    placeholder="Buscar por nombre, código de barras o SKU…"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowScanCamera(true)}
                                disabled={!isShiftActive}
                                title="Escanear con la cámara"
                                aria-label="Escanear con la cámara"
                                className="flex-shrink-0 h-12 w-11 flex items-center justify-center rounded-md border border-neutral-300 dark:border-neutral-600 text-neutral-500 dark:text-neutral-400 hover:text-primary hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <CameraIcon className="w-5 h-5" />
                            </button>
                        </div>
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
                                                    src={item.imageUrl || logo}
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
                    {enabledMethods.map((m, i) => (
                        <PaymentButton
                            key={m.id}
                            text={m.name}
                            shortcut={i < 9 ? `F${i + 1}` : undefined}
                            icon={METHOD_ICON[m.type] || METHOD_ICON.custom}
                            color={m.color}
                            onClick={() => handleOpenPaymentModal(m.name)}
                        />
                    ))}
                </div>
            </footer>
            
            {/* MODALS */}
            <ClientSearchModal isOpen={activeModal === 'clientSearch'} onClose={() => setActiveModal(null)} clients={clients} onClientSelect={(client) => { setSelectedClient(client); setActiveModal(null); setSelectedProjectId(null); setPosError(null); }} onOpenCreateClient={() => setActiveModal('createClient')} />
            <ClientFormModal isOpen={activeModal === 'createClient'} onClose={(client) => {setActiveModal(null); if(client) setSelectedClient(client);}} client={null} />
            <POSProjectFormModal isOpen={activeModal === 'createProject'} onClose={() => setActiveModal(null)} clientId={selectedClient?.id || ''} onProjectCreated={(newProject) => { setSelectedProjectId(newProject.id); setActiveModal(null); }} />
            <HeldCartsModal
                isOpen={activeModal === 'heldCarts'}
                onClose={() => setActiveModal(null)}
                isGeneralClient={!selectedClient || !!selectedClient.isDefault || selectedClient.id === DEFAULT_CLIENT_ID}
                onHoldCart={(alias) => {
                    if (cart.length > 0) {
                        const name = alias?.trim() || `Venta para ${selectedClient?.name || 'Contado'}`;
                        holdCurrentCart(cart, name, selectedClient?.id);
                        clearCart();
                        return true;
                    }
                    return false;
                }}
                onRecallCart={handleRecallCart}
                onDeleteHeldCart={deleteHeldCart}
                heldCarts={heldCarts}
            />
            <ClientEstimatesModal isOpen={activeModal === 'clientEstimates'} onClose={() => setActiveModal(null)} client={selectedClient} onLoadItems={handleLoadEstimatesToCart} onCreateFromCart={handleCreateEstimateFromCart} isCartEmpty={cart.length === 0} />
            <CreateLayawayModal isOpen={activeModal === 'layaway'} onClose={() => setActiveModal(null)} cart={cart} total={total} selectedClient={selectedClient} onOpenClientSearch={() => setActiveModal('clientSearch')} onCreateLayaway={(payment, notes) => { if (!currentUser) return; addLayaway({ items: cart, totalAmount: total, clientId: selectedClient!.id, status: LayawayStatus.ACTIVO, branchId: selectedBranchId, employeeId: currentUser.id, notes }, payment); clearCart(); setActiveModal(null); }} />
            <UserSwitchModal isOpen={activeModal === 'userSwitch'} onClose={() => setActiveModal(null)} employees={posUsers} onSwitchUser={handleSwitchUser} onSwitchUserWithPin={handleSwitchUserWithPin} />
            <PaymentModal
                isOpen={activeModal === 'payment'}
                onClose={() => setActiveModal(null)}
                totalAmount={total}
                subtotalAmount={subtotal}
                taxAmount={tax}
                athItems={cart.map(it => ({ name: it.name, quantity: it.quantity, price: it.unitPrice }))}
                customerName={selectedClient ? `${selectedClient.name} ${selectedClient.lastName || ''}`.trim() : undefined}
                customerEmail={selectedClient?.email || undefined}
                initialMethod={initialPaymentMethod}
                methods={enabledMethods.map(m => ({ name: m.name, type: m.type, requiresReference: m.requiresReference, referenceLabel: m.referenceLabel, config: m.config }))}
                onFinalizeSale={handleFinalizeSale}
            />
            <ReceiptModal isOpen={!!lastReceipt} onClose={() => setLastReceipt(null)} sale={lastReceipt} config={settings.receiptConfig} />
            {currentUser && (
                <ReprintModal
                    isOpen={activeModal === 'reprint'}
                    onClose={() => setActiveModal(null)}
                    employeeId={currentUser.id}
                    onSelectReceipt={(rs) => { setActiveModal(null); setLastReceipt(rs); }}
                />
            )}

            {selectedCajaId && (
                <DailyCloseModal isOpen={activeModal === 'dailyClose'} onClose={() => setActiveModal(null)} cajaId={selectedCajaId} cajaName={currentCajaName} onClosed={() => handleEndShift()} />
            )}

            <PunchModal isOpen={activeModal === 'punch'} onClose={() => setActiveModal(null)} />

            {/* Selector de variación (productos con variaciones) */}
            <Modal isOpen={!!variationProduct} onClose={() => setVariationProduct(null)} title={`Elige una variación — ${variationProduct?.name || ''}`} size="md">
                <div className="space-y-3">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Elige el producto base o una variación para agregar al carrito:</p>

                    {/* Producto base (sin variación) */}
                    <button
                        onClick={handleSelectBase}
                        className="w-full flex items-center justify-between p-3 border-2 border-primary/40 bg-primary/5 rounded-md hover:bg-primary/10 hover:border-primary text-left transition-colors"
                    >
                        <span className="font-semibold text-neutral-800 dark:text-neutral-100">
                            {variationProduct?.name}
                            <span className="text-xs font-normal text-neutral-500 ml-1">(producto base)</span>
                        </span>
                        <span className="font-semibold text-primary">${(Number(variationProduct?.unitPrice) || 0).toFixed(2)}</span>
                    </button>

                    {(variationProduct?.variations?.length ?? 0) > 0 && (
                        <div className="flex items-center gap-2 text-xs text-neutral-400">
                            <span className="flex-1 border-t border-neutral-200 dark:border-neutral-700" />
                            variaciones
                            <span className="flex-1 border-t border-neutral-200 dark:border-neutral-700" />
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[55vh] overflow-y-auto">
                        {(variationProduct?.variations || []).map(v => (
                            <button
                                key={v.id}
                                onClick={() => handleSelectVariation(v)}
                                className="flex items-center justify-between p-3 border border-neutral-300 dark:border-neutral-600 rounded-md hover:bg-primary/5 hover:border-primary text-left transition-colors"
                            >
                                <span className="font-medium text-neutral-800 dark:text-neutral-100">
                                    {v.name}{v.sku ? <span className="text-xs text-neutral-400 ml-1">({v.sku})</span> : null}
                                </span>
                                <span className="font-semibold text-primary">${(Number(v.unitPrice) || 0).toFixed(2)}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </Modal>
            {showScanCamera && (
                <Suspense fallback={null}>
                    <CameraScanModal isOpen={showScanCamera} onClose={() => setShowScanCamera(false)} onDetected={handleCameraScan} title="Escanear producto" />
                </Suspense>
            )}
            <POSActionAuthModal isOpen={activeModal === 'deleteItemAuth'} onClose={() => setActiveModal(null)} onConfirm={handleConfirmItemDelete} title="Confirmar Eliminación" message="Ingrese su contraseña para eliminar el artículo del carrito." />
            {selectedCajaId && (
                <EndShiftModal
                    isOpen={activeModal === 'endShift'}
                    onClose={() => setActiveModal(null)}
                    cajaId={selectedCajaId}
                    onClosed={() => handleEndShift()}
                />
            )}
            {selectedCajaId && (
                <PayoutModal
                    isOpen={activeModal === 'payout'}
                    onClose={() => setActiveModal(null)}
                    cajaId={selectedCajaId}
                    currentCashInDrawer={(shiftState?.openingAmount || 0) + shiftReportData.cashSales - shiftReportData.payouts}
                    onRecorded={(mov) => handleAddPayout(mov.amount, mov.reason)}
                />
            )}
            <DiscountAuthModal 
                isOpen={activeModal === 'discountAuth'} 
                onClose={() => setActiveModal(null)} 
                onApply={handleApplyDiscount} 
                currentDiscount={currentDiscountForModal}
            />
            <ReturnModal isOpen={activeModal === 'return'} onClose={() => setActiveModal(null)} onProcessReturn={handleProcessReturnFromModal} />
            <ConfirmationModal
                isOpen={showCartReplaceConfirm}
                onClose={() => { setPendingCartItems(null); setShowCartReplaceConfirm(false); }}
                onConfirm={confirmCartReplace}
                title="Reemplazar carrito"
                message="Cargar los estimados reemplazará los artículos en el carrito actual. ¿Desea continuar?"
                confirmButtonText="Sí, reemplazar"
            />
            <ConfirmationModal
                isOpen={showEstimateReplaceConfirm}
                onClose={() => { setPendingEstimateData(null); setShowEstimateReplaceConfirm(false); }}
                onConfirm={confirmEstimateReplace}
                title="Reemplazar carrito"
                message="Tienes artículos en el carrito. ¿Reemplazarlos con los del estimado?"
                confirmButtonText="Sí, reemplazar"
            />
        </div>
    );
};