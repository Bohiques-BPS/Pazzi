
import React from 'react';

export enum UserRole {
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
  CLIENT_ECOMMERCE = 'CLIENT_ECOMMERCE', // Shopper
  CLIENT_PROJECT = 'CLIENT_PROJECT', // Project client
}

export enum UserStatus {
  INVITED = 'INVITED',
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
}

/** Configuración de la factura/recibo del POS (el admin decide qué mostrar). */
export interface ReceiptConfig {
    businessName: string;
    rnc: string;            // RNC / registro del comercio
    address: string;
    phone: string;
    email: string;
    logoUrl: string;        // URL o data URL del logo
    headerNote: string;     // mensaje arriba de la factura
    footerNote: string;     // términos legales / pie
    showLogo: boolean;
    showRnc: boolean;
    showAddress: boolean;
    showPhone: boolean;
    showEmail: boolean;
    showClient: boolean;
    showCashier: boolean;
    showTaxBreakdown: boolean;
    showFooter: boolean;
    autoPrint: boolean;     // imprimir automáticamente al finalizar
    paperSize: '80mm' | 'letter';
}

export const DEFAULT_RECEIPT_CONFIG: ReceiptConfig = {
    businessName: '',
    rnc: '',
    address: '',
    phone: '',
    email: '',
    logoUrl: '',
    headerNote: '',
    footerNote: 'Gracias por su compra.',
    showLogo: true,
    showRnc: true,
    showAddress: true,
    showPhone: true,
    showEmail: false,
    showClient: true,
    showCashier: true,
    showTaxBreakdown: true,
    showFooter: true,
    autoPrint: false,
    paperSize: '80mm',
};

/** Un método de pago configurable que aparece en la caja (estilo pasarelas de WooCommerce). */
export type PaymentMethodType = 'cash' | 'card' | 'ath_movil' | 'agilpay' | 'credit' | 'check' | 'invoice' | 'custom';
export interface PaymentMethodConfig {
    id: string;              // slug estable
    name: string;            // etiqueta mostrada (también el string `method` que se guarda en la venta)
    enabled: boolean;        // si aparece en la caja
    color: string;           // color del botón (hex)
    type: PaymentMethodType; // dispara lógica especial (crédito → pendiente, etc.)
    requiresReference: boolean;   // pide un dato (Nº cheque, confirmación ATH…)
    referenceLabel: string;       // etiqueta del dato requerido
    config?: Record<string, string>; // keys/credenciales (ej. tokens ATH Móvil)
    builtin: boolean;        // integrado (no se puede eliminar; se activa/desactiva/reordena)
}

export const DEFAULT_PAYMENT_METHODS: PaymentMethodConfig[] = [
    { id: 'efectivo', name: 'Efectivo', enabled: true, color: '#1E88E5', type: 'cash', requiresReference: false, referenceLabel: '', builtin: true },
    { id: 'tarjeta', name: 'Tarjeta', enabled: true, color: '#1E88E5', type: 'card', requiresReference: false, referenceLabel: '', builtin: true },
    { id: 'ath', name: 'ATH Móvil', enabled: true, color: '#D81B60', type: 'ath_movil', requiresReference: true, referenceLabel: 'Nº de confirmación', config: { publicToken: '', privateToken: '', environment: 'production' }, builtin: true },
    { id: 'agilpay', name: 'AgilPay', enabled: false, color: '#2E7D32', type: 'agilpay', requiresReference: false, referenceLabel: 'Nº de transacción AgilPay', config: { merchantKey: '', clientId: '', clientSecret: '', environment: 'sandbox' }, builtin: true },
    { id: 'credito', name: 'Crédito C.', enabled: true, color: '#039BE5', type: 'credit', requiresReference: false, referenceLabel: '', builtin: true },
    { id: 'cheque', name: 'Cheque', enabled: true, color: '#00897B', type: 'check', requiresReference: true, referenceLabel: 'Nº de cheque', builtin: true },
    { id: 'factura', name: 'Factura', enabled: true, color: '#7CB342', type: 'invoice', requiresReference: false, referenceLabel: '', builtin: true },
];

export interface GlobalSettings {
    timezone: string;
    numberFormat: 'comma_decimal' | 'dot_decimal'; // comma_decimal = 1,000.00; dot_decimal = 1.000,00
    language: 'es' | 'en';
    fontSize: 'sm' | 'md' | 'lg';
    defaultTaxRate: number; // Universal IVU
    receiptConfig: ReceiptConfig;
    paymentMethods: PaymentMethodConfig[];
}

export interface AlertSettings {
  // Key is the alert type, value is its configuration
  [alertType: string]: {
    enabled: boolean;
    threshold?: number; // For value-based alerts
    email: string;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  lastName: string;
  role: UserRole;
  status?: UserStatus;
  isEmergencyOrderActive: boolean;
  /** Mapa de permisos granulares: { 'products.view': true, ... }. MANAGER recibe todos true. */
  permissions?: EmployeePermissions;
  profilePictureUrl?: string;
  alertSettings?: AlertSettings;
  pin?: string;
  lastLoginAt?: string;
}

export interface Branch {
    id: string;
    name: string;
    address: string;
    phone: string;
    isActive: boolean;
}

export interface Caja {
    id: string;
    name: string;
    branchId: string;
    isActive: boolean;
    /** Etiqueta UI (PR usa "IVU"). En el BE el campo se llama `applyIVA`. Mantenemos ambos opcionales por compatibilidad. */
    applyIVU: boolean;
    applyIVA?: boolean;
    isExternal?: boolean;
    currentSession?: {
        id: string;
        openedByUser?: { id: string; name: string; lastName: string };
        openedAt: string;
    } | null;
}

export interface ProductVariation {
    id: string;
    name: string;
    unitPrice: number;
    sku?: string;
}

export interface ProductPriceLevel {
    id: string;
    levelName: string;
    price: number;
}

export interface CustomSpecification {
    name: string;
    value: string;
}

export interface Product {
    id: string;
    name: string;
    unitPrice: number;
    stockByBranch: { branchId: string; quantity: number }[];
    description?: string;
    imageUrl?: string;
    skus: string[];
    category?: string;
    categoryId?: string;
    ivuRate?: number;
    storeOwnerId: string;
    isEmergencyTaxExempt: boolean;
    material?: string;
    quality?: string;
    width?: number;
    length?: number;
    height?: number;
    weight?: number;
    isService?: boolean;
    compatibility?: string;
    supplierId?: string;
    hasVariations?: boolean;
    variations?: ProductVariation[];
    barcode2?: string;
    isActive?: boolean;
    barcode13Digits?: string;
    chainCode?: string;
    manufacturer?: string;
    costPrice?: number;
    profit?: number;
    supplierProductCode?: string;
    departmentId?: string;
    family?: string;
    physicalLocation?: string;
    displayOnScreen?: boolean;
    requiresSerialNumber?: boolean;
    creationDate?: string;
    useKitchenPrinter?: boolean;
    useBarcodePrinter?: boolean;
    availableStock?: number; // This might be a computed property in some contexts
    hasPriceLevels?: boolean;
    priceLevels?: ProductPriceLevel[];
    customSpecifications?: CustomSpecification[]; // New field

    // ── Campos avanzados / importación (todos opcionales) ──
    supplier2Name?: string;
    priceLevel1?: number; priceLevel2?: number; priceLevel3?: number;
    handlingCost?: number; supplierCost?: number; lastCost?: number;
    taxValue?: number; specialTax?: number;
    reorderMin?: number; reorderMax?: number; leadTimeDays?: number;
    orderMethod?: string; suggestedOrder?: number; suggestedPurchase?: number;
    suggestedOrderCost?: number; suggestedOrderUnit?: number;
    unitsPerReceipt?: number; unitsPerSale?: number; conversionFactor?: number; weightType?: string;
    model?: string; yearFrom?: number; yearTo?: number; isOriginal?: boolean; substitute?: string; serie?: string;
    cityTaxable?: boolean; stateTaxable?: boolean; isFood?: boolean;
    isWic?: boolean; isSss?: boolean; isCoop?: boolean; isAlcohol?: boolean; isTobacco?: boolean; isSpecial?: boolean;
    commissionType?: string; commissionValue?: number;
    fifoCount?: boolean; isPerpetual?: boolean; printLabel?: boolean; manualPrice?: boolean;
    allowDiscount?: boolean; isEcommerce?: boolean; isRaffle?: boolean;
    priceFlag?: string; companyId?: string; spareNum?: number; spareText?: string; productComment?: string;
    receivedQty?: number; orderedQty?: number; soldQty?: number; purchasedQty?: number; reservedQty?: number;
    lastSaleDate?: string; lastReceiptDate?: string; minAlertDate?: string;
}

export interface ProductStockInfo extends Product {
    stockAtBranch: number;
    totalStockAcrossAllBranches: number;
}


export interface Category {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    storeOwnerId: string;
    _count?: { products: number };
}

export interface Department {
    id: string;
    name: string;
    storeOwnerId: string;
    _count?: { products: number };
}

export interface Client {
    id: string;
    name: string;
    lastName: string;
    email: string;
    phone?: string;
    address?: string;
    clientType: 'Particular' | 'Empresa';
    acquisitionSource?: string;
    isActive: boolean;
    isDefault?: boolean; // Cliente "Público General" de mostrador (venta al público)
    creditLimit?: number;
    paymentTerms?: string;
    category?: string;
    loyaltyLevel?: string;
    companyName?: string;
    taxId?: string;
    contactPersonName?: string;
    industry?: string;
    preferredCommunication?: 'Email' | 'Teléfono' | 'WhatsApp' | 'Otro';
    city?: string;
    country?: string;
    zip?: string;
    phone2?: string;
    fax?: string;
    socialSecurity?: string;
    dateOfBirth?: string;
    clientNotes?: string;
    stateTaxRate?: number;
    municipalTaxRate?: number;
    municipalTaxExemptionUntil?: string;
    billingAddress?: string;
    showBalance?: boolean;
    salesperson?: string;
    priceLevel?: string;
    businessType?: string;
    zone?: string;
    balance?: number;
    specialInvoiceMessageEnabled?: boolean;
    chargeType?: 'discountOnPrice' | 'markupOnCost';
    chargeValueType?: 'percentage' | 'fixed';
    chargeValue?: number;
    chargeCode?: string;
    images?: string[];
    loyaltyPoints?: number;
    shippingAddress?: string;
    shippingContactName?: string;
    shippingContactPhone?: string;
    preferredCarrier?: string;
    projectIds?: string[];
    createdDate?: string;
    isLoss?: boolean; // New: Marks client as a loss/bad debt
}

/**
 * Mapa flexible de permisos granulares. Las keys vienen del catálogo del backend
 * (GET /api/permissions/catalog). MANAGER recibe automáticamente todos en true.
 *
 * Ejemplos de keys: 'products.view', 'pos.sell', 'caja.open', 'employees.manage'.
 */
export type EmployeePermissions = Record<string, boolean>;

/** Una entrada del catálogo expuesto por el backend. */
export interface PermissionDef {
    key: string;
    label: string;
    description?: string;
}

export interface PermissionCategory {
    key: string;
    label: string;
    permissions: PermissionDef[];
}

export interface Employee {
    id: string;
    name: string;
    lastName: string;
    email: string;
    role: string;
    hireDate?: string;
    address?: string;
    phone?: string;
    emergencyContactName?: string;
    emergencyContactRelationship?: string;
    emergencyContactPhone?: string;
    department?: string;
    salary?: number;
    bankName?: string;
    bankAccountNumber?: string;
    socialSecurityNumber?: string;
    profilePictureUrl?: string;
    permissions?: EmployeePermissions;
    pin?: string;
}

export enum ProjectStatus {
    PENDING = 'Pendiente',
    ACTIVE = 'Activo',
    PAUSED = 'En Pausa',
    COMPLETED = 'Completado',
}

export type ProjectWorkMode = 'daysOnly' | 'daysAndTimes' | 'dateRange';

export interface WorkDayTimeRange {
    date: string;
    startTime: string;
    endTime: string;
    assignedEmployeeIds?: string[];
}

export interface ProjectResource {
    productId: string;
    quantity: number;
}

export interface CustomProjectResource {
    id: string; // for key prop in UI
    name: string;
    quantity: number;
    unitPrice?: number;
}

export enum ProjectPriority {
    LOW = 1,
    MEDIUM = 2,
    HIGH = 3,
}

export interface Project {
    id: string;
    name: string;
    clientId: string;
    status: ProjectStatus;
    description?: string;
    assignedProducts: ProjectResource[];
    customProducts?: CustomProjectResource[];
    assignedEmployeeIds: string[];
    visitDate?: string;
    visitTime?: string;
    workMode: ProjectWorkMode;
    workDays: string[];
    workDayTimeRanges: WorkDayTimeRange[];
    workStartDate?: string;
    workEndDate?: string;
    // New fields
    purchaseOrder?: string;
    projectKey?: string;
    priority?: ProjectPriority;
    // For invoicing
    invoiceGenerated?: boolean;
    invoiceNumber?: string;
    invoiceDate?: string;
    invoiceAmount?: number;
    paymentDueDate?: string;
}

export type CartItem = Product & {
    quantity: number;
    discount?: {
        type: 'percentage' | 'fixed';
        value: number;
    };
};

export interface Sale {
    id: string;
    date: string;
    totalAmount: number;
    items: CartItem[];
    paymentMethod: string;
    cajaId: string;
    employeeId: string;
    branchId: string;
    paymentStatus: 'Pagado' | 'Pendiente de Pago' | 'Anulado' | 'Devolución Parcial' | 'Devolución Completa';
    clientId?: string;
    projectId?: string; // Link to project
    dueDate?: string; // For receivables
    receivableNotes?: string; // For receivables
    relatedEstimateIds?: string[]; // To track which estimates were converted
    isReturn?: boolean;
    originalSaleId?: string;
    isExternal?: boolean; // New: Indicates if this sale was made on an external register
    payments?: { method: string; amount: number }[]; // Added for multiple payments
}

export enum EstimateStatus {
    BORRADOR = 'Borrador',
    ENVIADO = 'Enviado',
    ACEPTADO = 'Aceptado',
    RECHAZADO = 'Rechazado',
    EXPIRADO = 'Expirado',
    COMBINADO = 'Combinado',
}

export interface Estimate {
    id: string;
    date: string;
    clientId: string;
    items: CartItem[];
    totalAmount: number;
    status: EstimateStatus;
    notes?: string;
    employeeId: string;
    branchId: string;
    expiryDate?: string;
}

export enum InventoryLogType {
    SALE_POS = 'Venta POS',
    SALE_ECOMMERCE = 'Venta Online',
    SUPPLIER_RECEPTION = 'Recepción Proveedor',
    RETURN = 'Devolución',
    ADJUSTMENT_MANUAL = 'Ajuste Manual',
    TRANSFER_OUT = 'Transferencia Salida',
    TRANSFER_IN = 'Transferencia Entrada',
}

export interface InventoryLog {
    id: string;
    productId: string;
    branchId: string;
    date: string;
    type: InventoryLogType;
    quantityChange: number;
    stockBefore: number;
    stockAfter: number;
    referenceId?: string;
    employeeId: string;
    notes?: string;
    product?: { id: string; name: string };
    branch?: { id: string; name: string };
    employee?: { id: string; name: string; lastName: string };
}

export interface Order {
    id: string;
    date: string;
    clientName: string;
    clientEmail: string;
    shippingAddress: string;
    totalAmount: number;
    items: CartItem[];
    status: 'Pendiente' | 'Enviado' | 'Completado' | 'Cancelado';
    storeOwnerId: string;
    paymentMethod: string;
    city?: string;
    postalCode?: string;
}

export enum VisitStatus {
    PROGRAMADO = 'Programado',
    COMPLETADO = 'Completado',
    REAGENDADO = 'Reagendado',
    CANCELADO = 'Cancelado',
}

export interface Visit {
    id: string;
    projectId?: string;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    assignedEmployeeIds: string[];
    status: VisitStatus;
    notes?: string;
}

export interface ChatMessage {
    id: string;
    projectId: string;
    senderId: string;
    senderName: string;
    timestamp: string;
    text: string;
}

export type ECommerceTemplate = 'Moderno' | 'Catalogo' | 'Clasico' | 'Minimalista';

export interface ECommerceSettings {
    storeName: string;
    logoUrl: string;
    template: ECommerceTemplate;
    primaryColor: string;
    // Tema / branding
    secondaryColor?: string;
    accentColor?: string;
    bannerUrl?: string | null;
    tagline?: string | null;
    description?: string | null;
    // Contacto / redes
    contactEmail?: string | null;
    contactPhone?: string | null;
    whatsapp?: string | null;
    address?: string | null;
    facebook?: string | null;
    instagram?: string | null;
    // Comercial
    currency?: string;
    isActive?: boolean;
    // Envío
    shippingEnabled?: boolean;
    shippingCost?: number;
    freeShippingThreshold?: number | null;
    shippingNote?: string | null;
    // Pagos: lista separada por comas — "cash,card,transfer,whatsapp,ath"
    paymentMethods?: string;
}

export interface Supplier {
    id: string;
    name: string;
    contactName?: string;
    email: string;
    phone?: string;
    address?: string;
    storeOwnerId?: string;
}

export enum SupplierOrderStatus {
    BORRADOR = 'Borrador',
    PEDIDO = 'Pedido',
    ENVIADO = 'Enviado',
    RECIBIDO_PARCIALMENTE = 'Recibido Parcialmente',
    RECIBIDO_COMPLETO = 'Recibido Completo',
    CANCELADO = 'Cancelado',
}

export interface SupplierOrderItem {
    productId: string;
    quantityOrdered: number;
    unitCost: number;
}

export interface SupplierOrder {
    id: string;
    supplierId: string;
    orderDate: string;
    expectedDeliveryDate?: string;
    items: SupplierOrderItem[];
    status: SupplierOrderStatus;
    totalCost: number;
    storeOwnerId: string;
    amountPaid: number;
    paymentStatus: 'No Pagado' | 'Pagado Parcialmente' | 'Pagado Completo';
    paymentNotes?: string[];
    supplier?: Supplier;
}

export type NotificationType = 'new_order' | 'chat_message' | 'low_stock' | 'generic';

export interface Notification {
    id: string;
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    link?: string;
    type: NotificationType;
    icon?: React.ComponentType<any>;
}


export enum AppModule {
    TIENDA = 'Tienda',
    PROJECT_MANAGEMENT = 'Gestión de Proyectos',
    POS = 'Punto de Venta',
    ECOMMERCE = 'E-commerce',
    ADMINISTRACION = 'Administración',
    PROJECT_CLIENT_DASHBOARD = 'Portal Cliente',
}


// --- Form Data Types ---
export type CategoryFormData = Pick<Category, 'name'> & { description?: string; imageUrl?: string };
export type DepartmentFormData = Pick<Department, 'name'>;

export type ProductFormData = Omit<Product, 'id' | 'stockByBranch'> & {
  initialBranchId?: string;
  initialStock?: number;
};

export type ClientFormData = Omit<Client, 'id' | 'createdDate'>;

export interface EmployeeFormData extends Omit<Employee, 'id'> {
    password?: string;
    confirmPassword?: string;
    pin?: string;
    confirmPin?: string;
}

export type ProjectFormData = Omit<Project, 'id' | 'invoiceGenerated' | 'invoiceNumber' | 'invoiceDate' | 'invoiceAmount' | 'paymentDueDate'>;

export type VisitFormData = Omit<Visit, 'id'>;

export type SupplierFormData = Omit<Supplier, 'id' | 'storeOwnerId'>;

export type SupplierOrderFormData = Omit<SupplierOrder, 'id' | 'totalCost' | 'storeOwnerId' | 'amountPaid' | 'paymentStatus' | 'paymentNotes'>;

export type BranchFormData = Omit<Branch, 'id'>;

export type CajaFormData = Omit<Caja, 'id'>;

export type EstimateFormData = Omit<Estimate, 'id' | 'date' | 'totalAmount' | 'employeeId' | 'branchId'>;

export interface HeldCart {
    id: string;
    name: string;
    items: CartItem[];
    totalAmount: number;
    date: string;
    clientId?: string;
}

export interface SalePayment {
    id: string;
    saleId?: string; // For regular sales
    layawayId?: string; // For layaway payments
    paymentDate: string;
    amountPaid: number;
    paymentMethodUsed: string;
    notes?: string;
    attachment?: string; // Data URL of the attachment
}

export enum LayawayStatus {
    ACTIVO = 'Activo',
    COMPLETADO = 'Completado',
    CANCELADO = 'Cancelado',
}

export interface Layaway {
    id: string;
    date: string;
    clientId: string;
    items: CartItem[];
    totalAmount: number;
    status: LayawayStatus;
    notes?: string;
    branchId: string;
    employeeId: string;
}

// --- Task Management Types ---
export enum TaskStatus {
    TODO = 'Tareas por realizar',
    IN_PROGRESS = 'En progreso',
    FOR_APPROVAL = 'Para aprobar',
    DONE = 'Hecho'
}

export interface Task {
    id: string;
    projectId: string;
    title: string;
    description?: string;
    status: TaskStatus;
    archived: boolean;
    order: number; // For sorting within a column
    assignedEmployeeIds?: string[];
    dueDate?: string | null;   // ISO date string (YYYY-MM-DD)
    priority?: 'low' | 'medium' | 'high' | 'urgent' | null;
}

export interface TaskComment {
    id: string;
    taskId: string;
    senderId: string;
    senderName: string;
    timestamp: string;
    text: string;
}
