import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Lead, Pipeline, LeadSource, LeadTag, LeadCustomField, GoalProgressRow, LeadDuplicate } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { usePermissions } from '../../hooks/usePermissions';
import { leadsService } from '../../services/leads';
import { clientsService } from '../../services/clients';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { Modal, ConfirmationModal } from '../../components/Modal';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { ImportModal, ImportFieldDef } from '../../components/ui/ImportModal';
import { LeadDetailModal } from '../../components/leads/LeadDetailModal';
import { TagChip } from '../../components/leads/TagChip';
import { useLeadAssignees } from '../../components/leads/useLeadAssignees';
import { DataTable, TableColumn } from '../../components/DataTable';
import { inputFormStyle, INPUT_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { MoneyInput } from '../../components/ui/MoneyInput';
import {
  PlusIcon, Squares2X2Icon, ListBulletIcon, MagnifyingGlassIcon, Cog6ToothIcon, DocumentArrowUpIcon, DocumentArrowDownIcon,
  DeleteIcon, ArrowUturnLeftIcon, ChevronLeftIcon, ChartBarIcon, UserIcon, TagIcon, ArrowPathIcon, ClockIcon,
  CalendarDaysIcon, ExclamationTriangleIcon,
} from '../../components/icons';

/** Etiqueta de campo de formulario (mismo estilo que el resto de modales de la app). */
const FIELD_LABEL_CLS = 'block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1';
/** Pie de modal estándar (Cancelar / Acción). */
const MODAL_FOOTER_CLS = 'flex justify-end gap-2 pt-4 border-t border-neutral-200 dark:border-neutral-700 mt-4';
/** Badge de estado (mismo estilo que los badges del dashboard de proyectos). */
const STATUS_BADGE_CLS: Record<Lead['status'], string> = {
  won: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  lost: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  open: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300',
};
/** Chip pequeño de las tarjetas (mismo estilo que los chips de TaskCard). */
const CARD_CHIP_CLS = 'flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded gap-0.5';
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

// Formato fijo $12,560.00 (coma de miles, 2 decimales) sin depender del idioma del navegador.
const money = (n?: number | null) => n != null ? `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';
const DAY = 86400000;
/** Días que un lead permanece en la papelera antes de purgarse automáticamente. */
const TRASH_DAYS = 30;

/** Táctil o pantalla angosta: el drag & drop HTML5 no funciona, se ofrece el botón "mover de etapa". */
const detectCompact = () => {
  try { return window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768; } catch { return false; }
};
const useCompactLayout = () => {
  const [compact, setCompact] = useState(detectCompact);
  useEffect(() => {
    const update = () => setCompact(detectCompact());
    let mq: MediaQueryList | null = null;
    try { mq = window.matchMedia('(pointer: coarse)'); mq.addEventListener?.('change', update); } catch { mq = null; }
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      try { mq?.removeEventListener?.('change', update); } catch { /* noop */ }
    };
  }, []);
  return compact;
};

type TFn = (key: string, params?: Record<string, string | number>) => string;

// Las etiquetas se traducen; los alias son heurísticas de auto-mapeo y se mantienen en ambos idiomas.
const buildImportFields = (t: TFn): ImportFieldDef[] => [
  { key: 'name', label: t('leads.common.first_name'), required: true, aliases: ['nombre', 'first name', 'firstname', 'contacto', 'cliente', 'contact'] },
  { key: 'lastName', label: t('leads.common.last_name'), aliases: ['apellidos', 'last name', 'lastname', 'surname'] },
  { key: 'companyName', label: t('leads.common.company'), aliases: ['compania', 'compañía', 'company', 'company name', 'negocio', 'organizacion', 'organization'] },
  { key: 'email', label: t('leads.common.email'), aliases: ['email', 'e-mail', 'correo electronico', 'mail'] },
  { key: 'email2', label: t('leads.common.email2'), aliases: ['email 2', 'email2', 'correo 2', 'segundo correo', 'otro correo', 'secondary email', 'alternate email'] },
  { key: 'phone', label: t('leads.common.phone'), aliases: ['telefono', 'phone', 'celular', 'movil', 'tel', 'mobile'] },
  { key: 'phone2', label: t('leads.common.phone2'), aliases: ['telefono 2', 'phone 2', 'phone2', 'tel 2', 'segundo telefono', 'otro telefono', 'secondary phone', 'alternate phone'] },
  { key: 'whatsapp', label: t('leads.common.channel.whatsapp'), aliases: ['wa', 'whatsapp'] },
  { key: 'value', label: t('leads.common.value'), type: 'number', aliases: ['monto', 'valor', 'importe', 'amount', 'presupuesto', 'value'] },
  { key: 'source', label: t('leads.common.source'), aliases: ['origen', 'source', 'canal'] },
  { key: 'stage', label: t('leads.common.stage'), aliases: ['estado', 'stage', 'status', 'fase'] },
  { key: 'assigneeEmail', label: t('leads.board.import.assignee_email'), aliases: ['responsable', 'vendedor', 'asignado', 'owner', 'owner email', 'assignee', 'assigned to'] },
  { key: 'expectedCloseAt', label: t('leads.common.expected_close'), type: 'date', aliases: ['fecha cierre', 'close date', 'cierre', 'expected close'] },
  { key: 'tags', label: t('leads.board.import.tags'), aliases: ['etiquetas', 'tags'] },
  { key: 'notes', label: t('leads.common.notes'), aliases: ['nota', 'notas', 'comentarios', 'observaciones', 'notes'] },
];

/** Datos con los que se precarga el modal de creación (p. ej. desde la ficha 360º del cliente). */
interface CreatePrefill {
  clientId?: string;
  clientLabel?: string;
  name?: string; lastName?: string; companyName?: string; email?: string; phone?: string;
}

export const LeadsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const { t, lang } = useTranslation();
  const { clients } = useData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const importFields = useMemo(() => buildImportFields(t), [lang]);

  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [tags, setTags] = useState<LeadTag[]>([]);
  const [customFields, setCustomFields] = useState<LeadCustomField[]>([]);
  const [coldDays, setColdDays] = useState(7);
  const [lostReasons, setLostReasons] = useState<string[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [pipelineId, setPipelineId] = useState('');
  const [view, setView] = useState<'board' | 'list'>(() => { try { return (localStorage.getItem('pazzi_leads_view') as any) || 'board'; } catch { return 'board'; } });
  const [search, setSearch] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterStatus, setFilterStatus] = useState<'' | 'open' | 'won' | 'lost'>('');
  const [filterTag, setFilterTag] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [onlyCold, setOnlyCold] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createPrefill, setCreatePrefill] = useState<CreatePrefill | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [bulkModal, setBulkModal] = useState<null | 'assign' | 'stage' | 'tag'>(null);
  const [bulkValue, setBulkValue] = useState('');
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const openedRef = React.useRef<string | null>(null);
  const [myGoals, setMyGoals] = useState<GoalProgressRow | null>(null);
  const compact = useCompactLayout();
  const [moveForId, setMoveForId] = useState<string | null>(null);
  // Papelera
  const canDelete = can('leads.delete');
  const [trashMode, setTrashMode] = useState(false);
  const [trash, setTrash] = useState<Lead[] | null>(null); // null = aún no se conoce
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashBusy, setTrashBusy] = useState(false);
  const [trashChecked, setTrashChecked] = useState<Set<string>>(new Set());
  const [confirmPurge, setConfirmPurge] = useState<string[] | null>(null);
  const currentPidRef = React.useRef('');
  useEffect(() => {
    leadsService.goalsProgress().then(r => setMyGoals(r.rows.find(x => x.userId === currentUser?.id) || null)).catch(() => {});
  }, [currentUser?.id]);

  const pipeline = useMemo(() => pipelines.find(p => p.id === pipelineId) || pipelines.find(p => p.isDefault) || pipelines[0], [pipelines, pipelineId]);
  const stages = pipeline?.stages || [];
  const setViewPersist = (v: 'board' | 'list') => { setView(v); try { localStorage.setItem('pazzi_leads_view', v); } catch { /* noop */ } };

  const assignees = useLeadAssignees();
  const empName = (uid?: string | null, forExport = false) => {
    if (!uid) return t('leads.common.unassigned');
    if (uid === currentUser?.id && !forExport) return t('leads.common.me');
    return assignees.find(a => a.uid === uid)?.name || t('leads.common.assignee');
  };

  const loadConfig = async () => {
    const cfg = await leadsService.getConfig();
    setPipelines(cfg.pipelines); setSources(cfg.sources); setTags(cfg.tags || []); setCustomFields(cfg.customFields || []);
    setColdDays(cfg.settings?.coldDays || 7); setLostReasons(cfg.settings?.lostReasons || []);
    return cfg;
  };

  const loadLeads = async (pid: string) => {
    currentPidRef.current = pid;
    const rows = await leadsService.list({ pipelineId: pid });
    setLeads(rows);
  };

  // Papelera del pipeline actual. Silenciosa salvo que se pida explícitamente (al abrirla).
  const loadTrash = async (pid: string, opts?: { spinner?: boolean; notifyError?: boolean }) => {
    if (!canDelete || !pid) return;
    if (opts?.spinner) setTrashLoading(true);
    try {
      const rows = await leadsService.list({ pipelineId: pid, archived: '1' });
      if (currentPidRef.current !== pid) return; // cambió de pipeline mientras cargaba
      const list = (rows || []).filter(l => !!l.archivedAt);
      setTrash(list);
      setTrashChecked(prev => {
        if (!prev.size) return prev;
        const ids = new Set(list.map(l => l.id));
        return new Set(Array.from(prev).filter(id => ids.has(id)));
      });
    } catch (err) {
      if (opts?.notifyError) toast.error(err instanceof ApiError ? err.message : t('leads.board.trash.load_error'));
    } finally { if (opts?.spinner) setTrashLoading(false); }
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const cfg = await loadConfig();
        const def = cfg.pipelines.find(p => p.isDefault) || cfg.pipelines[0];
        const pid = def?.id || '';
        setPipelineId(pid);
        if (pid) { await loadLeads(pid); loadTrash(pid); }
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : t('leads.board.load_error'));
      } finally { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changePipeline = async (pid: string) => {
    setPipelineId(pid); setChecked(new Set());
    currentPidRef.current = pid;
    setTrash(null); setTrashChecked(new Set());
    loadTrash(pid, { spinner: trashMode, notifyError: trashMode });
    try { await loadLeads(pid); } catch { /* noop */ }
  };

  const enterTrash = () => {
    setTrashMode(true); setChecked(new Set()); setTrashChecked(new Set());
    loadTrash(pipeline?.id || '', { spinner: trash === null, notifyError: true });
  };
  const exitTrash = () => { setTrashMode(false); setTrashChecked(new Set()); };

  const removeFromTrash = (ids: string[]) => {
    const gone = new Set(ids);
    setTrash(prev => prev ? prev.filter(l => !gone.has(l.id)) : prev);
    setTrashChecked(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n; });
  };

  const restoreLeads = async (ids: string[]) => {
    if (!ids.length) return;
    setTrashBusy(true);
    try {
      let n = ids.length;
      if (ids.length === 1) await leadsService.restore(ids[0]);
      else n = (await leadsService.bulk(ids, 'restore')).affected;
      toast.success(t('leads.board.trash.restored', { n }));
      removeFromTrash(ids);
      await loadLeads(pipeline?.id || '');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('leads.board.trash.error'));
      loadTrash(pipeline?.id || '');
    } finally { setTrashBusy(false); }
  };

  const purgeLeads = async (ids: string[]) => {
    if (!ids.length) return;
    setTrashBusy(true);
    try {
      let n = ids.length;
      if (ids.length === 1) await leadsService.purge(ids[0]);
      else n = (await leadsService.bulk(ids, 'purge')).affected;
      toast.success(t('leads.board.trash.purged', { n }));
      removeFromTrash(ids);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('leads.board.trash.error'));
      loadTrash(pipeline?.id || '');
    } finally { setTrashBusy(false); }
  };

  // Deep-links: ?lead=<id> abre la ficha; ?cold=1 activa el filtro de leads fríos.
  useEffect(() => {
    if (searchParams.get('cold') === '1') {
      setOnlyCold(true); setFilterStatus('open');
      const next = new URLSearchParams(searchParams); next.delete('cold'); setSearchParams(next, { replace: true });
    }
    const lid = searchParams.get('lead');
    // Sin ?lead= se "olvida" el último abierto, para que otra notificación del mismo lead vuelva a abrirlo.
    if (!lid) { openedRef.current = null; return; }
    if (openedRef.current === lid) return;
    const found = leads.find(l => l.id === lid);
    const open = (l: Lead) => {
      openedRef.current = lid;
      setSelected(l);
      const next = new URLSearchParams(searchParams); next.delete('lead'); setSearchParams(next, { replace: true });
    };
    if (found) open(found);
    else if (!loading) {
      // Puede estar en otro pipeline: lo pedimos directo.
      leadsService.get(lid).then(l => { if (l.pipelineId !== pipelineId) changePipeline(l.pipelineId); open(l); }).catch(() => { openedRef.current = lid; });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, leads, loading]);

  // Deep-link: ?new=1 abre "Nuevo lead" (búsqueda global / ficha 360º); ?clientId=<id> lo vincula y precarga con ese cliente.
  useEffect(() => {
    if (searchParams.get('new') !== '1' || loading) return;
    const cid = searchParams.get('clientId') || '';
    const next = new URLSearchParams(searchParams); next.delete('new'); next.delete('clientId'); setSearchParams(next, { replace: true });
    if (!can('leads.create')) return;
    const fromClient = (c: { name?: string | null; lastName?: string | null; companyName?: string | null; email?: string | null; phone?: string | null }): CreatePrefill => ({
      clientId: cid,
      clientLabel: `${c.name || ''} ${c.lastName || ''}`.trim() || c.companyName || c.email || cid,
      name: c.name || '', lastName: c.lastName || '', companyName: c.companyName || '', email: c.email || '', phone: c.phone || '',
    });
    if (!cid) { setCreatePrefill(null); setShowCreate(true); return; }
    const c = clients.find(x => x.id === cid);
    if (c) { setCreatePrefill(fromClient(c)); setShowCreate(true); return; }
    // Clientes aún no cargados en memoria: se pide al servidor.
    clientsService.getById(cid)
      .then(rec => setCreatePrefill(fromClient(rec as any)))
      .catch(() => setCreatePrefill({ clientId: cid }))
      .finally(() => setShowCreate(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, loading]);

  const isCold = (l: Lead) => l.status === 'open' && (Date.now() - new Date(l.lastActivityAt || l.createdAt).getTime()) > coldDays * DAY;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter(l => {
      if (filterAssignee && (filterAssignee === 'none' ? !!l.assignedUserId : (l.assignedUserId || '') !== filterAssignee)) return false;
      if (filterStatus && l.status !== filterStatus) return false;
      if (filterTag && !(l.tagIds || []).includes(filterTag)) return false;
      if (filterSource && (l.sourceId || '') !== filterSource) return false;
      if (onlyCold && !isCold(l)) return false;
      if (!q) return true;
      return `${l.name} ${l.lastName || ''} ${l.companyName || ''} ${l.email || ''} ${l.phone || ''} ${l.whatsapp || ''}`.toLowerCase().includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, search, filterAssignee, filterStatus, filterTag, filterSource, onlyCold, coldDays]);

  const byStage = useMemo(() => {
    const m: Record<string, Lead[]> = {};
    stages.forEach(s => { m[s.id] = []; });
    for (const l of filtered) (m[l.stageId] || (m[l.stageId] = [])).push(l);
    Object.values(m).forEach(list => list.sort((a, b) => a.order - b.order));
    return m;
  }, [filtered, stages]);

  const totals = useMemo(() => {
    const open = filtered.filter(l => l.status === 'open');
    return {
      openValue: open.reduce((a, l) => a + (l.value || 0), 0),
      cold: leads.filter(isCold).length,
      overdue: leads.filter(l => l.status === 'open' && l.nextActionAt && new Date(l.nextActionAt).getTime() < Date.now()).length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, leads, coldDays]);

  const onChanged = (lead: Lead) => setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, ...lead } : l));
  const onDeleted = (id: string) => {
    setLeads(prev => prev.filter(l => l.id !== id));
    setChecked(prev => { if (!prev.has(id)) return prev; const n = new Set(prev); n.delete(id); return n; });
    // Eliminar = enviar a la papelera: se refresca su contador.
    loadTrash(pipeline?.id || '');
  };

  // La selección masiva solo cuenta lo que se ve: al cambiar filtros se descartan los ocultos.
  useEffect(() => {
    setChecked(prev => {
      if (!prev.size) return prev;
      const visible = new Set(filtered.map(l => l.id));
      const n = new Set(Array.from(prev).filter(id => visible.has(id)));
      return n.size === prev.size ? prev : n;
    });
  }, [filtered]);

  const canMove = can('leads.changeStage') || can('leads.edit');

  // ── Drag & drop: soltar en columna (mueve al final) o sobre una tarjeta (inserta antes de ella).
  const handleDrop = (stageId: string, beforeLeadId?: string) => {
    const id = draggedId; setDraggedId(null);
    if (!id) return;
    moveLead(id, stageId, beforeLeadId);
  };

  // Lógica común de mover (drag & drop en escritorio y botón "mover de etapa" en táctil/móvil).
  const moveLead = async (id: string, stageId: string, beforeLeadId?: string) => {
    if (id === beforeLeadId) return;
    const lead = leads.find(l => l.id === id);
    if (!lead) return;
    const st = stages.find(s => s.id === stageId);
    if (st?.type === 'lost' && lead.stageId !== stageId) {
      // Para perder se pide motivo en la ficha.
      setSelected(lead);
      toast.warning(t('leads.board.lost_reason_hint'));
      return;
    }
    // Se reordena la columna COMPLETA (sin filtros); si no, los leads ocultos por un filtro chocarían de posición.
    const column = leads.filter(l => l.stageId === stageId && l.id !== id).sort((a, b) => a.order - b.order);
    const idx = beforeLeadId ? column.findIndex(l => l.id === beforeLeadId) : -1;
    const ordered = [...column];
    ordered.splice(idx >= 0 ? idx : ordered.length, 0, { ...lead, stageId });
    const newStatus = st?.type === 'won' ? 'won' : st?.type === 'lost' ? 'lost' : 'open';
    setLeads(prev => prev.map(l => {
      const pos = ordered.findIndex(o => o.id === l.id);
      if (l.id === id) return { ...l, stageId, status: newStatus as any, order: pos };
      return pos >= 0 ? { ...l, order: pos } : l;
    }));
    try {
      if (lead.stageId !== stageId) await leadsService.moveStage(id, stageId, { order: ordered.findIndex(o => o.id === id) });
      await leadsService.reorder(ordered.map(o => o.id));
    } catch { toast.error(t('leads.board.move_error')); loadLeads(pipeline?.id || ''); }
  };

  // ── Selección y acciones masivas ──
  // (La selección de la vista lista la gestiona DataTable vía selectedIds/onSelectionChange sobre `checked`.)
  const runBulk = async (action: 'assign' | 'stage' | 'tag' | 'untag' | 'delete', extra?: any) => {
    const ids = Array.from(checked);
    if (!ids.length) return;
    try {
      const r = await leadsService.bulk(ids, action, extra);
      toast.success(t(action === 'delete' ? 'leads.board.bulk.trashed' : 'leads.board.bulk.updated', { n: r.affected }));
      setChecked(new Set()); setBulkModal(null); setBulkValue('');
      await loadLeads(pipeline?.id || '');
      if (action === 'delete') loadTrash(pipeline?.id || '');
    } catch (err) { toast.error(err instanceof ApiError ? err.message : t('leads.board.bulk.error')); }
  };

  // ── Exportar (lo que se ve con los filtros actuales) ──
  const exportExcel = () => {
    const stageName = (id: string) => stages.find(s => s.id === id)?.name || '';
    const srcName = (id?: string | null) => sources.find(s => s.id === id)?.name || '';
    const tagNames = (ids?: string[]) => (ids || []).map(id => tags.find(tg => tg.id === id)?.name).filter(Boolean).join(', ');
    const statusLabel = (s: Lead['status']) => t(s === 'won' ? 'leads.common.status.won' : s === 'lost' ? 'leads.common.status.lost' : 'leads.common.status.open');
    const yes = t('leads.common.yes'), no = t('leads.common.no');
    const rows = filtered.map(l => {
      const base: Record<string, any> = {
        [t('leads.common.first_name')]: l.name, [t('leads.common.last_name')]: l.lastName || '', [t('leads.common.company')]: l.companyName || '',
        [t('leads.common.email')]: l.email || '', [t('leads.common.phone')]: l.phone || '',
        [t('leads.common.channel.whatsapp')]: l.whatsapp || '', [t('leads.common.stage')]: stageName(l.stageId), [t('leads.board.export.status')]: statusLabel(l.status),
        [t('leads.board.export.lost_reason')]: l.lostReason || '', [t('leads.common.value')]: l.value ?? '', [t('leads.common.probability')]: l.probability ?? '',
        [t('leads.common.assignee')]: empName(l.assignedUserId, true),
        [t('leads.common.source')]: srcName(l.sourceId), [t('leads.common.tags')]: tagNames(l.tagIds),
        [t('leads.common.expected_close')]: l.expectedCloseAt ? new Date(l.expectedCloseAt).toLocaleDateString() : '',
        [t('leads.common.next_action')]: l.nextActionAt ? new Date(l.nextActionAt).toLocaleString() : '',
        [t('leads.common.last_activity')]: l.lastActivityAt ? new Date(l.lastActivityAt).toLocaleString() : '',
        [t('leads.common.created')]: new Date(l.createdAt).toLocaleString(), [t('leads.common.notes')]: l.notes || '',
      };
      customFields.forEach(f => { const v = l.customFields?.[f.id]; base[f.label] = v === true ? yes : v === false ? no : (v ?? ''); });
      return base;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t('leads.common.leads'));
    XLSX.writeFile(wb, `leads-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const filtersActive = !!(search || filterAssignee || filterStatus || filterTag || filterSource || onlyCold);
  const clearFilters = () => { setSearch(''); setFilterAssignee(''); setFilterStatus(''); setFilterTag(''); setFilterSource(''); setOnlyCold(false); };

  const selectCls = INPUT_SM_CLASSES;
  const statusLabel = (s: Lead['status']) => t(s === 'won' ? 'leads.common.status.won' : s === 'lost' ? 'leads.common.status.lost' : 'leads.common.status.open');
  const tagNamesOf = (ids?: string[]) => (ids || []).map(id => tags.find(tg => tg.id === id)?.name).filter(Boolean).join(', ');

  // ── Columnas de la vista lista (DataTable estándar) ──
  const listColumns: TableColumn<Lead>[] = [
    {
      header: t('leads.board.col.name'),
      sortKey: 'name',
      sortValue: l => `${l.name} ${l.lastName || ''}`.trim(),
      filterValue: l => `${l.name} ${l.lastName || ''} ${l.companyName || ''}`,
      filterType: 'text',
      accessor: l => (
        <div className="min-w-0">
          <p className="font-medium text-neutral-800 dark:text-neutral-100 flex items-center gap-1.5">
            <span translate="no">{l.name} {l.lastName}</span>
            {isCold(l) && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300" title={t('leads.board.no_followup')}><span translate="no">{t('leads.board.cold_badge')}</span></span>}
          </p>
          {l.companyName && <p className="text-xs text-neutral-500 dark:text-neutral-400"><span translate="no">{l.companyName}</span></p>}
        </div>
      ),
    },
    {
      header: t('leads.common.stage'),
      sortKey: 'stage',
      sortValue: l => { const i = stages.findIndex(s => s.id === l.stageId); return i < 0 ? null : i; },
      filterValue: l => stages.find(s => s.id === l.stageId)?.name || '',
      accessor: l => {
        const st = stages.find(s => s.id === l.stageId);
        return <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: st?.color || '#94a3b8' }} /><span translate="no">{st?.name || '—'}</span></span>;
      },
    },
    {
      header: t('leads.common.value'),
      sortKey: 'value',
      sortValue: l => l.value ?? null,
      filterType: 'none',
      className: 'tabular-nums',
      accessor: l => l.value != null ? <span className="font-semibold">{money(l.value)}</span> : '—',
    },
    {
      header: t('leads.common.assignee'),
      sortKey: 'assignee',
      sortValue: l => empName(l.assignedUserId),
      accessor: l => <span className="text-neutral-600 dark:text-neutral-300"><span translate="no">{empName(l.assignedUserId)}</span></span>,
    },
    {
      header: t('leads.common.tags'),
      sortKey: 'tags',
      sortable: false,
      filterValue: l => tagNamesOf(l.tagIds),
      filterType: 'text',
      noWrap: false,
      accessor: l => (l.tagIds || []).length ? (
        <div className="flex flex-wrap gap-1">{(l.tagIds || []).map(id => { const tg = tags.find(x => x.id === id); return tg ? <TagChip key={id} tag={tg} small /> : null; })}</div>
      ) : <span className="text-neutral-400">—</span>,
    },
    {
      header: t('leads.board.col.status'),
      sortKey: 'status',
      sortValue: l => l.status,
      filterValue: l => statusLabel(l.status),
      accessor: l => <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${STATUS_BADGE_CLS[l.status] || STATUS_BADGE_CLS.open}`}><span translate="no">{statusLabel(l.status)}</span></span>,
    },
    {
      header: t('leads.board.col.next_action'),
      sortKey: 'nextActionAt',
      sortValue: l => l.nextActionAt ? new Date(l.nextActionAt).getTime() : null,
      filterType: 'none',
      accessor: l => {
        if (!l.nextActionAt) return <span className="text-neutral-400">—</span>;
        const overdue = l.status === 'open' && new Date(l.nextActionAt).getTime() < Date.now();
        return <span className={`text-sm ${overdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-neutral-500 dark:text-neutral-400'}`}>{new Date(l.nextActionAt).toLocaleDateString()}</span>;
      },
    },
  ];

  // ── Columnas de la papelera ──
  const trashDaysLeft = (l: Lead) => {
    const deletedAt = l.archivedAt ? new Date(l.archivedAt) : null;
    return deletedAt ? Math.max(0, TRASH_DAYS - Math.floor((Date.now() - deletedAt.getTime()) / DAY)) : TRASH_DAYS;
  };
  const trashColumns: TableColumn<Lead>[] = [
    {
      header: t('leads.board.col.name'),
      sortKey: 'name',
      sortValue: l => `${l.name} ${l.lastName || ''}`.trim(),
      filterType: 'text',
      accessor: l => <span className="font-medium text-neutral-800 dark:text-neutral-100"><span translate="no">{l.name} {l.lastName}</span></span>,
    },
    {
      header: t('leads.common.company'),
      sortKey: 'companyName',
      sortValue: l => l.companyName || '',
      filterType: 'text',
      accessor: l => <span className="text-neutral-500 dark:text-neutral-400"><span translate="no">{l.companyName || '—'}</span></span>,
    },
    {
      header: t('leads.common.value'),
      sortKey: 'value',
      sortValue: l => l.value ?? null,
      filterType: 'none',
      className: 'tabular-nums',
      accessor: l => l.value != null ? money(l.value) : '—',
    },
    {
      header: t('leads.board.trash.col.deleted'),
      sortKey: 'archivedAt',
      sortValue: l => l.archivedAt ? new Date(l.archivedAt).getTime() : null,
      filterType: 'none',
      accessor: l => <span className="text-neutral-500 dark:text-neutral-400">{l.archivedAt ? new Date(l.archivedAt).toLocaleDateString() : '—'}</span>,
    },
    {
      header: t('leads.board.trash.col.days_left'),
      sortKey: 'daysLeft',
      sortValue: l => trashDaysLeft(l),
      filterType: 'none',
      accessor: l => {
        const left = trashDaysLeft(l);
        return (
          <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${left <= 3 ? STATUS_BADGE_CLS.lost : STATUS_BADGE_CLS.open}`}>
            <span translate="no">{left === 0 ? t('leads.board.trash.today') : t('leads.board.trash.days_left', { n: left })}</span>
          </span>
        );
      },
    },
  ];

  const statusTabs: { value: '' | 'open' | 'won' | 'lost'; label: string }[] = [
    { value: '', label: t('leads.board.filter.all') },
    { value: 'open', label: t('leads.common.status.open_pl') },
    { value: 'won', label: t('leads.common.status.won_pl') },
    { value: 'lost', label: t('leads.common.status.lost_pl') },
  ];
  const headerBtnCls = `${BUTTON_SECONDARY_SM_CLASSES} inline-flex items-center gap-1.5 flex-shrink-0`;
  const bulkBtnCls = `${BUTTON_SECONDARY_SM_CLASSES} inline-flex items-center gap-1.5`;
  const emptyBlock = (title: string) => (
    <div className="text-center py-16 bg-white dark:bg-neutral-800 rounded-lg shadow-sm">
      <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-200">{title}</h3>
    </div>
  );

  return (
    <div>
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">{t('leads.common.leads')}</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            <span translate="no">{t('leads.board.summary', { n: filtered.length, value: money(totals.openValue) || '$0' })}</span>
            {totals.overdue > 0 && <span translate="no" className="ml-2 text-red-600 dark:text-red-400">{t('leads.board.overdue_count', { n: totals.overdue })}</span>}
            {totals.cold > 0 && <button type="button" translate="no" onClick={() => { setOnlyCold(true); setFilterStatus('open'); }} className="ml-2 text-amber-600 dark:text-amber-400 hover:underline">{t('leads.board.cold_count', { n: totals.cold })}</button>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {can('leads.managePipeline') && (
            <button onClick={() => navigate('/leads/settings')} className={headerBtnCls} title={t('leads.board.configure')} aria-label={t('leads.board.configure')}>
              <Cog6ToothIcon className="w-5 h-5" /><span className="hidden md:inline">{t('leads.board.configure')}</span>
            </button>
          )}
          {can('leads.import') && (
            <button onClick={() => setShowImport(true)} className={headerBtnCls} title={t('leads.board.import')} aria-label={t('leads.board.import')}>
              <DocumentArrowUpIcon className="w-5 h-5" /><span className="hidden md:inline">{t('leads.board.import')}</span>
            </button>
          )}
          {can('leads.export') && (
            <button onClick={exportExcel} disabled={!filtered.length} className={`${headerBtnCls} disabled:opacity-50 disabled:cursor-not-allowed`} title={t('leads.board.export')} aria-label={t('leads.board.export')}>
              <DocumentArrowDownIcon className="w-5 h-5" /><span className="hidden md:inline">{t('leads.board.export')}</span>
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => trashMode ? exitTrash() : enterTrash()}
              className={`${trashMode ? BUTTON_PRIMARY_SM_CLASSES : BUTTON_SECONDARY_SM_CLASSES} inline-flex items-center gap-1.5 flex-shrink-0`}
              title={t('leads.board.trash.tooltip')}
              aria-label={t('leads.board.trash.button')}
              aria-pressed={trashMode}
            >
              <DeleteIcon className="w-5 h-5" />
              <span translate="no" className="hidden md:inline">{trash && trash.length > 0 ? t('leads.board.trash.button_count', { n: trash.length }) : t('leads.board.trash.button')}</span>
              {trash && trash.length > 0 && <span translate="no" className="md:hidden text-sm tabular-nums">{trash.length}</span>}
            </button>
          )}
          {can('leads.create') && (
            <button onClick={() => { setCreatePrefill(null); setShowCreate(true); }} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center flex-shrink-0`}>
              <PlusIcon className="w-5 h-5" /> {t('leads.board.new_lead')}
            </button>
          )}
        </div>
      </div>

      {/* Mis metas del mes */}
      {myGoals && myGoals.goals.length > 0 && (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0"><ChartBarIcon className="w-4 h-4" /></span>
            <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">{t('leads.board.my_goals')}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {myGoals.goals.map(g => (
              <div key={g.metric} className="min-w-0" title={`${g.actual} / ${g.target}`}>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 truncate">{t(g.metric === 'won_count' ? 'leads.common.metric_short.won_count' : g.metric === 'won_value' ? 'leads.common.metric_short.won_value' : g.metric === 'activities' ? 'leads.common.metric_short.activities' : 'leads.common.metric_short.new_leads')}</p>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 tabular-nums flex-shrink-0">{g.pct}%</span>
                </div>
                <div className="mt-2 h-1.5 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, g.pct)}%`, background: g.pct >= 100 ? '#16a34a' : g.pct >= 60 ? '#f59e0b' : '#0D9488' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      {!trashMode && (
        <>
          {/* Buscador (mismo estilo que Proyectos) */}
          <div className="mb-4">
            <div className="relative max-w-md">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('leads.board.search_placeholder')}
                className="w-full pl-10 pr-9 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                  aria-label={t('leads.board.search_clear')}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Filtros secundarios (selects compactos, como en Productos) */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {pipelines.length > 1 && (
              <select value={pipeline?.id || ''} onChange={e => changePipeline(e.target.value)} className={selectCls} title={t('leads.common.pipeline')} aria-label={t('leads.common.pipeline')}>
                {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} className={selectCls} aria-label={t('leads.common.assignee')}>
              <option value="">{t('leads.board.filter.all_assignees')}</option>
              {currentUser && <option value={currentUser.id}>{t('leads.board.filter.my_leads')}</option>}
              <option value="none">{t('leads.common.unassigned')}</option>
              {assignees.filter(a => a.uid !== currentUser?.id).map(a => <option key={a.uid} value={a.uid}>{a.name}</option>)}
            </select>
            {tags.length > 0 && (
              <select value={filterTag} onChange={e => setFilterTag(e.target.value)} className={selectCls} aria-label={t('leads.common.tags')}>
                <option value="">{t('leads.board.filter.all_tags')}</option>
                {tags.map(tg => <option key={tg.id} value={tg.id}>{tg.name}</option>)}
              </select>
            )}
            <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className={selectCls} aria-label={t('leads.common.source')}>
              <option value="">{t('leads.board.filter.all_sources')}</option>
              {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <label className="h-9 inline-flex items-center gap-2 px-2.5 text-sm text-neutral-700 dark:text-neutral-200 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-600 rounded-md shadow-sm cursor-pointer select-none">
              <input type="checkbox" checked={onlyCold} onChange={e => setOnlyCold(e.target.checked)} className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary" />
              <span translate="no">{t('leads.board.filter.only_cold', { days: coldDays })}</span>
            </label>
            {filtersActive && <button type="button" onClick={clearFilters} className="text-sm text-primary hover:underline flex-shrink-0">{t('leads.board.filter.clear')}</button>}
          </div>

          {/* Estado (pestañas) + vista */}
          <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
            <div className="flex items-center gap-1 flex-wrap">
              {statusTabs.map(s => {
                const activeTab = filterStatus === s.value;
                return (
                  <button
                    key={s.value || 'all'}
                    type="button"
                    onClick={() => setFilterStatus(s.value)}
                    className={`px-3.5 py-1.5 text-sm font-medium rounded-full transition-colors ${activeTab ? 'bg-primary text-white shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}
                    aria-pressed={activeTab}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center bg-neutral-100 dark:bg-neutral-700 p-0.5 rounded-md flex-shrink-0">
              <button onClick={() => setViewPersist('board')} className={`p-1.5 rounded-md ${view === 'board' ? 'bg-primary text-white shadow' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'}`} title={t('leads.board.view.board')} aria-label={t('leads.board.view.board_aria')}><Squares2X2Icon className="w-5 h-5" /></button>
              <button onClick={() => setViewPersist('list')} className={`p-1.5 rounded-md ${view === 'list' ? 'bg-primary text-white shadow' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600'}`} title={t('leads.board.view.list')} aria-label={t('leads.board.view.list_aria')}><ListBulletIcon className="w-5 h-5" /></button>
            </div>
          </div>
        </>
      )}

      {/* Barra de acciones masivas */}
      {!trashMode && checked.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-xl bg-primary/10 border border-primary/30">
          <span translate="no" className="text-sm font-semibold text-primary dark:text-teal-300 mr-1">{t('leads.board.bulk.selected', { n: checked.size })}</span>
          {can('leads.assign') && <button onClick={() => { setBulkModal('assign'); setBulkValue(''); }} className={bulkBtnCls}><UserIcon className="w-4 h-4" />{t('leads.board.bulk.assign')}</button>}
          {(can('leads.changeStage') || can('leads.edit')) && <button onClick={() => { setBulkModal('stage'); setBulkValue(stages[0]?.id || ''); }} className={bulkBtnCls}><ArrowPathIcon className="w-4 h-4" />{t('leads.board.bulk.move_stage')}</button>}
          {can('leads.edit') && tags.length > 0 && <button onClick={() => { setBulkModal('tag'); setBulkValue(tags[0]?.id || ''); }} className={bulkBtnCls}><TagIcon className="w-4 h-4" />{t('leads.board.bulk.tag')}</button>}
          {can('leads.delete') && <button onClick={() => setConfirmBulkDelete(true)} className={`${bulkBtnCls} !text-red-600 dark:!text-red-400`}><DeleteIcon className="w-4 h-4" />{t('leads.board.bulk.delete')}</button>}
          <button onClick={() => setChecked(new Set())} className="ml-auto text-sm text-neutral-500 dark:text-neutral-400 hover:underline">{t('leads.board.bulk.clear_selection')}</button>
        </div>
      )}

      {loading ? (view === 'list' && !trashMode ? <LoadingSkeleton variant="table" rows={8} /> : <LoadingSkeleton variant="cards" count={4} />) : trashMode ? (
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <button onClick={exitTrash} className={`${BUTTON_SECONDARY_SM_CLASSES} inline-flex items-center gap-1.5`}><ChevronLeftIcon className="w-4 h-4" />{t('leads.board.trash.back')}</button>
            <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">{t('leads.board.trash.title')}</h2>
            {pipelines.length > 1 && (
              <select value={pipeline?.id || ''} onChange={e => changePipeline(e.target.value)} className={selectCls + ' ml-auto'} title={t('leads.common.pipeline')} aria-label={t('leads.common.pipeline')}>
                {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
          </div>
          <div className="mb-4 flex items-start gap-2 text-sm px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60">
            <ClockIcon className="w-5 h-5 flex-shrink-0" />
            <span>{t('leads.board.trash.notice')}</span>
          </div>
          {trashChecked.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-xl bg-primary/10 border border-primary/30">
              <span translate="no" className="text-sm font-semibold text-primary dark:text-teal-300 mr-1">{t('leads.board.bulk.selected', { n: trashChecked.size })}</span>
              <button disabled={trashBusy} onClick={() => restoreLeads(Array.from(trashChecked))} className={`${bulkBtnCls} disabled:opacity-50`}><ArrowUturnLeftIcon className="w-4 h-4" />{t('leads.board.trash.restore')}</button>
              <button disabled={trashBusy} onClick={() => setConfirmPurge(Array.from(trashChecked))} className={`${bulkBtnCls} !text-red-600 dark:!text-red-400 disabled:opacity-50`}><DeleteIcon className="w-4 h-4" />{t('leads.board.trash.purge')}</button>
              <button onClick={() => setTrashChecked(new Set())} className="ml-auto text-sm text-neutral-500 dark:text-neutral-400 hover:underline">{t('leads.board.bulk.clear_selection')}</button>
            </div>
          )}
          {trashLoading && trash === null ? <LoadingSkeleton variant="table" rows={4} /> : (trash || []).length === 0 ? emptyBlock(t('leads.board.trash.empty')) : (
            <DataTable<Lead>
              tableId="leads-trash"
              data={trash || []}
              columns={trashColumns}
              searchable={false}
              selectedIds={Array.from(trashChecked)}
              onSelectionChange={ids => setTrashChecked(new Set(ids))}
              actions={l => (
                <div className="flex space-x-1">
                  <button disabled={trashBusy} onClick={() => restoreLeads([l.id])} className="text-primary hover:text-secondary dark:text-teal-300 p-1 disabled:opacity-30 disabled:cursor-not-allowed" title={t('leads.board.trash.restore')} aria-label={t('leads.board.trash.restore')}><ArrowUturnLeftIcon className="w-5 h-5" /></button>
                  <button disabled={trashBusy} onClick={() => setConfirmPurge([l.id])} className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1 disabled:opacity-30 disabled:cursor-not-allowed" title={t('leads.board.trash.purge')} aria-label={t('leads.board.trash.purge')}><DeleteIcon className="w-5 h-5" /></button>
                </div>
              )}
            />
          )}
        </div>
      ) : view === 'board' ? (
        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 items-start snap-x snap-mandatory md:snap-none scroll-smooth -mx-1 px-1">
          {stages.map(stage => {
            const list = byStage[stage.id] || [];
            const total = list.reduce((a, l) => a + (l.value || 0), 0);
            return (
              <div key={stage.id} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handleDrop(stage.id); }} className="bg-slate-100 dark:bg-slate-800 rounded-xl p-2 flex flex-col w-[85vw] max-w-[20rem] sm:w-72 flex-shrink-0 max-h-[75vh] snap-start">
                <div className="mb-3 px-2">
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300 flex justify-between items-center text-lg gap-1">
                    <span className="flex items-center gap-2 min-w-0"><span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: stage.color || '#94a3b8' }} /><span className="truncate" translate="no" title={stage.name}>{stage.name}</span></span>
                    <span translate="no" className="text-sm text-gray-500 flex-shrink-0">{list.length}</span>
                  </h3>
                  {total > 0 && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5"><span translate="no">{money(total)}{stage.type === 'open' && stage.probability != null ? t('leads.board.weighted', { value: money(total * (stage.probability / 100)) }) : ''}</span></p>}
                </div>
                <div className="space-y-2 overflow-y-auto flex-grow min-h-[100px] p-1">
                  {list.map(lead => {
                    const overdue = lead.status === 'open' && !!lead.nextActionAt && new Date(lead.nextActionAt).getTime() < Date.now();
                    const cold = isCold(lead);
                    const assigneeLabel = empName(lead.assignedUserId);
                    const showChips = !!lead.nextActionAt || (!!lead.expectedCloseAt && lead.status === 'open') || cold;
                    return (
                      <div key={lead.id} draggable={canMove}
                        onDragStart={e => { if (!canMove) return; e.dataTransfer.setData('text/plain', lead.id); e.dataTransfer.effectAllowed = 'move'; setDraggedId(lead.id); }}
                        onDragEnd={() => setDraggedId(null)}
                        onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); e.stopPropagation(); handleDrop(stage.id, lead.id); }} onClick={() => setSelected(lead)}
                        className={`relative bg-white dark:bg-slate-700 rounded-lg shadow hover:shadow-lg ${canMove ? 'cursor-grab' : 'cursor-pointer'} border-l-4 transition-all duration-150 overflow-hidden ${draggedId === lead.id ? 'opacity-50' : ''}`} style={{ borderLeftColor: stage.color || '#94a3b8' }}>
                        {compact && canMove && (
                          <button
                            type="button"
                            draggable={false}
                            onClick={e => { e.stopPropagation(); setMoveForId(lead.id); }}
                            onMouseDown={e => e.stopPropagation()}
                            onTouchStart={e => e.stopPropagation()}
                            className="absolute top-1.5 right-1.5 w-8 h-8 flex items-center justify-center rounded-md text-base leading-none text-neutral-500 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-600 hover:bg-neutral-200 dark:hover:bg-neutral-500 active:scale-95"
                            title={t('leads.board.move.button')}
                            aria-label={t('leads.board.move.button')}
                          >⇄</button>
                        )}
                        <div className="p-3">
                          <p className={`text-sm font-medium text-neutral-800 dark:text-neutral-100 leading-snug truncate ${compact && canMove ? 'pr-9' : ''}`}><span translate="no">{lead.name} {lead.lastName}</span></p>
                          {lead.companyName && <p className={`text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate ${compact && canMove ? 'pr-9' : ''}`}><span translate="no">{lead.companyName}</span></p>}
                          {(lead.tagIds || []).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {(lead.tagIds || []).slice(0, 3).map(id => { const tg = tags.find(x => x.id === id); return tg ? <TagChip key={id} tag={tg} small /> : null; })}
                              {(lead.tagIds || []).length > 3 && <span className="text-[10px] text-neutral-400">+{(lead.tagIds || []).length - 3}</span>}
                            </div>
                          )}
                          {showChips && (
                            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                              {lead.nextActionAt && (
                                <span className={`${CARD_CHIP_CLS} ${overdue ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'}`}>
                                  {overdue ? <ExclamationTriangleIcon className="w-3 h-3" /> : <ClockIcon className="w-3 h-3" />}
                                  {new Date(lead.nextActionAt).toLocaleDateString()}
                                </span>
                              )}
                              {lead.expectedCloseAt && lead.status === 'open' && (
                                <span className={`${CARD_CHIP_CLS} bg-neutral-100 text-neutral-600 dark:bg-neutral-600 dark:text-neutral-300`}>
                                  <CalendarDaysIcon className="w-3 h-3" />
                                  {new Date(lead.expectedCloseAt).toLocaleDateString()}
                                </span>
                              )}
                              {cold && <span className={`${CARD_CHIP_CLS} bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300`} title={t('leads.board.no_recent_activity')}><span translate="no">{t('leads.board.cold_badge')}</span></span>}
                            </div>
                          )}
                          <div className="mt-2.5 flex items-center justify-between gap-2">
                            {lead.value != null ? <span className="text-sm font-bold text-primary dark:text-teal-300 tabular-nums">{money(lead.value)}</span> : <span />}
                            <span className="flex items-center gap-1.5 min-w-0" title={assigneeLabel}>
                              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate max-w-[110px]"><span translate="no">{assigneeLabel}</span></span>
                              <span className={`h-5 w-5 rounded-full ring-2 ring-white dark:ring-slate-700 text-[9px] font-bold flex items-center justify-center flex-shrink-0 ${lead.assignedUserId ? 'bg-primary text-white' : 'bg-neutral-200 text-neutral-500 dark:bg-neutral-600 dark:text-neutral-300'}`} aria-hidden>
                                <span translate="no">{lead.assignedUserId ? initials(assigneeLabel) : '–'}</span>
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {list.length === 0 && <p className="text-xs text-neutral-400 text-center py-4">{compact ? '—' : t('leads.board.drop_here')}</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : filtered.length === 0 ? (
        emptyBlock(filtersActive ? t('leads.board.empty_filtered') : t('leads.board.empty'))
      ) : (
        <DataTable<Lead>
          tableId="leads-list"
          data={filtered}
          columns={listColumns}
          searchable={false}
          onRowClick={l => setSelected(l)}
          selectedIds={Array.from(checked)}
          onSelectionChange={ids => setChecked(new Set(ids))}
        />
      )}

      {selected && (
        <LeadDetailModal
          key={selected.id}
          lead={selected}
          pipelines={pipelines}
          sources={sources}
          tags={tags}
          customFields={customFields}
          lostReasons={lostReasons}
          onClose={() => setSelected(null)}
          onChanged={onChanged}
          onDeleted={onDeleted}
          onTagCreated={(t) => setTags(prev => prev.some(x => x.id === t.id) ? prev : [...prev, t].sort((a, b) => a.name.localeCompare(b.name)))}
        />
      )}

      {showCreate && (
        <CreateLeadModal
          key={createPrefill?.clientId || 'new'}
          pipeline={pipeline}
          sources={sources}
          tags={tags}
          customFields={customFields}
          lostReasons={lostReasons}
          assignees={assignees}
          canAssign={can('leads.assign')}
          currentUserId={currentUser?.id}
          prefill={createPrefill}
          onClose={() => { setShowCreate(false); setCreatePrefill(null); }}
          onCreated={(lead) => { setLeads(prev => [lead, ...prev]); setShowCreate(false); setCreatePrefill(null); setSelected(lead); }}
          onOpenExisting={(id) => {
            setShowCreate(false); setCreatePrefill(null);
            if (trashMode) exitTrash();
            // Mismo mecanismo que el deep-link ?lead=<id> (lo busca en otro pipeline si hace falta).
            const next = new URLSearchParams(searchParams); next.set('lead', id); setSearchParams(next, { replace: true });
          }}
        />
      )}

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        title={t('leads.board.import_title')}
        fields={importFields}
        onImport={(rows) => leadsService.importRows(rows, pipeline?.id)}
        onDone={() => loadLeads(pipeline?.id || '')}
      />

      {/* Acciones masivas */}
      <Modal isOpen={!!bulkModal} onClose={() => setBulkModal(null)} title={bulkModal === 'assign' ? t('leads.board.bulk.title_assign') : bulkModal === 'stage' ? t('leads.board.bulk.title_stage') : t('leads.board.bulk.title_tag')} size="sm">
        <div>
          <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4"><span translate="no">{t('leads.board.bulk.count_selected', { n: checked.size })}</span></p>
          {bulkModal === 'assign' && (
            <div>
              <label htmlFor="leads-bulk-value" className={FIELD_LABEL_CLS}>{t('leads.common.assignee')}</label>
              <select id="leads-bulk-value" value={bulkValue} onChange={e => setBulkValue(e.target.value)} className={inputFormStyle}>
                <option value="">{t('leads.common.unassigned')}</option>
                {assignees.map(a => <option key={a.uid} value={a.uid}>{a.name}</option>)}
              </select>
            </div>
          )}
          {bulkModal === 'stage' && (
            <div>
              <label htmlFor="leads-bulk-value" className={FIELD_LABEL_CLS}>{t('leads.common.stage')}</label>
              <select id="leads-bulk-value" value={bulkValue} onChange={e => setBulkValue(e.target.value)} className={inputFormStyle}>
                {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          {bulkModal === 'tag' && (
            <div>
              <label htmlFor="leads-bulk-value" className={FIELD_LABEL_CLS}>{t('leads.common.tags')}</label>
              <select id="leads-bulk-value" value={bulkValue} onChange={e => setBulkValue(e.target.value)} className={inputFormStyle}>
                {tags.map(tg => <option key={tg.id} value={tg.id}>{tg.name}</option>)}
              </select>
            </div>
          )}
          <div className={MODAL_FOOTER_CLS}>
            {bulkModal === 'tag' && <button onClick={() => runBulk('untag', { tagId: bulkValue })} className={`${BUTTON_SECONDARY_SM_CLASSES} mr-auto`}>{t('leads.board.bulk.untag')}</button>}
            <button onClick={() => setBulkModal(null)} className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.common.cancel')}</button>
            <button
              onClick={() => bulkModal === 'assign' ? runBulk('assign', { userId: bulkValue || null }) : bulkModal === 'stage' ? runBulk('stage', { stageId: bulkValue }) : runBulk('tag', { tagId: bulkValue })}
              className={BUTTON_PRIMARY_SM_CLASSES}
            >{t('leads.board.bulk.apply')}</button>
          </div>
        </div>
      </Modal>
      <ConfirmationModal isOpen={confirmBulkDelete} onClose={() => setConfirmBulkDelete(false)} onConfirm={() => { setConfirmBulkDelete(false); runBulk('delete'); }} title={t('leads.board.bulk.delete_title')} message={t('leads.board.bulk.delete_message', { n: checked.size })} confirmButtonText={t('leads.board.bulk.delete_confirm')} />
      <ConfirmationModal
        isOpen={!!confirmPurge}
        onClose={() => setConfirmPurge(null)}
        onConfirm={() => { const ids = confirmPurge || []; setConfirmPurge(null); purgeLeads(ids); }}
        title={t('leads.board.trash.purge_title')}
        message={t('leads.board.trash.purge_message', { n: confirmPurge?.length || 0 })}
        confirmButtonText={t('leads.board.trash.purge')}
      />

      {/* Mover de etapa sin arrastrar (táctil / móvil) */}
      {(() => {
        const ml = moveForId ? leads.find(l => l.id === moveForId) : null;
        return (
          <Modal isOpen={!!ml} onClose={() => setMoveForId(null)} title={t('leads.board.move.title')} size="sm">
            {ml && (
              <div className="space-y-3">
                <p className="text-sm text-neutral-600 dark:text-neutral-300 truncate">
                  <span translate="no" className="font-semibold">{ml.name} {ml.lastName}</span>
                  {ml.companyName && <span translate="no" className="text-neutral-400"> · {ml.companyName}</span>}
                </p>
                <div className="space-y-1.5">
                  {stages.map(s => {
                    const current = s.id === ml.stageId;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        disabled={current}
                        onClick={() => { setMoveForId(null); moveLead(ml.id, s.id); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-3 rounded-lg text-left text-sm border transition-colors ${current
                          ? 'border-primary/40 bg-primary/10 text-primary dark:text-teal-300 font-semibold cursor-default'
                          : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 active:bg-neutral-100 dark:active:bg-neutral-700'}`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color || '#94a3b8' }} />
                        <span translate="no" className="flex-1 truncate">{s.name}</span>
                        {(s.type === 'won' || s.type === 'lost') && (
                          <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_BADGE_CLS[s.type]}`}><span translate="no">{statusLabel(s.type)}</span></span>
                        )}
                        {current && <span className="text-[11px] font-semibold flex-shrink-0">✓ {t('leads.board.move.current')}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </Modal>
        );
      })()}
    </div>
  );
};

// ── Modal de creación ──
const CreateLeadModal: React.FC<{
  pipeline?: Pipeline;
  sources: LeadSource[];
  tags: LeadTag[];
  customFields: LeadCustomField[];
  /** Motivos de pérdida configurados (para crear un lead ya perdido). */
  lostReasons: string[];
  assignees: { uid: string; name: string }[];
  canAssign: boolean;
  currentUserId?: string;
  prefill?: CreatePrefill | null;
  onClose: () => void;
  onCreated: (lead: Lead) => void;
  /** Abre la ficha de un lead existente (aviso de posibles duplicados). */
  onOpenExisting: (id: string) => void;
}> = ({ pipeline, sources, tags, customFields, lostReasons, assignees, canAssign, currentUserId, prefill, onClose, onCreated, onOpenExisting }) => {
  const { t } = useTranslation();
  const openStages = (pipeline?.stages || []).filter(s => s.type === 'open');
  // Al elegir la fuente a mano solo se ofrecen las ACTIVAS (los filtros del tablero siguen mostrando todas).
  const activeSources = sources.filter(s => s.active !== false);
  const clientId = prefill?.clientId || '';
  const [f, setF] = useState({
    name: prefill?.name || '', lastName: prefill?.lastName || '', companyName: prefill?.companyName || '',
    email: prefill?.email || '', email2: '', phone: prefill?.phone || '', phone2: '', value: '', sourceId: activeSources.find(s => s.name === 'Manual')?.id || '',
    assignedUserId: currentUserId || '', stageId: openStages[0]?.id || pipeline?.stages[0]?.id || '', nextActionAt: '', expectedCloseAt: '', notes: '',
    lostReason: '', closedAt: '',
  });
  // Etapas en el orden del pipeline: abiertas y luego ganada/perdida (crear ya cerrado / avanzado).
  const allStages = pipeline?.stages || [];
  const closedStages = allStages.filter(s => s.type !== 'open');
  const stageType = allStages.find(s => s.id === f.stageId)?.type || 'open';
  const isClosed = stageType !== 'open';
  const todayStr = new Date().toLocaleDateString('en-CA');
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [cf, setCf] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  // ── Aviso de posibles duplicados (no bloquea la creación). Debounce de 400ms; errores se ignoran.
  const [dups, setDups] = useState<LeadDuplicate[]>([]);
  useEffect(() => {
    const email = f.email.trim();
    const phone = f.phone.trim();
    const name = f.name.trim();
    const company = f.companyName.trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
    const phoneOk = phone.replace(/\D/g, '').length >= 7;
    const nameOk = name.length >= 2 && company.length >= 2;
    if (!emailOk && !phoneOk && !nameOk) { setDups([]); return; }
    let cancelled = false;
    const h = window.setTimeout(() => {
      leadsService.checkDuplicates({
        email: emailOk ? email : undefined,
        phone: phoneOk ? phone : undefined,
        name: nameOk ? name : undefined,
        companyName: nameOk ? company : undefined,
      })
        .then(rows => { if (!cancelled) setDups(Array.isArray(rows) ? rows : []); })
        .catch(() => { /* silencioso */ });
    }, 400);
    return () => { cancelled = true; window.clearTimeout(h); };
  }, [f.email, f.phone, f.name, f.companyName]);

  const submit = async () => {
    if (!f.name.trim()) { toast.error(t('leads.board.create.name_required')); return; }
    if (stageType === 'lost' && !f.lostReason.trim()) { toast.error(t('leads.board.create.lost_reason_required')); return; }
    const missing = customFields.filter(x => x.required && (cf[x.id] === undefined || cf[x.id] === ''));
    if (missing.length) { toast.error(t('leads.board.create.missing_fields', { fields: missing.map(m => m.label).join(', ') })); return; }
    setSaving(true);
    try {
      const lead = await leadsService.create({
        name: f.name.trim(), lastName: f.lastName || null, companyName: f.companyName || null,
        email: f.email || null, email2: f.email2 || null, phone: f.phone || null, phone2: f.phone2 || null, value: f.value ? Number(f.value) : null,
        pipelineId: pipeline?.id, stageId: f.stageId || undefined, sourceId: f.sourceId || null,
        assignedUserId: f.assignedUserId || null, notes: f.notes || null,
        nextActionAt: !isClosed && f.nextActionAt ? new Date(f.nextActionAt).toISOString() : null,
        expectedCloseAt: !isClosed && f.expectedCloseAt ? new Date(f.expectedCloseAt + 'T12:00:00').toISOString() : null,
        ...(isClosed ? { closedAt: f.closedAt || null } : {}),
        ...(stageType === 'lost' ? { lostReason: f.lostReason.trim() } : {}),
        tagIds, customFields: cf,
        ...(clientId ? { clientId } : {}),
      } as any);
      onCreated(lead);
    } catch (err) { toast.error(err instanceof ApiError ? err.message : t('leads.board.create.error')); }
    finally { setSaving(false); }
  };

  const lbl = (text: string) => <label className={FIELD_LABEL_CLS}>{text}</label>;

  return (
    <Modal isOpen={true} onClose={onClose} title={t('leads.board.new_lead')} size="lg">
      <div className="space-y-4">
        {clientId && (
          <p className="text-sm px-3 py-2 rounded-lg bg-primary/10 text-primary dark:text-teal-300 border border-primary/30">
            <span translate="no">{t('leads.board.create.linked_client', { name: prefill?.clientLabel || clientId })}</span>
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>{lbl(t('leads.board.create.name_required_label'))}<input autoFocus value={f.name} onChange={e => set('name', e.target.value)} className={inputFormStyle} /></div>
          <div>{lbl(t('leads.common.last_name'))}<input value={f.lastName} onChange={e => set('lastName', e.target.value)} className={inputFormStyle} /></div>
          <div>{lbl(t('leads.common.company'))}<input value={f.companyName} onChange={e => set('companyName', e.target.value)} className={inputFormStyle} /></div>
          <div>{lbl(t('leads.board.create.estimated_value'))}<MoneyInput value={f.value} onChange={v => set('value', v)} placeholder="0.00" /></div>
          <div>{lbl(t('leads.common.email'))}<input type="email" value={f.email} onChange={e => set('email', e.target.value)} className={inputFormStyle} /></div>
          <div>{lbl(t('leads.common.email2'))}<input type="email" value={f.email2} onChange={e => set('email2', e.target.value)} className={inputFormStyle} /></div>
          <div>{lbl(t('leads.common.phone'))}<input type="tel" value={f.phone} onChange={e => set('phone', e.target.value)} className={inputFormStyle} /></div>
          <div>{lbl(t('leads.common.phone2'))}<input type="tel" value={f.phone2} onChange={e => set('phone2', e.target.value)} className={inputFormStyle} /></div>
          <div>{lbl(t('leads.common.stage'))}
            <select value={f.stageId} onChange={e => set('stageId', e.target.value)} className={inputFormStyle}>
              {closedStages.length > 0 ? (
                <>
                  <optgroup label={t('leads.board.create.stages_open')}>{openStages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>
                  <optgroup label={t('leads.board.create.stages_closed')}>{closedStages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>
                </>
              ) : openStages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>{lbl(t('leads.common.assignee'))}
            <select value={f.assignedUserId} disabled={!canAssign} onChange={e => set('assignedUserId', e.target.value)} className={inputFormStyle}>
              <option value="">{t('leads.common.unassigned')}</option>
              {assignees.map(a => <option key={a.uid} value={a.uid}>{a.name}</option>)}
              {currentUserId && !assignees.some(a => a.uid === currentUserId) && <option value={currentUserId}>{t('leads.common.me')}</option>}
            </select>
          </div>
          <div>{lbl(t('leads.common.source'))}
            <select value={f.sourceId} onChange={e => set('sourceId', e.target.value)} className={inputFormStyle}><option value="">—</option>{activeSources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          </div>
          {isClosed ? (
            <>
              <div>{lbl(t('leads.board.create.closed_at'))}<input type="date" max={todayStr} value={f.closedAt} onChange={e => set('closedAt', e.target.value)} className={inputFormStyle} placeholder={todayStr} /></div>
              {stageType === 'lost' && (
                <div className="sm:col-span-2">{lbl(`${t('leads.common.lost_reason')} *`)}
                  {lostReasons.length > 0 ? (
                    <select value={f.lostReason} onChange={e => set('lostReason', e.target.value)} className={inputFormStyle}>
                      <option value="">—</option>
                      {lostReasons.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : (
                    <input value={f.lostReason} maxLength={200} onChange={e => set('lostReason', e.target.value)} className={inputFormStyle} />
                  )}
                </div>
              )}
              <p className="sm:col-span-2 -mt-2 text-xs text-neutral-500 dark:text-neutral-400">{t('leads.board.create.closed_hint')}</p>
            </>
          ) : (
            <>
              <div>{lbl(t('leads.common.expected_close'))}<input type="date" value={f.expectedCloseAt} onChange={e => set('expectedCloseAt', e.target.value)} className={inputFormStyle} /></div>
              <div className="sm:col-span-2">{lbl(t('leads.common.next_action'))}<input type="datetime-local" value={f.nextActionAt} onChange={e => set('nextActionAt', e.target.value)} className={inputFormStyle} /></div>
            </>
          )}
          {tags.length > 0 && (
            <div className="sm:col-span-2">{lbl(t('leads.common.tags'))}
              <div className="flex flex-wrap gap-1.5">
                {tags.map(tg => {
                  const on = tagIds.includes(tg.id);
                  return (
                    <button key={tg.id} type="button" onClick={() => setTagIds(prev => on ? prev.filter(x => x !== tg.id) : [...prev, tg.id])}
                      className={`text-xs px-2 py-0.5 rounded-full border transition ${on ? 'font-semibold ring-2 ring-offset-1 dark:ring-offset-neutral-800' : 'opacity-60 hover:opacity-100'}`}
                      style={{ background: `${tg.color || '#64748b'}22`, color: tg.color || '#64748b', borderColor: `${tg.color || '#64748b'}66` }}>
                      {on ? '✓ ' : ''}{tg.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {customFields.map(fd => (
            <div key={fd.id}>{lbl(`${fd.label}${fd.required ? ' *' : ''}`)}
              {fd.type === 'checkbox' ? (
                <label className="flex items-center gap-2 text-sm mt-2 text-neutral-700 dark:text-neutral-200"><input type="checkbox" checked={!!cf[fd.id]} onChange={e => setCf(p => ({ ...p, [fd.id]: e.target.checked }))} className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary" /> {t('leads.common.yes')}</label>
              ) : fd.type === 'select' ? (
                <select value={cf[fd.id] ?? ''} onChange={e => setCf(p => ({ ...p, [fd.id]: e.target.value }))} className={inputFormStyle}><option value="">—</option>{(fd.options || []).map(o => <option key={o} value={o}>{o}</option>)}</select>
              ) : (
                <input type={fd.type === 'number' ? 'number' : fd.type === 'date' ? 'date' : fd.type === 'url' ? 'url' : 'text'} value={cf[fd.id] ?? ''} onChange={e => setCf(p => ({ ...p, [fd.id]: e.target.value }))} className={inputFormStyle} />
              )}
            </div>
          ))}
          <div className="sm:col-span-2">{lbl(t('leads.common.notes'))}<textarea rows={2} value={f.notes} onChange={e => set('notes', e.target.value)} className={`${inputFormStyle} !h-auto`} /></div>
        </div>
        {dups.length > 0 && (
          <div className="rounded-lg border border-amber-300 dark:border-amber-700/70 bg-amber-50 dark:bg-amber-900/20 p-3" role="status" translate="no">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-amber-800 dark:text-amber-200"><ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />{t('leads.board.dup.title')}</p>
            <p className="text-xs text-amber-700 dark:text-amber-300/90 mb-2">{t('leads.board.dup.hint')}</p>
            <ul className="space-y-1.5">
              {dups.slice(0, 3).map(d => {
                const contact = d.reason === 'phone' ? (d.phone || d.email) : (d.email || d.phone);
                return (
                  <li key={d.id} className="flex items-center gap-2 text-xs bg-white/70 dark:bg-neutral-900 rounded-md px-2 py-1.5 border border-amber-200 dark:border-amber-800/50">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-neutral-800 dark:text-neutral-100 truncate">
                        <span translate="no">{d.name} {d.lastName || ''}</span>
                        {d.companyName && <span translate="no" className="font-normal text-neutral-500 dark:text-neutral-400"> · {d.companyName}</span>}
                      </p>
                      <p className="text-neutral-500 dark:text-neutral-400 truncate">
                        {contact && <span translate="no">{contact} · </span>}
                        <span>{t(d.status === 'won' ? 'leads.common.status.won' : d.status === 'lost' ? 'leads.common.status.lost' : 'leads.common.status.open')}</span>
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-200/70 dark:bg-amber-800/50 text-amber-900 dark:text-amber-100 whitespace-nowrap">
                      {t(d.reason === 'email' ? 'leads.board.dup.reason.email' : d.reason === 'phone' ? 'leads.board.dup.reason.phone' : 'leads.board.dup.reason.name')}
                    </span>
                    <button type="button" onClick={() => onOpenExisting(d.id)} className="flex-shrink-0 text-xs font-semibold text-primary dark:text-teal-300 hover:underline">{t('leads.board.dup.view')}</button>
                  </li>
                );
              })}
            </ul>
            {dups.length > 3 && <p className="text-[11px] text-amber-700 dark:text-amber-300/80 mt-1.5"><span translate="no">{t('leads.board.dup.more', { n: dups.length - 3 })}</span></p>}
          </div>
        )}
        <div className={MODAL_FOOTER_CLS}>
          <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.common.cancel')}</button>
          <button onClick={submit} disabled={saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-60`}>{saving ? t('leads.board.create.creating') : t('leads.board.create.submit')}</button>
        </div>
      </div>
    </Modal>
  );
};
