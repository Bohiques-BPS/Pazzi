import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Users } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { Visit } from '../types';

const CalendarPage: React.FC = () => {
  // States for current date navigation
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  // Mock visits data
  const visitsData: Visit[] = [
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
      scheduledDate: '2025-05-22T13:00:00Z',
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
    {
      id: 'visit4',
      projectId: '4',
      scheduledDate: '2025-05-25T15:00:00Z',
      status: 'scheduled',
      notes: 'Finish painting and final inspection',
      assignedEmployees: ['emp1', 'emp4'],
    },
  ];

  // Helper functions for calendar
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Get visits for a specific day
  const getVisitsForDay = (day: number) => {
    const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return visitsData.filter(visit => {
      const visitDate = new Date(visit.scheduledDate);
      return visitDate.getFullYear() === currentYear &&
             visitDate.getMonth() === currentMonth &&
             visitDate.getDate() === day;
    });
  };

  // Format time from date string
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Get badge color based on visit status
  const getStatusBadge = (status: Visit['status']) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="primary">Programado</Badge>;
      case 'completed':
        return <Badge variant="success">Completo</Badge>;
      case 'cancelled':
        return <Badge variant="danger">Cancelado</Badge>;
      case 'rescheduled':
        return <Badge variant="warning">Reagendado</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  // Calendar rendering
  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    
   
    
    const dayNames = ['Lunes',  'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
   
    
    // Create blank spaces for days before the first day of the month
    const blanks = [];
    for (let i = 0; i < firstDay; i++) {
      blanks.push(
        <div key={`blank-${i}`} className="bg-gray-50 border border-gray-100"></div>
      );
    }
    
    // Create calendar days
    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const today = new Date();
      const isToday = d === today.getDate() && 
                      currentMonth === today.getMonth() && 
                      currentYear === today.getFullYear();
      
      const visitsForDay = getVisitsForDay(d);
      const hasVisits = visitsForDay.length > 0;
      
      days.push(
        <div
          key={d}
          className={`min-h-24 border border-gray-100 p-1 transition-colors hover:bg-gray-50 ${
            isToday ? 'bg-teal-50 border-teal-200' : 'bg-white'
          }`}
        >
          <div className={`text-sm p-1 font-medium ${isToday ? 'text-teal-700' : ''}`}>
            {d}
          </div>
          <div className="space-y-1">
            {hasVisits && visitsForDay.map((visit) => (
              <div
                key={visit.id}
                className="text-xs p-1 rounded bg-teal-100 text-teal-800 truncate cursor-pointer"
                title={`Project #${visit.projectId} - ${visit.notes || 'No notes'}`}
              >
                {formatTime(visit.scheduledDate)} - Project #{visit.projectId}
              </div>
            ))}
          </div>
        </div>
      );
    }
    
    const totalSlots = [...blanks, ...days];
    const rows = [];
    let cells = [];
    
    totalSlots.forEach((row, i) => {
      if (i % 7 !== 0) {
        cells.push(row);
      } else {
        rows.push(cells);
        cells = [];
        cells.push(row);
      }
      if (i === totalSlots.length - 1) {
        rows.push(cells);
      }
    });
    
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {monthNames[currentMonth]} {currentYear}
          </h2>
          <div className="flex space-x-1">
            <button
              onClick={goToPreviousMonth}
              className="p-2 rounded-md hover:bg-gray-100"
              aria-label="Previous month"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={goToNextMonth}
              className="p-2 rounded-md hover:bg-gray-100"
              aria-label="Next month"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-1 mb-1">
          {dayNames.map((day, index) => (
            <div key={index} className="text-center font-medium text-sm py-1">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {rows.map((d, i) => (
            <React.Fragment key={i}>
              {d}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Calendar</h1>
        <div className="flex space-x-2">
          <button className="bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-md transition-colors">
            Schedule Visit
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardBody>
              {renderCalendar()}
            </CardBody>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">Upcoming Visits</h2>
            </CardHeader>
            <CardBody className="p-0">
              <div className="divide-y divide-gray-100">
                {visitsData.map((visit) => (
                  <div key={visit.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">Project #{visit.projectId}</h3>
                      {getStatusBadge(visit.status)}
                    </div>
                    
                    <div className="mt-2 space-y-2 text-sm">
                      <div className="flex items-center text-gray-600">
                        <CalendarIcon size={14} className="mr-2" />
                        <span>
                          {new Date(visit.scheduledDate).toLocaleDateString([], {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-gray-600">
                        <Clock size={14} className="mr-2" />
                        <span>{formatTime(visit.scheduledDate)}</span>
                      </div>
                      
                      <div className="flex items-start">
                        <Users size={14} className="mr-2 mt-1" />
                        <span>{visit.assignedEmployees.length} employees assigned</span>
                      </div>
                      
                      {visit.notes && (
                        <p className="text-gray-600 mt-1 pl-6">
                          Note: {visit.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;