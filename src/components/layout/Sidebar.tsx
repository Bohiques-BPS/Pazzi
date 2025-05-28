import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Briefcase, Settings, LogOut, Home, 
  ShoppingBag, Store, CreditCard, 
  ClipboardList, Users, Calendar,
  MessageSquare, BarChart4, Package,
  ShoppingCart, Truck, UserSquare
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import logo from '/images/Logo.png';

interface SidebarProps {
  isMobile: boolean;
  isOpen: boolean;
  onClose: () => void;
}

interface ModuleConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  routes: {
    name: string;
    path: string;
    icon: React.ReactNode;
    visible?: boolean;
  }[];
}

const Sidebar: React.FC<SidebarProps> = ({ isMobile, isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [activeModule, setActiveModule] = useState('projects');
  const isAdmin = user?.role === 'admin';

  const modules: ModuleConfig[] = [
    {
      id: 'projects',
      name: 'Gestión de Proyectos',
      icon: <Briefcase size={20} />,
      routes: [
        { name: 'Dashboard', path: '/', icon: <Home size={20} /> },
        { name: 'Proyectos', path: '/projects', icon: <ClipboardList size={20} /> },
        { name: 'Empleados', path: '/employees', icon: <Users size={20} />, visible: isAdmin },
        { name: 'Calendario', path: '/calendar', icon: <Calendar size={20} /> },
        { name: 'Mensajes', path: '/messages', icon: <MessageSquare size={20} /> },
      ]
    },
    {
      id: 'pos',
      name: 'Punto de Venta',
      icon: <ShoppingCart size={20} />,
      routes: [
        { name: 'Dashboard POS', path: '/pos', icon: <BarChart4 size={20} /> },
        { name: 'Ventas', path: '/pos/sales', icon: <CreditCard size={20} /> },
        { name: 'Productos', path: '/pos/products', icon: <Package size={20} /> },
        { name: 'Inventario', path: '/pos/inventory', icon: <ShoppingBag size={20} /> },
        { name: 'Proveedores', path: '/pos/suppliers', icon: <Truck size={20} /> },
        { name: 'Clientes', path: '/pos/customers', icon: <UserSquare size={20} /> },
      ]
    },
    {
      id: 'ecommerce',
      name: 'E-Commerce',
      icon: <Store size={20} />,
      routes: [
        { name: 'Dashboard Store', path: '/store', icon: <BarChart4 size={20} /> },
        { name: 'Productos', path: '/store/products', icon: <Package size={20} /> },
        { name: 'Órdenes', path: '/store/orders', icon: <ShoppingCart size={20} /> },
        { name: 'Clientes', path: '/store/customers', icon: <UserSquare size={20} /> },
      ]
    }
  ];

  const handleLogout = () => {
    logout();
  };

  const sidebarClass = isMobile
    ? `fixed top-0 left-0 h-full w-64 bg-white shadow-lg transform ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out z-50`
    : 'w-64 bg-white h-screen sticky top-0 overflow-auto shadow-lg shadow-slate-900/20';

  return (
    <>
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        ></div>
      )}
      
      <aside className={sidebarClass}>
        <div className="p-2 border-b h-[72px] flex items-center justify-between">
          <div className="flex items-center">
            <img src={logo} className='h-[52px]' alt="Logo" />
          </div>
        </div>
        
        <nav className="mt-6">
          <div className="px-4 space-y-6">
            {modules.map((module) => (
              <div key={module.id}>
                <button
                  onClick={() => setActiveModule(module.id)}
                  className={`w-full flex items-center p-2 text-left rounded-md transition-colors ${
                    activeModule === module.id
                      ? 'bg-teal-50 text-teal-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-3">{module.icon}</span>
                  <span className="font-medium">{module.name}</span>
                </button>
                
                {activeModule === module.id && (
                  <div className="mt-2 space-y-1">
                    {module.routes
                      .filter(route => route.visible !== false)
                      .map((route) => (
                        <Link
                          key={route.path}
                          to={route.path}
                          className={`flex items-center pl-9 pr-3 py-2 text-sm rounded-md transition-colors ${
                            location.pathname === route.path
                              ? 'bg-teal-500 text-white'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                          onClick={isMobile ? onClose : undefined}
                        >
                          <span className="mr-3">{route.icon}</span>
                          <span>{route.name}</span>
                        </Link>
                      ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {isAdmin && (
            <div className="px-4 mt-6">
              <Link
                to="/settings"
                className="flex items-center p-2 text-gray-600 rounded-md hover:bg-gray-50 transition-colors"
              >
                <span className="mr-3"><Settings size={20} /></span>
                <span>Configuración</span>
              </Link>
            </div>
          )}
          
          <div className="px-4 mt-6 pt-6 border-t">
            <button
              onClick={handleLogout}
              className="flex items-center w-full p-2 text-red-500 rounded-md hover:bg-red-50 transition-colors"
            >
              <span className="mr-3"><LogOut size={20} /></span>
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;