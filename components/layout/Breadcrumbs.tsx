import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const routeLabels: Record<string, string> = {
  '': 'Inicio',
  'pm': 'Proyectos',
  'pos': 'POS',
  'ecommerce': 'E-commerce',
  'admin': 'Administración',
  'projects': 'Proyectos',
  'clients': 'Clientes',
  'products': 'Productos',
  'categories': 'Categorías',
  'departments': 'Departamentos',
  'employees': 'Empleados',
  'suppliers': 'Proveedores',
  'branches': 'Sucursales',
  'cajas': 'Cajas',
  'sales-history': 'Historial de Ventas',
  'reports': 'Reportes',
  'inventory': 'Inventario',
  'estimates': 'Estimados',
  'layaways': 'Apartados',
  'accounts-receivable': 'CxC',
  'accounts-payable': 'CxP',
  'dashboard': 'Dashboard',
  'settings': 'Configuración',
  'orders': 'Pedidos',
  'supplier-orders': 'Órdenes a Proveedores',
  'checkout': 'Checkout',
  'chat': 'Chat',
  'calendar': 'Calendario',
  'cashier': 'Caja',
};

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter(x => x);

  if (pathnames.length === 0) return null;

  return (
    <nav className="flex items-center space-x-1 text-sm text-neutral-500 dark:text-neutral-400 mb-3 overflow-x-auto">
      <Link to="/" className="hover:text-primary dark:hover:text-primary-400 transition-colors shrink-0">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      </Link>
      {pathnames.map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const label = routeLabels[name] || name.charAt(0).toUpperCase() + name.slice(1);

        return (
          <React.Fragment key={name}>
            <span className="text-neutral-300 dark:text-neutral-600">/</span>
            {isLast ? (
              <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate max-w-[150px]">{label}</span>
            ) : (
              <Link to={routeTo} className="hover:text-primary dark:hover:text-primary-400 transition-colors truncate max-w-[150px]">
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
