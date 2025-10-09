import React from 'react';

export enum UserRole {
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
  CLIENT_ECOMMERCE = 'CLIENT_ECOMMERCE', // Shopper
  CLIENT_PROJECT = 'CLIENT_PROJECT', // Project client
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
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
  isEmergencyOrderActive: boolean;
  permissions?: EmployeePermissions;
  profilePictureUrl?: string;
  alertSettings?: AlertSettings;
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
    applyIVA: boolean;
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


export interface Product {
    id: string;
    name: string;
    unitPrice: number;
    stockByBranch: { branchId: string; quantity: number }[];
    description?: string;
    imageUrl?: string;
    skus: string[];
    category?: string;
    ivaRate?: number;
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
}

export interface ProductStockInfo extends Product {
    stockAtBranch: number;
    totalStockAcrossAllBranches: number;
}


export interface Category {
    id: string;
    name: string;
    storeOwnerId: string;
}

export interface Department {
    id: string;
    name: string;
    storeOwnerId: string;
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
}

export interface EmployeePermissions {
    viewProjectManagement: boolean;
    manageProjects: boolean;
    accessPOSCashier: boolean;
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
}

export interface ProjectResource {
    productId: string;
    quantity: number;
}

export interface Project {
    id: string;
    name: string;
    clientId: string;
    status: ProjectStatus;
    description?: string;
    assignedProducts: ProjectResource[];
    assignedEmployeeIds: string[];
    visitDate?: string;
    visitTime?: string;
    workMode: ProjectWorkMode;
    workDays: string[];
    workDayTimeRanges: WorkDayTimeRange[];
    workStartDate?: string;
    workEndDate?: string;
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
    referenceId?: string; // Sale ID, Order ID, Transfer ID, etc.
    employeeId: string;
    notes?: string;
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

export interface ECommerceSettings {
    storeName: string;
    logoUrl: string;
    template: 'Moderno' | 'Clasico' | 'Minimalista';
    primaryColor: string;
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
    icon?: React.ReactNode;
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
export type CategoryFormData = Pick<Category, 'name'>;
export type DepartmentFormData = Pick<Department, 'name'>;

export type ProductFormData = Omit<Product, 'id' | 'stockByBranch'>;

export type ClientFormData = Omit<Client, 'id' | 'createdDate'>;

export interface EmployeeFormData extends Omit<Employee, 'id'> {
    password?: string;
    confirmPassword?: string;
}

export type ProjectFormData = Omit<Project, 'id' | 'invoiceGenerated' | 'invoiceNumber' | 'invoiceDate' | 'invoiceAmount' | 'paymentDueDate'>;

export type VisitFormData = Omit<Visit, 'id'>;

export type SupplierFormData = Omit<Supplier, 'id' | 'storeOwnerId'>;

export type SupplierOrderFormData = Omit<SupplierOrder, 'id' | 'totalCost' | 'storeOwnerId' | 'amountPaid' | 'paymentStatus'>;

export type BranchFormData = Omit<Branch, 'id'>;

export type CajaFormData = Omit<Caja, 'id'>;

export type EstimateFormData = Omit<Estimate, 'id' | 'date' | 'totalAmount' | 'employeeId' | 'branchId'>;

export interface HeldCart {
    id: string;
    name: string;
    items: CartItem[];
    totalAmount: number;
    date: string;
}

export interface SalePayment {
    id: string;
    saleId?: string; // For regular sales
    layawayId?: string; // For layaway payments
    paymentDate: string;
    amountPaid: number;
    paymentMethodUsed: string;
    notes?: string;
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
}

export interface TaskComment {
    id: string;
    taskId: string;
    senderId: string;
    senderName: string;
    timestamp: string;
    text: string;
}