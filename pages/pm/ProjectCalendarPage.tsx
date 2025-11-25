
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Visit, Project, ProjectStatus, VisitStatus } from '../../types';
import { useData } from '../../contexts/DataContext';
import { ScheduleVisitModal } from './ScheduleVisitModal';
import { VisitDetailModal } from './VisitDetailModal';
import { ProjectFormModal } from './ProjectFormModal';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon as CreateVisitIcon, BriefcaseIcon } from '../../components/icons';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { VisitStatusBadge } from '../../components/ui/VisitStatusBadge';
import { useTranslation } from '../../contexts/GlobalSettingsContext'; // Import translation

// --- Helper Functions & Types ---

interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    type: 'visit' | 'project';
    originalData: Visit | Project;
    status: VisitStatus | ProjectStatus;
    isAllDay: boolean;
}

const isValidDate = (d: any): d is Date => d instanceof Date && !isNaN(d.getTime());

const isSameDate = (date1?: Date, date2?: Date): boolean => {
    if (!date1 || !date2 || !isValidDate(date1) || !isValidDate(date2)) return false;
    return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth() && date1.getDate() === date2.getDate();
};

const getEventsForRange = (projects: Project[], visits: Visit[]): CalendarEvent[] => {
    const events: CalendarEvent[] = [];
    
    // Process Visits
    visits.forEach(visit => {
        const start = new Date(`${visit.date}T${visit.startTime}`);
        const end = new Date(`${visit.date}T${visit.endTime}`);
        if(isValidDate(start) && isValidDate(end)) {
            events.push({
                id: `visit-${visit.id}`,
                title: visit.title,
                start: start,
                end: end,
                type: 'visit',
                originalData: visit,
                status: visit.status,
                isAllDay: false,
            });
        }
    });

    // Process Projects
    projects.forEach(project => {
        const addProjectEvent = (dateStr: string) => {
            const date = new Date(dateStr + 'T00:00:00');
            if (isValidDate(date) && !events.some(e => e.type === 'project' && e.originalData.id === project.id && isSameDate(e.start, date))) {
                events.push({
                    id: `project-${project.id}-${dateStr}`,
                    title: project.name,
                    start: date,
                    end: new Date(dateStr + 'T23:59:59'), // All-day event
                    type: 'project',
                    originalData: project,
                    status: project.status,
                    isAllDay: true,
                });
            }
        };

        if (project.workMode === 'daysOnly' && project.workDays) {
            project.workDays.forEach(dayStr => addProjectEvent(dayStr));
        } else if (project.workMode === 'daysAndTimes' && project.workDayTimeRanges) {
            // Add one all-day event for each unique date
            const uniqueDates = [...new Set(project.workDayTimeRanges.map(r => r.date))];
            uniqueDates.forEach(dateStr => addProjectEvent(dateStr));
        } else if (project.workMode === 'dateRange' && project.workStartDate && project.workEndDate) {
            let current = new Date(project.workStartDate + 'T00:00:00');
            const end = new Date(project.workEndDate + 'T00:00:00');
            if (isValidDate(current) && isValidDate(end)) {
                while (current <= end) {
                    addProjectEvent(current.toISOString().split('T')[0]);
                    current.setDate(current.getDate() + 1);
                }
            }
        }
    });

    return events;
};


interface CalendarDay {
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    events: CalendarEvent[];
}

const getDaysForMonthView = (dateInMonth: Date, allEvents: CalendarEvent[]): CalendarDay[] => {
    if (!isValidDate(dateInMonth)) dateInMonth = new Date();
    const year = dateInMonth.getFullYear();
    const month = dateInMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 for Sunday
    const daysArray: CalendarDay[] = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek; i > 0; i--) {
        const day = new Date(year, month - 1, prevMonthLastDay - i + 1);
        daysArray.push({ date: day, isCurrentMonth: false, isToday: isSameDate(day, new Date()), events: allEvents.filter(e => isSameDate(e.start, day)).sort((a,b) => a.start.getTime() - b.start.getTime()) });
    }
    for (let i = 1; i <= daysInMonth; i++) {
        const day = new Date(year, month, i);
        daysArray.push({ date: day, isCurrentMonth: true, isToday: isSameDate(day, new Date()), events: allEvents.filter(e => isSameDate(e.start, day)).sort((a,b) => a.start.getTime() - b.start.getTime()) });
    }
    const totalCells = 42;
    const remainingCells = totalCells - daysArray.length;
    for (let i = 1; i <= remainingCells; i++) {
        const day = new Date(year, month + 1, i);
        daysArray.push({ date: day, isCurrentMonth: false, isToday: isSameDate(day, new Date()), events: allEvents.filter(e => isSameDate(e.start, day)).sort((a,b) => a.start.getTime() - b.start.getTime()) });
    }
    return daysArray;
};

const getWeekDays = (current: Date): Date[] => {
    if (!isValidDate(current)) current = new Date();
    const startOfWeek = new Date(current);
    startOfWeek.setDate(current.getDate() - current.getDay());
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(startOfWeek); d.setDate(startOfWeek.getDate() + i); return d; });
};

export const ProjectCalendarPage: React.FC = () => {
    const { t, lang } = useTranslation(); // Use hook
    const locale = lang === 'es' ? 'es-ES' : 'en-US';

    const { visits, projects, setVisits } = useData();
    const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
    const [currentDate, setCurrentDate] = useState(() => new Date());
    const [selectedDate, setSelectedDate] = useState(() => new Date());
    
    // Modals state
    const [isScheduleVisitModalOpen, setIsScheduleVisitModalOpen] = useState(false);
    const [visitToEdit, setVisitToEdit] = useState<Visit | null>(null);
    const [isVisitDetailModalOpen, setIsVisitDetailModalOpen] = useState(false);
    const [visitToView, setVisitToView] = useState<Visit | null>(null);
    const [initialDateForNewVisit, setInitialDateForNewVisit] = useState<Date | null>(null);
    const [isProjectFormModalOpen, setIsProjectFormModalOpen] = useState(false);
    const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);

    const [currentTimePosition, setCurrentTimePosition] = useState(0);

    const allCalendarEvents = useMemo(() => getEventsForRange(projects, visits), [projects, visits]);
    const calendarDays = useMemo(() => getDaysForMonthView(currentDate, allCalendarEvents), [currentDate, allCalendarEvents]);
    // Dynamic Day Names based on Locale
    const daysOfWeekNamesMonth = useMemo(() => {
        const days = [];
        for (let i = 0; i < 7; i++) {
            // Create a date object for a Sunday to start the week (e.g., 2023-01-01)
            const d = new Date(2023, 0, 1 + i);
            days.push(d.toLocaleDateString(locale, { weekday: 'long' }));
        }
        // Capitalize first letter
        return days.map(day => day.charAt(0).toUpperCase() + day.slice(1));
    }, [locale]);


    const updateCurrentTimePosition = useCallback(() => {
        const now = new Date();
        const startHour = 8; const endHour = 20; const totalHoursDisplayed = endHour - startHour;
        if (now.getHours() >= startHour && now.getHours() < endHour) {
            const minutesPastStartHour = (now.getHours() - startHour) * 60 + now.getMinutes();
            const totalMinutesDisplayed = totalHoursDisplayed * 60;
            setCurrentTimePosition((minutesPastStartHour / totalMinutesDisplayed) * 100);
        } else { setCurrentTimePosition(-1); }
    }, []);

    useEffect(() => {
        updateCurrentTimePosition();
        const timer = setInterval(updateCurrentTimePosition, 60000);
        return () => clearInterval(timer);
    }, [updateCurrentTimePosition]);

    const eventsForSelectedDay = useMemo(() => {
        if (!isValidDate(selectedDate)) return [];
        return allCalendarEvents.filter(e => isSameDate(e.start, selectedDate)).sort((a,b) => a.start.getTime() - b.start.getTime());
    }, [allCalendarEvents, selectedDate]);

    const changeDate = (amount: number, unit: 'week' | 'month') => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            if (unit === 'week') newDate.setDate(newDate.getDate() + (amount * 7));
            if (unit === 'month') newDate.setMonth(newDate.getMonth() + amount);
            return newDate;
        });
    };
    const goToToday = () => { const today = new Date(); setCurrentDate(today); setSelectedDate(today); };

    const openScheduleVisitModal = (visit?: Visit, date?: Date) => {
        setVisitToEdit(visit || null);
        setInitialDateForNewVisit(date || null);
        setIsScheduleVisitModalOpen(true);
    };

    const handleEventClick = (event: CalendarEvent) => {
        if (event.type === 'visit') {
            setVisitToView(event.originalData as Visit);
            setIsVisitDetailModalOpen(true);
        } else {
            setProjectToEdit(event.originalData as Project);
            setIsProjectFormModalOpen(true);
        }
    };
    
    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-100px)] text-sm">
            <div className="flex-grow bg-white dark:bg-neutral-800 p-3 sm:p-4 rounded-lg shadow-lg flex flex-col overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-3 gap-2">
                    <div className="flex items-center gap-1 sm:gap-2">
                        <button onClick={goToToday} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.today')}</button>
                        <button onClick={() => changeDate(-1, viewMode)} className={BUTTON_SECONDARY_SM_CLASSES}><ChevronLeftIcon /></button>
                        <button onClick={() => changeDate(1, viewMode)} className={BUTTON_SECONDARY_SM_CLASSES}><ChevronRightIcon /></button>
                        <h2 className="text-base sm:text-lg font-semibold text-neutral-700 dark:text-neutral-200 ml-2">
                            {isValidDate(currentDate) ? currentDate.toLocaleString(locale, { month: 'long', year: 'numeric' }) : t('calendar.invalid_date')}
                        </h2>
                    </div>
                     <div className="flex items-center gap-2">
                        <div className="flex items-center gap-x-3 text-xs">
                            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-teal-500 mr-1.5"></span>{t('calendar.visit')}</span>
                            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-blue-500 mr-1.5"></span>{t('calendar.project')}</span>
                        </div>
                        <select value={viewMode} onChange={e => setViewMode(e.target.value as 'month' | 'week')} className={`${INPUT_SM_CLASSES} !py-1.5 !text-xs`}>
                            <option value="month">{t('calendar.month')}</option>
                            <option value="week">{t('calendar.week')}</option>
                        </select>
                        <button onClick={() => openScheduleVisitModal(undefined, selectedDate)} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center text-xs`}>
                            <CreateVisitIcon className="w-4 h-4" /> {t('calendar.schedule_visit')}
                        </button>
                    </div>
                </div>

                {viewMode === 'month' && (
                    <div className="grid grid-cols-7 flex-grow overflow-auto pos-reports-scrollbar">
                        {daysOfWeekNamesMonth.map(day => ( <div key={day} className="py-2 text-center text-xs font-medium text-neutral-500 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-700/50">{day}</div> ))}
                        {calendarDays.map((dayObj, index) => (
                            <div key={index} onClick={() => setSelectedDate(dayObj.date)}
                                className={`p-1.5 sm:p-2 relative flex flex-col border-t border-l border-neutral-200 dark:border-neutral-700 group cursor-pointer
                                ${dayObj.isCurrentMonth ? 'bg-white dark:bg-neutral-800' : 'bg-neutral-50 dark:bg-neutral-800/50 text-neutral-400 dark:text-neutral-500'}
                                ${isSameDate(dayObj.date, selectedDate) ? 'ring-2 ring-inset ring-primary' : 'hover:bg-neutral-100 dark:hover:bg-neutral-700/50'}`}>
                                <time className={`text-xs font-semibold ${dayObj.isToday ? 'bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center' : ''}`}>{dayObj.date.getDate()}</time>
                                <div className="mt-1 space-y-1 overflow-y-auto flex-grow max-h-[calc(100%-20px)]">
                                    {dayObj.events.slice(0, 3).map(event => (
                                        <div key={event.id} onClick={e => { e.stopPropagation(); handleEventClick(event); }} 
                                            className={`block w-full p-0.5 text-left text-[9px] sm:text-xs rounded shadow-sm truncate ${event.type === 'visit' ? 'bg-teal-100 dark:bg-teal-700/50 text-teal-700 dark:text-teal-200 hover:bg-teal-200' : 'bg-blue-100 dark:bg-blue-700/50 text-blue-700 dark:text-blue-200 hover:bg-blue-200'}`}>
                                            {event.type === 'project' && <BriefcaseIcon className="w-2.5 h-2.5 inline mr-1" />}
                                            {event.title}
                                        </div>
                                    ))}
                                    {dayObj.events.length > 3 && <div className="text-center text-[9px] text-neutral-500 dark:text-neutral-400">+{dayObj.events.length - 3} más</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {/* Week View to be implemented similarly */}
            </div>

            <div className="w-full lg:w-80 bg-white dark:bg-neutral-800 p-3 sm:p-4 rounded-lg shadow-lg flex-shrink-0 overflow-y-auto h-full pos-reports-scrollbar">
                <h3 className="text-base sm:text-lg font-semibold text-neutral-700 dark:text-neutral-200 mb-3">
                    {t('calendar.activity_for')} {isValidDate(selectedDate) ? selectedDate.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' }) : t('calendar.invalid_date')}
                </h3>
                {eventsForSelectedDay.length > 0 ? (
                    <ul className="space-y-2">
                        {eventsForSelectedDay.map(event => (
                            <li key={event.id} onClick={() => handleEventClick(event)} className="p-2 rounded-md border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer">
                                {event.type === 'project' && <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">{t('calendar.project').toUpperCase()}</p>}
                                <div className="flex justify-between items-start">
                                    <h4 className="font-semibold text-primary text-xs sm:text-sm">{event.title}</h4>
                                    {event.type === 'visit' && <VisitStatusBadge status={event.status as VisitStatus} />}
                                </div>
                                {!event.isAllDay && <p className="text-xs text-neutral-500 dark:text-neutral-400">{event.start.toLocaleTimeString(locale, {hour: '2-digit', minute:'2-digit'})} - {event.end.toLocaleTimeString(locale, {hour: '2-digit', minute:'2-digit'})}</p>}
                                {event.type === 'project' && <p className="text-xs text-neutral-500 dark:text-neutral-400">Todo el día</p>}
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 text-center py-4">{t('calendar.no_activity')}</p>}
            </div>

            <ScheduleVisitModal isOpen={isScheduleVisitModalOpen} onClose={() => setIsScheduleVisitModalOpen(false)} visitToEdit={visitToEdit} initialDate={initialDateForNewVisit || (selectedDate && isValidDate(selectedDate) ? selectedDate : new Date())} />
            <VisitDetailModal isOpen={isVisitDetailModalOpen} onClose={() => setIsVisitDetailModalOpen(false)} visit={visitToView} />
            <ProjectFormModal isOpen={isProjectFormModalOpen} onClose={() => setIsProjectFormModalOpen(false)} project={projectToEdit} />
        </div>
    );
};
