
export enum UserRole {
  MANAGER = 'Gerente',
  EMPLOYEE = 'Empleado',
  CLIENT = 'Cliente',
}

export interface User {
  id: string;
  email: string;
  name?: string;
  lastName?: string;
  role: UserRole;
  purchaseCode?: string; // For clients
}

export interface Category {
  id: string;
  name: string;
  storeOwnerId?: string; // Categories can also be store-specific
}

export interface Branch {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  isActive: boolean;
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
  ivaRate?: number;
  storeOwnerId: string; 

  // New fields from image
  barcode2?: string; // Código Barras 2
  isActive?: boolean; // Activo Si/No
  isService?: boolean; // Servicio checkbox
  
  barcode13Digits?: string; // Código Barra 13 Dígitos
  chainCode?: string; // Código Cadena
  manufacturer?: string; // Manufacturero
  supplierId?: string; // Suplidor (ID)
  costPrice?: number; // Costo de Unidad Menor / Costo from supplier list
  supplierProductCode?: string; // Código de Facturación del suplidor / Código from supplier list
  
  department?: string; // Departamento
  family?: string; // Familia
  physicalLocation?: string; // Localización
  
  displayOnScreen?: boolean; // Ilustrar en Pantalla Si/No
  requiresSerialNumber?: boolean; // Num. de Serie tracking
  creationDate?: string; // Fecha Creado (YYYY-MM-DD)
  
  useKitchenPrinter?: boolean; // Usar impresora de Cocina
  useBarcodePrinter?: boolean; // Usar impresora de Barra

  availableStock?: number; // Disponible (distinct from total inventory)
}

export interface Client {
  id:string;
  name: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface Employee {
  id: string;
  name: string;
  lastName: string;
  email: string;
  role: string; 
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

export interface Project {
  id: string;
  name: string;
  clientId: string;
  startDate: string; 
  endDate: string; 
  status: ProjectStatus;
  description?: string;
  assignedProducts: ProjectResource[];
  assignedEmployeeIds: string[];
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
  branchId: string; // Added branchId
  paymentStatus?: 'Pagado' | 'Pendiente de Pago'; // Added for Accounts Receivable
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
  CLIENT_ECOMMERCE = "Mi Tienda Online" 
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
  date: string; 
  startTime: string; 
  endTime: string; 
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

export type SupplierOrderStatus = 'Borrador' | 'Pedido' | 'Enviado' | 'Recibido Parcialmente' | 'Recibido Completo' | 'Cancelado';

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

export interface ProductFormData {
  name: string;
  unitPrice: number;
  description: string;
  imageUrl?: string;
  skus: string[]; 
  category?: string; 
  ivaRate?: number; 
  storeOwnerId: string; 

  // New fields from image for form
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
  availableStock?: number; 
  // stockByBranch is handled by DataContext, not directly in form for initial creation.
  // Default branch stock can be part of form if needed, then translated.
  // For simplicity, current stock shown in image (Inventario: 6) will be applied to product's owner branch.
}

export interface ClientFormData { 
  name: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface EmployeeFormData {
  name: string;
  lastName: string;
  email: string;
  role: string;
}

export interface ProjectFormData {
  name: string;
  clientId: string;
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  description: string;
  assignedProducts: ProjectResource[];
  assignedEmployeeIds: string[];
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
