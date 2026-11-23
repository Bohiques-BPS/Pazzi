import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, ConfirmationModal } from '../Modal';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, inputFormStyle } from '../../constants';
import { useData } from '../../contexts/DataContext';
import { useGlobalSettings } from '../../contexts/GlobalSettingsContext';
import { usePermissions } from '../../hooks/usePermissions';
import { ProductAutocomplete } from '../ui/ProductAutocomplete';
import { productsService } from '../../services/products';
import {
    supplierReturnsService, SR_REASON_LABEL, SR_STATUS_CLS, SR_STATUS_LABEL,
    type SupplierReturn, type SupplierReturnItem, type SupplierReturnReason, type SupplierReturnStatus,
} from '../../services/supplierReturns';
import { printSupplierReturn } from '../../utils/supplierReturnPdf';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import type { Product } from '../../types';
import { XMarkIcon } from '../icons';

/**
 * Hoja de devolución a proveedor: crear/editar (proveedor, factura, autorización, artículos con motivo y
 * costo) y seguimiento (enviada, crédito recibido/parcial, rechazada, anulada). Imprime la hoja en PDF.
 * Solo constancia: no mueve inventario ni cuentas por pagar.
 */

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
type Line = SupplierReturnItem & { key: string };
const newKey = () => Math.random().toString(36).slice(2);

export const SupplierReturnModal: React.FC<{
    /** null = cerrado; 'new' = nueva hoja; o el id de una existente. */
    target: string | 'new' | null;
    onClose: () => void;
    onSaved: (r: SupplierReturn) => void;
    onDeleted?: (id: string) => void;
}> = ({ target, onClose, onSaved, onDeleted }) => {
    const { suppliers } = useData();
    const { settings } = useGlobalSettings();
    const { can } = usePermissions();
    const canManage = can('supplierOrders.manage') || can('suppliers.manage');

    const [current, setCurrent] = useState<SupplierReturn | null>(null);
    const [editing, setEditing] = useState(false);
    const [supplierId, setSupplierId] = useState('');
    const [supplierName, setSupplierName] = useState('');
    const [invoice, setInvoice] = useState('');
    const [auth, setAuth] = useState('');
    const [notes, setNotes] = useState('');
    const [lines, setLines] = useState<Line[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [creditOpen, setCreditOpen] = useState(false);
    const [creditAmount, setCreditAmount] = useState('');
    const [creditNote, setCreditNote] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(false);

    const fillForm = (r: SupplierReturn | null) => {
        setSupplierId(r?.supplierId || '');
        setSupplierName(r?.supplierId ? '' : (r?.supplierName || ''));
        setInvoice(r?.supplierInvoiceNumber || '');
        setAuth(r?.authorizationNumber || '');
        setNotes(r?.notes || '');
        setLines((r?.items || []).map(i => ({ ...i, key: newKey() })));
        setError(null);
    };

    useEffect(() => {
        if (!target) { setCurrent(null); return; }
        if (target === 'new') { setCurrent(null); fillForm(null); setEditing(true); return; }
        setEditing(false); setBusy(true);
        supplierReturnsService.get(target)
            .then(r => { setCurrent(r); fillForm(r); })
            .catch(err => toast.error(err instanceof ApiError ? err.message : 'No se pudo cargar la hoja.'))
            .finally(() => setBusy(false));
    }, [target]);

    const searchRemote = useCallback(async (term: string): Promise<Product[]> => {
        try {
            const data = await productsService.getAll({ search: term, limit: 50, slim: true } as any);
            // SKUs a texto: la búsqueda remota los trae como { sku } y el buscador los muestra tal cual.
            return Array.isArray(data) ? (data as any[]).map(p => ({ ...p, unitPrice: Number(p.unitPrice) || 0, skus: Array.isArray(p.skus) ? p.skus.map((x: any) => typeof x === 'string' ? x : x?.sku).filter(Boolean) : [] })) : [];
        } catch { return []; }
    }, []);

    const addProduct = (p: Product) => {
        const first = (p as any).skus?.[0];
        const sku = typeof first === 'string' ? first : first?.sku || null;
        setLines(prev => [...prev, {
            key: newKey(), productId: p.id, name: p.name, sku: typeof sku === 'string' ? sku : null,
            quantity: 1, unitCost: Number((p as any).costPrice) || 0, reason: 'damaged',
        }]);
        // Si aún no hay proveedor, se propone el del producto.
        if (!supplierId && !supplierName && (p as any).supplierId) setSupplierId((p as any).supplierId);
    };
    const addManual = () => setLines(prev => [...prev, { key: newKey(), name: '', quantity: 1, unitCost: 0, reason: 'damaged' }]);
    const setLine = (key: string, patch: Partial<Line>) => setLines(prev => prev.map(l => l.key === key ? { ...l, ...patch } : l));
    const total = useMemo(() => lines.reduce((a, l) => a + (Number(l.quantity) || 0) * (Number(l.unitCost) || 0), 0), [lines]);

    const save = async () => {
        setError(null);
        if (!supplierId && !supplierName.trim()) { setError('Escoja o escriba el proveedor.'); return; }
        if (!lines.length) { setError('Agregue al menos un artículo.'); return; }
        const bad = lines.find(l => !l.name.trim() || !(Number(l.quantity) > 0));
        if (bad) { setError('Cada artículo necesita nombre y cantidad mayor que 0.'); return; }
        const payload = {
            supplierId: supplierId || null, supplierName: supplierId ? null : supplierName.trim(),
            supplierInvoiceNumber: invoice.trim() || null, authorizationNumber: auth.trim() || null, notes: notes.trim() || null,
            items: lines.map(({ key, id, ...l }) => ({ ...l, quantity: Number(l.quantity), unitCost: Number(l.unitCost) || 0, name: l.name.trim() })),
        };
        setBusy(true);
        try {
            const r = current ? await supplierReturnsService.update(current.id, payload) : await supplierReturnsService.create(payload);
            toast.success(current ? 'Hoja actualizada.' : `Hoja de devolución #${r.number ?? ''} creada.`);
            setCurrent(r); fillForm(r); setEditing(false); onSaved(r);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'No se pudo guardar la hoja.');
        } finally { setBusy(false); }
    };

    const changeStatus = async (status: SupplierReturnStatus, extra?: { creditAmount?: number; creditNoteNumber?: string }) => {
        if (!current) return;
        setBusy(true);
        try {
            const r = await supplierReturnsService.setStatus(current.id, { status, ...extra });
            setCurrent(r); onSaved(r);
            toast.success(`Estado: ${SR_STATUS_LABEL[status]}.`);
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'No se pudo cambiar el estado.');
        } finally { setBusy(false); }
    };

    const saveCredit = async () => {
        const amount = parseFloat(creditAmount);
        if (!(amount >= 0)) { toast.error('Escriba el monto del crédito.'); return; }
        const status: SupplierReturnStatus = current && amount + 0.009 < current.totalCost ? 'partial' : 'credited';
        await changeStatus(status, { creditAmount: amount, creditNoteNumber: creditNote.trim() || undefined });
        setCreditOpen(false);
    };

    const rc: any = (settings as any)?.receiptConfig || {};
    const print = () => {
        if (!current) return;
        const sup = suppliers.find(s => s.id === current.supplierId);
        printSupplierReturn(current, { businessName: rc.businessName, address: rc.address, phone: rc.phone }, sup ? { contactName: sup.contactName, phone: sup.phone, email: sup.email } : null);
    };

    const isOpen = !!target;
    const title = current ? `Devolución a proveedor #${current.number ?? ''}` : 'Nueva hoja de devolución a proveedor';
    const label = 'block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1';
    const st = current?.status;
    const open = st === 'pending' || st === 'sent';

    const footer = editing ? (
        <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { if (current) { fillForm(current); setEditing(false); } else onClose(); }} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
            <button type="button" onClick={save} disabled={busy} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{busy ? 'Guardando…' : current ? 'Guardar cambios' : 'Crear hoja'}</button>
        </div>
    ) : current ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
                <button type="button" onClick={print} className={BUTTON_SECONDARY_SM_CLASSES}>Imprimir hoja</button>
                {canManage && <button type="button" onClick={() => setEditing(true)} disabled={busy} className={BUTTON_SECONDARY_SM_CLASSES}>Editar</button>}
            </div>
            {canManage && (
                <div className="flex flex-wrap gap-2">
                    {st === 'pending' && <button type="button" onClick={() => changeStatus('sent')} disabled={busy} className={BUTTON_SECONDARY_SM_CLASSES}>Marcar enviada</button>}
                    {open && <button type="button" onClick={() => changeStatus('rejected')} disabled={busy} className="text-sm font-semibold text-red-600 dark:text-red-400 hover:underline px-2">Rechazada</button>}
                    {open && <button type="button" onClick={() => { setCreditAmount(current.totalCost.toFixed(2)); setCreditNote(current.creditNoteNumber || ''); setCreditOpen(true); }} disabled={busy} className={BUTTON_PRIMARY_SM_CLASSES}>Registrar crédito</button>}
                    {!open && st !== 'cancelled' && <button type="button" onClick={() => changeStatus('pending')} disabled={busy} className={BUTTON_SECONDARY_SM_CLASSES}>Reabrir</button>}
                </div>
            )}
        </div>
    ) : undefined;

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={title} size="5xl" footer={footer}>
                {busy && !current && target !== 'new' ? (
                    <p className="text-sm text-neutral-500 py-8 text-center">Cargando…</p>
                ) : editing ? (
                    <div className="space-y-4">
                        <p className="text-sm text-neutral-600 dark:text-neutral-300 -mt-2">Anote la mercancía dañada o defectuosa que se le devuelve al proveedor para pedir crédito. Es solo constancia: no cambia el inventario.</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label className={label}>Proveedor</label>
                                <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className={inputFormStyle}>
                                    <option value="">{suppliers.length ? '— Escoja o escriba abajo —' : 'Escriba el proveedor abajo'}</option>
                                    {[...suppliers].sort((a, b) => a.name.localeCompare(b.name)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                                {!supplierId && <input value={supplierName} onChange={e => setSupplierName(e.target.value)} placeholder="Nombre del proveedor (si no está registrado)" className={`${inputFormStyle} mt-2`} />}
                            </div>
                            <div>
                                <label className={label}>Factura del proveedor <span className="text-neutral-400 font-normal">(opcional)</span></label>
                                <input value={invoice} onChange={e => setInvoice(e.target.value)} placeholder="Nº de la factura de compra" className={inputFormStyle} />
                            </div>
                            <div>
                                <label className={label}>Nº de autorización <span className="text-neutral-400 font-normal">(opcional)</span></label>
                                <input value={auth} onChange={e => setAuth(e.target.value)} placeholder="RMA / autorización del proveedor" className={inputFormStyle} />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-sm font-semibold">Artículos</span>
                                <button type="button" onClick={addManual} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">+ Artículo sin producto</button>
                            </div>
                            <ProductAutocomplete onProductSelect={addProduct} onRemoteSearch={searchRemote} placeholder="Buscar producto por nombre, código o SKU para agregarlo" />
                            {lines.length > 0 && (
                                <div className="mt-3 border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-x-auto">
                                    <table className="min-w-full text-sm">
                                        <thead className="bg-neutral-50 dark:bg-neutral-900/40 text-neutral-500 dark:text-neutral-400">
                                            <tr>
                                                <th className="px-2 py-2 text-left font-medium">Artículo</th>
                                                <th className="px-2 py-2 text-left font-medium w-36">Motivo</th>
                                                <th className="px-2 py-2 text-right font-medium w-20">Cant.</th>
                                                <th className="px-2 py-2 text-right font-medium w-28">Costo u.</th>
                                                <th className="px-2 py-2 text-right font-medium w-24">Total</th>
                                                <th className="w-8" />
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/60">
                                            {lines.map(l => (
                                                <tr key={l.key} className="align-top">
                                                    <td className="px-2 py-1.5">
                                                        <input value={l.name} onChange={e => setLine(l.key, { name: e.target.value })} placeholder="Nombre del artículo" className={`${inputFormStyle} !py-1.5`} />
                                                        <div className="flex gap-2 mt-1">
                                                            <input value={l.customerReturnRef || ''} onChange={e => setLine(l.key, { customerReturnRef: e.target.value })} placeholder="Devolución del cliente # (opcional)" className={`${inputFormStyle} !py-1 !text-xs`} />
                                                            <input value={l.notes || ''} onChange={e => setLine(l.key, { notes: e.target.value })} placeholder="Detalle del daño (opcional)" className={`${inputFormStyle} !py-1 !text-xs`} />
                                                        </div>
                                                        {l.sku && <div className="text-[11px] text-neutral-400 mt-0.5">SKU {l.sku}</div>}
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        <select value={l.reason} onChange={e => setLine(l.key, { reason: e.target.value as SupplierReturnReason })} className={`${inputFormStyle} !py-1.5`}>
                                                            {(Object.keys(SR_REASON_LABEL) as SupplierReturnReason[]).map(r => <option key={r} value={r}>{SR_REASON_LABEL[r]}</option>)}
                                                        </select>
                                                    </td>
                                                    <td className="px-2 py-1.5"><input type="number" min={0} step="any" value={l.quantity} onChange={e => setLine(l.key, { quantity: e.target.value as any })} className={`${inputFormStyle} !py-1.5 text-right`} /></td>
                                                    <td className="px-2 py-1.5"><input type="number" min={0} step="0.01" value={l.unitCost} onChange={e => setLine(l.key, { unitCost: e.target.value as any })} className={`${inputFormStyle} !py-1.5 text-right`} /></td>
                                                    <td className="px-2 py-2.5 text-right tabular-nums font-semibold">{money((Number(l.quantity) || 0) * (Number(l.unitCost) || 0))}</td>
                                                    <td className="px-1 py-2"><button type="button" onClick={() => setLines(prev => prev.filter(x => x.key !== l.key))} aria-label="Quitar artículo" className="text-red-500 hover:text-red-700"><XMarkIcon className="w-5 h-5" /></button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-neutral-50 dark:bg-neutral-900/40 font-semibold">
                                            <tr><td colSpan={4} className="px-2 py-2 text-right">Total a reclamar</td><td className="px-2 py-2 text-right tabular-nums">{money(total)}</td><td /></tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className={label}>Notas <span className="text-neutral-400 font-normal">(opcional)</span></label>
                            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej. el proveedor recoge el viernes; llamar a Juan" className={inputFormStyle} />
                        </div>
                        {error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
                    </div>
                ) : current ? (
                    <div className="space-y-4 text-neutral-700 dark:text-neutral-200">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${SR_STATUS_CLS[current.status]}`}>{SR_STATUS_LABEL[current.status]}</span>
                            <span className="text-sm text-neutral-500">Creada {fmtDate(current.createdAt)}{current.createdByName ? ` por ${current.createdByName}` : ''}{current.sentAt ? ` · Enviada ${fmtDate(current.sentAt)}` : ''}</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                            <Info label="Proveedor">{current.supplierName}</Info>
                            <Info label="Factura del proveedor">{current.supplierInvoiceNumber || '—'}</Info>
                            <Info label="Nº de autorización">{current.authorizationNumber || '—'}</Info>
                            <Info label="Crédito">{current.creditAmount != null ? `${money(current.creditAmount)}${current.creditNoteNumber ? ` · NC ${current.creditNoteNumber}` : ''}` : 'Pendiente'}</Info>
                        </div>
                        <div className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
                            <table className="min-w-full text-sm">
                                <thead className="bg-neutral-50 dark:bg-neutral-900/40 text-neutral-500 dark:text-neutral-400">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-medium">Artículo</th>
                                        <th className="px-3 py-2 text-left font-medium">Motivo</th>
                                        <th className="px-3 py-2 text-right font-medium">Cant.</th>
                                        <th className="px-3 py-2 text-right font-medium">Costo u.</th>
                                        <th className="px-3 py-2 text-right font-medium">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/60">
                                    {current.items.map(i => (
                                        <tr key={i.id}>
                                            <td className="px-3 py-2">
                                                <div className="font-medium">{i.name}</div>
                                                <div className="text-xs text-neutral-500">{[i.sku && `SKU ${i.sku}`, i.customerReturnRef && `Devolución cliente ${i.customerReturnRef}`, i.notes].filter(Boolean).join(' · ')}</div>
                                            </td>
                                            <td className="px-3 py-2">{SR_REASON_LABEL[i.reason] || i.reason}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{i.quantity}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{money(i.unitCost)}</td>
                                            <td className="px-3 py-2 text-right tabular-nums font-semibold">{money(i.quantity * i.unitCost)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-neutral-50 dark:bg-neutral-900/40 font-semibold">
                                    <tr><td colSpan={4} className="px-3 py-2 text-right">Total a reclamar</td><td className="px-3 py-2 text-right tabular-nums">{money(current.totalCost)}</td></tr>
                                </tfoot>
                            </table>
                        </div>
                        {current.notes && <div className="text-sm whitespace-pre-wrap rounded-lg bg-neutral-50 dark:bg-neutral-900 p-3">{current.notes}</div>}
                        {canManage && st !== 'cancelled' && (
                            <div className="flex gap-4 text-sm">
                                <button type="button" onClick={() => changeStatus('cancelled')} className="text-neutral-500 hover:underline">Anular hoja</button>
                                <button type="button" onClick={() => setConfirmDelete(true)} className="text-red-600 dark:text-red-400 hover:underline">Eliminar</button>
                            </div>
                        )}
                    </div>
                ) : null}
            </Modal>

            {/* Registrar crédito recibido */}
            <Modal isOpen={creditOpen} onClose={() => setCreditOpen(false)} title="Registrar crédito del proveedor" size="md"
                footer={<div className="flex justify-end gap-2"><button type="button" onClick={() => setCreditOpen(false)} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button><button type="button" onClick={saveCredit} disabled={busy} className={BUTTON_PRIMARY_SM_CLASSES}>Guardar crédito</button></div>}>
                <div className="space-y-3">
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">Total reclamado: <b>{money(current?.totalCost || 0)}</b>. Si el crédito es menor, queda como <b>crédito parcial</b>.</p>
                    <div><label className={label}>Monto del crédito</label><input type="number" min={0} step="0.01" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} className={inputFormStyle} autoFocus /></div>
                    <div><label className={label}>Nº de nota de crédito <span className="text-neutral-400 font-normal">(opcional)</span></label><input value={creditNote} onChange={e => setCreditNote(e.target.value)} className={inputFormStyle} /></div>
                </div>
            </Modal>

            <ConfirmationModal
                isOpen={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                onConfirm={async () => {
                    setConfirmDelete(false);
                    if (!current) return;
                    try { await supplierReturnsService.remove(current.id); toast.success('Hoja eliminada.'); onDeleted?.(current.id); onClose(); }
                    catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudo eliminar.'); }
                }}
                title="Eliminar hoja de devolución"
                message={`Se eliminará la hoja #${current?.number ?? ''} de ${current?.supplierName || ''}. Si solo quiere dejarla sin efecto, use "Anular hoja". Esta acción no se puede deshacer.`}
                confirmButtonText="Eliminar"
                cancelButtonText="Cancelar"
            />
        </>
    );
};

const Info: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400">{label}</div>
        <div className="text-neutral-800 dark:text-neutral-100">{children}</div>
    </div>
);
