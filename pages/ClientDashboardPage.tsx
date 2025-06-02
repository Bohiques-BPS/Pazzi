
import React from 'react';
import { Link } from 'react-router-dom'; // Added Link
import { useAuth } from '../contexts/AuthContext'; // Adjusted path
import { useData } from '../contexts/DataContext'; // Adjusted path
import { BUTTON_SECONDARY_SM_CLASSES } from '../constants'; // Added for button styling
import { ChatBubbleLeftRightIcon } from '../components/icons'; // Added for icon

export const ClientDashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { projects, orders } = useData();

  const clientProjects = projects.filter(p => (currentUser && p.clientId === currentUser.id)); 
  const clientOrders = orders.filter(o => o.clientEmail === currentUser?.email);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6 text-neutral-700 dark:text-neutral-200">Bienvenido, {currentUser?.name || currentUser?.email}!</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-neutral-600 dark:text-neutral-300">Mis Proyectos</h2>
        {clientProjects.length > 0 ? (
          <ul className="space-y-3">
            {clientProjects.map(p => (
              <li key={p.id} className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-medium text-primary">{p.name}</h3>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Estado: {p.status}</p>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Fechas: {new Date(p.startDate).toLocaleDateString()} - {new Date(p.endDate).toLocaleDateString()}</p>
                    </div>
                    <Link 
                        to={`/client/chat/${p.id}`} 
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
        <h2 className="text-xl font-semibold mb-3 text-neutral-600 dark:text-neutral-300">Historial de Compras (E-commerce)</h2>
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
