
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Visit, Project, ProjectStatus, VisitStatus } from '../../types';
import { useData } from '../../contexts/DataContext';
import { ScheduleVisitModal } from './ScheduleVisitModal';
import { VisitDetailModal } from './VisitDetailModal';
import { ProjectFormModal } from './ProjectFormModal';
import { Modal } from '../../components/Modal';
import { ScheduleMeetingModal } from '../../components/pm/ScheduleMeetingModal';
import { projectMeetingsService, type ProjectMeeting } from '../../services/projectMeetings';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon as CreateVisitIcon, BriefcaseIcon, ChatBubbleLeftRightIcon, CalendarDaysIcon, UserGroupIcon } from '../../components/icons';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { VisitStatusBadge } from '../../components/ui/VisitStatusBadge';
import { useTranslation } from '../../contexts/GlobalSettingsContext'; // Import translation

// --- Helper Functions & Types ---

interface CalendarEvent {
    id: string;
    title: string;
    start: Date;
    end: Date;
    type: 'visit' | 'project' | 'meeting';
    originalData: Visit | Project | ProjectMeeting;
    status: VisitStatus | ProjectStatus;
    isAllDay: boolean;
}

const isValidDate = (d: any): d is Date => d instanceof Date && !isNaN(d.getTime());

const isSameDate = (date1?: Date, date2?: Date): boolean => {
    if (!date1 || !date2 || !isValidDate(date1) || !isValidDate(date2)) return false;
    return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth() && date1.getDate() === date2.getDate();
};

const getEventsForRange = (projects: Project[], visits: Visit[], meetings: ProjectMeeting[] = []): CalendarEvent[] => {
    const events: CalendarEvent[] = [];

    // Process Meetings (Seguimiento)
    meetings.forEach(m => {
        const dateStr = String(m.date || '').slice(0, 10);
        const start = new Date(`${dateStr}T${m.startTime || '00:00'}`);
        if (!isValidDate(start)) return;
        const end = new Date(start.getTime() + (m.durationHours || 1) * 3600 * 1000);
        events.push({
            id: `meeting-${m.id}`,
            title: m.title,
            start,
            end,
            type: 'meeting',
            originalData: m,
            status: ProjectStatus.ACTIVE,
            isAllDay: false,
        });
    });

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

    const { visits, projects, setVisits, employees, getProjectById } = useData();
    const navigate = useNavigate();
    const [meetings, setMeetings] = useState<ProjectMeeting[]>([]);
    const [meetingToView, setMeetingToView] = useState<ProjectMeeting | null>(null);
    const [scheduleMeetingOpen, setScheduleMeetingOpen] = useState(false);
    const [meetingInitialTime, setMeetingInitialTime] = useState<string | null>(null);
    // Selector "¿qué agendar?" al hacer doble clic en un día/franja (visita o seguimiento).
    const [chooser, setChooser] = useState<{ date: Date; time?: string } | null>(null);
    const loadMeetings = useCallback(() => { projectMeetingsService.listAll().then(setMeetings).catch(() => setMeetings([])); }, []);
    const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
    const [currentDate, setCurrentDate] = useState(() => new Date());
    const [selectedDate, setSelectedDate] = useState(() => new Date());
    
    // Modals state
    const [isScheduleVisitModalOpen, setIsScheduleVisitModalOpen] = useState(false);
    const [visitToEdit, setVisitToEdit] = useState<Visit | null>(null);
    const [isVisitDetailModalOpen, setIsVisitDetailModalOpen] = useState(false);
    const [visitToView, setVisitToView] = useState<Visit | null>(null);
    const [initialDateForNewVisit, setInitialDateForNewVisit] = useState<Date | null>(null);
    const [initialTimeForNewVisit, setInitialTimeForNewVisit] = useState<string | null>(null);
    const [isProjectFormModalOpen, setIsProjectFormModalOpen] = useState(false);
    const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);

    const [currentTimePosition, setCurrentTimePosition] = useState(0);

    useEffect(() => { loadMeetings(); }, [loadMeetings]);

    const allCalendarEvents = useMemo(() => getEventsForRange(projects, visits, meetings), [projects, visits, meetings]);
    const calendarDays = useMemo(() => getDaysForMonthView(currentDate, allCalendarEvents), [currentDate, allCalendarEvents]);
    // Vista semanal: los 7 días de la semana de `currentDate` con sus eventos.
    const weekDays = useMemo(() => getWeekDays(currentDate).map(date => ({
        date,
        isToday: isSameDate(date, new Date()),
        events: allCalendarEvents.filter(e => isSameDate(e.start, date)).sort((a, b) => a.start.getTime() - b.start.getTime()),
    })), [currentDate, allCalendarEvents]);
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

    const changeDate = (amount: number, unit: 'week' | 'month' | 'day') => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            if (unit === 'day') newDate.setDate(newDate.getDate() + amount);
            if (unit === 'week') newDate.setDate(newDate.getDate() + (amount * 7));
            if (unit === 'month') newDate.setMonth(newDate.getMonth() + amount);
            return newDate;
        });
    };
    const goToToday = () => { const today = new Date(); setCurrentDate(today); setSelectedDate(today); };

    const openScheduleVisitModal = (visit?: Visit, date?: Date, time?: string) => {
        setVisitToEdit(visit || null);
        setInitialDateForNewVisit(date || null);
        setInitialTimeForNewVisit(time || null);
        setIsScheduleVisitModalOpen(true);
    };

    const handleEventClick = (event: CalendarEvent) => {
        if (event.type === 'visit') {
            setVisitToView(event.originalData as Visit);
            setIsVisitDetailModalOpen(true);
        } else if (event.type === 'meeting') {
            setMeetingToView(event.originalData as ProjectMeeting);
        } else {
            setProjectToEdit(event.originalData as Project);
            setIsProjectFormModalOpen(true);
        }
    };

    const empName = (id: string) => { const e = employees.find(x => x.id === id); return e ? `${e.name} ${e.lastName || ''}`.trim() : id; };

    // Un solo día (para la vista "Día") con sus eventos.
    const dayCells = useMemo(() => [{
        date: currentDate,
        isToday: isSameDate(currentDate, new Date()),
        events: allCalendarEvents.filter(e => isSameDate(e.start, currentDate)).sort((a, b) => a.start.getTime() - b.start.getTime()),
    }], [currentDate, allCalendarEvents]);

    /** Rejilla de horas reutilizable (vista Semana = 7 días, vista Día = 1 día). */
    const renderTimeGrid = (days: { date: Date; isToday: boolean; events: CalendarEvent[] }[]) => {
        const START_HOUR = 6, END_HOUR = 22, HOUR_PX = 48; // 6am–10pm
        const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
        const gridH = hours.length * HOUR_PX;
        const hh = (n: number) => `${String(n).padStart(2, '0')}:00`;
        const cols = `3.5rem repeat(${days.length}, minmax(0,1fr))`;
        return (
            <div className="flex flex-col flex-grow overflow-hidden">
                <div className="grid flex-shrink-0" style={{ gridTemplateColumns: cols }}>
                    <div className="border-b border-neutral-200 dark:border-neutral-700" />
                    {days.map((d, i) => (
                        <button key={i} type="button"
                            onClick={() => { setSelectedDate(d.date); setCurrentDate(d.date); setViewMode('day'); }}
                            className={`py-2 text-center border-b border-l border-neutral-200 dark:border-neutral-700 cursor-pointer ${d.isToday ? 'bg-primary/10' : 'bg-neutral-50 dark:bg-neutral-700/50'}`}>
                            <div className="text-[10px] uppercase text-neutral-500 dark:text-neutral-400">{d.date.toLocaleDateString(locale, { weekday: 'short' })}</div>
                            <div className={`mx-auto text-sm font-semibold rounded-full w-7 h-7 flex items-center justify-center ${d.isToday ? 'bg-primary text-white' : 'text-neutral-700 dark:text-neutral-200'}`}>{d.date.getDate()}</div>
                        </button>
                    ))}
                </div>
                <div className="grid flex-grow overflow-y-auto pos-reports-scrollbar" style={{ gridTemplateColumns: cols }}>
                    <div className="relative" style={{ height: gridH }}>
                        {hours.map((h, i) => (
                            <div key={h} className="absolute right-1 text-[10px] text-neutral-400 -translate-y-1/2" style={{ top: i * HOUR_PX }}>{hh(h)}</div>
                        ))}
                    </div>
                    {days.map((dayObj, di) => (
                        <div key={di} className="relative border-l border-neutral-200 dark:border-neutral-700" style={{ height: gridH }}>
                            {hours.map((h, i) => (
                                <div key={h}
                                    onClick={() => { setSelectedDate(dayObj.date); setChooser({ date: dayObj.date, time: hh(h) }); }}
                                    title={`Agendar · ${dayObj.date.toLocaleDateString(locale)} ${hh(h)}`}
                                    className="absolute left-0 right-0 border-b border-neutral-100 dark:border-neutral-700/50 hover:bg-primary/5 cursor-pointer"
                                    style={{ top: i * HOUR_PX, height: HOUR_PX }}
                                />
                            ))}
                            {dayObj.events.filter(e => !e.isAllDay).map(event => {
                                const startMins = event.start.getHours() * 60 + event.start.getMinutes();
                                const endMins = event.end.getHours() * 60 + event.end.getMinutes();
                                const top = Math.max(0, (startMins - START_HOUR * 60) / 60 * HOUR_PX);
                                const height = Math.max(18, ((endMins - startMins) / 60) * HOUR_PX - 2);
                                return (
                                    <div key={event.id} onClick={e => { e.stopPropagation(); handleEventClick(event); }}
                                        style={{ top, height }}
                                        className={`absolute left-0.5 right-0.5 p-1 text-[10px] rounded shadow-sm overflow-hidden cursor-pointer ${event.type === 'visit' ? 'bg-teal-100 dark:bg-teal-700/60 text-teal-800 dark:text-teal-100 hover:bg-teal-200' : event.type === 'meeting' ? 'bg-purple-100 dark:bg-purple-700/60 text-purple-800 dark:text-purple-100 hover:bg-purple-200' : 'bg-blue-100 dark:bg-blue-700/60 text-blue-800 dark:text-blue-100 hover:bg-blue-200'}`}>
                                        {!event.isAllDay && <div className="font-semibold">{event.start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}</div>}
                                        <div className="truncate">{event.title}</div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        );
    };
    
    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-100px)] text-sm">
            <div className="flex-grow bg-white dark:bg-neutral-800 p-3 sm:p-4 rounded-lg shadow-lg flex flex-col overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:flex-wrap justify-between items-start sm:items-center mb-3 gap-2">
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        <button onClick={goToToday} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.today')}</button>
                        <button onClick={() => changeDate(-1, viewMode)} className={BUTTON_SECONDARY_SM_CLASSES}><ChevronLeftIcon /></button>
                        <button onClick={() => changeDate(1, viewMode)} className={BUTTON_SECONDARY_SM_CLASSES}><ChevronRightIcon /></button>
                        <h2 className="text-base sm:text-lg font-semibold text-neutral-700 dark:text-neutral-200 ml-2">
                            {isValidDate(currentDate) ? currentDate.toLocaleString(locale, { month: 'long', year: 'numeric' }) : t('calendar.invalid_date')}
                        </h2>
                    </div>
                     <div className="flex items-center flex-wrap gap-2 justify-start sm:justify-end">
                        <div className="hidden md:flex items-center gap-x-3 text-xs">
                            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-teal-500 mr-1.5"></span>{t('calendar.visit')}</span>
                            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-blue-500 mr-1.5"></span>{t('calendar.project')}</span>
                            <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-purple-500 mr-1.5"></span>{t('calendar.followup') || 'Seguimiento'}</span>
                        </div>
                        <select value={viewMode} onChange={e => setViewMode(e.target.value as 'month' | 'week' | 'day')} className={`${INPUT_SM_CLASSES} !py-1.5 !text-xs`}>
                            <option value="month">{t('calendar.month')}</option>
                            <option value="week">{t('calendar.week')}</option>
                            <option value="day">{t('calendar.day') || 'Día'}</option>
                        </select>
                        <button onClick={() => { setMeetingInitialTime(null); setScheduleMeetingOpen(true); }} className={`${BUTTON_SECONDARY_SM_CLASSES} flex items-center gap-1 text-xs`}>
                            <ChatBubbleLeftRightIcon className="w-4 h-4" /> {t('calendar.schedule_followup') || 'Programar Seguimiento'}
                        </button>
                        <button onClick={() => openScheduleVisitModal(undefined, selectedDate)} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center text-xs`}>
                            <CreateVisitIcon className="w-4 h-4" /> {t('calendar.schedule_visit')}
                        </button>
                    </div>
                </div>

                {viewMode === 'month' && (
                    <div className="grid grid-cols-7 flex-grow overflow-auto pos-reports-scrollbar">
                        {daysOfWeekNamesMonth.map(day => ( <div key={day} className="py-2 text-center text-xs font-medium text-neutral-500 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-700/50">{day}</div> ))}
                        {calendarDays.map((dayObj, index) => (
                            <div key={index} onClick={() => setSelectedDate(dayObj.date)} onDoubleClick={() => setChooser({ date: dayObj.date })}
                                className={`p-1.5 sm:p-2 relative flex flex-col border-t border-l border-neutral-200 dark:border-neutral-700 group cursor-pointer
                                ${dayObj.isCurrentMonth ? 'bg-white dark:bg-neutral-800' : 'bg-neutral-50 dark:bg-neutral-800/50 text-neutral-400 dark:text-neutral-500'}
                                ${isSameDate(dayObj.date, selectedDate) ? 'ring-2 ring-inset ring-primary' : 'hover:bg-neutral-100 dark:hover:bg-neutral-700/50'}`}>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setSelectedDate(dayObj.date); setCurrentDate(dayObj.date); setViewMode('day'); }}
                                    title="Ver el día"
                                    className={`self-start text-xs font-semibold rounded-full w-7 h-7 flex items-center justify-center transition-colors ${dayObj.isToday ? 'bg-primary text-white' : 'bg-neutral-100 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300 hover:bg-primary hover:text-white'}`}
                                >{dayObj.date.getDate()}</button>
                                <div className="mt-1 space-y-1 overflow-y-auto flex-grow max-h-[calc(100%-20px)]">
                                    {dayObj.events.slice(0, 3).map(event => (
                                        <div key={event.id} onClick={e => { e.stopPropagation(); handleEventClick(event); }}
                                            className={`block w-full p-0.5 text-left text-[9px] sm:text-xs rounded shadow-sm truncate ${event.type === 'visit' ? 'bg-teal-100 dark:bg-teal-700/50 text-teal-700 dark:text-teal-200 hover:bg-teal-200' : event.type === 'meeting' ? 'bg-purple-100 dark:bg-purple-700/50 text-purple-700 dark:text-purple-200 hover:bg-purple-200' : 'bg-blue-100 dark:bg-blue-700/50 text-blue-700 dark:text-blue-200 hover:bg-blue-200'}`}>
                                            {event.type === 'project' && <BriefcaseIcon className="w-2.5 h-2.5 inline mr-1" />}
                                            {event.type === 'meeting' && <ChatBubbleLeftRightIcon className="w-2.5 h-2.5 inline mr-1" />}
                                            {event.title}
                                        </div>
                                    ))}
                                    {dayObj.events.length > 3 && <div className="text-center text-[9px] text-neutral-500 dark:text-neutral-400">{t('pm2x.calendar.more_events', { n: dayObj.events.length - 3 })}</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {viewMode === 'week' && renderTimeGrid(weekDays)}
                {viewMode === 'day' && renderTimeGrid(dayCells)}
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
                                {event.type === 'meeting' && <p className="text-xs font-semibold text-purple-600 dark:text-purple-400">{(t('calendar.followup') || 'SEGUIMIENTO').toUpperCase()}</p>}
                                <div className="flex justify-between items-start">
                                    <h4 className="font-semibold text-primary text-xs sm:text-sm">{event.title}</h4>
                                    {event.type === 'visit' && <VisitStatusBadge status={event.status as VisitStatus} />}
                                </div>
                                {!event.isAllDay && <p className="text-xs text-neutral-500 dark:text-neutral-400">{event.start.toLocaleTimeString(locale, {hour: '2-digit', minute:'2-digit'})} - {event.end.toLocaleTimeString(locale, {hour: '2-digit', minute:'2-digit'})}</p>}
                                {event.type === 'project' && <p className="text-xs text-neutral-500 dark:text-neutral-400">{t('pm2x.calendar.all_day')}</p>}
                            </li>
                        ))}
                    </ul>
                ) : <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 text-center py-4">{t('calendar.no_activity')}</p>}
            </div>

            <ScheduleVisitModal isOpen={isScheduleVisitModalOpen} onClose={() => setIsScheduleVisitModalOpen(false)} visitToEdit={visitToEdit} initialDate={initialDateForNewVisit || (selectedDate && isValidDate(selectedDate) ? selectedDate : new Date())} initialTime={initialTimeForNewVisit} />
            <VisitDetailModal isOpen={isVisitDetailModalOpen} onClose={() => setIsVisitDetailModalOpen(false)} visit={visitToView} />
            <ProjectFormModal isOpen={isProjectFormModalOpen} onClose={() => setIsProjectFormModalOpen(false)} project={projectToEdit} />

            <ScheduleMeetingModal
                isOpen={scheduleMeetingOpen}
                onClose={() => setScheduleMeetingOpen(false)}
                initialDate={isValidDate(selectedDate) ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}` : undefined}
                initialTime={meetingInitialTime || undefined}
                onCreated={loadMeetings}
            />

            {/* Selector "¿qué agendar?" al hacer doble clic en un día/franja (estilo Google: pestañas) */}
            <Modal isOpen={!!chooser} onClose={() => setChooser(null)} title={chooser ? `Agendar · ${chooser.date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}` : 'Agendar'} size="sm">
                {chooser && (
                    <div className="space-y-3">
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">¿Qué quieres agendar{chooser.time ? ` a las ${chooser.time}` : ''}?</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => { const d = chooser.date, tm = chooser.time; setChooser(null); openScheduleVisitModal(undefined, d, tm); }}
                                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-primary hover:bg-primary/5 transition"
                            >
                                <CreateVisitIcon className="w-6 h-6 text-teal-600" />
                                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Visita</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => { const d = chooser.date, tm = chooser.time; setChooser(null); setSelectedDate(d); setMeetingInitialTime(tm || null); setScheduleMeetingOpen(true); }}
                                className="flex flex-col items-center gap-2 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-primary hover:bg-primary/5 transition"
                            >
                                <ChatBubbleLeftRightIcon className="w-6 h-6 text-purple-600" />
                                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Seguimiento</span>
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Detalle de reunión (Seguimiento) */}
            <Modal isOpen={!!meetingToView} onClose={() => setMeetingToView(null)} title={meetingToView?.title || 'Reunión'} size="md">
                {meetingToView && (() => {
                    const proj = getProjectById?.(meetingToView.projectId);
                    const start = new Date(`${String(meetingToView.date).slice(0, 10)}T${meetingToView.startTime || '00:00'}`);
                    const dateLabel = isValidDate(start) ? start.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : String(meetingToView.date).slice(0, 10);
                    return (
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                                <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">SEGUIMIENTO</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="flex items-start gap-2"><CalendarDaysIcon className="w-4 h-4 mt-0.5 text-neutral-400" /><div><div className="text-xs text-neutral-400">Fecha y hora</div><div className="text-neutral-700 dark:text-neutral-200">{dateLabel}</div><div className="text-neutral-500">{meetingToView.startTime} · {meetingToView.durationHours}h</div></div></div>
                                <div className="flex items-start gap-2"><BriefcaseIcon className="w-4 h-4 mt-0.5 text-neutral-400" /><div><div className="text-xs text-neutral-400">Proyecto</div><div className="text-neutral-700 dark:text-neutral-200">{proj?.name || '—'}</div></div></div>
                            </div>
                            <div className="flex items-start gap-2"><UserGroupIcon className="w-4 h-4 mt-0.5 text-neutral-400" /><div><div className="text-xs text-neutral-400">Participantes</div><div className="text-neutral-700 dark:text-neutral-200">{meetingToView.employeeIds.length ? meetingToView.employeeIds.map(empName).join(', ') : 'Sin participantes'}{meetingToView.inviteClient ? ' · Cliente invitado' : ''}</div></div></div>
                            {meetingToView.notes && <div><div className="text-xs text-neutral-400">Notas</div><p className="text-neutral-700 dark:text-neutral-200 italic">{meetingToView.notes}</p></div>}
                            <div className="text-xs">
                                {meetingToView.transcript ? <span className="text-green-600 dark:text-green-400">✓ Transcripción guardada</span> : <span className="text-neutral-400">Sin transcripción aún</span>}
                            </div>
                            <div className="flex flex-wrap gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-700">
                                {meetingToView.meetLink && <a href={meetingToView.meetLink} target="_blank" rel="noopener noreferrer" className={`${BUTTON_SECONDARY_SM_CLASSES} inline-flex items-center gap-1`}><ChatBubbleLeftRightIcon className="w-4 h-4" /> Abrir Meet</a>}
                                <button onClick={() => { const id = meetingToView.projectId; setMeetingToView(null); navigate(`/pm/projects/${id}?tab=seguimiento`); }} className={`${BUTTON_PRIMARY_SM_CLASSES} inline-flex items-center gap-1`}>Ver en el proyecto</button>
                            </div>
                        </div>
                    );
                })()}
            </Modal>
        </div>
    );
};
