import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../ui/Card';
import Badge from '../ui/Badge';
import { Project } from '../../types';

interface ProjectsListProps {
  title: string;
  projects: Project[];
  className?: string;
}

const ProjectsList: React.FC<ProjectsListProps> = ({ title, projects, className = '' }) => {
  // Function to get badge variant based on project status
  const getStatusBadge = (status: Project['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">Pendiente</Badge>;
      case 'in-progress':
        return <Badge variant="primary">En Progreso</Badge>;
      case 'completed':
        return <Badge variant="success">Completadas</Badge>;
      case 'cancelled':
        return <Badge variant="danger">Canceladas</Badge>;
      default:
        return <Badge>Desconocido</Badge>;
    }
  };

  // Function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  return (
    <Card className={className}>
      <CardHeader className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">{title}</h2>
        <a href="/projects" className="text-sm text-teal-600 hover:text-teal-700">
          Ver Todos
        </a>
      </CardHeader>
      <CardBody className="p-0">
        <div className="divide-y divide-gray-100">
          {projects.length === 0 ? (
            <div className="py-8 text-center text-gray-500">No Hay Proyectos.</div>
          ) : (
            projects.map((project) => (
              <div key={project.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{project.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{project.description}</p>
                  </div>
                  <div>{getStatusBadge(project.status)}</div>
                </div>
                
                <div className="mt-3 flex items-center text-sm text-gray-500 space-x-4">
                  <div className="flex items-center">
                    <Calendar size={14} className="mr-1" />
                    <span>Creado: {formatDate(project.createdAt)}</span>
                  </div>
                  {project.visits.length > 0 && (
                    <div className="flex items-center">
                      <Clock size={14} className="mr-1" />
                      <span>Proxima visita: {formatDate(project.visits[0].scheduledDate)}</span>
                    </div>
                  )}
                </div>
                
                {project.assignedEmployees.length > 0 && (
                  <div className="mt-3 flex -space-x-2 overflow-hidden">
                    {project.assignedEmployees.map((_, index) => (
                      <div
                        key={index}
                        className="inline-block h-8 w-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs"
                      >
                        E{index + 1}
                      </div>
                    ))}
                    {project.assignedEmployees.length > 3 && (
                      <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 border-2 border-white text-xs font-medium">
                        +{project.assignedEmployees.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardBody>
    </Card>
  );
};

export default ProjectsList;