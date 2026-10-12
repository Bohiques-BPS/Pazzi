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
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { PlusIcon, Squares2X2Icon, ListBulletIcon, MagnifyingGlassIcon } from '../../components/icons';

const money = (n?: number | null) => n != null ? `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : '';
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
  { key: 'phone', label: t('leads.common.phone'), aliases: ['telefono', 'phone', 'celular', 'movil', 'tel', 'mobile'] },
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
  const toggleCheck = (id: string) => setChecked(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allChecked = filtered.length > 0 && filtered.every(l => checked.has(l.id));
  const toggleAll = () => setChecked(allChecked ? new Set() : new Set(filtered.map(l => l.id)));

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

  const selectCls = inputFormStyle + ' !w-auto !py-1.5 text-sm';

  return (
    <div>
      {/* Cabecera */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">{t('leads.common.leads')}</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            <span translate="no">{t('leads.board.summary', { n: filtered.length, value: money(totals.openValue) || '$0' })}</span>
            {totals.overdue > 0 && <span translate="no" className="ml-2 text-red-600 dark:text-red-400">{t('leads.board.overdue_count', { n: totals.overdue })}</span>}
            {totals.cold > 0 && <button type="button" translate="no" onClick={() => { setOnlyCold(true); setFilterStatus('open'); }} className="ml-2 text-amber-600 dark:text-amber-400 hover:underline">{t('leads.board.cold_count', { n: totals.cold })}</button>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {can('leads.managePipeline') && <button onClick={() => navigate('/leads/settings')} className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.board.configure')}</button>}
          {can('leads.import') && <button onClick={() => setShowImport(true)} className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.board.import')}</button>}
          {can('leads.export') && <button onClick={exportExcel} disabled={!filtered.length} className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.board.export')}</button>}
          {canDelete && (
            <button
              onClick={() => trashMode ? exitTrash() : enterTrash()}
              className={trashMode ? BUTTON_PRIMARY_SM_CLASSES : BUTTON_SECONDARY_SM_CLASSES}
              title={t('leads.board.trash.tooltip')}
              aria-pressed={trashMode}
            >
              <span translate="no">{trash && trash.length > 0 ? t('leads.board.trash.button_count', { n: trash.length }) : t('leads.board.trash.button')}</span>
            </button>
          )}
          {can('leads.create') && (
            <button onClick={() => { setCreatePrefill(null); setShowCreate(true); }} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center`}><PlusIcon className="w-5 h-5" /> {t('leads.board.new_lead')}</button>
          )}
        </div>
      </div>

      {/* Mis metas del mes */}
      {myGoals && myGoals.goals.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4 p-2.5 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700">
          <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">{t('leads.board.my_goals')}</span>
          {myGoals.goals.map(g => (
            <div key={g.metric} className="flex items-center gap-2 min-w-[180px]" title={`${g.actual} / ${g.target}`}>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">{t(g.metric === 'won_count' ? 'leads.common.metric_short.won_count' : g.metric === 'won_value' ? 'leads.common.metric_short.won_value' : g.metric === 'activities' ? 'leads.common.metric_short.activities' : 'leads.common.metric_short.new_leads')}</span>
              <div className="h-2 flex-1 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, g.pct)}%`, background: g.pct >= 100 ? '#16a34a' : g.pct >= 60 ? '#f59e0b' : '#0D9488' }} />
              </div>
              <span className="text-[11px] tabular-nums text-neutral-600 dark:text-neutral-300">{g.pct}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      {!trashMode && (
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t('leads.board.search_placeholder')} className={inputFormStyle + ' pl-8 !w-64 !py-1.5 text-sm'} />
        </div>
        {pipelines.length > 1 && (
          <select value={pipeline?.id || ''} onChange={e => changePipeline(e.target.value)} className={selectCls} title={t('leads.common.pipeline')}>
            {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} className={selectCls}>
          <option value="">{t('leads.board.filter.all_assignees')}</option>
          {currentUser && <option value={currentUser.id}>{t('leads.board.filter.my_leads')}</option>}
          <option value="none">{t('leads.common.unassigned')}</option>
          {assignees.filter(a => a.uid !== currentUser?.id).map(a => <option key={a.uid} value={a.uid}>{a.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className={selectCls}>
          <option value="">{t('leads.board.filter.all_statuses')}</option>
          <option value="open">{t('leads.common.status.open_pl')}</option>
          <option value="won">{t('leads.common.status.won_pl')}</option>
          <option value="lost">{t('leads.common.status.lost_pl')}</option>
        </select>
        {tags.length > 0 && (
          <select value={filterTag} onChange={e => setFilterTag(e.target.value)} className={selectCls}>
            <option value="">{t('leads.board.filter.all_tags')}</option>
            {tags.map(tg => <option key={tg.id} value={tg.id}>{tg.name}</option>)}
          </select>
        )}
        <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className={selectCls}>
          <option value="">{t('leads.board.filter.all_sources')}</option>
          {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-300 cursor-pointer select-none">
          <input type="checkbox" checked={onlyCold} onChange={e => setOnlyCold(e.target.checked)} className="h-4 w-4" /> <span translate="no">{t('leads.board.filter.only_cold', { days: coldDays })}</span>
        </label>
        {filtersActive && <button type="button" onClick={clearFilters} className="text-xs text-primary hover:underline">{t('leads.board.filter.clear')}</button>}
        <div className="ml-auto flex items-center bg-neutral-100 dark:bg-neutral-700 p-0.5 rounded-md">
          <button onClick={() => setViewPersist('board')} className={`p-1.5 rounded-md ${view === 'board' ? 'bg-primary text-white' : 'text-neutral-600 dark:text-neutral-300'}`} title={t('leads.board.view.board')} aria-label={t('leads.board.view.board_aria')}><Squares2X2Icon className="w-5 h-5" /></button>
          <button onClick={() => setViewPersist('list')} className={`p-1.5 rounded-md ${view === 'list' ? 'bg-primary text-white' : 'text-neutral-600 dark:text-neutral-300'}`} title={t('leads.board.view.list')} aria-label={t('leads.board.view.list_aria')}><ListBulletIcon className="w-5 h-5" /></button>
        </div>
      </div>
      )}

      {/* Barra de acciones masivas */}
      {!trashMode && checked.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3 p-2.5 rounded-lg bg-primary/10 border border-primary/30">
          <span translate="no" className="text-sm font-semibold text-primary dark:text-teal-300">{t('leads.board.bulk.selected', { n: checked.size })}</span>
          {can('leads.assign') && <button onClick={() => { setBulkModal('assign'); setBulkValue(''); }} className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.board.bulk.assign')}</button>}
          {(can('leads.changeStage') || can('leads.edit')) && <button onClick={() => { setBulkModal('stage'); setBulkValue(stages[0]?.id || ''); }} className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.board.bulk.move_stage')}</button>}
          {can('leads.edit') && tags.length > 0 && <button onClick={() => { setBulkModal('tag'); setBulkValue(tags[0]?.id || ''); }} className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.board.bulk.tag')}</button>}
          {can('leads.delete') && <button onClick={() => setConfirmBulkDelete(true)} className={`${BUTTON_SECONDARY_SM_CLASSES} text-red-600 dark:text-red-400`}>{t('leads.board.bulk.delete')}</button>}
          <button onClick={() => setChecked(new Set())} className="ml-auto text-xs text-neutral-500 hover:underline">{t('leads.board.bulk.clear_selection')}</button>
        </div>
      )}

      {loading ? <LoadingSkeleton variant="cards" count={4} /> : trashMode ? (
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <button onClick={exitTrash} className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.board.trash.back')}</button>
            <h2 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">{t('leads.board.trash.title')}</h2>
            {pipelines.length > 1 && (
              <select value={pipeline?.id || ''} onChange={e => changePipeline(e.target.value)} className={selectCls + ' ml-auto'} title={t('leads.common.pipeline')}>
                {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
          </div>
          <p className="mb-3 text-xs px-3 py-2 rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800/60">
            ⏳ {t('leads.board.trash.notice')}
          </p>
          {trashChecked.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-3 p-2.5 rounded-lg bg-primary/10 border border-primary/30">
              <span translate="no" className="text-sm font-semibold text-primary dark:text-teal-300">{t('leads.board.bulk.selected', { n: trashChecked.size })}</span>
              <button disabled={trashBusy} onClick={() => restoreLeads(Array.from(trashChecked))} className={BUTTON_SECONDARY_SM_CLASSES}>♻️ {t('leads.board.trash.restore')}</button>
              <button disabled={trashBusy} onClick={() => setConfirmPurge(Array.from(trashChecked))} className={`${BUTTON_SECONDARY_SM_CLASSES} text-red-600 dark:text-red-400`}>{t('leads.board.trash.purge')}</button>
              <button onClick={() => setTrashChecked(new Set())} className="ml-auto text-xs text-neutral-500 hover:underline">{t('leads.board.bulk.clear_selection')}</button>
            </div>
          )}
          {trashLoading && trash === null ? <LoadingSkeleton variant="cards" count={2} /> : (() => {
            const rows = trash || [];
            const allTrashChecked = rows.length > 0 && rows.every(l => trashChecked.has(l.id));
            return (
              <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-neutral-50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-700">
                    <tr>
                      <th className="px-3 py-2.5 w-8"><input type="checkbox" checked={allTrashChecked} onChange={() => setTrashChecked(allTrashChecked ? new Set() : new Set(rows.map(l => l.id)))} className="h-4 w-4" aria-label={t('leads.board.select_all')} /></th>
                      {['leads.board.col.name', 'leads.common.company', 'leads.common.value', 'leads.board.trash.col.deleted', 'leads.board.trash.col.days_left', 'leads.board.trash.col.actions'].map(k => t(k)).map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/60">
                    {rows.map(l => {
                      const deletedAt = l.archivedAt ? new Date(l.archivedAt) : null;
                      const left = deletedAt ? Math.max(0, TRASH_DAYS - Math.floor((Date.now() - deletedAt.getTime()) / DAY)) : TRASH_DAYS;
                      return (
                        <tr key={l.id} className={trashChecked.has(l.id) ? 'bg-primary/5' : ''}>
                          <td className="px-3 py-2"><input type="checkbox" checked={trashChecked.has(l.id)} onChange={() => setTrashChecked(prev => { const n = new Set(prev); if (n.has(l.id)) n.delete(l.id); else n.add(l.id); return n; })} className="h-4 w-4" aria-label={t('leads.board.select_one', { name: l.name })} /></td>
                          <td className="px-3 py-2 text-neutral-800 dark:text-neutral-100 whitespace-nowrap"><span translate="no">{l.name} {l.lastName}</span></td>
                          <td className="px-3 py-2 text-neutral-500 dark:text-neutral-400"><span translate="no">{l.companyName || '—'}</span></td>
                          <td className="px-3 py-2 tabular-nums">{l.value != null ? money(l.value) : '—'}</td>
                          <td className="px-3 py-2 text-neutral-500 dark:text-neutral-400 whitespace-nowrap">{deletedAt ? deletedAt.toLocaleDateString() : '—'}</td>
                          <td className={`px-3 py-2 whitespace-nowrap text-xs ${left <= 3 ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-neutral-500 dark:text-neutral-400'}`}>
                            <span translate="no">{left === 0 ? t('leads.board.trash.today') : t('leads.board.trash.days_left', { n: left })}</span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <button disabled={trashBusy} onClick={() => restoreLeads([l.id])} className="text-xs font-medium text-primary dark:text-teal-300 hover:underline disabled:opacity-50">♻️ {t('leads.board.trash.restore')}</button>
                              <button disabled={trashBusy} onClick={() => setConfirmPurge([l.id])} className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline disabled:opacity-50">{t('leads.board.trash.purge')}</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-10 text-center text-neutral-400">{t('leads.board.trash.empty')}</td></tr>}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      ) : view === 'board' ? (
        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 items-start snap-x snap-mandatory md:snap-none scroll-smooth -mx-1 px-1">
          {stages.map(stage => {
            const list = byStage[stage.id] || [];
            const total = list.reduce((a, l) => a + (l.value || 0), 0);
            return (
              <div key={stage.id} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handleDrop(stage.id); }} className="bg-slate-100 dark:bg-slate-800 rounded-xl p-2 flex flex-col w-[85vw] max-w-[20rem] sm:w-72 flex-shrink-0 max-h-[75vh] snap-start">
                <div className="mb-2 px-2">
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300 flex justify-between items-center text-sm gap-2">
                    <span className="flex items-center gap-1.5 min-w-0"><span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: stage.color || '#94a3b8' }} /><span className="truncate" translate="no">{stage.name}</span></span>
                    <span translate="no" className="text-xs text-gray-500 flex-shrink-0">{list.length}</span>
                  </h3>
                  {total > 0 && <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">{money(total)}{stage.type === 'open' && stage.probability != null ? t('leads.board.weighted', { value: money(total * (stage.probability / 100)) }) : ''}</p>}
                </div>
                <div className="space-y-2 overflow-y-auto flex-grow min-h-[80px] p-1">
                  {list.map(lead => {
                    const overdue = lead.status === 'open' && lead.nextActionAt && new Date(lead.nextActionAt).getTime() < Date.now();
                    const cold = isCold(lead);
                    return (
                      <div key={lead.id} draggable={canMove}
                        onDragStart={e => { if (!canMove) return; e.dataTransfer.setData('text/plain', lead.id); e.dataTransfer.effectAllowed = 'move'; setDraggedId(lead.id); }}
                        onDragEnd={() => setDraggedId(null)}
                        onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); e.stopPropagation(); handleDrop(stage.id, lead.id); }} onClick={() => setSelected(lead)}
                        className={`relative bg-white dark:bg-slate-700 p-3 rounded-lg shadow hover:shadow-lg cursor-pointer border-l-4 ${draggedId === lead.id ? 'opacity-50' : ''}`} style={{ borderLeftColor: stage.color || '#94a3b8' }}>
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
                        <p className={`text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate ${compact && canMove ? 'pr-9' : ''}`}><span translate="no">{lead.name} {lead.lastName}</span></p>
                        {lead.companyName && <p className={`text-xs text-neutral-500 dark:text-neutral-400 truncate ${compact && canMove ? 'pr-9' : ''}`}><span translate="no">{lead.companyName}</span></p>}
                        {(lead.tagIds || []).length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {(lead.tagIds || []).slice(0, 3).map(id => { const t = tags.find(x => x.id === id); return t ? <TagChip key={id} tag={t} small /> : null; })}
                            {(lead.tagIds || []).length > 3 && <span className="text-[10px] text-neutral-400">+{(lead.tagIds || []).length - 3}</span>}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-2 gap-2">
                          {lead.value != null ? <span className="text-xs font-bold text-primary dark:text-teal-300">{money(lead.value)}</span> : <span />}
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-300 truncate max-w-[120px]"><span translate="no">{empName(lead.assignedUserId)}</span></span>
                        </div>
                        <div className="flex flex-wrap gap-x-2 mt-1">
                          {lead.nextActionAt && <span className={`text-[10px] ${overdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-amber-600 dark:text-amber-400'}`}>⏰ {new Date(lead.nextActionAt).toLocaleDateString()}</span>}
                          {lead.expectedCloseAt && lead.status === 'open' && <span className="text-[10px] text-neutral-500 dark:text-neutral-400">🎯 {new Date(lead.expectedCloseAt).toLocaleDateString()}</span>}
                          {cold && <span className="text-[10px] text-sky-600 dark:text-sky-400" title={t('leads.board.no_recent_activity')}>{t('leads.board.cold_badge')}</span>}
                        </div>
                      </div>
                    );
                  })}
                  {list.length === 0 && <p className="text-[11px] text-neutral-400 text-center py-4">{compact ? '—' : t('leads.board.drop_here')}</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-700">
              <tr>
                <th className="px-3 py-2.5 w-8"><input type="checkbox" checked={allChecked} onChange={toggleAll} className="h-4 w-4" aria-label={t('leads.board.select_all')} /></th>
                {['leads.board.col.name', 'leads.common.company', 'leads.common.stage', 'leads.common.value', 'leads.common.assignee', 'leads.common.tags', 'leads.board.col.status', 'leads.board.col.next_action'].map(k => t(k)).map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/60">
              {filtered.map(l => {
                const st = stages.find(s => s.id === l.stageId);
                const overdue = l.status === 'open' && l.nextActionAt && new Date(l.nextActionAt).getTime() < Date.now();
                return (
                  <tr key={l.id} onClick={() => setSelected(l)} className={`hover:bg-neutral-50 dark:hover:bg-neutral-700/30 cursor-pointer ${checked.has(l.id) ? 'bg-primary/5' : ''}`}>
                    <td className="px-3 py-2" onClick={e => e.stopPropagation()}><input type="checkbox" checked={checked.has(l.id)} onChange={() => toggleCheck(l.id)} className="h-4 w-4" aria-label={t('leads.board.select_one', { name: l.name })} /></td>
                    <td className="px-3 py-2 text-neutral-800 dark:text-neutral-100"><span translate="no">{l.name} {l.lastName}</span>{isCold(l) && <span className="ml-1 text-[10px]" title={t('leads.board.no_followup')}>❄️</span>}</td>
                    <td className="px-3 py-2 text-neutral-500 dark:text-neutral-400">{l.companyName || '—'}</td>
                    <td className="px-3 py-2"><span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: st?.color || '#94a3b8' }} />{st?.name || '—'}</span></td>
                    <td className="px-3 py-2 tabular-nums">{l.value != null ? money(l.value) : '—'}</td>
                    <td className="px-3 py-2 text-neutral-500 dark:text-neutral-400">{empName(l.assignedUserId)}</td>
                    <td className="px-3 py-2"><div className="flex flex-wrap gap-1">{(l.tagIds || []).map(id => { const t = tags.find(x => x.id === id); return t ? <TagChip key={id} tag={t} small /> : null; })}</div></td>
                    <td className="px-3 py-2">{l.status === 'won' ? `✅ ${t('leads.common.status.won')}` : l.status === 'lost' ? `❌ ${t('leads.common.status.lost')}` : `🟦 ${t('leads.common.status.open')}`}</td>
                    <td className={`px-3 py-2 text-xs ${overdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-neutral-500'}`}>{l.nextActionAt ? new Date(l.nextActionAt).toLocaleDateString() : '—'}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={9} className="px-3 py-10 text-center text-neutral-400">{filtersActive ? t('leads.board.empty_filtered') : t('leads.board.empty')}</td></tr>}
            </tbody>
          </table>
        </div>
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
        <div className="space-y-3">
          <p className="text-sm text-neutral-600 dark:text-neutral-300"><span translate="no">{t('leads.board.bulk.count_selected', { n: checked.size })}</span></p>
          {bulkModal === 'assign' && (
            <select value={bulkValue} onChange={e => setBulkValue(e.target.value)} className={inputFormStyle}>
              <option value="">{t('leads.common.unassigned')}</option>
              {assignees.map(a => <option key={a.uid} value={a.uid}>{a.name}</option>)}
            </select>
          )}
          {bulkModal === 'stage' && (
            <select value={bulkValue} onChange={e => setBulkValue(e.target.value)} className={inputFormStyle}>
              {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          {bulkModal === 'tag' && (
            <select value={bulkValue} onChange={e => setBulkValue(e.target.value)} className={inputFormStyle}>
              {tags.map(tg => <option key={tg.id} value={tg.id}>{tg.name}</option>)}
            </select>
          )}
          <div className="flex justify-end gap-2">
            {bulkModal === 'tag' && <button onClick={() => runBulk('untag', { tagId: bulkValue })} className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.board.bulk.untag')}</button>}
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
                <div className="space-y-1">
                  {stages.map(s => {
                    const current = s.id === ml.stageId;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        disabled={current}
                        onClick={() => { setMoveForId(null); moveLead(ml.id, s.id); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-3 rounded-lg text-left text-sm border transition ${current
                          ? 'border-primary/40 bg-primary/10 text-primary dark:text-teal-300 font-semibold cursor-default'
                          : 'border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 active:bg-neutral-100 dark:active:bg-neutral-700'}`}
                      >
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color || '#94a3b8' }} />
                        <span translate="no" className="flex-1 truncate">{s.name}</span>
                        {s.type === 'won' && <span aria-hidden>✅</span>}
                        {s.type === 'lost' && <span aria-hidden>❌</span>}
                        {current && <span className="text-[11px] font-semibold">✓ {t('leads.board.move.current')}</span>}
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
  assignees: { uid: string; name: string }[];
  canAssign: boolean;
  currentUserId?: string;
  prefill?: CreatePrefill | null;
  onClose: () => void;
  onCreated: (lead: Lead) => void;
  /** Abre la ficha de un lead existente (aviso de posibles duplicados). */
  onOpenExisting: (id: string) => void;
}> = ({ pipeline, sources, tags, customFields, assignees, canAssign, currentUserId, prefill, onClose, onCreated, onOpenExisting }) => {
  const { t } = useTranslation();
  const openStages = (pipeline?.stages || []).filter(s => s.type === 'open');
  const clientId = prefill?.clientId || '';
  const [f, setF] = useState({
    name: prefill?.name || '', lastName: prefill?.lastName || '', companyName: prefill?.companyName || '',
    email: prefill?.email || '', phone: prefill?.phone || '', value: '', sourceId: sources.find(s => s.name === 'Manual')?.id || '',
    assignedUserId: currentUserId || '', stageId: openStages[0]?.id || pipeline?.stages[0]?.id || '', nextActionAt: '', expectedCloseAt: '', notes: '',
  });
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
    const missing = customFields.filter(x => x.required && (cf[x.id] === undefined || cf[x.id] === ''));
    if (missing.length) { toast.error(t('leads.board.create.missing_fields', { fields: missing.map(m => m.label).join(', ') })); return; }
    setSaving(true);
    try {
      const lead = await leadsService.create({
        name: f.name.trim(), lastName: f.lastName || null, companyName: f.companyName || null,
        email: f.email || null, phone: f.phone || null, value: f.value ? Number(f.value) : null,
        pipelineId: pipeline?.id, stageId: f.stageId || undefined, sourceId: f.sourceId || null,
        assignedUserId: f.assignedUserId || null, notes: f.notes || null,
        nextActionAt: f.nextActionAt ? new Date(f.nextActionAt).toISOString() : null,
        expectedCloseAt: f.expectedCloseAt ? new Date(f.expectedCloseAt + 'T12:00:00').toISOString() : null,
        tagIds, customFields: cf,
        ...(clientId ? { clientId } : {}),
      } as any);
      onCreated(lead);
    } catch (err) { toast.error(err instanceof ApiError ? err.message : t('leads.board.create.error')); }
    finally { setSaving(false); }
  };

  const lbl = (text: string) => <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">{text}</label>;

  return (
    <Modal isOpen={true} onClose={onClose} title={t('leads.board.new_lead')} size="lg">
      <div className="space-y-3">
        {clientId && (
          <p className="text-xs px-2.5 py-1.5 rounded-md bg-primary/10 text-primary dark:text-teal-300 border border-primary/30">
            🔗 <span translate="no">{t('leads.board.create.linked_client', { name: prefill?.clientLabel || clientId })}</span>
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>{lbl(t('leads.board.create.name_required_label'))}<input autoFocus value={f.name} onChange={e => set('name', e.target.value)} className={inputFormStyle} /></div>
          <div>{lbl(t('leads.common.last_name'))}<input value={f.lastName} onChange={e => set('lastName', e.target.value)} className={inputFormStyle} /></div>
          <div>{lbl(t('leads.common.company'))}<input value={f.companyName} onChange={e => set('companyName', e.target.value)} className={inputFormStyle} /></div>
          <div>{lbl(t('leads.board.create.estimated_value'))}<input type="number" step="0.01" value={f.value} onChange={e => set('value', e.target.value)} className={inputFormStyle} placeholder="0.00" /></div>
          <div>{lbl(t('leads.common.email'))}<input type="email" value={f.email} onChange={e => set('email', e.target.value)} className={inputFormStyle} /></div>
          <div>{lbl(t('leads.common.phone'))}<input type="tel" value={f.phone} onChange={e => set('phone', e.target.value)} className={inputFormStyle} /></div>
          <div>{lbl(t('leads.common.stage'))}
            <select value={f.stageId} onChange={e => set('stageId', e.target.value)} className={inputFormStyle}>{(pipeline?.stages || []).filter(s => s.type === 'open').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          </div>
          <div>{lbl(t('leads.common.assignee'))}
            <select value={f.assignedUserId} disabled={!canAssign} onChange={e => set('assignedUserId', e.target.value)} className={inputFormStyle}>
              <option value="">{t('leads.common.unassigned')}</option>
              {assignees.map(a => <option key={a.uid} value={a.uid}>{a.name}</option>)}
              {currentUserId && !assignees.some(a => a.uid === currentUserId) && <option value={currentUserId}>{t('leads.common.me')}</option>}
            </select>
          </div>
          <div>{lbl(t('leads.common.source'))}
            <select value={f.sourceId} onChange={e => set('sourceId', e.target.value)} className={inputFormStyle}><option value="">—</option>{sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          </div>
          <div>{lbl(t('leads.common.expected_close'))}<input type="date" value={f.expectedCloseAt} onChange={e => set('expectedCloseAt', e.target.value)} className={inputFormStyle} /></div>
          <div className="sm:col-span-2">{lbl(t('leads.common.next_action'))}<input type="datetime-local" value={f.nextActionAt} onChange={e => set('nextActionAt', e.target.value)} className={inputFormStyle} /></div>
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
                <label className="flex items-center gap-2 text-sm mt-2"><input type="checkbox" checked={!!cf[fd.id]} onChange={e => setCf(p => ({ ...p, [fd.id]: e.target.checked }))} className="h-4 w-4" /> {t('leads.common.yes')}</label>
              ) : fd.type === 'select' ? (
                <select value={cf[fd.id] ?? ''} onChange={e => setCf(p => ({ ...p, [fd.id]: e.target.value }))} className={inputFormStyle}><option value="">—</option>{(fd.options || []).map(o => <option key={o} value={o}>{o}</option>)}</select>
              ) : (
                <input type={fd.type === 'number' ? 'number' : fd.type === 'date' ? 'date' : fd.type === 'url' ? 'url' : 'text'} value={cf[fd.id] ?? ''} onChange={e => setCf(p => ({ ...p, [fd.id]: e.target.value }))} className={inputFormStyle} />
              )}
            </div>
          ))}
          <div className="sm:col-span-2">{lbl(t('leads.common.notes'))}<textarea rows={2} value={f.notes} onChange={e => set('notes', e.target.value)} className={inputFormStyle} /></div>
        </div>
        {dups.length > 0 && (
          <div className="rounded-lg border border-amber-300 dark:border-amber-700/70 bg-amber-50 dark:bg-amber-900/20 p-3" role="status" translate="no">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">{t('leads.board.dup.title')}</p>
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
        <div className="flex justify-end gap-2 pt-2 border-t dark:border-neutral-700">
          <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.common.cancel')}</button>
          <button onClick={submit} disabled={saving} className={BUTTON_PRIMARY_SM_CLASSES}>{saving ? t('leads.board.create.creating') : t('leads.board.create.submit')}</button>
        </div>
      </div>
    </Modal>
  );
};
