
import React, { useState, useMemo } from 'react';
import { Visit, VisitStatus, UserRole } from '../../types'; 
import { useData } from '../../contexts/DataContext'; 
import { useAuth } from '../../contexts/AuthContext';
import { VisitDetailModal } from '../pm/VisitDetailModal'; 
import { VisitStatusBadge } from '../../components/ui/VisitStatusBadge'; 
import { ChevronLeftIcon, ChevronRightIcon, ClockIcon } from '../../components/icons'; 
import { BUTTON_SECONDARY_SM_CLASSES } from '../../constants'; 

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

const getDaysArrayForMonthWithVisits = (dateInMonth: Date, allVisits: Visit[], clientProjectsIds: string[]): CalendarDayWithVisits[] => {
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
            visits: allVisits.filter(v => v.projectId && clientProjectsIds.includes(v.projectId) && v.date === day.toISOString().split('T')[0]).sort((a,b) => a.startTime.localeCompare(b.startTime)),
        });
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const day = new Date(year, month, i);
         daysArray.push({
            date: day,
            isCurrentMonth: true,
            isToday: isSameDate(day, new Date()),
            visits: allVisits.filter(v => v.projectId && clientProjectsIds.includes(v.projectId) && v.date === day.toISOString().split('T')[0]).sort((a,b) => a.startTime.localeCompare(b.startTime)),
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
            visits: allVisits.filter(v => v.projectId && clientProjectsIds.includes(v.projectId) && v.date === day.toISOString().split('T')[0]).sort((a,b) => a.startTime.localeCompare(b.startTime)),
        });
    }
    return daysArray;
};


export const ProjectClientCalendarPage: React.FC = () => {
    const { currentUser } = useAuth();
    const { visits: allVisits, projects: allProjects, getProjectById, getEmployeeById } = useData();
    const [currentDisplayDate, setCurrentDisplayDate] = useState(new Date());
    
    const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
    const [isVisitDetailModalOpen, setIsVisitDetailModalOpen] = useState(false);
    
    const clientProjectIds = useMemo(() => {
        if (!currentUser || currentUser.role !== UserRole.CLIENT_PROJECT) return [];
        return allProjects.filter(p => p.clientId === currentUser.id).map(p => p.id);
    }, [allProjects, currentUser]);

    const calendarDays = useMemo(() => getDaysArrayForMonthWithVisits(currentDisplayDate, allVisits, clientProjectIds), [currentDisplayDate, allVisits, clientProjectIds]);
    const daysOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

    const prevMonth = () => setCurrentDisplayDate(new Date(currentDisplayDate.getFullYear(), currentDisplayDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDisplayDate(new Date(currentDisplayDate.getFullYear(), currentDisplayDate.getMonth() + 1, 1));
    const goToToday = () => setCurrentDisplayDate(new Date());
    
    const openDetailModal = (visit: Visit) => {
        setSelectedVisit(visit);
        setIsVisitDetailModalOpen(true);
    };

    if (!currentUser || currentUser.role !== UserRole.CLIENT_PROJECT) {
        return <p className="p-6 text-center">Acceso denegado. Este calendario es solo para clientes de proyecto.</p>;
    }

    return (
        <div className="p-4 sm:p-6">
            <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200 mb-6">Mi Calendario de Visitas de Proyecto</h1>
            <div className="bg-white dark:bg-neutral-800 p-4 sm:p-6 rounded-lg shadow-lg flex flex-col overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
                    <div className="flex items-center gap-2">
                        <button onClick={prevMonth} className={BUTTON_SECONDARY_SM_CLASSES} aria-label="Mes anterior"><ChevronLeftIcon /></button>
                        <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-200 w-48 text-center">
                            {currentDisplayDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                        </h2>
                        <button onClick={nextMonth} className={BUTTON_SECONDARY_SM_CLASSES} aria-label="Mes siguiente"><ChevronRightIcon /></button>
                        <button onClick={goToToday} className={BUTTON_SECONDARY_SM_CLASSES} aria-label="Hoy">Hoy</button>
                    </div>
                    {/* No schedule button for clients */}
                </div>

                <div className="grid grid-cols-7 gap-px bg-neutral-200 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 flex-grow overflow-hidden">
                    {daysOfWeek.map(day => (
                        <div key={day} className="py-2 text-center text-xs font-medium text-neutral-500 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-700/50">
                            {day}
                        </div>
                    ))}
                    {calendarDays.map((dayObj, index) => (
                        <div 
                            key={index} 
                            className={`p-1.5 sm:p-2 relative flex flex-col min-h-[80px] sm:min-h-[100px] group ${dayObj.isCurrentMonth ? 'bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700/50' : 'bg-neutral-100 dark:bg-neutral-800/50 text-neutral-400 dark:text-neutral-500'}`}
                            role="gridcell"
                            aria-label={`Fecha ${dayObj.date.toLocaleDateString()}${dayObj.visits.length ? `, ${dayObj.visits.length} visitas` : ''}`}
                        >
                            <time dateTime={dayObj.date.toISOString().split('T')[0]} className={`text-xs font-semibold ${dayObj.isToday ? 'bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center' : ''}`}>
                                {dayObj.date.getDate()}
                            </time>
                            <div className="mt-1 space-y-1 overflow-y-auto flex-grow max-h-[calc(100%-20px)] pr-1 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-600 scrollbar-track-transparent">
                                {dayObj.visits.slice(0,2).map(visit => (
                                    <button 
                                        key={visit.id}
                                        onClick={(e) => { e.stopPropagation(); openDetailModal(visit);}}
                                        className={`block w-full p-1 text-left text-[10px] sm:text-xs rounded shadow-sm truncate ${
                                            visit.status === VisitStatus.PROGRAMADO ? 'bg-teal-500/80 hover:bg-teal-600 text-white' :
                                            visit.status === VisitStatus.COMPLETADO ? 'bg-green-500/80 hover:bg-green-600 text-white' :
                                            visit.status === VisitStatus.CANCELADO ? 'bg-red-400/80 hover:bg-red-500 text-white' :
                                            'bg-amber-400/80 hover:bg-amber-500 text-black' 
                                        }`}
                                        aria-label={`Ver detalles de ${visit.title}`}
                                    >
                                        <ClockIcon/> {visit.startTime} {visit.title}
                                    </button>
                                ))}
                                {dayObj.visits.length > 2 && (
                                     <div className="text-center text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 cursor-pointer" onClick={(e) => {e.stopPropagation(); /* Potentially show all visits for day here */ }}>+{dayObj.visits.length-2} más</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <VisitDetailModal isOpen={isVisitDetailModalOpen} onClose={() => setIsVisitDetailModalOpen(false)} visit={selectedVisit} />
        </div>
    );
};
