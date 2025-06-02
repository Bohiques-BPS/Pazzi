
import React, { useState, createContext, useContext, useEffect, useCallback } from 'react';
import { Product, Client, Employee, Project, Sale, Order, Visit, Category, ChatMessage, User, Supplier, SupplierOrder, SupplierOrderStatus, SupplierOrderItem, Branch, ProductFormData } from '../types';
import { INITIAL_PRODUCTS, INITIAL_CLIENTS, INITIAL_EMPLOYEES, INITIAL_PROJECTS, INITIAL_SALES, INITIAL_ORDERS, INITIAL_VISITS, INITIAL_CATEGORIES, INITIAL_CHAT_MESSAGES, INITIAL_SUPPLIERS, INITIAL_SUPPLIER_ORDERS, INITIAL_BRANCHES, ADMIN_USER_ID } from '../constants';
import { useAuth } from './AuthContext'; 

export interface DataContextType {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  getProductsByStoreOwner: (ownerId: string) => Product[];
  getProductStockForBranch: (productId: string, branchId: string) => number;
  updateProductStockForBranch: (productId: string, branchId: string, newQuantity: number) => void;
  
  clients: Client[];
  setClients: React.Dispatch<React.SetStateAction<Client[]>>;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  
  sales: Sale[]; 
  addSale: (saleData: Omit<Sale, 'id' | 'date' | 'branchId'> & {cajaId: string, employeeId: string, clientId?: string}, branchId: string) => void;
  recordSalePayment: (saleId: string) => void; // New function
  
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
  updateSupplierOrderStatus: (orderId: string, newStatus: SupplierOrderStatus, receivedToBranchId?: string) => void; // Added receivedToBranchId
  getSupplierOrderById: (id: string) => SupplierOrder | undefined;
  getSupplierOrdersByStoreOwner: (ownerId: string) => SupplierOrder[];
  recordSupplierOrderPayment: (orderId: string, amount: number) => void; // New function

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
  addProduct: (productData: ProductFormData) => void; // New way to add products
  updateProduct: (productId: string, productData: ProductFormData) => void; // New way to update products

  // recordSupplierOrderPayment: (orderId: string, amount: number) => void; // Already declared above
  // recordSalePayment: (saleId: string) => void; // Already declared above
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
                    // If branch entry doesn't exist, add it (e.g. product newly available at branch)
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
                .filter(b => b.isActive) // Initialize stock only for active Pazzi branches
                .map(b => ({ branchId: b.id, quantity: 0 }));
        } else { // Client-owned product
            initialStockByBranch = [{ branchId: productData.storeOwnerId, quantity: 0 }]; // Client's store as a single "branch"
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
                // Preserve existing stockByBranch, only update other metadata
                return { 
                    ...p, // keep existing stockByBranch and other non-form fields
                    ...productData // apply form data
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
    }, [getProductStockForBranch, updateProductStockForBranch]);
    
    const addOrder = useCallback((orderData: Omit<Order, 'id' | 'date' | 'storeOwnerId'>, storeOwnerId: string): string => {
        const newOrder: Order = {
            ...orderData,
            id: `order-${Date.now()}`,
            date: new Date().toISOString(),
            storeOwnerId: storeOwnerId,
        };
        setOrders(prev => [...prev, newOrder]);
        newOrder.items.forEach(cartItem => {
            // For e-commerce, client's store is like their own single branch
            const currentStock = getProductStockForBranch(cartItem.id, storeOwnerId); 
            updateProductStockForBranch(cartItem.id, storeOwnerId, currentStock - cartItem.quantity);
        });
        return newOrder.id; 
    }, [getProductStockForBranch, updateProductStockForBranch]);

    const updateOrderStatus = useCallback((orderId: string, newStatus: Order['status']) => {
        setOrders(prevOrders => prevOrders.map(order => order.id === orderId ? { ...order, status: newStatus } : order));
    }, []);

    const getOrdersByStoreOwner = useCallback((ownerId: string): Order[] => {
        return orders.filter(o => o.storeOwnerId === ownerId);
    }, [orders]);
    
    const getOrderById = useCallback((id: string) => orders.find(o => o.id === id), [orders]); 

    const addChatMessage = useCallback((messageData: Omit<ChatMessage, 'id' | 'timestamp' | 'senderName'>) => {
        if (!currentUser) { console.error("Cannot send message: no current user."); return; }
        const newMessage: ChatMessage = { ...messageData, id: `msg-${Date.now()}`, timestamp: new Date().toISOString(), senderName: currentUser.name || currentUser.email || 'Usuario Desconocido', };
        setChatMessages(prev => [...prev, newMessage]);
    }, [currentUser]);

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
                    if (newStatus === 'Recibido Completo' && (order.storeOwnerId === ADMIN_USER_ID || !order.storeOwnerId)) { // Only update stock for Pazzi's global orders
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
    const getProjectById = useCallback((id: string) => projects.find(p => p.id === id), [projects]);

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


    return (
        <DataContext.Provider value={{ 
            products, setProducts, getProductsByStoreOwner, getProductStockForBranch, updateProductStockForBranch, addProduct, updateProduct,
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
            branches, setBranches, getBranchById, getAllBranches
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
