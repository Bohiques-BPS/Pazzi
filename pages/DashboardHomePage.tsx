import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppContext, useAppContext } from '../contexts/AppContext'; // Corrected path
import { AppModule, UserRole } from '../types'; // Corrected path
import { APP_MODULES_CONFIG } from '../constants'; // Corrected path
import { GuidedTour, TourStep } from '../components/GuidedTour'; // Import GuidedTour
import { useAuth } from '../contexts/AuthContext'; // Import useAuth
import { PlusIcon, ListBulletIcon, BriefcaseIcon, CubeIcon, CashBillIcon } from '../components/icons';

const TOUR_LOCAL_STORAGE_KEY = 'pazziDashboardTourShown';

const QuickLink: React.FC<{ to: string; icon: React.ReactNode; text: string; }> = ({ to, icon, text }) => (
    <Link
        to={to}
        className="flex flex-col items-center justify-center p-4 bg-white dark:bg-neutral-800 rounded-lg shadow-md hover:shadow-lg dark:hover:shadow-primary/20 transition-all duration-200 hover:-translate-y-1"
    >
        <div className="text-primary dark:text-accent mb-2">
            {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<{className?: string}>, { className: "w-8 h-8" }) : icon}
        </div>
        <span className="text-base font-semibold text-neutral-700 dark:text-neutral-200 text-center">{text}</span>
    </Link>
);


export const DashboardHomePage: React.FC = () => {
    const appContextValue = useAppContext();
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const [isTourActive, setIsTourActive] = useState(false);
    const [currentTourStep, setCurrentTourStep] = useState(0);

    useEffect(() => {
        if (currentUser && currentUser.role !== UserRole.CLIENT_ECOMMERCE && currentUser.role !== UserRole.CLIENT_PROJECT) {
            const tourShown = localStorage.getItem(TOUR_LOCAL_STORAGE_KEY);
            if (tourShown !== 'true') {
                setIsTourActive(true);
            }
        }
    }, [currentUser]);


    if (!appContextValue) return <div>Loading...</div>; 
    const { currentModule, setCurrentModule } = appContextValue;

    const handleModuleClick = (module: AppModule) => {
        setCurrentModule(module);
        const moduleConfig = APP_MODULES_CONFIG.find(m => m.name === module);
        if (moduleConfig) {
            let firstSubModulePath = '';
             if (module === AppModule.TIENDA && moduleConfig.subModulesTienda?.length > 0) {
                 const firstItem = moduleConfig.subModulesTienda[0];
                 if (firstItem.type === 'link') firstSubModulePath = firstItem.path;
                 else if (firstItem.type === 'group' && firstItem.children.length > 0) firstSubModulePath = firstItem.children[0].path;
             } else if (module === AppModule.PROJECT_MANAGEMENT && moduleConfig.subModulesProject.length > 0 && moduleConfig.subModulesProject[0].type === 'link') {
                firstSubModulePath = moduleConfig.subModulesProject[0].path;
            } else if (module === AppModule.POS && moduleConfig.subModulesPOS && moduleConfig.subModulesPOS.length > 0) {
                const firstPosItem = moduleConfig.subModulesPOS[0];
                 if (firstPosItem.type === 'link') firstSubModulePath = firstPosItem.path;
                 else if (firstPosItem.type === 'group' && firstPosItem.children.length > 0) firstSubModulePath = firstPosItem.children[0].path;
                 else firstSubModulePath = moduleConfig.path;
            } else if (module === AppModule.ECOMMERCE && moduleConfig.subModulesEcommerce.length > 0 && moduleConfig.subModulesEcommerce[0].type === 'link') {
                firstSubModulePath = moduleConfig.subModulesEcommerce[0].path;
            }
            
            if (firstSubModulePath) navigate(firstSubModulePath);
            else navigate(moduleConfig.path); 
        }
    };

    const tourSteps: TourStep[] = [
        {
            id: 'step1-welcome',
            title: 'Bienvenido a Pazzi',
            content: 'Este es un breve recorrido por los módulos principales. Usa el selector de módulos (icono de cuadrados) o el menú lateral para navegar.',
            targetElementId: 'navbar-module-selector-button-desktop', // ID for the desktop module selector
            placement: 'bottom',
            headerColorClass: 'bg-primary',
        },
        {
            id: 'step2-pm',
            title: 'Gestión de Proyectos',
            content: 'Administra proyectos, clientes, recursos, calendarios y comunicación. Ideal para planificar y ejecutar trabajos complejos.',
            targetElementId: `module-card-${AppModule.PROJECT_MANAGEMENT}`,
            placement: 'top',
            headerColorClass: 'bg-blue-600',
        },
        {
            id: 'step3-pos',
            title: 'Punto de Venta (POS)',
            content: 'Realiza ventas, gestiona tu caja, inventario, y obtén reportes detallados de tus transacciones en tienda.',
            targetElementId: `module-card-${AppModule.POS}`,
            placement: 'top',
            headerColorClass: 'bg-red-600',
        },
        {
            id: 'step4-ecommerce',
            title: 'Administración E-commerce',
            content: 'Configura tu tienda online, gestiona productos web, pedidos de clientes y proveedores.',
            targetElementId: `module-card-${AppModule.ECOMMERCE}`,
            placement: 'top',
            headerColorClass: 'bg-green-600',
        },
         {
            id: 'step5-end',
            title: '¡Todo Listo!',
            content: 'Has completado el tour. ¡Explora Pazzi y descubre todo lo que puede hacer por tu negocio!',
            targetElementId: 'dashboard-home-title', // Target the main title of the page
            placement: 'bottom',
            headerColorClass: 'bg-primary',
        },
    ];
    
    const handleCloseTour = () => {
        setIsTourActive(false);
        localStorage.setItem(TOUR_LOCAL_STORAGE_KEY, 'true');
    };
    const handleNextStep = () => setCurrentTourStep(prev => prev + 1);
    const handlePrevStep = () => setCurrentTourStep(prev => prev - 1);
    
    return (
        <div className="p-6">
            <h1 id="dashboard-home-title" className="text-4xl font-semibold text-neutral-700 dark:text-neutral-200">Bienvenido a Pazzi</h1>
            <p className="mt-2 text-neutral-600 dark:text-neutral-300">Selecciona un módulo para comenzar a trabajar.</p>
            
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {APP_MODULES_CONFIG.filter(m => m.name !== AppModule.PROJECT_CLIENT_DASHBOARD).map(module => {
                    const descriptionText = 
                        module.name === AppModule.TIENDA ? 'gestión de productos, clientes, inventario y más.' :
                        module.name === AppModule.PROJECT_MANAGEMENT ? 'gestión de proyectos.' :
                        module.name === AppModule.POS ? 'punto de venta.' :
                        module.name === AppModule.ECOMMERCE ? 'e-commerce admin.' :
                        `${module.name.toLowerCase()}.`;

                    return (
                        <button 
                            key={module.path} 
                            id={`module-card-${module.name}`}
                            onClick={() => handleModuleClick(module.name)}
                            className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-lg hover:shadow-xl dark:hover:shadow-primary/20 transition-shadow duration-300 text-left"
                        >
                             <div className="flex items-center mb-2">
                                {React.isValidElement(module.icon) && React.cloneElement(module.icon as React.ReactElement<{className?: string}>, { className: "w-7 h-7 text-primary dark:text-accent" })}
                                <h2 className="text-2xl font-semibold text-primary ml-3">{module.name}</h2>
                            </div>
                            <p className="text-neutral-600 dark:text-neutral-300 text-base">Accede a las herramientas de {descriptionText}</p>
                        </button>
                    )
                })}
            </div>

            <div className="mt-12">
                <h2 className="text-3xl font-semibold text-neutral-700 dark:text-neutral-200 mb-4">Accesos Rápidos</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {currentUser?.role === UserRole.MANAGER && (
                        <>
                            <QuickLink to="/tienda/products" icon={<PlusIcon />} text="Crear Producto" />
                            <QuickLink to="/pos/sales-history" icon={<ListBulletIcon />} text="Historial de Ventas" />
                            <QuickLink to="/pm/projects" icon={<BriefcaseIcon />} text="Ver Proyectos" />
                            <QuickLink to="/tienda/inventory" icon={<CubeIcon />} text="Ver Inventario" />
                            <QuickLink to="/pos/cashier" icon={<CashBillIcon />} text="Ir a Caja" />
                        </>
                    )}
                     {currentUser?.role === UserRole.EMPLOYEE && (
                        <>
                            <QuickLink to="/pos/cashier" icon={<CashBillIcon />} text="Caja Registradora" />
                            <QuickLink to="/pm/projects" icon={<BriefcaseIcon />} text="Mis Proyectos" />
                        </>
                    )}
                </div>
            </div>

            {isTourActive && (
                <GuidedTour
                    steps={tourSteps}
                    isOpen={isTourActive}
                    currentStepIndex={currentTourStep}
                    onClose={handleCloseTour}
                    onNext={handleNextStep}
                    onPrev={handlePrevStep}
                />
            )}
        </div>
    );
};
