import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalSettings, useTranslation } from '../../contexts/GlobalSettingsContext'; // Imported useTranslation
import { Product, CartItem, Client, Branch, Caja, HeldCart, Estimate, LayawayStatus, User, UserRole, Employee, Project, EstimateStatus, Sale, ProductVariation } from '../../types';
import { getCajaDesign } from '../../utils/cajaDesigns';
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
import { CajaHistoryModal } from '../../components/pos/CajaHistoryModal';
import { ReprintModal } from '../../components/pos/ReprintModal';
import { CartLineModal } from '../../components/pos/CartLineModal';
import { ManualPriceModal } from '../../components/pos/ManualPriceModal';
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
import { ClientCreditPaymentModal } from '../../components/ui/ClientCreditPaymentModal';
import { ClientAccountModal } from '../../components/ui/ClientAccountModal';
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
import { DrawerOpenModal } from '../../components/pos/DrawerOpenModal';
import { posService } from '../../services/pos';
import { timeclockService } from '../../services/timeclock';
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

const ActionButton: React.FC<{ icon: React.ReactNode; text: string; color: string; shortcut?: string; onClick?: () => void; disabled?: boolean; }> = ({ icon, text, color, shortcut, onClick, disabled = false }) => {
    const { t } = useTranslation();
    return (
    <button
        onClick={onClick}
        disabled={disabled}
        title={shortcut ? t('posx.cashier.shortcut', { key: shortcut }) : undefined}
        className={`relative flex-1 flex flex-col sm:flex-row items-center justify-center py-1.5 sm:py-2 px-1 sm:px-3 rounded-md text-white text-[10px] sm:text-sm font-semibold transition-colors ${color} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-90'}`}
        style={{ minHeight: '40px' }}
    >
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "w-4 h-4 sm:w-5 sm:h-5 sm:mr-2 mb-0.5 sm:mb-0" })}
        <span className="whitespace-nowrap overflow-hidden text-ellipsis max-w-full">{text}</span>
        {shortcut && <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 border border-white/60 rounded px-1 py-0.5 text-[8px] sm:text-[10px] font-bold leading-none">{shortcut}</span>}
    </button>
    );
};

// Icono según el tipo de método de pago configurado.
const METHOD_ICON: Record<string, React.ReactNode> = {
    cash: <BanknotesIcon />, card: <CreditCardIcon />, ath_movil: <AthMovilIcon />, agilpay: <CreditCardIcon />,
    credit: <UserKeyIcon />, check: <DocumentTextIcon />, invoice: <ClipboardDocumentListIcon />, custom: <BanknotesIcon />,
};

const PaymentButton: React.FC<{ icon: React.ReactNode; text: string; color: string; shortcut?: string; onClick?: () => void; disabled?: boolean; }> = ({ icon, text, color, shortcut, onClick, disabled = false }) => {
    const { t } = useTranslation();
    return (
     <button
        onClick={onClick}
        disabled={disabled}
        title={shortcut ? t('posx.cashier.shortcut', { key: shortcut }) : undefined}
        style={{ backgroundColor: color }}
        className={`relative flex-1 flex flex-col sm:flex-row items-center justify-center p-2 sm:p-4 rounded-md text-white font-semibold transition-colors text-xs sm:text-xl ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-90'}`}
    >
        {icon && React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: "w-4 h-4 sm:w-5 sm:h-5 sm:mr-2 mb-0.5 sm:mb-0" })}
        <span>{text}</span>
        {shortcut && <span className="absolute right-1.5 sm:right-2.5 top-1/2 -translate-y-1/2 border border-white/70 rounded-md px-1 sm:px-2 py-0.5 text-[9px] sm:text-xs font-bold leading-none">{shortcut}</span>}
    </button>
    );
};

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
            setError(t('posx.cashier.wrong_password'));
            setIsChecking(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <form onSubmit={(e) => { e.preventDefault(); handleConfirm(); }} className="space-y-4">
                <p className="text-sm text-neutral-600 dark:text-neutral-300">{message}</p>
                <div>
                    <label className="block text-sm font-medium">{t('posx.cashier.password')}</label>
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
                        {isChecking ? t('posx.cashier.verifying') : t('common.confirm')}
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
        heldCarts, holdCurrentCart, recallCart, deleteHeldCart, estimates, addLayaway, projects, addProject, setEstimates, setProjects, addEstimate, sales, setSales, employees, getBranchById
    } = useData();
    const { currentUser, login, logout } = useAuth();
    const productSearchRef = useRef<HTMLInputElement>(null);
    // Cantidad pre-escrita: se teclea ANTES de elegir el producto y este entra con esa cantidad.
    // Por defecto 1 (nunca 0/vacío).
    const [quantityInput, setQuantityInput] = useState('1');
    const quantityInputRef = useRef<HTMLInputElement>(null);
    // Cantidad "en espera" para productos que abren un modal (variaciones / precio manual).
    const pendingQtyRef = useRef(1);
    const [showScanCamera, setShowScanCamera] = useState(false);
    // Factura generada tras finalizar la venta (muestra el ReceiptModal).
    const [lastReceipt, setLastReceipt] = useState<ReceiptSale | null>(null);
    // Cambio a devolver tras una venta en efectivo: overlay grande que permanece hasta ESC.
    const [changeOverlay, setChangeOverlay] = useState<number | null>(null);
    // Modal de apertura de gaveta "Sin venta" (exige razón + PIN).
    const [showDrawerOpen, setShowDrawerOpen] = useState(false);
    // Error al registrar la venta (stock insuficiente, turno cerrado, etc.) → modal claro.
    const [saleError, setSaleError] = useState<{ message: string; code?: string } | null>(null);
    // Intento de venta guardado para reintentar como sobreventa (cuando falla por stock).
    const [pendingSaleRetry, setPendingSaleRetry] = useState<{ payments: { method: string; amount: number; reference?: string }[]; changeDue?: number } | null>(null);
    // Menú "Opciones" del cliente activo (pagar cuenta, ver estado de cuenta).
    const [clientMenuOpen, setClientMenuOpen] = useState(false);
    // Item del carrito en edición ("Modificar Línea"). Guardamos el id para reflejar cambios en vivo.
    const [editingLineId, setEditingLineId] = useState<string | null>(null);
    // Producto de precio manual esperando que el cajero ingrese el precio.
    const [manualPriceProduct, setManualPriceProduct] = useState<Product | null>(null);
    // Siempre apunta al handler vigente de atajos de pago F1..F6 (sin closures obsoletos).
    const paymentShortcutRef = useRef<(e: KeyboardEvent) => void>(() => {});

    // Cajero/operador REAL del turno (identificado por PIN). null = la cuenta que hizo login.
    // Las ventas se atribuyen a este operador (cashierName + userId) para el cuadre.
    const [operator, setOperator] = useState<{ userId: string | null; name: string; lastName: string } | null>(null);
    // Nombre y userId del cajero efectivo (operador por PIN, o la cuenta que hizo login).
    const operatorName = (operator
        ? `${operator.name} ${operator.lastName || ''}`
        : (currentUser ? `${currentUser.name} ${currentUser.lastName || ''}` : '')).trim();
    const operatorUserId = operator?.userId || currentUser?.id;

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
    // Cliente de mostrador por defecto: por bandera isDefault, por id conocido, o por nombre
    // "Público General" (el que crea el backend). Robusto ante datos que no traigan isDefault.
    const findDefaultClient = useCallback((list: Client[]): Client | undefined =>
        list.find(c => c.isDefault)
        || list.find(c => c.id === DEFAULT_CLIENT_ID)
        || list.find(c => `${c.name || ''} ${c.lastName || ''}`.trim().toLowerCase() === 'público general'),
    []);
    const [selectedBranchId, setSelectedBranchId] = useState<string>('');
    const [selectedCajaId, setSelectedCajaId] = useState<string>('');
    // Métodos de pago disponibles en ESTA caja: activos globalmente y no deshabilitados por su
    // sucursal ni por su caja (los overrides viven en settings.paymentMethodScopes).
    const enabledMethods = useMemo(() => {
        const scopes = settings.paymentMethodScopes || { branchDisabled: {}, cajaDisabled: {} };
        const bDisabled = scopes.branchDisabled?.[selectedBranchId] || [];
        const cDisabled = scopes.cajaDisabled?.[selectedCajaId] || [];
        // "Cuadre" (cierre de caja) NO es un método de pago: se hace desde la barra superior
        // y con F7. Lo excluimos de la barra de pagos de abajo aunque venga en la config guardada.
        const isCashUp = (m: any) =>
            m.id === 'cuadre' || m.type === 'cash_up' || m.type === 'daily_close' ||
            (m.name || '').trim().toLowerCase() === 'cuadre';
        return (settings.paymentMethods || []).filter(m =>
            m.enabled && !isCashUp(m) && !bDisabled.includes(m.id) && !cDisabled.includes(m.id)
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
    type ActiveModal = 'auth' | 'openShift' | 'deleteItemAuth' | 'endShift' | 'payout' | 'clientSearch' | 'createClient' | 'createProject' | 'heldCarts' | 'clientEstimates' | 'layaway' | 'userSwitch' | 'payment' | 'discountAuth' | 'return' | 'dailyClose' | 'cajaHistory' | 'punch' | 'reprint' | 'clientCredit' | 'clientAccount' | null;
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
                pin: e.pin, // habilita el cambio de cajero por PIN
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
        toast.success(t('posx.cashier.shift_opened', { amount: session.openingFloat.toFixed(2) }));
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

    // Cambio de CAJERO por PIN: identifica al operador (sin ponchar ni re-login) y le atribuye
    // las ventas del turno. No cambia la sesión de la caja ni la cuenta del equipo.
    const handleSwitchUserWithPin = async (employeeId: string, pin: string): Promise<boolean> => {
        try {
            const emp = posUsers.find(u => u.id === employeeId);
            const identifier = emp ? `${emp.name} ${emp.lastName || ''}`.trim() : undefined;
            const r = await timeclockService.identify(pin, identifier);
            if (!r.ok) return false;
            setOperator({ userId: r.userId, name: r.name, lastName: r.lastName });
            toast.success(t('posx.cashier.operator_set', { name: `${r.name} ${r.lastName || ''}`.trim() }));
            return true;
        } catch {
            return false;
        }
    };
    // Volver a operar como la cuenta que hizo login (quita el operador por PIN).
    const clearOperator = () => setOperator(null);

    useEffect(() => {
        // Skip while DataContext hasn't loaded yet (both arrays still empty on mount)
        if (!branches.length && !cajas.length) return;

        // Respeta la selección manual del usuario: si ya eligió caja, no la sobreescribimos.
        if (selectedCajaId && cajas.some(c => c.id === selectedCajaId)) { setCajaInitialized(true); return; }

        // 0) Preferir la última caja que este usuario eligió (si sigue activa).
        const storedId = currentUser ? localStorage.getItem(`pos_caja_${currentUser.id}`) : null;
        let caja = storedId ? cajas.find(c => c.id === storedId && c.isActive) : undefined;
        let branchId = caja?.branchId;

        // 1) Camino normal: primera sucursal activa + una caja activa suya.
        if (!caja) {
            const firstActiveBranch = branches.find(b => b.isActive);
            branchId = firstActiveBranch?.id;
            caja = branchId ? cajas.find(c => c.branchId === branchId && c.isActive) : undefined;
        }

        // 2) Fallback robusto: si la lista de sucursales NO incluye la sucursal de la caja
        //    (p.ej. la sucursal quedó con otro dueño/null por el aislamiento multi-tenant),
        //    tomamos la primera caja activa disponible y derivamos su branchId de la propia caja.
        if (!caja) {
            caja = cajas.find(c => c.isActive) || cajas[0];
            if (caja) branchId = caja.branchId;
        }

        if (branchId) setSelectedBranchId(branchId);
        if (caja) setSelectedCajaId(caja.id);

        // Mark as initialized: data was loaded; if selectedCajaId is still '' after this,
        // it means there is genuinely no active caja configured for this store.
        setCajaInitialized(true);
    }, [branches, cajas, selectedCajaId, currentUser]);

    // Selectores de sucursal/caja (solo se muestran cuando hay más de una opción).
    const selectableBranches = useMemo(
        () => branches.filter(b => b.isActive && cajas.some(c => c.branchId === b.id && c.isActive)),
        [branches, cajas]
    );
    const cajasInSelectedBranch = useMemo(
        () => cajas.filter(c => c.branchId === selectedBranchId && c.isActive),
        [cajas, selectedBranchId]
    );
    const chooseCaja = (id: string) => {
        if (!id || id === selectedCajaId) return;
        setSelectedCajaId(id);
        if (currentUser) localStorage.setItem(`pos_caja_${currentUser.id}`, id);
    };
    const chooseBranch = (id: string) => {
        if (!id) return;
        setSelectedBranchId(id);
        const first = cajas.find(c => c.branchId === id && c.isActive);
        if (first) chooseCaja(first.id);
    };

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

    // El overlay del cambio se auto-cierra a los 5s; ESC o clic lo cierran de inmediato.
    useEffect(() => {
        if (changeOverlay === null) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); setChangeOverlay(null); } };
        window.addEventListener('keydown', onKey, true);
        const timer = window.setTimeout(() => setChangeOverlay(null), 5000);
        return () => { window.removeEventListener('keydown', onKey, true); window.clearTimeout(timer); };
    }, [changeOverlay]);

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
            const defaultClient = findDefaultClient(clients);
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

    const { subtotal, globalDiscountAmount, tax, taxState, taxMunicipal, taxReduced, total } = useMemo(() => {
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

        let tx = 0, txState = 0, txMunicipal = 0, txReduced = 0;
        // Desglose IVU (PR): Estatal + Municipal para productos normales; Reducido (bucket aparte)
        // para productos cuyo departamento o categoría está marcado como tasa reducida.
        const breakdown = !!settings.taxBreakdownEnabled;
        // Exención de IVU por cliente (ej. dueños de finca): pone estatal/municipal en 0.
        // Municipal también se exenta si hay una fecha de exención vigente.
        const cli: any = selectedClient;
        const exemptState = !!cli?.taxExemptState;
        const exemptMunicipal = !!cli?.taxExemptMunicipal
            || (cli?.municipalTaxExemptionUntil && new Date(cli.municipalTaxExemptionUntil).getTime() > Date.now());
        const stateRate = exemptState ? 0 : (Number(settings.taxStateRate) || 0);
        const municipalRate = exemptMunicipal ? 0 : (Number(settings.taxMunicipalRate) || 0);
        const reducedRate = exemptState ? 0 : (Number(settings.taxReducedRate) || 0);
        const clientFullyExempt = exemptState && exemptMunicipal;
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

                if (currentUser?.isEmergencyOrderActive && item.isEmergencyTaxExempt) return;

                if (breakdown) {
                    if ((item as any).reducedTax) {
                        txReduced += taxableAmount * reducedRate;
                    } else {
                        txState += taxableAmount * stateRate;
                        txMunicipal += taxableAmount * municipalRate;
                    }
                } else {
                    // Modo clásico: cliente exento total → sin IVU; si no, ivuRate del producto o el default global.
                    if (clientFullyExempt) return;
                    const fallbackPct = (Number(settings.defaultTaxRate) || 0) * 100;
                    const rawRate = item.ivuRate != null ? Number(item.ivuRate) : fallbackPct;
                    const rate = Number.isFinite(rawRate) ? rawRate : 0;
                    tx += taxableAmount * (rate / 100);
                }
            });
            if (breakdown) tx = txState + txMunicipal + txReduced;
        }

        return { subtotal: sub, globalDiscountAmount: discountAmt, tax: tx, taxState: txState, taxMunicipal: txMunicipal, taxReduced: txReduced, total: netSubtotal + tx };
    }, [cart, selectedClient, selectedCajaId, cajas, currentUser?.isEmergencyOrderActive, generalDiscount, settings.defaultTaxRate, settings.taxBreakdownEnabled, settings.taxStateRate, settings.taxMunicipalRate, settings.taxReducedRate]);

    // Agrega al carrito una línea ya resuelta (producto simple o una variación específica).
    const addResolvedToCart = (item: CartItem) => {
        const qty = Math.max(1, item.quantity || 1);
        setCart(prev => {
            const existing = prev.find(ci => ci.id === item.id);
            if (existing) {
                return prev.map(ci => ci.id === item.id ? { ...ci, quantity: ci.quantity + qty } : ci);
            }
            return [...prev, { ...item, quantity: qty }];
        });
        setQuantityInput('1'); // la próxima línea vuelve a cantidad 1 por defecto
        pendingQtyRef.current = 1;
        if (productSearchRef.current) productSearchRef.current.focus();
    };

    const addProductToCart = (product: Product, qty: number = 1) => {
        setPosError(null);
        const q = Math.max(1, Math.floor(qty) || 1);
        pendingQtyRef.current = q; // se usa cuando el producto abre un modal (variación / precio manual)
        // Si el producto tiene variaciones, primero se elige cuál (cada una con su precio/SKU).
        if (product.hasVariations && Array.isArray(product.variations) && product.variations.length > 0) {
            setVariationProduct(product);
            return;
        }
        // Precio manual (servicios / "Solo Precio"): pedir el precio antes de agregar.
        if ((product as any).manualPrice) {
            setManualPriceProduct(product);
            return;
        }
        addResolvedToCart({ ...product, quantity: q });
    };

    // El cajero confirmó el precio manual → agrega la línea (producto o variante ya resuelta)
    // con ese precio y comentario.
    const handleAddManualPrice = (unitPrice: number, note: string) => {
        const p = manualPriceProduct;
        if (!p) return;
        addResolvedToCart({ ...p, unitPrice, quantity: pendingQtyRef.current, isManual: true, ...(note ? { note } : {}) } as CartItem);
        setManualPriceProduct(null);
    };

    // El usuario eligió una variación: se agrega como línea propia (id compuesto), conservando
    // el productId base para el descuento de inventario y el registro de la venta.
    const handleSelectVariation = (variation: ProductVariation) => {
        const p = variationProduct;
        if (!p) return;
        const resolved = {
            ...p,
            id: `${p.id}::${variation.id}`,
            productId: p.id,
            name: `${p.name} — ${variation.name}`,
            unitPrice: variation.unitPrice,
            skus: variation.sku ? [variation.sku] : p.skus,
            variationId: variation.id,
            variationName: variation.name,
            quantity: pendingQtyRef.current,
        } as CartItem;
        setVariationProduct(null);
        // Precio manual por variante: si la variante lo pide (o el producto base), abrir el modal.
        const wantsManual = variation.manualPrice != null ? variation.manualPrice : (p as any).manualPrice;
        if (wantsManual) { setManualPriceProduct(resolved as any); return; }
        addResolvedToCart(resolved);
    };

    // El usuario eligió el PRODUCTO BASE (sin variación): se agrega con su precio base.
    const handleSelectBase = () => {
        const p = variationProduct;
        if (!p) return;
        addResolvedToCart({ ...p, quantity: pendingQtyRef.current });
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
            toast.success(t('posx.cashier.product_added', { name: product.name }));
        } else if (results.length > 1) {
            toast.error(t('posx.cashier.code_multiple_matches', { code }));
        } else {
            toast.error(t('posx.cashier.code_not_found', { code }));
        }
    }, [searchProductsRemote]);

    const updateQuantity = (productId: string, quantity: number) => {
        setPosError(null);
        setCart(prev => {
            if (quantity <= 0) return prev.filter(item => item.id !== productId);
            return prev.map(item => item.id === productId ? { ...item, quantity } : item);
        });
    };

    // Comentario por línea ("Modificar Línea").
    const updateItemNote = (id: string, note: string) => {
        setCart(prev => prev.map(item => item.id === id ? { ...item, note: note || undefined } : item));
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
        const defaultClient = findDefaultClient(clients);
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
            setPosError(t('posx.cashier.err_empty_cart_payment'));
            return;
        }
        if (!selectedClient) {
            setPosError(t('posx.cashier.err_no_client_payment'));
            return;
        }
        setInitialPaymentMethod(method);
        setActiveModal('payment');
    };

    const handleFinalizeSale = async (payments: { method: string; amount: number; reference?: string }[], changeDue?: number, allowOversell = false) => {
         if (cart.length === 0 || !currentUser || !selectedCajaId || !selectedBranchId) {
            toast.error(t('posx.cashier.err_cannot_complete_sale'));
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
            items: cart.map(it => ({ name: it.name, quantity: it.quantity, unitPrice: it.unitPrice, note: it.note })),
            subtotal, tax, discount: globalDiscountAmount, total,
            ...(settings.taxBreakdownEnabled ? { taxState, taxMunicipal, taxReduced } : {}),
            // En el RECIBO, la línea de efectivo muestra lo que el cliente ENTREGÓ (aplicado + cambio),
            // no solo lo aplicado. El cambio se resta abajo. (No afecta el pago real registrado al cuadre.)
            payments: (() => {
                let restanteCambio = changeDue || 0;
                return payments.map(p => {
                    if (restanteCambio > 0.001 && /efectivo|cash/i.test(p.method)) {
                        const conEntregado = { method: p.method, amount: p.amount + restanteCambio, reference: p.reference };
                        restanteCambio = 0;
                        return conEntregado;
                    }
                    return { method: p.method, amount: p.amount, reference: p.reference };
                });
            })(),
            changeDue: changeDue || 0,
            clientName: selectedClient ? `${selectedClient.name} ${selectedClient.lastName || ''}`.trim() : undefined,
            cashierName: operatorName,
        };

        setActiveModal(null);

        let created: any;
        try {
            created = await addSale({
                items: cart,
                totalAmount: total,
                subtotal,
                taxAmount: tax,
                ...(settings.taxBreakdownEnabled ? { taxState, taxMunicipal, taxReduced } : {}),
                discountAmount: globalDiscountAmount,
                paymentMethod: paymentMethodString,
                paymentStatus: payments.some(p => p.method === 'Crédito C.') ? 'Pendiente de Pago' : 'Pagado',
                payments,
                clientId: selectedClient?.id,
                projectId: selectedProjectId || undefined,
                cajaId: selectedCajaId,
                employeeId: operatorUserId || currentUser.id,
                cashierName: operatorName,
                operatorUserId: operatorUserId,
                isExternal: isExternalSale,
                allowOversell,
            } as any, selectedBranchId);
        } catch (err: any) {
            // La venta NO se guardó: mostramos un modal claro y conservamos el carrito para reintentar.
            // Guardamos el intento (pagos/vuelto) por si el usuario confirma vender sin stock (sobreventa).
            setPendingSaleRetry({ payments, changeDue });
            setSaleError({ message: err?.message || 'No se pudo registrar la venta.', code: err?.code });
            return;
        }

        // Abrir la gaveta si está habilitada y la venta involucra efectivo (o hay vuelto).
        const involvesCash = payments.some(p => /efectivo|cash/i.test(p.method)) || (changeDue || 0) > 0;
        if (isCashDrawerEnabled() && involvesCash) {
            openCashDrawer().catch(err => toast.error(t('posx.cashier.drawer_error', { msg: err?.message || t('posx.cashier.drawer_open_failed') })));
        }

        // Mostrar la factura con el folio secuencial del negocio (Factura #N).
        const folio = (created as any)?.saleNumber;
        const saleNumber = folio ? String(folio) : `V-${Date.now().toString().slice(-6)}`;
        setLastReceipt({ ...receiptSnapshot, saleNumber });

        // (Sin overlay grande de cambio: el cambio ya se ve en el modal de pago "Cambio a Devolver"
        //  y en el recibo. Antes salía a pantalla completa; el cliente pidió quitarlo.)

        clearCart();
    };

    // Apertura manual de la gaveta ("Sin venta"): exige razón + PIN (se registra en el turno).
    const handleOpenDrawer = () => {
        setShowDrawerOpen(true);
    };

    // Confirmación del modal: registra el movimiento DRAWER_OPEN (razón + quién) y abre la gaveta.
    const handleConfirmDrawerOpen = async (reason: string) => {
        if (selectedCajaId) {
            try {
                await cajasService.recordCashMovement(selectedCajaId, { type: 'DRAWER_OPEN', amount: 0, reason });
            } catch (err: any) {
                // Si no se pudo registrar (p.ej. sin turno abierto), avisamos y NO abrimos la gaveta.
                toast.error(err?.message || t('posx.drawer.err_record'));
                return;
            }
        }
        openCashDrawer()
            .then(() => toast.success(t('posx.cashier.drawer_opened')))
            .catch(err => toast.error(t('posx.cashier.drawer_error', { msg: err?.message || t('posx.cashier.drawer_open_failed') })));
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
                    const defaultClient = findDefaultClient(clients);
                    setSelectedClient(defaultClient || null);
                }
            } else {
                // If no clientId in recalled cart, reset to default
                const defaultClient = findDefaultClient(clients);
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
            toast.success(t('posx.cashier.estimate_loaded', { count: pendingEstimateData.items.length }));
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
            toast.success(t('posx.cashier.estimate_loaded', { count: items.length }));
        } catch {
            sessionStorage.removeItem('pazzi_estimate_to_convert');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPosAuthenticated, currentSession]);

    const handleCreateEstimateFromCart = (manualName?: string, manualAddress?: string, manualPhone?: string) => {
        if (!currentUser || !selectedClient || cart.length === 0 || !selectedBranchId) {
            toast.error(t('posx.cashier.err_estimate_missing_data'));
            return;
        }

        // Público General: guardamos nombre/teléfono/dirección de la persona en las notas (el estimado
        // no tiene cliente real). Así se ve a quién es el estimado en la lista y el PDF.
        const trimmedName = (manualName || '').trim();
        const parts: string[] = [];
        if (trimmedName) parts.push(`Estimado para: ${trimmedName}`);
        if ((manualPhone || '').trim()) parts.push(`Tel: ${manualPhone!.trim()}`);
        if ((manualAddress || '').trim()) parts.push(`Dirección: ${manualAddress!.trim()}`);
        parts.push('Generado desde Punto de Venta (POS).');
        const notes = parts.join('. ');

        const newEstimateData: Omit<Estimate, 'id'> = {
            date: new Date().toISOString(),
            clientId: selectedClient.id,
            items: cart,
            totalAmount: total,
            status: EstimateStatus.BORRADOR,
            notes,
            employeeId: currentUser.id,
            branchId: selectedBranchId
        };

        addEstimate(newEstimateData);

        toast.success(t('posx.cashier.estimate_created', { name: trimmedName || selectedClient.name }));
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
            toast.success(result.message || t('posx.cashier.return_processed', { amount: result.refundAmount.toFixed(2) }));
            // Resultado del reembolso automático por AgilPay, si aplicó.
            if (result.agilpayRefund) {
                if (result.agilpayRefund.ok) toast.success(`AgilPay: ${result.agilpayRefund.message}`);
                else toast.warning(`AgilPay: ${result.agilpayRefund.message}`);
            }
            setActiveModal(null);
        } catch (err: any) {
            toast.error(err?.message || t('posx.cashier.err_return_processing'));
        }
    };


    const isShiftActive = isPosAuthenticated && shiftState?.active;
    
    const currentCajaName = cajas.find(c => c.id === selectedCajaId)?.name || '0008';
    const isCurrentCajaExternal = cajas.find(c => c.id === selectedCajaId)?.isExternal;
    // Color del diseño asignado a la caja activa (acento del header). Externa mantiene el ámbar.
    const currentCajaColor = getCajaDesign(cajas.find(c => c.id === selectedCajaId)?.design).color;
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
        ...(isCashDrawerEnabled() ? [{ text: t('posx.cashier.drawer'), icon: <BanknotesIcon />, color: 'bg-[#5D4037]', onClick: handleOpenDrawer }] : []),
        { text: t('posx.cashier.cash_up'), icon: <DocumentTextIcon />, color: 'bg-[#00695C]', shortcut: 'F7', onClick: () => setActiveModal('dailyClose') },
        { text: t('pos.reprint'), icon: <PrinterIcon />, color: 'bg-[#546E7A]', onClick: () => setActiveModal('reprint') },
        { text: t('pos.user'), icon: <UserKeyIcon />, color: 'bg-[#3949AB]', onClick: () => setActiveModal('userSwitch') },
    ];
    
    // UI Render
    if (!isPosAuthenticated) {
      return <POSActionAuthModal isOpen={true} onClose={() => navigate('/')} onConfirm={handleInitialAuth} title={t('posx.cashier.register_access')} message={t('posx.cashier.register_access_msg')} />;
    }
    
    if (!shiftState?.active) {
        if (!selectedCajaId) {
            // Data has loaded but no active caja was found for this store
            if (cajaInitialized) {
                return (
                    <>
                    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-neutral-900 gap-4 p-6 text-center">
                        <ExclamationTriangleIcon className="w-14 h-14 text-amber-500" />
                        <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-200">{t('posx.cashier.no_register_title')}</h2>
                        <p className="text-neutral-500 dark:text-neutral-400 text-sm max-w-md">
                            {t('posx.cashier.no_register_body')}
                        </p>
                        <div className="flex flex-wrap justify-center gap-3 mt-2">
                            <button onClick={() => setShowCreateCaja(true)} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center gap-1`}>
                                <KeyIcon className="w-4 h-4" /> {t('posx.cashier.create_register_now')}
                            </button>
                            <button onClick={() => navigate('/')} className={BUTTON_SECONDARY_SM_CLASSES}>
                                {t('posx.cashier.back_home')}
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
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm">{t('posx.cashier.loading_pos')}</p>
                </div>
            );
        }
        const currentCajaForOpen = cajas.find(c => c.id === selectedCajaId);
        // Guard: if caja disappeared from state (race condition during refetch), show spinner
        if (!currentCajaForOpen) {
            return (
                <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-neutral-900">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3 flex-shrink-0"></div>
                    <p className="text-neutral-500 dark:text-neutral-400 text-sm">{t('posx.cashier.loading_register')}</p>
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
            <header className="flex items-center justify-between px-2 sm:px-4 py-1 flex-shrink-0 shadow-md" style={{ backgroundColor: isCurrentCajaExternal ? '#D97706' : currentCajaColor }}>
                <div className="flex items-center space-x-2 sm:space-x-3">
                    <KeyIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white opacity-75" />
                    <div className="max-w-[140px] sm:max-w-none">
                        <h1 className="text-sm sm:text-lg font-bold text-white leading-tight truncate">{t('pos.title')} ({currentCajaName})</h1>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {selectableBranches.length > 1 ? (
                                <select value={selectedBranchId} onChange={e => chooseBranch(e.target.value)} title={t('posx.cashier.branch') || 'Sucursal'}
                                    className="bg-white/15 text-white text-[10px] sm:text-xs rounded px-1.5 py-0.5 border border-white/30 focus:outline-none max-w-[120px] cursor-pointer">
                                    {selectableBranches.map(b => <option key={b.id} value={b.id} className="text-neutral-800">{b.name}</option>)}
                                </select>
                            ) : (
                                <span className="text-[10px] sm:text-sm text-white/90 truncate">{getBranchById?.(selectedBranchId)?.name || t('posx.cashier.central_branch')}</span>
                            )}
                            {cajasInSelectedBranch.length > 1 && (
                                <select value={selectedCajaId} onChange={e => chooseCaja(e.target.value)} title={t('posx.cashier.register') || 'Caja'}
                                    className="bg-white/15 text-white text-[10px] sm:text-xs rounded px-1.5 py-0.5 border border-white/30 focus:outline-none max-w-[120px] cursor-pointer">
                                    {cajasInSelectedBranch.map(c => <option key={c.id} value={c.id} className="text-neutral-800">{c.name}</option>)}
                                </select>
                            )}
                            {isCurrentCajaExternal && <span className="px-1 py-0.5 bg-black/20 rounded text-[8px] font-bold border border-white/30 text-white">{t('posx.cashier.external_badge')}</span>}
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-2 sm:space-x-6">
                    <div className="hidden xs:block">
                        <LiveClock />
                    </div>

                    {/* Ponche de empleado: a la izquierda del bloque del usuario, junto al divisor. */}
                    <button
                        onClick={() => setActiveModal('punch')}
                        title={t('posx.cashier.employee_punch_f9')}
                        className="bg-[#455A64] hover:bg-[#37474F] text-white font-bold py-1 px-1.5 sm:py-2 sm:px-4 rounded-md flex items-center space-x-1 sm:space-x-2 text-[9px] sm:text-sm shadow-sm transition-all active:scale-95"
                    >
                        <UserKeyIcon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                        <span className="hidden sm:inline">{t('posx.cashier.punch')}</span>
                        <span className="border border-white/60 rounded px-1 py-0.5 text-[8px] sm:text-[10px] font-bold leading-none">F9</span>
                    </button>

                    <div className="flex items-center space-x-2 sm:space-x-3 border-l border-white/20 pl-2 sm:pl-6">
                        <div className="text-right hidden lg:block">
                            <p className="text-[10px] uppercase tracking-wider text-white/70 font-bold leading-none mb-1">{t('posx.cashier.cashier')}</p>
                            <p className="text-sm font-bold text-white leading-tight">{operator ? operatorName : currentUser?.name}</p>
                            {operator && (
                                <button onClick={clearOperator} className="text-[9px] text-white/60 hover:text-white underline leading-none">{t('posx.cashier.operator_clear')}</button>
                            )}
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
                        title={currentUser?.role === UserRole.MANAGER ? t('posx.cashier.exit') : t('posx.cashier.close_shift')}
                        className="bg-[#B71C1C] hover:bg-red-800 text-white font-bold py-1 px-1.5 sm:py-2 sm:px-4 rounded-md flex items-center space-x-1 sm:space-x-2 text-[9px] sm:text-sm shadow-sm transition-all active:scale-95"
                    >
                        <ExitIcon className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                        <span className="hidden sm:inline">{currentUser?.role === UserRole.MANAGER ? t('posx.cashier.exit') : t('pos.close_shift')}</span>
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
                                        {(settings.loyaltyPointsPerDollar ?? 0) > 0 && (
                                            <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                                                ⭐ {selectedClient.loyaltyPoints ?? 0} {t('posx.cashier.points')}{selectedClient.loyaltyLevel ? ` · ${selectedClient.loyaltyLevel}` : ''}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex space-x-2 flex-shrink-0">
                                        {/* Opciones del cliente: pagar cuenta a crédito / ver estado de cuenta.
                                            Solo para clientes reales (no "Público General"). */}
                                        {!(selectedClient.isDefault || selectedClient.id === DEFAULT_CLIENT_ID) && (
                                            <div className="relative">
                                                <button
                                                    onClick={() => setClientMenuOpen(o => !o)}
                                                    className="inline-flex items-center gap-1 text-[10px] sm:text-xs py-1 px-2 rounded bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/20"
                                                >
                                                    {t('posx.cashier.client_options')} <span className="text-[8px]">▼</span>
                                                </button>
                                                {clientMenuOpen && (
                                                    <>
                                                        <div className="fixed inset-0 z-10" onClick={() => setClientMenuOpen(false)} />
                                                        <div className="absolute right-0 mt-1 z-20 w-52 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md shadow-lg py-1 text-sm">
                                                            <button
                                                                onClick={() => { setClientMenuOpen(false); setActiveModal('clientCredit'); }}
                                                                className="w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200"
                                                            >
                                                                💵 {t('posx.cashier.pay_account')}
                                                            </button>
                                                            <button
                                                                onClick={() => { setClientMenuOpen(false); setActiveModal('clientAccount'); }}
                                                                className="w-full text-left px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200"
                                                            >
                                                                📄 {t('posx.cashier.view_account')}
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                        <button onClick={() => setActiveModal('clientSearch')} title={t('posx.cashier.shortcut', { key: 'U' })} className="inline-flex items-center gap-1 text-[10px] sm:text-xs py-1 px-2 rounded bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900">{t('posx.cashier.change')} <span className="border border-blue-400/60 rounded px-1 text-[8px] font-bold leading-none">U</span></button>
                                        <button onClick={() => { setSelectedClient(null); setSelectedProjectId(null); setPosError(null); }} className="text-[10px] sm:text-xs py-1 px-2 rounded bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900">{t('posx.cashier.remove')}</button>
                                    </div>
                                </div>
                                <div className="mt-2">
                                    <label className="flex items-center text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1">
                                        <BriefcaseIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" /> {t('posx.cashier.associate_project')}
                                    </label>
                                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                        <select value={selectedProjectId || ''} onChange={(e) => setSelectedProjectId(e.target.value || null)} className="flex-grow text-sm sm:text-base px-3 py-1.5 sm:py-2 border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 rounded-md shadow-sm focus:ring-primary focus:border-primary">
                                            <option value="">{t('posx.cashier.general_sale_no_project')}</option>
                                            {clientProjects.map(proj => (<option key={proj.id} value={proj.id}>{proj.name}</option>))}
                                        </select>
                                        <button type="button" onClick={() => setActiveModal('createProject')} className="flex items-center justify-center flex-shrink-0 bg-green-600 hover:bg-green-700 text-white font-semibold text-xs sm:text-base py-1.5 sm:py-2 px-3 sm:px-3.5 rounded-md shadow-sm transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-green-400 dark:focus:ring-offset-neutral-800" title={t('posx.cashier.new_project_title')}>
                                            <PlusIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5"/> {t('pos.new_project')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="p-3 border-b dark:border-neutral-700">
                        <div className="flex items-center gap-2">
                            <input
                                ref={quantityInputRef}
                                type="number"
                                min="1"
                                inputMode="numeric"
                                value={quantityInput}
                                onChange={(e) => { const v = e.target.value.replace(/[^\d]/g, ''); setQuantityInput(v === '0' ? '1' : v); }}
                                onFocus={(e) => e.currentTarget.select()}
                                onBlur={() => { if (!quantityInput || quantityInput === '0') setQuantityInput('1'); }}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); productSearchRef.current?.focus(); } }}
                                disabled={!isShiftActive}
                                title={t('posx.cashier.qty_hint')}
                                aria-label={t('posx.cashier.qty_hint')}
                                className="flex-shrink-0 w-16 sm:w-20 h-12 text-center text-lg font-bold border border-neutral-400 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 disabled:opacity-40"
                            />
                            <div className="flex-grow min-w-0">
                                <ProductAutocomplete
                                    onProductSelect={(p) => addProductToCart(p, Math.max(1, parseInt(quantityInput, 10) || 1))}
                                    inputRef={productSearchRef}
                                    onRemoteSearch={searchProductsRemote}
                                    onEmptyArrowLeft={() => quantityInputRef.current?.focus()}
                                    disabled={!isShiftActive}
                                    autoFocus
                                    placeholder={t('posx.cashier.product_search_placeholder')}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowScanCamera(true)}
                                disabled={!isShiftActive}
                                title={t('posx.cashier.scan_with_camera')}
                                aria-label={t('posx.cashier.scan_with_camera')}
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
                                        <div
                                            className="flex w-full sm:col-span-6 items-center gap-3 cursor-pointer"
                                            onClick={() => setEditingLineId(item.id)}
                                            role="button"
                                            title={t('posx.cashier.edit_line')}
                                        >
                                            <div className="flex-shrink-0">
                                                <img
                                                    src={item.imageUrl || logo}
                                                    alt={item.name}
                                                    className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-md shadow-sm"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold leading-tight text-sm sm:text-base truncate">{item.name}</p>
                                                <p className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 truncate">{t('posx.cashier.ref')}: {item.skus?.[0] || 'N/A'}</p>
                                                {item.note && <p className="text-[10px] sm:text-xs text-primary italic truncate">📝 {item.note}</p>}
                                                
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
                                                    aria-label={t('posx.cashier.quantity_for', { name: item.name })}
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
                                                    title={t('posx.cashier.apply_edit_discount')}
                                                >
                                                    <TagIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                                                </button>
                                                <button 
                                                    onClick={() => handleRequestItemDelete(item)} 
                                                    className="p-1.5 sm:p-2 rounded-full text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors" 
                                                    title={t('posx.cashier.remove_product')}
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
                                        {t('posx.cashier.general_discount_active')}: {generalDiscount.type === 'percentage' ? `${generalDiscount.value}%` : `$${generalDiscount.value}`}
                                        <span className="ml-2 text-xs opacity-75">{t('posx.cashier.click_to_edit')}</span>
                                    </span>
                                ) : (
                                    t('posx.cashier.apply_general_discount')
                                )}
                            </button>
                            <div className="flex justify-end items-center gap-2 sm:gap-4 text-sm sm:text-lg">
                                <span className="text-neutral-500">{t('pos.subtotal')}:</span>
                                <span className="font-medium w-24 sm:w-32">${subtotal.toFixed(2)}</span>
                            </div>
                        </div>
                        
                        {globalDiscountAmount > 0 && (
                            <div className="flex justify-end items-center gap-2 sm:gap-4 text-sm sm:text-lg text-red-600 dark:text-red-400">
                                <span>{t('posx.cashier.global_discount')}:</span>
                                <span className="font-medium w-24 sm:w-32">-${globalDiscountAmount.toFixed(2)}</span>
                            </div>
                        )}

                        {settings.taxBreakdownEnabled ? (
                            <>
                                {taxState > 0 && (
                                    <div className="flex justify-end items-center gap-2 sm:gap-4 text-sm sm:text-lg">
                                        <span className="text-neutral-500">{t('posx.cashier.sut_state')}:</span>
                                        <span className="font-medium w-24 sm:w-32">${taxState.toFixed(2)}</span>
                                    </div>
                                )}
                                {taxMunicipal > 0 && (
                                    <div className="flex justify-end items-center gap-2 sm:gap-4 text-sm sm:text-lg">
                                        <span className="text-neutral-500">{t('posx.cashier.sut_municipal')}:</span>
                                        <span className="font-medium w-24 sm:w-32">${taxMunicipal.toFixed(2)}</span>
                                    </div>
                                )}
                                {taxReduced > 0 && (
                                    <div className="flex justify-end items-center gap-2 sm:gap-4 text-sm sm:text-lg">
                                        <span className="text-neutral-500">{t('posx.cashier.sut_reduced')}:</span>
                                        <span className="font-medium w-24 sm:w-32">${taxReduced.toFixed(2)}</span>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex justify-end items-center gap-2 sm:gap-4 text-sm sm:text-lg">
                                <span className="text-neutral-500">{t('pos.tax')}:</span>
                                <span className="font-medium w-24 sm:w-32">${tax.toFixed(2)}</span>
                            </div>
                        )}
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
                        const name = alias?.trim() || t('posx.cashier.sale_for', { name: selectedClient?.name || t('posx.cashier.walk_in') });
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
            <ClientEstimatesModal isOpen={activeModal === 'clientEstimates'} onClose={() => setActiveModal(null)} client={selectedClient} onLoadItems={handleLoadEstimatesToCart} onCreateFromCart={handleCreateEstimateFromCart} isCartEmpty={cart.length === 0} isGeneralClient={!!selectedClient?.isDefault || selectedClient?.id === DEFAULT_CLIENT_ID} />
            {selectedClient && (
                <ClientCreditPaymentModal
                    isOpen={activeModal === 'clientCredit'}
                    onClose={() => setActiveModal(null)}
                    clientId={selectedClient.id}
                    clientName={`${selectedClient.name} ${selectedClient.lastName || ''}`.trim()}
                    onPaid={() => { setActiveModal(null); }}
                />
            )}
            <ClientAccountModal isOpen={activeModal === 'clientAccount'} onClose={() => setActiveModal(null)} client={selectedClient} />
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

            <DrawerOpenModal isOpen={showDrawerOpen} onClose={() => setShowDrawerOpen(false)} onConfirm={handleConfirmDrawerOpen} />

            {/* Overlay del CAMBIO: número enorme, permanece hasta ESC (como el POS clásico). */}
            {changeOverlay !== null && (
                <div
                    className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/70 cursor-pointer"
                    onClick={() => setChangeOverlay(null)}
                    role="dialog"
                    aria-label={t('posx.cashier.change_overlay_title')}
                >
                    <p className="text-3xl sm:text-5xl font-semibold text-white/90 mb-4">{t('posx.cashier.change_overlay_title')}</p>
                    <p className="text-[24vw] sm:text-[16rem] leading-none font-extrabold text-green-400 tabular-nums drop-shadow-lg">${changeOverlay.toFixed(2)}</p>
                    <p className="mt-8 text-xl sm:text-2xl text-white/80">{t('posx.cashier.change_overlay_dismiss')}</p>
                </div>
            )}

            {/* Venta rechazada por el backend (stock/turno/etc.): aviso claro y persistente. */}
            <Modal isOpen={!!saleError} onClose={() => setSaleError(null)} title={t('posx.cashier.sale_failed_title')} size="md">
                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <ExclamationTriangleIcon className="w-9 h-9 text-red-500 flex-shrink-0" />
                        <div>
                            <p className="text-base font-medium text-neutral-800 dark:text-neutral-100">{saleError?.message}</p>
                            {saleError?.code === 'INSUFFICIENT_STOCK' && (
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{t('posx.cashier.oversell_prompt')}</p>
                            )}
                            {saleError?.code === 'CAJA_NOT_OPEN' && (
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{t('posx.cashier.caja_not_open_hint_1')}<strong>{t('posx.cashier.shift_of_register')}</strong>{t('posx.cashier.caja_not_open_hint_2')}</p>
                            )}
                        </div>
                    </div>
                    <p className="text-xs text-neutral-400">{t('posx.cashier.cart_kept_retry')}</p>
                    <div className="flex justify-end gap-2">
                        {saleError?.code === 'INSUFFICIENT_STOCK' && pendingSaleRetry && (
                            <button
                                onClick={() => {
                                    const retry = pendingSaleRetry;
                                    setSaleError(null);
                                    setPendingSaleRetry(null);
                                    // Reintenta la MISMA venta permitiendo stock negativo (sobreventa confirmada).
                                    if (retry) handleFinalizeSale(retry.payments, retry.changeDue, true);
                                }}
                                className="px-4 py-2 rounded-md text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white"
                            >
                                {t('posx.cashier.sell_anyway')}
                            </button>
                        )}
                        <button onClick={() => { setSaleError(null); setPendingSaleRetry(null); }} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
                    </div>
                </div>
            </Modal>
            {currentUser && (
                <ReprintModal
                    isOpen={activeModal === 'reprint'}
                    onClose={() => setActiveModal(null)}
                    employeeId={currentUser.id}
                    onSelectReceipt={(rs) => { setActiveModal(null); setLastReceipt(rs); }}
                />
            )}

            {/* Modificar Línea: cantidad, comentario, descuento, eliminar. */}
            <CartLineModal
                item={editingLineId ? cart.find(c => c.id === editingLineId) || null : null}
                onClose={() => setEditingLineId(null)}
                onQuantity={updateQuantity}
                onNote={updateItemNote}
                onDiscount={handleOpenDiscountModal}
                onDelete={(item) => { setEditingLineId(null); handleRequestItemDelete(item); }}
            />

            {/* Precio manual: pide el precio al agregar un producto de servicio / "Solo Precio". */}
            <ManualPriceModal
                product={manualPriceProduct}
                onClose={() => setManualPriceProduct(null)}
                onConfirm={handleAddManualPrice}
            />

            {selectedCajaId && (
                <DailyCloseModal isOpen={activeModal === 'dailyClose'} onClose={() => setActiveModal(null)} cajaId={selectedCajaId} cajaName={currentCajaName} currentCashierName={operatorName} onClosed={() => handleEndShift()} onOpenHistory={() => setActiveModal('cajaHistory')} />
            )}

            {selectedCajaId && (
                <CajaHistoryModal isOpen={activeModal === 'cajaHistory'} onClose={() => setActiveModal(null)} cajaId={selectedCajaId} cajaName={currentCajaName} />
            )}

            <PunchModal isOpen={activeModal === 'punch'} onClose={() => setActiveModal(null)} />

            {/* Selector de variación (productos con variaciones) */}
            <Modal isOpen={!!variationProduct} onClose={() => setVariationProduct(null)} title={t('posx.cashier.choose_variation_title', { name: variationProduct?.name || '' })} size="md">
                <div className="space-y-3">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('posx.cashier.choose_base_or_variation')}</p>

                    {/* Producto base (sin variación) */}
                    <button
                        onClick={handleSelectBase}
                        className="w-full flex items-center justify-between p-3 border-2 border-primary/40 bg-primary/5 rounded-md hover:bg-primary/10 hover:border-primary text-left transition-colors"
                    >
                        <span className="font-semibold text-neutral-800 dark:text-neutral-100">
                            {variationProduct?.name}
                            <span className="text-xs font-normal text-neutral-500 ml-1">{t('posx.cashier.base_product')}</span>
                        </span>
                        <span className="font-semibold text-primary">${(Number(variationProduct?.unitPrice) || 0).toFixed(2)}</span>
                    </button>

                    {(variationProduct?.variations?.length ?? 0) > 0 && (
                        <div className="flex items-center gap-2 text-xs text-neutral-400">
                            <span className="flex-1 border-t border-neutral-200 dark:border-neutral-700" />
                            {t('posx.cashier.variations')}
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
                    <CameraScanModal isOpen={showScanCamera} onClose={() => setShowScanCamera(false)} onDetected={handleCameraScan} title={t('posx.cashier.scan_product')} />
                </Suspense>
            )}
            <POSActionAuthModal isOpen={activeModal === 'deleteItemAuth'} onClose={() => setActiveModal(null)} onConfirm={handleConfirmItemDelete} title={t('posx.cashier.confirm_delete')} message={t('posx.cashier.confirm_delete_msg')} />
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
                title={t('posx.cashier.replace_cart_title')}
                message={t('posx.cashier.replace_cart_estimates_msg')}
                confirmButtonText={t('posx.cashier.yes_replace')}
            />
            <ConfirmationModal
                isOpen={showEstimateReplaceConfirm}
                onClose={() => { setPendingEstimateData(null); setShowEstimateReplaceConfirm(false); }}
                onConfirm={confirmEstimateReplace}
                title={t('posx.cashier.replace_cart_title')}
                message={t('posx.cashier.replace_cart_estimate_items_msg')}
                confirmButtonText={t('posx.cashier.yes_replace')}
            />
        </div>
    );
};