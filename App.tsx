
import React, { useState, createContext, useContext, useEffect, useCallback, useMemo, useRef } from 'react';
import { Routes, Route, Link, useNavigate, useLocation, Navigate, useParams, Outlet } from 'react-router-dom';

import { User, UserRole, Product, Client, Employee, Project, Sale, Order, AppModule, ProductFormData, ClientFormData, EmployeeFormData, ProjectFormData, ProjectStatus, CartItem, ProjectResource, Visit, VisitStatus, VisitFormData, ECommerceSettings, Category, CategoryFormData, Theme, ChatMessage } from './types';
import { APP_MODULES_CONFIG, ADMIN_USER_ID, PROJECT_CLIENT_ID, ECOMMERCE_CLIENT_ID } from './constants'; 

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

// POS Pages (Manager & POS Employee)
import { POSCashierPage } from './pages/pos/POSCashierPage'; 
import { POSDashboardPage } from './pages/pos/POSDashboardPage'; 
import { POSSalesHistoryPage } from './pages/pos/POSSalesHistoryPage'; 
import { POSInventoryPage } from './pages/pos/POSInventoryPage'; 
import { AccountsPayablePage } from './pages/pos/AccountsPayablePage';
import { AccountsReceivablePage } from './pages/pos/AccountsReceivablePage';


// Admin Ecommerce Pages (global settings, Pazzi's own store if any)
import { ECommerceSettingsPage } from './pages/ecommerce/ECommerceDashboardPage'; 
import { EcommerceStorePage } from './pages/ecommerce/EcommerceStorePage'; // Public store view
import { EcommerceOrdersPage } from './pages/ecommerce/EcommerceOrdersPage'; // Manager viewing all orders
import { SuppliersListPage } from './pages/ecommerce/SuppliersListPage';
import { SupplierOrdersListPage } from './pages/ecommerce/SupplierOrdersListPage';
import { CheckoutPage } from './pages/ecommerce/CheckoutPage'; 
import { OrderConfirmationPage } from './pages/ecommerce/OrderConfirmationPage'; 


// Icons
import { SunIcon, MoonIcon } from './components/icons';

// Constants
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES } from './constants';


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
    const publicStorePathRegex = /^\/store(\/[^/]+)?$/; // Matches /store and /store/someId
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
                // Default to POS Cashier if that's their current module, otherwise PM Projects
                const defaultPath = currentModule === AppModule.POS ? '/pos/cashier' : '/pm/projects';
                navigate(defaultPath, { replace: true });
            }
            const allowedEmployeePaths = ['/settings', '/pm/projects', '/pm/chat', '/pos/cashier'];
            const isAllowedPath = allowedEmployeePaths.some(p => location.pathname.startsWith(p));
            if(!isAllowedPath && !location.pathname.startsWith('/login')) {
                 const defaultPath = currentModule === AppModule.POS ? '/pos/cashier' : '/pm/projects';
                 navigate(defaultPath, { replace: true });
            }
        } else { // Manager (UserRole.MANAGER)
            if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/forgot-password') {
                const moduleConfig = APP_MODULES_CONFIG.find(m => m.name === currentModule);
                let firstSubModulePath = moduleConfig?.path || '/pm'; 
                if(moduleConfig) {
                    if (moduleConfig.name === AppModule.PROJECT_MANAGEMENT && moduleConfig.subModulesProject && moduleConfig.subModulesProject.length > 0 && moduleConfig.subModulesProject[0].type === 'link') {
                        firstSubModulePath = moduleConfig.subModulesProject[0].path;
                    } else if (moduleConfig.name === AppModule.POS && moduleConfig.subModulesPOS && moduleConfig.subModulesPOS.length > 0 && moduleConfig.subModulesPOS[0].type === 'link') {
                        firstSubModulePath = moduleConfig.subModulesPOS[0].path;
                    } else if (moduleConfig.name === AppModule.ECOMMERCE && moduleConfig.subModulesEcommerce && moduleConfig.subModulesEcommerce.length > 0 && moduleConfig.subModulesEcommerce[0].type === 'link') {
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
                <Route path="reports" element={<div>Reportes de Gestión de Proyectos (Próximamente)</div>} />
                <Route path="branches" element={<BranchesListPage />} />
            </>
        )}
        {/* PM Employee sees only projects and chat, handled by ProjectsListPage and ProjectChatPage filtering */}
        <Route path="*" element={<Navigate to="projects" replace />} />
    </Routes>
  );

  const POSModuleRoutes = () => ( // For Manager and POS Employee
    <Routes>
      <Route index element={<Navigate to={currentUser?.role === UserRole.EMPLOYEE ? "cashier" : "dashboard"} replace />} />
      <Route path="cashier" element={<POSCashierPage />} />
      { currentUser?.role === UserRole.MANAGER && ( // Manager specific POS routes
        <>
            <Route path="dashboard" element={<POSDashboardPage />} />
            <Route path="sales-history" element={<POSSalesHistoryPage />} />
            <Route path="inventory" element={<POSInventoryPage />} />
            <Route path="accounts-payable" element={<AccountsPayablePage />} />
            <Route path="accounts-receivable" element={<AccountsReceivablePage />} />
        </>
      )}
       {/* POS Employee sees only cashier, handled by POSCashierPage */}
      <Route path="*" element={<Navigate to={currentUser?.role === UserRole.EMPLOYEE ? "cashier" : "dashboard"} replace />} />
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
      const { currentUser: authCurrentUser, updateUserPassword } = useAuth(); 
      const { theme, setTheme } = useTheme();
      const [currentPassword, setCurrentPassword] = useState('');
      const [newPassword, setNewPassword] = useState('');
      const [confirmNewPassword, setConfirmNewPassword] = useState('');
      const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

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
      
      return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200 mb-6">Configuración de Cuenta</h1>
            
            <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-xl font-semibold text-primary mb-4">Cambiar Contraseña</h2>
                {message && (
                    <p className={`mb-4 p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300'}`}>
                        {message.text}
                    </p>
                )}
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


  if (!currentUser) {
    return <PublicRoutes />;
  }

  if (currentUser.role === UserRole.CLIENT_ECOMMERCE) {
    return (
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
    );
  }
  
  if (currentUser.role === UserRole.CLIENT_PROJECT) {
    return (
        <MainLayout>
            <Routes>
                <Route path="/project-client/*" element={<ProjectClientModuleRoutes />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/project-client/dashboard" replace />} />
            </Routes>
        </MainLayout>
    );
  }


  // Manager and Employee routes
  return (
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
                        // Default navigation for Manager/Employee if current route not matched
                        const moduleConfig = APP_MODULES_CONFIG.find(m => m.name === currentModule);
                        if (currentUser.role === UserRole.EMPLOYEE) {
                            return currentModule === AppModule.POS ? "/pos/cashier" : "/pm/projects";
                        }
                        // Manager default
                        if (moduleConfig) {
                            if (moduleConfig.name === AppModule.PROJECT_MANAGEMENT && moduleConfig.subModulesProject && moduleConfig.subModulesProject.length > 0 && moduleConfig.subModulesProject[0].type === 'link') return moduleConfig.subModulesProject[0].path;
                            if (moduleConfig.name === AppModule.POS && moduleConfig.subModulesPOS && moduleConfig.subModulesPOS.length > 0 && moduleConfig.subModulesPOS[0].type === 'link') return moduleConfig.subModulesPOS[0].path;
                            if (moduleConfig.name === AppModule.ECOMMERCE && moduleConfig.subModulesEcommerce && moduleConfig.subModulesEcommerce.length > 0 && moduleConfig.subModulesEcommerce[0].type === 'link') return moduleConfig.subModulesEcommerce[0].path;
                            return moduleConfig.path;
                        }
                        return "/pm/projects"; // Fallback for manager
                    })()} 
                    replace 
                />} 
            />
        </Routes>
    </MainLayout>
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
