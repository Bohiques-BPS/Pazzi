
import React from 'react';
import { Link } from 'react-router-dom'; 
import { useAuth } from '../contexts/AuthContext'; 
import { useData } from '../contexts/DataContext'; 
import { BUTTON_SECONDARY_SM_CLASSES } from '../constants'; 
import { ChatBubbleLeftRightIcon } from '../components/icons'; 

// This page is currently not used. 
// CLIENT_ECOMMERCE goes to /store.
// CLIENT_PROJECT goes to /project-client/dashboard.
// This could be repurposed if a "Store Owner" client type is added in the future.
export const ClientDashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { projects, orders } = useData();

  // This filtering logic might need adjustment based on new client roles
  // For now, it assumes a generic client ID.
  const clientProjects = projects.filter(p => (currentUser && p.clientId === currentUser.id)); 
  const clientOrders = orders.filter(o => o.clientEmail === currentUser?.email);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6 text-neutral-700 dark:text-neutral-200">Bienvenido, {currentUser?.name || currentUser?.email}!</h1>
      <p className="text-neutral-500 dark:text-neutral-400">Este es un dashboard genérico para clientes. La funcionalidad específica se moverá a roles de cliente más definidos.</p>
      
      <div className="mb-8 mt-4">
        <h2 className="text-xl font-semibold mb-3 text-neutral-600 dark:text-neutral-300">Mis Proyectos (Ejemplo)</h2>
        {clientProjects.length > 0 ? (
          <ul className="space-y-3">
            {clientProjects.map(p => (
              <li key={p.id} className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-medium text-primary">{p.name}</h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Estado: {p.status}</p>
                        {/* Fechas del proyecto ahora se gestionan a través de Visitas */}
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Cronograma: Ver visitas programadas.</p>
                    </div>
                    {/* The link below should point to a client-specific chat page if this dashboard were active for project clients */}
                    <Link 
                        to={`/project-client/chat/${p.id}`} // Example path
                        className={`${BUTTON_SECONDARY_SM_CLASSES} flex items-center self-start`}
                        aria-label={`Abrir chat para proyecto ${p.name}`}
                    >
                        <ChatBubbleLeftRightIcon className="w-4 h-4 mr-1.5" />
                        Ver Chat
                    </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="text-neutral-500 dark:text-neutral-400">No tienes proyectos asignados.</p>}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3 text-neutral-600 dark:text-neutral-300">Historial de Compras (E-commerce - Ejemplo)</h2>
        {clientOrders.length > 0 ? (
          <ul className="space-y-3">
            {clientOrders.map(o => (
              <li key={o.id} className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow">
                <h3 className="font-medium text-primary">Pedido #{o.id.substring(0,8)}</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Fecha: {new Date(o.date).toLocaleDateString()}</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Total: ${o.totalAmount.toFixed(2)}</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Estado: {o.status}</p>
              </li>
            ))}
          </ul>
        ) : <p className="text-neutral-500 dark:text-neutral-400">No has realizado compras.</p>}
      </div>
    </div>
  );
};
