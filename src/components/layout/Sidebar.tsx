import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Users, Briefcase, MessageSquare, Settings, LogOut, Home, ShoppingBag } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import logo from '/images/Logo.png'; // Tell webpack this JS file uses this image

interface SidebarProps {
  isMobile: boolean;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobile, isOpen, onClose }) => {
  const { user, logout } = useAuth();
  
  const isAdmin = user?.role === 'admin';
  
  const sidebarItems = [
    { name: 'Escritorio', icon: <Home size={20} />, path: '/', visible: true },
    { name: 'Proyectos', icon: <Briefcase size={20} />, path: '/projects', visible: true },
    { name: 'Productos', icon: <ShoppingBag size={20} />, path: '/products', visible: true },
    { name: 'Calendario', icon: <Calendar size={20} />, path: '/calendar', visible: true },
    { name: 'Mensajes', icon: <MessageSquare size={20} />, path: '/messages', visible: true },
    { name: 'Empleados', icon: <Users size={20} />, path: '/employees', visible: isAdmin },
    { name: 'Configuración', icon: <Settings size={20} />, path: '/settings', visible: isAdmin },
  ];

  const handleLogout = () => {
    logout();
  };

  // Handle sidebar visibility based on mobile state and isOpen prop
  const sidebarClass = isMobile
    ? `fixed top-0 left-0 h-full w-64 bg-white text-white shadow-lg transform ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out z-50`
    : 'w-64 bg-white text-white h-screen sticky top-0 overflow-auto shadow-lg shadow-slate-900/20 shadow-b-2 shadow-r-[3px] -shadow-spread-2';

  return (
    <>
      {/* Backdrop for mobile sidebar */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        ></div>
      )}
      
      <aside className={sidebarClass}>
        <div className="p-2 border-b  h-[72px]">
          <div className="flex items-center justify-center">
                  <img src={logo} className='h-[52px]' alt="Logo" />

          </div>
        </div>
        
        <nav className="mt-6">
          <ul className="space-y-2 px-4">
            {sidebarItems
              .filter(item => item.visible)
              .map((item, index) => (
                <li key={index}>
                  <Link 
                    to={item.path}
                    className="flex items-center p-3 text-black font-bold rounded-md hover:bg-blue-800 hover:text-white transition duration-150 ease-in-out"
                    onClick={isMobile ? onClose : undefined}
                  >
                    <span className="mr-3 ">{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                </li>
            ))}
            
            <li className="pt-6">
              <button 
                onClick={handleLogout}
                className="flex items-center w-full p-3 text-red rounded-md hover:bg-blue-800 transition duration-150 ease-in-out"
              >
                <span className="mr-3 text-red-400"><LogOut size={20} /></span>
                <span className="text-red-400 font-bold">Salir</span>
              </button>
            </li>
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;