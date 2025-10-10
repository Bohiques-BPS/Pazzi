
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; 
import { AppModule } from '../../types';
// FIX: Corrected import path for icons from `../../components/icons` to `../icons` to match sibling components in the same directory.
import { 
    HomeIcon as DashboardIcon, // Using HomeIcon as a generic dashboard icon
    WrenchScrewdriverIcon as ProjectsIcon, // Placeholder for projects
    ShoppingCartIcon as StoreIcon, 
    Cog6ToothIcon as SettingsIcon, 
    BriefcaseIcon as ProductsIcon, // Using Briefcase as products inventory
    ListBulletIcon as OrdersIcon, // Using List for orders
    ChatBubbleLeftRightIcon,
    MenuIcon, XMarkIcon
} from '../icons';

interface LayoutProps {
  children: React.ReactNode;
}

export const ClientLayout: React.FC<LayoutProps> = ({ children }) => {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navLinks = [
        { name: "Dashboard", path: "/client-dashboard", icon: <DashboardIcon /> },
        { name: "Mis Proyectos", path: "/client-dashboard", subPathMatch: "/client/chat", icon: <ProjectsIcon /> }, // Combines projects & chat for now
        { name: "Mi Tienda Online", path: `/store/${currentUser?.id}`, icon: <StoreIcon />, isExternalLike: true }, // Link to their public store
        { name: "Gestión E-commerce", icon: <ProductsIcon />, subLinks: [ // Using Briefcase as main e-com icon
            { name: "Config. Tienda", path: "/client/ecommerce/settings", icon: <SettingsIcon /> },
            { name: "Mis Productos", path: "/client/ecommerce/products", icon: <ProductsIcon /> },
            { name: "Mis Pedidos", path: "/client/ecommerce/orders", icon: <OrdersIcon /> },
        ]}
    ];

    return (
        <div className="flex flex-col min-h-screen bg-neutral-100 dark:bg-neutral-900">
            <nav className="bg-primary text-white p-4 shadow-md fixed w-full z-20 top-0">
                <div className="container mx-auto flex justify-between items-center">
                     <button onClick={() => setSidebarOpen(!sidebarOpen)} className="mr-3 p-2 rounded hover:bg-white/10 lg:hidden text-white">
                        {sidebarOpen ? <XMarkIcon /> : <MenuIcon />}
                    </button>
                    <Link to="/client-dashboard" className="text-2xl font-bold">Pazzi</Link>
                    <div className="flex items-center space-x-4">
                        <span className="hidden sm:inline">{currentUser?.name || currentUser?.email} (Cliente)</span>
                        <button onClick={handleLogout} className="bg-accent hover:bg-amber-600 text-white font-semibold py-1.5 px-3 rounded-md text-base transition duration-150">
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </nav>

            <div className="flex flex-1 pt-[64px]"> {/* Adjust pt to match navbar height */}
                {/* Sidebar */}
                <aside className={`bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 w-64 space-y-2 py-7 px-2 fixed inset-y-0 left-0 top-[64px] transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-200 ease-in-out z-10 shadow-lg border-r border-neutral-200 dark:border-neutral-700`}>
                    <nav className="mt-4">
                        {navLinks.map(link => (
                            link.subLinks ? (
                                <div key={link.name}>
                                    <h3 className="px-4 py-2 text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center">
                                        {React.cloneElement(link.icon, { className: "w-4 h-4 mr-2"})} {link.name}
                                    </h3>
                                    {link.subLinks.map(subLink => (
                                        <Link
                                            key={subLink.path}
                                            to={subLink.path}
                                            onClick={() => sidebarOpen && setSidebarOpen(false)}
                                            className={`block py-2.5 px-4 pl-8 rounded-md transition duration-200 text-base font-semibold ${location.pathname === subLink.path ? 'bg-primary text-white' : 'text-neutral-600 dark:text-neutral-300 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 dark:hover:text-white'}`}
                                        >
                                         {React.cloneElement(subLink.icon, { className: "w-4 h-4 mr-2 inline"})} {subLink.name}
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    target={link.isExternalLike ? "_blank" : ""}
                                    rel={link.isExternalLike ? "noopener noreferrer" : ""}
                                    onClick={() => sidebarOpen && setSidebarOpen(false)}
                                    className={`flex items-center py-2.5 px-4 rounded-md transition duration-200 text-base font-semibold ${ (location.pathname === link.path || (link.subPathMatch && location.pathname.startsWith(link.subPathMatch))) ? 'bg-primary text-white' : 'text-neutral-600 dark:text-neutral-300 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 dark:hover:text-white'}`}
                                >
                                    {React.cloneElement(link.icon, { className: "w-5 h-5 mr-3"})} {link.name}
                                </Link>
                            )
                        ))}
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 overflow-y-auto lg:ml-64 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
};
