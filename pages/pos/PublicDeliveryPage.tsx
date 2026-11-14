import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { deliveriesService, DELIVERY_STATUS_CLS, type DeliveryStatus } from '../../services/deliveries';

/** Seguimiento de una entrega para el cliente (enlace del correo; sin login). */

interface PublicDelivery {
    business: string; number: number | null; saleNumber: number | null;
    clientName: string; contactName: string | null; address: string;
    status: DeliveryStatus; statusLabel: string; overdue: boolean;
    scheduledDate: string | null; timeWindow: string | null; deliveredAt: string | null;
    items: { name: string; quantity: number; delivered: number; pending: number }[];
    events: { type: string; createdAt: string; receivedBy?: string | null }[];
}

const STEPS: { key: DeliveryStatus; label: string }[] = [
    { key: 'pending', label: 'Registrada' },
    { key: 'in_route', label: 'En ruta' },
    { key: 'delivered', label: 'Entregada' },
];
const EVENT_LABEL: Record<string, string> = {
    created: 'Entrega registrada', updated: 'Fecha o datos actualizados', in_route: 'Salió en ruta',
    partial: 'Entrega parcial', delivered: 'Entregada', cancelled: 'Cancelada', reopened: 'Reabierta',
};
const fmtDay = (ymd: string) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const fmtQty = (n: number) => String(Math.round(n * 100) / 100);

export const PublicDeliveryPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [d, setD] = useState<PublicDelivery | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) return;
        deliveriesService.getPublic(token).then(setD).catch(() => setError('No encontramos esta entrega. Revisa el enlace.'));
    }, [token]);

    if (error) return <Shell><p className="text-center text-neutral-600 py-10">{error}</p></Shell>;
    if (!d) return <Shell><p className="text-center text-neutral-500 py-10">Cargando…</p></Shell>;

    const stepIndex = d.status === 'delivered' ? 2 : d.status === 'in_route' ? 1 : 0;
    const cancelled = d.status === 'cancelled';

    return (
        <Shell business={d.business}>
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h1 className="text-xl font-semibold text-neutral-800">Tu entrega{d.saleNumber ? ` · Factura #${d.saleNumber}` : ''}</h1>
                    <p className="text-sm text-neutral-500">{d.contactName || d.clientName}{d.address ? ` · ${d.address}` : ''}</p>
                </div>
                <span className={`text-sm font-semibold px-3 py-1 rounded-full ${DELIVERY_STATUS_CLS[d.status]}`}>{d.statusLabel}</span>
            </div>

            {!cancelled && (
                <div className="mt-6 flex items-center">
                    {STEPS.map((s, i) => (
                        <React.Fragment key={s.key}>
                            <div className="flex flex-col items-center text-center w-20">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${i <= stepIndex ? 'bg-teal-600 text-white' : 'bg-neutral-200 text-neutral-500'}`}>{i + 1}</div>
                                <span className={`text-xs mt-1 ${i <= stepIndex ? 'text-teal-700 font-medium' : 'text-neutral-500'}`}>{s.label}</span>
                            </div>
                            {i < STEPS.length - 1 && <div className={`flex-1 h-1 rounded ${i < stepIndex ? 'bg-teal-600' : 'bg-neutral-200'}`} />}
                        </React.Fragment>
                    ))}
                </div>
            )}

            <div className="mt-6 rounded-lg bg-neutral-50 p-4 text-sm text-neutral-700">
                {d.status === 'delivered' && d.deliveredAt ? (
                    <>Entregada el <b>{new Date(d.deliveredAt).toLocaleString('es', { weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit' })}</b>.</>
                ) : cancelled ? (
                    <>Esta entrega fue cancelada. Si tienes dudas, comunícate con {d.business}.</>
                ) : d.scheduledDate ? (
                    <>Programada para <b>{fmtDay(d.scheduledDate)}</b>{d.timeWindow ? `, ${d.timeWindow}` : ''}.{d.overdue && ' Estamos atrasados con tu entrega; te contactaremos para coordinar.'}</>
                ) : (
                    <>Aún estamos programando el día de tu entrega. Te avisaremos por correo.</>
                )}
            </div>

            <table className="mt-6 w-full text-sm">
                <thead className="text-neutral-500 border-b">
                    <tr><th className="text-left py-2 font-medium">Artículo</th><th className="text-right py-2 font-medium">Entregado</th><th className="text-right py-2 font-medium">Pendiente</th></tr>
                </thead>
                <tbody className="divide-y">
                    {d.items.map((i, k) => (
                        <tr key={k}>
                            <td className="py-2 text-neutral-800">{i.name}</td>
                            <td className="py-2 text-right tabular-nums">{fmtQty(i.delivered)} / {fmtQty(i.quantity)}</td>
                            <td className={`py-2 text-right tabular-nums ${i.pending > 0 ? 'text-orange-600 font-semibold' : 'text-neutral-400'}`}>{i.pending > 0 ? fmtQty(i.pending) : '—'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {d.events.length > 0 && (
                <div className="mt-6">
                    <p className="text-sm font-medium text-neutral-700 mb-2">Historial</p>
                    <ul className="space-y-1.5">
                        {d.events.slice().reverse().map((e, k) => (
                            <li key={k} className="text-sm text-neutral-600">
                                <span className="font-medium text-neutral-800">{EVENT_LABEL[e.type] || e.type}</span>
                                {' · '}{new Date(e.createdAt).toLocaleString('es', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                                {e.receivedBy ? ` · Recibió: ${e.receivedBy}` : ''}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </Shell>
    );
};

const Shell: React.FC<{ business?: string; children: React.ReactNode }> = ({ business, children }) => (
    <div className="min-h-screen bg-neutral-100 py-8 px-4">
        <div className="max-w-xl mx-auto bg-white rounded-xl shadow-sm border border-neutral-200 p-6">
            {business && <p className="text-xs uppercase tracking-wide text-neutral-500 mb-3">{business}</p>}
            {children}
        </div>
    </div>
);

export default PublicDeliveryPage;
