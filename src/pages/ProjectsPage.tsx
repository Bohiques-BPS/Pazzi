import React, { useState } from 'react';
import { Plus, Search, Filter, Grid, List } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import ProjectCard from '../components/projects/ProjectCard';
import { Project } from '../types';
import { useAuth } from '../contexts/AuthContext';

const ProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Project['status'] | 'all'>('all');

  // Mock projects data
  const projectsData: Project[] = [
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
    {
      id: '3',
      title: 'Deck Construction - Miller Backyard',
      description: 'New outdoor deck with composite decking and railing',
      clientId: 'client3',
      status: 'completed',
      createdAt: '2025-04-20T09:30:00Z',
      updatedAt: '2025-05-05T11:15:00Z',
      quote: 12000,
      assignedEmployees: ['emp1', 'emp3'],
      visits: [
        {
          id: 'visit3',
          projectId: '3',
          scheduledDate: '2025-04-25T14:00:00Z',
          status: 'completed',
          assignedEmployees: ['emp1', 'emp3'],
        },
      ],
    },
    {
      id: '4',
      title: 'Office Remodeling - Tech Startup',
      description: 'Complete office renovation with modern design and improved workspace layout',
      clientId: 'client4',
      status: 'in-progress',
      createdAt: '2025-05-02T13:45:00Z',
      updatedAt: '2025-05-12T10:30:00Z',
      quote: 32000,
      assignedEmployees: ['emp1', 'emp2', 'emp4'],
      visits: [
        {
          id: 'visit4',
          projectId: '4',
          scheduledDate: '2025-05-15T09:00:00Z',
          status: 'completed',
          assignedEmployees: ['emp1', 'emp2'],
        },
        {
          id: 'visit5',
          projectId: '4',
          scheduledDate: '2025-05-22T09:00:00Z',
          status: 'scheduled',
          assignedEmployees: ['emp1', 'emp2', 'emp4'],
        },
      ],
    },
  ];

  // Filter projects based on search query and status filter
  const filteredProjects = projectsData.filter((project) => {
    const matchesSearch = project.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          project.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Proyectos</h1>
        {isAdmin && (
          <Button
            variant="primary"
            leftIcon={<Plus size={16} />}
          >
            New Project
          </Button>
        )}
      </div>
      
      {/* Filters and Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search size={16} />}
            fullWidth
          />
        </div>
        
        <div className="flex gap-2">
          <div className="relative">
            <select
              className="block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-teal-500 focus:outline-none focus:ring-teal-500 sm:text-sm appearance-none border bg-white"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
              <Filter size={16} />
            </div>
          </div>
          
          <div className="hidden sm:flex border border-gray-300 rounded-md">
            <button
              className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100 text-teal-600' : 'text-gray-500'}`}
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
            >
              <Grid size={16} />
            </button>
            <button
              className={`p-2 ${viewMode === 'list' ? 'bg-gray-100 text-teal-600' : 'text-gray-500'}`}
              onClick={() => setViewMode('list')}
              aria-label="List view"
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>
      
      {/* Projects Grid/List */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="text-gray-500 mb-2">No projects found</div>
          <p className="text-gray-400 text-sm">Try adjusting your search or filter criteria</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProjects.map((project) => (
            <div key={project.id} className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between">
                <div>
                  <h3 className="font-medium text-lg">{project.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{project.description}</p>
                </div>
                <div>
                  {project.status === 'pending' && <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Pending</span>}
                  {project.status === 'in-progress' && <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">In Progress</span>}
                  {project.status === 'completed' && <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Completed</span>}
                  {project.status === 'cancelled' && <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Cancelled</span>}
                </div>
              </div>
              <div className="flex flex-wrap mt-3 text-sm text-gray-500 gap-4">
                <div>Created: {new Date(project.createdAt).toLocaleDateString()}</div>
                <div>{project.assignedEmployees.length} employees assigned</div>
                <div>{project.visits.length} visits scheduled</div>
                {project.quote && <div>Quote: ${project.quote.toLocaleString()}</div>}
              </div>
              <div className="mt-4 flex justify-end">
                <a href={`/projects/${project.id}`} className="text-sm text-teal-600 hover:text-teal-800">View Details →</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;