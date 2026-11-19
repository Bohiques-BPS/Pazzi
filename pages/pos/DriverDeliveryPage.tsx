import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { deliveriesService, DELIVERY_STATUS_CLS, type DeliveryStatus } from '../../services/deliveries';

/**
 * Página del REPARTIDOR (enlace secreto por entrega, sin login, pensada para el celular):
 * ver datos de la entrega, marcar "En ruta" y confirmar lo entregado con quién recibió y una foto opcional.
 */

interface DriverDelivery {
    business: string; number: number | null; saleNumber: number | null;
    clientName: string; contactName: string | null; contactPhone: string | null; address: string;
    notes: string | null; timeWindow: string | null; scheduledDate: string | null;
    status: DeliveryStatus; statusLabel: string; overdue: boolean; assignedName: string | null; deliveredAt: string | null;
    items: { id: string; name: string; quantity: number; delivered: number; pending: number }[];
}

const fmtQty = (n: number) => String(Math.round(n * 100) / 100);
const fmtDay = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

/** Reduce la foto del celular (≈1600 px, JPEG) antes de subirla: más rápida con datos móviles. */
async function shrinkPhoto(file: File): Promise<Blob> {
    try {
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = URL.createObjectURL(file);
        });
        const max = 1600;
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(img.src);
        const blob = await new Promise<Blob | null>(r => c.toBlob(r, 'image/jpeg', 0.8));
        return blob && blob.size < file.size ? blob : file;
    } catch {
        return file;
    }
}

export const DriverDeliveryPage: React.FC = () => {
    const { token = '' } = useParams<{ token: string }>();
    const [d, setD] = useState<DriverDelivery | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [confirming, setConfirming] = useState(false);
    const [qty, setQty] = useState<Record<string, string>>({});
    const [receivedBy, setReceivedBy] = useState('');
    const [note, setNote] = useState('');
    const [photo, setPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    useEffect(() => {
        if (!token) return;
        deliveriesService.getDriver(token).then(setD).catch(() => setError('Este enlace no es válido. Pide uno nuevo a la tienda.'));
    }, [token]);
    useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);

    const open = !!d && ['pending', 'in_route', 'partial'].includes(d.status);
    const phoneDigits = (d?.contactPhone || '').replace(/\D/g, '');
    const leftover = useMemo(() => d ? d.items.some(i => (parseFloat(qty[i.id] ?? '') || 0) < i.pending - 1e-9) : false, [d, qty]);

    const startConfirm = () => {
        if (!d) return;
        setQty(Object.fromEntries(d.items.map(i => [i.id, i.pending > 0 ? fmtQty(i.pending) : '0'])));
        setReceivedBy(d.contactName || '');
        setConfirming(true); setError(null);
    };
    const inRoute = async () => {
        setBusy(true); setError(null);
        try { setD(await deliveriesService.driverInRoute(token)); setMsg('Marcada en ruta. Se le avisó al cliente.'); }
        catch (e: any) { setError(e?.message || 'No se pudo marcar en ruta.'); }
        finally { setBusy(false); }
    };
    const confirm = async () => {
        if (!d) return;
        if (!receivedBy.trim()) { setError('Escribe el nombre de quien recibió.'); return; }
        const items = d.items.map(i => ({ id: i.id, quantity: Math.max(0, parseFloat(qty[i.id] ?? '') || 0) })).filter(i => i.quantity > 0);
        if (!items.length) { setError('Indica al menos una cantidad entregada.'); return; }
        setBusy(true); setError(null);
        try {
            const img = photo ? await shrinkPhoto(photo) : null;
            const r = await deliveriesService.driverConfirm(token, { items, receivedBy: receivedBy.trim(), note: note.trim() || undefined }, img);
            setD(r); setConfirming(false); setPhoto(null); setPhotoPreview(null);
            setMsg(r.status === 'delivered' ? '¡Entrega confirmada! Ya quedó registrada en el sistema.' : 'Entrega parcial registrada. Queda mercancía pendiente.');
        } catch (e: any) {
            setError(e?.message || 'No se pudo confirmar la entrega. Revisa la señal e intenta de nuevo.');
        } finally { setBusy(false); }
    };

    if (error && !d) return <Shell><p className="text-center text-neutral-600 py-10">{error}</p></Shell>;
    if (!d) return <Shell><p className="text-center text-neutral-500 py-10">Cargando…</p></Shell>;

    const input = 'w-full rounded-lg border border-neutral-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-teal-500';
    return (
        <Shell business={d.business}>
            <div className="flex items-start justify-between gap-2">
                <div>
                    <h1 className="text-xl font-bold text-neutral-900">Entrega #{d.number ?? ''}</h1>
                    {d.saleNumber && <p className="text-sm text-neutral-500">Factura #{d.saleNumber}</p>}
                </div>
                <span className={`text-sm font-semibold px-2.5 py-1 rounded-full ${DELIVERY_STATUS_CLS[d.status]}`}>{d.statusLabel}{d.overdue ? ' · Atrasada' : ''}</span>
            </div>

            {msg && <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 px-3 py-2 text-sm font-medium">{msg}</div>}
            {error && <div className="mt-3 rounded-lg bg-red-50 border border-red-200 text-red-700 px-3 py-2 text-sm">{error}</div>}

            <div className="mt-4 space-y-3 text-[15px] text-neutral-800">
                <Row label="Cliente">{d.clientName}</Row>
                <Row label="Recibe">
                    {d.contactName || '—'}
                    {d.contactPhone && (
                        <div className="flex gap-2 mt-1.5">
                            <a href={`tel:${phoneDigits}`} className="flex-1 text-center rounded-lg border border-neutral-300 py-2 font-semibold">Llamar</a>
                            {phoneDigits.length >= 10 && <a href={`https://wa.me/${phoneDigits.length === 10 ? '1' + phoneDigits : phoneDigits}`} target="_blank" rel="noreferrer" className="flex-1 text-center rounded-lg border border-green-300 text-green-700 py-2 font-semibold">WhatsApp</a>}
                        </div>
                    )}
                </Row>
                <Row label="Dirección">
                    {d.address || '—'}
                    {d.address && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.address)}`} target="_blank" rel="noreferrer" className="block mt-1.5 text-center rounded-lg border border-blue-300 text-blue-700 py-2 font-semibold">Abrir en el mapa</a>}
                </Row>
                {(d.scheduledDate || d.timeWindow) && <Row label="Cuándo">{d.scheduledDate ? fmtDay(d.scheduledDate) : 'Sin fecha'}{d.timeWindow ? ` · ${d.timeWindow}` : ''}</Row>}
                {d.notes && <Row label="Notas">{d.notes}</Row>}
            </div>

            <div className="mt-5">
                <p className="text-sm font-semibold text-neutral-700 mb-2">Artículos</p>
                <ul className="divide-y divide-neutral-100 border border-neutral-200 rounded-lg">
                    {d.items.map(i => (
                        <li key={i.id} className="px-3 py-2.5 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className="font-medium leading-snug">{i.name}</div>
                                <div className="text-xs text-neutral-500">Total {fmtQty(i.quantity)} · Entregado {fmtQty(i.delivered)}{i.pending > 0 ? ` · Falta ${fmtQty(i.pending)}` : ''}</div>
                            </div>
                            {confirming && i.pending > 0 ? (
                                <input type="number" inputMode="decimal" min={0} max={i.pending} step="any" value={qty[i.id] ?? ''}
                                    onChange={e => setQty(q => ({ ...q, [i.id]: e.target.value }))}
                                    className="w-20 rounded-lg border border-neutral-300 px-2 py-2 text-center text-base" aria-label={`Cantidad entregada de ${i.name}`} />
                            ) : (
                                <span className={`text-sm font-semibold ${i.pending > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>{i.pending > 0 ? `Falta ${fmtQty(i.pending)}` : 'Listo'}</span>
                            )}
                        </li>
                    ))}
                </ul>
            </div>

            {open && !confirming && (
                <div className="mt-5 space-y-2">
                    {d.status !== 'in_route' && (
                        <button type="button" onClick={inRoute} disabled={busy} className="w-full rounded-xl py-3.5 text-base font-bold bg-amber-500 text-white disabled:opacity-60">Salí en ruta</button>
                    )}
                    <button type="button" onClick={startConfirm} disabled={busy} className="w-full rounded-xl py-3.5 text-base font-bold bg-teal-600 text-white disabled:opacity-60">Confirmar entrega</button>
                </div>
            )}

            {open && confirming && (
                <div className="mt-5 space-y-3">
                    <div>
                        <label className="block text-sm font-semibold text-neutral-700 mb-1">Nombre de quien recibió *</label>
                        <input type="text" value={receivedBy} onChange={e => setReceivedBy(e.target.value)} className={input} autoComplete="off" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-neutral-700 mb-1">Foto <span className="font-normal text-neutral-500">(opcional)</span></label>
                        {photoPreview ? (
                            <div className="relative">
                                <img src={photoPreview} alt="Foto de la entrega" className="w-full max-h-64 object-cover rounded-lg border border-neutral-200" />
                                <button type="button" onClick={() => { setPhoto(null); setPhotoPreview(null); }} className="absolute top-2 right-2 bg-white/90 rounded-full px-3 py-1 text-sm font-semibold text-red-600 shadow">Quitar</button>
                            </div>
                        ) : (
                            <label className="block w-full text-center rounded-lg border-2 border-dashed border-neutral-300 py-4 text-neutral-600 font-semibold cursor-pointer">
                                Tomar foto
                                <input type="file" accept="image/*" capture="environment" className="hidden"
                                    onChange={e => { const f = e.target.files?.[0]; if (f) { setPhoto(f); setPhotoPreview(URL.createObjectURL(f)); } e.target.value = ''; }} />
                            </label>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-neutral-700 mb-1">Nota <span className="font-normal text-neutral-500">(opcional)</span></label>
                        <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} className={input} />
                    </div>
                    {leftover && <p className="text-sm font-medium text-orange-700">Quedará como entrega parcial: no se entregó todo.</p>}
                    <button type="button" onClick={confirm} disabled={busy} className="w-full rounded-xl py-3.5 text-base font-bold bg-teal-600 text-white disabled:opacity-60">{busy ? 'Enviando…' : 'Enviar confirmación'}</button>
                    <button type="button" onClick={() => { setConfirming(false); setError(null); }} disabled={busy} className="w-full rounded-xl py-3 text-base font-semibold border border-neutral-300 text-neutral-700">Cancelar</button>
                </div>
            )}

            {!open && (
                <p className="mt-5 text-center text-sm text-neutral-500">
                    {d.status === 'delivered' ? `Entrega completada${d.deliveredAt ? ` el ${new Date(d.deliveredAt).toLocaleString('es', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}` : ''}.` : 'Esta entrega fue cancelada.'}
                </p>
            )}
        </Shell>
    );
};

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div>
        <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
        <div>{children}</div>
    </div>
);

const Shell: React.FC<{ business?: string; children: React.ReactNode }> = ({ business, children }) => (
    <div className="min-h-screen bg-neutral-100 py-4 px-3 sm:py-8">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm border border-neutral-200 p-4 sm:p-6">
            {business && <p className="text-xs uppercase tracking-wide text-neutral-500 mb-2">{business} · Repartidor</p>}
            {children}
        </div>
    </div>
);

export default DriverDeliveryPage;
