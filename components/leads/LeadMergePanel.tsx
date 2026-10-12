import React, { useEffect, useState } from 'react';
import { Lead, LeadDuplicate } from '../../types';
import { leadsService } from '../../services/leads';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { ConfirmationModal } from '../Modal';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

interface Props {
  lead: Lead;
  /** Puede fusionar (leads.edit + leads.delete). */
  canMerge: boolean;
  stageName: (id?: string | null) => string;
  /** El backend devolvió el lead destino ya fusionado; `sourceId` fue eliminado. */
  onMerged: (merged: Lead, sourceId: string) => void;
}

const fullName = (x: { name: string; lastName?: string | null }) => `${x.name || ''} ${x.lastName || ''}`.trim();

/** Banner ámbar con posibles duplicados del lead y acción "Fusionar aquí". */
export const LeadMergePanel: React.FC<Props> = ({ lead, canMerge, stageName, onMerged }) => {
  const { t } = useTranslation();
  const [dups, setDups] = useState<LeadDuplicate[]>([]);
  const [open, setOpen] = useState(false);
  const [confirmFor, setConfirmFor] = useState<LeadDuplicate | null>(null);
  const [mergingId, setMergingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    leadsService.duplicatesOf(lead.id)
      .then(list => { if (!cancelled && Array.isArray(list)) setDups(list.filter(d => d.id !== lead.id)); })
      .catch(() => { /* sin duplicados o endpoint no disponible */ });
    return () => { cancelled = true; };
  }, [lead.id]);

  const doMerge = async () => {
    const src = confirmFor;
    setConfirmFor(null);
    if (!src) return;
    setMergingId(src.id);
    try {
      const merged = await leadsService.merge(lead.id, src.id);
      setDups(prev => prev.filter(d => d.id !== src.id));
      toast.success(t('leads.detail.toast.merged'));
      onMerged(merged, src.id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('leads.detail.toast.merge_failed'));
    } finally { setMergingId(null); }
  };

  if (dups.length === 0) return null;

  const statusCls = (s: LeadDuplicate['status']) => s === 'won'
    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
    : s === 'lost' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
      : 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300';

  return (
    <div className="rounded-md border border-amber-300 dark:border-amber-700/70 bg-amber-50 dark:bg-amber-900/20 text-sm">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left">
        <span className="font-semibold text-amber-800 dark:text-amber-300">⚠️ {t('leads.detail.dup.banner', { count: dups.length })}</span>
        <span className="text-xs text-amber-700 dark:text-amber-400">{open ? t('leads.detail.dup.hide') : t('leads.detail.dup.show')} {open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <ul className="border-t border-amber-200 dark:border-amber-800/60 divide-y divide-amber-200 dark:divide-amber-800/60">
          {dups.map(d => (
            <li key={d.id} className="flex items-center justify-between gap-2 px-3 py-2 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-neutral-800 dark:text-neutral-100" translate="no">{fullName(d)}</span>
                  {d.companyName && <span className="text-neutral-500 dark:text-neutral-400" translate="no">· {d.companyName}</span>}
                  <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 dark:bg-amber-800/60 dark:text-amber-200">{t(`leads.detail.dup.reason.${d.reason}`)}</span>
                  <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${statusCls(d.status)}`}>{t(`leads.common.status.${d.status}`)}</span>
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  <span translate="no">{[d.email, d.phone || d.whatsapp].filter(Boolean).join(' · ') || '—'}</span>
                  {' · '}{stageName(d.stageId)}
                  {' · '}{t('leads.detail.dup.created', { date: new Date(d.createdAt).toLocaleDateString() })}
                </div>
              </div>
              {canMerge && (
                <button type="button" onClick={() => setConfirmFor(d)} disabled={!!mergingId} className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50">
                  {mergingId === d.id ? t('leads.detail.dup.merging') : t('leads.detail.dup.merge_here')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <ConfirmationModal
        isOpen={!!confirmFor}
        onClose={() => setConfirmFor(null)}
        onConfirm={doMerge}
        title={t('leads.detail.dup.merge_title')}
        message={confirmFor ? t('leads.detail.dup.merge_message', { source: fullName(confirmFor), target: fullName(lead) }) : ''}
        confirmButtonText={t('leads.detail.dup.merge_confirm')}
        cancelButtonText={t('leads.common.cancel')}
      />
    </div>
  );
};
