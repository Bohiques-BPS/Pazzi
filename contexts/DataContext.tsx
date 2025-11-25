import React, { useState, createContext, useContext, useEffect, useCallback } from 'react';
import { Product, Client, Employee, Project, Sale, Order, Visit, Category, ChatMessage, User, Supplier, SupplierOrder, SupplierOrderStatus, SupplierOrderItem, Branch, ProductFormData, ProductStockInfo, Notification, NotificationType, Caja, ProjectStatus, HeldCart, CartItem, SalePayment, Estimate, InventoryLog, InventoryLogType, Department, Layaway, LayawayStatus, ProjectFormData, Task, TaskComment, TaskStatus } from '../types';
import { INITIAL_PRODUCTS, INITIAL_CLIENTS, INITIAL_EMPLOYEES, INITIAL_PROJECTS, INITIAL_SALES, INITIAL_ORDERS, INITIAL_VISITS, INITIAL_CATEGORIES, INITIAL_CHAT_MESSAGES, INITIAL_SUPPLIERS, INITIAL_SUPPLIER_ORDERS, INITIAL_BRANCHES, ADMIN_USER_ID, INITIAL_NOTIFICATIONS, INITIAL_CAJAS, INITIAL_ESTIMATES, INITIAL_INVENTORY_LOGS, INITIAL_SALE_PAYMENTS, INITIAL_DEPARTMENTS, INITIAL_TASKS, INITIAL_TASK_COMMENTS } from '../constants';
import { useAuth } from './AuthContext'; 
import { ShoppingCartIcon, ChatBubbleLeftRightIcon as ChatIcon } from '../components/icons'; // Example icons for notifications

type ReturnItemPayload = CartItem & { customRefundAmount?: number; returnToStock: boolean };

export interface DataContextType {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  getProductsByStoreOwner: (ownerId: string) => Product[];
  getProductStockForBranch: (productId: string, branchId: string) => number;
  updateProductStockForBranch: (productId: string, branchId: string, newQuantity: number) => void;
  getProductsWithStockForBranch: (branchId: string) => ProductStockInfo[];
  
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  addProject: (projectData: ProjectFormData) => Project;
  generateInvoiceForProject: (projectId: string, invoiceDetails?: { amount?: number; dueDate?: string }) => boolean;
  
  sales: Sale[]; 
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>; // Added setSales
  addSale: (saleData: Omit<Sale, 'id' | 'date' | 'branchId'> & {cajaId: string, employeeId: string, clientId?: string}, branchId: string) => void;
  processReturn: (originalSale: Sale, itemsToReturn: ReturnItemPayload[], employeeId: string, cajaId: string, branchId: string, reason: string) => void;
  recordSalePayment: (saleId: string) => void; 
  lastCompletedSale: Sale | null; 
  
  salePayments: SalePayment[]; // New: For partial payments
  addSalePayment: (paymentData: Omit<SalePayment, 'id'>) => void; // New

  estimates: Estimate[];
  setEstimates: React.Dispatch<React.SetStateAction<Estimate[]>>;
  addEstimate: (estimateData: Omit<Estimate, 'id'>) => Estimate;

  inventoryLogs: InventoryLog[];
  addInventoryLog: (logData: Omit<InventoryLog, 'id'>) => void;

  orders: Order[]; 
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  addOrder: (orderData: Omit<Order, 'id' | 'date' | 'storeOwnerId'>, storeOwnerId: string) => string; 
  updateOrderStatus: (orderId: string, newStatus: Order['status']) => void;
  getOrdersByStoreOwner: (ownerId: string) => Order[];
  getOrderById: (id: string) => Order | undefined;

  visits: Visit[];
  setVisits: React.Dispatch<React.SetStateAction<Visit[]>>;
  
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  getCategoriesByStoreOwner: (ownerId: string) => Category[];

  departments: Department[];
  setDepartments: React.Dispatch<React.SetStateAction<Department[]>>;

  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  addChatMessage: (messageData: Omit<ChatMessage, 'id' | 'timestamp' | 'senderName'>) => void;
  getChatMessagesForProject: (projectId: string) => ChatMessage[];
  
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  getSupplierById: (id: string) => Supplier | undefined;
  getSuppliersByStoreOwner: (ownerId: string) => Supplier[];
  
  supplierOrders: SupplierOrder[];
  setSupplierOrders: React.Dispatch<React.SetStateAction<SupplierOrder[]>>;
  addSupplierOrder: (orderData: Omit<SupplierOrder, 'id' | 'totalCost'>) => void;
  updateSupplierOrderStatus: (orderId: string, newStatus: SupplierOrderStatus, receivedToBranchId?: string) => void; 
  getSupplierOrderById: (id: string) => SupplierOrder | undefined;
  getSupplierOrdersByStoreOwner: (ownerId: string) => SupplierOrder[];
  recordSupplierOrderPayment: (orderId: string, amount: number, invoiceRef?: string, attachment?: string) => void; 

  getProductById: (id: string) => Product | undefined;
  getClientById: (id: string) => Client | undefined;
  getEmployeeById: (id: string) => Employee | undefined;
  getAllEmployees: () => Employee[];
  getProjectById: (id: string) => Project | undefined;
  getVisitsForDate: (date: Date) => Visit[];
  getUpcomingVisits: (count?: number) => Visit[];

  branches: Branch[];
  setBranches: React.Dispatch<React.SetStateAction<Branch[]>>;
  getBranchById: (branchId: string) => Branch | undefined;
  getAllBranches: () => Branch[];

  cajas: Caja[];
  setCajas: React.Dispatch<React.SetStateAction<Caja[]>>;
  getCajaById: (cajaId: string) => Caja | undefined;

  addProduct: (productData: ProductFormData) => void; 
  updateProduct: (productId: string, productData: ProductFormData) => void; 

  notifications: Notification[];
  addNotification: (notificationData: Omit<Notification, 'id' | 'timestamp' | 'read' | 'icon'>) => void;
  markNotificationAsRead: (notificationId: string) => void;
  getUnreadNotificationsCount: () => number;
  markAllNotificationsAsRead: () => void;

  heldCarts: HeldCart[];
  holdCurrentCart: (items: CartItem[], name?: string) => string; 
  recallCart: (cartId: string) => CartItem[] | null;
  deleteHeldCart: (cartId: string) => void;

  layaways: Layaway[];
  setLayaways: React.Dispatch<React.SetStateAction<Layaway[]>>;
  addLayaway: (layawayData: Omit<Layaway, 'id' | 'date'>, initialPayment: { amount: number; method: string }) => void;

  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  updateTask: (taskId: string, updates: Partial<Omit<Task, 'id'>>) => void;
  addTask: (taskData: Omit<Task, 'id' | 'archived' | 'order'>) => Task;
  taskComments: TaskComment[];
  setTaskComments: React.Dispatch<React.SetStateAction<TaskComment[]>>;
  addTaskComment: (commentData: Omit<TaskComment, 'id' | 'timestamp' | 'senderName'>) => void;
}

export const DataContext = createContext<DataContextType | null>(null);

export const DataProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const { currentUser } = useAuth(); 
    const [products, setProducts] = useState<Product[]>(() => JSON.parse(localStorage.getItem('pazziProducts') || JSON.stringify(INITIAL_PRODUCTS)));
    const [clients, setClients] = useState<Client[]>(() => JSON.parse(localStorage.getItem('pazziClients') || JSON.stringify(INITIAL_CLIENTS)));
    const [employees, setEmployees] = useState<Employee[]>(() => JSON.parse(localStorage.getItem('pazziEmployees') || JSON.stringify(INITIAL_EMPLOYEES)));
    const [projects, setProjects] = useState<Project[]>(() => JSON.parse(localStorage.getItem('pazziProjects') || JSON.stringify(INITIAL_PROJECTS)));
    const [sales, setSalesInternal] = useState<Sale[]>(() => JSON.parse(localStorage.getItem('pazziSales') || JSON.stringify(INITIAL_SALES)));
    const [salePayments, setSalePayments] = useState<SalePayment[]>(() => JSON.parse(localStorage.getItem('pazziSalePayments') || JSON.stringify(INITIAL_SALE_PAYMENTS)));
    const [estimates, setEstimates] = useState<Estimate[]>(() => JSON.parse(localStorage.getItem('pazziEstimates') || JSON.stringify(INITIAL_ESTIMATES)));
    const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>(() => JSON.parse(localStorage.getItem('pazziInventoryLogs') || JSON.stringify(INITIAL_INVENTORY_LOGS)));
    const [orders, setOrders] = useState<Order[]>(() => JSON.parse(localStorage.getItem('pazziOrders') || JSON.stringify(INITIAL_ORDERS)));
    const [visits, setVisits] = useState<Visit[]>(() => JSON.parse(localStorage.getItem('pazziVisits') || JSON.stringify(INITIAL_VISITS)));
    const [categories, setCategories] = useState<Category[]>(() => JSON.parse(localStorage.getItem('pazziCategories') || JSON.stringify(INITIAL_CATEGORIES)));
    const [departments, setDepartments] = useState<Department[]>(() => JSON.parse(localStorage.getItem('pazziDepartments') || JSON.stringify(INITIAL_DEPARTMENTS)));
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => JSON.parse(localStorage.getItem('pazziChatMessages') || JSON.stringify(INITIAL_CHAT_MESSAGES)));
    const [suppliers, setSuppliers] = useState<Supplier[]>(() => JSON.parse(localStorage.getItem('pazziSuppliers') || JSON.stringify(INITIAL_SUPPLIERS)));
    const [supplierOrders, setSupplierOrders] = useState<SupplierOrder[]>(() => JSON.parse(localStorage.getItem('pazziSupplierOrders') || JSON.stringify(INITIAL_SUPPLIER_ORDERS)));
    const [branches, setBranches] = useState<Branch[]>(() => JSON.parse(localStorage.getItem('pazziBranches') || JSON.stringify(INITIAL_BRANCHES)));
    const [cajas, setCajas] = useState<Caja[]>(() => JSON.parse(localStorage.getItem('pazziCajas') || JSON.stringify(INITIAL_CAJAS)));
    const [notifications, setNotifications] = useState<Notification[]>(() => JSON.parse(localStorage.getItem('pazziNotifications') || JSON.stringify(INITIAL_NOTIFICATIONS)));
    const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(() => JSON.parse(localStorage.getItem('pazziLastSale') || 'null'));
    const [heldCarts, setHeldCarts] = useState<HeldCart[]>(() => JSON.parse(localStorage.getItem('pazziHeldCarts') || '[]'));
    const [layaways, setLayaways] = useState<Layaway[]>(() => JSON.parse(localStorage.getItem('pazziLayaways') || '[]'));
    const [tasks, setTasks] = useState<Task[]>(() => JSON.parse(localStorage.getItem('pazziTasks') || JSON.stringify(INITIAL_TASKS)));
    const [taskComments, setTaskComments] = useState<TaskComment[]>(() => JSON.parse(localStorage.getItem('pazziTaskComments') || JSON.stringify(INITIAL_TASK_COMMENTS)));


    useEffect(() => { localStorage.setItem('pazziProducts', JSON.stringify(products)); }, [products]);
    useEffect(() => { localStorage.setItem('pazziClients', JSON.stringify(clients)); }, [clients]);
    useEffect(() => { localStorage.setItem('pazziEmployees', JSON.stringify(employees)); }, [employees]);
    useEffect(() => { localStorage.setItem('pazziProjects', JSON.stringify(projects)); }, [projects]);
    useEffect(() => { localStorage.setItem('pazziSales', JSON.stringify(sales)); }, [sales]);
    useEffect(() => { localStorage.setItem('pazziSalePayments', JSON.stringify(salePayments)); }, [salePayments]);
    useEffect(() => { localStorage.setItem('pazziEstimates', JSON.stringify(estimates)); }, [estimates]);
    useEffect(() => { localStorage.setItem('pazziInventoryLogs', JSON.stringify(inventoryLogs)); }, [inventoryLogs]);
    useEffect(() => { localStorage.setItem('pazziOrders', JSON.stringify(orders)); }, [orders]);
    useEffect(() => { localStorage.setItem('pazziVisits', JSON.stringify(visits)); }, [visits]);
    useEffect(() => { localStorage.setItem('pazziCategories', JSON.stringify(categories)); }, [categories]);
    useEffect(() => { localStorage.setItem('pazziDepartments', JSON.stringify(departments)); }, [departments]);
    useEffect(() => { localStorage.setItem('pazziChatMessages', JSON.stringify(chatMessages)); }, [chatMessages]);
    useEffect(() => { localStorage.setItem('pazziSuppliers', JSON.stringify(suppliers)); }, [suppliers]);
    useEffect(() => { localStorage.setItem('pazziSupplierOrders', JSON.stringify(supplierOrders)); }, [supplierOrders]);
    useEffect(() => { localStorage.setItem('pazziBranches', JSON.stringify(branches)); }, [branches]);
    useEffect(() => { localStorage.setItem('pazziCajas', JSON.stringify(cajas)); }, [cajas]);
    useEffect(() => { localStorage.setItem('pazziNotifications', JSON.stringify(notifications)); }, [notifications]);
    useEffect(() => { localStorage.setItem('pazziLastSale', JSON.stringify(lastCompletedSale)); }, [lastCompletedSale]);
    useEffect(() => { localStorage.setItem('pazziHeldCarts', JSON.stringify(heldCarts)); }, [heldCarts]);
    useEffect(() => { localStorage.setItem('pazziLayaways', JSON.stringify(layaways)); }, [layaways]);
    useEffect(() => { localStorage.setItem('pazziTasks', JSON.stringify(tasks)); }, [tasks]);
    useEffect(() => { localStorage.setItem('pazziTaskComments', JSON.stringify(taskComments)); }, [taskComments]);

    const setSales = useCallback((updater: React.SetStateAction<Sale[]>) => {
        setSalesInternal(updater);
    }, [setSalesInternal]);

    const getProductById = useCallback((id: string) => products.find(p => p.id === id), [products]);
    
    const addNotification = useCallback((notificationData: Omit<Notification, 'id' | 'timestamp' | 'read' | 'icon'>) => {
        let icon: React.ComponentType<any> | undefined;
        switch (notificationData.type) {
            case 'new_order': icon = ShoppingCartIcon; break;
            case 'chat_message': icon = ChatIcon; break;
            default: icon = undefined;
        }
        const newNotification: Notification = {
            ...notificationData,
            id: `notif-${Date.now()}`,
            timestamp: new Date().toISOString(),
            read: false,
            icon: icon,
        };
        setNotifications(prev => [newNotification, ...prev]); 
    }, []);

    const addInventoryLog = useCallback((logData: Omit<InventoryLog, 'id'>) => {
        const newLog: InventoryLog = {
            id: `invlog-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            ...logData
        };
        setInventoryLogs(prev => [newLog, ...prev]);
    }, []);

    const addEstimate = useCallback((estimateData: Omit<Estimate, 'id'>): Estimate => {
        const newEstimate: Estimate = {
            ...estimateData,
            id: `est-${Date.now()}`,
        };
        setEstimates(prev => [newEstimate, ...prev]);
        addNotification({
            title: `Nuevo Estimado #${newEstimate.id.slice(-6)}`,
            message: `Creado. Total: $${newEstimate.totalAmount.toFixed(2)}`,
            type: 'generic',
            link: '/pos/estimates'
        });
        return newEstimate;
    }, [addNotification]);
    
    const addProject = useCallback((projectData: ProjectFormData): Project => {
        const newProject: Project = {
            id: `proj-${Date.now()}`,
            ...projectData,
            invoiceGenerated: false, // Ensure defaults are set
        };
        setProjects(prev => [...prev, newProject]);
        addNotification({
            title: `Nuevo Proyecto Creado: ${newProject.name}`,
            message: `El proyecto ha sido creado y asignado al cliente.`,
            type: 'generic',
            link: '/pm/projects'
        });
        return newProject;
    }, [setProjects, addNotification]);


    const generateInvoiceForProject = useCallback((projectId: string, invoiceDetails?: { amount?: number; dueDate?: string }): boolean => {
        setProjects(prevProjects => {
            const projectIndex = prevProjects.findIndex(p => p.id === projectId);
            if (projectIndex === -1) {
                console.error("Proyecto no encontrado para generar factura.");
                return prevProjects;
            }

            const projectToUpdate = { ...prevProjects[projectIndex] };

            if (projectToUpdate.status !== ProjectStatus.COMPLETED) {
                addNotification({ title: "Error de Facturación", message: `Proyecto "${projectToUpdate.name}" no está completado.`, type: 'generic' });
                return prevProjects;
            }
            if (projectToUpdate.invoiceGenerated) {
                addNotification({ title: "Factura Duplicada", message: `Factura ya generada para "${projectToUpdate.name}".`, type: 'generic' });
                return prevProjects;
            }

            const today = new Date();
            projectToUpdate.invoiceGenerated = true;
            projectToUpdate.invoiceDate = today.toISOString().split('T')[0];
            projectToUpdate.invoiceNumber = `INV-${projectToUpdate.id.slice(-4)}-${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
            
            if (invoiceDetails?.amount !== undefined) {
                projectToUpdate.invoiceAmount = invoiceDetails.amount;
            } else {
                let calculatedAmount = 0;
                projectToUpdate.assignedProducts.forEach(ap => {
                    const productInfo = getProductById(ap.productId);
                    if (productInfo) {
                        calculatedAmount += productInfo.unitPrice * ap.quantity;
                    }
                });
                const ivaRate = 0.16; 
                projectToUpdate.invoiceAmount = calculatedAmount * (1 + ivaRate);
            }

            if (invoiceDetails?.dueDate) {
                projectToUpdate.paymentDueDate = invoiceDetails.dueDate;
            } else {
                const dueDate = new Date(today);
                dueDate.setDate(today.getDate() + 30); 
                projectToUpdate.paymentDueDate = dueDate.toISOString().split('T')[0];
            }
            
            const updatedProjects = [...prevProjects];
            updatedProjects[projectIndex] = projectToUpdate;
            addNotification({
                title: `Factura Generada para ${projectToUpdate.name}`,
                message: `Factura #${projectToUpdate.invoiceNumber} por $${projectToUpdate.invoiceAmount?.toFixed(2)}`,
                type: 'generic', 
                link: `/pm/projects` 
            });
            return updatedProjects;
        });
        return true; 
    }, [getProductById, addNotification]);


    const markNotificationAsRead = useCallback((notificationId: string) => {
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
    }, []);
    
    const getUnreadNotificationsCount = useCallback(() => {
        return notifications.filter(n => !n.read).length;
    }, [notifications]);
    
    const markAllNotificationsAsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }, []);


    const getAllBranches = useCallback(() => branches, [branches]);
    const getBranchById = useCallback((branchId: string) => branches.find(b => b.id === branchId), [branches]);
    const getCajaById = useCallback((cajaId: string) => cajas.find(c => c.id === cajaId), [cajas]);


    const getProductStockForBranch = useCallback((productId: string, branchId: string): number => {
        const product = products.find(p => p.id === productId);
        if (product && product.stockByBranch) {
            const stockEntry = product.stockByBranch.find(sb => sb.branchId === branchId);
            return stockEntry ? stockEntry.quantity : 0;
        }
        return 0;
    }, [products]);

    const updateProductStockForBranch = useCallback((productId: string, branchId: string, newQuantity: number): void => {
        setProducts(prevProducts => prevProducts.map(p => {
            if (p.id === productId) {
                const updatedStockByBranch = [...p.stockByBranch];
                const branchStockIndex = updatedStockByBranch.findIndex(sb => sb.branchId === branchId);
                if (branchStockIndex !== -1) {
                    updatedStockByBranch[branchStockIndex] = { ...updatedStockByBranch[branchStockIndex], quantity: Math.max(0, newQuantity) };
                } else {
                    updatedStockByBranch.push({ branchId, quantity: Math.max(0, newQuantity) });
                }
                return { ...p, stockByBranch: updatedStockByBranch };
            }
            return p;
        }));
    }, []);
    
    const addProduct = useCallback((productData: ProductFormData) => {
        const newId = `prod-${productData.storeOwnerId.slice(0,4)}-${Date.now()}`;
        let initialStockByBranch: Product['stockByBranch'] = [];

        if (productData.storeOwnerId === ADMIN_USER_ID) {
            initialStockByBranch = branches
                .filter(b => b.isActive) 
                .map(b => ({ branchId: b.id, quantity: productData.availableStock || 0 })); 
        } else { 
            initialStockByBranch = [{ branchId: productData.storeOwnerId, quantity: productData.availableStock || 0 }]; 
        }

        const newProduct: Product = {
            id: newId,
            ...productData,
            stockByBranch: initialStockByBranch,
        };
        setProducts(prev => [...prev, newProduct]);
    }, [branches]);

    const updateProduct = useCallback((productId: string, productData: ProductFormData) => {
        setProducts(prevProducts => prevProducts.map(p => {
            if (p.id === productId) {
                let stockByBranch = p.stockByBranch;
                if (productData.availableStock !== undefined && productData.storeOwnerId === ADMIN_USER_ID && branches.length > 0) {
                    const firstActiveBranch = branches.find(b => b.isActive);
                    if (firstActiveBranch) {
                        const existingEntryIndex = stockByBranch.findIndex(sb => sb.branchId === firstActiveBranch.id);
                        if (existingEntryIndex !== -1) {
                            stockByBranch[existingEntryIndex] = { ...stockByBranch[existingEntryIndex], quantity: productData.availableStock };
                        } else {
                            stockByBranch.push({ branchId: firstActiveBranch.id, quantity: productData.availableStock });
                        }
                    }
                } else if (productData.availableStock !== undefined && productData.storeOwnerId !== ADMIN_USER_ID) {
                    const clientBranchIndex = stockByBranch.findIndex(sb => sb.branchId === productData.storeOwnerId);
                     if (clientBranchIndex !== -1) {
                        stockByBranch[clientBranchIndex] = { ...stockByBranch[clientBranchIndex], quantity: productData.availableStock };
                    } else {
                        stockByBranch.push({ branchId: productData.storeOwnerId, quantity: productData.availableStock });
                    }
                }

                return { 
                    ...p, 
                    ...productData,
                    stockByBranch 
                }; 
            }
            return p;
        }));
    }, [branches]);


    const getProductsByStoreOwner = useCallback((ownerId: string): Product[] => {
        return products.filter(p => p.storeOwnerId === ownerId);
    }, [products]);

    const getCategoriesByStoreOwner = useCallback((ownerId: string): Category[] => {
        return categories.filter(c => !c.storeOwnerId || c.storeOwnerId === ownerId);
    }, [categories]);
    
    const getSuppliersByStoreOwner = useCallback((ownerId: string): Supplier[] => {
        return suppliers.filter(s => !s.storeOwnerId || s.storeOwnerId === ownerId);
    }, [suppliers]);

    const getSupplierOrdersByStoreOwner = useCallback((ownerId: string): SupplierOrder[] => {
        return supplierOrders.filter(so => so.storeOwnerId === ownerId);
    }, [supplierOrders]);

    const addSale = useCallback((saleData: Omit<Sale, 'id' | 'date' | 'branchId'>, branchId: string) => {
        const newSale: Sale = {
            ...saleData,
            id: `sale-${Date.now()}`,
            date: new Date().toISOString(),
            branchId: branchId,
            paymentStatus: saleData.paymentMethod === 'Crédito C.' ? 'Pendiente de Pago' : 'Pagado',
        };
        setSalesInternal(prev => [...prev, newSale]);
        setLastCompletedSale(newSale); 
        
        newSale.items.forEach(cartItem => {
            if (currentUser && !cartItem.isService) {
                const stockBefore = getProductStockForBranch(cartItem.id, branchId);
                const stockAfter = stockBefore - cartItem.quantity;
                updateProductStockForBranch(cartItem.id, branchId, stockAfter);
                addInventoryLog({
                    productId: cartItem.id,
                    branchId: branchId,
                    date: newSale.date,
                    type: InventoryLogType.SALE_POS,
                    quantityChange: -cartItem.quantity,
                    stockBefore: stockBefore,
                    stockAfter: stockAfter,
                    referenceId: newSale.id,
                    employeeId: currentUser.id,
                    notes: `Venta #${newSale.id.slice(-6)}`
                });
            }
        });
         addNotification({
            title: `Nueva Venta POS #${newSale.id.substring(0,6)}`,
            message: `Total: $${newSale.totalAmount.toFixed(2)}, Método: ${newSale.paymentMethod}`,
            type: 'new_order', 
            link: `/pos/sales-history`
        });
    }, [getProductStockForBranch, updateProductStockForBranch, addNotification, setLastCompletedSale, addInventoryLog, currentUser]);

    const processReturn = useCallback((originalSale: Sale, itemsToReturn: ReturnItemPayload[], employeeId: string, cajaId: string, branchId: string, reason: string) => {
        if (itemsToReturn.length === 0) return;
    
        const returnTotal = itemsToReturn.reduce((sum, item) => {
            if (item.customRefundAmount !== undefined) {
                return sum + item.customRefundAmount;
            }
            let itemPrice = item.unitPrice;
            if (item.discount) {
                if (item.discount.type === 'percentage') {
                    itemPrice *= (1 - item.discount.value / 100);
                } else {
                    itemPrice = Math.max(0, itemPrice - item.discount.value);
                }
            }
            return sum + (itemPrice * item.quantity);
        }, 0);
        
        const newReturnSale: Sale = {
            id: `return-${Date.now()}`,
            date: new Date().toISOString(),
            totalAmount: -returnTotal,
            items: itemsToReturn,
            paymentMethod: 'Devolución',
            cajaId,
            branchId,
            employeeId,
            paymentStatus: 'Pagado',
            clientId: originalSale.clientId,
            isReturn: true,
            originalSaleId: originalSale.id,
        };
    
        setSalesInternal(prev => [...prev, newReturnSale]);
    
        const isFullReturn = itemsToReturn.length === originalSale.items.length && itemsToReturn.every(returnedItem => {
            const originalItem = originalSale.items.find(oi => oi.id === returnedItem.id);
            return originalItem && originalItem.quantity === returnedItem.quantity;
        });
    
        const newStatus = isFullReturn ? 'Devolución Completa' : 'Devolución Parcial';
    
        setSalesInternal(prev => prev.map(s => s.id === originalSale.id ? { ...s, paymentStatus: newStatus } : s));
    
        itemsToReturn.forEach(item => {
            if (item.returnToStock && !item.isService) {
                const stockBefore = getProductStockForBranch(item.id, branchId);
                const stockAfter = stockBefore + item.quantity;
                updateProductStockForBranch(item.id, branchId, stockAfter);
                addInventoryLog({
                    productId: item.id,
                    branchId: branchId,
                    date: newReturnSale.date,
                    type: InventoryLogType.RETURN,
                    quantityChange: item.quantity,
                    stockBefore: stockBefore,
                    stockAfter: stockAfter,
                    referenceId: newReturnSale.id,
                    employeeId,
                    notes: `Devolución de Venta #${originalSale.id.slice(-6)}. Razón: ${reason}`
                });
            }
        });
    
    }, [getProductStockForBranch, updateProductStockForBranch, addInventoryLog, setSalesInternal]);


    const addSalePayment = useCallback((paymentData: Omit<SalePayment, 'id'>) => {
        const newPayment: SalePayment = {
            ...paymentData,
            id: `sp-${Date.now()}`
        };
        setSalePayments(prev => [...prev, newPayment]);
        
        // Potentially update Sale's paymentStatus if fully paid
        const targetSale = sales.find(s => s.id === paymentData.saleId);
        if (targetSale) {
            const totalPaidForSale = [...salePayments, newPayment]
                .filter(p => p.saleId === paymentData.saleId)
                .reduce((sum, p) => sum + p.amountPaid, 0);
            
            if (totalPaidForSale >= targetSale.totalAmount) {
                setSalesInternal(prevSales => prevSales.map(s => 
                    s.id === paymentData.saleId ? { ...s, paymentStatus: 'Pagado' } : s
                ));
            }
        }
    }, [sales, salePayments]);

    const getClientById = useCallback((id: string) => clients.find(c => c.id === id), [clients]);

    const addLayaway = useCallback((layawayData: Omit<Layaway, 'id' | 'date'>, initialPayment: { amount: number; method: string }) => {
        const newLayaway: Layaway = {
            ...layawayData,
            id: `lay-${Date.now()}`,
            date: new Date().toISOString(),
        };
        setLayaways(prev => [...prev, newLayaway]);
        
        addSalePayment({
            layawayId: newLayaway.id,
            paymentDate: newLayaway.date,
            amountPaid: initialPayment.amount,
            paymentMethodUsed: initialPayment.method,
            notes: 'Abono inicial de apartado.'
        });

        newLayaway.items.forEach(cartItem => {
            if (currentUser && !cartItem.isService) {
                const stockBefore = getProductStockForBranch(cartItem.id, newLayaway.branchId);
                const stockAfter = stockBefore - cartItem.quantity;
                updateProductStockForBranch(cartItem.id, newLayaway.branchId, stockAfter);
                addInventoryLog({
                    productId: cartItem.id,
                    branchId: newLayaway.branchId,
                    date: newLayaway.date,
                    type: InventoryLogType.SALE_POS,
                    quantityChange: -cartItem.quantity,
                    stockBefore: stockBefore,
                    stockAfter: stockAfter,
                    referenceId: newLayaway.id,
                    employeeId: currentUser.id,
                    notes: `Apartado #${newLayaway.id.slice(-6)}`
                });
            }
        });

        addNotification({
            title: `Nuevo Apartado #${newLayaway.id.slice(-6)}`,
            message: `Total: $${newLayaway.totalAmount.toFixed(2)}, Cliente: ${getClientById(newLayaway.clientId)?.name}`,
            type: 'generic',
            link: '/pos/layaways'
        });
    }, [addSalePayment, currentUser, getProductStockForBranch, updateProductStockForBranch, addInventoryLog, addNotification, getClientById]);


    
    const addOrder = useCallback((orderData: Omit<Order, 'id' | 'date' | 'storeOwnerId'>, storeOwnerId: string): string => {
        const newOrder: Order = {
            ...orderData,
            id: `order-${Date.now()}`,
            date: new Date().toISOString(),
            storeOwnerId: storeOwnerId,
        };
        setOrders(prev => [...prev, newOrder]);
        newOrder.items.forEach(cartItem => {
            const currentStock = getProductStockForBranch(cartItem.id, storeOwnerId); 
            updateProductStockForBranch(cartItem.id, storeOwnerId, currentStock - cartItem.quantity);
        });
        addNotification({
            title: `Nuevo Pedido Online #${newOrder.id.substring(0,8)}`,
            message: `Cliente: ${newOrder.clientName}, Total: $${newOrder.totalAmount.toFixed(2)}`,
            type: 'new_order',
            link: `/ecommerce/orders` 
        });
        return newOrder.id; 
    }, [getProductStockForBranch, updateProductStockForBranch, addNotification]);

    const updateOrderStatus = useCallback((orderId: string, newStatus: Order['status']) => {
        setOrders(prevOrders => prevOrders.map(order => order.id === orderId ? { ...order, status: newStatus } : order));
    }, []);

    const getOrdersByStoreOwner = useCallback((ownerId: string): Order[] => {
        return orders.filter(o => o.storeOwnerId === ownerId);
    }, [orders]);
    
    const getOrderById = useCallback((id: string) => orders.find(o => o.id === id), [orders]); 

    const getProjectById = useCallback((id: string) => projects.find(p => p.id === id), [projects]);

    const addChatMessage = useCallback((messageData: Omit<ChatMessage, 'id' | 'timestamp' | 'senderName'>) => {
        if (!currentUser) { console.error("Cannot send message: no current user."); return; }
        const newMessage: ChatMessage = { 
            ...messageData, 
            id: `msg-${Date.now()}`, 
            timestamp: new Date().toISOString(), 
            senderName: currentUser.name || currentUser.email || 'Usuario Desconocido', 
        };
        setChatMessages(prev => [...prev, newMessage]);
        
        const projectForNotification = projects.find(p => p.id === messageData.projectId);
        if (projectForNotification) {
             addNotification({
                title: `Nuevo mensaje en "${projectForNotification.name}"`,
                message: `${newMessage.senderName}: ${newMessage.text.substring(0, 50)}${newMessage.text.length > 50 ? '...' : ''}`,
                type: 'chat_message',
                link: `/pm/chat` 
            });
        }
    }, [currentUser, addNotification, projects]);

    const getChatMessagesForProject = useCallback((projectId: string): ChatMessage[] => {
        return chatMessages.filter(msg => msg.projectId === projectId).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [chatMessages]);

    const getSupplierById = useCallback((id: string) => suppliers.find(s => s.id === id), [suppliers]);
    
    const addSupplierOrder = useCallback((orderData: Omit<SupplierOrder, 'id' | 'totalCost'>) => {
        const totalCost = orderData.items.reduce((sum, item) => sum + (item.quantityOrdered * item.unitCost), 0);
        const newSupplierOrder: SupplierOrder = { ...orderData, id: `po-${Date.now()}`, totalCost, amountPaid: 0, paymentStatus: 'No Pagado' };
        setSupplierOrders(prev => [...prev, newSupplierOrder]);
    }, []);

    const updateSupplierOrderStatus = useCallback((orderId: string, newStatus: SupplierOrderStatus, receivedToBranchId?: string) => {
        setSupplierOrders(prevSupplierOrders =>
            prevSupplierOrders.map(order => {
                if (order.id === orderId) {
                    const updatedOrder = { ...order, status: newStatus };
                    if (newStatus === 'Recibido Completo' && (order.storeOwnerId === ADMIN_USER_ID || !order.storeOwnerId)) { 
                        const targetBranchId = receivedToBranchId || (branches.find(b => b.isActive)?.id || '');
                        if (targetBranchId && currentUser) {
                            updatedOrder.items.forEach((item: SupplierOrderItem) => {
                                if (!getProductById(item.productId)?.isService) {
                                    const stockBefore = getProductStockForBranch(item.productId, targetBranchId);
                                    const stockAfter = stockBefore + item.quantityOrdered;
                                    updateProductStockForBranch(item.productId, targetBranchId, stockAfter);
                                    addInventoryLog({
                                        productId: item.productId,
                                        branchId: targetBranchId,
                                        date: new Date().toISOString(),
                                        type: InventoryLogType.SUPPLIER_RECEPTION,
                                        quantityChange: item.quantityOrdered,
                                        stockBefore: stockBefore,
                                        stockAfter: stockAfter,
                                        referenceId: order.id,
                                        employeeId: currentUser.id,
                                        notes: `Pedido a ${getSupplierById(order.supplierId)?.name || 'proveedor'} #${order.id.slice(-6)}`
                                    });
                                }
                            });
                        } else {
                            console.warn("No active branch or current user found to receive supplier order items for order:", orderId);
                        }
                    }
                    return updatedOrder;
                }
                return order;
            })
        );
    }, [branches, getProductStockForBranch, updateProductStockForBranch, addInventoryLog, currentUser, getProductById, getSupplierById]); 

    const getSupplierOrderById = useCallback((id: string) => supplierOrders.find(so => so.id === id), [supplierOrders]);
    
    const getEmployeeById = useCallback((id: string) => employees.find(e => e.id === id), [employees]);
    const getAllEmployees = useCallback(() => employees, [employees]);
    

    const getVisitsForDate = useCallback((date: Date): Visit[] => {
        const dateString = date.toISOString().split('T')[0];
        return visits.filter(v => v.date === dateString).sort((a,b) => a.startTime.localeCompare(b.startTime));
    }, [visits]);

    const getUpcomingVisits = useCallback((count: number = 5): Visit[] => {
        const today = new Date().toISOString().split('T')[0];
        const nowTime = new Date().toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit'});
        return visits.filter(v => v.date >= today).sort((a, b) => a.date === b.date ? a.startTime.localeCompare(b.startTime) : a.date.localeCompare(b.date)).filter(v => v.date === today ? v.startTime >= nowTime : true).slice(0, count);
    }, [visits]);

    const recordSupplierOrderPayment = useCallback((orderId: string, amount: number, invoiceRef?: string, attachment?: string) => {
        setSupplierOrders(prevOrders => prevOrders.map(order => {
            if (order.id === orderId) {
                const newAmountPaid = (order.amountPaid || 0) + amount;
                let newPaymentStatus: SupplierOrder['paymentStatus'] = 'Pagado Parcialmente';
                if (newAmountPaid >= order.totalCost) {
                    newPaymentStatus = 'Pagado Completo';
                } else if (newAmountPaid <= 0) {
                    newPaymentStatus = 'No Pagado';
                }
                
                const paymentDetails: any = {
                    p: amount.toFixed(2), // payment amount
                    d: new Date().toLocaleDateString(), // date
                };
                if (invoiceRef) paymentDetails.i = invoiceRef;
                if (attachment) paymentDetails.a = attachment; // attachment as data URL

                const newPaymentNote = JSON.stringify(paymentDetails);

                const newPaymentNotes = [...(order.paymentNotes || []), newPaymentNote];

                return { ...order, amountPaid: newAmountPaid, paymentStatus: newPaymentStatus, paymentNotes: newPaymentNotes };
            }
            return order;
        }));
    }, []);

    const recordSalePayment = useCallback((saleId: string) => {
        setSalesInternal(prevSales => prevSales.map(sale => 
            sale.id === saleId ? { ...sale, paymentStatus: 'Pagado' } : sale
        ));
    }, []);

    const getProductsWithStockForBranch = useCallback((branchId: string): ProductStockInfo[] => {
        return products.map(p => {
            const stockEntry = p.stockByBranch.find(sb => sb.branchId === branchId);
            const totalStock = p.stockByBranch.reduce((sum, sb) => sum + sb.quantity, 0);
            return {
                ...p,
                stockAtBranch: stockEntry ? stockEntry.quantity : 0,
                totalStockAcrossAllBranches: totalStock,
            };
        });
    }, [products]);

    const holdCurrentCart = useCallback((items: CartItem[], name?: string): string => {
        const newHeldCart: HeldCart = {
            id: `held-${Date.now()}`,
            name: name || `Carrito #${heldCarts.length + 1}`,
            items,
            totalAmount: items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
            date: new Date().toISOString(),
        };
        setHeldCarts(prev => [...prev, newHeldCart]);
        return newHeldCart.id;
    }, [heldCarts]);

    const recallCart = useCallback((cartId: string): CartItem[] | null => {
        const cartToRecall = heldCarts.find(hc => hc.id === cartId);
        if (cartToRecall) {
            setHeldCarts(prev => prev.filter(hc => hc.id !== cartId)); 
            return cartToRecall.items;
        }
        return null;
    }, [heldCarts]);

    const deleteHeldCart = useCallback((cartId: string) => {
        setHeldCarts(prev => prev.filter(hc => hc.id !== cartId));
    }, []);

    const updateTask = useCallback((taskId: string, updates: Partial<Omit<Task, 'id'>>) => {
        setTasks(prevTasks => prevTasks.map(task =>
            task.id === taskId ? { ...task, ...updates } : task
        ));
    }, [setTasks]);

    const addTask = useCallback((taskData: Omit<Task, 'id' | 'archived' | 'order'>): Task => {
        const newOrder = tasks.filter(t => t.projectId === taskData.projectId && t.status === taskData.status).length;
        const newTask: Task = {
            ...taskData,
            id: `task-${Date.now()}`,
            archived: false,
            order: newOrder,
        };
        setTasks(prev => [...prev, newTask]);
        return newTask;
    }, [tasks, setTasks]);

    const addTaskComment = useCallback((commentData: Omit<TaskComment, 'id' | 'timestamp' | 'senderName'>) => {
        if (!currentUser) return;
        const newComment: TaskComment = {
            ...commentData,
            id: `taskcomment-${Date.now()}`,
            timestamp: new Date().toISOString(),
            senderName: `${currentUser.name} ${currentUser.lastName}`.trim() || currentUser.email,
        };
        setTaskComments(prev => [...prev, newComment]);
    }, [currentUser, setTaskComments]);


    return (
        <DataContext.Provider value={{ 
            products, setProducts, getProductsByStoreOwner, getProductStockForBranch, updateProductStockForBranch, addProduct, updateProduct, getProductsWithStockForBranch,
            clients, setClients, employees, setEmployees, projects, setProjects, addProject, generateInvoiceForProject,
            sales, setSales, addSale, processReturn, recordSalePayment, lastCompletedSale,
            salePayments, addSalePayment,
            estimates, setEstimates, addEstimate,
            inventoryLogs, addInventoryLog,
            orders, setOrders, addOrder, updateOrderStatus, getOrdersByStoreOwner, getOrderById, 
            visits, setVisits, 
            categories, setCategories, getCategoriesByStoreOwner,
            departments, setDepartments,
            chatMessages, setChatMessages, addChatMessage, getChatMessagesForProject,
            suppliers, setSuppliers, getSupplierById, getSuppliersByStoreOwner,
            supplierOrders, setSupplierOrders, addSupplierOrder, updateSupplierOrderStatus, getSupplierOrderById, getSupplierOrdersByStoreOwner, recordSupplierOrderPayment,
            getProductById, getClientById, getEmployeeById, getAllEmployees, getProjectById,
            getVisitsForDate, getUpcomingVisits,
            branches, setBranches, getBranchById, getAllBranches,
            cajas, setCajas, getCajaById,
            notifications, addNotification, markNotificationAsRead, getUnreadNotificationsCount, markAllNotificationsAsRead,
            heldCarts, holdCurrentCart, recallCart, deleteHeldCart,
            layaways, setLayaways, addLayaway,
            tasks, setTasks, updateTask, addTask,
            taskComments, setTaskComments, addTaskComment
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error('useData must be used within a DataProvider');
    return context;
};