import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { leadsService } from '../../services/leads';
import { ApiError } from '../../services/api';
import type { LeadAgenda, LeadAgendaItem, PipelineStage } from '../../types';
import { usePermissions } from '../../hooks/usePermissions';
import { toast } from '../../hooks/useToast';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { useLeadAssignees } from '../../components/leads/useLeadAssignees';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  ArrowPathIcon, ChevronDownIcon, ClockIcon, PhoneIcon, EnvelopeIcon, ChatBubbleLeftRightIcon, CalendarDaysIcon,
  DocumentTextIcon, ClipboardDocumentListIcon, ExclamationTriangleIcon,
} from '../../components/icons';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';

type Scope = 'mine' | 'all';
type SectionKey = 'overdue' | 'today' | 'week' | 'upcoming';
const SECTIONS: SectionKey[] = ['overdue', 'today', 'week', 'upcoming'];

type IconCmp = React.FC<{ className?: string }>;

/** Palomita (no existe CheckIcon en components/icons); mismo trazo que IconWrapper. */
const CheckIcon: IconCmp = ({ className = 'w-4 h-4' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
  </svg>
);

const ACTIVITY_ICON: Record<string, IconCmp> = {
  call: PhoneIcon, email: EnvelopeIcon, whatsapp: ChatBubbleLeftRightIcon, meeting: CalendarDaysIcon, note: DocumentTextIcon, task: ClipboardDocumentListIcon,
};

// Badges con el estilo de la app (ProjectsDashboardPage): text-[11px] font-medium px-2.5 py-1 rounded-full.
const SECTION_STYLE: Record<SectionKey, { icon: IconCmp; iconCls: string; badge: string }> = {
  overdue: { icon: ExclamationTriangleIcon, iconCls: 'text-red-500 dark:text-red-400', badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  today: { icon: ClockIcon, iconCls: 'text-neutral-400', badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
  week: { icon: CalendarDaysIcon, iconCls: 'text-neutral-400', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  upcoming: { icon: CalendarDaysIcon, iconCls: 'text-neutral-400', badge: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300' },
};

// Botones pequeños de fila (todos con la misma altura).
const ROW_BTN = 'inline-flex items-center justify-center gap-1.5 h-8 px-2.5 text-sm font-medium rounded-md border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50';
const ROW_ICON_BTN = 'inline-flex items-center justify-center w-8 h-8 rounded-md border border-neutral-300 dark:border-neutral-600 text-neutral-500 dark:text-neutral-300 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-700 hover:text-primary transition-colors';
const ROW_PRIMARY_BTN = 'inline-flex items-center justify-center gap-1.5 h-8 px-2.5 text-sm font-semibold rounded-md bg-primary hover:bg-secondary text-white shadow-sm transition-colors disabled:opacity-50';

const EMPTY: LeadAgenda = { timezone: '', overdue: [], today: [], week: [], upcoming: [] };
const FOCUS_REFRESH_MS = 30_000;

/** Fecha → valor para <input type="datetime-local"> en hora local. */
const toLocalInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const at9 = (d: Date) => { const x = new Date(d); x.setHours(9, 0, 0, 0); return x; };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

/** Dígitos para wa.me; números de 10 dígitos (PR/EE. UU.) se prefijan con 1. */
const waDigits = (raw?: string | null) => {
  const d = (raw || '').replace(/\D/g, '');
  if (!d) return '';
  return d.length === 10 ? `1${d}` : d;
};

// ---------------------------------------------------------------------------
// Menú de reagendar
// ---------------------------------------------------------------------------
const RescheduleMenu: React.FC<{ item: LeadAgendaItem; disabled?: boolean; onPick: (d: Date) => void }> = ({ item, disabled, onPick }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const toggle = () => {
    if (!open) {
      const base = item.dueAt ? new Date(item.dueAt) : null;
      const def = base && base.getTime() > Date.now() ? base : at9(addDays(new Date(), 1));
      setCustom(toLocalInput(def));
    }
    setOpen(o => !o);
  };

  const pick = (d: Date) => { setOpen(false); onPick(d); };

  const presets = useMemo(() => {
    const now = new Date();
    const due = item.dueAt ? new Date(item.dueAt) : null;
    // +2 días conserva la hora original (o 9:00 si no tenía).
    const in2 = addDays(now, 2);
    if (due) in2.setHours(due.getHours(), due.getMinutes(), 0, 0); else in2.setHours(9, 0, 0, 0);
    const dow = now.getDay(); // 0 = domingo
    const toMonday = ((8 - dow) % 7) || 7;
    return [
      { key: 'tomorrow', label: t('leads.agenda.preset.tomorrow'), date: at9(addDays(now, 1)) },
      { key: 'in2days', label: t('leads.agenda.preset.in2days'), date: in2 },
      { key: 'next_monday', label: t('leads.agenda.preset.next_monday'), date: at9(addDays(now, toMonday)) },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item.dueAt]);

  const applyCustom = () => {
    const d = custom ? new Date(custom) : null;
    if (!d || isNaN(d.getTime())) { toast.warning(t('leads.agenda.invalid_date')); return; }
    pick(d);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        className={ROW_BTN}
      >
        <CalendarDaysIcon className="w-4 h-4" /> {t('leads.agenda.reschedule')} <ChevronDownIcon className="w-3 h-3" />
      </button>
      {open && (
        <div role="menu" className="absolute z-30 mt-1 left-0 sm:left-auto sm:right-0 w-64 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg p-1">
          {presets.map(p => (
            <button
              key={p.key}
              type="button"
              role="menuitem"
              onClick={() => pick(p.date)}
              className="w-full text-left px-3 py-2 text-sm rounded-lg text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700/40 transition-colors"
            >
              {p.label}
            </button>
          ))}
          <div className="border-t border-neutral-200 dark:border-neutral-700 mt-1 pt-2 px-2 pb-1">
            <label className="block text-xs text-neutral-500 dark:text-neutral-400 mb-1">{t('leads.agenda.preset.custom')}</label>
            <div className="flex gap-1.5">
              <input
                type="datetime-local"
                value={custom}
                onChange={e => setCustom(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') applyCustom(); }}
                className={`${INPUT_SM_CLASSES} flex-1 min-w-0`}
              />
              <button type="button" onClick={applyCustom} className={`${ROW_PRIMARY_BTN} !h-9`}>
                {t('leads.agenda.apply')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------
export const LeadsAgendaPage: React.FC = () => {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const { can, isManager } = usePermissions();
  const assignees = useLeadAssignees();
  const canViewAll = isManager || can('leads.viewAll');
  // Completar / reagendar = editar la actividad (el backend exige leads.edit).
  const canEditAct = isManager || can('leads.edit');

  const [scope, setScope] = useState<Scope>('mine');
  const [agenda, setAgenda] = useState<LeadAgenda>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stages, setStages] = useState<Record<string, PipelineStage>>({});
  const [collapsed, setCollapsed] = useState<Record<SectionKey, boolean>>({ overdue: false, today: false, week: false, upcoming: false });
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const agendaRef = useRef<LeadAgenda>(EMPTY);
  agendaRef.current = agenda;
  const lastLoadRef = useRef(0);
  const reqRef = useRef(0);

  const locale = lang === 'en' ? 'en-US' : 'es-PR';
  const effectiveScope: Scope = canViewAll ? scope : 'mine';

  const load = useCallback(async (silent = false) => {
    const req = ++reqRef.current;
    if (silent) setRefreshing(true); else setLoading(true);
    try {
      const data = await leadsService.agenda(effectiveScope);
      if (req !== reqRef.current) return;
      setAgenda({ ...EMPTY, ...data });
      lastLoadRef.current = Date.now();
    } catch (err) {
      if (req !== reqRef.current) return;
      toast.error(err instanceof ApiError ? err.message : t('leads.agenda.load_error'));
    } finally {
      if (req === reqRef.current) { setLoading(false); setRefreshing(false); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveScope]);

  useEffect(() => { load(); }, [load]);

  // Nombres de etapa (todas las de todos los pipelines).
  useEffect(() => {
    leadsService.getConfig().then(cfg => {
      const map: Record<string, PipelineStage> = {};
      cfg.pipelines.forEach(p => p.stages.forEach(s => { map[s.id] = s; }));
      setStages(map);
    }).catch(() => { /* la agenda funciona sin nombres de etapa */ });
  }, []);

  // Al volver a la pestaña/ventana, refresca si los datos tienen más de 30 s.
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === 'hidden') return;
      if (Date.now() - lastLoadRef.current > FOCUS_REFRESH_MS) load(true);
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => { window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onFocus); };
  }, [load]);

  const assigneeName = useMemo(() => {
    const m: Record<string, string> = {};
    assignees.forEach(a => { m[a.uid] = a.name; });
    return m;
  }, [assignees]);

  const total = SECTIONS.reduce((n, k) => n + agenda[k].length, 0);

  /** Quita la actividad de su sección; devuelve una función que la reinserta en la misma posición. */
  const removeLocal = (id: string) => {
    const snapshot = agendaRef.current;
    const k = SECTIONS.find(s => snapshot[s].some(a => a.id === id));
    if (!k) return () => {};
    const idx = snapshot[k].findIndex(a => a.id === id);
    const item = snapshot[k][idx];
    setAgenda(prev => ({ ...prev, [k]: prev[k].filter(a => a.id !== id) }));
    return () => setAgenda(cur => {
      if (SECTIONS.some(s => cur[s].some(a => a.id === id))) return cur;
      const list = [...cur[k]];
      list.splice(Math.min(idx, list.length), 0, item);
      return { ...cur, [k]: list };
    });
  };

  const setItemBusy = (id: string, v: boolean) => setBusy(b => { const n = { ...b }; if (v) n[id] = true; else delete n[id]; return n; });

  const complete = async (item: LeadAgendaItem) => {
    if (busy[item.id]) return;
    setItemBusy(item.id, true);
    const revert = removeLocal(item.id);
    try {
      await leadsService.updateActivity(item.id, { done: true });
      toast.success(t('leads.agenda.completed'));
    } catch (err) {
      revert();
      toast.error(err instanceof ApiError ? err.message : t('leads.agenda.complete_error'));
    } finally {
      setItemBusy(item.id, false);
    }
  };

  const reschedule = async (item: LeadAgendaItem, date: Date) => {
    if (busy[item.id]) return;
    setItemBusy(item.id, true);
    const revert = removeLocal(item.id);
    try {
      await leadsService.updateActivity(item.id, { dueAt: date.toISOString() });
      toast.success(t('leads.agenda.rescheduled', { date: date.toLocaleString(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) }));
      // El servidor decide en qué sección cae según el horario del negocio.
      load(true);
    } catch (err) {
      revert();
      toast.error(err instanceof ApiError ? err.message : t('leads.agenda.reschedule_error'));
    } finally {
      setItemBusy(item.id, false);
    }
  };

  const formatDue = (item: LeadAgendaItem, section: SectionKey) => {
    if (!item.dueAt) return t('leads.agenda.no_date');
    const d = new Date(item.dueAt);
    if (isNaN(d.getTime())) return t('leads.agenda.no_date');
    if (section === 'today') return d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
    return d.toLocaleString(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
  };

  const renderRow = (item: LeadAgendaItem, section: SectionKey) => {
    const lead = item.lead;
    const leadName = `${lead.name || ''} ${lead.lastName || ''}`.trim();
    const stage = stages[lead.stageId];
    const dueMs = item.dueAt ? new Date(item.dueAt).getTime() : NaN;
    const now = Date.now();
    const lateToday = section === 'today' && !isNaN(dueMs) && dueMs < now;
    const overdueDays = section === 'overdue' && !isNaN(dueMs) ? Math.max(0, Math.floor((now - dueMs) / 86400000)) : 0;
    const wa = waDigits(lead.whatsapp || lead.phone);
    const isBusy = !!busy[item.id];
    const typeLabel = t(`leads.common.activity.${item.type}`);
    const openLead = () => navigate(`/leads?lead=${encodeURIComponent(lead.id)}`);
    const TypeIcon = ACTIVITY_ICON[item.type] || ClipboardDocumentListIcon;
    const isLate = section === 'overdue' || lateToday;

    return (
      <li key={item.id} className={`py-3 px-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/40 transition-colors flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 ${isBusy ? 'opacity-60' : ''}`}>
        {/* Fecha */}
        <div className="sm:w-36 flex-shrink-0 flex sm:flex-col items-center sm:items-start gap-2 sm:gap-0.5">
          <span translate="no" className={`text-sm font-semibold tabular-nums ${isLate ? 'text-red-600 dark:text-red-400' : 'text-neutral-800 dark:text-neutral-100'}`}>
            {formatDue(item, section)}
          </span>
          {lateToday && <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">{t('leads.agenda.late')}</span>}
          {section === 'overdue' && overdueDays > 0 && (
            <span translate="no" className="text-xs text-red-600 dark:text-red-400">{t('leads.agenda.overdue_days', { n: overdueDays })}</span>
          )}
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0 flex items-start gap-3">
          <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0" title={typeLabel}>
            <TypeIcon className="w-4 h-4" />
          </span>
          <div className="min-w-0 flex-1">
            <button type="button" onClick={openLead} className="text-left w-full group">
              <span className="block font-semibold text-sm text-neutral-800 dark:text-neutral-100 truncate group-hover:text-primary">
                {item.title ? <span translate="no">{item.title}</span> : typeLabel}
              </span>
              {item.body && (
                <span translate="no" className="block text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2 break-words">{item.body}</span>
              )}
            </button>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400">
              {item.title && <span>{typeLabel}</span>}
              <span translate="no" className="font-medium text-neutral-600 dark:text-neutral-300">
                {leadName || '—'}{lead.companyName ? <span className="font-normal text-neutral-400"> · {lead.companyName}</span> : null}
              </span>
              {stage && (
                <span className="inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: stage.color || '#9CA3AF' }} />
                  <span translate="no">{stage.name}</span>
                </span>
              )}
              {effectiveScope === 'all' && (
                <span translate="no">
                  {t('leads.agenda.assigned_to', { name: lead.assignedUserId ? (assigneeName[lead.assignedUserId] || '—') : t('leads.common.unassigned') })}
                </span>
              )}
              {item.createdByName && effectiveScope === 'all' && (
                <span translate="no">{t('leads.agenda.created_by', { name: item.createdByName })}</span>
              )}
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap items-center gap-1.5 sm:justify-end sm:flex-shrink-0">
          {wa && (
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className={ROW_ICON_BTN} title={t('leads.agenda.whatsapp')} aria-label={t('leads.agenda.whatsapp')}>
              <ChatBubbleLeftRightIcon className="w-4 h-4" />
            </a>
          )}
          {lead.phone && (
            <a href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`} className={ROW_ICON_BTN} title={t('leads.agenda.call')} aria-label={t('leads.agenda.call')}>
              <PhoneIcon className="w-4 h-4" />
            </a>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} className={ROW_ICON_BTN} title={t('leads.agenda.send_email')} aria-label={t('leads.agenda.send_email')}>
              <EnvelopeIcon className="w-4 h-4" />
            </a>
          )}
          {canEditAct && <RescheduleMenu item={item} disabled={isBusy} onPick={d => reschedule(item, d)} />}
          <button type="button" onClick={openLead} className={ROW_BTN}>
            {t('leads.agenda.open_lead')}
          </button>
          {canEditAct && (
            <button type="button" onClick={() => complete(item)} disabled={isBusy} className={ROW_PRIMARY_BTN}>
              <CheckIcon className="w-4 h-4" /> {t('leads.agenda.complete')}
            </button>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">{t('leads.agenda.title')}</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('leads.agenda.subtitle')}</p>
          {(agenda.timezone || !loading) && (
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-400 dark:text-neutral-500">
              {agenda.timezone && <span translate="no">{t('leads.agenda.timezone', { tz: agenda.timezone })}</span>}
              {!loading && <span translate="no">{t('leads.agenda.total', { n: total })}</span>}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canViewAll && (
            <div className="flex items-center bg-neutral-100 dark:bg-neutral-700 p-0.5 rounded-md" role="group">
              {(['mine', 'all'] as Scope[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScope(s)}
                  aria-pressed={scope === s}
                  className={`px-2.5 py-1 text-sm font-semibold rounded-md transition-colors ${scope === s
                    ? 'bg-primary text-white shadow'
                    : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'}`}
                >
                  {t(`leads.agenda.scope.${s}`)}
                </button>
              ))}
            </div>
          )}
          <button type="button" onClick={() => load(true)} disabled={loading || refreshing} className={`${BUTTON_SECONDARY_SM_CLASSES} inline-flex items-center gap-1.5 disabled:opacity-50`}>
            <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> {t('leads.agenda.refresh')}
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton variant="list" rows={6} />
      ) : (
        <>
          {total === 0 && (
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 shadow-sm">
              <EmptyState
                icon={<CalendarDaysIcon className="w-12 h-12" />}
                title={t('leads.agenda.all_clear')}
                cta={<button type="button" onClick={() => navigate('/leads')} className={BUTTON_PRIMARY_SM_CLASSES}>{t('leads.agenda.go_to_leads')}</button>}
              />
            </div>
          )}
          {total > 0 && SECTIONS.map(k => {
            const items = agenda[k];
            const style = SECTION_STYLE[k];
            const SectionIcon = style.icon;
            const isCollapsed = collapsed[k];
            return (
              <section key={k} className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 shadow-sm">
                <button
                  type="button"
                  onClick={() => setCollapsed(c => ({ ...c, [k]: !c[k] }))}
                  aria-expanded={!isCollapsed}
                  aria-label={isCollapsed ? t('leads.agenda.expand') : t('leads.agenda.collapse')}
                  className="w-full flex items-center justify-between gap-3 text-left"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <SectionIcon className={`w-5 h-5 flex-shrink-0 ${style.iconCls}`} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span role="heading" aria-level={2} className="text-base font-semibold text-neutral-800 dark:text-neutral-100">{t(`leads.agenda.section.${k}`)}</span>
                        <span translate="no" className={`text-[11px] font-medium px-2.5 py-1 rounded-full tabular-nums ${style.badge}`}>{items.length}</span>
                      </span>
                      {k === 'upcoming' && <span className="block text-xs text-neutral-400 dark:text-neutral-500">{t('leads.agenda.section.upcoming_hint')}</span>}
                    </span>
                  </span>
                  <ChevronDownIcon className={`w-4 h-4 text-neutral-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                </button>
                {!isCollapsed && (
                  <div className="mt-3">
                    {items.length === 0 ? (
                      <p className="text-sm text-neutral-400 text-center py-6">{t(`leads.agenda.empty.${k}`)}</p>
                    ) : (
                      <ul className="space-y-1">
                        {items.map(item => renderRow(item, k))}
                      </ul>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </>
      )}
    </div>
  );
};

export default LeadsAgendaPage;
