import React from 'react'; 
import { UserRole, Product, Client, Employee, Project, ProjectStatus, AppModule, User, Visit, VisitStatus, ECommerceSettings, Category, Sale, CartItem, ChatMessage, Order, Supplier, SupplierOrder, SupplierOrderStatus, Branch, Notification, NotificationType, Caja, Estimate, EstimateStatus, InventoryLog, Department, Task, TaskStatus, TaskComment, ProjectPriority } from './types'; // Added Caja, Notification, NotificationType, Estimate, EstimateStatus, InventoryLog, Department
import { 
    BriefcaseIcon, 
    Squares2X2Icon, 
    ListBulletIcon, 
    UserGroupIcon, 
    UsersIcon, 
    CalendarDaysIcon, 
    ChatBubbleLeftRightIcon, 
    ChartBarIcon, 
    HomeIcon,
    ChartPieIcon,
    CashBillIcon,
    Cog6ToothIcon,
    ShoppingCartIcon,
    TruckIcon,
    DocumentArrowUpIcon,
    BanknotesIcon,
    InformationCircleIcon, 
    BuildingStorefrontIcon, 
    CubeIcon, // Placeholder for Caja Icon
    KeyIcon as LoginKeyIcon, // Renamed to avoid conflict
    ArrowLeftOnRectangleIcon as ExitIcon,
    PrinterIcon as PrintIcon,
    FloppyDiskIcon as SaveIcon,
    XMarkIcon as EscKeyIcon,
    ExclamationTriangleIcon as EmergencyIcon,
    CreditCardIcon as CardIcon, // Added
    UserPlusIcon, // Added for client add
    ClipboardDocumentListIcon, // Added for Estimates
    AthMovilIcon, // Added for ATH Movil
    FolderIcon, // Added for Departments
    ArchiveBoxIcon,
    ArrowUturnLeftIcon,
    ShieldCheckIcon,
} from './components/icons'; 

export const ADMIN_EMAIL = 'admin@admin.com';
export const ADMIN_PASSWORD = 'admin';
export const ECOMMERCE_CLIENT_EMAIL = 'cliente.ecommerce@pazzi.com'; // Renamed
export const ECOMMERCE_CLIENT_PASSWORD = 'cliente'; // Renamed
export const PROJECT_CLIENT_EMAIL = 'cliente.proyecto@pazzi.com'; // New
export const PROJECT_CLIENT_PASSWORD = 'cliente'; // New
export const EMPLOYEE_EMAIL = 'empleado@empleado.com';
export const EMPLOYEE_PASSWORD = 'empleado';

export const ECOMMERCE_CLIENT_ID = 'client-ecommerce-user-predefined'; // Renamed
export const PROJECT_CLIENT_ID = 'client-project-user-predefined'; // New
export const ADMIN_USER_ID = 'admin-user'; 
export const ANOTHER_ECOMMERCE_CLIENT_ID = 'client-ecommerce-another'; // Renamed for consistency

export const DEFAULT_USERS: (User & { password?: string })[] = [
  { id: ADMIN_USER_ID, email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: UserRole.MANAGER, name: 'Admin', lastName: 'Pazzi', isEmergencyOrderActive: false, profilePictureUrl: 'https://i.pravatar.cc/150?u=admin-pazzi', permissions: { viewProjectManagement: true, manageProjects: true, accessPOSCashier: true }, alertSettings: {} },
  { id: ECOMMERCE_CLIENT_ID, email: ECOMMERCE_CLIENT_EMAIL, password: ECOMMERCE_CLIENT_PASSWORD, role: UserRole.CLIENT_ECOMMERCE, name: 'Cliente', lastName: 'Shopper', isEmergencyOrderActive: false },
  { id: PROJECT_CLIENT_ID, email: PROJECT_CLIENT_EMAIL, password: PROJECT_CLIENT_PASSWORD, role: UserRole.CLIENT_PROJECT, name: 'Roberto', lastName: 'Gómez (Proyecto)', isEmergencyOrderActive: false },
  
  // Employees as Users
  { id: 'emp-1', email: 'ana.juarez@pazzi.com', password: 'empleado', role: UserRole.EMPLOYEE, name: 'Ana', lastName: 'Juárez', isEmergencyOrderActive: false, profilePictureUrl: 'https://i.pravatar.cc/150?u=ana-juarez', permissions: { viewProjectManagement: true, manageProjects: true, accessPOSCashier: true } },
  { id: 'emp-2', email: 'carlos.vargas@pazzi.com', password: 'empleado', role: UserRole.EMPLOYEE, name: 'Carlos', lastName: 'Vargas', isEmergencyOrderActive: false, profilePictureUrl: 'https://i.pravatar.cc/150?u=carlos-vargas', permissions: { viewProjectManagement: true, manageProjects: false, accessPOSCashier: false } },
  { id: 'emp-3', email: 'sofia.herrera@pazzi.com', password: 'empleado', role: UserRole.EMPLOYEE, name: 'Sofía', lastName: 'Herrera', isEmergencyOrderActive: false, profilePictureUrl: 'https://i.pravatar.cc/150?u=sofia-herrera', permissions: { viewProjectManagement: true, manageProjects: false, accessPOSCashier: false } },
  { id: 'employee-user-predefined', email: EMPLOYEE_EMAIL, password: EMPLOYEE_PASSWORD, role: UserRole.EMPLOYEE, name: 'Colaborador', lastName: 'Demo', isEmergencyOrderActive: false, profilePictureUrl: 'https://i.pravatar.cc/150?u=colaborador-demo', permissions: { viewProjectManagement: false, manageProjects: false, accessPOSCashier: true } },
  
  { id: ANOTHER_ECOMMERCE_CLIENT_ID, email: 'otrocliente.ecommerce@example.com', password: 'otrocliente', role: UserRole.CLIENT_ECOMMERCE, name: 'Otro', lastName: 'Comprador', isEmergencyOrderActive: false },
];

export const INITIAL_BRANCHES: Branch[] = [
    { id: 'branch-central', name: 'Sucursal Central', address: 'Calle Principal 123, Ciudad Capital', phone: '555-0100', isActive: true },
    { id: 'branch-norte', name: 'Sucursal Norte', address: 'Avenida Norte 456, Ciudad Capital', phone: '555-0200', isActive: true },
    { id: 'branch-sur', name: 'Sucursal Sur (Almacén)', address: 'Carretera Sur Km 7, Ciudad Capital', phone: '555-0300', isActive: false }, 
];
const firstActiveBranchId = INITIAL_BRANCHES.find(b => b.isActive)?.id || 'branch-central';

export const INITIAL_CAJAS: Caja[] = [
    { id: '0008', name: 'Caja Principal (0008)', branchId: firstActiveBranchId, isActive: true, applyIVA: true },
    { id: 'caja-02-norte', name: 'Caja Rápida (Norte)', branchId: 'branch-norte', isActive: true, applyIVA: true },
    { id: 'caja-03-central-noiva', name: 'Caja Servicios (Central)', branchId: firstActiveBranchId, isActive: true, applyIVA: false },
];

export const INITIAL_PRODUCTS: Product[] = [
  
  { id: 'prod-tile-ceramic', name: 'Azulejo Cerámico Blanco (Tienda Cliente Ecommerce)', unitPrice: 5, stockByBranch: [{ branchId: ECOMMERCE_CLIENT_ID, quantity: 1000 }, { branchId: 'branch-central', quantity: 120 }], description: 'Azulejo cerámico blanco brillante (precio por m²). Ideal para baños y cocinas.', imageUrl: 'https://picsum.photos/seed/ceramictile/300/300', skus: ['AZL-CER-BLC-01'], category: 'Revestimientos', ivaRate: 0.16, storeOwnerId: ECOMMERCE_CLIENT_ID, isEmergencyTaxExempt: false, material: 'Cerámica', quality: 'Primera Calidad', width: 30, length: 60, height: 0.8, weight: 1.5 },
  { id: 'prod-counter-granite', name: 'Encimera de Granito Negro (Tienda Cliente Ecommerce)', unitPrice: 180, stockByBranch: [{ branchId: ECOMMERCE_CLIENT_ID, quantity: 50 }], description: 'Encimera de granito pulido (precio por metro lineal). Resistente y elegante.', imageUrl: 'https://picsum.photos/seed/granitecounter/300/300', skus: ['ENC-GRA-NEG-05'], category: 'Encimeras', ivaRate: 0.16, storeOwnerId: ECOMMERCE_CLIENT_ID, isEmergencyTaxExempt: false },
  { id: 'prod-flooring-wood', name: 'Instalación de Piso de Madera (Tienda Cliente Ecommerce)', unitPrice: 60, stockByBranch: [{ branchId: ECOMMERCE_CLIENT_ID, quantity: 200 }], description: 'Instalación de piso de ingeniería de roble (precio por m², incluye instalación).', imageUrl: 'https://picsum.photos/seed/woodfloor/300/300', skus: ['PIS-MAD-ROB-02'], category: 'Pisos', ivaRate: 0.16, storeOwnerId: ECOMMERCE_CLIENT_ID, isService: true, isEmergencyTaxExempt: false },
  { id: 'prod-sink-kitchen', name: 'Fregadero Doble Acero Inox. (Tienda Cliente Ecommerce)', unitPrice: 220, stockByBranch: [{ branchId: ECOMMERCE_CLIENT_ID, quantity: 40 }], description: 'Fregadero de acero inoxidable de alta calidad con dos senos.', imageUrl: 'https://picsum.photos/seed/kitchensink/300/300', skus: ['FRG-COC-DBL-11'], category: 'Fregaderos', ivaRate: 0.16, storeOwnerId: ECOMMERCE_CLIENT_ID, isEmergencyTaxExempt: true },
  { id: 'prod-paint-latex-white-demo', name: 'Pintura Látex Blanca Interior (Tienda Cliente Ecommerce)', unitPrice: 25, stockByBranch: [{ branchId: ECOMMERCE_CLIENT_ID, quantity: 150 }], description: 'Galón de pintura látex blanca para interiores, lavable y de alta cubrición.', imageUrl: 'https://picsum.photos/seed/whitelatexpaint/300/300', skus: ['PNT-LAT-BLC-GL'], category: 'Pinturas', ivaRate: 0.16, storeOwnerId: ECOMMERCE_CLIENT_ID, isEmergencyTaxExempt: false },
  { id: 'prod-tools-set-basic-demo', name: 'Juego Básico Herramientas (Tienda Cliente Ecommerce)', unitPrice: 45, stockByBranch: [{ branchId: ECOMMERCE_CLIENT_ID, quantity: 75 }], description: 'Incluye martillo, destornilladores, alicates y cinta métrica.', imageUrl: 'https://picsum.photos/seed/toolsetbasic/300/300', skus: ['TL-SET-BSC-01'], category: 'Herramientas', ivaRate: 0.16, storeOwnerId: ECOMMERCE_CLIENT_ID, isEmergencyTaxExempt: false },
  { id: 'prod-lighting-led-demo', name: 'Bombillo LED Ahorrador (Tienda Cliente Ecommerce)', unitPrice: 8, stockByBranch: [{ branchId: ECOMMERCE_CLIENT_ID, quantity: 300 }], description: 'Bombillo LED de 9W, luz blanca fría, alta eficiencia.', imageUrl: 'https://picsum.photos/seed/ledbulbdemo/300/300', skus: ['LED-BLB-9W-CW'], category: 'Iluminación', ivaRate: 0.16, storeOwnerId: ECOMMERCE_CLIENT_ID, isEmergencyTaxExempt: true },
  { id: 'prod-cement-bag-demo', name: 'Bolsa de Cemento Gris (Tienda Cliente Ecommerce)', unitPrice: 12, stockByBranch: [{ branchId: ECOMMERCE_CLIENT_ID, quantity: 80 }], description: 'Bolsa de cemento Portland gris de 42.5kg.', imageUrl: 'https://picsum.photos/seed/cementbag/300/300', skus: ['CMT-GRS-42KG'], category: 'Construcción', ivaRate: 0.16, storeOwnerId: ECOMMERCE_CLIENT_ID, isEmergencyTaxExempt: true },

  
  { id: 'prod-cabinets-modern', name: 'Juego de Gabinetes Modernos (General)', unitPrice: 2500, stockByBranch: [{ branchId: firstActiveBranchId, quantity: 15 }, { branchId: INITIAL_BRANCHES[1].id, quantity: 5 }], description: 'Set completo de gabinetes de melamina blanca, estilo minimalista.', imageUrl: 'https://picsum.photos/seed/kitchencabinets/300/300', skus: ['GAB-COC-MOD-03'], category: 'Gabinetes', ivaRate: 0.16, storeOwnerId: ADMIN_USER_ID, supplierId: 'sup-maderas-norte', isEmergencyTaxExempt: false, material: 'Melamina sobre MDF', quality: 'Grado Residencial', width: 240, length: 60, height: 90, weight: 120, compatibility: 'No requiere ensamblaje especializado. Incluye herrajes estándar.' },
  { id: 'prod-paint-interior', name: 'Servicio de Pintura Interior (Global Pazzi)', unitPrice: 300, stockByBranch: [{ branchId: firstActiveBranchId, quantity: 99 }], description: 'Pintura interior de alta calidad (materiales). Precio por habitación estándar.', imageUrl: 'https://picsum.photos/seed/interiorpaint/300/300', skus: ['SRV-PNT-INT-10'], category: 'Servicios de Pintura', ivaRate: 0.16, storeOwnerId: ADMIN_USER_ID, supplierId: 'sup-pinturas-max', isService: true, isEmergencyTaxExempt: false },
  { id: 'prod-shower-set', name: 'Set de Ducha Lujosa (Global Pazzi)', unitPrice: 450, stockByBranch: [{ branchId: firstActiveBranchId, quantity: 30 }, { branchId: INITIAL_BRANCHES[1].id, quantity: 10 }], description: 'Incluye cabezal de ducha tipo lluvia, teleducha y grifería termostática.', imageUrl: 'https://picsum.photos/seed/showerset/300/300', skus: ['GRI-DUC-LUX-07'], category: 'Grifería y Sanitarios', ivaRate: 0.16, storeOwnerId: ADMIN_USER_ID, supplierId: 'sup-herrajes-sur', isEmergencyTaxExempt: false },
  { id: 'prod-vanity-bath', name: 'Mueble de Baño con Lavabo (Global Pazzi)', unitPrice: 350, stockByBranch: [{ branchId: firstActiveBranchId, quantity: 25 }], description: 'Mueble de baño suspendido con lavabo de cerámica y espejo.', imageUrl: 'https://picsum.photos/seed/bathvanity/300/300', skus: ['MBL-BAN-LAV-08'], category: 'Muebles de Baño', ivaRate: 0.16, storeOwnerId: ADMIN_USER_ID, supplierId: 'sup-maderas-norte', isEmergencyTaxExempt: false },
  { id: 'prod-design-consultation', name: 'Consulta de Diseño Interior (Global Pazzi)', unitPrice: 150, stockByBranch: [{ branchId: firstActiveBranchId, quantity: 99 }], description: 'Sesión de 1 hora con un diseñador de interiores profesional.', imageUrl: '', skus: ['SRV-DIS-CONS-01'], category: 'Servicios de Diseño', ivaRate: 0.16, storeOwnerId: ADMIN_USER_ID, isService: true, isEmergencyTaxExempt: false },
  { id: 'prod-smart-thermostat', name: 'Termostato Inteligente WiFi (Global Pazzi)', unitPrice: 120, stockByBranch: [{ branchId: firstActiveBranchId, quantity: 60 }], description: 'Controla la temperatura de tu hogar desde cualquier lugar.', imageUrl: 'https://picsum.photos/seed/smartthermostat/300/300', skus: ['DOM-TER-WIFI-01'], category: 'Domótica', ivaRate: 0.16, storeOwnerId: ADMIN_USER_ID, supplierId: 'sup-aluminios-global', isEmergencyTaxExempt: false },
  { id: 'prod-security-camera-admin', name: 'Cámara de Seguridad WiFi (Global Pazzi)', unitPrice: 85, stockByBranch: [{ branchId: firstActiveBranchId, quantity: 40 }], description: 'Cámara de seguridad Full HD con visión nocturna y detección de movimiento.', imageUrl: 'https://picsum.photos/seed/securitycamera/300/300', skus: ['SEC-CAM-WIFI-01'], category: 'Seguridad', ivaRate: 0.16, storeOwnerId: ADMIN_USER_ID, supplierId: 'sup-aluminios-global', isEmergencyTaxExempt: false },
  { id: 'prod-door-lock-admin', name: 'Cerradura Inteligente (Global Pazzi)', unitPrice: 190, stockByBranch: [{ branchId: firstActiveBranchId, quantity: 22 }], description: 'Cerradura inteligente con teclado numérico y acceso vía app.', imageUrl: '', skus: ['SEC-LCK-SMRT-02'], category: 'Seguridad', ivaRate: 0.16, storeOwnerId: ADMIN_USER_ID, supplierId: 'sup-herrajes-sur', isEmergencyTaxExempt: false },
  { 
    id: 'prod-cable-electric', 
    name: 'Cable Eléctrico THHN #12', 
    unitPrice: 1.5, // Price per meter
    stockByBranch: [{ branchId: firstActiveBranchId, quantity: 500 }, { branchId: INITIAL_BRANCHES[1].id, quantity: 200 }], 
    description: 'Cable de cobre THHN calibre 12, para instalaciones eléctricas.', 
    imageUrl: 'https://picsum.photos/seed/electricwire/300/300', 
    skus: ['CAB-THHN-12'], 
    category: 'Electricidad', 
    ivaRate: 0.16, 
    storeOwnerId: ADMIN_USER_ID,
    isEmergencyTaxExempt: false,
    hasVariations: true,
    variations: [
      { id: 'var-cable-m', name: 'Por Metro', unitPrice: 1.5, sku: 'CAB-THHN-12-M' },
      { id: 'var-cable-hm', name: 'Medio Metro', unitPrice: 0.80, sku: 'CAB-THHN-12-HM' },
      { id: 'var-cable-roll', name: 'Rollo (100m)', unitPrice: 140, sku: 'CAB-THHN-12-ROLL' },
    ]
  },
  
  { id: 'prod-garden-tools-another', name: 'Set Herramientas Jardín (Tienda Otro Cliente Ecommerce)', unitPrice: 75, stockByBranch: [{ branchId: ANOTHER_ECOMMERCE_CLIENT_ID, quantity: 50 }], description: 'Set completo para jardinería, palas, rastrillo, tijeras.', imageUrl: 'https://picsum.photos/seed/gardentools/300/300', skus: ['JAR-TLS-SET-01'], category: 'Jardinería', ivaRate: 0.16, storeOwnerId: ANOTHER_ECOMMERCE_CLIENT_ID, isEmergencyTaxExempt: false },
  { id: 'prod-outdoor-lighting-another', name: 'Lámpara Solar Exterior (Tienda Otro Cliente Ecommerce)', unitPrice: 30, stockByBranch: [{ branchId: ANOTHER_ECOMMERCE_CLIENT_ID, quantity: 120 }], description: 'Lámpara solar LED para jardín, resistente al agua.', imageUrl: 'https://picsum.photos/seed/outdoorlight/300/300', skus: ['EXT-SOL-LMP-05'], category: 'Iluminación Exterior', ivaRate: 0.16, storeOwnerId: ANOTHER_ECOMMERCE_CLIENT_ID, isEmergencyTaxExempt: true },
  { id: 'prod-plant-pot-another', name: 'Maceta Grande Terracota (Tienda Otro Cliente Ecommerce)', unitPrice: 40, stockByBranch: [{ branchId: ANOTHER_ECOMMERCE_CLIENT_ID, quantity: 60 }], description: 'Maceta de terracota de 50cm de diámetro, ideal para arbustos.', imageUrl: 'https://picsum.photos/seed/plantpot/300/300', skus: ['JAR-POT-TER-50'], category: 'Macetas', ivaRate: 0.16, storeOwnerId: ANOTHER_ECOMMERCE_CLIENT_ID, isEmergencyTaxExempt: false },
  { 
    id: 'prod-bbq-grill-another', 
    name: 'FOXTAIL PARILLA PAILA (Tienda Otro Cliente Ecommerce)', 
    unitPrice: 2.99, 
    stockByBranch: [{ branchId: ANOTHER_ECOMMERCE_CLIENT_ID, quantity: 6 }], 
    description: 'Parrilla de carbón compacta, fácil de transportar.', 
    imageUrl: 'https://picsum.photos/seed/bbqgrill/300/300', 
    skus: ["675451027653", "415022"], 
    category: 'MISCELANEO', 
    ivaRate: 0.16, 
    storeOwnerId: ANOTHER_ECOMMERCE_CLIENT_ID,
    barcode2: '',
    isActive: true,
    isService: false,
    barcode13Digits: '6754510276530', 
    chainCode: 'CC-FP-001', 
    manufacturer: 'MIPAD DE PR, INC.',
    supplierId: 'sup-mipad-pr', 
    costPrice: 1.22,
    profit: 1.77,
    supplierProductCode: '675451027653', 
    departmentId: 'dept-misc', 
    family: 'Cocina Exterior', 
    physicalLocation: 'Pasillo 5, Estante B', 
    displayOnScreen: true,
    requiresSerialNumber: false,
    creationDate: '2023-08-06', 
    useKitchenPrinter: false,
    useBarcodePrinter: false,
    availableStock: 6, 
    isEmergencyTaxExempt: false,
  },
];

export const INITIAL_CATEGORIES: Category[] = Array.from(new Set(INITIAL_PRODUCTS.map(p => JSON.stringify({name:p.category || 'Sin Categoría', storeOwnerId: p.storeOwnerId }))))
    .map((jsonString, index) => {
        const parsed = JSON.parse(jsonString as string);
        return {
            id: `cat-initial-${index}-${parsed.name.toLowerCase().replace(/\s+/g, '-')}-${parsed.storeOwnerId.slice(0,4)}`,
            name: parsed.name,
            storeOwnerId: parsed.storeOwnerId
        };
    });

export const INITIAL_DEPARTMENTS: Department[] = [
    { id: 'dept-misc', name: 'MISCELANEO', storeOwnerId: ANOTHER_ECOMMERCE_CLIENT_ID },
    { id: 'dept-cocina', name: 'Cocina', storeOwnerId: ADMIN_USER_ID },
    { id: 'dept-banos', name: 'Baños', storeOwnerId: ADMIN_USER_ID },
    { id: 'dept-pisos', name: 'Pisos y Revestimientos', storeOwnerId: ADMIN_USER_ID },
];

export const INITIAL_CLIENTS: Client[] = [
  { id: 'client-1', name: 'Roberto', lastName: 'Gómez', email: 'roberto.gomez@example.com', phone: '555-1234', address: 'Calle Falsa 123, Ciudad Ejemplo', clientType: 'Particular', acquisitionSource: 'Referido', isActive: true, creditLimit: 500, paymentTerms: 'Neto 30', category: 'Cliente General', loyaltyLevel: 'Bronce' },
  { id: 'client-2', name: 'Lucía', lastName: 'Fernández', email: 'lucia.fernandez@example.com', phone: '555-5678', address: 'Avenida Siempre Viva 742, Ciudad Ejemplo', clientType: 'Particular', acquisitionSource: 'Búsqueda Web', isActive: true, creditLimit: 1000, paymentTerms: 'Contado', category: 'Cliente VIP', loyaltyLevel: 'Oro' },
  { id: 'client-3', name: 'Construcciones ABC', lastName: '', email: 'contacto@construabc.com', phone: '555-8765', address: 'Parque Industrial X, Nave 5', clientType: 'Empresa', companyName: 'Construcciones ABC S.A. de C.V.', taxId: 'CABC123456XYZ', contactPersonName: 'Ing. Carlos Torres', industry: 'Construcción', preferredCommunication: 'Email', isActive: true, creditLimit: 25000, paymentTerms: 'Neto 60', category: 'Contratista' },
  { id: ECOMMERCE_CLIENT_ID, name: 'Cliente', lastName: 'Shopper', email: ECOMMERCE_CLIENT_EMAIL, phone: '555-1111', address: 'Online Order Address 1', clientType: 'Particular', isActive: true },
  { id: PROJECT_CLIENT_ID, name: 'Roberto', lastName: 'Gómez (Proyecto)', email: PROJECT_CLIENT_EMAIL, phone: '555-2222', address: 'Project Site Address 1', clientType: 'Particular', isActive: true },
  { id: ANOTHER_ECOMMERCE_CLIENT_ID, name: 'Otro', lastName: 'Comprador', email: 'otrocliente.ecommerce@example.com', phone: '555-3333', address: 'Online Order Address 2', clientType: 'Particular', isActive: true },
];

export const EMPLOYEE_ROLES = ['Gerente de Proyectos', 'Diseñador', 'Contratista General', 'Especialista en Acabados', 'Vendedor POS', 'Administrativo'];
export const CLIENT_PRICE_LEVEL_OPTIONS = ['Precio Venta', 'Precio Nivel 1', 'Precio Nivel 2', 'Contratista', 'Mayorista'];

export const INITIAL_EMPLOYEES: Employee[] = [
  { id: 'emp-1', name: 'Ana', lastName: 'Juárez', email: 'ana.juarez@pazzi.com', role: EMPLOYEE_ROLES[0], hireDate: '2022-03-15', profilePictureUrl: 'https://i.pravatar.cc/150?u=ana-juarez', permissions: { viewProjectManagement: true, manageProjects: true, accessPOSCashier: true } },
  { id: 'emp-2', name: 'Carlos', lastName: 'Vargas', email: 'carlos.vargas@pazzi.com', role: EMPLOYEE_ROLES[1], hireDate: '2021-08-01', profilePictureUrl: 'https://i.pravatar.cc/150?u=carlos-vargas', permissions: { viewProjectManagement: true, manageProjects: false, accessPOSCashier: false } },
  { id: 'emp-3', name: 'Sofía', lastName: 'Herrera', email: 'sofia.herrera@pazzi.com', role: EMPLOYEE_ROLES[2], hireDate: '2023-01-10', profilePictureUrl: 'https://i.pravatar.cc/150?u=sofia-herrera', permissions: { viewProjectManagement: true, manageProjects: false, accessPOSCashier: false } },
  { id: 'employee-user-predefined', name: 'Colaborador', lastName: 'Demo', email: EMPLOYEE_EMAIL, role: EMPLOYEE_ROLES[4], hireDate: '2023-05-01', profilePictureUrl: 'https://i.pravatar.cc/150?u=colaborador-demo', permissions: { viewProjectManagement: false, manageProjects: false, accessPOSCashier: true } },
];

const currentYear = new Date().getFullYear();
const nextYear = currentYear + 1;

export const INITIAL_PROJECTS: Project[] = [
  { 
    id: 'proj-kitchen-remodel', name: 'Remodelación Cocina Gómez', clientId: 'client-1', status: ProjectStatus.COMPLETED, 
    description: 'Remodelación completa de cocina, incluyendo gabinetes, encimeras y electrodomésticos.', 
    assignedProducts: [{productId: 'prod-cabinets-modern', quantity: 1}, {productId: 'prod-counter-granite', quantity: 5}], 
    assignedEmployeeIds: ['emp-1', 'emp-3'],
    visitDate: `${currentYear}-01-08`, visitTime: '09:30',
    workMode: 'daysAndTimes', workDays: [], 
    workDayTimeRanges: [
        { date: `${currentYear}-02-15`, startTime: '09:00', endTime: '17:00'},
        { date: `${currentYear}-02-16`, startTime: '09:00', endTime: '17:00'},
    ],
    priority: ProjectPriority.MEDIUM,
    purchaseOrder: 'PO-2024-GOMEZ-01',
    projectKey: 'GOMEZ-KITCH'
  },
  { 
    id: 'proj-bathroom-addition', name: 'Ampliación Baño Fernández', clientId: 'client-2', status: ProjectStatus.ACTIVE, 
    description: 'Construcción de un nuevo baño completo en segunda planta.', 
    assignedProducts: [{productId: 'prod-shower-set', quantity: 1}, {productId: 'prod-vanity-bath', quantity: 1}], 
    assignedEmployeeIds: ['emp-2', 'emp-3'],
    visitDate: `${currentYear}-03-01`, visitTime: '14:00',
    workMode: 'daysOnly', workDays: [`${currentYear}-04-20`, `${currentYear}-04-21`, `${currentYear}-04-22`],
    workDayTimeRanges: []
  },
  { 
    id: 'proj-office-fitout', name: 'Adecuación Oficinas ConstruABC', clientId: 'client-3', status: ProjectStatus.PENDING, 
    description: 'Diseño y adecuación de nuevo espacio de oficinas, incluyendo pintura y mobiliario básico.', 
    assignedProducts: [{productId: 'prod-paint-interior', quantity: 5}], 
    assignedEmployeeIds: ['emp-1'],
    // No initial visit or work days set for this pending project
    workMode: 'daysOnly', workDays: [], workDayTimeRanges: []
  },
];


export const INITIAL_SALES: Sale[] = [
  { id: 'sale-1', date: `${currentYear}-01-05T10:30:00Z`, totalAmount: 150.75, items: [{...INITIAL_PRODUCTS[0], quantity: 2}, {...INITIAL_PRODUCTS[2], quantity: 1}], paymentMethod: 'Efectivo', cajaId: '0008', employeeId: 'employee-user-predefined', branchId: firstActiveBranchId, paymentStatus: 'Pagado' },
  { id: 'sale-2', date: `${currentYear}-01-05T14:45:00Z`, totalAmount: 88.20, items: [{...INITIAL_PRODUCTS[1], quantity: 3}], paymentMethod: 'Tarjeta', cajaId: '0008', employeeId: 'employee-user-predefined', branchId: firstActiveBranchId, paymentStatus: 'Pagado' },
];

export const INITIAL_ESTIMATES: Estimate[] = [
    {
        id: 'est-1',
        date: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString(),
        clientId: 'client-3', // Construcciones ABC
        items: [
            { ...INITIAL_PRODUCTS.find(p => p.id === 'prod-paint-interior')!, quantity: 5 },
            { ...INITIAL_PRODUCTS.find(p => p.id === 'prod-design-consultation')!, quantity: 2 },
        ],
        totalAmount: ((300 * 5) + (150 * 2)) * 1.16, // Assuming 16% tax
        status: EstimateStatus.ENVIADO,
        notes: 'Estimación para oficinas nuevas.',
        employeeId: 'emp-1',
        branchId: firstActiveBranchId
    },
    {
        id: 'est-2',
        date: new Date(new Date().setDate(new Date().getDate() - 2)).toISOString(),
        clientId: 'client-1', // Roberto Gómez
        items: [
            { ...INITIAL_PRODUCTS.find(p => p.id === 'prod-shower-set')!, quantity: 1 },
        ],
        totalAmount: 450 * 1.16, // Assuming 16% tax
        status: EstimateStatus.BORRADOR,
        employeeId: 'employee-user-predefined',
        branchId: firstActiveBranchId
    }
];

export const INITIAL_INVENTORY_LOGS: InventoryLog[] = [];

export const INITIAL_ORDERS: Order[] = [
  { id: 'order-1', date: `${currentYear}-01-03T11:00:00Z`, clientName: 'Cliente Shopper', clientEmail: ECOMMERCE_CLIENT_EMAIL, shippingAddress: 'Calle Inventada 456, Ciudad Web', totalAmount: 205.50, items: [{...INITIAL_PRODUCTS[0], quantity: 1}, {...INITIAL_PRODUCTS[1], quantity: 1}], status: 'Completado', storeOwnerId: ECOMMERCE_CLIENT_ID, paymentMethod: "Tarjeta" },
  { id: 'order-2', date: `${currentYear}-01-04T16:15:00Z`, clientName: 'Otro Comprador', clientEmail: 'otrocliente.ecommerce@example.com', shippingAddress: 'Avenida Digital 789, Pueblo Online', totalAmount: 75.00, items: [{...INITIAL_PRODUCTS[3], quantity:1}], status: 'Enviado', storeOwnerId: ANOTHER_ECOMMERCE_CLIENT_ID, paymentMethod: "PayPal" },
];

export const INITIAL_VISITS: Visit[] = [
    { id: 'visit-1', projectId: 'proj-kitchen-remodel', title: 'Visita Inicial - Toma de Medidas', date: `${currentYear}-01-10`, startTime: '10:00', endTime: '11:30', assignedEmployeeIds: ['emp-1'], status: VisitStatus.COMPLETADO, notes: 'Se tomaron medidas y se discutieron ideas iniciales con el cliente.' },
    { id: 'visit-2', projectId: 'proj-bathroom-addition', title: 'Revisión de Plomería', date: `${currentYear}-04-15`, startTime: '14:00', endTime: '15:00', assignedEmployeeIds: ['emp-3'], status: VisitStatus.PROGRAMADO },
    { id: 'visit-3', projectId: 'proj-office-fitout', title: 'Presentación Propuesta Diseño', date: `${currentYear}-05-05`, startTime: '11:00', endTime: '12:00', assignedEmployeeIds: ['emp-1', 'emp-2'], status: VisitStatus.PROGRAMADO },
];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
    { id: 'msg-proj1-1', projectId: 'proj-kitchen-remodel', senderId: 'client-1', senderName: 'Roberto Gómez', timestamp: `${currentYear}-01-12T10:00:00Z`, text: '¿Cómo va el avance con los gabinetes?' },
    { id: 'msg-proj1-2', projectId: 'proj-kitchen-remodel', senderId: 'emp-1', senderName: 'Ana Juárez', timestamp: `${currentYear}-01-12T10:05:00Z`, text: 'Hola Roberto, los gabinetes están programados para instalación la próxima semana. Te confirmaremos el día exacto pronto.' },
    { id: 'msg-proj2-1', projectId: 'proj-bathroom-addition', senderId: 'client-2', senderName: 'Lucía Fernández', timestamp: `${currentYear}-04-11T15:30:00Z`, text: 'Quería saber si podemos elegir un tipo de azulejo diferente al que vimos.' },
];

export const DEFAULT_ECOMMERCE_SETTINGS: ECommerceSettings = {
    storeName: "Pazzi Tienda Online (Predeterminada)",
    logoUrl: "https://picsum.photos/seed/pazzidefaultlogo/150/50",
    template: 'Moderno',
    primaryColor: '#0D9488', // Teal-600
};

// Define initial suppliers
export const INITIAL_SUPPLIERS: Supplier[] = [
    { id: 'sup-maderas-norte', name: 'Maderas del Norte S.A.', contactName: 'Juan Pérez', email: 'ventas@maderasnorte.com', phone: '555-1010', address: 'Parque Industrial Norte Lote 5', storeOwnerId: ADMIN_USER_ID },
    { id: 'sup-herrajes-sur', name: 'Herrajes del Sur Ltda.', contactName: 'Maria López', email: 'pedidos@herrajessur.com', phone: '555-2020', address: 'Av. Principal 234, Zona Sur', storeOwnerId: ADMIN_USER_ID },
    { id: 'sup-pinturas-max', name: 'Pinturas MaxColor', contactName: 'Luis García', email: 'luis.garcia@maxcolor.com', phone: '555-3030', storeOwnerId: ADMIN_USER_ID },
    { id: 'sup-aluminios-global', name: 'Aluminios Globales', email: 'info@aluminiosglobales.com', storeOwnerId: ADMIN_USER_ID },
    { id: 'sup-mipad-pr', name: 'MIPAD DE PR, INC.', email: 'compras@mipad.pr', storeOwnerId: ANOTHER_ECOMMERCE_CLIENT_ID }, // Supplier for client's specific product
];

// Define initial supplier orders
export const INITIAL_SUPPLIER_ORDERS: SupplierOrder[] = [
    { 
        id: 'po-admin-001', 
        supplierId: 'sup-maderas-norte', 
        orderDate: `${currentYear-1}-12-01`, 
        expectedDeliveryDate: `${currentYear-1}-12-15`,
        items: [
            { productId: 'prod-cabinets-modern', quantityOrdered: 10, unitCost: 1800 },
            { productId: 'prod-vanity-bath', quantityOrdered: 5, unitCost: 250 }
        ],
        status: SupplierOrderStatus.RECIBIDO_COMPLETO, 
        totalCost: (10*1800) + (5*250), 
        storeOwnerId: ADMIN_USER_ID,
        amountPaid: (10*1800) + (5*250),
        paymentStatus: 'Pagado Completo',
    },
    { 
        id: 'po-admin-002', 
        supplierId: 'sup-herrajes-sur', 
        orderDate: `${currentYear}-01-05`,
        items: [
            { productId: 'prod-shower-set', quantityOrdered: 20, unitCost: 300 }
        ],
        status: SupplierOrderStatus.PEDIDO, 
        totalCost: 20*300, 
        storeOwnerId: ADMIN_USER_ID,
        amountPaid: 0,
        paymentStatus: 'No Pagado',
    },
    { 
        id: 'po-client-another-001', 
        supplierId: 'sup-mipad-pr', 
        orderDate: `${currentYear-1}-07-15`,
        items: [
            { productId: 'prod-bbq-grill-another', quantityOrdered: 12, unitCost: 1.22 }
        ],
        status: SupplierOrderStatus.RECIBIDO_COMPLETO, 
        totalCost: 12 * 1.22, 
        storeOwnerId: ANOTHER_ECOMMERCE_CLIENT_ID,
        amountPaid: 12 * 1.22,
        paymentStatus: 'Pagado Completo',
    },
];


export const INITIAL_NOTIFICATIONS: Notification[] = [
    { id: 'notif-1', title: 'Nuevo Pedido Recibido', message: 'Pedido #order-1 de Cliente Shopper por $205.50.', timestamp: new Date(new Date().setDate(new Date().getDate()-1)).toISOString(), read: true, link: '/ecommerce/orders', type: 'new_order', icon: React.createElement(ShoppingCartIcon, {className: "w-4 h-4"}) },
    { id: 'notif-2', title: 'Chat de Proyecto', message: 'Roberto Gómez: ¿Cómo va el avance con los gabinetes?', timestamp: new Date(new Date().setDate(new Date().getDate()-2)).toISOString(), read: false, link: '/pm/chat', type: 'chat_message', icon: React.createElement(ChatBubbleLeftRightIcon, {className: "w-4 h-4"}) },
    { id: 'notif-3', title: 'Bajo Stock: Termostato Inteligente', message: 'Quedan solo 5 unidades en Sucursal Central.', timestamp: new Date().toISOString(), read: false, type: 'low_stock', link: '/pos/inventory' }
];

export const INITIAL_TASKS: Task[] = [
    { id: 'task-1', projectId: 'proj-kitchen-remodel', title: 'Definir paleta de colores', status: TaskStatus.TODO, archived: false, order: 0, assignedEmployeeIds: ['emp-2'] },
    { id: 'task-2', projectId: 'proj-kitchen-remodel', title: 'Comprar azulejos y grifería', status: TaskStatus.TODO, archived: false, order: 1, assignedEmployeeIds: ['emp-1'] },
    { id: 'task-3', projectId: 'proj-kitchen-remodel', title: 'Demoler cocina antigua', status: TaskStatus.IN_PROGRESS, archived: false, order: 0, assignedEmployeeIds: ['emp-3'] },
    { id: 'task-4', projectId: 'proj-kitchen-remodel', title: 'Instalar plomería nueva', status: TaskStatus.IN_PROGRESS, archived: false, order: 1, assignedEmployeeIds: ['emp-3'] },
    { id: 'task-5', projectId: 'proj-kitchen-remodel', title: 'Instalar gabinetes', status: TaskStatus.FOR_APPROVAL, archived: false, order: 0, assignedEmployeeIds: ['emp-1', 'emp-3'] },
    { id: 'task-6', projectId: 'proj-kitchen-remodel', title: 'Pintar paredes', status: TaskStatus.DONE, archived: false, order: 0 },
    { id: 'task-7', projectId: 'proj-bathroom-addition', title: 'Planos de ampliación', status: TaskStatus.DONE, archived: false, order: 0, assignedEmployeeIds: ['emp-2'] },
];

export const INITIAL_TASK_COMMENTS: TaskComment[] = [
    { id: 'taskcomment-1', taskId: 'task-3', senderId: 'emp-1', senderName: 'Ana Juárez', timestamp: new Date().toISOString(), text: 'La demolición ha comenzado. Cuidado con el polvo.' },
    { id: 'taskcomment-2', taskId: 'task-3', senderId: 'client-1', senderName: 'Roberto Gómez', timestamp: new Date().toISOString(), text: '¡Excelente! Gracias por el aviso.' },
];


export const inputFormStyle = "block w-full px-3 py-1.5 text-lg text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-offset-neutral-800 focus:border-primary";
export const INPUT_SM_CLASSES = "px-2.5 py-1.5 text-lg text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary dark:focus:ring-offset-neutral-800 focus:border-primary";

export const BUTTON_PRIMARY_CLASSES = "bg-primary hover:bg-secondary text-white font-semibold text-lg py-2 px-4 rounded-md shadow-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-neutral-900";
export const BUTTON_PRIMARY_SM_CLASSES = "bg-primary hover:bg-secondary text-white font-semibold text-base py-2 px-3.5 rounded-md shadow-sm transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-primary focus:ring-offset-1 dark:focus:ring-offset-neutral-800";

export const BUTTON_SECONDARY_CLASSES = "bg-neutral-200 hover:bg-neutral-300 text-neutral-700 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-neutral-200 font-semibold text-lg py-2 px-4 rounded-md shadow-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900";
export const BUTTON_SECONDARY_SM_CLASSES = "bg-neutral-200 hover:bg-neutral-300 text-neutral-700 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-neutral-200 font-semibold text-base py-2 px-3.5 rounded-md shadow-sm transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:focus:ring-neutral-500 focus:ring-offset-1 dark:focus:ring-offset-neutral-800";


// POS Specific Button Styles
export const POS_BUTTON_BLUE_CLASSES = "bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-neutral-800 transition-colors";
export const POS_BUTTON_RED_CLASSES = "bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-3 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 focus:ring-offset-neutral-800 transition-colors";
export const POS_BUTTON_YELLOW_CLASSES = "bg-yellow-500 hover:bg-yellow-600 text-neutral-800 font-medium py-2 px-3 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-neutral-800 transition-colors";
export const POS_BUTTON_GREEN_CLASSES = "bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-3 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:ring-offset-neutral-800 transition-colors";
export const POS_BUTTON_PURPLE_CLASSES = "bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-3 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-neutral-800 transition-colors";
export const POS_BUTTON_CYAN_CLASSES = "bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-2 px-3 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-neutral-800 transition-colors";
export const POS_BUTTON_SECONDARY_CLASSES = "bg-neutral-500 hover:bg-neutral-600 text-white font-medium py-2 px-3 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2 focus:ring-offset-neutral-800 transition-colors";
export const POS_BUTTON_DARK_RED_CLASSES = "bg-red-800 hover:bg-red-900 text-white font-medium py-2 px-3 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-neutral-800 transition-colors";

export const POS_BUTTON_TEAL_CLASSES = "bg-teal-600 hover:bg-teal-700 text-white font-medium py-2 px-3 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-neutral-800 transition-colors";
export const POS_BUTTON_ORANGE_CLASSES = "bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-3 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-neutral-800 transition-colors";
export const POS_BUTTON_INDIGO_CLASSES = "bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-3 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-neutral-800 transition-colors";
export const POS_BUTTON_CREDIT_CLASSES = "bg-sky-600 hover:bg-sky-700 text-white font-medium py-2 px-3 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-neutral-800 transition-colors";
export const POS_BUTTON_PINK_CLASSES = "bg-pink-600 hover:bg-pink-700 text-white font-medium py-2 px-3 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2 focus:ring-offset-neutral-800 transition-colors";
export const POS_BUTTON_LIME_CLASSES = "bg-lime-600 hover:bg-lime-700 text-white font-medium py-2 px-3 rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-lime-400 focus:ring-offset-2 focus:ring-offset-neutral-800 transition-colors";


// Auth Page Styles
export const authInputStyle = "block w-full px-4 py-2.5 text-lg text-neutral-900 dark:text-neutral-50 bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-offset-neutral-800 focus:border-primary";
export const authButtonPrimary = "w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-lg font-medium text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-800 focus:ring-primary transition-colors";
export const authLinkStyle = "font-medium text-primary hover:text-secondary dark:text-teal-400 dark:hover:text-teal-300";
export const authSecondaryLinkStyle = "inline-flex items-center px-3 py-1.5 border border-neutral-300 dark:border-neutral-600 shadow-sm text-base leading-4 font-medium rounded-md text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary";


export type SidebarItemConfig = SubModuleLink | SubModuleGroup;
export interface SubModuleLink {
    type: 'link';
    name: string;
    path: string;
    icon?: React.ReactNode; 
}
export interface SubModuleGroup {
    type: 'group';
    name: string;
    icon?: React.ReactNode; 
    children: SubModuleLink[];
}

export const APP_MODULES_CONFIG = [
  { 
    name: AppModule.TIENDA, 
    path: '/tienda', 
    icon: React.createElement(Cog6ToothIcon),
    subModulesProject: [] as SidebarItemConfig[],
    subModulesPOS: [] as SidebarItemConfig[],
    subModulesEcommerce: [] as SidebarItemConfig[],
    subModulesProjectClient: [] as SidebarItemConfig[],
    subModulesTienda: [
      { type: 'link', name: 'Productos', path: '/tienda/products', icon: React.createElement(Squares2X2Icon, { className: "w-5 h-5" }) },
      { type: 'link', name: 'Inventario', path: '/tienda/inventory', icon: React.createElement(CubeIcon, { className: "w-5 h-5" }) },
      { type: 'link', name: 'Categorías', path: '/tienda/categories', icon: React.createElement(ListBulletIcon, { className: "w-5 h-5" }) },
      { type: 'link', name: 'Departamentos', path: '/tienda/departments', icon: React.createElement(FolderIcon, { className: "w-5 h-5" }) },
      { type: 'link', name: 'Clientes', path: '/tienda/clients', icon: React.createElement(UserGroupIcon, { className: "w-5 h-5" }) },
      { type: 'link', name: 'Colaboradores', path: '/tienda/employees', icon: React.createElement(UsersIcon, { className: "w-5 h-5" }) },
      { type: 'link', name: 'Sucursales', path: '/tienda/branches', icon: React.createElement(BuildingStorefrontIcon, { className: "w-5 h-5" }) },
    ] as SidebarItemConfig[],
    subModulesAdmin: [] as SidebarItemConfig[],
  },
  { 
    name: AppModule.PROJECT_MANAGEMENT, 
    path: '/pm/dashboard', 
    icon: React.createElement(BriefcaseIcon),
    subModulesProject: [
        { type: 'link', name: 'Dashboard PM', path: '/pm/dashboard', icon: React.createElement(HomeIcon) },
        { type: 'link', name: 'Proyectos', path: '/pm/projects', icon: React.createElement(BriefcaseIcon) },
        { type: 'link', name: 'Chat de Proyectos', path: '/pm/chat', icon: React.createElement(ChatBubbleLeftRightIcon) },
        { type: 'link', name: 'Calendario', path: '/pm/calendar', icon: React.createElement(CalendarDaysIcon) },
        { type: 'link', name: 'Reportes PM', path: '/pm/reports', icon: React.createElement(ChartBarIcon) },
    ] as SidebarItemConfig[],
    subModulesPOS: [] as SidebarItemConfig[],
    subModulesEcommerce: [] as SidebarItemConfig[],
    subModulesProjectClient: [] as SidebarItemConfig[],
    subModulesTienda: [] as SidebarItemConfig[],
    subModulesAdmin: [] as SidebarItemConfig[],
  },
  { 
    name: AppModule.POS, 
    path: '/pos', 
    icon: React.createElement(CashBillIcon),
    subModulesProject: [] as SidebarItemConfig[],
    subModulesPOS: [
        { type: 'link', name: 'Caja Registradora', path: '/pos/cashier', icon: React.createElement(CashBillIcon) },
        { type: 'link', name: 'Reportes POS', path: '/pos/reports', icon: React.createElement(ChartPieIcon) },
        { type: 'link', name: 'Historial de Ventas', path: '/pos/sales-history', icon: React.createElement(ListBulletIcon) },
        { type: 'link', name: 'Estimados', path: '/pos/estimates', icon: React.createElement(ClipboardDocumentListIcon) },
        { type: 'link', name: 'Apartados (Layaway)', path: '/pos/layaways', icon: React.createElement(ArchiveBoxIcon) },
        { type: 'link', name: 'Cuentas por Cobrar', path: '/pos/accounts-receivable', icon: React.createElement(DocumentArrowUpIcon) },
        { type: 'link', name: 'Cuentas por Pagar', path: '/pos/accounts-payable', icon: React.createElement(BanknotesIcon) },
        { type: 'link', name: 'Config. Cajas', path: '/pos/cajas', icon: React.createElement(CubeIcon) },
    ] as SidebarItemConfig[],
    subModulesEcommerce: [] as SidebarItemConfig[],
    subModulesProjectClient: [] as SidebarItemConfig[],
    subModulesTienda: [] as SidebarItemConfig[],
    subModulesAdmin: [] as SidebarItemConfig[],
  },
  { 
    name: AppModule.ECOMMERCE, 
    path: '/ecommerce', 
    icon: React.createElement(ShoppingCartIcon, {className: ""}),
    subModulesProject: [] as SidebarItemConfig[],
    subModulesPOS: [] as SidebarItemConfig[],
    subModulesEcommerce: [
        { type: 'link', name: 'Dashboard E-commerce', path: '/ecommerce/dashboard', icon: React.createElement(HomeIcon) },
        { type: 'link', name: 'Pedidos Online', path: '/ecommerce/orders', icon: React.createElement(TruckIcon) },
        { type: 'link', name: 'Proveedores', path: '/ecommerce/suppliers', icon: React.createElement(UserGroupIcon) },
        { type: 'link', name: 'Pedidos a Proveedor', path: '/ecommerce/supplier-orders', icon: React.createElement(DocumentArrowUpIcon) },
        { type: 'link', name: 'Mi Tienda (Vista Previa)', path: `/store/${ADMIN_USER_ID}`, icon: React.createElement(BuildingStorefrontIcon) },
    ] as SidebarItemConfig[],
    subModulesProjectClient: [] as SidebarItemConfig[],
    subModulesTienda: [] as SidebarItemConfig[],
    subModulesAdmin: [] as SidebarItemConfig[],
  },
  { 
    name: AppModule.ADMINISTRACION, 
    path: '/admin/dashboard', 
    icon: React.createElement(ShieldCheckIcon),
    subModulesProject: [] as SidebarItemConfig[],
    subModulesPOS: [] as SidebarItemConfig[],
    subModulesEcommerce: [] as SidebarItemConfig[],
    subModulesProjectClient: [] as SidebarItemConfig[],
    subModulesTienda: [] as SidebarItemConfig[],
    subModulesAdmin: [
      { type: 'link', name: 'Dashboard Admin', path: '/admin/dashboard', icon: React.createElement(HomeIcon) },
    ] as SidebarItemConfig[],
  },
  { 
    name: AppModule.PROJECT_CLIENT_DASHBOARD, 
    path: '/project-client', 
    icon: React.createElement(HomeIcon), // Example, not directly used in sidebar if client has its own layout
    subModulesProject: [] as SidebarItemConfig[],
    subModulesPOS: [] as SidebarItemConfig[],
    subModulesEcommerce: [] as SidebarItemConfig[],
    subModulesProjectClient: [ // These are for client's view
        { type: 'link', name: 'Dashboard Cliente', path: '/project-client/dashboard', icon: React.createElement(Squares2X2Icon) },
        { type: 'link', name: 'Calendario Proyecto', path: '/project-client/calendar', icon: React.createElement(CalendarDaysIcon) },
        { type: 'link', name: 'Chat del Proyecto', path: '/project-client/chat', icon: React.createElement(ChatBubbleLeftRightIcon) }, // Path will be dynamic with projectId
    ] as SidebarItemConfig[],
    subModulesTienda: [] as SidebarItemConfig[],
    subModulesAdmin: [] as SidebarItemConfig[],
  },
];

export const VISIT_STATUS_OPTIONS = Object.values(VisitStatus);
export const SUPPLIER_ORDER_STATUS_OPTIONS = Object.values(SupplierOrderStatus);
export const PROJECT_STATUS_OPTIONS = Object.values(ProjectStatus);
export const ESTIMATE_STATUS_OPTIONS = Object.values(EstimateStatus);
// End of constants.ts