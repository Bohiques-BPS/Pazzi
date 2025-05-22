import React from 'react';
import { MoreVertical, Calendar, Users, MessageSquare } from 'lucide-react';
import { Card, CardHeader, CardBody, CardFooter } from '../ui/Card';
import Badge from '../ui/Badge';
import { Project } from '../../types';

interface ProjectCardProps {
  project: Project;
  onClick?: () => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick }) => {
  // Function to get badge variant based on project status
  const getStatusBadge = (status: Project['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">Pending</Badge>;
      case 'in-progress':
        return <Badge variant="primary">In Progress</Badge>;
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="danger">Cancelled</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  return (
    <Card hoverable className="h-full" onClick={onClick}>
      <CardHeader className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-lg">{project.title}</h3>
          <div className="mt-1">{getStatusBadge(project.status)}</div>
        </div>
        <button className="p-1 rounded-full hover:bg-gray-100">
          <MoreVertical size={18} />
        </button>
      </CardHeader>
      
      <CardBody>
        <p className="text-gray-600 text-sm line-clamp-2 mb-4">{project.description}</p>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center">
            <Calendar size={14} className="mr-1 text-gray-500" />
            <span>Created: {formatDate(project.createdAt)}</span>
          </div>
          
          <div className="flex items-center">
            <Users size={14} className="mr-1 text-gray-500" />
            <span>{project.assignedEmployees.length} assigned</span>
          </div>
          
          <div className="flex items-center">
            <Calendar size={14} className="mr-1 text-gray-500" />
            <span>{project.visits.length} visits</span>
          </div>
          
          <div className="flex items-center">
            <MessageSquare size={14} className="mr-1 text-gray-500" />
            <span>Open chat</span>
          </div>
        </div>
        
        {project.quote && (
          <div className="mt-4 px-3 py-2 bg-gray-50 rounded-md border border-gray-100">
            <div className="text-xs text-gray-500">Quote</div>
            <div className="font-medium">${project.quote.toLocaleString()}</div>
          </div>
        )}
      </CardBody>
      
      <CardFooter className="bg-gray-50">
        <div className="flex items-center justify-between w-full">
          <div className="flex -space-x-2 overflow-hidden">
            {project.assignedEmployees.slice(0, 3).map((_, index) => (
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
          <a href={`/projects/${project.id}`} className="text-sm text-teal-600 hover:text-teal-700 font-medium">
            View Details
          </a>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ProjectCard;