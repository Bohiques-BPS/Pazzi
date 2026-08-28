import React, { useMemo, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { Link } from 'react-router-dom';

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;

const STATUS_CLS: Record<string, string> = {
    Pendiente: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    Enviado: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    Completado: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    Cancelado: 'bg-neutral-200 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-300',
};

const Kpi: React.FC<{ label: string; value: string; accent?: string }> = ({ label, value, accent }) => (
    <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 border border-neutral-100 dark:border-neutral-700 shadow-sm">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
        <p className={`text-2xl font-bold tabular-nums mt-1 ${accent || 'text-neutral-800 dark:text-neutral-100'}`}>{value}</p>
    </div>
);

/** Reportes del e-commerce: análisis de las ventas online (órdenes de la tienda). */
export const ECommerceReportsPage: React.FC = () => {
    const { t } = useTranslation();
    const { orders } = useData();
    const [days, setDays] = useState<number>(30);

    const filtered = useMemo(() => {
        const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
        return orders.filter(o => new Date(o.date).getTime() >= cutoff);
    }, [orders, days]);

    const stats = useMemo(() => {
        const active = filtered.filter(o => o.status !== 'Cancelado');
        const revenue = active.reduce((s, o) => s + (Number(o.totalAmount) || 0), 0);
        const count = active.length;
        const avg = count ? revenue / count : 0;
        const byStatus: Record<string, number> = {};
        for (const o of filtered) byStatus[o.status] = (byStatus[o.status] || 0) + 1;

        // Top productos por cantidad (de los items de las órdenes activas).
        const prod = new Map<string, { name: string; qty: number; total: number }>();
        for (const o of active) {
            for (const it of (o.items || []) as any[]) {
                const key = it.name || it.id || 'Producto';
                const cur = prod.get(key) || { name: key, qty: 0, total: 0 };
                cur.qty += Number(it.quantity) || 0;
                cur.total += (Number(it.unitPrice) || 0) * (Number(it.quantity) || 0);
                prod.set(key, cur);
            }
        }
        const topProducts = [...prod.values()].sort((a, b) => b.qty - a.qty).slice(0, 6);

        // Ingresos por día (para las barras).
        const byDay = new Map<string, number>();
        for (const o of active) {
            const d = new Date(o.date).toLocaleDateString('es-PR', { month: 'short', day: 'numeric' });
            byDay.set(d, (byDay.get(d) || 0) + (Number(o.totalAmount) || 0));
        }
        const series = [...byDay.entries()].slice(-14);
        const maxDay = Math.max(1, ...series.map(([, v]) => v));

        return { revenue, count, avg, byStatus, topProducts, series, maxDay };
    }, [filtered]);

    const recent = useMemo(() => [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8), [filtered]);

    return (
        <div className="max-w-6xl mx-auto pb-10 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">Reportes del e-commerce</h1>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Análisis de las ventas de tu tienda online.</p>
                </div>
                <div className="flex items-center gap-2">
                    <select value={days} onChange={e => setDays(Number(e.target.value))} className="px-3 py-1.5 rounded-md border border-neutral-300 dark:border-neutral-600 text-sm dark:bg-neutral-800">
                        <option value={7}>Últimos 7 días</option>
                        <option value={30}>Últimos 30 días</option>
                        <option value={90}>Últimos 90 días</option>
                        <option value={365}>Último año</option>
                    </select>
                    <Link to="/ecommerce/orders" className="px-3 py-1.5 rounded-md text-sm border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700">Ver pedidos</Link>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Kpi label="Ingresos" value={money(stats.revenue)} accent="text-green-600 dark:text-green-400" />
                <Kpi label="Pedidos" value={String(stats.count)} />
                <Kpi label="Ticket promedio" value={money(stats.avg)} />
                <Kpi label="Pendientes" value={String(stats.byStatus['Pendiente'] || 0)} accent="text-amber-600 dark:text-amber-400" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Ingresos por día */}
                <div className="lg:col-span-2 bg-white dark:bg-neutral-800 rounded-lg p-5 border border-neutral-100 dark:border-neutral-700 shadow-sm">
                    <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100 mb-4">Ingresos por día</h3>
                    {stats.series.length === 0 ? (
                        <p className="text-sm text-neutral-400 py-10 text-center">Sin ventas en el período.</p>
                    ) : (
                        <div className="flex items-end gap-2 h-44">
                            {stats.series.map(([day, val]) => (
                                <div key={day} className="flex-1 flex flex-col items-center justify-end h-full">
                                    <span className="text-[10px] text-neutral-500 mb-1 tabular-nums">{money(val)}</span>
                                    <div className="w-full rounded-t bg-primary/80" style={{ height: `${(val / stats.maxDay) * 100}%`, minHeight: '4px' }} />
                                    <span className="text-[10px] text-neutral-400 mt-1 whitespace-nowrap">{day}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Estado de pedidos */}
                <div className="bg-white dark:bg-neutral-800 rounded-lg p-5 border border-neutral-100 dark:border-neutral-700 shadow-sm">
                    <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100 mb-4">Pedidos por estado</h3>
                    <div className="space-y-2">
                        {['Pendiente', 'Enviado', 'Completado', 'Cancelado'].map(st => (
                            <div key={st} className="flex items-center justify-between text-sm">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CLS[st]}`}>{st}</span>
                                <span className="font-semibold tabular-nums">{stats.byStatus[st] || 0}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top productos */}
                <div className="bg-white dark:bg-neutral-800 rounded-lg p-5 border border-neutral-100 dark:border-neutral-700 shadow-sm">
                    <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100 mb-3">Productos más vendidos</h3>
                    {stats.topProducts.length === 0 ? <p className="text-sm text-neutral-400">Sin datos.</p> : (
                        <ul className="divide-y divide-neutral-100 dark:divide-neutral-700">
                            {stats.topProducts.map((p, i) => (
                                <li key={i} className="flex items-center justify-between py-2 text-sm">
                                    <span className="truncate text-neutral-700 dark:text-neutral-200"><span className="text-neutral-400 mr-2">{i + 1}.</span>{p.name}</span>
                                    <span className="flex-shrink-0 text-neutral-500"><span className="font-semibold text-neutral-800 dark:text-neutral-100">{p.qty}</span> uds · {money(p.total)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Pedidos recientes */}
                <div className="bg-white dark:bg-neutral-800 rounded-lg p-5 border border-neutral-100 dark:border-neutral-700 shadow-sm">
                    <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100 mb-3">Pedidos recientes</h3>
                    {recent.length === 0 ? <p className="text-sm text-neutral-400">Sin pedidos.</p> : (
                        <ul className="divide-y divide-neutral-100 dark:divide-neutral-700">
                            {recent.map(o => (
                                <li key={o.id} className="flex items-center justify-between py-2 text-sm gap-2">
                                    <div className="min-w-0">
                                        <p className="truncate text-neutral-700 dark:text-neutral-200">{o.clientName || '—'}</p>
                                        <p className="text-xs text-neutral-400">{new Date(o.date).toLocaleDateString('es-PR')}</p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_CLS[o.status] || ''}`}>{o.status}</span>
                                        <span className="font-semibold tabular-nums">{money(o.totalAmount)}</span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};
