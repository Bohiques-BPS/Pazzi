export enum UserRole {
  MANAGER = 'Gerente',
  EMPLOYEE = 'Empleado',
  CLIENT_ECOMMERCE = 'Cliente E-commerce', // Shopper
  CLIENT_PROJECT = 'Cliente de Proyecto', // Project specific access
  // CLIENT = 'Cliente', // Deprecating general Client role
}

export interface User {
  id: string;
  email: string;
  name?: string;
  lastName?: string;
  role: UserRole;
  purchaseCode?: string;
  isEmergencyOrderActive?: boolean; // New: Flag for user's emergency order mode
}

export interface Category {
  id: string;
  name: string;
  storeOwnerId?: string;
}

export interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  isActive: boolean;
}

export interface Caja {
  id: string;
  name: string;
  branchId: string;
  isActive: boolean;
  applyIVA: boolean; // If sales from this POS terminal should apply IVA
}

export interface Product {
  id: string;
  name: string;
  unitPrice: number;
  stockByBranch: Array<{ branchId: string; quantity: number }>;
  description?: string;
  imageUrl?: string;
  skus?: string[];
  category?: string;
  ivaRate?: number; // Product-specific IVA rate (e.g., 0.16 for 16%)
  storeOwnerId: string;

  barcode2?: string;
  isActive?: boolean;
  isService?: boolean;

  barcode13Digits?: string;
  chainCode?: string;
  manufacturer?: string;
  supplierId?: string;
  costPrice?: number;
  supplierProductCode?: string;

  department?: string;
  family?: string;
  physicalLocation?: string;

  displayOnScreen?: boolean;
  requiresSerialNumber?: boolean;
  creationDate?: string;

  useKitchenPrinter?: boolean;
  useBarcodePrinter?: boolean;

  availableStock?: number; // This might represent total stock or stock for a default/primary location
  isEmergencyTaxExempt?: boolean; // New field for emergency tax exemption
}

export interface ProductStockInfo extends Product {
  stockAtBranch: number;
  totalStockAcrossAllBranches?: number; // Added for clarity in stock adjustment
}

export interface Client {
  id:string;
  name: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  billingAddress?: string;
  // New fields for enhanced client information
  clientType?: 'Particular' | 'Empresa';
  companyName?: string;
  taxId?: string; // For RFC, NIF, CUIT, etc.
  contactPersonName?: string; // If clientType is 'Empresa'
  preferredCommunication?: 'Email' | 'Teléfono' | 'WhatsApp' | 'Otro';
  clientNotes?: string;
  industry?: string; // e.g., "Restauración", "Retail", "Servicios Profesionales"
  acquisitionSource?: string; // e.g., "Referido por X", "Búsqueda Web", "Redes Sociales"
}

export interface EmployeePermissions {
  viewProjectManagement?: boolean;
  manageProjects?: boolean;
  accessPOSCashier?: boolean;
  // manageSiteContent?: boolean; // Example for future expansion
}

export interface Employee {
  id: string;
  name: string;
  lastName: string;
  email: string;
  role: string; // This will be "Puesto"
  address?: string;
  phone?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  hireDate?: string; // YYYY-MM-DD
  department?: string;
  salary?: number;
  bankName?: string;
  bankAccountNumber?: string;
  socialSecurityNumber?: string; // Sensitive data
  profilePictureUrl?: string;
  permissions?: EmployeePermissions; // Added permissions field
}

export enum ProjectStatus {
  ACTIVE = 'Activo',
  COMPLETED = 'Completado',
  PAUSED = 'Pausado',
  PENDING = 'Pendiente'
}

export interface ProjectResource {
  productId: string;
  quantity: number;
}

export type WorkDayTimeRange = {
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
};

export type ProjectWorkMode = 'daysOnly' | 'daysAndTimes' | 'dateRange';

export interface Project {
  id: string;
  name: string;
  clientId: string;
  status: ProjectStatus;
  description?: string;
  assignedProducts: ProjectResource[];
  assignedEmployeeIds: string[];
  // New fields for visit and work scheduling
  visitDate?: string; // YYYY-MM-DD, optional initial visit
  visitTime?: string; // HH:MM, optional initial visit time
  workMode?: ProjectWorkMode; // How work is scheduled
  workDays?: string[]; // Array of YYYY-MM-DD strings, if workMode is 'daysOnly'
  workDayTimeRanges?: WorkDayTimeRange[]; // Array of specific date-time ranges, if workMode is 'daysAndTimes'
  workStartDate?: string; // YYYY-MM-DD, if workMode is 'dateRange'
  workEndDate?: string;   // YYYY-MM-DD, if workMode is 'dateRange'
  // Invoice related fields
  invoiceGenerated?: boolean;
  invoiceDate?: string; // YYYY-MM-DD
  invoiceNumber?: string;
  invoiceAmount?: number;
  paymentDueDate?: string; // YYYY-MM-DD
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Sale {
  id: string;
  date: string;
  totalAmount: number;
  items: CartItem[];
  paymentMethod: string;
  cajaId: string;
  employeeId: string;
  clientId?: string;
  branchId: string;
  paymentStatus?: 'Pagado' | 'Pendiente de Pago' | 'Anulado'; // Added 'Anulado'
  dueDate?: string; // New: For accounts receivable due date
  receivableNotes?: string; // New: For notes on the receivable
}

export interface SalePayment { // New interface for tracking partial payments
  id: string;
  saleId: string;
  paymentDate: string; // ISO Date string
  amountPaid: number;
  paymentMethodUsed: string; // e.g., 'Efectivo', 'Abono Tarjeta'
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
}

export enum AppModule {
  PROJECT_MANAGEMENT = "Gestión de Proyectos",
  POS = "POS",
  ECOMMERCE = "E-commerce Admin",
  PROJECT_CLIENT_DASHBOARD = "Portal de Cliente de Proyecto"
  // CLIENT_ECOMMERCE is not a module, it's a user type accessing public store
}

export enum VisitStatus {
  PROGRAMADO = 'Programado',
  REAGENDADO = 'Reagendado',
  COMPLETADO = 'Completado',
  CANCELADO = 'Cancelado',
}

export interface Visit {
  id: string;
  projectId?: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  assignedEmployeeIds: string[];
  notes?: string;
  status: VisitStatus;
}

export interface ChatMessage {
  id: string;
  projectId: string;
  senderId: string;
  senderName: string;
  timestamp: string;
  text: string;
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

export interface SupplierOrderItem {
    productId: string;
    quantityOrdered: number;
    unitCost: number;
}

export enum SupplierOrderStatus {
    BORRADOR = 'Borrador',
    PEDIDO = 'Pedido',
    ENVIADO = 'Enviado',
    RECIBIDO_PARCIALMENTE = 'Recibido Parcialmente',
    RECIBIDO_COMPLETO = 'Recibido Completo',
    CANCELADO = 'Cancelado',
}

export interface SupplierOrder {
    id: string;
    supplierId: string;
    orderDate: string;
    expectedDeliveryDate?: string;
    items: SupplierOrderItem[];
    status: SupplierOrderStatus;
    totalCost: number;
    storeOwnerId?: string;
    amountPaid?: number;
    paymentStatus?: 'No Pagado' | 'Pagado Parcialmente' | 'Pagado Completo';
}

export interface CategoryFormData {
  name: string;
  storeOwnerId?: string;
}

export interface BranchFormData {
  name: string;
  address?: string;
  phone?: string;
  isActive: boolean;
}

export interface CajaFormData {
  name: string;
  branchId: string;
  isActive: boolean;
  applyIVA: boolean;
}

export interface ProductFormData {
  name: string;
  unitPrice: number;
  description: string;
  imageUrl?: string;
  skus: string[];
  category?: string;
  ivaRate?: number;
  storeOwnerId: string;

  barcode2?: string;
  isActive?: boolean;
  isService?: boolean;
  barcode13Digits?: string;
  chainCode?: string;
  manufacturer?: string;
  supplierId?: string;
  costPrice?: number;
  supplierProductCode?: string;
  department?: string;
  family?: string;
  physicalLocation?: string;
  displayOnScreen?: boolean;
  requiresSerialNumber?: boolean;
  creationDate?: string;
  useKitchenPrinter?: boolean;
  useBarcodePrinter?: boolean;
  availableStock?: number; // Represents initial total stock or for default location
  isEmergencyTaxExempt?: boolean; // New field
}

export interface ClientFormData {
  name: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  billingAddress?: string;
  // New fields for enhanced client information
  clientType?: 'Particular' | 'Empresa';
  companyName?: string;
  taxId?: string;
  contactPersonName?: string;
  preferredCommunication?: 'Email' | 'Teléfono' | 'WhatsApp' | 'Otro';
  clientNotes?: string;
  industry?: string;
  acquisitionSource?: string;
}

export interface EmployeeFormData {
  name: string;
  lastName: string;
  email: string;
  role: string; // This will be "Puesto"
  address?: string;
  phone?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  hireDate?: string; // YYYY-MM-DD
  department?: string;
  salary?: number;
  bankName?: string;
  bankAccountNumber?: string;
  socialSecurityNumber?: string; // Sensitive data
  profilePictureUrl?: string;
  password?: string; // For new employee user account creation
  confirmPassword?: string; // For new employee user account creation
  permissions?: EmployeePermissions; // Added permissions field
}

export interface ProjectFormData {
  name: string;
  clientId: string;
  status: ProjectStatus;
  description: string;
  assignedProducts: ProjectResource[];
  assignedEmployeeIds: string[];
  // New fields for visit and work scheduling
  visitDate?: string;
  visitTime?: string;
  workMode?: ProjectWorkMode;
  workDays: string[]; // Always present, empty if not 'daysOnly' mode or no days
  workDayTimeRanges: WorkDayTimeRange[]; // Always present, empty if not 'daysAndTimes' mode or no ranges
  workStartDate?: string; // Always present, empty if not 'dateRange' mode
  workEndDate?: string;   // Always present, empty if not 'dateRange' mode
  // Optional fields for direct invoice amount setting in form, if needed.
  // For now, invoiceAmount is calculated unless overridden programmatically.
  // invoiceAmount?: number;
}


export interface VisitFormData {
    projectId?: string;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    assignedEmployeeIds: string[];
    notes?: string;
    status: VisitStatus;
}

export interface ECommerceSettings {
    storeName: string;
    logoUrl: string;
    template: 'Moderno' | 'Clasico' | 'Minimalista';
    primaryColor: string;
}

export enum Theme {
    LIGHT = 'light',
    DARK = 'dark',
}

export interface SupplierFormData {
    name: string;
    contactName?: string;
    email: string;
    phone?: string;
    address?: string;
    storeOwnerId?: string;
}

export interface SupplierOrderFormData {
    supplierId: string;
    orderDate: string;
    expectedDeliveryDate?: string;
    items: SupplierOrderItem[];
    status: SupplierOrderStatus;
    storeOwnerId?: string;
}

export type NotificationType = 'new_order' | 'project_update' | 'chat_message' | 'low_stock' | 'generic' | 'visit_update'; // Added visit_update

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: string; // ISO string
  read: boolean;
  link?: string; // Optional link to navigate to
  type: NotificationType;
  icon?: React.ReactNode; // Specific icon based on type, e.g., ShoppingCartIcon for 'new_order'
}

export interface POSShift {
  id: string;
  startTime: string; // ISO date string
  endTime?: string; // ISO date string
  initialCash: number;
  totalSales: number; // cash, card, etc. processed during the shift
  status: 'open' | 'closed';
  employeeId: string;
  cajaId: string; // ID of the Caja/Terminal
  branchId: string; // ID of the Branch
}

export interface HeldCart {
  id: string;
  name?: string;
  items: CartItem[];
  totalAmount: number;
  date: string; // ISO string
}