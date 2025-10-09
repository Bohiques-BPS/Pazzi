import React, { useState, useMemo, useEffect } from 'react';
import { Project, UserRole, ProjectStatus, Visit, VisitStatus } from '../../types'; 
import { useData } from '../../contexts/DataContext'; 
import { useAuth } from '../../contexts/AuthContext';
import { ChevronLeftIcon, ChevronRightIcon, BriefcaseIcon, CalendarDaysIcon } from '../../components/icons'; 
import { BUTTON_SECONDARY_SM_CLASSES } from '../../constants'; 
import { VisitStatusBadge } from '../../components/ui/VisitStatusBadge';
import { VisitDetailModal } from '../pm/VisitDetailModal'; // Re-use admin's detail modal for viewing

interface CalendarDayWithVisits { 
    date: Date; 
    isCurrentMonth: boolean;
    isToday: boolean;
    visits: Visit[]; 
}

const isValidDate = (d: any): d is Date => d instanceof Date && !isNaN(d.getTime());

const isSameDate = (date1?: Date, date2?: Date): boolean => {
    if (!date1 || !date2 || !isValidDate(date1) || !isValidDate(date2)) {
        return false;
    }
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
}

const getDaysArrayForMonthWithClientVisits = (dateInMonth: Date, allClientVisits: Visit[]): CalendarDayWithVisits[] => {
    if (!isValidDate(dateInMonth)) {
        console.error("getDaysArrayForMonthWithClientVisits received invalid dateInMonth:", dateInMonth);
        dateInMonth = new Date();
    }
    const year = dateInMonth.getFullYear();
    const month = dateInMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    const daysInMonth = lastDayOfMonth.getDate();
    const startDayOfWeekMondayFirst = (firstDayOfMonth.getDay() + 6) % 7; 

    const daysArray: CalendarDayWithVisits[] = [];

    const prevMonthLastDay = new Date(year, month, 0);
    for (let i = 0; i < startDayOfWeekMondayFirst; i++) {
        const day = new Date(year, month - 1, prevMonthLastDay.getDate() - startDayOfWeekMondayFirst + 1 + i);
        if (!isValidDate(day)) continue;
        const dayStr = day.toISOString().split('T')[0];
        daysArray.push({
            date: day,
            isCurrentMonth: false,
            isToday: isSameDate(day, new Date()),
            visits: allClientVisits.filter(v => v.date === dayStr).sort((a,b) => a.startTime.localeCompare(b.startTime)),
        });
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const day = new Date(year, month, i);
        if (!isValidDate(day)) continue;
        const dayStr = day.toISOString().split('T')[0];
         daysArray.push({
            date: day,
            isCurrentMonth: true,
            isToday: isSameDate(day, new Date()),
            visits: allClientVisits.filter(v => v.date === dayStr).sort((a,b) => a.startTime.localeCompare(b.startTime)),
        });
    }
    
    const totalCellsInGrid = 42; 
    const remainingCells = totalCellsInGrid - daysArray.length;

    for (let i = 1; i <= remainingCells; i++) {
        const day = new Date(year, month + 1, i);
        if (!isValidDate(day)) continue;
        const dayStr = day.toISOString().split('T')[0];
        daysArray.push({
            date: day,
            isCurrentMonth: false,
            isToday: isSameDate(day, new Date()),
            visits: allClientVisits.filter(v => v.date === dayStr).sort((a,b) => a.startTime.localeCompare(b.startTime)),
        });
    }
    return daysArray;
};


export const ProjectClientCalendarPage: React.FC = () => {
    const { currentUser } = useAuth();
    const { projects: allProjects, visits: allVisits, getProjectById } = useData(); 
    const [currentDisplayDate, setCurrentDisplayDate] = useState(() => new Date());
    const [selectedDate, setSelectedDate] = useState(() => new Date());
    const [visitToView, setVisitToView] = useState<Visit | null>(null);
    const [isVisitDetailModalOpen, setIsVisitDetailModalOpen] = useState(false);
    
    useEffect(() => {
        if (!isValidDate(currentDisplayDate)) {
            setCurrentDisplayDate(new Date());
        }
        if (!isValidDate(selectedDate)) {
            setSelectedDate(new Date());
        }
    }, [currentDisplayDate, selectedDate]);

    const clientProjects = useMemo(() => {
        if (!currentUser || currentUser.role !== UserRole.CLIENT_PROJECT) return [];
        return allProjects.filter(p => p.clientId === currentUser.id);
    }, [allProjects, currentUser]);

    const clientProjectIds = useMemo(() => clientProjects.map(p => p.id), [clientProjects]);

    const clientVisits = useMemo(() => {
        return allVisits.filter(v => v.projectId && clientProjectIds.includes(v.projectId));
    }, [allVisits, clientProjectIds]);


    const calendarDays = useMemo(() => getDaysArrayForMonthWithClientVisits(currentDisplayDate, clientVisits), [currentDisplayDate, clientVisits]);
    const daysOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

    const visitsForSelectedDay = useMemo(() => {
        if (!isValidDate(selectedDate)) return [];
        const selectedDateStr = selectedDate.toISOString().split('T')[0];
        return clientVisits.filter(v => v.date === selectedDateStr)
                           .sort((a,b) => a.startTime.localeCompare(b.startTime));
    }, [clientVisits, selectedDate]);

    const prevMonth = () => setCurrentDisplayDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDisplayDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    const goToToday = () => {
        const today = new Date();
        setCurrentDisplayDate(today);
        setSelectedDate(today);
    };
    
    const handleDayClick = (date: Date) => {
        if (isValidDate(date)) {
            setSelectedDate(date);
        }
    };

    const openVisitDetailModal = (visit: Visit) => {
        setVisitToView(visit);
        setIsVisitDetailModalOpen(true);
    };

    if (!currentUser || currentUser.role !== UserRole.CLIENT_PROJECT) {
        return <p className="p-6 text-center">Acceso denegado. Este calendario es solo para clientes de proyecto.</p>;
    }

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)]">
            <div className="flex-grow bg-white dark:bg-neutral-800 p-4 sm:p-6 rounded-lg shadow-lg flex flex-col overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
                    <div className="flex items-center gap-2">
                        <button onClick={prevMonth} className={BUTTON_SECONDARY_SM_CLASSES} aria-label="Mes anterior"><ChevronLeftIcon /></button>
                        <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-200 w-48 text-center">
                            {isValidDate(currentDisplayDate) ? currentDisplayDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' }) : "Fecha inválida"}
                        </h2>
                        <button onClick={nextMonth} className={BUTTON_SECONDARY_SM_CLASSES} aria-label="Mes siguiente"><ChevronRightIcon /></button>
                        <button onClick={goToToday} className={BUTTON_SECONDARY_SM_CLASSES} aria-label="Hoy">Hoy</button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-px bg-neutral-200 dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 flex-grow overflow-hidden">
                    {daysOfWeek.map(day => (
                        <div key={day} className="py-2 text-center text-xs font-medium text-neutral-500 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-700/50">
                            {day.substring(0,3)}
                        </div>
                    ))}
                    {calendarDays.map((dayObj, index) => {
                        if (!isValidDate(dayObj.date)) {
                            return <div key={`invalid-day-${index}`} className="p-1.5 sm:p-2 bg-red-100 text-red-700">Error</div>;
                        }
                        return (
                            <div 
                                key={index} 
                                className={`p-1.5 sm:p-2 relative flex flex-col min-h-[80px] sm:min-h-[100px] group cursor-pointer
                                    ${dayObj.isCurrentMonth ? 'bg-white dark:bg-neutral-800' : 'bg-neutral-100 dark:bg-neutral-800/50 text-neutral-400 dark:text-neutral-500'}
                                    ${isSameDate(dayObj.date, selectedDate) ? 'ring-2 ring-primary dark:ring-primary shadow-md' : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/50'}
                                `}
                                onClick={() => handleDayClick(dayObj.date)}
                                role="gridcell"
                                aria-label={`Fecha ${dayObj.date.toLocaleDateString()}${dayObj.visits.length ? `, ${dayObj.visits.length} visitas` : ''}`}
                                aria-selected={isSameDate(dayObj.date, selectedDate)}
                            >
                                <time dateTime={dayObj.date.toISOString().split('T')[0]} className={`text-xs font-semibold ${dayObj.isToday ? 'bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center' : ''}`}>
                                    {dayObj.date.getDate()}
                                </time>
                                <div className="mt-1 space-y-1 overflow-y-auto flex-grow max-h-[calc(100%-20px)] pr-1 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-600 scrollbar-track-transparent">
                                    {dayObj.visits.slice(0,2).map(visit => (
                                        <div 
                                            key={visit.id}
                                            onClick={(e) => { e.stopPropagation(); openVisitDetailModal(visit); }}
                                            className="block w-full p-0.5 text-left text-[10px] sm:text-xs rounded shadow-sm truncate cursor-pointer bg-teal-100 dark:bg-teal-700/50 text-teal-700 dark:text-teal-200 hover:bg-teal-200 dark:hover:bg-teal-600"
                                            title={`${visit.title} (${visit.startTime}-${visit.endTime})`}
                                        >
                                            <CalendarDaysIcon className="w-2.5 h-2.5 inline mr-1"/>
                                            {visit.title}
                                        </div>
                                    ))}
                                    {dayObj.visits.length > 2 && (
                                         <div className="text-center text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 cursor-pointer" onClick={(e) => {e.stopPropagation(); handleDayClick(dayObj.date); }}>+{dayObj.visits.length-2} más</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="w-full lg:w-96 bg-white dark:bg-neutral-800 p-4 sm:p-6 rounded-lg shadow-lg flex-shrink-0 overflow-y-auto h-full scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-600 scrollbar-track-transparent">
                <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-200 mb-4">
                    Visitas para el {isValidDate(selectedDate) ? selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : "Fecha inválida"}
                </h3>
                {visitsForSelectedDay.length > 0 ? (
                    <ul className="space-y-3">
                        {visitsForSelectedDay.map(visit => {
                             const project = visit.projectId ? getProjectById(visit.projectId) : null;
                            return (
                                <li 
                                    key={visit.id} 
                                    className="p-3 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer"
                                    onClick={() => openVisitDetailModal(visit)}
                                >
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-semibold text-primary text-sm">{visit.title}</h4>
                                        <VisitStatusBadge status={visit.status} />
                                    </div>
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{visit.startTime} - {visit.endTime}</p>
                                    {project && <p className="text-xs text-neutral-600 dark:text-neutral-300 truncate mt-1">Proyecto: {project.name}</p>}
                                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">{visit.notes || "Sin notas adicionales."}</p>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-4">No hay visitas programadas para este día.</p>
                )}
            </div>
            <VisitDetailModal 
                isOpen={isVisitDetailModalOpen}
                onClose={() => setIsVisitDetailModalOpen(false)}
                visit={visitToView}
            />
        </div>
    );
};