import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Lead, Pipeline, LeadSource } from '../../types';
import { useData } from '../../contexts/DataContext';
import { usePermissions } from '../../hooks/usePermissions';
import { leadsService } from '../../services/leads';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { Modal } from '../../components/Modal';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { LeadDetailModal } from '../../components/leads/LeadDetailModal';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { PlusIcon, Squares2X2Icon, ListBulletIcon, MagnifyingGlassIcon } from '../../components/icons';

const money = (n?: number | null, c?: string | null) => n != null ? `${c || '$'}${Number(n).toFixed(2)}` : '';

export const LeadsPage: React.FC = () => {
  const { getAllEmployees } = useData();
  const { can } = usePermissions();

  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [sources, setSources] = useState<LeadSource[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [pipelineId, setPipelineId] = useState('');
  const [view, setView] = useState<'board' | 'list'>('board');
  const [search, setSearch] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterStatus, setFilterStatus] = useState<'' | 'open' | 'won' | 'lost'>('');
  const [selected, setSelected] = useState<Lead | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const openedRef = React.useRef<string | null>(null);

  const pipeline = useMemo(() => pipelines.find(p => p.id === pipelineId) || pipelines[0], [pipelines, pipelineId]);
  const stages = pipeline?.stages || [];

  const empName = (uid?: string | null) => {
    if (!uid) return 'Sin asignar';
    const e = (getAllEmployees() as any[]).find(x => x.userId === uid || x.id === uid);
    return e ? (`${e.name || ''} ${e.lastName || ''}`.trim() || e.email) : 'Responsable';
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const cfg = await leadsService.getConfig();
      setPipelines(cfg.pipelines); setSources(cfg.sources);
      const pid = pipelineId || cfg.pipelines[0]?.id || '';
      if (!pipelineId) setPipelineId(pid);
      const rows = await leadsService.list({ pipelineId: pid });
      setLeads(rows);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudieron cargar los leads.');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { if (pipelineId) leadsService.list({ pipelineId }).then(setLeads).catch(() => {}); /* eslint-disable-next-line */ }, [pipelineId]);

  // Deep-link ?lead=<id>
  useEffect(() => {
    const lid = searchParams.get('lead');
    if (!lid || openedRef.current === lid) return;
    const found = leads.find(l => l.id === lid);
    if (found) {
      openedRef.current = lid;
      setSelected(found);
      const next = new URLSearchParams(searchParams); next.delete('lead'); setSearchParams(next, { replace: true });
    }
  }, [searchParams, leads, setSearchParams]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter(l => {
      if (filterAssignee && (l.assignedUserId || '') !== filterAssignee) return false;
      if (filterStatus && l.status !== filterStatus) return false;
      if (!q) return true;
      const hay = `${l.name} ${l.lastName || ''} ${l.companyName || ''} ${l.email || ''} ${l.phone || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [leads, search, filterAssignee, filterStatus]);

  const byStage = useMemo(() => {
    const m: Record<string, Lead[]> = {};
    stages.forEach(s => { m[s.id] = []; });
    for (const l of filtered) { (m[l.stageId] || (m[l.stageId] = [])).push(l); }
    return m;
  }, [filtered, stages]);

  const onChanged = (lead: Lead) => setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, ...lead } : l));
  const onDeleted = (id: string) => setLeads(prev => prev.filter(l => l.id !== id));

  const handleDrop = async (stageId: string) => {
    const id = draggedId; setDraggedId(null);
    if (!id) return;
    const lead = leads.find(l => l.id === id);
    if (!lead || lead.stageId === stageId) return;
    const st = stages.find(s => s.id === stageId);
    // Optimista
    setLeads(prev => prev.map(l => l.id === id ? { ...l, stageId, status: st?.type === 'won' ? 'won' : st?.type === 'lost' ? 'lost' : 'open' } : l));
    try { const updated = await leadsService.moveStage(id, stageId); onChanged({ ...lead, ...updated }); }
    catch { toast.error('No se pudo mover el lead.'); loadAll(); }
  };

  const assignees = useMemo(() => (getAllEmployees() as any[]).map(e => ({ uid: (e.userId || e.id) as string, name: `${e.name || ''} ${e.lastName || ''}`.trim() || e.email })), [getAllEmployees]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">Leads</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{filtered.length} leads{pipeline ? ` · ${pipeline.name}` : ''}</p>
        </div>
        {can('leads.create') && (
          <button onClick={() => setShowCreate(true)} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center self-start`}><PlusIcon className="w-5 h-5" /> Nuevo lead</button>
        )}
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nombre, empresa, correo…" className={inputFormStyle + ' pl-8 !w-64'} />
        </div>
        {pipelines.length > 1 && (
          <select value={pipelineId} onChange={e => setPipelineId(e.target.value)} className={inputFormStyle + ' !w-auto'}>
            {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)} className={inputFormStyle + ' !w-auto'}>
          <option value="">Todos los responsables</option>
          {assignees.map(a => <option key={a.uid} value={a.uid}>{a.name}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)} className={inputFormStyle + ' !w-auto'}>
          <option value="">Todos los estados</option>
          <option value="open">Abiertos</option>
          <option value="won">Ganados</option>
          <option value="lost">Perdidos</option>
        </select>
        <div className="ml-auto flex items-center bg-neutral-100 dark:bg-neutral-700 p-0.5 rounded-md">
          <button onClick={() => setView('board')} className={`p-1.5 rounded-md ${view === 'board' ? 'bg-primary text-white' : 'text-neutral-600 dark:text-neutral-300'}`} title="Tablero"><Squares2X2Icon className="w-5 h-5" /></button>
          <button onClick={() => setView('list')} className={`p-1.5 rounded-md ${view === 'list' ? 'bg-primary text-white' : 'text-neutral-600 dark:text-neutral-300'}`} title="Lista"><ListBulletIcon className="w-5 h-5" /></button>
        </div>
      </div>

      {loading ? <LoadingSkeleton variant="cards" count={4} /> : view === 'board' ? (
        <div className="flex gap-4 overflow-x-auto pb-2 items-start">
          {stages.map(stage => {
            const list = byStage[stage.id] || [];
            const total = list.reduce((a, l) => a + (l.value || 0), 0);
            return (
              <div key={stage.id} onDragOver={e => e.preventDefault()} onDrop={() => handleDrop(stage.id)} className="bg-slate-100 dark:bg-slate-800 rounded-xl p-2 flex flex-col w-72 flex-shrink-0">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2 px-2 flex justify-between items-center text-sm">
                  <span className="flex items-center gap-1.5 truncate"><span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: stage.color || '#94a3b8' }} />{stage.name}</span>
                  <span className="text-xs text-gray-500 flex-shrink-0">{list.length}{total ? ` · ${money(total, '$')}` : ''}</span>
                </h3>
                <div className="space-y-2 overflow-y-auto flex-grow min-h-[80px] p-1">
                  {list.map(lead => (
                    <div key={lead.id} draggable onDragStart={() => setDraggedId(lead.id)} onClick={() => setSelected(lead)}
                      className="bg-white dark:bg-slate-700 p-3 rounded-lg shadow hover:shadow-lg cursor-pointer border-l-4" style={{ borderLeftColor: stage.color || '#94a3b8' }}>
                      <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 truncate">{lead.name} {lead.lastName}</p>
                      {lead.companyName && <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{lead.companyName}</p>}
                      <div className="flex items-center justify-between mt-2 gap-2">
                        {lead.value != null ? <span className="text-xs font-bold text-primary dark:text-teal-300">{money(lead.value, '$')}</span> : <span />}
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-600 text-neutral-500 dark:text-neutral-300 truncate max-w-[110px]">{empName(lead.assignedUserId)}</span>
                      </div>
                      {lead.nextActionAt && <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">⏰ {new Date(lead.nextActionAt).toLocaleDateString()}</p>}
                    </div>
                  ))}
                  {list.length === 0 && <p className="text-[11px] text-neutral-400 text-center py-4">Vacío</p>}
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
                {['Nombre', 'Empresa', 'Etapa', 'Valor', 'Responsable', 'Estado', 'Próx. acción'].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/60">
              {filtered.map(l => {
                const st = stages.find(s => s.id === l.stageId);
                return (
                  <tr key={l.id} onClick={() => setSelected(l)} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30 cursor-pointer">
                    <td className="px-3 py-2 text-neutral-800 dark:text-neutral-100">{l.name} {l.lastName}</td>
                    <td className="px-3 py-2 text-neutral-500 dark:text-neutral-400">{l.companyName || '—'}</td>
                    <td className="px-3 py-2"><span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: st?.color || '#94a3b8' }} />{st?.name || '—'}</span></td>
                    <td className="px-3 py-2 tabular-nums">{l.value != null ? money(l.value, '$') : '—'}</td>
                    <td className="px-3 py-2 text-neutral-500 dark:text-neutral-400">{empName(l.assignedUserId)}</td>
                    <td className="px-3 py-2">{l.status === 'won' ? '✅ Ganado' : l.status === 'lost' ? '❌ Perdido' : '🟦 Abierto'}</td>
                    <td className="px-3 py-2 text-xs text-neutral-500">{l.nextActionAt ? new Date(l.nextActionAt).toLocaleDateString() : '—'}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={7} className="px-3 py-10 text-center text-neutral-400">Sin leads.</td></tr>}
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
          onClose={() => setSelected(null)}
          onChanged={onChanged}
          onDeleted={onDeleted}
        />
      )}

      {showCreate && (
        <CreateLeadModal
          pipeline={pipeline}
          sources={sources}
          assignees={assignees}
          onClose={() => setShowCreate(false)}
          onCreated={(lead) => { setLeads(prev => [lead, ...prev]); setShowCreate(false); setSelected(lead); }}
        />
      )}
    </div>
  );
};

// ── Modal de creación ──
const CreateLeadModal: React.FC<{
  pipeline?: Pipeline;
  sources: LeadSource[];
  assignees: { uid: string; name: string }[];
  onClose: () => void;
  onCreated: (lead: Lead) => void;
}> = ({ pipeline, sources, assignees, onClose, onCreated }) => {
  const [f, setF] = useState({ name: '', lastName: '', companyName: '', email: '', phone: '', value: '', sourceId: '', assignedUserId: '', stageId: pipeline?.stages[0]?.id || '', nextActionAt: '' });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (!f.name.trim()) { toast.error('El nombre es obligatorio.'); return; }
    setSaving(true);
    try {
      const lead = await leadsService.create({
        name: f.name.trim(), lastName: f.lastName || null, companyName: f.companyName || null,
        email: f.email || null, phone: f.phone || null, value: f.value ? Number(f.value) : null,
        pipelineId: pipeline?.id, stageId: f.stageId || undefined, sourceId: f.sourceId || null,
        assignedUserId: f.assignedUserId || null, nextActionAt: f.nextActionAt ? new Date(f.nextActionAt).toISOString() : null,
      } as any);
      onCreated(lead);
    } catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudo crear el lead.'); }
    finally { setSaving(false); }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Nuevo lead" size="lg">
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="block text-xs font-medium text-neutral-500 mb-1">Nombre *</label><input autoFocus value={f.name} onChange={e => set('name', e.target.value)} className={inputFormStyle} /></div>
          <div><label className="block text-xs font-medium text-neutral-500 mb-1">Apellido</label><input value={f.lastName} onChange={e => set('lastName', e.target.value)} className={inputFormStyle} /></div>
          <div><label className="block text-xs font-medium text-neutral-500 mb-1">Empresa</label><input value={f.companyName} onChange={e => set('companyName', e.target.value)} className={inputFormStyle} /></div>
          <div><label className="block text-xs font-medium text-neutral-500 mb-1">Valor estimado</label><input type="number" step="0.01" value={f.value} onChange={e => set('value', e.target.value)} className={inputFormStyle} placeholder="0.00" /></div>
          <div><label className="block text-xs font-medium text-neutral-500 mb-1">Correo</label><input value={f.email} onChange={e => set('email', e.target.value)} className={inputFormStyle} /></div>
          <div><label className="block text-xs font-medium text-neutral-500 mb-1">Teléfono</label><input value={f.phone} onChange={e => set('phone', e.target.value)} className={inputFormStyle} /></div>
          <div><label className="block text-xs font-medium text-neutral-500 mb-1">Etapa</label>
            <select value={f.stageId} onChange={e => set('stageId', e.target.value)} className={inputFormStyle}>{(pipeline?.stages || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          </div>
          <div><label className="block text-xs font-medium text-neutral-500 mb-1">Responsable</label>
            <select value={f.assignedUserId} onChange={e => set('assignedUserId', e.target.value)} className={inputFormStyle}><option value="">Sin asignar</option>{assignees.map(a => <option key={a.uid} value={a.uid}>{a.name}</option>)}</select>
          </div>
          <div><label className="block text-xs font-medium text-neutral-500 mb-1">Fuente</label>
            <select value={f.sourceId} onChange={e => set('sourceId', e.target.value)} className={inputFormStyle}><option value="">—</option>{sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          </div>
          <div><label className="block text-xs font-medium text-neutral-500 mb-1">Próxima acción</label><input type="datetime-local" value={f.nextActionAt} onChange={e => set('nextActionAt', e.target.value)} className={inputFormStyle} /></div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t dark:border-neutral-700">
          <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
          <button onClick={submit} disabled={saving} className={BUTTON_PRIMARY_SM_CLASSES}>{saving ? 'Creando…' : 'Crear lead'}</button>
        </div>
      </div>
    </Modal>
  );
};
