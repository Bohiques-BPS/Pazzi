
import React, { useState, createContext, useContext, useEffect, useCallback, useMemo, useRef, Suspense } from 'react';
import { Routes, Route, Link, useNavigate, useLocation, Navigate, useParams, Outlet } from 'react-router-dom';
import { Toaster, ToastBar, toast as hotToast } from 'react-hot-toast';

// Code-splitting: carga diferida de páginas por ruta. Envuelve módulos con export por nombre.
// (Debe declararse antes de las constantes `const X = lazyNamed(...)` de más abajo.)
const lazyNamed = (factory: () => Promise<any>, name: string) =>
  React.lazy(async () => ({ default: (await factory())[name] }));

import { User, UserRole, Product, Client, Employee, Project, Sale, Order, AppModule, ProductFormData, ClientFormData, EmployeeFormData, ProjectFormData, ProjectStatus, CartItem, ProjectResource, Visit, VisitStatus, VisitFormData, ECommerceSettings, Category, CategoryFormData, Theme, ChatMessage, Caja } from './types';
import { APP_MODULES_CONFIG, ADMIN_USER_ID, PROJECT_CLIENT_ID, ECOMMERCE_CLIENT_ID, inputFormStyle as sharedInputFormStyle } from './constants'; 

// Contexts
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider, useData } from './contexts/DataContext';
import { ECommerceSettingsProvider, useECommerceSettings } from './contexts/ECommerceSettingsContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AppContextProvider, useAppContext } from './contexts/AppContext';
import { GlobalSettingsProvider, useGlobalSettings } from './contexts/GlobalSettingsContext'; // Imported
import { useApiErrorToasts } from './hooks/useApiErrorToasts';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { BusinessOnboardingModal } from './components/onboarding/BusinessOnboardingModal';


// Layout Components
import { MainLayout } from './components/layout/MainLayout';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ActivateAccountPage } from './pages/auth/ActivateAccountPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { LegalPage } from './pages/legal/LegalPage';
const ProfilePage = lazyNamed(() => import('./pages/ProfilePage'), 'ProfilePage');

// General Pages
import { LandingPage } from './pages/LandingPage';
const DashboardHomePage = lazyNamed(() => import('./pages/DashboardHomePage'), 'DashboardHomePage'); 
const ConfigurationPage = lazyNamed(() => import('./pages/ConfigurationPage'), 'ConfigurationPage'); // Imported

// PM Client Pages
const ProjectClientDashboardPage = lazyNamed(() => import('./pages/project_client/ProjectClientDashboardPage'), 'ProjectClientDashboardPage');
const ProjectClientCalendarPage = lazyNamed(() => import('./pages/project_client/ProjectClientCalendarPage'), 'ProjectClientCalendarPage');
const ProjectClientChatPage = lazyNamed(() => import('./pages/project_client/ProjectClientChatPage'), 'ProjectClientChatPage');

// E-commerce Client (Shopper) specific view for their orders
const MyOrdersPage = lazyNamed(() => import('./pages/ecommerce/MyOrdersPage'), 'MyOrdersPage'); 


// PM Pages (Manager & PM Employee)
const ProjectsDashboardPage = lazyNamed(() => import('./pages/pm/ProjectsDashboardPage'), 'ProjectsDashboardPage');
const ProductsListPage = lazyNamed(() => import('./pages/pm/ProductsListPage'), 'ProductsListPage');
const CategoriesListPage = lazyNamed(() => import('./pages/pm/CategoriesListPage'), 'CategoriesListPage');
const DepartmentsListPage = lazyNamed(() => import('./pages/pm/DepartmentsListPage'), 'DepartmentsListPage');
const ClientsListPage = lazyNamed(() => import('./pages/pm/ClientsListPage'), 'ClientsListPage');
const EmployeesListPage = lazyNamed(() => import('./pages/pm/EmployeesListPage'), 'EmployeesListPage');
const RolesListPage = lazyNamed(() => import('./pages/pm/RolesListPage'), 'RolesListPage');
const ProjectsListPage = lazyNamed(() => import('./pages/pm/ProjectsListPage'), 'ProjectsListPage');
const ProjectDetailPage = lazyNamed(() => import('./pages/pm/ProjectDetailPage'), 'ProjectDetailPage');
const ProjectCalendarPage = lazyNamed(() => import('./pages/pm/ProjectCalendarPage'), 'ProjectCalendarPage');
const ProjectChatPage = lazyNamed(() => import('./pages/pm/ProjectChatPage'), 'ProjectChatPage');
const BranchesListPage = lazyNamed(() => import('./pages/admin/BranchesListPage'), 'BranchesListPage'); 
const ProjectReportsPage = lazyNamed(() => import('./pages/pm/ProjectReportsPage'), 'ProjectReportsPage');

// POS Pages (Manager & POS Employee)
const POSCashierPage = lazyNamed(() => import('./pages/pos/POSCashierPage'), 'POSCashierPage');
const POSReportsPage = lazyNamed(() => import('./pages/pos/POSReportsPage'), 'POSReportsPage');
const ReceiptSettingsPage = lazyNamed(() => import('./pages/pos/ReceiptSettingsPage'), 'ReceiptSettingsPage');
const PaymentMethodsPage = lazyNamed(() => import('./pages/pos/PaymentMethodsPage'), 'PaymentMethodsPage');
const RecurringPaymentsPage = lazyNamed(() => import('./pages/pos/RecurringPaymentsPage'), 'RecurringPaymentsPage');
const InvoicesListPage = lazyNamed(() => import('./pages/pos/InvoicesListPage'), 'InvoicesListPage');
const AttendancePage = lazyNamed(() => import('./pages/pos/AttendancePage'), 'AttendancePage');
const POSSalesHistoryPage = lazyNamed(() => import('./pages/pos/POSSalesHistoryPage'), 'POSSalesHistoryPage'); 
const POSInventoryPage = lazyNamed(() => import('./pages/pos/POSInventoryPage'), 'POSInventoryPage');
const EstimatesListPage = lazyNamed(() => import('./pages/pos/EstimatesListPage'), 'EstimatesListPage');
const AccountsPayablePage = lazyNamed(() => import('./pages/pos/AccountsPayablePage'), 'AccountsPayablePage');
const AccountsReceivablePage = lazyNamed(() => import('./pages/pos/AccountsReceivablePage'), 'AccountsReceivablePage');
const POSCajasPage = lazyNamed(() => import('./pages/pos/POSCajasPage'), 'POSCajasPage');
const LayawaysListPage = lazyNamed(() => import('./pages/pos/LayawaysListPage'), 'LayawaysListPage');


// Admin Ecommerce Pages
const ECommerceSettingsPage = lazyNamed(() => import('./pages/ecommerce/DashboardHomePage'), 'ECommerceSettingsPage');
const ECommerceReportsPage = lazyNamed(() => import('./pages/ecommerce/ECommerceDashboardPage'), 'ECommerceReportsPage');
const EcommerceStorePage = lazyNamed(() => import('./pages/ecommerce/EcommerceStorePage'), 'EcommerceStorePage');
const EcommerceOrdersPage = lazyNamed(() => import('./pages/ecommerce/EcommerceOrdersPage'), 'EcommerceOrdersPage');
const SuppliersListPage = lazyNamed(() => import('./pages/ecommerce/SuppliersListPage'), 'SuppliersListPage');
const SupplierOrdersListPage = lazyNamed(() => import('./pages/ecommerce/SupplierOrdersListPage'), 'SupplierOrdersListPage');
const CheckoutPage = lazyNamed(() => import('./pages/ecommerce/CheckoutPage'), 'CheckoutPage'); 
const OrderConfirmationPage = lazyNamed(() => import('./pages/ecommerce/OrderConfirmationPage'), 'OrderConfirmationPage');
const PublicInvoicePage = lazyNamed(() => import('./pages/pos/PublicInvoicePage'), 'PublicInvoicePage');

// Admin Pages
const AdminDashboardPage = lazyNamed(() => import('./pages/admin/AdminDashboardPage'), 'AdminDashboardPage');
const SuperAdminUsersPage = lazyNamed(() => import('./pages/admin/SuperAdminUsersPage'), 'SuperAdminUsersPage');


// Icons
import { ExclamationTriangleIcon } from './components/icons';

// Constants
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, POS_BUTTON_RED_CLASSES, POS_BUTTON_YELLOW_CLASSES, BUTTON_PRIMARY_CLASSES } from './constants';
import { Modal } from './components/Modal';
import { authService } from './services/auth';
import { PasswordInput } from './components/ui/PasswordInput';


// --- PROTECTED ROUTE COMPONENT ---
const ProtectedRoute = ({ allowedRoles }: { allowedRoles: UserRole[] }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="flex h-screen items-center justify-center">Cargando...</div>;

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user is logged in, but their role is not in the allowed list, navigate them to a safe default page.
  // The useEffect hook for login redirect will handle the primary navigation, this is a fallback for direct URL access.
  if (allowedRoles.includes(currentUser.role)) return <Outlet />;
  // El super-admin tiene su propia sección; evita el bucle de redirigir a "/".
  const fallback = currentUser.role === UserRole.SUPER_ADMIN ? '/admin/users' : '/';
  return <Navigate to={fallback} replace />;
};


// --- APP ROUTES & MAIN COMPONENT ---

const AppContent: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const appContext = useAppContext();
  if (!appContext) throw new Error("AppContext not found for AppContent");
  const { currentModule, setCurrentModule } = appContext;

  const { settings, loadSettings } = useGlobalSettings();

  // Cargar la configuración del negocio desde la BD al iniciar sesión.
  useEffect(() => {
    if (currentUser) loadSettings();
  }, [currentUser, loadSettings]);

  // Toasts globales para errores del API (403/429/5xx)
  useApiErrorToasts();

  // Atajos de teclado globales
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  useGlobalShortcuts({
    onShowHelp: () => setShortcutsModalOpen(true),
    enabled: !!currentUser,
  });

  useEffect(() => {
      const root = document.documentElement;
      if (settings.fontSize === 'sm') {
          root.style.fontSize = '14px';
      } else if (settings.fontSize === 'lg') {
          root.style.fontSize = '18px';
      } else {
          root.style.fontSize = '16px'; // md default
      }
  }, [settings.fontSize]);

  useEffect(() => {
    if (loading) return;

    const isAuthPath = ['/login', '/register', '/forgot-password'].some(p => location.pathname.startsWith(p));
    const isPublicPath = ['/', '/checkout'].some(p => location.pathname.startsWith(p)) || /^\/store(\/[^/]+)?$/.test(location.pathname) || /^\/order-confirmation(\/[^/]+)?$/.test(location.pathname) || /^\/pay\/[^/]+$/.test(location.pathname);

    if (!currentUser && !isAuthPath && !isPublicPath) {
        navigate('/login');
    } else if (currentUser) {
        // This effect primarily handles the initial redirect after login.
        if (isAuthPath) {
             let targetPath = '/';
             switch (currentUser.role) {
                case UserRole.SUPER_ADMIN:
                    targetPath = '/admin/users';
                    break;
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
  }, [currentUser, loading, location.pathname, navigate, currentModule, setCurrentModule]);
  
  const SettingsPage = () => {
      const { currentUser: authCurrentUser, updateUserEmail } = useAuth();
      const [currentPassword, setCurrentPassword] = useState('');
      const [newPassword, setNewPassword] = useState('');
      const [confirmNewPassword, setConfirmNewPassword] = useState('');
      const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
      const [submitting, setSubmitting] = useState(false);

      // Cambio de correo
      const [newEmail, setNewEmail] = useState('');
      const [emailPassword, setEmailPassword] = useState('');
      const [emailMessage, setEmailMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
      const [emailSubmitting, setEmailSubmitting] = useState(false);

      if (!authCurrentUser) return null;

      const handleEmailChange = async (e: React.FormEvent) => {
          e.preventDefault();
          setEmailMessage(null);
          const trimmed = newEmail.trim();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
              setEmailMessage({ type: 'error', text: 'Ingresa un correo válido.' }); return;
          }
          if (trimmed.toLowerCase() === authCurrentUser.email.toLowerCase()) {
              setEmailMessage({ type: 'error', text: 'El nuevo correo es igual al actual.' }); return;
          }
          if (!emailPassword) {
              setEmailMessage({ type: 'error', text: 'Ingresa tu contraseña actual para confirmar.' }); return;
          }
          setEmailSubmitting(true);
          const res = await updateUserEmail(emailPassword, trimmed);
          setEmailMessage({ type: res.success ? 'success' : 'error', text: res.message });
          if (res.success) { setNewEmail(''); setEmailPassword(''); }
          setEmailSubmitting(false);
      };

      const validate = (): string | null => {
          if (!currentPassword) return 'Ingresa tu contraseña actual.';
          if (newPassword.length < 8) return 'La nueva contraseña debe tener al menos 8 caracteres.';
          if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword))
              return 'La contraseña debe contener letra y número.';
          if (newPassword !== confirmNewPassword) return 'Las nuevas contraseñas no coinciden.';
          if (newPassword === currentPassword) return 'La nueva contraseña debe ser distinta a la actual.';
          return null;
      };

      const handlePasswordChange = async (e: React.FormEvent) => {
          e.preventDefault();
          setMessage(null);
          const v = validate();
          if (v) { setMessage({ type: 'error', text: v }); return; }
          setSubmitting(true);
          try {
              await authService.updatePassword(currentPassword, newPassword);
              setMessage({ type: 'success', text: 'Contraseña actualizada correctamente.' });
              setCurrentPassword('');
              setNewPassword('');
              setConfirmNewPassword('');
          } catch (err: any) {
              setMessage({ type: 'error', text: err?.message || 'Error al cambiar la contraseña' });
          } finally {
              setSubmitting(false);
          }
      };

      return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-semibold text-neutral-700 dark:text-neutral-200 mb-6">Mi Cuenta</h1>

            {message && (
                <p className={`mb-4 p-3 rounded-md text-base ${message.type === 'success' ? 'bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300'}`}>
                    {message.text}
                </p>
            )}

            <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-2xl font-semibold text-primary mb-1">
                    {authCurrentUser.name} {authCurrentUser.lastName}
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">{authCurrentUser.email}</p>

                <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-200 mb-4 mt-6">Cambiar Correo</h3>
                {emailMessage && (
                    <p className={`mb-4 p-3 rounded-md text-base ${emailMessage.type === 'success' ? 'bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300'}`}>
                        {emailMessage.text}
                    </p>
                )}
                <form onSubmit={handleEmailChange} className="space-y-4">
                    <div>
                        <label className="block text-base font-medium text-neutral-600 dark:text-neutral-300">Nuevo Correo</label>
                        <input
                            type="email"
                            value={newEmail}
                            onChange={e => setNewEmail(e.target.value)}
                            className={inputFormStyle}
                            required
                            autoComplete="email"
                            placeholder={authCurrentUser.email}
                        />
                    </div>
                    <div>
                        <label className="block text-base font-medium text-neutral-600 dark:text-neutral-300">Contraseña Actual</label>
                        <PasswordInput
                            value={emailPassword}
                            onChange={e => setEmailPassword(e.target.value)}
                            className={inputFormStyle}
                            required
                            autoComplete="current-password"
                        />
                        <p className="text-xs text-neutral-500 mt-1">Confirma tu identidad para cambiar el correo.</p>
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES} disabled={emailSubmitting}>
                            {emailSubmitting ? 'Guardando...' : 'Actualizar Correo'}
                        </button>
                    </div>
                </form>

                <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-200 mb-4 mt-8 pt-6 border-t dark:border-neutral-700">Cambiar Contraseña</h3>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                        <label className="block text-base font-medium text-neutral-600 dark:text-neutral-300">Contraseña Actual</label>
                        <PasswordInput
                            value={currentPassword}
                            onChange={e => setCurrentPassword(e.target.value)}
                            className={inputFormStyle}
                            required
                            autoComplete="current-password"
                        />
                    </div>
                    <div>
                        <label className="block text-base font-medium text-neutral-600 dark:text-neutral-300">Nueva Contraseña</label>
                        <PasswordInput
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            className={inputFormStyle}
                            required
                            autoComplete="new-password"
                        />
                        <p className="text-xs text-neutral-500 mt-1">Mín. 8 caracteres con letra y número.</p>
                    </div>
                    <div>
                        <label className="block text-base font-medium text-neutral-600 dark:text-neutral-300">Confirmar Nueva Contraseña</label>
                        <PasswordInput
                            value={confirmNewPassword}
                            onChange={e => setConfirmNewPassword(e.target.value)}
                            className={inputFormStyle}
                            required
                            autoComplete="new-password"
                        />
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES} disabled={submitting}>
                            {submitting ? 'Guardando...' : 'Actualizar Contraseña'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      );
  };

  return (
    <ErrorBoundary>
      <KeyboardShortcutsModal isOpen={shortcutsModalOpen} onClose={() => setShortcutsModalOpen(false)} />
      <BusinessOnboardingModal />
      <Suspense fallback={<div className="flex h-screen items-center justify-center text-neutral-500 dark:text-neutral-400">Cargando…</div>}>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/activate" element={<ActivateAccountPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/store/:storeOwnerId" element={<EcommerceStorePage />} />
        <Route path="/store" element={<EcommerceStorePage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order-confirmation/:orderId" element={<OrderConfirmationPage />} />
        <Route path="/pay/:token" element={<PublicInvoicePage />} />
        {/* Páginas legales públicas (para registro de app OAuth y pie de la tienda). */}
        <Route path="/privacy" element={<LegalPage variant="privacy" />} />
        <Route path="/privacidad" element={<LegalPage variant="privacy" />} />
        <Route path="/terms" element={<LegalPage variant="terms" />} />
        <Route path="/terminos" element={<LegalPage variant="terms" />} />

        {/* Super-administrador (sección propia, sin el layout de tienda) */}
        <Route element={<ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN]} />}>
            <Route path="/admin/users" element={<SuperAdminUsersPage />} />
        </Route>

        {/* Authenticated Routes */}
        <Route element={<ProtectedRoute allowedRoles={[UserRole.MANAGER, UserRole.EMPLOYEE, UserRole.CLIENT_ECOMMERCE, UserRole.CLIENT_PROJECT]} />}>
            <Route element={<MainLayout />}>
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/configuration" element={<ConfigurationPage />} /> {/* New Route */}
                <Route path="/profile" element={<ProfilePage />} />
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
                <Route path="/tienda/roles" element={<RolesListPage />} />
                <Route path="/tienda/branches" element={<BranchesListPage />} />
                <Route path="/tienda/inventory" element={<POSInventoryPage />} />
                <Route path="/tienda/suppliers" element={<SuppliersListPage />} />
                <Route path="/tienda/supplier-orders" element={<SupplierOrdersListPage />} />
                <Route path="/pm/calendar" element={<ProjectCalendarPage />} />
                <Route path="/pm/reports" element={<ProjectReportsPage />} />

                <Route path="/pos/reports" element={<POSReportsPage />} />
                <Route path="/pos/sales-history" element={<POSSalesHistoryPage />} />
                <Route path="/pos/estimates" element={<EstimatesListPage />} />
                <Route path="/pos/layaways" element={<LayawaysListPage />} />
                <Route path="/pos/accounts-payable" element={<AccountsPayablePage />} />
                <Route path="/pos/accounts-receivable" element={<AccountsReceivablePage />} />
                <Route path="/pos/cajas" element={<POSCajasPage />} />
                <Route path="/pos/receipt-settings" element={<ReceiptSettingsPage />} />
                <Route path="/pos/payment-methods" element={<PaymentMethodsPage />} />
                <Route path="/pos/recurring" element={<RecurringPaymentsPage />} />
                <Route path="/pos/invoices" element={<InvoicesListPage />} />
                <Route path="/pos/attendance" element={<AttendancePage />} />
                
                <Route path="/ecommerce/dashboard" element={<ECommerceReportsPage />} />
                <Route path="/ecommerce/design" element={<ECommerceSettingsPage />} />
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
      </Suspense>
    </ErrorBoundary>
  );
}


const App: React.FC = () => {
  return (
    <ThemeProvider>
      <GlobalSettingsProvider>
        <Toaster position="top-right" reverseOrder={false} toastOptions={{ duration: 4000 }}>
          {(t) => (
            <ToastBar toast={t}>
              {({ icon, message }) => (
                <div className="flex items-center gap-2 max-w-md">
                  {icon}
                  <div className="flex-1">{message}</div>
                  {t.type !== 'loading' && (
                    <button
                      onClick={() => hotToast.dismiss(t.id)}
                      aria-label="Cerrar"
                      className="ml-1 shrink-0 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 text-xl leading-none px-1"
                    >
                      ×
                    </button>
                  )}
                </div>
              )}
            </ToastBar>
          )}
        </Toaster>
        <AppContextProvider>
            <AuthProvider>
            <DataProvider>
                <ECommerceSettingsProvider>
                <AppContent />
                </ECommerceSettingsProvider>
            </DataProvider>
            </AuthProvider>
        </AppContextProvider>
      </GlobalSettingsProvider>
    </ThemeProvider>
  );
};
export default App;
