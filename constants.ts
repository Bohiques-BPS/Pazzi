
import React from 'react'; 
import { UserRole, Product, Client, Employee, Project, ProjectStatus, AppModule, User, Visit, VisitStatus, ECommerceSettings, Category, Sale, CartItem, ChatMessage, Order, Supplier, SupplierOrder, SupplierOrderStatus, Branch, Notification, NotificationType } from './types'; // Added Notification, NotificationType
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
  { id: ADMIN_USER_ID, email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: UserRole.MANAGER, name: 'Admin', lastName: 'Pazzi' },
  { id: ECOMMERCE_CLIENT_ID, email: ECOMMERCE_CLIENT_EMAIL, password: ECOMMERCE_CLIENT_PASSWORD, role: UserRole.CLIENT_ECOMMERCE, name: 'Cliente', lastName: 'Shopper' },
  { id: PROJECT_CLIENT_ID, email: PROJECT_CLIENT_EMAIL, password: PROJECT_CLIENT_PASSWORD, role: UserRole.CLIENT_PROJECT, name: 'Roberto', lastName: 'Gómez (Proyecto)' }, // This is now Roberto
  { id: 'employee-user-predefined', email: EMPLOYEE_EMAIL, password: EMPLOYEE_PASSWORD, role: UserRole.EMPLOYEE, name: 'Empleado', lastName: 'Demo' },
  { id: ANOTHER_ECOMMERCE_CLIENT_ID, email: 'otrocliente.ecommerce@example.com', password: 'otrocliente', role: UserRole.CLIENT_ECOMMERCE, name: 'Otro', lastName: 'Comprador' },
];

export const INITIAL_BRANCHES: Branch[] = [
    { id: 'branch-central', name: 'Sucursal Central', address: 'Calle Principal 123, Ciudad Capital', phone: '555-0100', isActive: true },
    { id: 'branch-norte', name: 'Sucursal Norte', address: 'Avenida Norte 456, Ciudad Capital', phone: '555-0200', isActive: true },
    { id: 'branch-sur', name: 'Sucursal Sur (Almacén)', address: 'Carretera Sur Km 7, Ciudad Capital', phone: '555-0300', isActive: false }, 
];
const firstActiveBranchId = INITIAL_BRANCHES.find(b => b.isActive)?.id || 'branch-central';


export const INITIAL_PRODUCTS: Product[] = [
  
  { id: 'prod-tile-ceramic', name: 'Azulejo Cerámico Blanco (Tienda Cliente Ecommerce)', unitPrice: 5, stockByBranch: [{ branchId: ECOMMERCE_CLIENT_ID, quantity: 1000 }, { branchId: 'branch-central', quantity: 120 }], description: 'Azulejo cerámico blanco brillante (precio por m²). Ideal para baños y cocinas.', imageUrl: 'https://picsum.photos/seed/ceramictile/300/300', skus: ['AZL-CER-BLC-01'], category: 'Revestimientos', ivaRate: 0.16, storeOwnerId: ECOMMERCE_CLIENT_ID },
  { id: 'prod-counter-granite', name: 'Encimera de Granito Negro (Tienda Cliente Ecommerce)', unitPrice: 180, stockByBranch: [{ branchId: ECOMMERCE_CLIENT_ID, quantity: 50 }], description: 'Encimera de granito pulido (precio por metro lineal). Resistente y elegante.', imageUrl: 'https://picsum.photos/seed/granitecounter/300/300', skus: ['ENC-GRA-NEG-05'], category: 'Encimeras', ivaRate: 0.16, storeOwnerId: ECOMMERCE_CLIENT_ID },
  { id: 'prod-flooring-wood', name: 'Instalación de Piso de Madera (Tienda Cliente Ecommerce)', unitPrice: 60, stockByBranch: [{ branchId: ECOMMERCE_CLIENT_ID, quantity: 200 }], description: 'Instalación de piso de ingeniería de roble (precio por m², incluye instalación).', imageUrl: 'https://picsum.photos/seed/woodfloor/300/300', skus: ['PIS-MAD-ROB-02'], category: 'Pisos', ivaRate: 0.16, storeOwnerId: ECOMMERCE_CLIENT_ID },
  { id: 'prod-sink-kitchen', name: 'Fregadero Doble Acero Inox. (Tienda Cliente Ecommerce)', unitPrice: 220, stockByBranch: [{ branchId: ECOMMERCE_CLIENT_ID, quantity: 40 }], description: 'Fregadero de acero inoxidable de alta calidad con dos senos.', imageUrl: 'https://picsum.photos/seed/kitchensink/300/300', skus: ['FRG-COC-DBL-11'], category: 'Fregaderos', ivaRate: 0.16, storeOwnerId: ECOMMERCE_CLIENT_ID },
  { id: 'prod-paint-latex-white-demo', name: 'Pintura Látex Blanca Interior (Tienda Cliente Ecommerce)', unitPrice: 25, stockByBranch: [{ branchId: ECOMMERCE_CLIENT_ID, quantity: 150 }], description: 'Galón de pintura látex blanca para interiores, lavable y de alta cubrición.', imageUrl: 'https://picsum.photos/seed/whitelatexpaint/300/300', skus: ['PNT-LAT-BLC-GL'], category: 'Pinturas', ivaRate: 0.16, storeOwnerId: ECOMMERCE_CLIENT_ID },
  { id: 'prod-tools-set-basic-demo', name: 'Juego Básico Herramientas (Tienda Cliente Ecommerce)', unitPrice: 45, stockByBranch: [{ branchId: ECOMMERCE_CLIENT_ID, quantity: 75 }], description: 'Incluye martillo, destornilladores, alicates y cinta métrica.', imageUrl: 'https://picsum.photos/seed/toolsetbasic/300/300', skus: ['TL-SET-BSC-01'], category: 'Herramientas', ivaRate: 0.16, storeOwnerId: ECOMMERCE_CLIENT_ID },
  { id: 'prod-lighting-led-demo', name: 'Bombillo LED Ahorrador (Tienda Cliente Ecommerce)', unitPrice: 8, stockByBranch: [{ branchId: ECOMMERCE_CLIENT_ID, quantity: 300 }], description: 'Bombillo LED de 9W, luz blanca fría, alta eficiencia.', imageUrl: 'https://picsum.photos/seed/ledbulbdemo/300/300', skus: ['LED-BLB-9W-CW'], category: 'Iluminación', ivaRate: 0.16, storeOwnerId: ECOMMERCE_CLIENT_ID },
  { id: 'prod-cement-bag-demo', name: 'Bolsa de Cemento Gris (Tienda Cliente Ecommerce)', unitPrice: 12, stockByBranch: [{ branchId: ECOMMERCE_CLIENT_ID, quantity: 80 }], description: 'Bolsa de cemento Portland gris de 42.5kg.', imageUrl: 'https://picsum.photos/seed/cementbag/300/300', skus: ['CMT-GRS-42KG'], category: 'Construcción', ivaRate: 0.16, storeOwnerId: ECOMMERCE_CLIENT_ID },

  
  { id: 'prod-cabinets-modern', name: 'Juego de Gabinetes Modernos (Tienda Admin)', unitPrice: 2500, stockByBranch: [{ branchId: firstActiveBranchId, quantity: 15 }, { branchId: INITIAL_BRANCHES[1].id, quantity: 5 }], description: 'Set completo de gabinetes de melamina blanca, estilo minimalista.', imageUrl: 'https://picsum.photos/seed/kitchencabinets/300/300', skus: ['GAB-COC-MOD-03'], category: 'Gabinetes', ivaRate: 0.16, storeOwnerId: ADMIN_USER_ID },
  { id: 'prod-paint-interior', name: 'Servicio de Pintura Interior (Global Pazzi)', unitPrice: 300, stockByBranch: [{ branchId: firstActiveBranchId, quantity: 99 }], description: 'Pintura interior de alta calidad (materiales). Precio por habitación estándar.', imageUrl: 'https://picsum.photos/seed/interiorpaint/300/300', skus: ['SRV-PNT-INT-10'], category: 'Servicios de Pintura', ivaRate: 0.16, storeOwnerId: ADMIN_USER_ID },
  { id: 'prod-shower-set', name: 'Set de Ducha Lujosa (Global Pazzi)', unitPrice: 450, stockByBranch: [{ branchId: firstActiveBranchId, quantity: 30 }, { branchId: INITIAL_BRANCHES[1].id, quantity: 10 }], description: 'Incluye cabezal de ducha tipo lluvia, teleducha y grifería termostática.', imageUrl: 'https://picsum.photos/seed/showerset/300/300', skus: ['GRI-DUC-LUX-07'], category: 'Grifería y Sanitarios', ivaRate: 0.16, storeOwnerId: ADMIN_USER_ID },
  { id: 'prod-vanity-bath', name: 'Mueble de Baño con Lavabo (Global Pazzi)', unitPrice: 350, stockByBranch: [{ branchId: firstActiveBranchId, quantity: 25 }], description: 'Mueble de baño suspendido con lavabo de cerámica y espejo.', imageUrl: 'https://picsum.photos/seed/bathvanity/300/300', skus: ['MBL-BAN-LAV-08'], category: 'Muebles de Baño', ivaRate: 0.16, storeOwnerId: ADMIN_USER_ID },
  { id: 'prod-design-consultation', name: 'Consulta de Diseño Interior (Global Pazzi)', unitPrice: 150, stockByBranch: [{ branchId: firstActiveBranchId, quantity: 99 }], description: 'Sesión de 1 hora con un diseñador de interiores profesional.', imageUrl: '', skus: ['SRV-DIS-CONS-01'], category: 'Servicios de Diseño', ivaRate: 0.16, storeOwnerId: ADMIN_USER_ID },
  { id: 'prod-smart-thermostat', name: 'Termostato Inteligente WiFi (Global Pazzi)', unitPrice: 120, stockByBranch: [{ branchId: firstActiveBranchId, quantity: 60 }], description: 'Controla la temperatura de tu hogar desde cualquier lugar.', imageUrl: 'https://picsum.photos/seed/smartthermostat/300/300', skus: ['DOM-TER-WIFI-01'], category: 'Domótica', ivaRate: 0.16, storeOwnerId: ADMIN_USER_ID },
  { id: 'prod-security-camera-admin', name: 'Cámara de Seguridad WiFi (Global Pazzi)', unitPrice: 85, stockByBranch: [{ branchId: firstActiveBranchId, quantity: 40 }], description: 'Cámara de seguridad Full HD con visión nocturna y detección de movimiento.', imageUrl: 'https://picsum.photos/seed/securitycamera/300/300', skus: ['SEC-CAM-WIFI-01'], category: 'Seguridad', ivaRate: 0.16, storeOwnerId: ADMIN_USER_ID },
  { id: 'prod-door-lock-admin', name: 'Cerradura Inteligente (Global Pazzi)', unitPrice: 190, stockByBranch: [{ branchId: firstActiveBranchId, quantity: 22 }], description: 'Cerradura inteligente con teclado numérico y acceso vía app.', imageUrl: '', skus: ['SEC-LCK-SMRT-02'], category: 'Seguridad', ivaRate: 0.16, storeOwnerId: ADMIN_USER_ID },

  
  { id: 'prod-garden-tools-another', name: 'Set Herramientas Jardín (Tienda Otro Cliente Ecommerce)', unitPrice: 75, stockByBranch: [{ branchId: ANOTHER_ECOMMERCE_CLIENT_ID, quantity: 50 }], description: 'Set completo para jardinería, palas, rastrillo, tijeras.', imageUrl: 'https://picsum.photos/seed/gardentools/300/300', skus: ['JAR-TLS-SET-01'], category: 'Jardinería', ivaRate: 0.16, storeOwnerId: ANOTHER_ECOMMERCE_CLIENT_ID },
  { id: 'prod-outdoor-lighting-another', name: 'Lámpara Solar Exterior (Tienda Otro Cliente Ecommerce)', unitPrice: 30, stockByBranch: [{ branchId: ANOTHER_ECOMMERCE_CLIENT_ID, quantity: 120 }], description: 'Lámpara solar LED para jardín, resistente al agua.', imageUrl: 'https://picsum.photos/seed/outdoorlight/300/300', skus: ['EXT-SOL-LMP-05'], category: 'Iluminación Exterior', ivaRate: 0.16, storeOwnerId: ANOTHER_ECOMMERCE_CLIENT_ID },
  { id: 'prod-plant-pot-another', name: 'Maceta Grande Terracota (Tienda Otro Cliente Ecommerce)', unitPrice: 40, stockByBranch: [{ branchId: ANOTHER_ECOMMERCE_CLIENT_ID, quantity: 60 }], description: 'Maceta de terracota de 50cm de diámetro, ideal para arbustos.', imageUrl: 'https://picsum.photos/seed/plantpot/300/300', skus: ['JAR-POT-TER-50'], category: 'Macetas', ivaRate: 0.16, storeOwnerId: ANOTHER_ECOMMERCE_CLIENT_ID },
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
    supplierProductCode: '675451027653', 
    department: 'MISCELANEO', 
    family: 'Cocina Exterior', 
    physicalLocation: 'Pasillo 5, Estante B', 
    displayOnScreen: true,
    requiresSerialNumber: false,
    creationDate: '2023-08-06', 
    useKitchenPrinter: false,
    useBarcodePrinter: false,
    availableStock: 6, 
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

const miscelaneoCategoryExists = INITIAL_CATEGORIES.some(cat => cat.name === 'MISCELANEO' && cat.storeOwnerId === ANOTHER_ECOMMERCE_CLIENT_ID);
if (!miscelaneoCategoryExists) {
    INITIAL_CATEGORIES.push({
        id: `cat-initial-${INITIAL_CATEGORIES.length}-miscelaneo-anot`,
        name: 'MISCELANEO',
        storeOwnerId: ANOTHER_ECOMMERCE_CLIENT_ID
    });
}


export const INITIAL_CLIENTS: Client[] = [
  { id: 'client-diaz', name: 'Laura', lastName: 'Díaz', email: 'laura.diaz@example.com', phone: '555-0202', address: 'Calle Luna 123, Ciudad Sol', billingAddress: 'Calle Luna 123, Ciudad Sol', clientType: 'Particular', preferredCommunication: 'Email', clientNotes: 'Cliente frecuente, prefiere comunicación por email. Interesada en promociones de jardinería.', acquisitionSource: 'Referido por Ana Fuentes' }, 
  { id: 'client-vega', name: 'Carlos', lastName: 'Vega', email: 'carlos.vega@example.com', phone: '555-0303', address: 'Avenida Estrella 456, Pueblo Cielo', clientType: 'Particular', industry: 'Tecnología', acquisitionSource: 'Búsqueda Web' },
  { id: 'client-martin', name: 'Elena', lastName: 'Martín', email: 'elena.martin@example.com', phone: '555-0404', clientType: 'Empresa', companyName: 'Consultores Martín & Asociados', taxId: 'EMA010203XYZ', contactPersonName: 'Elena Martín', preferredCommunication: 'Teléfono', industry: 'Consultoría Legal', clientNotes: 'Requiere facturas detalladas. Contactar preferiblemente por teléfono para asuntos urgentes.', acquisitionSource: 'Red de Contactos' },
  { id: 'client-ruiz', name: 'Javier', lastName: 'Ruiz', email: 'javier.ruiz@example.com', phone: '555-0505', clientType: 'Particular', preferredCommunication: 'WhatsApp' },
  { id: ECOMMERCE_CLIENT_ID, name: 'Cliente', lastName: 'Shopper', email: ECOMMERCE_CLIENT_EMAIL, phone: '555-0000', clientType: 'Particular', acquisitionSource: 'Publicidad Online' }, 
  { id: ANOTHER_ECOMMERCE_CLIENT_ID, name: 'OtroCliente', lastName: 'Comprador', email: 'otrocliente.ecommerce@example.com', phone: '555-0001', clientType: 'Particular' },
  { id: PROJECT_CLIENT_ID, name: 'Roberto', lastName: 'Gómez (Proyecto)', email: PROJECT_CLIENT_EMAIL, phone: '555-0101', address: 'Residencial Las Nubes, Apt 7B, Metroville', billingAddress: 'PO Box 1000, Metroville', clientType: 'Empresa', companyName: 'Innovaciones Gómez S.A.', taxId: 'IGO980706ABC', contactPersonName: 'Roberto Gómez', preferredCommunication: 'Email', industry: 'Desarrollo Inmobiliario', clientNotes: 'Cliente para proyecto de remodelación integral. Exigente con los plazos.', acquisitionSource: 'Recomendación de Arquitecto' },
];

export const EMPLOYEE_ROLES = ['Diseñador de Interiores', 'Contratista Principal', 'Gerente de Proyectos de Remodelación', 'Especialista en Plomería', 'Carpintero', 'Electricista', 'Albañil', 'Cajero', 'Representante de Ventas', 'Técnico de Instalaciones', 'Recursos Humanos'];

export const INITIAL_EMPLOYEES: Employee[] = [
  { 
    id: 'emp-designer-ana', 
    name: 'Ana', 
    lastName: 'Fuentes', 
    email: 'ana.fuentes@pazzi.com', 
    role: 'Diseñador de Interiores',
    address: 'Calle Sol 123, Ciudad Central',
    phone: '555-1111',
    emergencyContactName: 'Carlos Fuentes',
    emergencyContactRelationship: 'Esposo',
    emergencyContactPhone: '555-1112',
    hireDate: '2022-03-15',
    department: 'Diseño',
    salary: 55000,
    bankName: 'Banco Popular',
    bankAccountNumber: '123-456789-0',
    socialSecurityNumber: 'XXX-XX-1234', // Masked for privacy
    profilePictureUrl: 'https://picsum.photos/seed/anafuentes/200/200'
  },
  { 
    id: 'emp-contractor-juan', 
    name: 'Juan', 
    lastName: 'Pérez', 
    email: 'juan.perez@pazzi.com', 
    role: 'Contratista Principal',
    address: 'Avenida Luna 45, Villa Progreso',
    phone: '555-2222',
    emergencyContactName: 'Maria Pérez',
    emergencyContactRelationship: 'Hermana',
    emergencyContactPhone: '555-2223',
    hireDate: '2021-07-01',
    department: 'Operaciones',
    salary: 62000,
    bankName: 'Banco Central',
    bankAccountNumber: '987-654321-0',
    // socialSecurityNumber: 'XXX-XX-5678', // Not always filled
    profilePictureUrl: 'https://picsum.photos/seed/juanperez/200/200'
  },
  { 
    id: 'emp-pm-lucia', 
    name: 'Lucía', 
    lastName: 'Méndez', 
    email: 'lucia.mendez@pazzi.com', 
    role: 'Gerente de Proyectos de Remodelación',
    phone: '555-3333',
    hireDate: '2023-01-10',
    department: 'Gerencia de Proyectos',
    salary: 70000,
    profilePictureUrl: 'https://picsum.photos/seed/luciamendez/200/200'
  },
  { 
    id: 'emp-plumber-miguel', 
    name: 'Miguel', 
    lastName: 'Hernández', 
    email: 'miguel.hernandez@pazzi.com', 
    role: 'Especialista en Plomería',
    hireDate: '2022-09-20',
    department: 'Operaciones',
  },
  { 
    id: 'emp-carpenter-sofia', 
    name: 'Sofía', 
    lastName: 'Jiménez', 
    email: 'sofia.jimenez@pazzi.com', 
    role: 'Carpintero',
    phone: '555-4444',
    salary: 48000,
  },
  { 
    id: 'employee-user-predefined', 
    name: 'Empleado', 
    lastName: 'Demo', 
    email: EMPLOYEE_EMAIL, 
    role: 'Cajero',
    address: 'Dirección Demo 789',
    phone: '555-0000',
    hireDate: '2024-01-01',
    department: 'Ventas POS',
    salary: 30000
  }, 
  { 
    id: 'emp-sales-david', 
    name: 'David', 
    lastName: 'García', 
    email: 'david.garcia@pazzi.com', 
    role: 'Representante de Ventas',
    department: 'Ventas Corporativas',
  },
  { 
    id: 'emp-tech-maria', 
    name: 'María', 
    lastName: 'López', 
    email: 'maria.lopez@pazzi.com', 
    role: 'Técnico de Instalaciones'
  },
];

export const INITIAL_PROJECTS: Project[] = [
  { id: 'proj-kitchen-gomez', name: 'Renovación Cocina - Gómez', clientId: PROJECT_CLIENT_ID, startDate: '2024-09-01', endDate: '2024-10-15', status: ProjectStatus.ACTIVE, description: 'Modernización integral de cocina, incluyendo gabinetes, encimeras y electrodomésticos.', assignedProducts: [{productId: 'prod-cabinets-modern', quantity: 1}, {productId: 'prod-counter-granite', quantity: 8}], assignedEmployeeIds: ['emp-designer-ana', 'emp-contractor-juan', 'emp-plumber-miguel'] },
  { id: 'proj-bath-diaz', name: 'Baño Principal - Díaz', clientId: 'client-diaz', startDate: '2024-08-15', endDate: '2024-09-05', status: ProjectStatus.COMPLETED, description: 'Remodelación completa de baño principal con acabados de lujo.', assignedProducts: [{productId: 'prod-shower-set', quantity: 1}, {productId: 'prod-tile-ceramic', quantity: 25}, {productId: 'prod-vanity-bath', quantity: 1}], assignedEmployeeIds: ['emp-designer-ana', 'emp-plumber-miguel', 'emp-carpenter-sofia'] },
  { id: 'proj-office-vega', name: 'Oficina en Casa - Vega', clientId: 'client-vega', startDate: '2024-10-01', endDate: '2024-10-30', status: ProjectStatus.PENDING, description: 'Diseño y construcción de una oficina funcional y moderna en el hogar.', assignedProducts: [{productId: 'prod-paint-interior', quantity: 2}, {productId: 'prod-design-consultation', quantity: 1}], assignedEmployeeIds: ['emp-pm-lucia', 'emp-carpenter-sofia'] },
  { id: 'proj-garden-martin', name: 'Paisajismo Jardín - Martín', clientId: 'client-martin', startDate: '2024-11-01', endDate: '2024-11-20', status: ProjectStatus.PENDING, description: 'Diseño de jardín frontal con sistema de riego automático y nueva iluminación.', assignedProducts: [{productId: 'prod-outdoor-lighting-another', quantity: 5}, {productId: 'prod-plant-pot-another', quantity: 10}], assignedEmployeeIds: ['emp-designer-ana', 'emp-tech-maria'] },
];

export const VISIT_STATUS_OPTIONS = Object.values(VisitStatus);
export const INITIAL_VISITS: Visit[] = [ { id: 'visit-1', projectId: 'proj-kitchen-gomez', title: 'Medición Inicial Cocina', date: '2024-09-02', startTime: '10:00', endTime: '11:00', assignedEmployeeIds: ['emp-designer-ana'], notes: 'Tomar medidas exactas y discutir distribución.', status: VisitStatus.COMPLETADO }, { id: 'visit-2', projectId: 'proj-kitchen-gomez', title: 'Revisión Plomería Cocina', date: '2024-09-05', startTime: '14:00', endTime: '15:00', assignedEmployeeIds: ['emp-plumber-miguel'], notes: 'Verificar puntos de agua y desagüe.', status: VisitStatus.PROGRAMADO }, { id: 'visit-3', projectId: 'proj-bath-diaz', title: 'Presentación Diseño Baño', date: '2024-08-16', startTime: '11:00', endTime: '12:30', assignedEmployeeIds: ['emp-designer-ana'], notes: 'Mostrar renders y muestras de materiales.', status: VisitStatus.COMPLETADO }, { id: 'visit-4', projectId: 'proj-office-vega', title: 'Consulta Inicial Oficina', date: '2024-10-02', startTime: '09:00', endTime: '10:30', assignedEmployeeIds: ['emp-pm-lucia'], notes: 'Definir requerimientos y presupuesto.', status: VisitStatus.PROGRAMADO }, { id: 'visit-5', title: 'Mantenimiento General (Sin Proyecto)', date: '2024-09-25', startTime: '15:00', endTime: '17:00', assignedEmployeeIds: ['emp-tech-maria'], notes: 'Revisión sistema A/C cliente corporativo XYZ.', status: VisitStatus.PROGRAMADO }, { id: 'visit-6', projectId: 'proj-kitchen-gomez', title: 'Instalación Encimeras', date: '2024-09-20', startTime: '09:00', endTime: '13:00', assignedEmployeeIds: ['emp-contractor-juan'], status: VisitStatus.PROGRAMADO }, { id: 'visit-7', projectId: 'proj-garden-martin', title: 'Planificación Paisajismo', date: '2024-11-02', startTime: '10:00', endTime: '11:30', assignedEmployeeIds: ['emp-designer-ana'], status: VisitStatus.PROGRAMADO }, ];

export const DEFAULT_ECOMMERCE_SETTINGS: ECommerceSettings = { storeName: "Mi Tienda Online", logoUrl: "https://picsum.photos/seed/defaultstorelogo/150/50", template: 'Moderno', primaryColor: '#0F766E', };

export const INITIAL_SALES: Sale[] = [
    { id: 'sale-pos-1', date: new Date(Date.now() - 86400000 * 2).toISOString(), totalAmount: 75.50, items: [{...(INITIAL_PRODUCTS.find(p=>p.id === 'prod-paint-latex-white-demo') || INITIAL_PRODUCTS[0]) , quantity: 2} as CartItem, {...(INITIAL_PRODUCTS.find(p=>p.id === 'prod-tools-set-basic-demo') || INITIAL_PRODUCTS[0]), quantity: 1} as CartItem], paymentMethod: 'Efectivo', cajaId: '0008', employeeId: 'employee-user-predefined', clientId: 'client-diaz', branchId: firstActiveBranchId, paymentStatus: 'Pagado' },
    { id: 'sale-pos-2', date: new Date(Date.now() - 86400000 * 1).toISOString(), totalAmount: 120.00, items: [{...(INITIAL_PRODUCTS.find(p=>p.id === 'prod-smart-thermostat') || INITIAL_PRODUCTS[0]), quantity: 1} as CartItem], paymentMethod: 'Tarjeta', cajaId: '0008', employeeId: 'emp-sales-david', clientId: PROJECT_CLIENT_ID, branchId: firstActiveBranchId, paymentStatus: 'Pagado' }, // Changed client Gomez to PROJECT_CLIENT_ID
    { id: 'sale-pos-3', date: new Date().toISOString(), totalAmount: 30.00, items: [{...(INITIAL_PRODUCTS.find(p=>p.id === 'prod-paint-latex-white-demo') || INITIAL_PRODUCTS[0]), quantity: 1} as CartItem], paymentMethod: 'ATH Movil', cajaId: '0008', employeeId: 'employee-user-predefined', branchId: firstActiveBranchId, paymentStatus: 'Pagado'},
    { id: 'sale-pos-4', date: new Date(Date.now() - 86400000 * 0.5).toISOString(), totalAmount: 85.00, items: [{...(INITIAL_PRODUCTS.find(p=>p.id === 'prod-security-camera-admin') || INITIAL_PRODUCTS[0]), quantity: 1} as CartItem], paymentMethod: 'Tarjeta', cajaId: '0008', employeeId: 'emp-sales-david', clientId: 'client-vega', branchId: INITIAL_BRANCHES[1].id, paymentStatus: 'Pagado'},
    { id: 'sale-pos-5', date: new Date(Date.now() - 86400000 * 4).toISOString(), totalAmount: 250.00, items: [{...(INITIAL_PRODUCTS.find(p=>p.id === 'prod-sink-kitchen') || INITIAL_PRODUCTS[0]), quantity:1 } as CartItem, {...(INITIAL_PRODUCTS.find(p=>p.id === 'prod-tools-set-basic-demo') || INITIAL_PRODUCTS[0]), quantity:1 } as CartItem ], paymentMethod: 'Crédito C.', cajaId: '0008', employeeId: 'employee-user-predefined', clientId: ECOMMERCE_CLIENT_ID, branchId: firstActiveBranchId, paymentStatus: 'Pendiente de Pago'}, // Changed client to ECOMMERCE_CLIENT_ID
];

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [ { id: 'msg1', projectId: 'proj-kitchen-gomez', senderId: PROJECT_CLIENT_ID, senderName: 'Roberto Gómez (Proyecto)', timestamp: new Date(Date.now() - 86400000 * 2).toISOString(), text: 'Hola, ¿cómo va el progreso de la cocina?' }, { id: 'msg2', projectId: 'proj-kitchen-gomez', senderId: ADMIN_USER_ID, senderName: 'Admin Pazzi', timestamp: new Date(Date.now() - 86400000 * 2 + 60000).toISOString(), text: '¡Hola Roberto! Todo avanza según lo planeado. Los gabinetes se instalan esta semana.' }, { id: 'msg3', projectId: 'proj-kitchen-gomez', senderId: PROJECT_CLIENT_ID, senderName: 'Roberto Gómez (Proyecto)', timestamp: new Date(Date.now() - 86400000 * 1).toISOString(), text: 'Perfecto, ¡gracias por la actualización!' }, { id: 'msg4', projectId: 'proj-bath-diaz', senderId: 'client-diaz', senderName: 'Laura Díaz', timestamp: new Date(Date.now() - 86400000 * 3).toISOString(), text: '¿Podemos confirmar la visita para la presentación del diseño del baño?' }, { id: 'msg5', projectId: 'proj-bath-diaz', senderId: 'emp-designer-ana', senderName: 'Ana Fuentes', timestamp: new Date(Date.now() - 86400000 * 3 + 120000).toISOString(), text: '¡Claro Laura! Confirmada para el día 16 a las 11 AM. ¡Te va a encantar!' }, { id: 'msg6', projectId: 'proj-office-vega', senderId: 'client-vega', senderName: 'Carlos Vega', timestamp: new Date().toISOString(), text: '¿Alguna idea sobre el costo estimado para la oficina en casa?' }, { id: 'msg7', projectId: 'proj-office-vega', senderId: ADMIN_USER_ID, senderName: 'Admin Pazzi', timestamp: new Date(Date.now() + 60000).toISOString(), text: 'Hola Carlos, estoy preparando una estimación. Te la envío mañana.' }, ];

export const INITIAL_ORDERS: Order[] = [ { id: 'order-init-1', date: new Date(Date.now() - 86400000 * 3).toISOString(), clientName: 'Comprador Ecommerce Uno', clientEmail: ECOMMERCE_CLIENT_EMAIL, shippingAddress: 'Calle Ficticia 123, Ciudad Ejemplo, PR 00900', totalAmount: (INITIAL_PRODUCTS.find(p => p.id === 'prod-tile-ceramic' && p.storeOwnerId === ECOMMERCE_CLIENT_ID)!.unitPrice * 10 * (1 + (INITIAL_PRODUCTS.find(p => p.id === 'prod-tile-ceramic' && p.storeOwnerId === ECOMMERCE_CLIENT_ID)!.ivaRate || 0.16))), items: [ { ...(INITIAL_PRODUCTS.find(p => p.id === 'prod-tile-ceramic' && p.storeOwnerId === ECOMMERCE_CLIENT_ID) || INITIAL_PRODUCTS[0]), quantity: 10 } as CartItem ], status: 'Pendiente', storeOwnerId: ECOMMERCE_CLIENT_ID, paymentMethod: 'Tarjeta', }, { id: 'order-init-2', date: new Date(Date.now() - 86400000 * 1).toISOString(), clientName: 'Comprador Admin Dos', clientEmail: 'comprador.dos@example.com', shippingAddress: 'Avenida Siempre Viva 742, Otra Ciudad, PR 00901', totalAmount: (INITIAL_PRODUCTS.find(p => p.id === 'prod-shower-set' && p.storeOwnerId === ADMIN_USER_ID)!.unitPrice * 1 * (1 + (INITIAL_PRODUCTS.find(p => p.id === 'prod-shower-set' && p.storeOwnerId === ADMIN_USER_ID)!.ivaRate || 0.16))), items: [{ ...(INITIAL_PRODUCTS.find(p => p.id === 'prod-shower-set' && p.storeOwnerId === ADMIN_USER_ID) || INITIAL_PRODUCTS[0]), quantity: 1 } as CartItem], status: 'Enviado', storeOwnerId: ADMIN_USER_ID, paymentMethod: 'PayPal', }, { id: 'order-init-3', date: new Date(Date.now() - 86400000 * 5).toISOString(), clientName: 'Comprador Ecommerce Tres', clientEmail: 'comprador.tres@example.com', shippingAddress: 'Plaza Central 45, Pueblo Nuevo, PR 00902', totalAmount: ((INITIAL_PRODUCTS.find(p => p.id === 'prod-paint-latex-white-demo' && p.storeOwnerId === ECOMMERCE_CLIENT_ID)!.unitPrice * 3 + INITIAL_PRODUCTS.find(p => p.id === 'prod-tools-set-basic-demo' && p.storeOwnerId === ECOMMERCE_CLIENT_ID)!.unitPrice * 1) * (1 + (INITIAL_PRODUCTS.find(p => p.id === 'prod-paint-latex-white-demo' && p.storeOwnerId === ECOMMERCE_CLIENT_ID)!.ivaRate || 0.16))), items: [ { ...(INITIAL_PRODUCTS.find(p => p.id === 'prod-paint-latex-white-demo' && p.storeOwnerId === ECOMMERCE_CLIENT_ID) || INITIAL_PRODUCTS[0]), quantity: 3 } as CartItem, { ...(INITIAL_PRODUCTS.find(p => p.id === 'prod-tools-set-basic-demo' && p.storeOwnerId === ECOMMERCE_CLIENT_ID) || INITIAL_PRODUCTS[0]), quantity: 1 } as CartItem, ], status: 'Completado', storeOwnerId: ECOMMERCE_CLIENT_ID, paymentMethod: 'ATH Móvil', }, { id: 'order-init-4', date: new Date(Date.now() - 86400000 * 4).toISOString(), clientName: 'Comprador Otro Cliente Ecommerce Uno', clientEmail: 'comprador.otro1.ecommerce@example.com', shippingAddress: 'Calle Luna 100, Villa Sol, PR 00903', totalAmount: (INITIAL_PRODUCTS.find(p => p.id === 'prod-garden-tools-another' && p.storeOwnerId === ANOTHER_ECOMMERCE_CLIENT_ID)!.unitPrice * 1 * (1+(INITIAL_PRODUCTS.find(p => p.id === 'prod-garden-tools-another' && p.storeOwnerId === ANOTHER_ECOMMERCE_CLIENT_ID)!.ivaRate || 0.16))), items: [ { ...(INITIAL_PRODUCTS.find(p => p.id === 'prod-garden-tools-another' && p.storeOwnerId === ANOTHER_ECOMMERCE_CLIENT_ID) || INITIAL_PRODUCTS[0]), quantity: 1 } as CartItem ], status: 'Pendiente', storeOwnerId: ANOTHER_ECOMMERCE_CLIENT_ID, paymentMethod: 'Tarjeta', }, ];

export const INITIAL_SUPPLIERS: Supplier[] = [
    { id: 'sup-ceramicas-sl', name: 'Cerámicas S.L.', contactName: 'Maria Lopez', email: 'ventas@ceramicas-sl.com', phone: '900-123-456', address: 'Pol. Ind. La Cerámica, Nave 5', storeOwnerId: ECOMMERCE_CLIENT_ID },
    { id: 'sup-maderas-norte', name: 'Maderas del Norte', contactName: 'Juan Rodriguez', email: 'pedidos@maderasnorte.es', phone: '900-789-012', address: 'Calle Principal 42, Villa Madera' },
    { id: 'sup-aluminios-global', name: 'Aluminios Global', contactName: 'Pedro Garcia', email: 'info@aluminiosglobal.com', phone: '900-345-678', storeOwnerId: ADMIN_USER_ID },
    { id: 'sup-pinturas-max', name: 'Pinturas Máxima Calidad', contactName: 'Laura Vera', email: 'laura.vera@pinturasmax.com', phone: '900-987-654', address: 'Av. Industrial 10, Zona Franca', storeOwnerId: ECOMMERCE_CLIENT_ID },
    { id: 'sup-herrajes-sur', name: 'Herrajes del Sur S.A.', contactName: 'Carlos Fernández', email: 'cfernandez@herrajessur.com', phone: '900-654-321', address: 'Parque Empresarial Sur, Local 22' },
    { id: 'sup-mipad-pr', name: 'MIPAD DE PR, INC.', email: 'contacto@mipadpr.com', phone: '787-555-1234', address: 'Zona Industrial XYZ, San Juan, PR' }, 
];

export const INITIAL_SUPPLIER_ORDERS: SupplierOrder[] = [ { id: 'po-001', supplierId: 'sup-ceramicas-sl', orderDate: new Date(Date.now() - 86400000 * 10).toISOString().split('T')[0], expectedDeliveryDate: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0], items: [ { productId: 'prod-tile-ceramic', quantityOrdered: 200, unitCost: 3.50 } ], status: 'Recibido Completo', totalCost: (200 * 3.50), storeOwnerId: ECOMMERCE_CLIENT_ID, amountPaid: 700, paymentStatus: 'Pagado Completo' }, { id: 'po-002', supplierId: 'sup-maderas-norte', orderDate: new Date(Date.now() - 86400000 * 15).toISOString().split('T')[0], expectedDeliveryDate: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0], items: [ { productId: 'prod-cabinets-modern', quantityOrdered: 5, unitCost: 1800 } ], status: 'Pedido', totalCost: (5 * 1800), storeOwnerId: ADMIN_USER_ID, amountPaid: 0, paymentStatus: 'No Pagado' }, { id: 'po-003', supplierId: 'sup-pinturas-max', orderDate: new Date(Date.now() - 86400000 * 7).toISOString().split('T')[0], expectedDeliveryDate: new Date().toISOString().split('T')[0], items: [ { productId: 'prod-paint-latex-white-demo', quantityOrdered: 50, unitCost: 15 } ], status: 'Enviado', totalCost: (50 * 15), storeOwnerId: ECOMMERCE_CLIENT_ID, amountPaid: 300, paymentStatus: 'Pagado Parcialmente' }, ];

export const SUPPLIER_ORDER_STATUS_OPTIONS: SupplierOrderStatus[] = ['Borrador', 'Pedido', 'Enviado', 'Recibido Parcialmente', 'Recibido Completo', 'Cancelado'];

export const INITIAL_NOTIFICATIONS: Notification[] = [
    { id: 'notif-1', title: 'Nuevo Pedido Recibido', message: 'Pedido #ORDER-XYZ123 de Laura Díaz por $250.00.', timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), read: false, type: 'new_order', link: '/ecommerce/orders' },
    { id: 'notif-2', title: 'Actualización Proyecto Cocina', message: 'Roberto Gómez ha enviado un nuevo mensaje en el chat del proyecto "Renovación Cocina - Gómez".', timestamp: new Date(Date.now() - 3600000 * 5).toISOString(), read: true, type: 'project_update', link: '/pm/chat' },
    { id: 'notif-3', title: 'Stock Bajo: Azulejos', message: 'El producto "Azulejo Cerámico Blanco" tiene solo 10 unidades restantes en Sucursal Central.', timestamp: new Date(Date.now() - 3600000 * 24).toISOString(), read: false, type: 'low_stock', link: '/pos/inventory' },
];


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

export type SidebarItemConfig = SubModuleLink | SubModuleGroup;


export const APP_MODULES_CONFIG: { 
    name: AppModule; 
    path: string; 
    subModulesProject?: SidebarItemConfig[]; 
    subModulesPOS?: SidebarItemConfig[]; 
    subModulesEcommerce?: SidebarItemConfig[];
    subModulesProjectClient?: SidebarItemConfig[]; 
}[] = [
  {
    name: AppModule.PROJECT_MANAGEMENT,
    path: '/pm',
    subModulesProject: [
      { type: 'link', name: 'Proyectos', path: '/pm/projects', icon: React.createElement(BriefcaseIcon, { className: "w-6 h-6" }) },
      { type: 'link', name: 'Productos (Globales)', path: '/pm/products', icon: React.createElement(Squares2X2Icon, { className: "w-6 h-6" }) },
      { type: 'link', name: 'Categorías (Globales)', path: '/pm/categories', icon: React.createElement(ListBulletIcon, { className: "w-6 h-6" }) },
      { type: 'link', name: 'Clientes (Pazzi)', path: '/pm/clients', icon: React.createElement(UserGroupIcon, { className: "w-6 h-6" }) },
      { type: 'link', name: 'Empleados', path: '/pm/employees', icon: React.createElement(UsersIcon, { className: "w-6 h-6" }) },
      { type: 'link', name: 'Calendario', path: '/pm/calendar', icon: React.createElement(CalendarDaysIcon, { className: "w-6 h-6" }) },
      { type: 'link', name: 'Chat', path: '/pm/chat', icon: React.createElement(ChatBubbleLeftRightIcon, { className: "w-6 h-6" }) },
      { type: 'link', name: 'Reportes PM', path: '/pm/reports', icon: React.createElement(ChartBarIcon, { className: "w-6 h-6" }) }, 
      { type: 'link', name: 'Sucursales', path: '/pm/branches', icon: React.createElement(HomeIcon, { className: "w-6 h-6" }) },
    ],
  },
  {
    name: AppModule.POS,
    path: '/pos',
    subModulesPOS: [
      { type: 'link', name: 'Caja Registradora', path: '/pos/cashier', icon: React.createElement(CashBillIcon, { className: "w-6 h-6" }) },
      { 
        type: 'group', 
        name: 'Información y Reportes', 
        icon: React.createElement(InformationCircleIcon, {className: "w-6 h-6"}), 
        children: [
          { type: 'link', name: 'Dashboard POS', path: '/pos/dashboard', icon: React.createElement(ChartPieIcon, { className: "w-6 h-6" }) },
          { type: 'link', name: 'Historial de Ventas', path: '/pos/sales-history', icon: React.createElement(ListBulletIcon, { className: "w-6 h-6" }) },
        ]
      },
      { type: 'link', name: 'Inventario POS', path: '/pos/inventory', icon: React.createElement(Squares2X2Icon, { className: "w-6 h-6" }) },
      { type: 'link', name: 'Proveedores', path: '/ecommerce/suppliers', icon: React.createElement(TruckIcon, { className: "w-6 h-6" }) }, 
      {
        type: 'group',
        name: 'Finanzas',
        icon: React.createElement(BanknotesIcon, {className: "w-6 h-6"}),
        children: [
            { type: 'link', name: 'Cuentas por Pagar', path: '/pos/accounts-payable', icon: React.createElement(BanknotesIcon, {className: "w-5 h-5 opacity-70"}) }, // child icon can be smaller
            { type: 'link', name: 'Cuentas por Cobrar', path: '/pos/accounts-receivable', icon: React.createElement(BanknotesIcon, {className: "w-5 h-5 opacity-70"}) },
        ]
      }
    ],
  },
  {
    name: AppModule.ECOMMERCE,
    path: '/ecommerce',
    subModulesEcommerce: [
      { type: 'link', name: 'Config. Global E-commerce', path: '/ecommerce/dashboard', icon: React.createElement(Cog6ToothIcon, { className: "w-6 h-6" }) },
      { type: 'link', name: 'Ver Tienda Pública (Admin)', path: `/store/${ADMIN_USER_ID}`, icon: React.createElement(ShoppingCartIcon, { className: "w-6 h-6" }) },
      { type: 'link', name: 'Pedidos Globales (Admin)', path: '/ecommerce/orders', icon: React.createElement(ListBulletIcon, { className: "w-6 h-6" }) },
      { type: 'link', name: 'Proveedores (Globales)', path: '/ecommerce/suppliers', icon: React.createElement(TruckIcon, { className: "w-6 h-6" }) },
      { type: 'link', name: 'Pedidos a Proveedores (Globales)', path: '/ecommerce/supplier-orders', icon: React.createElement(DocumentArrowUpIcon, { className: "w-6 h-6" }) },
    ],
  },
  { 
    name: AppModule.PROJECT_CLIENT_DASHBOARD,
    path: '/project-client',
    subModulesProjectClient: [
        { type: 'link', name: 'Dashboard de Proyecto', path: '/project-client/dashboard', icon: React.createElement(BuildingStorefrontIcon, {className: "w-6 h-6"}) },
        { type: 'link', name: 'Calendario de Visitas', path: '/project-client/calendar', icon: React.createElement(CalendarDaysIcon, {className: "w-6 h-6"}) },
        { type: 'link', name: 'Chats de Mis Proyectos', path: '/project-client/dashboard', icon: React.createElement(ChatBubbleLeftRightIcon, {className: "w-6 h-6"}) }, 
    ]
  }
];

export const BUTTON_PRIMARY_CLASSES = "bg-primary hover:bg-secondary text-white font-semibold py-2 px-4 rounded-md shadow-sm transition-colors duration-150 disabled:opacity-50 dark:disabled:opacity-60";
export const BUTTON_SECONDARY_CLASSES = "bg-neutral-200 hover:bg-neutral-300 text-neutral-700 font-semibold py-2 px-4 rounded-md shadow-sm transition-colors duration-150 disabled:opacity-50 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-neutral-200 dark:disabled:opacity-60";
export const BUTTON_PRIMARY_SM_CLASSES = "bg-primary hover:bg-secondary text-white font-semibold py-1.5 px-3 rounded-md text-lg shadow-sm transition-colors duration-150 disabled:opacity-50 dark:disabled:opacity-60";
export const BUTTON_SECONDARY_SM_CLASSES = "bg-neutral-200 hover:bg-neutral-300 text-neutral-700 font-semibold py-1.5 px-3 rounded-md text-lg shadow-sm transition-colors duration-150 disabled:opacity-50 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-neutral-200 dark:disabled:opacity-60";
export const INPUT_SM_CLASSES = "px-3 py-1.5 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-lg text-neutral-700 placeholder-neutral-400 disabled:bg-neutral-100 dark:bg-neutral-700 dark:border-neutral-600 dark:text-neutral-200 dark:placeholder-neutral-400 dark:focus:ring-primary dark:focus:border-primary dark:disabled:bg-neutral-800";

export const authInputStyle = "mt-1 block w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-400";
export const authButtonPrimary = "w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50";
export const authLinkStyle = "font-medium text-accent hover:text-amber-600";
export const authSecondaryLinkStyle = "text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-400 dark:hover:text-neutral-300 mt-2 inline-block";

export const inputFormStyle = "block w-full px-3 py-2 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-400 disabled:bg-neutral-100 dark:disabled:bg-neutral-800";

const POS_BUTTON_BASE = "px-2 py-2 text-xs font-medium rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-neutral-700 focus:ring-white disabled:opacity-60 flex flex-col items-center justify-center leading-tight h-full";
export const POS_BUTTON_BLUE_CLASSES = `${POS_BUTTON_BASE} bg-blue-600 hover:bg-blue-700 text-white`;
export const POS_BUTTON_RED_CLASSES = `${POS_BUTTON_BASE} bg-red-600 hover:bg-red-700 text-white`;
export const POS_BUTTON_YELLOW_CLASSES = `${POS_BUTTON_BASE} bg-yellow-500 hover:bg-yellow-600 text-black`;
export const POS_BUTTON_PURPLE_CLASSES = `${POS_BUTTON_BASE} bg-purple-600 hover:bg-purple-700 text-white`;
export const POS_BUTTON_DARK_RED_CLASSES = `${POS_BUTTON_BASE} bg-red-800 hover:bg-red-900 text-white`;
export const POS_BUTTON_GREEN_CLASSES = `${POS_BUTTON_BASE} bg-green-600 hover:bg-green-700 text-white`;
export const POS_BUTTON_SECONDARY_CLASSES = `${POS_BUTTON_BASE} bg-neutral-500 hover:bg-neutral-600 text-white`;