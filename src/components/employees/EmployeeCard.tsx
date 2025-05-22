import React from 'react';
import { Phone, Mail, Calendar, MoreVertical } from 'lucide-react';
import { Card, CardHeader, CardBody, CardFooter } from '../ui/Card';
import { Employee } from '../../types';

interface EmployeeCardProps {
  employee: Employee;
  onClick?: () => void;
}

const EmployeeCard: React.FC<EmployeeCardProps> = ({ employee, onClick }) => {
  // Get initials from employee name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  return (
    <Card hoverable className="h-full" onClick={onClick}>
      <CardHeader className="flex justify-between items-start">
        <div className="flex items-center">
          <div className="h-12 w-12 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold mr-3">
            {getInitials(employee.name)}
          </div>
          <div>
            <h3 className="font-medium text-lg">{employee.name}</h3>
            <p className="text-sm text-gray-500">{employee.specialization || 'Employee'}</p>
          </div>
        </div>
        <button className="p-1 rounded-full hover:bg-gray-100">
          <MoreVertical size={18} />
        </button>
      </CardHeader>
      
      <CardBody>
        <div className="space-y-3">
          {employee.contactNumber && (
            <div className="flex items-center text-sm">
              <Phone size={16} className="mr-2 text-gray-500" />
              <span>{employee.contactNumber}</span>
            </div>
          )}
          
          <div className="flex items-center text-sm">
            <Mail size={16} className="mr-2 text-gray-500" />
            <span>{employee.email}</span>
          </div>
          
          <div className="flex items-center text-sm">
            <Calendar size={16} className="mr-2 text-gray-500" />
            <span>Access Code: {employee.accessCode}</span>
          </div>
        </div>
      </CardBody>
      
      <CardFooter className="bg-gray-50 justify-between">
        <button className="text-sm text-blue-600 font-medium">Send Message</button>
        <a href={`/employees/${employee.id}`} className="text-sm text-teal-600 hover:text-teal-700 font-medium">
          View Details
        </a>
      </CardFooter>
    </Card>
  );
};

export default EmployeeCard;