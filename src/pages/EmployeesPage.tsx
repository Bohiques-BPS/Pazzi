import React, { useState } from 'react';
import { Plus, Search, Users } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import EmployeeCard from '../components/employees/EmployeeCard';
import { Employee } from '../types';
import { useAuth } from '../contexts/AuthContext';

const EmployeesPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [searchQuery, setSearchQuery] = useState('');

  // Mock employees data
  const employeesData: Employee[] = [
    {
      id: 'emp1',
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: 'employee',
      specialization: 'Carpenter',
      contactNumber: '(555) 123-4567',
      accessCode: '123456',
    },
    {
      id: 'emp2',
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      role: 'employee',
      specialization: 'Plumber',
      contactNumber: '(555) 987-6543',
      accessCode: '234567',
    },
    {
      id: 'emp3',
      name: 'Robert Johnson',
      email: 'robert.johnson@example.com',
      role: 'employee',
      specialization: 'Electrician',
      contactNumber: '(555) 765-4321',
      accessCode: '345678',
    },
    {
      id: 'emp4',
      name: 'Sarah Williams',
      email: 'sarah.williams@example.com',
      role: 'employee',
      specialization: 'Interior Designer',
      contactNumber: '(555) 234-5678',
      accessCode: '456789',
    },
  ];

  // Filter employees based on search query
  const filteredEmployees = employeesData.filter((employee) => {
    return (
      employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (employee.specialization && employee.specialization.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Employees</h1>
        {isAdmin && (
          <Button
            variant="primary"
            leftIcon={<Plus size={16} />}
          >
            Add Employee
          </Button>
        )}
      </div>
      
      {/* Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search size={16} />}
            fullWidth
          />
        </div>
      </div>
      
      {/* Employees Grid */}
      {filteredEmployees.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <div className="text-gray-500 mb-2">No employees found</div>
          <p className="text-gray-400 text-sm">Try adjusting your search criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((employee) => (
            <EmployeeCard key={employee.id} employee={employee} />
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployeesPage;