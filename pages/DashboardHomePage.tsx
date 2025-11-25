
import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AppContext, useAppContext } from '../contexts/AppContext';
import { AppModule, UserRole } from '../types';
import { APP_MODULES_CONFIG } from '../constants';
import { GuidedTour, TourStep } from '../components/GuidedTour';
import { useAuth } from '../contexts/AuthContext';
import { PlusIcon, ListBulletIcon, BriefcaseIcon, CubeIcon, CashBillIcon } from '../components/icons';
import { useTranslation } from '../contexts/GlobalSettingsContext';

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
    const { t } = useTranslation();
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


    if (!appContextValue) return <div>{t('common.loading')}</div>; 
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
            title: t('tour.step1.title'),
            content: t('tour.step1.content'),
            targetElementId: 'navbar-module-selector-button-desktop',
            placement: 'bottom',
            headerColorClass: 'bg-primary',
        },
        {
            id: 'step2-pm',
            title: t('tour.step2.title'),
            content: t('tour.step2.content'),
            targetElementId: `module-card-${AppModule.PROJECT_MANAGEMENT}`,
            placement: 'top',
            headerColorClass: 'bg-blue-600',
        },
        {
            id: 'step3-pos',
            title: t('tour.step3.title'),
            content: t('tour.step3.content'),
            targetElementId: `module-card-${AppModule.POS}`,
            placement: 'top',
            headerColorClass: 'bg-red-600',
        },
        {
            id: 'step4-ecommerce',
            title: t('tour.step4.title'),
            content: t('tour.step4.content'),
            targetElementId: `module-card-${AppModule.ECOMMERCE}`,
            placement: 'top',
            headerColorClass: 'bg-green-600',
        },
         {
            id: 'step5-end',
            title: t('tour.step5.title'),
            content: t('tour.step5.content'),
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
    
    return (
        <div className="p-6">
            <h1 id="dashboard-home-title" className="text-4xl font-semibold text-neutral-700 dark:text-neutral-200">{t('dashboard.welcome')}</h1>
            <p className="mt-2 text-neutral-600 dark:text-neutral-300">{t('dashboard.select_module')}</p>
            
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {APP_MODULES_CONFIG.filter(m => m.name !== AppModule.PROJECT_CLIENT_DASHBOARD).map(module => {
                    const descriptionText = 
                        module.name === AppModule.TIENDA ? t('dashboard.desc.tienda') :
                        module.name === AppModule.PROJECT_MANAGEMENT ? t('dashboard.desc.pm') :
                        module.name === AppModule.POS ? t('dashboard.desc.pos') :
                        module.name === AppModule.ECOMMERCE ? t('dashboard.desc.ecommerce') :
                        module.name === AppModule.ADMINISTRACION ? t('dashboard.desc.admin') :
                        '';

                    return (
                        <button 
                            key={module.path} 
                            id={`module-card-${module.name}`}
                            onClick={() => handleModuleClick(module.name)}
                            className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-lg hover:shadow-xl dark:hover:shadow-primary/20 transition-shadow duration-300 text-left"
                        >
                             <div className="flex items-center mb-2">
                                {React.isValidElement(module.icon) && React.cloneElement(module.icon as React.ReactElement<{className?: string}>, { className: "w-7 h-7 text-primary dark:text-accent" })}
                                <h2 className="text-2xl font-semibold text-primary ml-3">{t(module.name)}</h2>
                            </div>
                            <p className="text-neutral-600 dark:text-neutral-300 text-base">{t('dashboard.access_btn', { module: descriptionText })}</p>
                        </button>
                    )
                })}
            </div>

            <div className="mt-12">
                <h2 className="text-3xl font-semibold text-neutral-700 dark:text-neutral-200 mb-4">{t('dashboard.quick_access')}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {currentUser?.role === UserRole.MANAGER && (
                        <>
                            <QuickLink to="/tienda/products" icon={<PlusIcon />} text={t('quick.create_product')} />
                            <QuickLink to="/pos/sales-history" icon={<ListBulletIcon />} text={t('quick.sales_history')} />
                            <QuickLink to="/pm/projects" icon={<BriefcaseIcon />} text={t('quick.view_projects')} />
                            <QuickLink to="/tienda/inventory" icon={<CubeIcon />} text={t('quick.view_inventory')} />
                            <QuickLink to="/pos/cashier" icon={<CashBillIcon />} text={t('quick.go_to_pos')} />
                        </>
                    )}
                     {currentUser?.role === UserRole.EMPLOYEE && (
                        <>
                            <QuickLink to="/pos/cashier" icon={<CashBillIcon />} text={t('quick.go_to_pos')} />
                            <QuickLink to="/pm/projects" icon={<BriefcaseIcon />} text={t('quick.my_projects')} />
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
