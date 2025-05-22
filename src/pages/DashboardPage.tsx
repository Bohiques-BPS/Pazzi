import React from 'react';
import { Users, Briefcase, Calendar, DollarSign } from 'lucide-react';
import StatCard from '../components/dashboard/StatCard';
import ProjectsList from '../components/dashboard/ProjectsList';
import UpcomingVisits from '../components/dashboard/UpcomingVisits';
import { Project, Visit } from '../types';
import { useAuth } from '../contexts/AuthContext';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  // Mock data for recent projects
  const recentProjects: Project[] = [
    {
      id: '1',
      title: 'Kitchen Remodeling - Johnson Residence',
      description: 'Complete kitchen renovation including cabinets, countertops, and appliances',
      clientId: 'client1',
      status: 'in-progress',
      createdAt: '2025-05-15T10:00:00Z',
      updatedAt: '2025-05-17T14:30:00Z',
      quote: 15000,
      assignedEmployees: ['emp1', 'emp2', 'emp3'],
      visits: [
        {
          id: 'visit1',
          projectId: '1',
          scheduledDate: '2025-05-20T09:00:00Z',
          status: 'scheduled',
          assignedEmployees: ['emp1', 'emp2'],
        },
      ],
    },
    {
      id: '2',
      title: 'Bathroom Renovation - Smith Family',
      description: 'Master bathroom upgrade with new shower, vanity, and fixtures',
      clientId: 'client2',
      status: 'pending',
      createdAt: '2025-05-10T08:15:00Z',
      updatedAt: '2025-05-10T16:45:00Z',
      quote: 8500,
      assignedEmployees: ['emp2'],
      visits: [
        {
          id: 'visit2',
          projectId: '2',
          scheduledDate: '2025-05-25T13:00:00Z',
          status: 'scheduled',
          assignedEmployees: ['emp2'],
        },
      ],
    },
  ];

  // Upcoming visits data
  const upcomingVisits: Visit[] = [
    {
      id: 'visit1',
      projectId: '1',
      scheduledDate: '2025-05-20T09:00:00Z',
      status: 'scheduled',
      notes: 'Initial measurement and consultation',
      assignedEmployees: ['emp1', 'emp2'],
    },
    {
      id: 'visit2',
      projectId: '2',
      scheduledDate: '2025-05-25T13:00:00Z',
      status: 'scheduled',
      notes: 'Review plans and finalize material selection',
      assignedEmployees: ['emp2'],
    },
    {
      id: 'visit3',
      projectId: '3',
      scheduledDate: '2025-05-18T10:30:00Z',
      status: 'rescheduled',
      notes: 'Installation of kitchen cabinets',
      assignedEmployees: ['emp1', 'emp3'],
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Escritorio</h1>
        <div className="flex space-x-2">
          {isAdmin && (
            <button className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-md transition-colors">
              Crear Nuevo Proyecto
            </button>
          )}
        </div>
      </div>
      
      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Proyectos Actuales"
          value="24"
          icon={<Briefcase size={24} />}
          trend={{ value: 12, positive: true }}
        />
        <StatCard
          title="Empleados Activos"
          value="8"
          icon={<Users size={24} />}
          trend={{ value: 3, positive: true }}
        />
        <StatCard
          title="Proximas visitas"
          value="15"
          icon={<Calendar size={24} />}
          trend={{ value: 5, positive: true }}
        />
        <StatCard
          title="Gananancias"
          value="$34,500"
          icon={<DollarSign size={24} />}
          trend={{ value: 8, positive: true }}
        />
      </div>
      
      {/* Projects and Visits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProjectsList title="Proximos Proyectos" projects={recentProjects} />
        <UpcomingVisits visits={upcomingVisits} />
      </div>
    </div>
  );
};

export default DashboardPage;