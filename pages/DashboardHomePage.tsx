import React, { useContext, useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppContext, useAppContext } from '../contexts/AppContext';
import { AppModule, UserRole } from '../types';
import { APP_MODULES_CONFIG, SubModuleLink } from '../constants';
import { GuidedTour, TourStep } from '../components/GuidedTour';
import { useAuth } from '../contexts/AuthContext';
import { PlusIcon, ListBulletIcon, BriefcaseIcon, CubeIcon, CashBillIcon, FireIcon } from '../components/icons';
import { getTopVisitedPaths, getTrackedPageCount } from '../utils/pageTracker';

const TOUR_LOCAL_STORAGE_KEY = 'pazziDashboardTourShown';

// ── Static fallback quick links per role ──────────────────────────────────────

const DEFAULT_QUICK_LINKS: Record<string, Array<{ to: string; icon: React.ReactNode; text: string }>> = {
    [UserRole.MANAGER]: [
        { to: '/tienda/products', icon: <PlusIcon />, text: 'Crear Producto' },
        { to: '/pos/sales-history', icon: <ListBulletIcon />, text: 'Historial de Ventas' },
        { to: '/pm/projects', icon: <BriefcaseIcon />, text: 'Ver Proyectos' },
        { to: '/tienda/inventory', icon: <CubeIcon />, text: 'Ver Inventario' },
        { to: '/pos/cashier', icon: <CashBillIcon />, text: 'Ir a Caja' },
    ],
    [UserRole.EMPLOYEE]: [
        { to: '/pos/cashier', icon: <CashBillIcon />, text: 'Caja Registradora' },
        { to: '/pm/projects', icon: <BriefcaseIcon />, text: 'Mis Proyectos' },
    ],
};

// ── Build a flat path → { label, iconComponent } map from sidebar config ──────

function buildRouteMeta(): Record<string, { label: string; Icon: React.ComponentType<{ className?: string }> | null }> {
    const map: Record<string, { label: string; Icon: React.ComponentType<{ className?: string }> | null }> = {};
    for (const mod of APP_MODULES_CONFIG) {
        const allLinks: SubModuleLink[] = [];
        const addLinks = (items: typeof mod.subModulesTienda) => {
            for (const item of items) {
                if (item.type === 'link') allLinks.push(item);
                else if (item.type === 'group') item.children.forEach(c => allLinks.push(c));
            }
        };
        addLinks(mod.subModulesTienda);
        addLinks(mod.subModulesProject);
        addLinks(mod.subModulesPOS);
        addLinks(mod.subModulesEcommerce);
        addLinks(mod.subModulesAdmin);
        for (const link of allLinks) {
            map[link.path] = {
                label: link.name,
                Icon: (link.icon as React.ComponentType<{ className?: string }>) ?? null,
            };
        }
    }
    return map;
}

const ROUTE_META = buildRouteMeta();

// Minimum visits before we switch from static → dynamic links
const DYNAMIC_THRESHOLD = 3;
// How many dynamic quick links to show
const MAX_DYNAMIC_LINKS = 6;

// ── QuickLink card ─────────────────────────────────────────────────────────────

const QuickLink: React.FC<{
    to: string;
    icon: React.ReactNode;
    text: string;
    visitCount?: number;
}> = ({ to, icon, text, visitCount }) => (
    <Link
        to={to}
        className="relative w-full min-w-0 overflow-hidden flex flex-col items-center justify-center p-4 bg-white dark:bg-neutral-800 rounded-lg shadow-md hover:shadow-lg dark:hover:shadow-primary/20 transition-all duration-200 hover:-translate-y-1 group"
    >
        {visitCount !== undefined && visitCount > 0 && (
            <span className="absolute top-2 right-2 text-xs text-neutral-400 dark:text-neutral-500 group-hover:text-primary transition-colors">
                {visitCount}×
            </span>
        )}
        <div className="flex-shrink-0 text-primary dark:text-accent mb-2">
            {React.isValidElement(icon)
                ? React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-8 h-8' })
                : icon}
        </div>
        <span className="w-full text-sm sm:text-base font-semibold text-neutral-700 dark:text-neutral-200 text-center leading-tight break-words">{text}</span>
    </Link>
);

// ── Main page ──────────────────────────────────────────────────────────────────

export const DashboardHomePage: React.FC = () => {
    const appContextValue = useAppContext();
    const navigate = useNavigate();
    const { currentUser } = useAuth();

    const [isTourActive, setIsTourActive] = useState(false);
    const [currentTourStep, setCurrentTourStep] = useState(0);

    // Re-render trigger so visit counts update on each dashboard visit
    const [refreshCount, setRefreshCount] = useState(0);
    useEffect(() => {
        setRefreshCount(n => n + 1);
    }, []);

    useEffect(() => {
        if (
            currentUser &&
            currentUser.role !== UserRole.CLIENT_ECOMMERCE &&
            currentUser.role !== UserRole.CLIENT_PROJECT
        ) {
            const tourShown = localStorage.getItem(TOUR_LOCAL_STORAGE_KEY);
            if (tourShown !== 'true') setIsTourActive(true);
        }
    }, [currentUser]);

    // ── Dynamic quick links ────────────────────────────────────────────────────

    const dynamicLinks = useMemo(() => {
        if (!currentUser?.id) return null;
        const totalTracked = getTrackedPageCount(currentUser.id);
        if (totalTracked < DYNAMIC_THRESHOLD) return null; // not enough history yet

        const topPaths = getTopVisitedPaths(currentUser.id, MAX_DYNAMIC_LINKS);
        const links = topPaths
            .map(path => {
                const meta = ROUTE_META[path];
                if (!meta) return null;
                return { path, ...meta };
            })
            .filter(Boolean) as Array<{ path: string; label: string; Icon: React.ComponentType<{ className?: string }> | null }>;

        return links.length >= 2 ? links : null; // need at least 2 to bother
    }, [currentUser?.id, refreshCount]);

    // ── Counts map for badge ───────────────────────────────────────────────────

    const visitCounts = useMemo(() => {
        if (!currentUser?.id) return {};
        try {
            const raw = localStorage.getItem(`pazzi_page_visits_${currentUser.id}`);
            if (!raw) return {};
            const visits = JSON.parse(raw) as Record<string, { count: number }>;
            const counts: Record<string, number> = {};
            for (const [path, data] of Object.entries(visits)) counts[path] = data.count;
            return counts;
        } catch {
            return {};
        }
    }, [currentUser?.id, refreshCount]);

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
            targetElementId: 'navbar-module-selector-button-desktop',
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
            targetElementId: 'dashboard-home-title',
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

    // ── Quick links: dynamic or static fallback ────────────────────────────────

    const role = currentUser?.role;
    const staticLinks = role ? (DEFAULT_QUICK_LINKS[role] ?? []) : [];

    return (
        <div className="p-6">
            <h1
                id="dashboard-home-title"
                className="text-4xl font-semibold text-neutral-700 dark:text-neutral-200"
            >
                Bienvenido a Pazzi
            </h1>
            <p className="mt-2 text-neutral-600 dark:text-neutral-300">
                Selecciona un módulo para comenzar a trabajar.
            </p>

            {/* Module cards */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
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
                            className="w-full min-w-0 overflow-hidden bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-lg hover:shadow-xl dark:hover:shadow-primary/20 transition-shadow duration-300 text-left"
                        >
                            <div className="flex items-center mb-2 min-w-0">
                                <span className="flex-shrink-0">
                                    {React.isValidElement(module.icon) &&
                                        React.cloneElement(module.icon as React.ReactElement<{ className?: string }>, {
                                            className: 'w-7 h-7 text-primary dark:text-accent',
                                        })}
                                </span>
                                <h2 className="text-xl sm:text-2xl font-semibold text-primary ml-3 min-w-0 break-words hyphens-auto">{module.name}</h2>
                            </div>
                            <p className="text-neutral-600 dark:text-neutral-300 text-sm sm:text-base break-words">
                                Accede a las herramientas de {descriptionText}
                            </p>
                        </button>
                    );
                })}
            </div>

            {/* Quick access */}
            <div className="mt-12">
                <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-3xl font-semibold text-neutral-700 dark:text-neutral-200">
                        Accesos Rápidos
                    </h2>
                    {dynamicLinks && (
                        <span className="flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full border border-neutral-200 dark:border-neutral-700">
                            <FireIcon className="w-3 h-3 text-orange-400" />
                            Basado en tu actividad
                        </span>
                    )}
                </div>

                {dynamicLinks ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {dynamicLinks.map(({ path, label, Icon }) => (
                            <QuickLink
                                key={path}
                                to={path}
                                text={label}
                                visitCount={visitCounts[path]}
                                icon={Icon ? <Icon className="w-8 h-8" /> : <BriefcaseIcon className="w-8 h-8" />}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {staticLinks.map(link => (
                            <QuickLink key={link.to} to={link.to} icon={link.icon} text={link.text} />
                        ))}
                        {staticLinks.length === 0 && (
                            <p className="text-sm text-neutral-400 dark:text-neutral-500 col-span-full">
                                Navega por la plataforma y aquí aparecerán tus secciones más visitadas.
                            </p>
                        )}
                    </div>
                )}
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
