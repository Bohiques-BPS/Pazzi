import React from 'react';
import { Card, CardHeader, CardBody } from '../ui/Card';
import Badge from '../ui/Badge';
import { Visit } from '../../types';

interface UpcomingVisitsProps {
  visits: Visit[];
  className?: string;
}

const UpcomingVisits: React.FC<UpcomingVisitsProps> = ({ visits, className = '' }) => {
  // Function to get badge variant based on visit status
  const getStatusBadge = (status: Visit['status']) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="primary">Agendado</Badge>;
      case 'completed':
        return <Badge variant="success">Completo</Badge>;
      case 'cancelled':
        return <Badge variant="danger">Cancelado</Badge>;
      case 'rescheduled':
        return <Badge variant="warning">Reagendado</Badge>;
      default:
        return <Badge>Desconocido</Badge>;
    }
  };

  // Function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  };

  // Calculate days until the visit
  const getDaysUntil = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const visitDate = new Date(dateString);
    visitDate.setHours(0, 0, 0, 0);
    
    const diffTime = visitDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Mañana';
    if (diffDays > 0) return `En ${diffDays} Dias`;
    if (diffDays === -1) return 'Ayer';
    return `${Math.abs(diffDays)} Dias Atras`;
  };

  return (
    <Card className={className}>
      <CardHeader className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Proximas Visitas</h2>
        <a href="/calendar" className="text-sm text-teal-600 hover:text-teal-700">
          Ver Todos
        </a>
      </CardHeader>
      <CardBody className="p-0">
        {visits.length === 0 ? (
          <div className="py-8 text-center text-gray-500">No hay visitas.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {visits.map((visit) => (
              <div key={visit.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between">
                      <h3 className="font-medium truncate">Project #{visit.projectId}</h3>
                      {getStatusBadge(visit.status)}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {formatDate(visit.scheduledDate)}
                    </p>
                    {visit.notes && (
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2">{visit.notes}</p>
                    )}
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <div className="text-sm font-medium text-teal-600">
                      {getDaysUntil(visit.scheduledDate)}
                    </div>
                  </div>
                </div>
                
                {visit.assignedEmployees.length > 0 && (
                  <div className="mt-3 flex -space-x-2 overflow-hidden">
                    {visit.assignedEmployees.map((_, index) => (
                      <div
                        key={index}
                        className="inline-block h-8 w-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs"
                      >
                        E{index + 1}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
};

export default UpcomingVisits;