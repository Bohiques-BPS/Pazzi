import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { ApiError } from '../../services/api';
import {
    platformService,
    type BillingInterval, type DowngradePolicy, type Plan, type PlanChangePreview, type PlatformAuditEntry,
    type PlatformBusiness, type PlatformInvoice, type PlatformSettings, type UpgradePolicy,
} from '../../services/platform';
import { toast } from '../../hooks/useToast';
import { Modal, ConfirmationModal } from '../../components/Modal';
import { DataTable, type TableColumn } from '../../components/DataTable';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { MoneyInput } from '../../components/ui/MoneyInput';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;
const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('es-PR', { timeZone: 'UTC' }) : '—');
const fmtDateTime = (d?: string | null) => (d ? new Date(d).toLocaleString('es-PR') : '—');
const errMsg = (err: unknown, fallback: string) => (err instanceof ApiError ? err.message : fallback);
const inputCls = `${INPUT_SM_CLASSES} w-full`;
const labelCls = 'block text-xs text-neutral-500 dark:text-neutral-400 mb-1';
const cardCls = 'bg-white dark:bg-neutral-800 rounded-lg shadow-md p-5';

const Badge: React.FC<{ tone: 'green' | 'amber' | 'red' | 'blue' | 'neutral'; children: React.ReactNode }> = ({ tone, children }) => {
    const cls = {
        green: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
        amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
        blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        neutral: 'bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300',
    }[tone];
    return <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${cls}`}>{children}</span>;
};

const BUSINESS_STATUS: Record<string, { tone: 'green' | 'amber' | 'neutral'; label: string }> = {
    active: { tone: 'green', label: 'Activo' },
    suspended: { tone: 'amber', label: 'Suspendido' },
    archived: { tone: 'neutral', label: 'Archivado' },
};
const SUB_STATUS: Record<string, { tone: 'green' | 'amber' | 'red' | 'blue' | 'neutral'; label: string }> = {
    trialing: { tone: 'blue', label: 'En prueba' },
    active: { tone: 'green', label: 'Al día' },
    past_due: { tone: 'red', label: 'Atrasada' },
    cancelled: { tone: 'neutral', label: 'Cancelada' },
};
const INVOICE_STATUS: Record<string, { tone: 'green' | 'amber' | 'neutral'; label: string }> = {
    pending: { tone: 'amber', label: 'Pendiente' },
    paid: { tone: 'green', label: 'Pagada' },
    void: { tone: 'neutral', label: 'Anulada' },
};
const INTERVAL_LABEL: Record<BillingInterval, string> = { month: 'Mensual', year: 'Anual' };
const UPGRADE_OPTIONS: { value: UpgradePolicy; label: string }[] = [
    { value: 'charge_now', label: 'Cobrar la diferencia ahora' },
    { value: 'next_invoice', label: 'Sumarla a la próxima factura' },
    { value: 'no_charge', label: 'No cobrar la diferencia' },
];
const DOWNGRADE_OPTIONS: { value: DowngradePolicy; label: string }[] = [
    { value: 'period_end', label: 'Cambiar al terminar el período' },
    { value: 'credit_now', label: 'Cambiar ahora y dejar saldo a favor' },
    { value: 'no_credit', label: 'Cambiar ahora sin devolver nada' },
];

// ─── Reglas de prorrateo ─────────────────────────────────────────────────────
const SettingsTab: React.FC = () => {
    const [form, setForm] = useState<PlatformSettings | null>(null);
    const [taxPct, setTaxPct] = useState('0');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        platformService.getSettings()
            .then(s => { setForm(s); setTaxPct(String(Math.round(s.taxRate * 10000) / 100)); })
            .catch(err => toast.error(errMsg(err, 'No se pudieron cargar las reglas.')));
    }, []);

    if (!form) return <LoadingSkeleton variant="table" rows={5} />;
    const set = (patch: Partial<PlatformSettings>) => setForm(f => (f ? { ...f, ...patch } : f));

    const save = async () => {
        setSaving(true);
        try {
            const { id: _id, ...data } = form;
            const saved = await platformService.updateSettings({
                prorationEnabled: data.prorationEnabled, upgradePolicy: data.upgradePolicy, downgradePolicy: data.downgradePolicy,
                prorationBasis: data.prorationBasis, minProrationAmount: Number(data.minProrationAmount) || 0,
                trialDays: Number(data.trialDays) || 0, graceDays: Number(data.graceDays) || 0, taxRate: (parseFloat(taxPct) || 0) / 100,
            });
            setForm(saved);
            toast.success('Reglas guardadas. Aplican a los próximos cambios de plan.');
        } catch (err) { toast.error(errMsg(err, 'No se pudieron guardar.')); }
        finally { setSaving(false); }
    };

    return (
        <div className={`${cardCls} max-w-3xl space-y-5`}>
            <div>
                <h2 className="text-lg font-semibold text-primary">Prorrateo y cobro</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Reglas que se usan al cambiar a un negocio de plan. En cada cambio puedes usar otra regla o escribir el monto a mano.</p>
            </div>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.prorationEnabled} onChange={e => set({ prorationEnabled: e.target.checked })} className="h-4 w-4 mt-0.5" />
                <span>
                    <span className="font-medium text-neutral-800 dark:text-neutral-100">Prorratear los cambios de plan</span>
                    <span className="block text-neutral-500 dark:text-neutral-400">Si está apagado, todo cambio queda programado para la renovación, sin cargos ni créditos.</span>
                </span>
            </label>
            <div className="grid sm:grid-cols-2 gap-4">
                <div>
                    <label className={labelCls}>Al subir de plan</label>
                    <select value={form.upgradePolicy} onChange={e => set({ upgradePolicy: e.target.value as UpgradePolicy })} className={inputCls} disabled={!form.prorationEnabled}>
                        {UPGRADE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className={labelCls}>Al bajar de plan</label>
                    <select value={form.downgradePolicy} onChange={e => set({ downgradePolicy: e.target.value as DowngradePolicy })} className={inputCls} disabled={!form.prorationEnabled}>
                        {DOWNGRADE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                <div>
                    <label className={labelCls}>Cómo contar los días</label>
                    <select value={form.prorationBasis} onChange={e => set({ prorationBasis: e.target.value as PlatformSettings['prorationBasis'] })} className={inputCls} disabled={!form.prorationEnabled}>
                        <option value="actual_days">Días reales del período</option>
                        <option value="thirty_days">Mes de 30 días, año de 360</option>
                    </select>
                </div>
                <div>
                    <label className={labelCls}>Ignorar ajustes menores a</label>
                    <MoneyInput value={form.minProrationAmount} onChange={v => set({ minProrationAmount: Number(v) || 0 })} className={INPUT_SM_CLASSES} disabled={!form.prorationEnabled} />
                </div>
                <div>
                    <label className={labelCls}>Días de prueba por defecto</label>
                    <input type="number" min={0} value={form.trialDays} onChange={e => set({ trialDays: Number(e.target.value) })} className={inputCls} />
                </div>
                <div>
                    <label className={labelCls}>Días de gracia antes de marcar atrasada</label>
                    <input type="number" min={0} value={form.graceDays} onChange={e => set({ graceDays: Number(e.target.value) })} className={inputCls} />
                </div>
                <div>
                    <label className={labelCls}>Impuesto sobre la suscripción (%)</label>
                    <input type="number" min={0} max={100} step="0.01" value={taxPct} onChange={e => setTaxPct(e.target.value)} className={inputCls} />
                </div>
            </div>
            <div className="flex justify-end">
                <button onClick={save} disabled={saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{saving ? 'Guardando…' : 'Guardar reglas'}</button>
            </div>
        </div>
    );
};

// ─── Planes ──────────────────────────────────────────────────────────────────
type PlanForm = { id?: string; name: string; description: string; monthlyPrice: string; annualPrice: string; isPublic: boolean; isActive: boolean; order: string };
const EMPTY_PLAN: PlanForm = { name: '', description: '', monthlyPrice: '', annualPrice: '', isPublic: true, isActive: true, order: '0' };

const PlansTab: React.FC = () => {
    const [plans, setPlans] = useState<Plan[] | null>(null);
    const [form, setForm] = useState<PlanForm | null>(null);
    const [saving, setSaving] = useState(false);

    const load = useCallback(() => {
        platformService.listPlans().then(setPlans).catch(err => { setPlans([]); toast.error(errMsg(err, 'No se pudieron cargar los planes.')); });
    }, []);
    useEffect(load, [load]);

    const save = async () => {
        if (!form) return;
        if (!form.name.trim()) { toast.error('Escribe el nombre del plan.'); return; }
        setSaving(true);
        try {
            const data = {
                name: form.name.trim(), description: form.description.trim() || null,
                monthlyPrice: Number(form.monthlyPrice) || 0, annualPrice: Number(form.annualPrice) || 0,
                isPublic: form.isPublic, isActive: form.isActive, order: Number(form.order) || 0,
            };
            if (form.id) await platformService.updatePlan(form.id, data);
            else await platformService.createPlan(data);
            toast.success('Plan guardado.');
            setForm(null); load();
        } catch (err) { toast.error(errMsg(err, 'No se pudo guardar el plan.')); }
        finally { setSaving(false); }
    };

    if (!plans) return <LoadingSkeleton variant="table" rows={4} />;
    return (
        <>
            <div className="flex justify-between items-center gap-3 mb-3">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Cambiar un precio aplica a nuevas contrataciones: cada suscripción conserva el suyo. Los planes no se borran, se archivan.</p>
                <button onClick={() => setForm(EMPTY_PLAN)} className={`${BUTTON_PRIMARY_SM_CLASSES} flex-shrink-0`}>+ Nuevo plan</button>
            </div>
            {plans.length === 0 ? <EmptyState title="Sin planes" description="Crea el primer plan para poder asignarlo a un negocio." /> : (
                <DataTable<Plan>
                    data={plans}
                    columns={[
                        { header: 'Plan', accessor: p => <span className="font-medium text-neutral-800 dark:text-neutral-100">{p.name}</span>, sortValue: p => p.name },
                        { header: 'Mensual', accessor: p => money(p.monthlyPrice), sortValue: p => p.monthlyPrice },
                        { header: 'Anual', accessor: p => money(p.annualPrice), sortValue: p => p.annualPrice },
                        { header: 'Negocios', accessor: p => p._count?.subscriptions ?? 0, sortValue: p => p._count?.subscriptions ?? 0 },
                        { header: 'Estado', accessor: p => <Badge tone={p.isActive ? 'green' : 'neutral'}>{p.isActive ? (p.isPublic ? 'Público' : 'Privado') : 'Archivado'}</Badge> },
                    ] as TableColumn<Plan>[]}
                    actions={p => (
                        <button
                            onClick={() => setForm({ id: p.id, name: p.name, description: p.description || '', monthlyPrice: String(p.monthlyPrice), annualPrice: String(p.annualPrice), isPublic: p.isPublic, isActive: p.isActive, order: String(p.order) })}
                            className="text-blue-600 dark:text-blue-400 hover:underline text-xs"
                        >Editar</button>
                    )}
                />
            )}
            <Modal isOpen={!!form} onClose={() => setForm(null)} title={form?.id ? 'Editar plan' : 'Nuevo plan'} size="md">
                {form && (
                    <div className="space-y-3">
                        <div><label className={labelCls}>Nombre</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} /></div>
                        <div><label className={labelCls}>Descripción</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className={`${inputCls} h-auto`} /></div>
                        <div className="grid grid-cols-2 gap-3">
                            <div><label className={labelCls}>Precio mensual</label><MoneyInput value={form.monthlyPrice} onChange={v => setForm({ ...form, monthlyPrice: v })} className={INPUT_SM_CLASSES} /></div>
                            <div><label className={labelCls}>Precio anual</label><MoneyInput value={form.annualPrice} onChange={v => setForm({ ...form, annualPrice: v })} className={INPUT_SM_CLASSES} /></div>
                        </div>
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isPublic} onChange={e => setForm({ ...form, isPublic: e.target.checked })} className="h-4 w-4" /> Público (se podrá mostrar en la web)</label>
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4" /> Activo (desmarca para archivarlo)</label>
                        <div className="flex justify-end gap-2 pt-2">
                            <button onClick={() => setForm(null)} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                            <button onClick={save} disabled={saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{saving ? 'Guardando…' : 'Guardar'}</button>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
};

// ─── Cambio de plan con vista previa del prorrateo ───────────────────────────
const ADJUSTMENT_TEXT: Record<PlanChangePreview['result']['adjustment'], string> = {
    charge_now: 'Se emite una factura ahora',
    next_invoice: 'Se suma a la próxima factura',
    credit: 'Queda como saldo a favor',
    none: 'Sin cargo ni crédito',
};

const ChangePlanModal: React.FC<{ business: PlatformBusiness; plans: Plan[]; onClose: () => void; onDone: () => void }> = ({ business, plans, onClose, onDone }) => {
    const sub = business.subscription!;
    const [planId, setPlanId] = useState(sub.planId);
    const [interval, setIntervalValue] = useState<BillingInterval>(sub.interval);
    const [customPrice, setCustomPrice] = useState('');
    const [upgradePolicy, setUpgradePolicy] = useState<'' | UpgradePolicy>('');
    const [downgradePolicy, setDowngradePolicy] = useState<'' | DowngradePolicy>('');
    const [manualOn, setManualOn] = useState(false);
    const [manualAmount, setManualAmount] = useState('');
    const [manualCredit, setManualCredit] = useState(false);
    const [note, setNote] = useState('');
    const [preview, setPreview] = useState<PlanChangePreview | null>(null);
    const [saving, setSaving] = useState(false);

    const body = useMemo(() => ({
        planId, interval,
        ...(customPrice !== '' ? { customPrice: Number(customPrice) } : {}),
        ...(upgradePolicy ? { upgradePolicy } : {}),
        ...(downgradePolicy ? { downgradePolicy } : {}),
        ...(manualOn ? { overrideNet: (Number(manualAmount) || 0) * (manualCredit ? -1 : 1) } : {}),
    }), [planId, interval, customPrice, upgradePolicy, downgradePolicy, manualOn, manualAmount, manualCredit]);

    useEffect(() => {
        let stale = false;
        const timer = setTimeout(() => {
            platformService.previewChange(business.id, body)
                .then(p => { if (!stale) setPreview(p); })
                .catch(err => { if (!stale) { setPreview(null); toast.error(errMsg(err, 'No se pudo calcular el cambio.')); } });
        }, 250);
        return () => { stale = true; clearTimeout(timer); };
    }, [business.id, body]);

    const apply = async () => {
        setSaving(true);
        try {
            await platformService.changePlan(business.id, { ...body, note: note.trim() || null });
            toast.success('Plan actualizado.');
            onDone();
        } catch (err) { toast.error(errMsg(err, 'No se pudo cambiar el plan.')); }
        finally { setSaving(false); }
    };

    const r = preview?.result;
    return (
        <Modal isOpen onClose={onClose} title={`Cambiar plan — ${business.name}`} size="2xl">
            <div className="space-y-4">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Actual: {plans.find(p => p.id === sub.planId)?.name || sub.plan?.name} · {INTERVAL_LABEL[sub.interval]} · {money(sub.price)}, período hasta {fmtDate(sub.currentPeriodEnd)}
                </p>
                <div className="grid sm:grid-cols-3 gap-3">
                    <div>
                        <label className={labelCls}>Plan nuevo</label>
                        <select value={planId} onChange={e => { setPlanId(e.target.value); setCustomPrice(''); }} className={inputCls}>
                            {plans.filter(p => p.isActive || p.id === sub.planId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Ciclo</label>
                        <select value={interval} onChange={e => { setIntervalValue(e.target.value as BillingInterval); setCustomPrice(''); }} className={inputCls}>
                            <option value="month">Mensual</option>
                            <option value="year">Anual</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelCls}>Precio especial (opcional)</label>
                        <MoneyInput value={customPrice} onChange={setCustomPrice} placeholder={preview ? preview.newPrice.toFixed(2) : ''} className={INPUT_SM_CLASSES} />
                    </div>
                    <div className="sm:col-span-3 grid sm:grid-cols-2 gap-3">
                        <div>
                            <label className={labelCls}>Si es subida de plan</label>
                            <select value={upgradePolicy} onChange={e => setUpgradePolicy(e.target.value as UpgradePolicy | '')} className={inputCls} disabled={manualOn}>
                                <option value="">Usar la regla general</option>
                                {UPGRADE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Si es bajada de plan</label>
                            <select value={downgradePolicy} onChange={e => setDowngradePolicy(e.target.value as DowngradePolicy | '')} className={inputCls} disabled={manualOn}>
                                <option value="">Usar la regla general</option>
                                {DOWNGRADE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="border border-neutral-200 dark:border-neutral-700 rounded-md p-3 space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                        <input type="checkbox" checked={manualOn} onChange={e => setManualOn(e.target.checked)} className="h-4 w-4" /> Escribir el monto a mano
                    </label>
                    {manualOn && (
                        <div className="grid sm:grid-cols-2 gap-3">
                            <MoneyInput value={manualAmount} onChange={setManualAmount} className={INPUT_SM_CLASSES} />
                            <select value={manualCredit ? 'credit' : 'charge'} onChange={e => setManualCredit(e.target.value === 'credit')} className={inputCls}>
                                <option value="charge">Cobrar este monto</option>
                                <option value="credit">Acreditar este monto</option>
                            </select>
                        </div>
                    )}
                </div>

                <div className="bg-neutral-100 dark:bg-neutral-900 rounded-md p-4 text-sm">
                    {!r ? <p className="text-neutral-500">Calculando…</p> : (
                        <div className="space-y-1.5">
                            <p className="font-semibold text-neutral-800 dark:text-neutral-100">
                                {r.effective === 'now' ? 'Cambia ahora' : `Se programa para el ${fmtDate(sub.currentPeriodEnd)}`} · precio nuevo {money(preview!.newPrice)}
                            </p>
                            {sub.status === 'trialing' && <p className="text-neutral-500 dark:text-neutral-400">En prueba gratis: no hay cargo.</p>}
                            <div className="flex justify-between"><span>Días restantes</span><span className="tabular-nums">{r.remainingDays} de {r.totalDays}</span></div>
                            <div className="flex justify-between"><span>Crédito por lo no usado</span><span className="tabular-nums">−{money(r.unusedCredit)}</span></div>
                            <div className="flex justify-between"><span>{r.resetsPeriod ? 'Plan nuevo (período completo)' : 'Plan nuevo (días restantes)'}</span><span className="tabular-nums">{money(r.newCharge)}</span></div>
                            <div className="flex justify-between font-semibold border-t border-neutral-300 dark:border-neutral-700 pt-1.5"><span>{ADJUSTMENT_TEXT[r.adjustment]}</span><span className="tabular-nums">{money(r.amount)}</span></div>
                            {preview?.invoice && (
                                <>
                                    {preview.invoice.creditApplied > 0 && <div className="flex justify-between"><span>Saldo a favor aplicado</span><span className="tabular-nums">−{money(preview.invoice.creditApplied)}</span></div>}
                                    {preview.invoice.tax > 0 && <div className="flex justify-between"><span>Impuesto</span><span className="tabular-nums">{money(preview.invoice.tax)}</span></div>}
                                    <div className="flex justify-between font-bold text-base"><span>Total de la factura</span><span className="tabular-nums">{money(preview.invoice.total)}</span></div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                <div><label className={labelCls}>Nota (queda en la auditoría)</label><input value={note} onChange={e => setNote(e.target.value)} maxLength={500} className={inputCls} /></div>
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button onClick={apply} disabled={saving || !r} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{saving ? 'Aplicando…' : 'Aplicar cambio'}</button>
                </div>
            </div>
        </Modal>
    );
};

// ─── Edición manual de la suscripción ────────────────────────────────────────
const EditSubscriptionModal: React.FC<{ business: PlatformBusiness; plans: Plan[]; onClose: () => void; onDone: () => void }> = ({ business, plans, onClose, onDone }) => {
    const sub = business.subscription!;
    const [price, setPrice] = useState(String(sub.price));
    const [periodEnd, setPeriodEnd] = useState(sub.currentPeriodEnd.slice(0, 10));
    const [creditAmount, setCreditAmount] = useState('');
    const [creditRemove, setCreditRemove] = useState(false);
    const [clearScheduled, setClearScheduled] = useState(false);
    const [cancelAtEnd, setCancelAtEnd] = useState(sub.cancelAtPeriodEnd);
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        try {
            const adj = Number(creditAmount) || 0;
            await platformService.editSubscription(business.id, {
                price: Number(price) || 0,
                ...(periodEnd !== sub.currentPeriodEnd.slice(0, 10) ? { currentPeriodEnd: new Date(`${periodEnd}T00:00:00Z`).toISOString() } : {}),
                ...(adj ? { creditAdjustment: creditRemove ? -adj : adj } : {}),
                ...(clearScheduled ? { clearScheduled: true } : {}),
                cancelAtPeriodEnd: cancelAtEnd,
                ...(reason.trim() ? { reason: reason.trim() } : {}),
            });
            toast.success('Suscripción actualizada.');
            onDone();
        } catch (err) { toast.error(errMsg(err, 'No se pudo actualizar.')); }
        finally { setSaving(false); }
    };

    return (
        <Modal isOpen onClose={onClose} title={`Ajustar suscripción — ${business.name}`} size="md">
            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                    <div><label className={labelCls}>Precio contratado</label><MoneyInput value={price} onChange={setPrice} className={INPUT_SM_CLASSES} /></div>
                    <div><label className={labelCls}>Fin del período</label><input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className={inputCls} /></div>
                </div>
                <div>
                    <label className={labelCls}>Ajustar saldo a favor (actual: {money(sub.creditBalance)})</label>
                    <div className="grid grid-cols-2 gap-3">
                        <select value={creditRemove ? 'remove' : 'add'} onChange={e => setCreditRemove(e.target.value === 'remove')} className={inputCls}>
                            <option value="add">Sumar</option>
                            <option value="remove">Restar</option>
                        </select>
                        <MoneyInput value={creditAmount} onChange={setCreditAmount} placeholder="0.00" className={INPUT_SM_CLASSES} />
                    </div>
                </div>
                {sub.scheduledPlanId && (
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={clearScheduled} onChange={e => setClearScheduled(e.target.checked)} className="h-4 w-4" />
                        Quitar el cambio programado a {plans.find(p => p.id === sub.scheduledPlanId)?.name || 'otro plan'}
                    </label>
                )}
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={cancelAtEnd} onChange={e => setCancelAtEnd(e.target.checked)} className="h-4 w-4" />
                    Cancelar al terminar el período
                </label>
                <div><label className={labelCls}>Motivo (queda en la auditoría)</label><input value={reason} onChange={e => setReason(e.target.value)} maxLength={500} className={inputCls} /></div>
                <div className="flex justify-end gap-2 pt-1">
                    <button onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button onClick={save} disabled={saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{saving ? 'Guardando…' : 'Guardar'}</button>
                </div>
            </div>
        </Modal>
    );
};

// ─── Negocios ────────────────────────────────────────────────────────────────
const BusinessesTab: React.FC = () => {
    const [rows, setRows] = useState<PlatformBusiness[] | null>(null);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [search, setSearch] = useState('');
    const [assign, setAssign] = useState<PlatformBusiness | null>(null);
    const [assignForm, setAssignForm] = useState({ planId: '', interval: 'month' as BillingInterval, customPrice: '', trialDays: '' });
    const [change, setChange] = useState<PlatformBusiness | null>(null);
    const [edit, setEdit] = useState<PlatformBusiness | null>(null);
    const [statusTarget, setStatusTarget] = useState<{ business: PlatformBusiness; status: PlatformBusiness['status'] } | null>(null);
    const [statusReason, setStatusReason] = useState('');

    const load = useCallback(() => {
        platformService.listBusinesses().then(setRows).catch(err => { setRows([]); toast.error(errMsg(err, 'No se pudieron cargar los negocios.')); });
        platformService.listPlans().then(setPlans).catch(() => setPlans([]));
    }, []);
    useEffect(load, [load]);

    const visible = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!rows || !q) return rows || [];
        return rows.filter(b => `${b.name} ${b.owner.name} ${b.owner.lastName} ${b.owner.email}`.toLowerCase().includes(q));
    }, [rows, search]);

    const submitAssign = async () => {
        if (!assign || !assignForm.planId) { toast.error('Elige un plan.'); return; }
        try {
            await platformService.createSubscription(assign.id, {
                planId: assignForm.planId, interval: assignForm.interval,
                ...(assignForm.customPrice !== '' ? { customPrice: Number(assignForm.customPrice) } : {}),
                ...(assignForm.trialDays !== '' ? { trialDays: Number(assignForm.trialDays) } : {}),
            });
            toast.success('Plan asignado.');
            setAssign(null); load();
        } catch (err) { toast.error(errMsg(err, 'No se pudo asignar el plan.')); }
    };

    const submitStatus = async () => {
        if (!statusTarget) return;
        try {
            await platformService.setBusinessStatus(statusTarget.business.id, statusTarget.status, statusReason.trim() || undefined);
            toast.success('Estado actualizado.');
            setStatusTarget(null); setStatusReason(''); load();
        } catch (err) { toast.error(errMsg(err, 'No se pudo actualizar el estado.')); }
    };

    if (!rows) return <LoadingSkeleton variant="table" rows={6} />;
    const activePlans = plans.filter(p => p.isActive);
    return (
        <>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar negocio, gerente o correo…" className={`${INPUT_SM_CLASSES} w-full sm:w-80 mb-3`} />
            {visible.length === 0 ? <EmptyState title="Sin negocios" description="No hay negocios que coincidan." /> : (
                <DataTable<PlatformBusiness>
                    data={visible}
                    columns={[
                        {
                            header: 'Negocio', sortValue: b => b.name,
                            accessor: b => (
                                <div>
                                    <div className="font-medium text-neutral-800 dark:text-neutral-100">{b.name}</div>
                                    <div className="text-xs text-neutral-500 dark:text-neutral-400">{b.owner.email} · {b.employees} colaborador(es)</div>
                                </div>
                            ),
                        },
                        { header: 'Estado', sortValue: b => b.status, accessor: b => { const s = BUSINESS_STATUS[b.status] || BUSINESS_STATUS.active; return <span title={b.statusReason || undefined}><Badge tone={s.tone}>{s.label}</Badge></span>; } },
                        {
                            header: 'Plan', sortValue: b => b.subscription?.plan?.name || '',
                            accessor: b => {
                                const sub = b.subscription;
                                if (!sub) return <span className="text-neutral-400">Sin plan</span>;
                                const s = SUB_STATUS[sub.status] || SUB_STATUS.active;
                                return (
                                    <div>
                                        <div className="flex items-center gap-2"><span>{sub.plan?.name}</span><Badge tone={s.tone}>{s.label}</Badge></div>
                                        <div className="text-xs text-neutral-500 dark:text-neutral-400">
                                            {money(sub.price)} {INTERVAL_LABEL[sub.interval].toLowerCase()} · hasta {fmtDate(sub.currentPeriodEnd)}
                                            {sub.scheduledPlanId ? ` · cambio programado a ${plans.find(p => p.id === sub.scheduledPlanId)?.name || 'otro plan'}` : ''}
                                            {sub.cancelAtPeriodEnd ? ' · se cancela al terminar' : ''}
                                        </div>
                                    </div>
                                );
                            },
                        },
                        { header: 'Saldo a favor', sortValue: b => b.subscription?.creditBalance ?? 0, accessor: b => (b.subscription ? money(b.subscription.creditBalance) : '—') },
                        { header: 'Por cobrar', sortValue: b => b.amountDue, accessor: b => (b.amountDue > 0 ? <span className="font-semibold text-red-600 dark:text-red-400">{money(b.amountDue)}</span> : '—') },
                        { header: 'Último acceso', sortValue: b => b.owner.lastSeenAt || b.owner.lastLoginAt || '', accessor: b => fmtDate(b.owner.lastSeenAt || b.owner.lastLoginAt) },
                    ] as TableColumn<PlatformBusiness>[]}
                    actions={b => (
                        <>
                            {b.subscription && b.subscription.status !== 'cancelled' ? (
                                <>
                                    <button onClick={() => setChange(b)} className="text-blue-600 dark:text-blue-400 hover:underline text-xs mr-3">Cambiar plan</button>
                                    <button onClick={() => setEdit(b)} className="text-blue-600 dark:text-blue-400 hover:underline text-xs mr-3">Ajustar</button>
                                </>
                            ) : (
                                <button onClick={() => { setAssign(b); setAssignForm({ planId: activePlans[0]?.id || '', interval: 'month', customPrice: '', trialDays: '' }); }} className="text-blue-600 dark:text-blue-400 hover:underline text-xs mr-3">Asignar plan</button>
                            )}
                            {b.status === 'active'
                                ? <button onClick={() => setStatusTarget({ business: b, status: 'suspended' })} className="text-red-600 dark:text-red-400 hover:underline text-xs">Suspender</button>
                                : <button onClick={() => setStatusTarget({ business: b, status: 'active' })} className="text-green-700 dark:text-green-400 hover:underline text-xs">Reactivar</button>}
                        </>
                    )}
                />
            )}

            <Modal isOpen={!!assign} onClose={() => setAssign(null)} title={`Asignar plan — ${assign?.name || ''}`} size="md">
                {activePlans.length === 0 ? <p className="text-sm text-neutral-500">Primero crea un plan en la pestaña Planes.</p> : (
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className={labelCls}>Plan</label>
                                <select value={assignForm.planId} onChange={e => setAssignForm(f => ({ ...f, planId: e.target.value }))} className={inputCls}>
                                    {activePlans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelCls}>Ciclo</label>
                                <select value={assignForm.interval} onChange={e => setAssignForm(f => ({ ...f, interval: e.target.value as BillingInterval }))} className={inputCls}>
                                    <option value="month">Mensual</option>
                                    <option value="year">Anual</option>
                                </select>
                            </div>
                            <div><label className={labelCls}>Precio especial (opcional)</label><MoneyInput value={assignForm.customPrice} onChange={v => setAssignForm(f => ({ ...f, customPrice: v }))} className={INPUT_SM_CLASSES} /></div>
                            <div><label className={labelCls}>Días de prueba (vacío = regla general)</label><input type="number" min={0} value={assignForm.trialDays} onChange={e => setAssignForm(f => ({ ...f, trialDays: e.target.value }))} className={inputCls} /></div>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                            <button onClick={() => setAssign(null)} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                            <button onClick={submitAssign} className={BUTTON_PRIMARY_SM_CLASSES}>Asignar</button>
                        </div>
                    </div>
                )}
            </Modal>
            {change && <ChangePlanModal business={change} plans={plans} onClose={() => setChange(null)} onDone={() => { setChange(null); load(); }} />}
            {edit && <EditSubscriptionModal business={edit} plans={plans} onClose={() => setEdit(null)} onDone={() => { setEdit(null); load(); }} />}
            <ConfirmationModal
                isOpen={!!statusTarget}
                onClose={() => { setStatusTarget(null); setStatusReason(''); }}
                onConfirm={submitStatus}
                title={statusTarget?.status === 'suspended' ? 'Suspender negocio' : 'Reactivar negocio'}
                message={statusTarget?.status === 'suspended' ? (
                    <div className="space-y-2">
                        <p>El gerente y los colaboradores de {statusTarget.business.name} dejarán de poder entrar en menos de un minuto. No se borra ningún dato.</p>
                        <input value={statusReason} onChange={e => setStatusReason(e.target.value)} placeholder="Motivo (queda en la auditoría)" className={inputCls} />
                    </div>
                ) : <p>Se restablece el acceso de {statusTarget?.business.name}. Si la cuenta del gerente está deshabilitada, actívala en Administradores.</p>}
                confirmButtonText={statusTarget?.status === 'suspended' ? 'Sí, suspender' : 'Sí, reactivar'}
            />
        </>
    );
};

// ─── Facturas ────────────────────────────────────────────────────────────────
const InvoicesTab: React.FC = () => {
    const [rows, setRows] = useState<PlatformInvoice[] | null>(null);
    const [filter, setFilter] = useState('pending');
    const [paying, setPaying] = useState<PlatformInvoice | null>(null);
    const [payForm, setPayForm] = useState({ method: 'Transferencia', reference: '' });
    const [voiding, setVoiding] = useState<PlatformInvoice | null>(null);
    const [voidReason, setVoidReason] = useState('');

    const load = useCallback(() => {
        platformService.listInvoices(filter || undefined).then(setRows).catch(err => { setRows([]); toast.error(errMsg(err, 'No se pudieron cargar las facturas.')); });
    }, [filter]);
    useEffect(load, [load]);

    const pay = async () => {
        if (!paying || !payForm.method.trim()) return;
        try {
            await platformService.payInvoice(paying.id, { method: payForm.method.trim(), ...(payForm.reference.trim() ? { reference: payForm.reference.trim() } : {}) });
            toast.success('Pago registrado.');
            setPaying(null); load();
        } catch (err) { toast.error(errMsg(err, 'No se pudo registrar el pago.')); }
    };
    const voidIt = async () => {
        if (!voiding) return;
        if (!voidReason.trim()) { toast.error('Indica el motivo.'); return; }
        try {
            await platformService.voidInvoice(voiding.id, voidReason.trim());
            toast.success('Factura anulada.');
            setVoiding(null); setVoidReason(''); load();
        } catch (err) { toast.error(errMsg(err, 'No se pudo anular la factura.')); }
    };

    return (
        <>
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                <select value={filter} onChange={e => setFilter(e.target.value)} className={INPUT_SM_CLASSES}>
                    <option value="pending">Pendientes</option>
                    <option value="paid">Pagadas</option>
                    <option value="void">Anuladas</option>
                    <option value="">Todas</option>
                </select>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Por ahora el sistema no cobra la tarjeta: el pago se registra aquí a mano.</p>
            </div>
            {!rows ? <LoadingSkeleton variant="table" rows={5} /> : rows.length === 0 ? <EmptyState title="Sin facturas" description="No hay facturas con este filtro." /> : (
                <DataTable<PlatformInvoice>
                    data={rows}
                    columns={[
                        { header: '#', accessor: i => i.number, sortValue: i => i.number },
                        { header: 'Negocio', accessor: i => <span className="font-medium text-neutral-800 dark:text-neutral-100">{i.businessName}</span>, sortValue: i => i.businessName },
                        { header: 'Concepto', accessor: i => i.description || (i.type === 'renewal' ? 'Renovación' : 'Prorrateo') },
                        { header: 'Vence', accessor: i => fmtDate(i.dueDate), sortValue: i => i.dueDate },
                        { header: 'Total', accessor: i => <span title={`Subtotal ${money(i.subtotal)} · saldo aplicado ${money(i.creditApplied)} · impuesto ${money(i.tax)}`}>{money(i.total)}</span>, sortValue: i => i.total },
                        { header: 'Estado', accessor: i => { const s = INVOICE_STATUS[i.status]; return <span title={i.voidReason || i.paidReference || undefined}><Badge tone={s.tone}>{s.label}</Badge></span>; } },
                    ] as TableColumn<PlatformInvoice>[]}
                    actions={i => i.status === 'pending' ? (
                        <>
                            <button onClick={() => { setPaying(i); setPayForm({ method: 'Transferencia', reference: '' }); }} className="text-green-700 dark:text-green-400 hover:underline text-xs mr-3">Registrar pago</button>
                            <button onClick={() => setVoiding(i)} className="text-red-600 dark:text-red-400 hover:underline text-xs">Anular</button>
                        </>
                    ) : null}
                />
            )}
            <Modal isOpen={!!paying} onClose={() => setPaying(null)} title={`Registrar pago — ${money(paying?.total || 0)}`} size="sm">
                <div className="space-y-3">
                    <div><label className={labelCls}>Método</label><input value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))} className={inputCls} /></div>
                    <div><label className={labelCls}>Referencia (opcional)</label><input value={payForm.reference} onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))} className={inputCls} /></div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setPaying(null)} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                        <button onClick={pay} className={BUTTON_PRIMARY_SM_CLASSES}>Registrar</button>
                    </div>
                </div>
            </Modal>
            <ConfirmationModal
                isOpen={!!voiding}
                onClose={() => { setVoiding(null); setVoidReason(''); }}
                onConfirm={voidIt}
                title="Anular factura"
                message={
                    <div className="space-y-2">
                        <p>La factura #{voiding?.number} queda anulada en el historial. Si usó saldo a favor, se devuelve al negocio.</p>
                        <input value={voidReason} onChange={e => setVoidReason(e.target.value)} placeholder="Motivo" className={inputCls} />
                    </div>
                }
                confirmButtonText="Sí, anular"
            />
        </>
    );
};

// ─── Auditoría ───────────────────────────────────────────────────────────────
const AUDIT_LABEL: Record<string, string> = {
    'settings.update': 'Cambió las reglas de prorrateo',
    'plan.create': 'Creó un plan',
    'plan.update': 'Editó un plan',
    'business.active': 'Reactivó un negocio',
    'business.suspended': 'Suspendió un negocio',
    'business.archived': 'Archivó un negocio',
    'subscription.create': 'Asignó un plan',
    'subscription.change_plan': 'Cambió de plan',
    'subscription.edit': 'Ajustó una suscripción',
    'invoice.pay': 'Registró un pago',
    'invoice.void': 'Anuló una factura',
};

const AuditTab: React.FC = () => {
    const [rows, setRows] = useState<PlatformAuditEntry[] | null>(null);
    useEffect(() => {
        platformService.listAudit().then(setRows).catch(err => { setRows([]); toast.error(errMsg(err, 'No se pudo cargar la auditoría.')); });
    }, []);
    if (!rows) return <LoadingSkeleton variant="table" rows={6} />;
    if (rows.length === 0) return <EmptyState title="Sin actividad" description="Aquí aparecerán las acciones hechas desde este panel." />;
    return (
        <DataTable<PlatformAuditEntry>
            data={rows}
            columns={[
                { header: 'Fecha', accessor: r => fmtDateTime(r.createdAt), sortValue: r => r.createdAt },
                { header: 'Quién', accessor: 'actorEmail' },
                { header: 'Acción', accessor: r => AUDIT_LABEL[r.action] || r.action, sortValue: r => r.action },
                { header: 'Nota', accessor: r => r.note || '—' },
            ] as TableColumn<PlatformAuditEntry>[]}
        />
    );
};

// ─── Página ──────────────────────────────────────────────────────────────────
const TABS = [
    { key: 'businesses', label: 'Negocios' },
    { key: 'plans', label: 'Planes' },
    { key: 'settings', label: 'Prorrateo y cobro' },
    { key: 'invoices', label: 'Facturas' },
    { key: 'audit', label: 'Auditoría' },
] as const;

/** Panel del super-administrador para gestionar los negocios y sus suscripciones. */
export const PlatformAdminPage: React.FC = () => {
    const { currentUser, logout } = useAuth();
    const [tab, setTab] = useState<(typeof TABS)[number]['key']>('businesses');

    if (currentUser && currentUser.role !== UserRole.SUPER_ADMIN) {
        return <div className="p-8 text-center text-neutral-500">No tienes acceso a esta sección.</div>;
    }

    return (
        <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100">
            <header className="bg-[#00897B] text-white px-6 py-3 flex items-center justify-between gap-3">
                <span className="font-bold">Plataforma Pazzi</span>
                <div className="flex items-center gap-3 text-sm">
                    <Link to="/admin/users" className="hover:underline">Administradores</Link>
                    <span className="opacity-90 hidden sm:inline">{currentUser?.name} {currentUser?.lastName}</span>
                    <button onClick={() => logout()} className="bg-black/20 hover:bg-black/30 px-3 py-1 rounded">Salir</button>
                </div>
            </header>
            <div className="p-6 max-w-7xl mx-auto">
                <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-700 mb-5 overflow-x-auto">
                    {TABS.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors ${tab === t.key ? 'border-primary text-primary dark:text-teal-300' : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200'}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
                {tab === 'businesses' && <BusinessesTab />}
                {tab === 'plans' && <PlansTab />}
                {tab === 'settings' && <SettingsTab />}
                {tab === 'invoices' && <InvoicesTab />}
                {tab === 'audit' && <AuditTab />}
            </div>
        </div>
    );
};
