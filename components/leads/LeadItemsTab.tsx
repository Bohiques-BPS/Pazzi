import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LeadItem, Product } from '../../types';
import { useData } from '../../contexts/DataContext';
import { leadsService } from '../../services/leads';
import { productsService } from '../../services/products';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { useCurrency } from '../../hooks/useCurrency';
import { ProductAutocomplete } from '../ui/ProductAutocomplete';
import { MoneyInput } from '../ui/MoneyInput';
import { Modal } from '../Modal';
import { inputFormStyle, INPUT_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

interface Props {
  leadId: string;
  /** Puede editar partidas (leads.edit). */
  canEdit: boolean;
  /** Puede crear cotizaciones (estimates.manage + leads.edit). */
  canEstimate: boolean;
  lastEstimateId?: string | null;
  /** Cambia para forzar la recarga (p. ej. tras fusionar otro lead). */
  reloadKey?: number;
  onCountChange?: (count: number) => void;
  /** El backend sincronizó el valor del lead con el subtotal. */
  onValueSynced: (value: number | null) => void;
  onEstimateCreated: (res: { estimateId: string; clientId: string; clientCreated: boolean }) => void;
  onOpenEstimate: (estimateId: string) => void;
}

/** Fila editable (strings para que los inputs no salten mientras se escribe). */
interface Row {
  key: string;
  productId: string;
  name: string;
  quantity: string;
  unitPrice: string;
  discountType: '' | 'percentage' | 'fixed';
  discountValue: string;
}

const newKey = () => Math.random().toString(36).slice(2, 10);

const toRow = (it: LeadItem): Row => ({
  key: it.id || newKey(),
  productId: it.productId,
  name: it.name || '',
  quantity: String(it.quantity ?? 1),
  unitPrice: it.unitPrice != null ? Number(it.unitPrice).toFixed(2) : '',
  discountType: it.discountType || '',
  discountValue: it.discountValue != null && it.discountType ? String(it.discountValue) : '',
});

/** Misma regla que el backend: el descuento fijo aplica a la línea completa. */
export const lineTotal = (qty: number, price: number, type: string | null | undefined, value: number | null | undefined) => {
  let net = (Number(qty) || 0) * (Number(price) || 0);
  const v = Number(value) || 0;
  if (type === 'percentage' && v) net -= net * (Math.min(100, v) / 100);
  else if (type === 'fixed' && v) net -= v;
  return Math.max(0, Math.round(net * 100) / 100);
};

const rowTotal = (r: Row) => lineTotal(Number(r.quantity), Number(r.unitPrice), r.discountType || null, r.discountType ? Number(r.discountValue) : null);

const toPayload = (rows: Row[]): LeadItem[] => rows.map(r => ({
  productId: r.productId,
  name: r.name,
  quantity: Number(r.quantity),
  unitPrice: Number(r.unitPrice) || 0,
  discountType: r.discountType && Number(r.discountValue) > 0 ? r.discountType : null,
  discountValue: r.discountType && Number(r.discountValue) > 0 ? Number(r.discountValue) : null,
}));

/** Firma para detectar cambios sin guardar. */
const signature = (rows: Row[]) => JSON.stringify(toPayload(rows).map(i => [i.productId, i.quantity, i.unitPrice, i.discountType, i.discountValue]));

export const LeadItemsTab: React.FC<Props> = ({ leadId, canEdit, canEstimate, lastEstimateId, reloadKey = 0, onCountChange, onValueSynced, onEstimateCreated, onOpenEstimate }) => {
  const { t } = useTranslation();
  const { products, branches } = useData();
  const sym = useCurrency();
  const money = (n: number) => `${sym}${n.toFixed(2)}`;

  const [rows, setRows] = useState<Row[]>([]);
  const [savedRows, setSavedRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncValue, setSyncValue] = useState(true);

  // Cotización
  const [estOpen, setEstOpen] = useState(false);
  const [estBranch, setEstBranch] = useState('');
  const [estDays, setEstDays] = useState('15');
  const [estNotes, setEstNotes] = useState('');
  const [estCreating, setEstCreating] = useState(false);
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);

  const activeBranches = useMemo(() => (branches || []).filter(b => b.isActive !== false), [branches]);

  const applyLoaded = useCallback((items: LeadItem[]) => {
    const next = (items || []).map(toRow);
    setRows(next);
    setSavedRows(next);
    onCountChange?.(next.length);
  }, [onCountChange]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    leadsService.getItems(leadId)
      .then(items => { if (!cancelled) applyLoaded(items); })
      .catch(() => { /* sin partidas o endpoint no disponible: lista vacía */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [leadId, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const savedSig = useMemo(() => signature(savedRows), [savedRows]);
  const savedCount = savedRows.length;
  const dirty = signature(rows) !== savedSig;
  const subtotal = useMemo(() => Math.round(rows.reduce((s, r) => s + rowTotal(r), 0) * 100) / 100, [rows]);

  const productName = (r: Row) => r.name || products.find(p => p.id === r.productId)?.name || r.productId;

  // Búsqueda remota: el catálogo de DataContext trae solo los primeros 200 productos.
  const searchRemote = useCallback(async (term: string): Promise<Product[]> => {
    try {
      const data = await productsService.getAll({ search: term, limit: 50, slim: true });
      if (!Array.isArray(data)) return [];
      return data.map((p: any) => ({
        ...p,
        unitPrice: Number(p.unitPrice) || 0,
        skus: Array.isArray(p.skus) ? p.skus.map((s: any) => typeof s === 'string' ? s : s.sku) : [],
      } as Product));
    } catch { return []; }
  }, []);

  const addProduct = (p: Product) => {
    setRows(prev => {
      const existing = prev.find(r => r.productId === p.id);
      if (existing) return prev.map(r => r === existing ? { ...r, quantity: String((Number(r.quantity) || 0) + 1) } : r);
      return [...prev, { key: newKey(), productId: p.id, name: p.name, quantity: '1', unitPrice: (Number(p.unitPrice) || 0).toFixed(2), discountType: '', discountValue: '' }];
    });
  };

  const patchRow = (key: string, patch: Partial<Row>) => setRows(prev => prev.map(r => r.key === key ? { ...r, ...patch } : r));
  const removeRow = (key: string) => setRows(prev => prev.filter(r => r.key !== key));

  const handleSave = async () => {
    // Cantidad entera ≥ 1 (Estimate/CartItem.quantity es Int).
    const invalid = rows.some(r => !(Number(r.quantity) >= 1) || !Number.isInteger(Number(r.quantity)) || !(Number(r.unitPrice) >= 0) || r.unitPrice === ''
      || (r.discountType === 'percentage' && Number(r.discountValue) > 100)
      || (r.discountType && Number(r.discountValue) < 0));
    if (invalid) { toast.error(t('leads.detail.toast.items_invalid')); return; }
    setSaving(true);
    try {
      const res = await leadsService.saveItems(leadId, toPayload(rows), syncValue);
      applyLoaded(res.items || []);
      if (syncValue) onValueSynced(res.value ?? null);
      toast.success(t('leads.detail.toast.items_saved'));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('leads.detail.toast.items_save_failed'));
    } finally { setSaving(false); }
  };

  const openEstimateModal = () => {
    setEstBranch(activeBranches[0]?.id || '');
    setEstDays('15');
    setEstNotes('');
    setEstOpen(true);
  };

  const handleCreateEstimate = async () => {
    const days = Math.round(Number(estDays));
    setEstCreating(true);
    try {
      const res = await leadsService.createEstimate(leadId, {
        ...(activeBranches.length > 1 && estBranch ? { branchId: estBranch } : {}),
        ...(days > 0 ? { expiryDays: Math.min(365, Math.max(1, Math.round(days))) } : {}),
        ...(estNotes.trim() ? { notes: estNotes.trim() } : {}),
      });
      setEstOpen(false);
      setJustCreatedId(res.estimateId);
      toast.success(res.clientCreated ? t('leads.detail.toast.estimate_created_client') : t('leads.detail.toast.estimate_created'));
      onEstimateCreated(res);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('leads.detail.toast.estimate_failed'));
    } finally { setEstCreating(false); }
  };

  const estimateDisabledReason = savedCount === 0 ? t('leads.detail.estimate.need_items') : dirty ? t('leads.detail.estimate.need_save') : '';
  const cell = 'px-2 py-1.5';

  if (loading) return <p className="text-xs text-neutral-400">{t('leads.common.loading')}</p>;

  return (
    <div className="space-y-3">
      {justCreatedId && (
        <div className="flex items-center justify-between gap-2 flex-wrap rounded-md border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20 px-3 py-2 text-sm">
          <span className="text-green-800 dark:text-green-300">✓ {t('leads.detail.estimate.created_banner')}</span>
          <button type="button" onClick={() => onOpenEstimate(justCreatedId)} className="font-semibold text-green-800 dark:text-green-300 hover:underline">{t('leads.detail.estimate.view')}</button>
        </div>
      )}

      {canEdit && (
        <ProductAutocomplete products={products} onRemoteSearch={searchRemote} onProductSelect={addProduct} placeholder={t('leads.detail.items.search_ph')} />
      )}

      {rows.length === 0 ? (
        <p className="text-xs text-neutral-400 py-2">{canEdit ? t('leads.detail.items.empty') : t('leads.detail.items.empty_readonly')}</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-neutral-200 dark:border-neutral-700">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-700/40 text-xs text-neutral-500 dark:text-neutral-400">
              <tr>
                <th className={`${cell} text-left font-medium`}>{t('leads.detail.items.col_product')}</th>
                <th className={`${cell} text-right font-medium w-20`}>{t('leads.detail.items.col_qty')}</th>
                <th className={`${cell} text-right font-medium w-32`}>{t('leads.detail.items.col_price')}</th>
                <th className={`${cell} text-left font-medium w-44`}>{t('leads.detail.items.col_discount')}</th>
                <th className={`${cell} text-right font-medium w-28`}>{t('leads.detail.items.col_total')}</th>
                {canEdit && <th className={`${cell} w-8`} />}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.key} className="border-t border-neutral-100 dark:border-neutral-700/60">
                  <td className={`${cell} text-neutral-700 dark:text-neutral-200`}><span translate="no">{productName(r)}</span></td>
                  <td className={`${cell} text-right`}>
                    {canEdit
                      ? <input type="number" min={1} step={1} value={r.quantity} onChange={e => patchRow(r.key, { quantity: e.target.value })} className={`${INPUT_SM_CLASSES} w-full text-right`} />
                      : <span translate="no">{r.quantity}</span>}
                  </td>
                  <td className={`${cell} text-right`}>
                    {canEdit
                      ? <MoneyInput value={r.unitPrice} onChange={v => patchRow(r.key, { unitPrice: v })} className={`${INPUT_SM_CLASSES} w-full text-right`} />
                      : <span translate="no">{money(Number(r.unitPrice) || 0)}</span>}
                  </td>
                  <td className={cell}>
                    {canEdit ? (
                      <div className="flex gap-1">
                        <select value={r.discountType} onChange={e => patchRow(r.key, { discountType: e.target.value as Row['discountType'], ...(e.target.value ? {} : { discountValue: '' }) })} className={`${INPUT_SM_CLASSES} !px-1.5`}>
                          <option value="">{t('leads.detail.items.no_discount')}</option>
                          <option value="percentage">%</option>
                          <option value="fixed">{sym}</option>
                        </select>
                        {r.discountType && (
                          <input type="number" min={0} max={r.discountType === 'percentage' ? 100 : undefined} step="any" value={r.discountValue} onChange={e => patchRow(r.key, { discountValue: e.target.value })} className={`${INPUT_SM_CLASSES} w-20 text-right`} />
                        )}
                      </div>
                    ) : (
                      <span className="text-neutral-500 dark:text-neutral-400" translate="no">
                        {r.discountType && Number(r.discountValue) > 0 ? (r.discountType === 'percentage' ? `${r.discountValue}%` : money(Number(r.discountValue))) : '—'}
                      </span>
                    )}
                  </td>
                  <td className={`${cell} text-right font-semibold text-neutral-800 dark:text-neutral-100`}><span translate="no">{money(rowTotal(r))}</span></td>
                  {canEdit && (
                    <td className={`${cell} text-center`}>
                      <button type="button" onClick={() => removeRow(r.key)} className="text-neutral-400 hover:text-red-500 p-0.5" aria-label={t('leads.detail.items.remove')} title={t('leads.detail.items.remove')}>✕</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-700/40">
                <td colSpan={4} className={`${cell} text-right text-neutral-600 dark:text-neutral-300`}>
                  {t('leads.detail.items.subtotal')} <span className="text-[11px] text-neutral-400">({t('leads.detail.items.subtotal_hint')})</span>
                </td>
                <td className={`${cell} text-right font-bold text-neutral-800 dark:text-neutral-100`}><span translate="no">{money(subtotal)}</span></td>
                {canEdit && <td />}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap text-sm">
          {canEdit && (
            <label className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
              <input type="checkbox" checked={syncValue} onChange={e => setSyncValue(e.target.checked)} className="h-4 w-4" />
              {t('leads.detail.items.sync_value')}
            </label>
          )}
          {lastEstimateId && canEstimate && (
            <button type="button" onClick={() => onOpenEstimate(lastEstimateId)} className="text-sm font-semibold text-primary dark:text-teal-300 hover:underline">{t('leads.detail.estimate.last')}</button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && dirty && <span className="text-xs text-amber-600 dark:text-amber-400">{t('leads.detail.items.unsaved')}</span>}
          {canEdit && dirty && (
            <button type="button" onClick={() => setRows(savedRows)} className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.detail.items.discard')}</button>
          )}
          {canEstimate && (
            <button type="button" onClick={openEstimateModal} disabled={!!estimateDisabledReason} title={estimateDisabledReason || undefined} className={`${BUTTON_SECONDARY_SM_CLASSES} disabled:opacity-50 disabled:cursor-not-allowed`}>{t('leads.detail.estimate.create_btn')}</button>
          )}
          {canEdit && (
            <button type="button" onClick={handleSave} disabled={saving || !dirty} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50 disabled:cursor-not-allowed`}>{saving ? t('leads.common.saving') : t('leads.detail.items.save')}</button>
          )}
        </div>
      </div>

      {/* Crear cotización */}
      <Modal isOpen={estOpen} onClose={() => !estCreating && setEstOpen(false)} title={t('leads.detail.estimate.title')} size="sm">
        <div className="space-y-3">
          <p className="text-sm text-neutral-600 dark:text-neutral-300">{t('leads.detail.estimate.intro', { count: savedCount })}</p>
          {activeBranches.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">{t('leads.detail.estimate.branch')}</label>
              <select value={estBranch} onChange={e => setEstBranch(e.target.value)} className={inputFormStyle}>
                {activeBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">{t('leads.detail.estimate.expiry_days')}</label>
            <input type="number" min={1} max={365} value={estDays} onChange={e => setEstDays(e.target.value)} className={inputFormStyle} />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">{t('leads.detail.estimate.notes')}</label>
            <textarea rows={2} value={estNotes} onChange={e => setEstNotes(e.target.value)} className={inputFormStyle + ' !h-auto'} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEstOpen(false)} disabled={estCreating} className={BUTTON_SECONDARY_SM_CLASSES}>{t('leads.common.cancel')}</button>
            <button type="button" onClick={handleCreateEstimate} disabled={estCreating} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{estCreating ? t('leads.detail.estimate.creating') : t('leads.detail.estimate.create')}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
