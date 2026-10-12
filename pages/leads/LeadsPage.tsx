import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Lead, Pipeline, LeadSource, LeadTag, LeadCustomField } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { leadsService } from '../../services/leads';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { Modal, ConfirmationModal } from '../../components/Modal';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { ImportModal, ImportFieldDef } from '../../components/ui/ImportModal';
import { LeadDetailModal } from '../../components/leads/LeadDetailModal';
import { TagChip } from '../../components/leads/TagChip';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { PlusIcon, Squares2X2Icon, ListBulletIcon, MagnifyingGlassIcon } from '../../components/icons';

const money = (n?: number | null) => n != null ? `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : '';
const DAY = 86400000;

const IMPORT_FIELDS: ImportFieldDef[] = [
  { key: 'name', label: 'Nombre', required: true, aliases: ['nombre', 'first name', 'firstname', 'contacto', 'cliente'] },
  { key: 'lastName', label: 'Apellido', aliases: ['apellidos', 'last name', 'lastname'] },
  { key: 'companyName', label: 'Empresa', aliases: ['compania', 'compañía', 'company', 'negocio', 'organizacion'] },
  { key: 'email', label: 'Correo', aliases: ['email', 'e-mail', 'correo electronico', 'mail'] },
  { key: 'phone', label: 'Teléfono', aliases: ['telefono', 'phone', 'celular', 'movil', 'tel'] },
  { key: 'whatsapp', label: 'WhatsApp', aliases: ['wa', 'whatsapp'] },
  { key: 'value', label: 'Valor', type: 'number', aliases: ['monto', 'valor', 'importe', 'amount', 'presupuesto'] },
  { key: 'source', label: 'Fuente', aliases: ['origen', 'source', 'canal'] },
  { key: 'stage', label: 'Etapa', aliases: ['estado', 'stage', 'status', 'fase'] },
  { key: 'assigneeEmail', label: 'Correo del responsable', aliases: ['responsable', 'vendedor', 'asignado', 'owner'] },
  { key: 'expectedCloseAt', label: 'Cierre estimado', aliases: ['fecha cierre', 'close date', 'cierre'] },
  { key: 'tags', label: 'Etiquetas (separadas por coma)', aliases: ['etiquetas', 'tags'] },
  { key: 'notes', label: 'Notas', aliases: ['nota', 'notas', 'comentarios', 'observaciones', 'notes'] },
];

export const LeadsPage: React.FC = () => {
  const { getAllEmployees } = useData();
  const { currentUser } = useAuth();
  const { can } = usePermissions();
  const navigate = useNavigate();

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
  const [showImport, setShowImport] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [bulkModal, setBulkModal] = useState<null | 'assign' | 'stage' | 'tag'>(null);
  const [bulkValue, setBulkValue] = useState('');
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const openedRef = React.useRef<string | null>(null);

  const pipeline = useMemo(() => pipelines.find(p => p.id === pipelineId) || pipelines.find(p => p.isDefault) || pipelines[0], [pipelines, pipelineId]);
  const stages = pipeline?.stages || [];
  const setViewPersist = (v: 'board' | 'list') => { setView(v); try { localStorage.setItem('pazzi_leads_view', v); } catch { /* noop */ } };

  const assignees = useMemo(() => (getAllEmployees() as any[]).map(e => ({ uid: (e.userId || e.id) as string, name: `${e.name || ''} ${e.lastName || ''}`.trim() || e.email })), [getAllEmployees]);
  const empName = (uid?: string | null) => {
    if (!uid) return 'Sin asignar';
    if (uid === currentUser?.id) return 'Yo';
    return assignees.find(a => a.uid === uid)?.name || 'Responsable';
  };

  const loadConfig = async () => {
    const cfg = await leadsService.getConfig();
    setPipelines(cfg.pipelines); setSources(cfg.sources); setTags(cfg.tags || []); setCustomFields(cfg.customFields || []);
    setColdDays(cfg.settings?.coldDays || 7); setLostReasons(cfg.settings?.lostReasons || []);
    return cfg;
  };

  const loadLeads = async (pid: string) => {
    const rows = await leadsService.list({ pipelineId: pid });
    setLeads(rows);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const cfg = await loadConfig();
        const def = cfg.pipelines.find(p => p.isDefault) || cfg.pipelines[0];
        const pid = def?.id || '';
        setPipelineId(pid);
        if (pid) await loadLeads(pid);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : 'No se pudieron cargar los leads.');
      } finally { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changePipeline = async (pid: string) => {
    setPipelineId(pid); setChecked(new Set());
    try { await loadLeads(pid); } catch { /* noop */ }
  };

  // Deep-links: ?lead=<id> abre la ficha; ?cold=1 activa el filtro de leads fríos.
  useEffect(() => {
    if (searchParams.get('cold') === '1') {
      setOnlyCold(true); setFilterStatus('open');
      const next = new URLSearchParams(searchParams); next.delete('cold'); setSearchParams(next, { replace: true });
    }
    const lid = searchParams.get('lead');
    if (!lid || openedRef.current === lid) return;
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
  const onDeleted = (id: string) => setLeads(prev => prev.filter(l => l.id !== id));

  // ── Drag & drop: soltar en columna (mueve al final) o sobre una tarjeta (inserta antes de ella).
  const handleDrop = async (stageId: string, beforeLeadId?: string) => {
    const id = draggedId; setDraggedId(null);
    if (!id || id === beforeLeadId) return;
    const lead = leads.find(l => l.id === id);
    if (!lead) return;
    const st = stages.find(s => s.id === stageId);
    if (st?.type === 'lost' && lead.stageId !== stageId) {
      // Para perder se pide motivo en la ficha.
      setSelected(lead);
      toast.warning('Elige el motivo de pérdida en la ficha del lead.');
      return;
    }
    const column = (byStage[stageId] || []).filter(l => l.id !== id);
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
    } catch { toast.error('No se pudo mover el lead.'); loadLeads(pipeline?.id || ''); }
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
      toast.success(`${r.affected} lead(s) actualizados.`);
      setChecked(new Set()); setBulkModal(null); setBulkValue('');
      await loadLeads(pipeline?.id || '');
    } catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudo aplicar la acción.'); }
  };

  // ── Exportar (lo que se ve con los filtros actuales) ──
  const exportExcel = () => {
    const stageName = (id: string) => stages.find(s => s.id === id)?.name || '';
    const srcName = (id?: string | null) => sources.find(s => s.id === id)?.name || '';
    const tagNames = (ids?: string[]) => (ids || []).map(id => tags.find(t => t.id === id)?.name).filter(Boolean).join(', ');
    const rows = filtered.map(l => {
      const base: Record<string, any> = {
        Nombre: l.name, Apellido: l.lastName || '', Empresa: l.companyName || '', Correo: l.email || '', Teléfono: l.phone || '',
        WhatsApp: l.whatsapp || '', Etapa: stageName(l.stageId), Estado: l.status === 'won' ? 'Ganado' : l.status === 'lost' ? 'Perdido' : 'Abierto',
        'Motivo pérdida': l.lostReason || '', Valor: l.value ?? '', Probabilidad: l.probability ?? '', Responsable: empName(l.assignedUserId),
        Fuente: srcName(l.sourceId), Etiquetas: tagNames(l.tagIds),
        'Cierre estimado': l.expectedCloseAt ? new Date(l.expectedCloseAt).toLocaleDateString() : '',
        'Próxima acción': l.nextActionAt ? new Date(l.nextActionAt).toLocaleString() : '',
        'Última actividad': l.lastActivityAt ? new Date(l.lastActivityAt).toLocaleString() : '',
        Creado: new Date(l.createdAt).toLocaleString(), Notas: l.notes || '',
      };
      customFields.forEach(f => { const v = l.customFields?.[f.id]; base[f.label] = v === true ? 'Sí' : v === false ? 'No' : (v ?? ''); });
      return base;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');
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
          <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">Leads</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            {filtered.length} lead(s) · abierto {money(totals.openValue) || '$0'}
            {totals.overdue > 0 && <span className="ml-2 text-red-600 dark:text-red-400">· {totals.overdue} con acción vencida</span>}
            {totals.cold > 0 && <button type="button" onClick={() => { setOnlyCold(true); setFilterStatus('open'); }} className="ml-2 text-amber-600 dark:text-amber-400 hover:underline">· {totals.cold} sin seguimiento</button>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {can('leads.managePipeline') && <button onClick={() => navigate('/leads/settings')} className={BUTTON_SECONDARY_SM_CLASSES}>⚙️ Configurar</button>}
          {can('leads.import') && <button onClick={() => setShowImport(true)} className={BUTTON_SECONDARY_SM_CLASSES}>⬆️ Importar</button>}
          {can('leads.export') && <button onClick={exportExcel} disabled={!filtered.length} className={BUTTON_SECONDARY_SM_CLASSES}>⬇️ Exportar</button>}
          {can('leads.create') && (
            <button onClick={() => setShowCreate(true)} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center`}><PlusIcon className="w-5 h-5" /> Nuevo lead</button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nombre, empresa, correo, teléfono…" className={inputFormStyle + ' pl-8 !w-64 !py-1.5 text-sm'} />
        </div>
        {pipelines.length > 1 && (
          <select value={pipeline?.id || ''} onChange={e => changePipeline(e.target.value)} className={selectCls} title="Pipeline">
            {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} className={selectCls}>
          <option value="">Todos los responsables</option>
          {currentUser && <option value={currentUser.id}>Mis leads</option>}
          <option value="none">Sin asignar</option>
          {assignees.filter(a => a.uid !== currentUser?.id).map(a => <option key={a.uid} value={a.uid}>{a.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className={selectCls}>
          <option value="">Todos los estados</option>
          <option value="open">Abiertos</option>
          <option value="won">Ganados</option>
          <option value="lost">Perdidos</option>
        </select>
        {tags.length > 0 && (
          <select value={filterTag} onChange={e => setFilterTag(e.target.value)} className={selectCls}>
            <option value="">Todas las etiquetas</option>
            {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
        <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className={selectCls}>
          <option value="">Todas las fuentes</option>
          {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-300 cursor-pointer select-none">
          <input type="checkbox" checked={onlyCold} onChange={e => setOnlyCold(e.target.checked)} className="h-4 w-4" /> Sin seguimiento ({coldDays}d)
        </label>
        {filtersActive && <button type="button" onClick={clearFilters} className="text-xs text-primary hover:underline">Limpiar filtros</button>}
        <div className="ml-auto flex items-center bg-neutral-100 dark:bg-neutral-700 p-0.5 rounded-md">
          <button onClick={() => setViewPersist('board')} className={`p-1.5 rounded-md ${view === 'board' ? 'bg-primary text-white' : 'text-neutral-600 dark:text-neutral-300'}`} title="Tablero" aria-label="Vista tablero"><Squares2X2Icon className="w-5 h-5" /></button>
          <button onClick={() => setViewPersist('list')} className={`p-1.5 rounded-md ${view === 'list' ? 'bg-primary text-white' : 'text-neutral-600 dark:text-neutral-300'}`} title="Lista" aria-label="Vista lista"><ListBulletIcon className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Barra de acciones masivas */}
      {checked.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3 p-2.5 rounded-lg bg-primary/10 border border-primary/30">
          <span className="text-sm font-semibold text-primary dark:text-teal-300">{checked.size} seleccionado(s)</span>
          {can('leads.assign') && <button onClick={() => { setBulkModal('assign'); setBulkValue(''); }} className={BUTTON_SECONDARY_SM_CLASSES}>👤 Asignar</button>}
          {(can('leads.changeStage') || can('leads.edit')) && <button onClick={() => { setBulkModal('stage'); setBulkValue(stages[0]?.id || ''); }} className={BUTTON_SECONDARY_SM_CLASSES}>➡️ Mover etapa</button>}
          {can('leads.edit') && tags.length > 0 && <button onClick={() => { setBulkModal('tag'); setBulkValue(tags[0]?.id || ''); }} className={BUTTON_SECONDARY_SM_CLASSES}>🏷️ Etiquetar</button>}
          {can('leads.delete') && <button onClick={() => setConfirmBulkDelete(true)} className={`${BUTTON_SECONDARY_SM_CLASSES} text-red-600 dark:text-red-400`}>🗑 Eliminar</button>}
          <button onClick={() => setChecked(new Set())} className="ml-auto text-xs text-neutral-500 hover:underline">Quitar selección</button>
        </div>
      )}

      {loading ? <LoadingSkeleton variant="cards" count={4} /> : view === 'board' ? (
        <div className="flex gap-4 overflow-x-auto pb-2 items-start">
          {stages.map(stage => {
            const list = byStage[stage.id] || [];
            const total = list.reduce((a, l) => a + (l.value || 0), 0);
            return (
              <div key={stage.id} onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(stage.id)} className="bg-slate-100 dark:bg-slate-800 rounded-xl p-2 flex flex-col w-72 flex-shrink-0 max-h-[75vh]">
                <div className="mb-2 px-2">
                  <h3 className="font-semibold text-gray-700 dark:text-gray-300 flex justify-between items-center text-sm gap-2">
                    <span className="flex items-center gap-1.5 min-w-0"><span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: stage.color || '#94a3b8' }} /><span className="truncate" translate="no">{stage.name}</span></span>
                    <span className="text-xs text-gray-500 flex-shrink-0">{list.length}</span>
                  </h3>
                  {total > 0 && <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">{money(total)}{stage.type === 'open' && stage.probability != null ? ` · pond. ${money(total * (stage.probability / 100))}` : ''}</p>}
                </div>
                <div className="space-y-2 overflow-y-auto flex-grow min-h-[80px] p-1">
                  {list.map(lead => {
                    const overdue = lead.status === 'open' && lead.nextActionAt && new Date(lead.nextActionAt).getTime() < Date.now();
                    const cold = isCold(lead);
                    return (
                      <div key={lead.id} draggable onDragStart={() => setDraggedId(lead.id)} onDragOver={e => e.preventDefault()} onDrop={e => { e.stopPropagation(); handleDrop(stage.id, lead.id); }} onClick={() => setSelected(lead)}
                        className={`bg-white dark:bg-slate-700 p-3 rounded-lg shadow hover:shadow-lg cursor-pointer border-l-4 ${draggedId === lead.id ? 'opacity-50' : ''}`} style={{ borderLeftColor: stage.color || '#94a3b8' }}>
                        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate"><span translate="no">{lead.name} {lead.lastName}</span></p>
                        {lead.companyName && <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate"><span translate="no">{lead.companyName}</span></p>}
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
                          {cold && <span className="text-[10px] text-sky-600 dark:text-sky-400" title="Sin actividad reciente">❄️ frío</span>}
                        </div>
                      </div>
                    );
                  })}
                  {list.length === 0 && <p className="text-[11px] text-neutral-400 text-center py-4">Arrastra leads aquí</p>}
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
                <th className="px-3 py-2.5 w-8"><input type="checkbox" checked={allChecked} onChange={toggleAll} className="h-4 w-4" aria-label="Seleccionar todos" /></th>
                {['Nombre', 'Empresa', 'Etapa', 'Valor', 'Responsable', 'Etiquetas', 'Estado', 'Próx. acción'].map(h => (
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
                    <td className="px-3 py-2" onClick={e => e.stopPropagation()}><input type="checkbox" checked={checked.has(l.id)} onChange={() => toggleCheck(l.id)} className="h-4 w-4" aria-label={`Seleccionar ${l.name}`} /></td>
                    <td className="px-3 py-2 text-neutral-800 dark:text-neutral-100"><span translate="no">{l.name} {l.lastName}</span>{isCold(l) && <span className="ml-1 text-[10px]" title="Sin seguimiento">❄️</span>}</td>
                    <td className="px-3 py-2 text-neutral-500 dark:text-neutral-400">{l.companyName || '—'}</td>
                    <td className="px-3 py-2"><span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: st?.color || '#94a3b8' }} />{st?.name || '—'}</span></td>
                    <td className="px-3 py-2 tabular-nums">{l.value != null ? money(l.value) : '—'}</td>
                    <td className="px-3 py-2 text-neutral-500 dark:text-neutral-400">{empName(l.assignedUserId)}</td>
                    <td className="px-3 py-2"><div className="flex flex-wrap gap-1">{(l.tagIds || []).map(id => { const t = tags.find(x => x.id === id); return t ? <TagChip key={id} tag={t} small /> : null; })}</div></td>
                    <td className="px-3 py-2">{l.status === 'won' ? '✅ Ganado' : l.status === 'lost' ? '❌ Perdido' : '🟦 Abierto'}</td>
                    <td className={`px-3 py-2 text-xs ${overdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-neutral-500'}`}>{l.nextActionAt ? new Date(l.nextActionAt).toLocaleDateString() : '—'}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={9} className="px-3 py-10 text-center text-neutral-400">{filtersActive ? 'Ningún lead coincide con los filtros.' : 'Sin leads todavía.'}</td></tr>}
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
          pipeline={pipeline}
          sources={sources}
          tags={tags}
          customFields={customFields}
          assignees={assignees}
          canAssign={can('leads.assign')}
          currentUserId={currentUser?.id}
          onClose={() => setShowCreate(false)}
          onCreated={(lead) => { setLeads(prev => [lead, ...prev]); setShowCreate(false); setSelected(lead); }}
        />
      )}

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        title="Importar leads"
        fields={IMPORT_FIELDS}
        onImport={(rows) => leadsService.importRows(rows, pipeline?.id)}
        onDone={() => loadLeads(pipeline?.id || '')}
      />

      {/* Acciones masivas */}
      <Modal isOpen={!!bulkModal} onClose={() => setBulkModal(null)} title={bulkModal === 'assign' ? 'Asignar leads' : bulkModal === 'stage' ? 'Mover de etapa' : 'Etiquetar leads'} size="sm">
        <div className="space-y-3">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">{checked.size} lead(s) seleccionados.</p>
          {bulkModal === 'assign' && (
            <select value={bulkValue} onChange={e => setBulkValue(e.target.value)} className={inputFormStyle}>
              <option value="">Sin asignar</option>
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
              {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          <div className="flex justify-end gap-2">
            {bulkModal === 'tag' && <button onClick={() => runBulk('untag', { tagId: bulkValue })} className={BUTTON_SECONDARY_SM_CLASSES}>Quitar etiqueta</button>}
            <button onClick={() => setBulkModal(null)} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
            <button
              onClick={() => bulkModal === 'assign' ? runBulk('assign', { userId: bulkValue || null }) : bulkModal === 'stage' ? runBulk('stage', { stageId: bulkValue }) : runBulk('tag', { tagId: bulkValue })}
              className={BUTTON_PRIMARY_SM_CLASSES}
            >Aplicar</button>
          </div>
        </div>
      </Modal>
      <ConfirmationModal isOpen={confirmBulkDelete} onClose={() => setConfirmBulkDelete(false)} onConfirm={() => { setConfirmBulkDelete(false); runBulk('delete'); }} title="Eliminar leads" message={`¿Eliminar ${checked.size} lead(s)? Esta acción no se puede deshacer.`} confirmButtonText="Eliminar" />
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
  onClose: () => void;
  onCreated: (lead: Lead) => void;
}> = ({ pipeline, sources, tags, customFields, assignees, canAssign, currentUserId, onClose, onCreated }) => {
  const openStages = (pipeline?.stages || []).filter(s => s.type === 'open');
  const [f, setF] = useState({
    name: '', lastName: '', companyName: '', email: '', phone: '', value: '', sourceId: sources.find(s => s.name === 'Manual')?.id || '',
    assignedUserId: currentUserId || '', stageId: openStages[0]?.id || pipeline?.stages[0]?.id || '', nextActionAt: '', expectedCloseAt: '', notes: '',
  });
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [cf, setCf] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!f.name.trim()) { toast.error('El nombre es obligatorio.'); return; }
    const missing = customFields.filter(x => x.required && (cf[x.id] === undefined || cf[x.id] === ''));
    if (missing.length) { toast.error(`Completa: ${missing.map(m => m.label).join(', ')}`); return; }
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
      } as any);
      onCreated(lead);
    } catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudo crear el lead.'); }
    finally { setSaving(false); }
  };

  const lbl = (t: string) => <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">{t}</label>;

  return (
    <Modal isOpen={true} onClose={onClose} title="Nuevo lead" size="lg">
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>{lbl('Nombre *')}<input autoFocus value={f.name} onChange={e => set('name', e.target.value)} className={inputFormStyle} /></div>
          <div>{lbl('Apellido')}<input value={f.lastName} onChange={e => set('lastName', e.target.value)} className={inputFormStyle} /></div>
          <div>{lbl('Empresa')}<input value={f.companyName} onChange={e => set('companyName', e.target.value)} className={inputFormStyle} /></div>
          <div>{lbl('Valor estimado')}<input type="number" step="0.01" value={f.value} onChange={e => set('value', e.target.value)} className={inputFormStyle} placeholder="0.00" /></div>
          <div>{lbl('Correo')}<input type="email" value={f.email} onChange={e => set('email', e.target.value)} className={inputFormStyle} /></div>
          <div>{lbl('Teléfono')}<input type="tel" value={f.phone} onChange={e => set('phone', e.target.value)} className={inputFormStyle} /></div>
          <div>{lbl('Etapa')}
            <select value={f.stageId} onChange={e => set('stageId', e.target.value)} className={inputFormStyle}>{(pipeline?.stages || []).filter(s => s.type === 'open').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          </div>
          <div>{lbl('Responsable')}
            <select value={f.assignedUserId} disabled={!canAssign} onChange={e => set('assignedUserId', e.target.value)} className={inputFormStyle}>
              <option value="">Sin asignar</option>
              {assignees.map(a => <option key={a.uid} value={a.uid}>{a.name}</option>)}
              {currentUserId && !assignees.some(a => a.uid === currentUserId) && <option value={currentUserId}>Yo</option>}
            </select>
          </div>
          <div>{lbl('Fuente')}
            <select value={f.sourceId} onChange={e => set('sourceId', e.target.value)} className={inputFormStyle}><option value="">—</option>{sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          </div>
          <div>{lbl('Cierre estimado')}<input type="date" value={f.expectedCloseAt} onChange={e => set('expectedCloseAt', e.target.value)} className={inputFormStyle} /></div>
          <div className="sm:col-span-2">{lbl('Próxima acción')}<input type="datetime-local" value={f.nextActionAt} onChange={e => set('nextActionAt', e.target.value)} className={inputFormStyle} /></div>
          {tags.length > 0 && (
            <div className="sm:col-span-2">{lbl('Etiquetas')}
              <div className="flex flex-wrap gap-1.5">
                {tags.map(t => {
                  const on = tagIds.includes(t.id);
                  return (
                    <button key={t.id} type="button" onClick={() => setTagIds(prev => on ? prev.filter(x => x !== t.id) : [...prev, t.id])}
                      className={`text-xs px-2 py-0.5 rounded-full border transition ${on ? 'font-semibold ring-2 ring-offset-1 dark:ring-offset-neutral-800' : 'opacity-60 hover:opacity-100'}`}
                      style={{ background: `${t.color || '#64748b'}22`, color: t.color || '#64748b', borderColor: `${t.color || '#64748b'}66` }}>
                      {on ? '✓ ' : ''}{t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {customFields.map(fd => (
            <div key={fd.id}>{lbl(`${fd.label}${fd.required ? ' *' : ''}`)}
              {fd.type === 'checkbox' ? (
                <label className="flex items-center gap-2 text-sm mt-2"><input type="checkbox" checked={!!cf[fd.id]} onChange={e => setCf(p => ({ ...p, [fd.id]: e.target.checked }))} className="h-4 w-4" /> Sí</label>
              ) : fd.type === 'select' ? (
                <select value={cf[fd.id] ?? ''} onChange={e => setCf(p => ({ ...p, [fd.id]: e.target.value }))} className={inputFormStyle}><option value="">—</option>{(fd.options || []).map(o => <option key={o} value={o}>{o}</option>)}</select>
              ) : (
                <input type={fd.type === 'number' ? 'number' : fd.type === 'date' ? 'date' : fd.type === 'url' ? 'url' : 'text'} value={cf[fd.id] ?? ''} onChange={e => setCf(p => ({ ...p, [fd.id]: e.target.value }))} className={inputFormStyle} />
              )}
            </div>
          ))}
          <div className="sm:col-span-2">{lbl('Notas')}<textarea rows={2} value={f.notes} onChange={e => set('notes', e.target.value)} className={inputFormStyle} /></div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t dark:border-neutral-700">
          <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
          <button onClick={submit} disabled={saving} className={BUTTON_PRIMARY_SM_CLASSES}>{saving ? 'Creando…' : 'Crear lead'}</button>
        </div>
      </div>
    </Modal>
  );
};
