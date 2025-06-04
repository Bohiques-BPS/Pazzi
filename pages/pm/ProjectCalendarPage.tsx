
import React, { useState, useMemo, useEffect } from 'react';
import { Visit, Employee, VisitStatus, Project } from '../../types';
import { useData } from '../../contexts/DataContext';
import { ScheduleVisitModal } from './ScheduleVisitModal';
import { VisitDetailModal } from './VisitDetailModal';
import { VisitStatusBadge } from '../../components/ui/VisitStatusBadge';
import { ChevronLeftIcon, ChevronRightIcon, CalendarPlusIcon, PlusIcon, ClockIcon, EditIcon, UserGroupIcon } from '../../components/icons';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';

interface CalendarDayWithVisits {
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    visits: Visit[];
}

const isSameDate = (date1: Date, date2: Date): boolean => 
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();

const getDaysArrayForMonthWithVisits = (dateInMonth: Date, allVisits: Visit[]): CalendarDayWithVisits[] => {
    const year = dateInMonth.getFullYear();
    const month = dateInMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    const daysInMonth = lastDayOfMonth.getDate();
    const startDayOfWeekMondayFirst = (firstDayOfMonth.getDay() + 6) % 7; 

    const daysArray: CalendarDayWithVisits[] = [];

    const prevMonthLastDay = new Date(year, month, 0);
    for (let i = 0; i < startDayOfWeekMondayFirst; i++) {
        const day = new Date(year, month -1 , prevMonthLastDay.getDate() - startDayOfWeekMondayFirst + 1 + i);
        daysArray.push({
            date: day,
            isCurrentMonth: false,
            isToday: isSameDate(day, new Date()),
            visits: allVisits.filter(v => v.date === day.toISOString().split('T')[0]).sort((a,b) => a.startTime.localeCompare(b.startTime)),
        });
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const day = new Date(year, month, i);
         daysArray.push({
            date: day,
            isCurrentMonth: true,
            isToday: isSameDate(day, new Date()),
            visits: allVisits.filter(v => v.date === day.toISOString().split('T')[0]).sort((a,b) => a.startTime.localeCompare(b.startTime)),
        });
    }
    
    const totalCellsInGrid = 42; 
    const remainingCells = totalCellsInGrid - daysArray.length;

    for (let i = 1; i <= remainingCells; i++) {
        const day = new Date(year, month + 1, i);
        daysArray.push({
            date: day,
            isCurrentMonth: false,
            isToday: isSameDate(day, new Date()),
            visits: allVisits.filter(v => v.date === day.toISOString().split('T')[0]).sort((a,b) => a.startTime.localeCompare(b.startTime)),
        });
    }
    return daysArray;
};


export const ProjectCalendarPage: React.FC = () => {
    const { visits, getProjectById, getEmployeeById } = useData();
    const [currentDisplayDate, setCurrentDisplayDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    
    const [selectedVisitForDetail, setSelectedVisitForDetail] = useState<Visit | null>(null);
    const [isVisitDetailModalOpen, setIsVisitDetailModalOpen] = useState(false);
    
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [visitToEdit, setVisitToEdit] = useState<Visit | null>(null);
    const [initialDateForNewVisit, setInitialDateForNewVisit] = useState<Date | null>(null);

    const calendarDays = useMemo(() => getDaysArrayForMonthWithVisits(currentDisplayDate, visits), [currentDisplayDate, visits]);
    const daysOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    
    const visitsForSelectedDay = useMemo(() => {
        return visits.filter(v => v.date === selectedDate.toISOString().split('T')[0]).sort((a,b) => a.startTime.localeCompare(b.startTime));
    }, [visits, selectedDate]);

    const prevMonth = () => setCurrentDisplayDate(new Date(currentDisplayDate.getFullYear(), currentDisplayDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDisplayDate(new Date(currentDisplayDate.getFullYear(), currentDisplayDate.getMonth() + 1, 1));
    const goToToday = () => {
        const today = new Date();
        setCurrentDisplayDate(today);
        setSelectedDate(today);
    };

    const openScheduleModal = (visit?: Visit, date?: Date) => {
        setVisitToEdit(visit || null);
        setInitialDateForNewVisit(date || null);
        setIsScheduleModalOpen(true);
    };
    
    const openDetailModal = (visit: Visit) => {
        setSelectedVisitForDetail(visit);
        setIsVisitDetailModalOpen(true);
    };

    const handleDayClick = (date: Date) => {
        setSelectedDate(date);
    };

    const formatTime = (timeString: string) => {
        const [hours, minutes] = timeString.split(':');
        const date = new Date();
        date.setHours(parseInt(hours), parseInt(minutes));
        return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });
    };
    
    const getStatusColorIndicator = (status: VisitStatus): string => {
        switch(status) {
            case VisitStatus.PROGRAMADO: return 'bg-teal-500';
            case VisitStatus.COMPLETADO: return 'bg-green-500';
            case VisitStatus.CANCELADO: return 'bg-red-500';
            case VisitStatus.REAGENDADO: return 'bg-amber-500';
            default: return 'bg-gray-400';
        }
    };


    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)]"> {/* Adjusted height for better fit */}
            {/* Calendar View */}
            <div className="flex-grow bg-white dark:bg-neutral-800 p-4 sm:p-6 rounded-lg shadow-lg flex flex-col overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
                    <div className="flex items-center gap-1 sm:gap-2">
                        <button onClick={prevMonth} className={BUTTON_SECONDARY_SM_CLASSES} aria-label="Mes anterior"><ChevronLeftIcon /></button>
                        <h2 className="text-lg sm:text-xl font-semibold text-neutral-700 dark:text-neutral-200 w-40 sm:w-48 text-center">
                            {currentDisplayDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                        </h2>
                        <button onClick={nextMonth} className={BUTTON_SECONDARY_SM_CLASSES} aria-label="Mes siguiente"><ChevronRightIcon /></button>
                        <button onClick={goToToday} className={`${BUTTON_SECONDARY_SM_CLASSES} ml-1 sm:ml-2`} aria-label="Hoy">Hoy</button>
                    </div>
                    <button onClick={() => openScheduleModal(undefined, selectedDate)} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center self-start sm:self-center`}>
                        <CalendarPlusIcon /> Programar Visita
                    </button>
                </div>

                <div className="grid grid-cols-7 gap-px bg-neutral-200 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 flex-grow overflow-hidden">
                    {daysOfWeek.map(day => (
                        <div key={day} className="py-1.5 sm:py-2 text-center text-xs font-medium text-neutral-500 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-700/50">
                            {day.substring(0,3)} {/* Shorten day name for smaller screens */}
                        </div>
                    ))}
                    {calendarDays.map((dayObj, index) => (
                        <div 
                            key={index} 
                            className={`p-1 sm:p-1.5 relative flex flex-col min-h-[70px] sm:min-h-[90px] group cursor-pointer transition-colors duration-150
                                ${dayObj.isCurrentMonth ? 'bg-white dark:bg-neutral-800' : 'bg-neutral-100 dark:bg-neutral-800/50 text-neutral-400 dark:text-neutral-500'}
                                ${isSameDate(dayObj.date, selectedDate) ? 'ring-2 ring-primary dark:ring-primary shadow-md' : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/50'}
                            `}
                            onClick={() => handleDayClick(dayObj.date)}
                            role="gridcell"
                            aria-label={`Fecha ${dayObj.date.toLocaleDateString()}${dayObj.visits.length ? `, ${dayObj.visits.length} visitas` : ''}`}
                            aria-selected={isSameDate(dayObj.date, selectedDate)}
                        >
                            <time dateTime={dayObj.date.toISOString().split('T')[0]} className={`text-xs font-semibold mb-0.5 ${dayObj.isToday ? 'bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center' : ''}`}>
                                {dayObj.date.getDate()}
                            </time>
                            <div className="mt-0.5 space-y-0.5 overflow-y-auto flex-grow max-h-[calc(100%-20px)] pr-0.5 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-600 scrollbar-track-transparent">
                                {dayObj.visits.slice(0,2).map(visit => (
                                     <button 
                                        key={visit.id}
                                        onClick={(e) => { e.stopPropagation(); openDetailModal(visit);}}
                                        className="block w-full p-0.5 text-left text-[9px] sm:text-[10px] rounded shadow-sm truncate group relative"
                                        aria-label={`Ver detalles de ${visit.title}`}
                                        title={`${formatTime(visit.startTime)} - ${visit.title}`}
                                    >
                                        <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${getStatusColorIndicator(visit.status)}`}></span>
                                        {visit.title}
                                    </button>
                                ))}
                                {dayObj.visits.length > 2 && (
                                     <div className="text-center text-[9px] sm:text-[10px] text-neutral-500 dark:text-neutral-400 cursor-pointer" onClick={(e) => {e.stopPropagation(); handleDayClick(dayObj.date); }}>+{dayObj.visits.length-2} más</div>
                                )}
                            </div>
                             {dayObj.isCurrentMonth && 
                                <button 
                                    onClick={(e) => {e.stopPropagation(); openScheduleModal(undefined, dayObj.date)}} 
                                    className="absolute bottom-0.5 right-0.5 p-0.5 rounded-full bg-primary/80 text-white opacity-0 group-hover:opacity-100 hover:bg-primary transition-all text-xs"
                                    aria-label={`Programar visita para ${dayObj.date.toLocaleDateString()}`}
                                    title="Programar nueva visita"
                                >
                                    <PlusIcon className="w-3 h-3"/>
                                </button>
                            }
                        </div>
                    ))}
                </div>
            </div>

            {/* Selected Day's Visits Panel */}
            <div className="w-full lg:w-96 bg-white dark:bg-neutral-800 p-4 sm:p-6 rounded-lg shadow-lg flex-shrink-0 overflow-y-auto h-full scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-600 scrollbar-track-transparent">
                <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-200 mb-4">
                    Visitas del {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                {visitsForSelectedDay.length > 0 ? (
                    <ul className="space-y-3">
                        {visitsForSelectedDay.map(visit => {
                            const project = visit.projectId ? getProjectById(visit.projectId) : null;
                            const assignedEmployees = visit.assignedEmployeeIds.map(id => getEmployeeById(id)).filter(Boolean) as Employee[];
                            return (
                                <li key={visit.id} className="p-3 rounded-md border border-neutral-200 dark:border-neutral-700 hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-semibold text-primary text-sm">{visit.title}</h4>
                                        <VisitStatusBadge status={visit.status} />
                                    </div>
                                    <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-0.5">
                                        <ClockIcon className="inline w-3 h-3 mr-0.5" /> {formatTime(visit.startTime)} - {formatTime(visit.endTime)}
                                    </p>
                                    {project && <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">Proyecto: {project.name}</p>}
                                    {assignedEmployees.length > 0 && (
                                        <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5 flex items-center">
                                            <UserGroupIcon className="inline w-3 h-3 mr-1" /> {assignedEmployees.map(e => e.name).join(', ')}
                                        </div>
                                    )}
                                    <div className="mt-2 flex justify-end space-x-2">
                                        <button onClick={() => openScheduleModal(visit, selectedDate)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs p-0.5" aria-label="Editar visita"><EditIcon className="w-4 h-4"/></button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-4">No hay visitas programadas para este día.</p>
                )}
                 <button 
                    onClick={() => openScheduleModal(undefined, selectedDate)} 
                    className={`${BUTTON_PRIMARY_SM_CLASSES} w-full mt-4 flex items-center justify-center`}
                 >
                    <PlusIcon /> Agregar Visita para este Día
                </button>
            </div>
            <ScheduleVisitModal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} visitToEdit={visitToEdit} initialDate={initialDateForNewVisit} />
            <VisitDetailModal isOpen={isVisitDetailModalOpen} onClose={() => setIsVisitDetailModalOpen(false)} visit={selectedVisitForDetail} />
        </div>
    );
};
