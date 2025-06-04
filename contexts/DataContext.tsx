
import React, { useState, createContext, useContext, useEffect, useCallback } from 'react';
import { Product, Client, Employee, Project, Sale, Order, Visit, Category, ChatMessage, User, Supplier, SupplierOrder, SupplierOrderStatus, SupplierOrderItem, Branch, ProductFormData, ProductStockInfo, Notification, NotificationType } from '../types'; // Added Notification, NotificationType
import { INITIAL_PRODUCTS, INITIAL_CLIENTS, INITIAL_EMPLOYEES, INITIAL_PROJECTS, INITIAL_SALES, INITIAL_ORDERS, INITIAL_VISITS, INITIAL_CATEGORIES, INITIAL_CHAT_MESSAGES, INITIAL_SUPPLIERS, INITIAL_SUPPLIER_ORDERS, INITIAL_BRANCHES, ADMIN_USER_ID, INITIAL_NOTIFICATIONS } from '../constants'; // Added INITIAL_NOTIFICATIONS
import { useAuth } from './AuthContext'; 
import { ShoppingCartIcon, ChatBubbleLeftRightIcon as ChatIcon } from '../components/icons'; // Example icons for notifications

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
  
  sales: Sale[]; 
  addSale: (saleData: Omit<Sale, 'id' | 'date' | 'branchId'> & {cajaId: string, employeeId: string, clientId?: string}, branchId: string) => void;
  recordSalePayment: (saleId: string) => void; 
  
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
  recordSupplierOrderPayment: (orderId: string, amount: number) => void; 

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
  addProduct: (productData: ProductFormData) => void; 
  updateProduct: (productId: string, productData: ProductFormData) => void; 

  notifications: Notification[];
  addNotification: (notificationData: Omit<Notification, 'id' | 'timestamp' | 'read' | 'icon'>) => void;
  markNotificationAsRead: (notificationId: string) => void;
  getUnreadNotificationsCount: () => number;
  markAllNotificationsAsRead: () => void;
}

export const DataContext = createContext<DataContextType | null>(null);

export const DataProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const { currentUser } = useAuth(); 
    const [products, setProducts] = useState<Product[]>(() => JSON.parse(localStorage.getItem('pazziProducts') || JSON.stringify(INITIAL_PRODUCTS)));
    const [clients, setClients] = useState<Client[]>(() => JSON.parse(localStorage.getItem('pazziClients') || JSON.stringify(INITIAL_CLIENTS)));
    const [employees, setEmployees] = useState<Employee[]>(() => JSON.parse(localStorage.getItem('pazziEmployees') || JSON.stringify(INITIAL_EMPLOYEES)));
    const [projects, setProjects] = useState<Project[]>(() => JSON.parse(localStorage.getItem('pazziProjects') || JSON.stringify(INITIAL_PROJECTS)));
    const [sales, setSales] = useState<Sale[]>(() => JSON.parse(localStorage.getItem('pazziSales') || JSON.stringify(INITIAL_SALES)));
    const [orders, setOrders] = useState<Order[]>(() => JSON.parse(localStorage.getItem('pazziOrders') || JSON.stringify(INITIAL_ORDERS)));
    const [visits, setVisits] = useState<Visit[]>(() => JSON.parse(localStorage.getItem('pazziVisits') || JSON.stringify(INITIAL_VISITS)));
    const [categories, setCategories] = useState<Category[]>(() => JSON.parse(localStorage.getItem('pazziCategories') || JSON.stringify(INITIAL_CATEGORIES)));
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => JSON.parse(localStorage.getItem('pazziChatMessages') || JSON.stringify(INITIAL_CHAT_MESSAGES)));
    const [suppliers, setSuppliers] = useState<Supplier[]>(() => JSON.parse(localStorage.getItem('pazziSuppliers') || JSON.stringify(INITIAL_SUPPLIERS)));
    const [supplierOrders, setSupplierOrders] = useState<SupplierOrder[]>(() => JSON.parse(localStorage.getItem('pazziSupplierOrders') || JSON.stringify(INITIAL_SUPPLIER_ORDERS)));
    const [branches, setBranches] = useState<Branch[]>(() => JSON.parse(localStorage.getItem('pazziBranches') || JSON.stringify(INITIAL_BRANCHES)));
    const [notifications, setNotifications] = useState<Notification[]>(() => JSON.parse(localStorage.getItem('pazziNotifications') || JSON.stringify(INITIAL_NOTIFICATIONS)));


    useEffect(() => { localStorage.setItem('pazziProducts', JSON.stringify(products)); }, [products]);
    useEffect(() => { localStorage.setItem('pazziClients', JSON.stringify(clients)); }, [clients]);
    useEffect(() => { localStorage.setItem('pazziEmployees', JSON.stringify(employees)); }, [employees]);
    useEffect(() => { localStorage.setItem('pazziProjects', JSON.stringify(projects)); }, [projects]);
    useEffect(() => { localStorage.setItem('pazziSales', JSON.stringify(sales)); }, [sales]);
    useEffect(() => { localStorage.setItem('pazziOrders', JSON.stringify(orders)); }, [orders]);
    useEffect(() => { localStorage.setItem('pazziVisits', JSON.stringify(visits)); }, [visits]);
    useEffect(() => { localStorage.setItem('pazziCategories', JSON.stringify(categories)); }, [categories]);
    useEffect(() => { localStorage.setItem('pazziChatMessages', JSON.stringify(chatMessages)); }, [chatMessages]);
    useEffect(() => { localStorage.setItem('pazziSuppliers', JSON.stringify(suppliers)); }, [suppliers]);
    useEffect(() => { localStorage.setItem('pazziSupplierOrders', JSON.stringify(supplierOrders)); }, [supplierOrders]);
    useEffect(() => { localStorage.setItem('pazziBranches', JSON.stringify(branches)); }, [branches]);
    useEffect(() => { localStorage.setItem('pazziNotifications', JSON.stringify(notifications)); }, [notifications]);

    const addNotification = useCallback((notificationData: Omit<Notification, 'id' | 'timestamp' | 'read' | 'icon'>) => {
        let icon: React.ReactNode | undefined;
        switch (notificationData.type) {
            case 'new_order': icon = React.createElement(ShoppingCartIcon, {className: "w-4 h-4"}); break;
            case 'chat_message': icon = React.createElement(ChatIcon, {className: "w-4 h-4"}); break;
            // Add other cases for different notification types
            default: icon = undefined;
        }
        const newNotification: Notification = {
            ...notificationData,
            id: `notif-${Date.now()}`,
            timestamp: new Date().toISOString(),
            read: false,
            icon: icon,
        };
        setNotifications(prev => [newNotification, ...prev]); // Add to the beginning of the list
    }, []);

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
                return { 
                    ...p, 
                    ...productData 
                }; 
            }
            return p;
        }));
    }, []);


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
        setSales(prev => [...prev, newSale]);
        
        newSale.items.forEach(cartItem => {
            const currentStock = getProductStockForBranch(cartItem.id, branchId);
            updateProductStockForBranch(cartItem.id, branchId, currentStock - cartItem.quantity);
        });
         addNotification({
            title: `Nueva Venta POS #${newSale.id.substring(0,6)}`,
            message: `Total: $${newSale.totalAmount.toFixed(2)}, Método: ${newSale.paymentMethod}`,
            type: 'new_order', // Using 'new_order' type for POS sales too
            link: `/pos/sales-history`
        });
    }, [getProductStockForBranch, updateProductStockForBranch, addNotification]);
    
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
                        if (targetBranchId) {
                            updatedOrder.items.forEach((item: SupplierOrderItem) => {
                                const currentStock = getProductStockForBranch(item.productId, targetBranchId);
                                updateProductStockForBranch(item.productId, targetBranchId, currentStock + item.quantityOrdered);
                            });
                        } else {
                            console.warn("No active branch found to receive supplier order items for order:", orderId);
                        }
                    }
                    return updatedOrder;
                }
                return order;
            })
        );
    }, [branches, getProductStockForBranch, updateProductStockForBranch]); 

    const getSupplierOrderById = useCallback((id: string) => supplierOrders.find(so => so.id === id), [supplierOrders]);
    
    const getProductById = useCallback((id: string) => products.find(p => p.id === id), [products]);
    const getClientById = useCallback((id: string) => clients.find(c => c.id === id), [clients]);
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

    const recordSupplierOrderPayment = useCallback((orderId: string, amount: number) => {
        setSupplierOrders(prevOrders => prevOrders.map(order => {
            if (order.id === orderId) {
                const newAmountPaid = (order.amountPaid || 0) + amount;
                let newPaymentStatus: SupplierOrder['paymentStatus'] = 'Pagado Parcialmente';
                if (newAmountPaid >= order.totalCost) {
                    newPaymentStatus = 'Pagado Completo';
                } else if (newAmountPaid <= 0) {
                    newPaymentStatus = 'No Pagado';
                }
                return { ...order, amountPaid: newAmountPaid, paymentStatus: newPaymentStatus };
            }
            return order;
        }));
    }, []);

    const recordSalePayment = useCallback((saleId: string) => {
        setSales(prevSales => prevSales.map(sale => 
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


    return (
        <DataContext.Provider value={{ 
            products, setProducts, getProductsByStoreOwner, getProductStockForBranch, updateProductStockForBranch, addProduct, updateProduct, getProductsWithStockForBranch,
            clients, setClients, employees, setEmployees, projects, setProjects, 
            sales, addSale, recordSalePayment,
            orders, setOrders, addOrder, updateOrderStatus, getOrdersByStoreOwner, getOrderById, 
            visits, setVisits, 
            categories, setCategories, getCategoriesByStoreOwner,
            chatMessages, setChatMessages, addChatMessage, getChatMessagesForProject,
            suppliers, setSuppliers, getSupplierById, getSuppliersByStoreOwner,
            supplierOrders, setSupplierOrders, addSupplierOrder, updateSupplierOrderStatus, getSupplierOrderById, getSupplierOrdersByStoreOwner, recordSupplierOrderPayment,
            getProductById, getClientById, getEmployeeById, getAllEmployees, getProjectById,
            getVisitsForDate, getUpcomingVisits,
            branches, setBranches, getBranchById, getAllBranches,
            notifications, addNotification, markNotificationAsRead, getUnreadNotificationsCount, markAllNotificationsAsRead
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
