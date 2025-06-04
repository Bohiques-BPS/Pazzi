import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { ProjectStatus, UserRole } from '../../types';
import { BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { ChatBubbleLeftRightIcon, CalendarDaysIcon, BriefcaseIcon } from '../../components/icons';

export const ProjectClientDashboardPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { projects: allProjects, getClientById } = useData();

  const clientProjects = useMemo(() => {
    if (!currentUser || currentUser.role !== UserRole.CLIENT_PROJECT) return [];
    return allProjects.filter(p => p.clientId === currentUser.id);
  }, [allProjects, currentUser]);

  const clientInfo = currentUser ? getClientById(currentUser.id) : null;

  if (!currentUser || currentUser.role !== UserRole.CLIENT_PROJECT) {
    return <p className="p-6 text-center text-neutral-500 dark:text-neutral-400">Acceso denegado.</p>;
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-neutral-800 dark:text-neutral-100">
          Bienvenido a tu Portal de Proyecto, {clientInfo?.name || currentUser.email}!
        </h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-300">
          Aquí puedes ver el estado de tus proyectos, acceder a los chats y revisar tu calendario de visitas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link 
          to="/project-client/calendar" 
          className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-lg hover:shadow-primary/20 transition-shadow flex items-center space-x-4"
        >
          <CalendarDaysIcon className="w-10 h-10 text-primary" />
          <div>
            <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-200">Calendario de Visitas</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Consulta las fechas programadas para tu proyecto.</p>
          </div>
        </Link>
         <div 
          className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-lg flex items-center space-x-4"
        >
          <BriefcaseIcon className="w-10 h-10 text-primary" />
          <div>
            <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-200">Mis Proyectos Activos</h2>
            <p className="text-2xl font-bold text-primary">{clientProjects.filter(p => p.status === ProjectStatus.ACTIVE || p.status === ProjectStatus.PENDING).length}</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-4 text-neutral-700 dark:text-neutral-200">Mis Proyectos</h2>
        {clientProjects.length > 0 ? (
          <div className="space-y-4">
            {clientProjects.map(project => (
              <div key={project.id} className="bg-white dark:bg-neutral-800 p-5 rounded-lg shadow-md">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-primary">{project.name}</h3>
                    <p className={`text-xs font-medium px-2 py-0.5 rounded-full inline-block my-1 ${
                        project.status === ProjectStatus.ACTIVE ? 'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-200' :
                        project.status === ProjectStatus.COMPLETED ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-200' :
                        project.status === ProjectStatus.PENDING ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-700 dark:text-yellow-200' :
                        'bg-orange-100 text-orange-700 dark:bg-orange-700 dark:text-orange-200' // Paused
                    }`}>{project.status}</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1 line-clamp-2">{project.description || "Sin descripción detallada."}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                      Fechas: {new Date(project.startDate + 'T00:00:00').toLocaleDateString()} - {new Date(project.endDate + 'T00:00:00').toLocaleDateString()}
                    </p>
                  </div>
                  <div className="mt-3 sm:mt-0 sm:ml-4 flex-shrink-0">
                    <Link 
                      to={`/project-client/chat/${project.id}`}
                      className={`${BUTTON_SECONDARY_SM_CLASSES} flex items-center w-full sm:w-auto justify-center`}
                    >
                      <ChatBubbleLeftRightIcon className="w-4 h-4 mr-1.5" />
                      Abrir Chat
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow text-center">
            <p className="text-neutral-500 dark:text-neutral-400">No tienes proyectos asignados actualmente.</p>
            <p className="text-sm mt-2 text-neutral-500 dark:text-neutral-400">Si crees que esto es un error, por favor contacta a Pazzi.</p>
          </div>
        )}
      </div>
    </div>
  );
};