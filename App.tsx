

import React, { useState, createContext, useContext, useEffect, useCallback, useMemo, useRef } from 'react';
import { Routes, Route, Link, useNavigate, useLocation, Navigate, useParams, Outlet } from 'react-router-dom';

import { User, UserRole, Product, Client, Employee, Project, Sale, Order, AppModule, ProductFormData, ClientFormData, EmployeeFormData, ProjectFormData, ProjectStatus, CartItem, ProjectResource, Visit, VisitStatus, VisitFormData, ECommerceSettings, Category, CategoryFormData, Theme, ChatMessage, Caja } from './types'; // Added Caja
import { APP_MODULES_CONFIG, ADMIN_USER_ID, PROJECT_CLIENT_ID, ECOMMERCE_CLIENT_ID, inputFormStyle as sharedInputFormStyle } from './constants'; 

// Contexts
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider, useData } from './contexts/DataContext';
import { ECommerceSettingsProvider, useECommerceSettings } from './contexts/ECommerceSettingsContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AppContextProvider, useAppContext } from './contexts/AppContext';


// Layout Components
import { LandingLayout } from './components/layout/LandingLayout';
import { MainLayout } from './components/layout/MainLayout';
// ClientLayout is kept for potential future "Store Owner" role, but not used by basic CLIENT role.
// import { ClientLayout } from './components/layout/ClientLayout'; // Deprecating this generic client layout

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';

// General Pages
import { LandingPage } from './pages/LandingPage';
import { DashboardHomePage } from './pages/DashboardHomePage'; 

// PM Client Pages (New or Adapted)
import { ProjectClientDashboardPage } from './pages/project_client/ProjectClientDashboardPage';
import { ProjectClientCalendarPage } from './pages/project_client/ProjectClientCalendarPage';
import { ProjectClientChatPage } from './pages/project_client/ProjectClientChatPage';


// E-commerce Client (Shopper) specific view for their orders
import { MyOrdersPage } from './pages/ecommerce/MyOrdersPage'; 


// PM Pages (Manager & PM Employee)
import { ProductsListPage } from './pages/pm/ProductsListPage';
import { CategoriesListPage } from './pages/pm/CategoriesListPage';
import { ClientsListPage } from './pages/pm/ClientsListPage';
import { EmployeesListPage } from './pages/pm/EmployeesListPage';
import { ProjectsListPage } from './pages/pm/ProjectsListPage';
import { ProjectCalendarPage } from './pages/pm/ProjectCalendarPage'; // Manager/Employee full calendar
import { ProjectChatPage } from './pages/pm/ProjectChatPage'; // Manager/Employee full chat
import { BranchesListPage } from './pages/admin/BranchesListPage'; 
import { ProjectReportsPage } from './pages/pm/ProjectReportsPage'; // New PM Reports Page

// POS Pages (Manager & POS Employee)
import POSCashierPage from './pages/pos/POSCashierPage'; // Ensure this is default import if export default
import { POSReportsPage } from './pages/pos/POSReportsPage'; // Changed from POSDashboardPage
import { POSSalesHistoryPage } from './pages/pos/POSSalesHistoryPage'; 
import { POSInventoryPage } from './pages/pos/POSInventoryPage'; 
import { AccountsPayablePage } from './pages/pos/AccountsPayablePage';
import { AccountsReceivablePage } from './pages/pos/AccountsReceivablePage';
import { POSCajasPage } from './pages/pos/POSCajasPage'; // New Cajas Page


// Admin Ecommerce Pages (global settings, Pazzi's own store if any)
import { ECommerceSettingsPage } from './pages/ecommerce/ECommerceDashboardPage'; 
import { EcommerceStorePage } from './pages/ecommerce/EcommerceStorePage'; // Public store view
import { EcommerceOrdersPage } from './pages/ecommerce/EcommerceOrdersPage'; // Manager viewing all orders
import { SuppliersListPage } from './pages/ecommerce/SuppliersListPage';
import { SupplierOrdersListPage } from './pages/ecommerce/SupplierOrdersListPage';
import { CheckoutPage } from './pages/ecommerce/CheckoutPage'; 
import { OrderConfirmationPage } from './pages/ecommerce/OrderConfirmationPage'; 


// Icons
import { SunIcon, MoonIcon, ExclamationTriangleIcon } from './components/icons'; // Added ExclamationTriangleIcon

// Constants
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, POS_BUTTON_RED_CLASSES, POS_BUTTON_YELLOW_CLASSES, BUTTON_PRIMARY_CLASSES } from './constants';
import { Modal } from './components/Modal';
import { VirtualAssistant } from './components/VirtualAssistant'; // Import VirtualAssistant


// --- APP ROUTES & MAIN COMPONENT ---

const AppContent: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const appContext = useAppContext();
  if (!appContext) throw new Error("AppContext not found for AppContent");
  const { currentModule, setCurrentModule } = appContext; 

  useEffect(() => {
    const nonAuthPaths = ['/login', '/register', '/forgot-password', '/', '/checkout', '/order-confirmation'];
    const publicStorePathRegex = /^\/store(\/[^/]+)?$/; 
    const orderConfirmationRegex = /^\/order-confirmation(\/[^/]+)?$/;
    
    const clientEcommercePaths = ['/store', '/my-orders', '/checkout', '/order-confirmation', '/settings']; 
    const clientProjectPaths = ['/project-client/dashboard', '/project-client/calendar', '/project-client/chat', '/settings'];


    if (!currentUser && !nonAuthPaths.some(p => location.pathname.startsWith(p)) && !publicStorePathRegex.test(location.pathname) && !orderConfirmationRegex.test(location.pathname)) {
        navigate('/login');
    } else if (currentUser) {
        if (currentUser.role === UserRole.CLIENT_ECOMMERCE) {
            const isAllowedClientEcommercePath = 
                clientEcommercePaths.some(p => location.pathname.startsWith(p)) ||
                publicStorePathRegex.test(location.pathname) ||
                orderConfirmationRegex.test(location.pathname);

            if (!isAllowedClientEcommercePath && location.pathname !== '/login') {
                 navigate('/store', { replace: true }); 
            }
        } else if (currentUser.role === UserRole.CLIENT_PROJECT) {
            const isAllowedClientProjectPath = clientProjectPaths.some(p => location.pathname.startsWith(p));
            if (!isAllowedClientProjectPath && location.pathname !== '/login') {
                 navigate('/project-client/dashboard', { replace: true });
            }
        } else if (currentUser.role === UserRole.EMPLOYEE) {
             if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/forgot-password') {
                const defaultPath = currentModule === AppModule.POS ? '/pos/cashier' : '/pm/projects';
                setCurrentModule(currentModule === AppModule.POS ? AppModule.POS : AppModule.PROJECT_MANAGEMENT);
                navigate(defaultPath, { replace: true });
            }
            const allowedEmployeePaths = ['/settings', '/pm/projects', '/pm/chat', '/pos/cashier'];
            const isAllowedPath = allowedEmployeePaths.some(p => location.pathname.startsWith(p));
            if(!isAllowedPath && !location.pathname.startsWith('/login')) {
                 const defaultPath = currentModule === AppModule.POS ? '/pos/cashier' : '/pm/projects';
                 setCurrentModule(currentModule === AppModule.POS ? AppModule.POS : AppModule.PROJECT_MANAGEMENT);
                 navigate(defaultPath, { replace: true });
            }
        } else { // Manager (UserRole.MANAGER)
            if (location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/forgot-password') {
                const moduleConfig = APP_MODULES_CONFIG.find(m => m.name === currentModule);
                let firstSubModulePath = moduleConfig?.path || '/pm/projects'; 
                
                if(moduleConfig) {
                    if (moduleConfig.name === AppModule.PROJECT_MANAGEMENT && moduleConfig.subModulesProject?.length > 0 && moduleConfig.subModulesProject[0].type === 'link') {
                        firstSubModulePath = moduleConfig.subModulesProject[0].path;
                    } else if (moduleConfig.name === AppModule.POS) { // Explicitly check for POS
                        firstSubModulePath = '/pos/reports'; // Managers default to POS Reports
                    } else if (moduleConfig.name === AppModule.ECOMMERCE && moduleConfig.subModulesEcommerce?.length > 0 && moduleConfig.subModulesEcommerce[0].type === 'link') {
                        firstSubModulePath = moduleConfig.subModulesEcommerce[0].path;
                    }
                }
                navigate(firstSubModulePath, { replace: true });
            }
        }
    }
  }, [currentUser, location.pathname, navigate, currentModule, setCurrentModule]);
  
  const ProjectManagementModuleRoutes = () => ( // For Manager and PM Employee
    <Routes>
        <Route index element={<Navigate to="projects" replace />} />
        <Route path="projects" element={<ProjectsListPage />} /> 
        <Route path="chat" element={<ProjectChatPage />} /> 
        { currentUser?.role === UserRole.MANAGER && ( // Manager specific PM routes
            <>
                <Route path="products" element={<ProductsListPage />} /> 
                <Route path="categories" element={<CategoriesListPage />} /> 
                <Route path="clients" element={<ClientsListPage />} />
                <Route path="employees" element={<EmployeesListPage />} />
                <Route path="calendar" element={<ProjectCalendarPage />} />
                <Route path="reports" element={<ProjectReportsPage />} />
                <Route path="branches" element={<BranchesListPage />} />
            </>
        )}
        {/* PM Employee sees only projects and chat, handled by ProjectsListPage and ProjectChatPage filtering */}
        <Route path="*" element={<Navigate to="projects" replace />} />
    </Routes>
  );

  const POSModuleRoutes = () => ( // For Manager and POS Employee
    <Routes>
      <Route index element={<Navigate to={currentUser?.role === UserRole.EMPLOYEE ? "cashier" : "reports"} replace />} />
      <Route path="cashier" element={<POSCashierPage />} />
      { currentUser?.role === UserRole.MANAGER && ( // Manager specific POS routes
        <>
            <Route path="reports" element={<POSReportsPage />} /> 
            <Route path="sales-history" element={<POSSalesHistoryPage />} />
            <Route path="inventory" element={<POSInventoryPage />} />
            <Route path="accounts-payable" element={<AccountsPayablePage />} />
            <Route path="accounts-receivable" element={<AccountsReceivablePage />} />
            <Route path="cajas" element={<POSCajasPage />} /> {/* New Cajas Route */}
        </>
      )}
       {/* POS Employee sees only cashier, handled by POSCashierPage */}
      <Route path="*" element={<Navigate to={currentUser?.role === UserRole.EMPLOYEE ? "cashier" : "reports"} replace />} />
    </Routes>
  );
  
  const AdminEcommerceModuleRoutes = () => ( // Only for Manager
    <Routes>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<ECommerceSettingsPage />} /> 
      <Route path="orders" element={<EcommerceOrdersPage />} /> 
      <Route path="suppliers" element={<SuppliersListPage />} /> 
      <Route path="supplier-orders" element={<SupplierOrdersListPage />} /> 
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );

  const ProjectClientModuleRoutes = () => ( // For UserRole.CLIENT_PROJECT
    <Routes>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ProjectClientDashboardPage />} />
        <Route path="calendar" element={<ProjectClientCalendarPage />} />
        <Route path="chat/:projectId" element={<ProjectClientChatPage />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );

  const SettingsPage = () => { 
      const { currentUser: authCurrentUser, updateUserPassword, toggleUserEmergencyOrderMode } = useAuth(); 
      const { theme, setTheme } = useTheme();
      const [currentPassword, setCurrentPassword] = useState('');
      const [newPassword, setNewPassword] = useState('');
      const [confirmNewPassword, setConfirmNewPassword] = useState('');
      const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
      
      const [isEmergencyActive, setIsEmergencyActive] = useState(authCurrentUser?.isEmergencyOrderActive || false);

      // Admin Emergency Mode State
      const [isAdminEmergencyModeConfirmationOpen, setIsAdminEmergencyModeConfirmationOpen] = useState(false);
      const [adminEmergencyModeConfirmationInput, setAdminEmergencyModeConfirmationInput] = useState('');


      useEffect(() => {
          setIsEmergencyActive(authCurrentUser?.isEmergencyOrderActive || false);
      }, [authCurrentUser?.isEmergencyOrderActive]);

      const handlePasswordChange = async (e: React.FormEvent) => {
          e.preventDefault();
          setMessage(null);
          if (!authCurrentUser) return;
          if (newPassword !== confirmNewPassword) {
              setMessage({type: 'error', text: 'Las nuevas contraseñas no coinciden.'});
              return;
          }
          if (newPassword.length < 6) {
              setMessage({type: 'error', text: 'La nueva contraseña debe tener al menos 6 caracteres.'});
              return;
          }
          const result = await updateUserPassword(authCurrentUser.id, currentPassword, newPassword);
          if (result.success) {
              setMessage({type: 'success', text: result.message});
              setCurrentPassword('');
              setNewPassword('');
              setConfirmNewPassword('');
          } else {
              setMessage({type: 'error', text: result.message});
          }
      };

      const handleToggleUserEmergencyMode = async () => { // Renamed to avoid conflict with admin specific
        if (!authCurrentUser) return;
        const success = await toggleUserEmergencyOrderMode(authCurrentUser.id);
        if (success) {
            setIsEmergencyActive(prev => !prev); 
            setMessage({type: 'success', text: `Modo de pedido de emergencia ${!isEmergencyActive ? 'activado' : 'desactivado'}.`});
        } else {
            setMessage({type: 'error', text: 'No se pudo cambiar el modo de pedido de emergencia.'});
        }
        setTimeout(() => setMessage(null), 3000);
    };
    
    const handleAdminEmergencyActivation = async () => {
        if (!authCurrentUser || authCurrentUser.id !== ADMIN_USER_ID) return;
        const success = await toggleUserEmergencyOrderMode(authCurrentUser.id);
        if (success) {
            setIsEmergencyActive(prev => !prev);
            setMessage({ type: 'success', text: `Modo de emergencia para admin ${!isEmergencyActive ? 'activado' : 'desactivado'}.` });
        } else {
            setMessage({ type: 'error', text: 'No se pudo cambiar el modo de emergencia para admin.' });
        }
        setIsAdminEmergencyModeConfirmationOpen(false);
        setAdminEmergencyModeConfirmationInput('');
        setTimeout(() => setMessage(null), 3000);
    };

    const handleAdminEmergencyDeactivation = async () => {
        if (!authCurrentUser || authCurrentUser.id !== ADMIN_USER_ID) return;
         // Deactivation is direct, reusing the toggle function
        await handleAdminEmergencyActivation();
    };


      const isClientRole = authCurrentUser?.role === UserRole.CLIENT_ECOMMERCE || authCurrentUser?.role === UserRole.CLIENT_PROJECT;
      const isAdminUser = authCurrentUser?.id === ADMIN_USER_ID;
      
      return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200 mb-6">Configuración de Cuenta</h1>
            
            {message && (
                <p className={`mb-4 p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300'}`}>
                    {message.text}
                </p>
            )}

            <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-semibold text-primary mb-4">Cambiar Contraseña</h2>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Contraseña Actual</label>
                        <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={inputFormStyle} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Nueva Contraseña</label>
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputFormStyle} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300">Confirmar Nueva Contraseña</label>
                        <input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} className={inputFormStyle} required />
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES}>Actualizar Contraseña</button>
                    </div>
                </form>
            </div>
            
            {/* Client-Specific Emergency Mode */}
            {isClientRole && (
                <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md mb-6">
                    <h2 className="text-xl font-semibold text-primary mb-4 flex items-center">
                        <ExclamationTriangleIcon className="w-5 h-5 mr-2 text-amber-500" /> Modo de Pedido de Emergencia (Cliente)
                    </h2>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-3">
                        Al activar este modo, tus pedidos podrían ser marcados con prioridad o para atención especial debido a una urgencia.
                    </p>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleToggleUserEmergencyMode}
                            className={`${
                                isEmergencyActive 
                                    ? POS_BUTTON_RED_CLASSES 
                                    : POS_BUTTON_YELLOW_CLASSES 
                            } font-semibold py-2 px-4 rounded-md shadow-sm transition-colors duration-150 text-sm`}
                            aria-pressed={isEmergencyActive}
                        >
                            {isEmergencyActive ? 'Desactivar Modo Emergencia' : 'Activar Modo Emergencia'}
                        </button>
                        <span className={`text-sm font-medium px-2 py-1 rounded-full ${isEmergencyActive ? 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100' : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-100'}`}>
                            Estado: {isEmergencyActive ? 'Activo' : 'Inactivo'}
                        </span>
                    </div>
                </div>
            )}

            {/* Admin-Specific Emergency Mode */}
            {isAdminUser && (
                <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md mb-6">
                    <h2 className="text-xl font-semibold text-primary mb-4 flex items-center">
                        <ExclamationTriangleIcon className="w-6 h-6 mr-2 text-red-600" /> Modo Emergencia Administrador
                    </h2>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-3">
                        Activa o desactiva el modo de emergencia para la cuenta de administrador. Esto puede afectar la priorización de ciertas operaciones o activar protocolos especiales en toda la plataforma.
                    </p>
                    <div className="flex items-center space-x-3">
                        {!isEmergencyActive ? (
                            <button
                                onClick={() => setIsAdminEmergencyModeConfirmationOpen(true)}
                                className={`${BUTTON_PRIMARY_CLASSES} font-semibold py-2 px-4 rounded-md shadow-sm transition-colors duration-150 text-sm`}
                            >
                                Activar Modo Emergencia Admin
                            </button>
                        ) : (
                            <button
                                onClick={handleAdminEmergencyDeactivation}
                                className={`${POS_BUTTON_RED_CLASSES} font-semibold py-2 px-4 rounded-md shadow-sm transition-colors duration-150 text-sm`}
                            >
                                Desactivar Modo Emergencia Admin
                            </button>
                        )}
                        <span className={`text-sm font-medium px-2.5 py-1.5 rounded-full ${isEmergencyActive ? 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100' : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-100'}`}>
                            Estado Global Admin: {isEmergencyActive ? 'Activo' : 'Inactivo'}
                        </span>
                    </div>
                </div>
            )}
            {/* Admin Emergency Mode Confirmation Modal */}
            <Modal
                isOpen={isAdminEmergencyModeConfirmationOpen}
                onClose={() => {
                    setIsAdminEmergencyModeConfirmationOpen(false);
                    setAdminEmergencyModeConfirmationInput('');
                }}
                title="Confirmar Activación de Modo Emergencia (Admin)"
                size="md"
            >
                <div className="p-1">
                    <div className="flex items-center justify-center mb-4">
                        <ExclamationTriangleIcon className="w-12 h-12 text-red-500" />
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4 text-center">
                        Estás a punto de activar el modo de emergencia para tu cuenta de administrador.
                        Esta acción puede tener consecuencias significativas en la operación de la plataforma.
                    </p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4 text-center">
                        Para confirmar, escribe <strong className="text-red-600 dark:text-red-400">'activar'</strong> en el campo de abajo y presiona 'Confirmar Activación'.
                    </p>
                    <input
                        type="text"
                        value={adminEmergencyModeConfirmationInput}
                        onChange={(e) => setAdminEmergencyModeConfirmationInput(e.target.value)}
                        className={`${sharedInputFormStyle} w-full text-center mb-4`}
                        placeholder="Escribe 'activar' aquí"
                        aria-label="Confirmación para activar modo emergencia"
                    />
                    <div className="flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={() => {
                                setIsAdminEmergencyModeConfirmationOpen(false);
                                setAdminEmergencyModeConfirmationInput('');
                            }}
                            className={BUTTON_SECONDARY_SM_CLASSES}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleAdminEmergencyActivation}
                            className={BUTTON_PRIMARY_SM_CLASSES + (adminEmergencyModeConfirmationInput.toLowerCase() !== 'activar' ? ' opacity-50 cursor-not-allowed' : ' bg-red-600 hover:bg-red-700')}
                            disabled={adminEmergencyModeConfirmationInput.toLowerCase() !== 'activar'}
                        >
                            Confirmar Activación
                        </button>
                    </div>
                </div>
            </Modal>


            <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold text-primary mb-4">Tema de la Aplicación</h2>
                <div className="flex items-center space-x-4">
                    <button 
                        onClick={() => setTheme(Theme.LIGHT)} 
                        className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center ${theme === Theme.LIGHT ? 'ring-2 ring-offset-2 dark:ring-offset-neutral-800 ring-primary' : 'opacity-70 hover:opacity-100'}`}
                    >
                        <SunIcon />{' '}Claro
                    </button>
                    <button 
                        onClick={() => setTheme(Theme.DARK)} 
                        className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center ${theme === Theme.DARK ? 'ring-2 ring-offset-2 dark:ring-offset-neutral-800 ring-primary' : 'opacity-70 hover:opacity-100'}`}
                    >
                         <MoonIcon />{' '}Oscuro
                    </button>
                </div>
            </div>
        </div>
      );
  };

  const PublicRoutes = () => (
    <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/store/:storeOwnerId" element={<EcommerceStorePage />} /> 
        <Route path="/store" element={<EcommerceStorePage />} /> 
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order-confirmation/:orderId" element={<OrderConfirmationPage />} />
    </Routes>
  );


  const showVirtualAssistant = currentUser && !location.pathname.startsWith('/login') && !location.pathname.startsWith('/register') && !location.pathname.startsWith('/forgot-password') && location.pathname !== '/';


  if (!currentUser) {
    return (
      <>
        <PublicRoutes />
        {showVirtualAssistant && <VirtualAssistant />} 
      </>
    );
  }
  
  // Main application layout for logged-in users
  return (
    <>
      {currentUser.role === UserRole.CLIENT_ECOMMERCE ? (
          <MainLayout> 
            <Routes>
                <Route path="/store" element={<EcommerceStorePage />} />
                <Route path="/store/:storeOwnerId" element={<EcommerceStorePage />} />
                <Route path="/my-orders" element={<MyOrdersPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/order-confirmation/:orderId" element={<OrderConfirmationPage />} />
                <Route path="/settings" element={<SettingsPage />} /> 
                <Route path="*" element={<Navigate to="/store" replace />} /> 
            </Routes>
          </MainLayout>
      ) : currentUser.role === UserRole.CLIENT_PROJECT ? (
          <MainLayout>
            <Routes>
                <Route path="/project-client/*" element={<ProjectClientModuleRoutes />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/project-client/dashboard" replace />} />
            </Routes>
          </MainLayout>
      ) : ( // Manager and Employee routes
          <MainLayout>
            <Routes>
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/pm/*" element={<ProjectManagementModuleRoutes />} />
                <Route path="/pos/*" element={<POSModuleRoutes />} />
                {currentUser.role === UserRole.MANAGER && (
                    <>
                        <Route path="/ecommerce/*" element={<AdminEcommerceModuleRoutes />} />
                        <Route path="/store/:storeOwnerId" element={<EcommerceStorePage />} /> 
                        <Route path="/store" element={<EcommerceStorePage />} />
                        <Route path="/checkout" element={<CheckoutPage />} /> 
                        <Route path="/order-confirmation/:orderId" element={<OrderConfirmationPage />} />
                    </>
                )}
                <Route path="/" element={<DashboardHomePage />} /> 
                <Route path="*" element={
                    <Navigate 
                        to={(() => {
                            const moduleConfig = APP_MODULES_CONFIG.find(m => m.name === currentModule);
                            if (currentUser.role === UserRole.EMPLOYEE) {
                                return currentModule === AppModule.POS ? "/pos/cashier" : "/pm/projects";
                            }
                            // Manager default
                            if (moduleConfig) {
                                 if (moduleConfig.name === AppModule.PROJECT_MANAGEMENT && moduleConfig.subModulesProject?.length && moduleConfig.subModulesProject[0].type === 'link') return moduleConfig.subModulesProject[0].path;
                                 if (moduleConfig.name === AppModule.POS) return "/pos/reports"; // Manager default for POS
                                 if (moduleConfig.name === AppModule.ECOMMERCE && moduleConfig.subModulesEcommerce?.length && moduleConfig.subModulesEcommerce[0].type === 'link') return moduleConfig.subModulesEcommerce[0].path;
                                 return moduleConfig.path;
                            }
                            return "/pm/projects"; // Fallback for manager
                        })()} 
                        replace 
                    />} 
                />
            </Routes>
          </MainLayout>
      )}
      {showVirtualAssistant && <VirtualAssistant />}
    </>
  );
}


const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppContextProvider>
        <AuthProvider>
          <DataProvider>
            <ECommerceSettingsProvider>
              <AppContent />
            </ECommerceSettingsProvider>
          </DataProvider>
        </AuthProvider>
      </AppContextProvider>
    </ThemeProvider>
  );
};
export default App;