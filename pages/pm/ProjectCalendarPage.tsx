
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Visit, ProjectStatus, Client, Employee, VisitStatus } from '../../types'; // Updated imports
import { useData } from '../../contexts/DataContext';
import { ScheduleVisitModal } from './ScheduleVisitModal'; // To edit/view visits
import { VisitDetailModal } from './VisitDetailModal'; // To show visit details
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon as CreateVisitIcon } from '../../components/icons';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { VisitStatusBadge } from '../../components/ui/VisitStatusBadge';


const getWeekDays = (current: Date): Date[] => {
    if (!(current instanceof Date) || isNaN(current.getTime())) {
        const today = new Date();
        const startOfFallbackWeek = new Date(today.setDate(today.getDate() - today.getDay()));
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(startOfFallbackWeek);
            d.setDate(startOfFallbackWeek.getDate() + i);
            return d;
        });
    }
    const startOfWeek = new Date(current);
    const dayOfWeek = current.getDay(); 
    startOfWeek.setDate(current.getDate() - dayOfWeek); 
    
    const weekDays: Date[] = [];
    for (let i = 0; i < 7; i++) {
        const day = new Date(startOfWeek);
        day.setDate(startOfWeek.getDate() + i);
        weekDays.push(day);
    }
    return weekDays;
};

const isSameDate = (date1?: Date, date2?: Date): boolean => {
    if (!date1 || !date2 || !(date1 instanceof Date) || !(date2 instanceof Date) || isNaN(date1.getTime()) || isNaN(date2.getTime())) {
        return false;
    }
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

const hoursToDisplay = Array.from({ length: 13 }, (_, i) => i + 8); // 8 AM to 8 PM (13 hours)

// Helper to parse HH:MM string to a number (e.g., 9.5 for 9:30)
const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours + (minutes / 60);
};

export const ProjectCalendarPage: React.FC = () => {
    const { visits, getProjectById, getEmployeeById } = useData(); // Fetch visits
    const [currentDate, setCurrentDate] = useState(() => new Date()); 
    const [selectedDate, setSelectedDate] = useState(() => new Date());
    
    const [isScheduleVisitModalOpen, setIsScheduleVisitModalOpen] = useState(false);
    const [visitToEdit, setVisitToEdit] = useState<Visit | null>(null);
    const [isVisitDetailModalOpen, setIsVisitDetailModalOpen] = useState(false);
    const [visitToView, setVisitToView] = useState<Visit | null>(null);
    const [initialDateForNewVisit, setInitialDateForNewVisit] = useState<Date | null>(null);


    const [currentTimePosition, setCurrentTimePosition] = useState(0);

    const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
    const daysOfWeekNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

    useEffect(() => {
        if (!(currentDate instanceof Date) || isNaN(currentDate.getTime())) {
            setCurrentDate(new Date());
        }
        if (!(selectedDate instanceof Date) || isNaN(selectedDate.getTime())) {
            setSelectedDate(new Date());
        }
    }, [currentDate, selectedDate]);


    const updateCurrentTimePosition = useCallback(() => {
        const now = new Date();
        const startHour = 8; 
        const endHour = 20; 
        const totalHoursDisplayed = endHour - startHour;

        if (now.getHours() >= startHour && now.getHours() < endHour) {
            const minutesPastStartHour = (now.getHours() - startHour) * 60 + now.getMinutes();
            const totalMinutesDisplayed = totalHoursDisplayed * 60;
            const position = (minutesPastStartHour / totalMinutesDisplayed) * 100;
            setCurrentTimePosition(position);
        } else {
            setCurrentTimePosition(-1); 
        }
    }, []);

    useEffect(() => {
        updateCurrentTimePosition();
        const timer = setInterval(updateCurrentTimePosition, 60000); 
        return () => clearInterval(timer);
    }, [updateCurrentTimePosition]);


    const visitsForSelectedDay = useMemo(() => {
        if (!(selectedDate instanceof Date) || isNaN(selectedDate.getTime())) return [];
        const selectedDateStr = selectedDate.toISOString().split('T')[0];
        return visits.filter(v => v.date === selectedDateStr)
                     .sort((a,b) => a.startTime.localeCompare(b.startTime));
    }, [visits, selectedDate]);

    const prevWeek = () => setCurrentDate(prev => new Date(new Date(prev).setDate(prev.getDate() - 7)));
    const nextWeek = () => setCurrentDate(prev => new Date(new Date(prev).setDate(prev.getDate() + 7)));
    const goToToday = () => {
        const today = new Date();
        setCurrentDate(today);
        setSelectedDate(today);
    };

    const openScheduleVisitModal = (visit?: Visit, date?: Date) => {
        setVisitToEdit(visit || null);
        setInitialDateForNewVisit(date || null);
        setIsScheduleVisitModalOpen(true);
    };
    
    const openVisitDetailModal = (visit: Visit) => {
        setVisitToView(visit);
        setIsVisitDetailModalOpen(true);
    }

    const handleDayHeaderClick = (day: Date | undefined) => {
      if (day instanceof Date && !isNaN(day.getTime())) {
        setSelectedDate(day);
      }
    };
    
    const getStatusColorClass = (status: VisitStatus): string => {
        switch(status) {
            case VisitStatus.PROGRAMADO: return 'bg-teal-500 hover:bg-teal-600 border-teal-600';
            case VisitStatus.COMPLETADO: return 'bg-green-500 hover:bg-green-600 border-green-600';
            case VisitStatus.REAGENDADO: return 'bg-yellow-500 hover:bg-yellow-600 border-yellow-600';
            case VisitStatus.CANCELADO: return 'bg-red-500 hover:bg-red-600 border-red-600';
            default: return 'bg-gray-400 hover:bg-gray-500 border-gray-500';
        }
    };

    const isValidDate = (d: any): d is Date => d instanceof Date && !isNaN(d.getTime());

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-100px)] text-sm">
            <div className="flex-grow bg-white dark:bg-neutral-800 p-3 sm:p-4 rounded-lg shadow-lg flex flex-col overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-3 gap-2">
                    <div className="flex items-center gap-1 sm:gap-2">
                        <button onClick={goToToday} className={`${BUTTON_SECONDARY_SM_CLASSES} ml-1 sm:ml-2`} aria-label="Hoy">Hoy</button>
                        <button onClick={prevWeek} className={BUTTON_SECONDARY_SM_CLASSES} aria-label="Semana anterior"><ChevronLeftIcon /></button>
                        <button onClick={nextWeek} className={BUTTON_SECONDARY_SM_CLASSES} aria-label="Semana siguiente"><ChevronRightIcon /></button>
                        <h2 className="text-base sm:text-lg font-semibold text-neutral-700 dark:text-neutral-200 ml-2">
                            {isValidDate(currentDate) ? currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' }) : "Fecha inválida"}
                        </h2>
                    </div>
                     <button onClick={() => openScheduleVisitModal(undefined, selectedDate)} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center self-start sm:self-center text-xs`}>
                        <CreateVisitIcon className="w-4 h-4" /> Programar Visita
                    </button>
                </div>

                <div className="flex-grow grid grid-cols-[auto_repeat(7,minmax(0,1fr))] overflow-auto pos-reports-scrollbar">
                    <div className="col-start-1 row-start-1 sticky left-0 bg-white dark:bg-neutral-800 z-10">
                        <div className="h-10 sm:h-12 border-b border-r border-neutral-200 dark:border-neutral-700"></div> {/* Corner cell */}
                        {/* Removed All-day slot label */}
                        {hoursToDisplay.map(hour => (
                            <div key={hour} className="h-12 text-right pr-1 text-[10px] text-neutral-500 dark:text-neutral-400 border-r border-neutral-200 dark:border-neutral-700 pt-0.5">
                                {hour === 12 ? '12 PM' : hour > 12 ? `${hour-12} PM` : `${hour} AM`}
                            </div>
                        ))}
                    </div>

                    {weekDays.map((day, dayIndex) => {
                        if (!isValidDate(day)) {
                            return <div key={`invalid-day-${dayIndex}`} className="border border-red-500 bg-red-100 p-1">Día Inválido</div>;
                        }
                        const today = new Date();
                        const isTodayDate = isSameDate(day, today);
                        const dayStr = day.toISOString().split('T')[0];
                        const visitsForDay = visits.filter(v => v.date === dayStr).sort((a,b) => a.startTime.localeCompare(b.startTime));

                        return (
                            <div key={dayIndex} className={`col-start-${dayIndex + 2} row-start-1 row-span-full border-l border-neutral-200 dark:border-neutral-700 relative`}>
                                <div 
                                    className="h-10 sm:h-12 border-b border-neutral-200 dark:border-neutral-700 sticky top-0 bg-white dark:bg-neutral-800 z-10 cursor-pointer"
                                    onClick={() => handleDayHeaderClick(day)}
                                >
                                    <div className="text-center py-1 sm:py-1.5">
                                        <div className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400">{isValidDate(day) ? daysOfWeekNames[day.getDay()] : '---'}</div>
                                        <div className={`text-lg sm:text-xl font-medium ${isTodayDate ? 'text-white bg-primary rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center mx-auto' : 'text-neutral-700 dark:text-neutral-200'}`}>
                                            {isValidDate(day) ? day.toLocaleDateString('es-ES', { day: 'numeric' }) : '-'}
                                        </div>
                                    </div>
                                </div>
                                {/* Removed All-day Events Area as Visits are timed */}
                                <div className="relative h-[calc(13*3rem)]"> {/* 13 hours * 3rem/hour (12px * 4 = 48px = 3rem) */}
                                     {visitsForDay.map(visit => {
                                        const visitStartHour = parseTime(visit.startTime);
                                        const visitEndHour = parseTime(visit.endTime);
                                        
                                        const topPosition = ((visitStartHour - 8) / 13) * 100; 
                                        const height = Math.max(0.5, ((visitEndHour - visitStartHour) / 13) * 100); // Min height to be visible

                                        if (visitStartHour >= 8 && visitEndHour <= 20 && height > 0) { // Only render if within displayable hours
                                            return (
                                                <div 
                                                    key={visit.id} 
                                                    onClick={() => openVisitDetailModal(visit)}
                                                    className={`absolute w-[calc(100%-4px)] left-[2px] text-white text-[10px] p-1 rounded shadow overflow-hidden cursor-pointer ${getStatusColorClass(visit.status)}`}
                                                    style={{ top: `${topPosition}%`, height: `${height}%` }}
                                                    title={`${visit.title} (${visit.startTime} - ${visit.endTime})`}
                                                >
                                                    <p className="font-semibold truncate">{visit.title}</p>
                                                    {visit.projectId && <p className="text-[9px] opacity-80 truncate">{getProjectById(visit.projectId)?.name}</p>}
                                                </div>
                                            );
                                        }
                                        return null;
                                    })}
                                    {isTodayDate && currentTimePosition >= 0 && (
                                        <div 
                                            className="absolute w-full h-0.5 bg-red-500 z-20"
                                            style={{ top: `${currentTimePosition}%` }}
                                        >
                                            <div className="absolute -left-1.5 -top-1 w-3 h-3 bg-red-500 rounded-full"></div>
                                        </div>
                                    )}
                                    {hoursToDisplay.slice(0).map(hour => ( // Draw lines for all hours starting from 8
                                        <div key={`line-${hour}`} className="absolute w-full h-px bg-neutral-200 dark:bg-neutral-700/50" style={{ top: `${((hour - 8) / 13) * 100}%` }}></div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="w-full lg:w-80 bg-white dark:bg-neutral-800 p-3 sm:p-4 rounded-lg shadow-lg flex-shrink-0 overflow-y-auto h-full pos-reports-scrollbar">
                <h3 className="text-base sm:text-lg font-semibold text-neutral-700 dark:text-neutral-200 mb-3">
                    Visitas para el {isValidDate(selectedDate) ? selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : "Fecha inválida"}
                </h3>
                {visitsForSelectedDay.length > 0 ? (
                    <ul className="space-y-2">
                        {visitsForSelectedDay.map(visit => {
                            const project = visit.projectId ? getProjectById(visit.projectId) : null;
                            const assignedEmployeeNames = visit.assignedEmployeeIds.map(id => getEmployeeById(id)?.name).filter(Boolean).join(', ');
                            return (
                                <li key={visit.id} className="p-2 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/50">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-semibold text-primary text-xs sm:text-sm">{visit.title}</h4>
                                        <VisitStatusBadge status={visit.status} />
                                    </div>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                        {visit.startTime} - {visit.endTime}
                                    </p>
                                    {project && <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">Proyecto: {project.name}</p>}
                                    {assignedEmployeeNames && <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">Con: {assignedEmployeeNames}</p>}
                                     <div className="mt-1 flex space-x-2">
                                        <button 
                                            onClick={() => openVisitDetailModal(visit)} 
                                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                        >
                                            Ver Detalles
                                        </button>
                                        <button 
                                            onClick={() => openScheduleVisitModal(visit)} 
                                            className="text-xs text-orange-500 dark:text-orange-400 hover:underline"
                                        >
                                            Editar
                                        </button>
                                     </div>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 text-center py-4">No hay visitas programadas para este día.</p>
                )}
            </div>
            <ScheduleVisitModal 
                isOpen={isScheduleVisitModalOpen} 
                onClose={() => setIsScheduleVisitModalOpen(false)} 
                visitToEdit={visitToEdit} 
                initialDate={initialDateForNewVisit || (selectedDate && isValidDate(selectedDate) ? selectedDate : new Date())}
            />
            <VisitDetailModal 
                isOpen={isVisitDetailModalOpen}
                onClose={() => setIsVisitDetailModalOpen(false)}
                visit={visitToView}
            />
        </div>
    );
};
