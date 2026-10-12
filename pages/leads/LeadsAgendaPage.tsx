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
import { ArrowPathIcon, ChevronDownIcon, ClockIcon, PhoneIcon, EnvelopeIcon, ChatBubbleLeftRightIcon } from '../../components/icons';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';

type Scope = 'mine' | 'all';
type SectionKey = 'overdue' | 'today' | 'week' | 'upcoming';
const SECTIONS: SectionKey[] = ['overdue', 'today', 'week', 'upcoming'];

const ACTIVITY_ICON: Record<string, string> = {
  call: '📞', email: '✉️', whatsapp: '💬', meeting: '📅', note: '📝', task: '✅',
};

const SECTION_STYLE: Record<SectionKey, { border: string; title: string; badge: string }> = {
  overdue: { border: 'border-l-red-500', title: 'text-red-600 dark:text-red-400', badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  today: { border: 'border-l-teal-500', title: 'text-teal-700 dark:text-teal-300', badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' },
  week: { border: 'border-l-blue-500', title: 'text-blue-700 dark:text-blue-300', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  upcoming: { border: 'border-l-neutral-400', title: 'text-neutral-700 dark:text-neutral-200', badge: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300' },
};

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
        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-50"
      >
        <ClockIcon className="w-4 h-4" /> {t('leads.agenda.reschedule')} <ChevronDownIcon className="w-3 h-3" />
      </button>
      {open && (
        <div role="menu" className="absolute z-30 mt-1 left-0 sm:left-auto sm:right-0 w-64 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg p-1">
          {presets.map(p => (
            <button
              key={p.key}
              type="button"
              role="menuitem"
              onClick={() => pick(p.date)}
              className="w-full text-left px-3 py-2 text-sm rounded-md text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700"
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
                className="flex-1 min-w-0 px-2 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button type="button" onClick={applyCustom} className="px-2.5 py-1.5 text-sm rounded-md bg-primary hover:bg-secondary text-white font-semibold">
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
    const linkCls = 'inline-flex items-center justify-center w-8 h-8 rounded-md border border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700';

    return (
      <li key={item.id} className={`py-3 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 ${isBusy ? 'opacity-60' : ''}`}>
        {/* Fecha */}
        <div className="sm:w-36 flex-shrink-0 flex sm:flex-col items-center sm:items-start gap-2 sm:gap-0.5">
          <span translate="no" className={`text-sm font-semibold tabular-nums ${section === 'overdue' || lateToday ? 'text-red-600 dark:text-red-400' : 'text-neutral-800 dark:text-neutral-100'}`}>
            {formatDue(item, section)}
          </span>
          {lateToday && <span className="text-xs text-red-600 dark:text-red-400">{t('leads.agenda.late')}</span>}
          {section === 'overdue' && overdueDays > 0 && (
            <span translate="no" className="text-xs text-red-600 dark:text-red-400">{t('leads.agenda.overdue_days', { n: overdueDays })}</span>
          )}
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <button type="button" onClick={openLead} className="text-left w-full group">
            <div className="flex items-center gap-2 min-w-0">
              <span aria-hidden="true">{ACTIVITY_ICON[item.type] || '•'}</span>
              <span className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400 flex-shrink-0">{typeLabel}</span>
              {item.title && (
                <span translate="no" className="font-medium text-neutral-800 dark:text-neutral-100 truncate group-hover:underline">{item.title}</span>
              )}
            </div>
            {item.body && (
              <p translate="no" className="text-sm text-neutral-600 dark:text-neutral-300 mt-0.5 line-clamp-2 break-words">{item.body}</p>
            )}
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
            <span translate="no" className="font-medium text-neutral-700 dark:text-neutral-200">
              {leadName || '—'}{lead.companyName ? <span className="font-normal text-neutral-500 dark:text-neutral-400"> · {lead.companyName}</span> : null}
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

        {/* Acciones */}
        <div className="flex flex-wrap items-center gap-1.5 sm:justify-end sm:flex-shrink-0">
          {wa && (
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className={linkCls} title={t('leads.agenda.whatsapp')} aria-label={t('leads.agenda.whatsapp')}>
              <ChatBubbleLeftRightIcon className="w-4 h-4" />
            </a>
          )}
          {lead.phone && (
            <a href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`} className={linkCls} title={t('leads.agenda.call')} aria-label={t('leads.agenda.call')}>
              <PhoneIcon className="w-4 h-4" />
            </a>
          )}
          {lead.email && (
            <a href={`mailto:${lead.email}`} className={linkCls} title={t('leads.agenda.send_email')} aria-label={t('leads.agenda.send_email')}>
              <EnvelopeIcon className="w-4 h-4" />
            </a>
          )}
          {canEditAct && <RescheduleMenu item={item} disabled={isBusy} onPick={d => reschedule(item, d)} />}
          <button
            type="button"
            onClick={openLead}
            className="px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            {t('leads.agenda.open_lead')}
          </button>
          {canEditAct && (
            <button
              type="button"
              onClick={() => complete(item)}
              disabled={isBusy}
              className="px-2.5 py-1.5 text-sm rounded-md bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-50"
            >
              ✓ {t('leads.agenda.complete')}
            </button>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">{t('leads.agenda.title')}</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{t('leads.agenda.subtitle')}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {agenda.timezone && <span translate="no">{t('leads.agenda.timezone', { tz: agenda.timezone })}</span>}
            {!loading && <span translate="no">{t('leads.agenda.total', { n: total })}</span>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canViewAll && (
            <div className="inline-flex rounded-md border border-neutral-300 dark:border-neutral-600 overflow-hidden" role="group">
              {(['mine', 'all'] as Scope[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setScope(s)}
                  aria-pressed={scope === s}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${scope === s
                    ? 'bg-primary text-white'
                    : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
                >
                  {t(`leads.agenda.scope.${s}`)}
                </button>
              ))}
            </div>
          )}
          <button type="button" onClick={() => load(true)} disabled={loading || refreshing} className={`${BUTTON_SECONDARY_SM_CLASSES} inline-flex items-center gap-1.5 !text-sm`}>
            <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> {t('leads.agenda.refresh')}
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton variant="list" rows={6} />
      ) : (
        <>
          {total === 0 && (
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6 text-center shadow-sm">
              <p className="text-neutral-600 dark:text-neutral-300">{t('leads.agenda.all_clear')}</p>
              <button type="button" onClick={() => navigate('/leads')} className={`${BUTTON_PRIMARY_SM_CLASSES} mt-3 !text-sm`}>{t('leads.agenda.go_to_leads')}</button>
            </div>
          )}
          {total > 0 && SECTIONS.map(k => {
            const items = agenda[k];
            const style = SECTION_STYLE[k];
            const isCollapsed = collapsed[k];
            return (
              <section key={k} className={`bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 border-l-4 ${style.border} shadow-sm`}>
                <button
                  type="button"
                  onClick={() => setCollapsed(c => ({ ...c, [k]: !c[k] }))}
                  aria-expanded={!isCollapsed}
                  aria-label={isCollapsed ? t('leads.agenda.expand') : t('leads.agenda.collapse')}
                  className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3 text-left"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className={`text-base font-semibold ${style.title}`}>{t(`leads.agenda.section.${k}`)}</span>
                    <span translate="no" className={`text-xs font-semibold px-2 py-0.5 rounded-full tabular-nums ${style.badge}`}>{items.length}</span>
                    {k === 'upcoming' && <span className="text-xs text-neutral-500 dark:text-neutral-400 hidden sm:inline">{t('leads.agenda.section.upcoming_hint')}</span>}
                  </span>
                  <ChevronDownIcon className={`w-4 h-4 text-neutral-500 dark:text-neutral-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                </button>
                {!isCollapsed && (
                  <div className="px-4 sm:px-5 pb-3 border-t border-neutral-100 dark:border-neutral-700">
                    {items.length === 0 ? (
                      <p className="py-4 text-sm text-neutral-500 dark:text-neutral-400">{t(`leads.agenda.empty.${k}`)}</p>
                    ) : (
                      <ul className="divide-y divide-neutral-100 dark:divide-neutral-700">
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
