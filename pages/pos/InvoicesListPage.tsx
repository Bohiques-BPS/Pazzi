import React, { useState, useEffect, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { invoicesService, type Invoice, type InvoiceItemInput } from '../../services/invoices';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/Modal';

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;
const publicLink = (token: string) => `${window.location.origin}/#/pay/${token}`;

const STATUS: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
    partial: { label: 'Pago parcial', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    paid: { label: 'Pagada', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
    cancelled: { label: 'Cancelada', cls: 'bg-neutral-200 text-neutral-500' },
};

const money0 = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;

type DraftItem = { name: string; quantity: string; unitPrice: string };
const emptyItem = (): DraftItem => ({ name: '', quantity: '1', unitPrice: '' });

/** Modal que muestra el link público + QR de una factura. */
const ShareModal: React.FC<{ invoice: Invoice | null; onClose: () => void }> = ({ invoice, onClose }) => {
    const [qr, setQr] = useState<string>('');
    const link = invoice ? publicLink(invoice.publicToken) : '';

    useEffect(() => {
        let alive = true;
        if (invoice) {
            import('qrcode').then(QR => QR.toDataURL(link, { width: 240, margin: 1 }))
                .then(url => { if (alive) setQr(url); })
                .catch(() => { if (alive) setQr(''); });
        } else { setQr(''); }
        return () => { alive = false; };
    }, [invoice, link]);

    const copy = async () => {
        try { await navigator.clipboard.writeText(link); toast.success('Link copiado'); }
        catch { toast.error('No se pudo copiar'); }
    };

    return (
        <Modal isOpen={!!invoice} onClose={onClose} title={`Factura ${invoice?.number ? `#${invoice.number}` : ''} · Link de pago`} size="sm">
            <div className="space-y-4 text-center">
                <p className="text-sm text-neutral-500">El cliente puede escanear el QR o abrir el link para ver la factura y pagarla.</p>
                {qr ? <img src={qr} alt="QR" className="mx-auto rounded-md border border-neutral-200 dark:border-neutral-700" /> : <div className="h-40 flex items-center justify-center text-neutral-400">Generando QR…</div>}
                <div className="flex gap-2">
                    <input readOnly value={link} className={`${INPUT_SM_CLASSES} w-full text-xs`} onFocus={e => e.target.select()} />
                    <button onClick={copy} className={BUTTON_PRIMARY_SM_CLASSES}>Copiar</button>
                </div>
                <a href={link} target="_blank" rel="noreferrer" className="inline-block text-sm text-primary hover:underline">Abrir vista del cliente ↗</a>
            </div>
        </Modal>
    );
};

export const InvoicesListPage: React.FC = () => {
    const { clients } = useData();
    const [items, setItems] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [share, setShare] = useState<Invoice | null>(null);

    // Form
    const [clientId, setClientId] = useState('');
    const [email, setEmail] = useState('');
    const [sendOnCreate, setSendOnCreate] = useState(true);
    const [description, setDescription] = useState('');
    const [lines, setLines] = useState<DraftItem[]>([emptyItem()]);
    const [saving, setSaving] = useState(false);

    // Al elegir cliente, autocompleta su correo (si tiene).
    const onSelectClient = (id: string) => {
        setClientId(id);
        const c = clients.find(x => x.id === id);
        if (c?.email) setEmail(c.email);
    };

    const load = useCallback(async () => {
        setLoading(true);
        try { setItems(await invoicesService.list()); }
        catch (err) { if (err instanceof ApiError) toast.error(err.message); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const resetForm = () => { setClientId(''); setEmail(''); setSendOnCreate(true); setDescription(''); setLines([emptyItem()]); };
    const setLine = (i: number, patch: Partial<DraftItem>) => setLines(ls => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l));
    const addLine = () => setLines(ls => [...ls, emptyItem()]);
    const removeLine = (i: number) => setLines(ls => ls.length > 1 ? ls.filter((_, idx) => idx !== i) : ls);

    const draftTotal = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);

    const create = async () => {
        const parsed: InvoiceItemInput[] = [];
        for (const l of lines) {
            const q = Number(l.quantity), p = Number(l.unitPrice);
            if (!l.name.trim()) return toast.error('Cada línea necesita una descripción.');
            if (!(q > 0)) return toast.error('La cantidad debe ser mayor a 0.');
            if (!(p >= 0)) return toast.error('El precio no puede ser negativo.');
            parsed.push({ name: l.name.trim(), quantity: q, unitPrice: p });
        }
        if (parsed.length === 0) return toast.error('Agrega al menos un artículo.');
        setSaving(true);
        try {
            const created = await invoicesService.create({
                clientId: clientId || undefined,
                email: email.trim() || undefined,
                send: sendOnCreate && !!email.trim(),
                items: parsed,
                description: description || undefined,
            });
            toast.success(sendOnCreate && email.trim() ? `Factura creada y enviada a ${email.trim()}.` : 'Factura creada.');
            setShowForm(false); resetForm(); load();
            setShare(created); // abre el modal con el link/QR
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'No se pudo crear la factura.');
        } finally { setSaving(false); }
    };

    const sendByEmail = async (inv: Invoice) => {
        try {
            const r = await invoicesService.send(inv.id);
            toast.success(`Factura enviada a ${r.to}.`);
        } catch (err) {
            // Si no hay correo del cliente, lo pedimos y reintentamos.
            const to = prompt('Correo del cliente para enviar la factura:') || '';
            if (!to.trim()) return;
            try {
                const r = await invoicesService.send(inv.id, to.trim());
                toast.success(`Factura enviada a ${r.to}.`);
            } catch (e) {
                toast.error(e instanceof ApiError ? e.message : 'No se pudo enviar la factura.');
            }
        }
    };

    const markPaid = async (inv: Invoice) => {
        const balance = Math.max(0, (inv.total || 0) - (inv.amountPaid || 0));
        const amtStr = prompt(`Monto del abono recibido (saldo ${money0(balance)}):`, balance.toFixed(2));
        if (amtStr === null) return;
        const amount = parseFloat(String(amtStr).replace(',', '.'));
        if (!(amount > 0)) return toast.error('Monto inválido.');
        const reference = prompt('Referencia del pago (ej. Nº de confirmación ATH Móvil):') ?? '';
        try {
            await invoicesService.markPaid(inv.id, { method: 'ATH Móvil', reference: reference || undefined, amount });
            toast.success('Abono registrado.');
            load();
        } catch (err) { toast.error(err instanceof ApiError ? err.message : 'Error al registrar el abono.'); }
    };

    const copyLink = async (inv: Invoice) => {
        try { await navigator.clipboard.writeText(publicLink(inv.publicToken)); toast.success('Link copiado'); }
        catch { toast.error('No se pudo copiar'); }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">Facturas</h1>
                <button onClick={() => setShowForm(s => !s)} className={BUTTON_PRIMARY_SM_CLASSES}>{showForm ? 'Cerrar' : '+ Nueva factura'}</button>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">Genera facturas para enviar a tus clientes. Cada una tiene un link con QR donde el cliente ve el detalle, paga con tarjeta (AgilPay) o ATH Móvil y descarga la factura pagada.</p>

            {showForm && (
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 mb-4 space-y-3">
                    <h3 className="font-semibold text-primary">Nueva factura</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1">Cliente (opcional)</label>
                            <select value={clientId} onChange={e => onSelectClient(e.target.value)} className={`${INPUT_SM_CLASSES} w-full`}>
                                <option value="">Sin cliente</option>
                                {clients.filter(c => !c.isDefault).map(c => <option key={c.id} value={c.id}>{c.name} {c.lastName}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1">Correo del cliente (para enviar la factura)</label>
                            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="cliente@correo.com" className={`${INPUT_SM_CLASSES} w-full`} />
                            <label className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-300 mt-1">
                                <input type="checkbox" checked={sendOnCreate} onChange={e => setSendOnCreate(e.target.checked)} className="h-3.5 w-3.5" />
                                Enviar la factura por correo al crear
                            </label>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-xs text-neutral-500 mb-1">Descripción / nota (opcional)</label>
                            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej. Servicio de instalación" className={`${INPUT_SM_CLASSES} w-full`} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-xs text-neutral-500">Artículos</label>
                        {lines.map((l, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <input type="text" value={l.name} onChange={e => setLine(i, { name: e.target.value })} placeholder="Descripción" className={`${INPUT_SM_CLASSES} flex-1`} />
                                <input type="number" value={l.quantity} onChange={e => setLine(i, { quantity: e.target.value })} placeholder="Cant." className={`${INPUT_SM_CLASSES} w-20`} />
                                <input type="number" value={l.unitPrice} onChange={e => setLine(i, { unitPrice: e.target.value })} placeholder="Precio" className={`${INPUT_SM_CLASSES} w-28`} />
                                <span className="w-24 text-right text-sm text-neutral-500">{money((Number(l.quantity) || 0) * (Number(l.unitPrice) || 0))}</span>
                                <button onClick={() => removeLine(i)} className="text-red-500 hover:text-red-700 px-1" title="Quitar">✕</button>
                            </div>
                        ))}
                        <button onClick={addLine} className="text-sm text-primary hover:underline">+ Agregar artículo</button>
                    </div>

                    <div className="flex items-center justify-between border-t border-neutral-100 dark:border-neutral-700 pt-3">
                        <span className="text-sm text-neutral-500">Subtotal (impuesto se calcula al crear)</span>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-100">{money(draftTotal)}</span>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => { setShowForm(false); resetForm(); }} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                        <button onClick={create} disabled={saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{saving ? 'Creando…' : 'Crear factura'}</button>
                    </div>
                </div>
            )}

            {loading ? <LoadingSkeleton variant="list" rows={4} /> : items.length === 0 ? (
                <EmptyState title="Sin facturas" description="Crea una factura para enviarla a un cliente con su link de pago." />
            ) : (
                <div className="space-y-2">
                    {items.map(inv => {
                        const st = STATUS[inv.status] || STATUS.pending;
                        return (
                            <div key={inv.id} className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-3">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                                    <span className="font-semibold text-neutral-800 dark:text-neutral-100">Factura {inv.number ? `#${inv.number}` : ''}</span>
                                    {inv.clientName && <span className="text-neutral-500">· {inv.clientName}</span>}
                                    <span className="text-neutral-500">· {money(inv.total)}</span>
                                    {inv.status === 'partial' && <span className="text-blue-600 dark:text-blue-400 text-xs">· Pagado {money(inv.amountPaid || 0)} · Saldo {money((inv.total || 0) - (inv.amountPaid || 0))}</span>}
                                    <span className="text-xs text-neutral-400 ml-auto">{new Date(inv.createdAt).toLocaleDateString()}</span>
                                </div>
                                {inv.description && <p className="text-xs text-neutral-500 mt-1">{inv.description}</p>}
                                <div className="flex items-center gap-3 mt-2 flex-wrap">
                                    <button onClick={() => setShare(inv)} className="text-xs text-primary hover:underline">Ver link / QR</button>
                                    <button onClick={() => copyLink(inv)} className="text-xs text-neutral-500 hover:underline">Copiar link</button>
                                    <button onClick={() => sendByEmail(inv)} className="text-xs text-blue-600 hover:underline">Enviar por correo</button>
                                    {(inv.status === 'pending' || inv.status === 'partial') && <button onClick={() => markPaid(inv)} className="text-xs text-green-600 hover:underline">Registrar abono</button>}
                                    {inv.status === 'paid' && inv.paidMethod && <span className="text-xs text-neutral-400 ml-auto">Pagada · {inv.paidMethod}{inv.paidReference ? ` · Ref: ${inv.paidReference}` : ''}</span>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <ShareModal invoice={share} onClose={() => setShare(null)} />
        </div>
    );
};
