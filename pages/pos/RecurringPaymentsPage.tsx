import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { usePagination, PaginationFooter } from '../../components/ui/tableTools';
import { useData } from '../../contexts/DataContext';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { recurringService, type RecurringPayment, type RecurringCharge, type CreateRecurringInput, type RecurringMode, type LinkMethod } from '../../services/recurring';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmationModal } from '../../components/Modal';
import { ClientAutocomplete } from '../../components/ui/ClientAutocomplete';
import { ClientNameLink } from '../../components/ui/EntityNameLink';

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;
// Los *_LABEL guardan CLAVES i18n; se resuelven con t() al renderizar.
const INTERVAL_LABEL: Record<string, string> = { daily: 'posx.recurring.interval.daily', weekly: 'posx.recurring.interval.weekly', biweekly: 'posx.recurring.interval.biweekly', monthly: 'posx.recurring.interval.monthly', quarterly: 'posx.recurring.interval.quarterly', annual: 'posx.recurring.interval.annual' };
const STATUS_LABEL: Record<string, string> = { active: 'posx.recurring.status.active', paused: 'posx.recurring.status.paused', cancelled: 'posx.recurring.status.cancelled', completed: 'posx.recurring.status.completed' };
const STATUS_COLOR: Record<string, string> = { active: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', paused: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', cancelled: 'bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-300', completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' };

// Estado de pago de un período (para el modo factura + link, y compat con el modo cobro).
const PAY_LABEL: Record<string, string> = {
    approved: 'posx.recurring.pay.approved', declined: 'posx.recurring.pay.declined', error: 'posx.recurring.pay.error',
    paid: 'posx.recurring.pay.paid', partial: 'posx.recurring.pay.partial', pending: 'posx.recurring.pay.pending', overdue: 'posx.recurring.pay.overdue', cancelled: 'posx.recurring.pay.cancelled',
};
const PAY_COLOR: Record<string, string> = {
    approved: 'text-green-600', paid: 'text-green-600',
    partial: 'text-amber-600', pending: 'text-neutral-500',
    overdue: 'text-red-600', declined: 'text-red-600', error: 'text-red-600', cancelled: 'text-neutral-400',
};
const PAY_BADGE: Record<string, string> = {
    approved: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', paid: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    partial: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', pending: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300',
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', declined: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', error: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', cancelled: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400',
};

const LABEL = 'block text-sm font-medium text-neutral-700 dark:text-neutral-200 mb-1';
const SECTION = 'text-xs font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500 mb-2';
const FREQS: { val: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual'; key: string }[] = [
    { val: 'daily', key: 'posx.recurring.interval.daily' },
    { val: 'weekly', key: 'posx.recurring.interval.weekly' },
    { val: 'biweekly', key: 'posx.recurring.interval.biweekly' },
    { val: 'monthly', key: 'posx.recurring.interval.monthly' },
    { val: 'quarterly', key: 'posx.recurring.interval.quarterly' },
    { val: 'annual', key: 'posx.recurring.interval.annual' },
];

const payState = (c: RecurringCharge) => c.payState || c.status;

// Último pago REALIZADO: el cargo más reciente que quedó pagado.
const lastPaidDate = (rp: RecurringPayment): string | null => {
    const paid = rp.charges
        .filter(c => c.payState === 'paid' || /aprobad|approved|paid|pagad/i.test(c.status || '') || !!c.invoicePaidAt)
        .map(c => c.invoicePaidAt || c.date)
        .filter(Boolean) as string[];
    if (paid.length === 0) return null;
    return paid.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
};

export const RecurringPaymentsPage: React.FC = () => {
    const { t } = useTranslation();
    const { clients } = useData();
    const [items, setItems] = useState<RecurringPayment[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [toCancel, setToCancel] = useState<string | null>(null);
    const [toDelete, setToDelete] = useState<string | null>(null);
    const [showDeleted, setShowDeleted] = useState(false);
    // Filtros
    const [search, setSearch] = useState('');
    const [statusF, setStatusF] = useState<'all' | 'active' | 'paused' | 'cancelled'>('all');
    const [modeF, setModeF] = useState<'all' | 'invoice_link' | 'auto'>('all');
    const [payF, setPayF] = useState<'all' | 'paid' | 'unpaid'>('all');
    const [showFilters, setShowFilters] = useState(false);

    // Form
    const [mode, setMode] = useState<RecurringMode>('invoice_link');
    const [clientId, setClientId] = useState('');
    const [amount, setAmount] = useState('');
    const [interval, setInterval] = useState<CreateRecurringInput['interval']>('monthly');
    const [intervalCount, setIntervalCount] = useState('1');
    const [monthlyDay, setMonthlyDay] = useState('');
    const [retryEnabled, setRetryEnabled] = useState(true);
    const [maxRetries, setMaxRetries] = useState('3');
    const [startDate, setStartDate] = useState('');
    const [execType, setExecType] = useState<'until' | 'occurrences'>('until');
    const [endDate, setEndDate] = useState('');
    const [maxOccurrences, setMaxOccurrences] = useState('');
    const [description, setDescription] = useState('');
    // auto_charge
    const [card, setCard] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvv, setCvv] = useState('');
    const [zip, setZip] = useState('');
    // invoice_link
    const [email, setEmail] = useState('');
    const [methods, setMethods] = useState<LinkMethod[]>(['agilpay', 'ath']);
    const [graceDays, setGraceDays] = useState('3');
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try { setItems(await recurringService.list(showDeleted)); }
        catch (err) { if (err instanceof ApiError) toast.error(err.message); }
        finally { setLoading(false); }
    }, [showDeleted]);
    useEffect(() => { load(); }, [load]);

    const confirmRestore = async (id: string) => {
        try { await recurringService.restore(id); toast.success(t('posx.recurring.toast.restored')); load(); }
        catch (err) { toast.error(err instanceof ApiError ? err.message : t('posx.recurring.toast.error')); }
    };

    const resetForm = () => {
        setClientId(''); setAmount(''); setInterval('monthly'); setDescription('');
        setIntervalCount('1'); setMonthlyDay(''); setRetryEnabled(true); setMaxRetries('3'); setStartDate(''); setExecType('until'); setEndDate(''); setMaxOccurrences('');
        setCard(''); setExpiry(''); setCvv(''); setZip('');
        setEmail(''); setMethods(['agilpay', 'ath']); setGraceDays('3');
    };

    const onCard = (v: string) => { const d = v.replace(/\D/g, '').slice(0, 19); setCard(d.match(/.{1,4}/g)?.join(' ') || d); };
    const onExpiry = (v: string) => { let d = v.replace(/\D/g, '').slice(0, 4); if (d.length >= 2) d = d.slice(0, 2) + '/' + d.slice(2); setExpiry(d); };

    // Al elegir cliente en modo factura, precargar su correo.
    const onSelectClient = (id: string) => {
        setClientId(id);
        const c = clients.find(c => c.id === id);
        if (c?.email && !email) setEmail(c.email);
    };

    const toggleMethod = (m: LinkMethod) => setMethods(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

    const create = async () => {
        if (!clientId) return toast.error(t('posx.recurring.toast.selectClient'));
        if (!amount || Number(amount) <= 0) return toast.error(t('posx.recurring.toast.invalidAmount'));

        const base: CreateRecurringInput = {
            clientId, mode, amount: Number(amount), interval, description: description || undefined,
            intervalCount: Math.max(1, Number(intervalCount) || 1),
            monthlyDay: (['monthly', 'quarterly', 'annual'].includes(interval) && Number(monthlyDay) >= 1 && Number(monthlyDay) <= 31) ? Number(monthlyDay) : null,
            retryEnabled,
            maxRetries: Math.max(1, Number(maxRetries) || 3),
            startDate: startDate || null,
            endDate: execType === 'until' ? (endDate || null) : null,
            maxOccurrences: execType === 'occurrences' ? (Number(maxOccurrences) > 0 ? Number(maxOccurrences) : null) : null,
        };

        if (mode === 'invoice_link') {
            if (methods.length === 0) return toast.error(t('posx.recurring.toast.selectMethod'));
            const client = clients.find(c => c.id === clientId);
            const finalEmail = (email || client?.email || '').trim();
            if (!finalEmail) return toast.error(t('posx.recurring.toast.noEmail'));
            base.email = finalEmail;
            base.linkMethods = methods;
            base.graceDays = Math.max(0, Number(graceDays) || 0);
        } else {
            const [mm, yy] = expiry.split('/');
            if (!mm || !yy) return toast.error(t('posx.recurring.toast.invalidExpiry'));
            base.card = card.replace(/\s/g, '');
            base.expMonth = mm; base.expYear = yy;
            base.cvv = cvv.replace(/\D/g, '');
            base.zipCode = zip || undefined;
        }

        setSaving(true);
        try {
            await recurringService.create(base);
            toast.success(mode === 'invoice_link' ? t('posx.recurring.toast.createdInvoice') : t('posx.recurring.toast.createdCharge'));
            setShowForm(false); resetForm(); load();
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : t('posx.recurring.toast.createFailed'));
        } finally { setSaving(false); }
    };

    const doAction = async (id: string, action: 'pause' | 'resume' | 'cancel') => {
        try { await recurringService.setStatus(id, action); load(); }
        catch (err) { toast.error(err instanceof ApiError ? err.message : t('posx.recurring.toast.error')); }
    };

    // Cancelación con confirmación en modal (antes era un confirm() nativo).
    const confirmCancel = async () => {
        if (!toCancel) return;
        await doAction(toCancel, 'cancel');
        setToCancel(null);
    };

    // Eliminación permanente del plan recurrente (con sus cargos).
    const confirmDelete = async () => {
        if (!toDelete) return;
        try {
            await recurringService.remove(toDelete);
            toast.success(t('posx.recurring.toast.deleted'));
            setToDelete(null);
            load();
        } catch (err) { toast.error(err instanceof ApiError ? err.message : t('posx.recurring.toast.error')); }
    };

    const chargeNow = async (rp: RecurringPayment) => {
        try {
            const r = await recurringService.chargeNow(rp.id);
            if (rp.mode === 'invoice_link') toast.success(r.message || t('posx.recurring.toast.invoiceSent'));
            else if (r.status === 'approved') toast.success(t('posx.recurring.toast.chargeApproved', { ref: r.reference || '—' }));
            else toast.warning(t('posx.recurring.toast.chargeResult', { status: r.status, message: r.message }));
            load();
        } catch (err) { toast.error(err instanceof ApiError ? err.message : t('posx.recurring.toast.error')); }
    };

    const copyLink = (token: string) => {
        const url = `${window.location.origin}/pay/${token}`;
        navigator.clipboard?.writeText(url).then(() => toast.success(t('posx.recurring.toast.linkCopied')), () => toast.error(t('posx.recurring.toast.copyFailed')));
    };

    // Filtrado + paginación (estilo Facturas).
    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return items.filter(rp => {
            if (statusF !== 'all' && rp.status !== statusF) return false;
            if (modeF === 'invoice_link' && rp.mode !== 'invoice_link') return false;
            if (modeF === 'auto' && rp.mode === 'invoice_link') return false;
            if (payF !== 'all') {
                const paid = rp.currentState === 'paid';
                if (payF === 'paid' && !paid) return false;
                if (payF === 'unpaid' && paid) return false;
            }
            if (q) {
                const hay = `${rp.clientName || ''} ${rp.description || ''} ${rp.clientEmail || ''}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [items, search, statusF, modeF, payF]);
    const pg = usePagination(filtered, 25);
    const hasActiveFilters = statusF !== 'all' || modeF !== 'all' || payF !== 'all';

    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">{t('posx.recurring.title')}</h1>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowDeleted(s => !s)} className={`${BUTTON_SECONDARY_SM_CLASSES} ${showDeleted ? 'ring-1 ring-primary text-primary' : ''}`}>{showDeleted ? t('common.show_active') : t('common.show_deleted')}</button>
                    {!showDeleted && <button onClick={() => setShowForm(s => !s)} className={BUTTON_PRIMARY_SM_CLASSES}>{showForm ? t('posx.recurring.close') : t('posx.recurring.new')}</button>}
                </div>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">{t('posx.recurring.subtitle.a')} <b>{t('posx.recurring.subtitle.autoCharge')}</b> {t('posx.recurring.subtitle.b')} <b>{t('posx.recurring.subtitle.invoiceLink')}</b> {t('posx.recurring.subtitle.c')}</p>

            {showForm && (
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 mb-4 space-y-3">
                    <h3 className="font-semibold text-primary">{t('posx.recurring.form.title')}</h3>

                    {/* Selector de modo */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button type="button" onClick={() => setMode('invoice_link')}
                            className={`text-left p-3 rounded-lg border ${mode === 'invoice_link' ? 'border-primary ring-2 ring-primary/30 bg-primary/5' : 'border-neutral-200 dark:border-neutral-700'}`}>
                            <div className="font-medium text-sm">📧 {t('posx.recurring.mode.invoiceLink')}</div>
                            <div className="text-xs text-neutral-500">{t('posx.recurring.mode.invoiceLink.desc')}</div>
                        </button>
                        <button type="button" onClick={() => setMode('auto_charge')}
                            className={`text-left p-3 rounded-lg border ${mode === 'auto_charge' ? 'border-primary ring-2 ring-primary/30 bg-primary/5' : 'border-neutral-200 dark:border-neutral-700'}`}>
                            <div className="font-medium text-sm">💳 {t('posx.recurring.mode.autoCharge')}</div>
                            <div className="text-xs text-neutral-500">{t('posx.recurring.mode.autoCharge.desc')}</div>
                        </button>
                    </div>

                    {/* Grupo: Cliente y monto */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={LABEL}>{t('posx.recurring.form.client')}</label>
                            <ClientAutocomplete clients={clients.filter(c => !c.isDefault)} value={clientId} onChange={onSelectClient} placeholder={t('posx.recurring.form.select')} />
                        </div>
                        <div>
                            <label className={LABEL}>{t('posx.recurring.form.amount')}</label>
                            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className={`${INPUT_SM_CLASSES} w-full`} />
                        </div>
                    </div>

                    {/* Grupo: Programación */}
                    <div className="border-t border-neutral-100 dark:border-neutral-700 pt-3">
                        <h4 className={SECTION}>{t('posx.recurring.section.schedule')}</h4>
                        <label className={LABEL}>{t('posx.recurring.form.frequency')}</label>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {FREQS.map(f => (
                                <button
                                    key={f.val}
                                    type="button"
                                    onClick={() => setInterval(f.val)}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${interval === f.val ? 'bg-primary text-white border-primary' : 'border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:border-primary hover:text-primary'}`}
                                >
                                    {t(f.key)}
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className={LABEL}>{t('posx.recurring.form.each')}</label>
                                <input type="number" min="1" value={intervalCount} onChange={e => setIntervalCount(e.target.value)} className={`${INPUT_SM_CLASSES} w-full`} />
                            </div>
                            {['monthly', 'quarterly', 'annual'].includes(interval) && (
                                <div>
                                    <label className={LABEL}>{t('posx.recurring.form.monthly_day')}</label>
                                    <select value={monthlyDay} onChange={e => setMonthlyDay(e.target.value)} className={`${INPUT_SM_CLASSES} w-full`}>
                                        <option value="">{t('posx.recurring.form.monthly_day_any')}</option>
                                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => <option key={d} value={String(d)}>{d}</option>)}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className={LABEL}>{t('posx.recurring.form.first_charge')}</label>
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={`${INPUT_SM_CLASSES} w-full`} />
                            </div>
                        </div>
                    </div>

                    {/* Grupo: Reintentos y terminación */}
                    <div className="border-t border-neutral-100 dark:border-neutral-700 pt-3">
                        <h4 className={SECTION}>{t('posx.recurring.section.retry_end')}</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={LABEL}>{t('posx.recurring.form.retry')}</label>
                                <select value={retryEnabled ? 'yes' : 'no'} onChange={e => setRetryEnabled(e.target.value === 'yes')} className={`${INPUT_SM_CLASSES} w-full`}>
                                    <option value="yes">{t('common.yes')}</option>
                                    <option value="no">{t('common.no')}</option>
                                </select>
                            </div>
                            {retryEnabled && (
                                <div>
                                    <label className={LABEL}>{t('posx.recurring.form.retry_number')}</label>
                                    <input type="number" min="1" max="20" value={maxRetries} onChange={e => setMaxRetries(e.target.value)} className={`${INPUT_SM_CLASSES} w-full`} />
                                    <p className="text-[11px] text-neutral-400 mt-0.5">{t('posx.recurring.form.retry_hint')}</p>
                                </div>
                            )}
                            <div>
                                <label className={LABEL}>{t('posx.recurring.form.exec_type')}</label>
                                <select value={execType} onChange={e => setExecType(e.target.value as any)} className={`${INPUT_SM_CLASSES} w-full`}>
                                    <option value="until">{t('posx.recurring.form.exec_until')}</option>
                                    <option value="occurrences">{t('posx.recurring.form.exec_occurrences')}</option>
                                </select>
                            </div>
                            {execType === 'until' ? (
                                <div>
                                    <label className={LABEL}>{t('posx.recurring.form.until')}</label>
                                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={`${INPUT_SM_CLASSES} w-full`} />
                                    <p className="text-[11px] text-neutral-400 mt-0.5">{t('posx.recurring.form.until_hint')}</p>
                                </div>
                            ) : (
                                <div>
                                    <label className={LABEL}>{t('posx.recurring.form.occurrences')}</label>
                                    <input type="number" min="1" value={maxOccurrences} onChange={e => setMaxOccurrences(e.target.value)} placeholder="12" className={`${INPUT_SM_CLASSES} w-full`} />
                                    <p className="text-[11px] text-neutral-400 mt-0.5">{t('posx.recurring.form.occurrences_hint')}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className={LABEL}>{t('posx.recurring.form.description')}</label>
                        <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder={t('posx.recurring.form.description.ph')} className={`${INPUT_SM_CLASSES} w-full`} />
                    </div>

                    {mode === 'invoice_link' ? (
                        <div className="border-t border-neutral-100 dark:border-neutral-700 pt-3 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className={LABEL}>{t('posx.recurring.form.clientEmail')}</label>
                                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('posx.recurring.form.clientEmail.ph')} className={`${INPUT_SM_CLASSES} w-full`} autoComplete="off" />
                                </div>
                                <div>
                                    <label className={LABEL}>{t('posx.recurring.form.grace')}</label>
                                    <input type="number" min={0} value={graceDays} onChange={e => setGraceDays(e.target.value)} placeholder="3" className={`${INPUT_SM_CLASSES} w-full`} />
                                    <p className="text-[11px] text-neutral-400 mt-1">{t('posx.recurring.form.grace.note.a')} <b>{t('posx.recurring.form.grace.note.unpaid')}</b>.</p>
                                </div>
                            </div>
                            <div>
                                <label className={LABEL}>{t('posx.recurring.form.linkMethods')}</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 text-sm">
                                        <input type="checkbox" checked={methods.includes('agilpay')} onChange={() => toggleMethod('agilpay')} className="h-4 w-4" />
                                        💳 {t('posx.recurring.form.agilpayCard')}
                                    </label>
                                    <label className="flex items-center gap-2 text-sm">
                                        <input type="checkbox" checked={methods.includes('ath')} onChange={() => toggleMethod('ath')} className="h-4 w-4" />
                                        📱 ATH Móvil
                                    </label>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="border-t border-neutral-100 dark:border-neutral-700 pt-3">
                            <label className={LABEL}>{t('posx.recurring.form.card')}</label>
                            <input type="text" inputMode="numeric" value={card} onChange={e => onCard(e.target.value)} placeholder={t('posx.recurring.form.cardNumber.ph')} className={`${INPUT_SM_CLASSES} w-full mb-2`} autoComplete="off" />
                            <div className="grid grid-cols-3 gap-2">
                                <input type="text" inputMode="numeric" value={expiry} onChange={e => onExpiry(e.target.value)} placeholder={t('posx.recurring.form.expiry.ph')} className={INPUT_SM_CLASSES} autoComplete="off" />
                                <input type="text" inputMode="numeric" value={cvv} onChange={e => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="CVV" className={INPUT_SM_CLASSES} autoComplete="off" />
                                <input type="text" inputMode="numeric" value={zip} onChange={e => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="Zip" className={INPUT_SM_CLASSES} autoComplete="off" />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <button onClick={() => { setShowForm(false); resetForm(); }} className={BUTTON_SECONDARY_SM_CLASSES}>{t('posx.recurring.form.cancel')}</button>
                        <button onClick={create} disabled={saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>
                            {saving ? t('posx.recurring.form.processing') : mode === 'invoice_link' ? t('posx.recurring.form.submitInvoice') : t('posx.recurring.form.submitCharge')}
                        </button>
                    </div>
                </div>
            )}

            {!loading && items.length > 0 && (
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3 mb-3 flex flex-wrap items-center gap-2">
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('posx.recurring.search_ph')} className={`${INPUT_SM_CLASSES} flex-grow min-w-[200px]`} />
                    <select value={statusF} onChange={e => setStatusF(e.target.value as any)} className={INPUT_SM_CLASSES}>
                        <option value="all">{t('posx.recurring.filter.all_status')}</option>
                        <option value="active">{t('posx.recurring.status.active')}</option>
                        <option value="paused">{t('posx.recurring.status.paused')}</option>
                        <option value="cancelled">{t('posx.recurring.status.cancelled')}</option>
                    </select>
                    <select value={modeF} onChange={e => setModeF(e.target.value as any)} className={INPUT_SM_CLASSES}>
                        <option value="all">{t('posx.recurring.filter.all_modes')}</option>
                        <option value="invoice_link">{t('posx.recurring.mode.invoiceLink')}</option>
                        <option value="auto">{t('posx.recurring.badge.autoCharge')}</option>
                    </select>
                    <select value={payF} onChange={e => setPayF(e.target.value as any)} className={INPUT_SM_CLASSES}>
                        <option value="all">{t('posx.recurring.filter.all_pay')}</option>
                        <option value="paid">{t('posx.recurring.filter.paid')}</option>
                        <option value="unpaid">{t('posx.recurring.filter.unpaid')}</option>
                    </select>
                    {hasActiveFilters && <button onClick={() => { setStatusF('all'); setModeF('all'); setPayF('all'); }} className="text-sm text-neutral-500 hover:text-red-500 underline">{t('posx.recurring.filter.clear')}</button>}
                </div>
            )}

            {loading ? <LoadingSkeleton variant="list" rows={4} /> : items.length === 0 ? (
                <EmptyState title={t('posx.recurring.empty.title')} description={t('posx.recurring.empty.desc')} />
            ) : filtered.length === 0 ? (
                <EmptyState title={t('posx.recurring.no_results')} description={t('posx.recurring.no_results_desc')} />
            ) : (
                <div className="space-y-2">
                    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                        <PaginationFooter
                            position="top"
                            total={pg.total} page={pg.page} pageCount={pg.pageCount}
                            pageSize={pg.pageSize} from={pg.from} to={pg.to}
                            onPage={pg.setPage} onPageSize={pg.setPageSize}
                        />
                    </div>
                    {pg.paged.map(rp => {
                        const isInvoice = rp.mode === 'invoice_link';
                        const cur = rp.currentState;
                        return (
                        <div key={rp.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3">
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[rp.status]}`}>{t(STATUS_LABEL[rp.status])}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${isInvoice ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{isInvoice ? `📧 ${t('posx.recurring.mode.invoiceLink')}` : `💳 ${t('posx.recurring.badge.autoCharge')}`}</span>
                                <span className="font-semibold"><ClientNameLink clientId={rp.clientId} name={rp.clientName} /></span>
                                <span className="text-neutral-500">· {money(rp.amount)} {t(INTERVAL_LABEL[rp.interval])}</span>
                                {!isInvoice && rp.cardLast4 && <span className="text-xs text-neutral-400">·•••• {rp.cardLast4}</span>}
                                {isInvoice && cur && <span className={`text-xs px-2 py-0.5 rounded-full ${PAY_BADGE[cur] || 'bg-neutral-100 text-neutral-600'}`}>{PAY_LABEL[cur] ? t(PAY_LABEL[cur]) : cur}</span>}
                                <span className="text-xs text-neutral-400 ml-auto">{isInvoice ? t('posx.recurring.nextInvoice') : t('posx.recurring.nextCharge')}: {rp.status === 'cancelled' ? '—' : new Date(rp.nextChargeDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-neutral-500">
                                {(() => { const lp = lastPaidDate(rp); return <span className="font-medium text-neutral-600 dark:text-neutral-300">{t('posx.recurring.last_paid')}: {lp ? new Date(lp).toLocaleDateString() : t('posx.recurring.no_payment')}</span>; })()}
                                {rp.description && <span>· {rp.description}</span>}
                                {isInvoice && rp.clientEmail && <span>· ✉ {rp.clientEmail}</span>}
                                {isInvoice && <span>· Link: {(rp.linkMethods || 'agilpay,ath').split(',').map(m => m === 'ath' ? 'ATH Móvil' : 'AgilPay').join(' + ')}</span>}
                                {isInvoice && (rp.graceDays ?? 0) > 0 && <span>· {t('posx.recurring.graceLabel', { days: rp.graceDays ?? 0 })}</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {rp.status !== 'cancelled' && <button onClick={() => chargeNow(rp)} className="text-xs text-primary hover:underline">{isInvoice ? t('posx.recurring.action.sendInvoiceNow') : t('posx.recurring.action.chargeNow')}</button>}
                                {showDeleted ? (
                                    <button onClick={() => confirmRestore(rp.id)} className="text-xs text-green-600 hover:underline">{t('common.restore')}</button>
                                ) : (<>
                                {rp.status === 'active' && <button onClick={() => doAction(rp.id, 'pause')} className="text-xs text-amber-600 hover:underline">{t('posx.recurring.action.pause')}</button>}
                                {rp.status === 'paused' && <button onClick={() => doAction(rp.id, 'resume')} className="text-xs text-green-600 hover:underline">{t('posx.recurring.action.resume')}</button>}
                                {rp.status !== 'cancelled' && <button onClick={() => setToCancel(rp.id)} className="text-xs text-amber-600 hover:underline">{t('posx.recurring.action.cancel')}</button>}
                                <button onClick={() => setToDelete(rp.id)} className="text-xs text-red-600 hover:underline">{t('common.delete')}</button>
                                </>)}
                                <button onClick={() => setExpanded(expanded === rp.id ? null : rp.id)} className="text-xs text-neutral-500 hover:underline ml-auto">{expanded === rp.id ? t('posx.recurring.action.hide') : t('posx.recurring.action.history')} ({rp.charges.length})</button>
                            </div>
                            {expanded === rp.id && (
                                <table className="min-w-full text-sm mt-2 border-t border-neutral-100 dark:border-neutral-700">
                                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                                        {rp.charges.length === 0 ? <tr><td className="p-2 text-neutral-400">{t('posx.recurring.noMovements')}</td></tr> : rp.charges.map(c => {
                                            const st = payState(c);
                                            return (
                                            <tr key={c.id}>
                                                <td className="p-2 whitespace-nowrap">{new Date(c.date).toLocaleDateString()}</td>
                                                <td className="p-2">{money(c.amount)}</td>
                                                <td className={`p-2 font-medium ${PAY_COLOR[st] || 'text-neutral-500'}`}>{PAY_LABEL[st] ? t(PAY_LABEL[st]) : st}</td>
                                                <td className="p-2 text-neutral-500 text-xs">
                                                    {c.reference || c.message || ''}
                                                    {c.invoiceToken && (st === 'pending' || st === 'overdue' || st === 'partial') && (
                                                        <button onClick={() => copyLink(c.invoiceToken!)} className="ml-2 text-primary hover:underline">{t('posx.recurring.copyLink')}</button>
                                                    )}
                                                </td>
                                            </tr>
                                        );})}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        );
                    })}
                    <PaginationFooter
                        total={pg.total} page={pg.page} pageCount={pg.pageCount}
                        pageSize={pg.pageSize} from={pg.from} to={pg.to}
                        onPage={pg.setPage} onPageSize={pg.setPageSize}
                    />
                </div>
            )}

            <ConfirmationModal
                isOpen={!!toCancel}
                onClose={() => setToCancel(null)}
                onConfirm={confirmCancel}
                title={t('posx.recurring.action.cancel')}
                confirmButtonText={t('posx.recurring.action.cancel')}
                message={t('posx.recurring.confirm.cancel')}
            />
            <ConfirmationModal
                isOpen={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={confirmDelete}
                title={t('posx.recurring.delete_title')}
                confirmButtonText={t('common.delete')}
                message={t('posx.recurring.confirm.delete')}
            />
        </div>
    );
};
