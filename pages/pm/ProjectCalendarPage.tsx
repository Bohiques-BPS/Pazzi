
import React, { useState, useMemo } from 'react';
import { Visit, Employee, VisitStatus } from '../../types'; // Adjusted path
import { useData } from '../../contexts/DataContext'; // Adjusted path
import { ScheduleVisitModal } from './ScheduleVisitModal'; // Adjusted path
import { VisitDetailModal } from './VisitDetailModal'; // Adjusted path
import { VisitStatusBadge } from '../../components/ui/VisitStatusBadge'; // Adjusted path
import { ChevronLeftIcon, ChevronRightIcon, CalendarPlusIcon, PlusIcon, ClockIcon, EditIcon } from '../../components/icons'; // Adjusted path
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants'; // Adjusted path

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
    const { visits, getUpcomingVisits, getProjectById, getEmployeeById } = useData();
    const [currentDisplayDate, setCurrentDisplayDate] = useState(new Date());
    
    const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
    const [isVisitDetailModalOpen, setIsVisitDetailModalOpen] = useState(false);
    
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [visitToEdit, setVisitToEdit] = useState<Visit | null>(null);
    const [initialDateForNewVisit, setInitialDateForNewVisit] = useState<Date | null>(null);

    const calendarDays = useMemo(() => getDaysArrayForMonthWithVisits(currentDisplayDate, visits), [currentDisplayDate, visits]);
    const daysOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    const upcomingVisits = useMemo(() => getUpcomingVisits(5), [getUpcomingVisits]);

    const prevMonth = () => setCurrentDisplayDate(new Date(currentDisplayDate.getFullYear(), currentDisplayDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDisplayDate(new Date(currentDisplayDate.getFullYear(), currentDisplayDate.getMonth() + 1, 1));
    const goToToday = () => setCurrentDisplayDate(new Date());

    const openScheduleModal = (visit?: Visit, date?: Date) => {
        setVisitToEdit(visit || null);
        setInitialDateForNewVisit(date || null);
        setIsScheduleModalOpen(true);
    };
    
    const openDetailModal = (visit: Visit) => {
        setSelectedVisit(visit);
        setIsVisitDetailModalOpen(true);
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-120px)]">
            <div className="flex-grow bg-white dark:bg-neutral-800 p-4 sm:p-6 rounded-lg shadow-lg flex flex-col overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
                    <div className="flex items-center gap-2">
                        <button onClick={prevMonth} className={BUTTON_SECONDARY_SM_CLASSES} aria-label="Mes anterior"><ChevronLeftIcon /></button>
                        <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-200 w-48 text-center">
                            {currentDisplayDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                        </h2>
                        <button onClick={nextMonth} className={BUTTON_SECONDARY_SM_CLASSES} aria-label="Mes siguiente"><ChevronRightIcon /></button>
                        <button onClick={goToToday} className={BUTTON_SECONDARY_SM_CLASSES} aria-label="Hoy">Hoy</button>
                    </div>
                    <button onClick={() => openScheduleModal(undefined, new Date())} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center`}><CalendarPlusIcon /> Programar Visita</button>
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
                            onClick={() => !dayObj.visits.length && dayObj.isCurrentMonth ? openScheduleModal(undefined, dayObj.date) : null}
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
                                     <div className="text-center text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 cursor-pointer" onClick={(e) => {e.stopPropagation(); }}>+{dayObj.visits.length-2} más</div>
                                )}
                            </div>
                             {dayObj.isCurrentMonth && 
                                <button 
                                    onClick={(e) => {e.stopPropagation(); openScheduleModal(undefined, dayObj.date)}} 
                                    className="absolute bottom-1 right-1 p-0.5 rounded-full bg-primary text-white opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                                    aria-label={`Programar visita para ${dayObj.date.toLocaleDateString()}`}
                                >
                                    <PlusIcon/>
                                </button>
                            }
                        </div>
                    ))}
                </div>
            </div>

            <div className="w-full lg:w-80 bg-white dark:bg-neutral-800 p-4 sm:p-6 rounded-lg shadow-lg flex-shrink-0 overflow-y-auto h-full scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-600 scrollbar-track-transparent">
                <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-200 mb-4">Próximas Visitas</h3>
                {upcomingVisits.length > 0 ? (
                    <ul className="space-y-3">
                        {upcomingVisits.map(visit => {
                            const project = visit.projectId ? getProjectById(visit.projectId) : null;
                            const assignedEmployees = visit.assignedEmployeeIds.map(id => getEmployeeById(id)).filter(Boolean) as Employee[];
                            return (
                                <li key={visit.id} className="p-3 rounded-md border border-neutral-200 dark:border-neutral-700 hover:shadow-md transition-shadow">
                                    <button onClick={() => openDetailModal(visit)} className="w-full text-left focus:outline-none">
                                        <h4 className="font-semibold text-primary text-sm">{visit.title}</h4>
                                        <p className="text-xs text-neutral-600 dark:text-neutral-300">
                                            {new Date(visit.date + 'T00:00:00').toLocaleDateString('es-ES', {day: '2-digit', month: 'short'})} de {visit.startTime} a {visit.endTime}
                                        </p>
                                        {project && <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">Proyecto: {project.name}</p>}
                                        {assignedEmployees.length > 0 && <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">Con: {assignedEmployees.map(e => e.name).join(', ')}</p>}
                                        <div className="mt-1"><VisitStatusBadge status={visit.status} /></div>
                                    </button>
                                    <div className="mt-2 flex justify-end space-x-2">
                                        <button onClick={() => openScheduleModal(visit)} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-xs p-0.5" aria-label="Editar visita"><EditIcon/></button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">No hay visitas programadas próximamente.</p>
                )}
            </div>
            <ScheduleVisitModal isOpen={isScheduleModalOpen} onClose={() => setIsScheduleModalOpen(false)} visitToEdit={visitToEdit} initialDate={initialDateForNewVisit} />
            <VisitDetailModal isOpen={isVisitDetailModalOpen} onClose={() => setIsVisitDetailModalOpen(false)} visit={selectedVisit} />
        </div>
    );
};
