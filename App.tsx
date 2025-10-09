import React, { useState, createContext, useContext, useEffect, useCallback, useMemo, useRef } from 'react';
import { Routes, Route, Link, useNavigate, useLocation, Navigate, useParams, Outlet } from 'react-router-dom';

import { User, UserRole, Product, Client, Employee, Project, Sale, Order, AppModule, ProductFormData, ClientFormData, EmployeeFormData, ProjectFormData, ProjectStatus, CartItem, ProjectResource, Visit, VisitStatus, VisitFormData, ECommerceSettings, Category, CategoryFormData, Theme, ChatMessage, Caja } from './types';
import { APP_MODULES_CONFIG, ADMIN_USER_ID, PROJECT_CLIENT_ID, ECOMMERCE_CLIENT_ID, inputFormStyle as sharedInputFormStyle } from './constants'; 

// Contexts
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider, useData } from './contexts/DataContext';
import { ECommerceSettingsProvider, useECommerceSettings } from './contexts/ECommerceSettingsContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AppContextProvider, useAppContext } from './contexts/AppContext';


// Layout Components
import { MainLayout } from './components/layout/MainLayout';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';

// General Pages
import { LandingPage } from './pages/LandingPage';
import { DashboardHomePage } from './pages/DashboardHomePage'; 

// PM Client Pages
import { ProjectClientDashboardPage } from './pages/project_client/ProjectClientDashboardPage';
import { ProjectClientCalendarPage } from './pages/project_client/ProjectClientCalendarPage';
import { ProjectClientChatPage } from './pages/project_client/ProjectClientChatPage';

// E-commerce Client (Shopper) specific view for their orders
import { MyOrdersPage } from './pages/ecommerce/MyOrdersPage'; 


// PM Pages (Manager & PM Employee)
import { ProjectsDashboardPage } from './pages/pm/ProjectsDashboardPage';
import { ProductsListPage } from './pages/pm/ProductsListPage';
import { CategoriesListPage } from './pages/pm/CategoriesListPage';
import { DepartmentsListPage } from './pages/pm/DepartmentsListPage';
import { ClientsListPage } from './pages/pm/ClientsListPage';
import { EmployeesListPage } from './pages/pm/EmployeesListPage';
import { ProjectsListPage } from './pages/pm/ProjectsListPage';
import { ProjectDetailPage } from './pages/pm/ProjectDetailPage';
import { ProjectCalendarPage } from './pages/pm/ProjectCalendarPage';
import { ProjectChatPage } from './pages/pm/ProjectChatPage';
import { BranchesListPage } from './pages/admin/BranchesListPage'; 
import { ProjectReportsPage } from './pages/pm/ProjectReportsPage';

// POS Pages (Manager & POS Employee)
import { POSCashierPage } from './pages/pos/POSCashierPage';
import { POSReportsPage } from './pages/pos/POSReportsPage';
import { POSSalesHistoryPage } from './pages/pos/POSSalesHistoryPage'; 
import { POSInventoryPage } from './pages/pos/POSInventoryPage';
import { EstimatesListPage } from './pages/pos/EstimatesListPage';
import { AccountsPayablePage } from './pages/pos/AccountsPayablePage';
import { AccountsReceivablePage } from './pages/pos/AccountsReceivablePage';
import { POSCajasPage } from './pages/pos/POSCajasPage';
import { LayawaysListPage } from './pages/pos/LayawaysListPage';


// Admin Ecommerce Pages
import { ECommerceSettingsPage } from './pages/ecommerce/DashboardHomePage'; 
import { EcommerceStorePage } from './pages/ecommerce/EcommerceStorePage';
import { EcommerceOrdersPage } from './pages/ecommerce/EcommerceOrdersPage';
import { SuppliersListPage } from './pages/ecommerce/SuppliersListPage';
import { SupplierOrdersListPage } from './pages/ecommerce/SupplierOrdersListPage';
import { CheckoutPage } from './pages/ecommerce/CheckoutPage'; 
import { OrderConfirmationPage } from './pages/ecommerce/OrderConfirmationPage'; 

// Admin Pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';


// Icons
import { SunIcon, MoonIcon, ExclamationTriangleIcon } from './components/icons';

// Constants
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, POS_BUTTON_RED_CLASSES, POS_BUTTON_YELLOW_CLASSES, BUTTON_PRIMARY_CLASSES } from './constants';
import { Modal } from './components/Modal';
import { VirtualAssistant } from './components/VirtualAssistant';


// --- PROTECTED ROUTE COMPONENT ---
const ProtectedRoute = ({ allowedRoles }: { allowedRoles: UserRole[] }) => {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user is logged in, but their role is not in the allowed list, navigate them to a safe default page.
  // The useEffect hook for login redirect will handle the primary navigation, this is a fallback for direct URL access.
  return allowedRoles.includes(currentUser.role)
    ? <Outlet /> 
    : <Navigate to="/" replace />;
};


// --- APP ROUTES & MAIN COMPONENT ---

const AppContent: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const appContext = useAppContext();
  if (!appContext) throw new Error("AppContext not found for AppContent");
  const { currentModule, setCurrentModule } = appContext; 

  useEffect(() => {
    const isAuthPath = ['/login', '/register', '/forgot-password'].some(p => location.pathname.startsWith(p));
    const isPublicPath = ['/', '/checkout'].some(p => location.pathname.startsWith(p)) || /^\/store(\/[^/]+)?$/.test(location.pathname) || /^\/order-confirmation(\/[^/]+)?$/.test(location.pathname);

    if (!currentUser && !isAuthPath && !isPublicPath) {
        navigate('/login');
    } else if (currentUser) {
        // This effect primarily handles the initial redirect after login.
        if (isAuthPath) {
             let targetPath = '/';
             switch (currentUser.role) {
                case UserRole.CLIENT_ECOMMERCE:
                    targetPath = '/store';
                    break;
                case UserRole.CLIENT_PROJECT:
                    targetPath = '/project-client/dashboard';
                    break;
                case UserRole.EMPLOYEE:
                    targetPath = '/'; // Go to dashboard first
                    break;
                case UserRole.MANAGER:
                    targetPath = '/'; // Go to dashboard first
                    break;
             }
             navigate(targetPath, { replace: true });
        }
    }
  }, [currentUser, location.pathname, navigate, currentModule, setCurrentModule]);
  
  const SettingsPage = () => { 
      const { currentUser: authCurrentUser, updateUserPassword, toggleUserEmergencyOrderMode } = useAuth(); 
      const { theme, setTheme } = useTheme();
      const [currentPassword, setCurrentPassword] = useState('');
      const [newPassword, setNewPassword] = useState('');
      const [confirmNewPassword, setConfirmNewPassword] = useState('');
      const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
      const [isEmergencyActive, setIsEmergencyActive] = useState(authCurrentUser?.isEmergencyOrderActive || false);
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

      const handleToggleUserEmergencyMode = async () => {
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
        await handleAdminEmergencyActivation();
    };

      const isClientRole = authCurrentUser?.role === UserRole.CLIENT_ECOMMERCE || authCurrentUser?.role === UserRole.CLIENT_PROJECT;
      const isAdminUser = authCurrentUser?.id === ADMIN_USER_ID;
      
      return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-semibold text-neutral-700 dark:text-neutral-200 mb-6">Configuración de Cuenta</h1>
            
            {message && (
                <p className={`mb-4 p-3 rounded-md text-base ${message.type === 'success' ? 'bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300'}`}>
                    {message.text}
                </p>
            )}

            <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-2xl font-semibold text-primary mb-4">Cambiar Contraseña</h2>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                        <label className="block text-base font-medium text-neutral-600 dark:text-neutral-300">Contraseña Actual</label>
                        <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className={inputFormStyle} required />
                    </div>
                    <div>
                        <label className="block text-base font-medium text-neutral-600 dark:text-neutral-300">Nueva Contraseña</label>
                        <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputFormStyle} required />
                    </div>
                    <div>
                        <label className="block text-base font-medium text-neutral-600 dark:text-neutral-300">Confirmar Nueva Contraseña</label>
                        <input type="password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} className={inputFormStyle} required />
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES}>Actualizar Contraseña</button>
                    </div>
                </form>
            </div>
            
            {isClientRole && (
                <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md mb-6">
                    <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                        <ExclamationTriangleIcon className="w-5 h-5 mr-2 text-amber-500" /> Modo de Pedido de Emergencia (Cliente)
                    </h2>
                    <p className="text-base text-neutral-600 dark:text-neutral-300 mb-3">
                        Al activar este modo, tus pedidos podrían ser marcados con prioridad o para atención especial debido a una urgencia.
                    </p>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleToggleUserEmergencyMode}
                            className={`${
                                isEmergencyActive 
                                    ? POS_BUTTON_RED_CLASSES 
                                    : POS_BUTTON_YELLOW_CLASSES 
                            } font-semibold py-2 px-4 rounded-md shadow-sm transition-colors duration-150 text-base`}
                            aria-pressed={isEmergencyActive}
                        >
                            {isEmergencyActive ? 'Desactivar Modo Emergencia' : 'Activar Modo Emergencia'}
                        </button>
                        <span className={`text-base font-medium px-2 py-1 rounded-full ${isEmergencyActive ? 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100' : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-100'}`}>
                            Estado: {isEmergencyActive ? 'Activo' : 'Inactivo'}
                        </span>
                    </div>
                </div>
            )}

            {isAdminUser && (
                <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md mb-6">
                    <h2 className="text-2xl font-semibold text-primary mb-4 flex items-center">
                        <ExclamationTriangleIcon className="w-6 h-6 mr-2 text-red-600" /> Modo Emergencia Administrador
                    </h2>
                    <p className="text-base text-neutral-600 dark:text-neutral-300 mb-3">
                        Activa o desactiva el modo de emergencia para la cuenta de administrador.
                    </p>
                    <div className="flex items-center space-x-3">
                        {!isEmergencyActive ? (
                            <button
                                onClick={() => setIsAdminEmergencyModeConfirmationOpen(true)}
                                className={`${BUTTON_PRIMARY_CLASSES} font-semibold py-2 px-4 rounded-md shadow-sm transition-colors duration-150 text-base`}
                            >
                                Activar Modo Emergencia Admin
                            </button>
                        ) : (
                            <button
                                onClick={handleAdminEmergencyDeactivation}
                                className={`${POS_BUTTON_RED_CLASSES} font-semibold py-2 px-4 rounded-md shadow-sm transition-colors duration-150 text-base`}
                            >
                                Desactivar Modo Emergencia Admin
                            </button>
                        )}
                        <span className={`text-base font-medium px-2.5 py-1.5 rounded-full ${isEmergencyActive ? 'bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100' : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-100'}`}>
                            Estado Global Admin: {isEmergencyActive ? 'Activo' : 'Inactivo'}
                        </span>
                    </div>
                </div>
            )}

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
                    <p className="text-base text-neutral-600 dark:text-neutral-300 mb-4 text-center">
                        Para confirmar, escribe <strong className="text-red-600 dark:text-red-400">'activar'</strong> en el campo de abajo.
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
                <h2 className="text-2xl font-semibold text-primary mb-4">Tema de la Aplicación</h2>
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

  const showVirtualAssistant = currentUser;

  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/store/:storeOwnerId" element={<EcommerceStorePage />} />
        <Route path="/store" element={<EcommerceStorePage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order-confirmation/:orderId" element={<OrderConfirmationPage />} />

        {/* Authenticated Routes */}
        <Route element={<ProtectedRoute allowedRoles={[UserRole.MANAGER, UserRole.EMPLOYEE, UserRole.CLIENT_ECOMMERCE, UserRole.CLIENT_PROJECT]} />}>
            <Route element={<MainLayout />}>
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/" element={<DashboardHomePage />} />

                {/* E-commerce Client Routes */}
                <Route path="/my-orders" element={<MyOrdersPage />} />

                {/* Project Client Routes */}
                <Route path="/project-client/dashboard" element={<ProjectClientDashboardPage />} />
                <Route path="/project-client/calendar" element={<ProjectClientCalendarPage />} />
                <Route path="/project-client/chat/:projectId" element={<ProjectClientChatPage />} />

                {/* Shared Manager & Employee Routes */}
                <Route path="/pm/dashboard" element={<ProjectsDashboardPage />} />
                <Route path="/pm/projects" element={<ProjectsListPage />} />
                <Route path="/pm/projects/:projectId" element={<ProjectDetailPage />} />
                <Route path="/pm/chat" element={<ProjectChatPage />} />
                <Route path="/pos/cashier" element={<POSCashierPage />} />

                {/* Manager Only Routes */}
                <Route path="/tienda/products" element={<ProductsListPage />} />
                <Route path="/tienda/categories" element={<CategoriesListPage />} />
                <Route path="/tienda/departments" element={<DepartmentsListPage />} />
                <Route path="/tienda/clients" element={<ClientsListPage />} />
                <Route path="/tienda/employees" element={<EmployeesListPage />} />
                <Route path="/tienda/branches" element={<BranchesListPage />} />
                <Route path="/tienda/inventory" element={<POSInventoryPage />} />
                <Route path="/pm/calendar" element={<ProjectCalendarPage />} />
                <Route path="/pm/reports" element={<ProjectReportsPage />} />

                <Route path="/pos/reports" element={<POSReportsPage />} />
                <Route path="/pos/sales-history" element={<POSSalesHistoryPage />} />
                <Route path="/pos/estimates" element={<EstimatesListPage />} />
                <Route path="/pos/layaways" element={<LayawaysListPage />} />
                <Route path="/pos/accounts-payable" element={<AccountsPayablePage />} />
                <Route path="/pos/accounts-receivable" element={<AccountsReceivablePage />} />
                <Route path="/pos/cajas" element={<POSCajasPage />} />
                
                <Route path="/ecommerce/dashboard" element={<ECommerceSettingsPage />} />
                <Route path="/ecommerce/orders" element={<EcommerceOrdersPage />} />
                <Route path="/ecommerce/suppliers" element={<SuppliersListPage />} />
                <Route path="/ecommerce/supplier-orders" element={<SupplierOrdersListPage />} />

                <Route path="/admin/dashboard" element={<AdminDashboardPage />} />

                {/* Default module redirects */}
                <Route path="/tienda" element={<Navigate to="/tienda/products" replace />} />
                <Route path="/pm" element={<Navigate to="/pm/dashboard" replace />} />
                <Route path="/pos" element={<Navigate to={currentUser?.role === UserRole.MANAGER ? "/pos/reports" : "/pos/cashier"} replace />} />
                <Route path="/ecommerce" element={<Navigate to="/ecommerce/dashboard" replace />} />
                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/project-client" element={<Navigate to="/project-client/dashboard" replace />} />

            </Route>
        </Route>
        
        {/* Fallback for non-logged-in users at root */}
        <Route path="/" element={<LandingPage />} />
        
        {/* Catch-all for any other unmatched routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
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