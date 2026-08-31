import React from 'react';

interface DesignLike {
    template?: string;
    headerColor?: string;
    accentColor?: string;
    title?: string;
    footerText?: string;
    labels?: Record<string, string>;
    showLogo?: boolean;
    showBusiness?: boolean;
    showClient?: boolean;
    showPaymentMethod?: boolean;
    showNotes?: boolean;
}

interface Props {
    design: DesignLike;
    business: { name?: string; logoUrl?: string; rnc?: string; address?: string; phone?: string };
    clientName?: string;
    notes?: string;
    items: { name: string; quantity: number; unitPrice: number }[];
    subtotal: number;
    tax: number;
    total: number;
}

/** Vista aproximada de cómo quedará la factura con el diseño actual (no es el PDF final). */
export const InvoiceDesignPreview: React.FC<Props> = ({ design, business, clientName, notes, items, subtotal, tax, total }) => {
    const d = design || {};
    const template = d.template || 'modern';
    const header = d.headerColor || '#4CAF50';
    const accent = d.accentColor || '#7E57C2';
    const title = d.title || 'FACTURA';
    const footer = d.footerText || '¡Gracias por su preferencia!';
    const L = (k: string, dflt: string) => (d.labels && d.labels[k]) || dflt;
    const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;
    const rows = items.filter(it => it.name.trim());

    const isBanner = template === 'banner';
    const isClassic = template === 'classic';

    const Logo = () => (d.showLogo !== false && business.logoUrl)
        ? <img src={business.logoUrl} alt="logo" className="h-12 w-12 object-contain rounded bg-white/20" />
        : null;

    return (
        <div className="bg-white text-neutral-800 rounded-lg shadow-md border border-neutral-200 overflow-hidden text-[11px] leading-tight" style={{ width: '100%', maxWidth: 460 }}>
            {/* Encabezado según plantilla */}
            {isBanner ? (
                <div style={{ background: header }} className="text-white p-4 flex items-center justify-between">
                    <div className="min-w-0">
                        <div className="text-lg font-extrabold tracking-wide truncate">{title}</div>
                        {d.showBusiness !== false && <div className="text-xs opacity-90 truncate">{business.name || 'Tu Negocio'}</div>}
                    </div>
                    <Logo />
                </div>
            ) : isClassic ? (
                <div className="p-4 border-b-2 flex items-start justify-between" style={{ borderColor: header }}>
                    <div className="min-w-0">
                        <div className="text-lg font-bold" style={{ color: '#111' }}>{title}</div>
                        {d.showBusiness !== false && <div className="text-[11px] text-neutral-500 truncate">{business.name || 'Tu Negocio'}{business.rnc ? ` · RNC ${business.rnc}` : ''}</div>}
                        {d.showBusiness !== false && business.address && <div className="text-[10px] text-neutral-400 truncate">{business.address}</div>}
                    </div>
                    <Logo />
                </div>
            ) : (
                // modern
                <div className="p-4 flex items-start justify-between" style={{ background: header }}>
                    <div className="text-white min-w-0">
                        <div className="text-lg font-extrabold truncate">{title}</div>
                        {d.showBusiness !== false && <div className="text-xs opacity-90 truncate">{business.name || 'Tu Negocio'}</div>}
                        {d.showBusiness !== false && business.phone && <div className="text-[10px] opacity-80 truncate">{business.phone}</div>}
                    </div>
                    <Logo />
                </div>
            )}

            <div className="p-4 space-y-3">
                {/* Cliente */}
                {d.showClient !== false && (
                    <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: accent }}>{L('clientHeading', 'Datos del Cliente')}</div>
                        <div className="text-[11px] text-neutral-600">{clientName || 'Sin cliente'}</div>
                    </div>
                )}

                {/* Tabla de artículos */}
                <div>
                    <div className="grid grid-cols-12 gap-1 py-1 text-white text-[10px] font-semibold rounded" style={{ background: isClassic ? '#e5e7eb' : header, color: isClassic ? '#374151' : '#fff' }}>
                        <div className="col-span-6 px-2">{L('colProduct', 'Producto')}</div>
                        <div className="col-span-2 text-center">{L('colQty', 'Cant')}</div>
                        <div className="col-span-2 text-right">{L('colPrice', 'Precio')}</div>
                        <div className="col-span-2 text-right px-2">{L('colTotal', 'Total')}</div>
                    </div>
                    {rows.length === 0 ? (
                        <div className="text-center text-neutral-300 py-3 text-[11px]">Agrega artículos para verlos aquí…</div>
                    ) : rows.map((it, i) => (
                        <div key={i} className="grid grid-cols-12 gap-1 py-1 border-b border-neutral-100">
                            <div className="col-span-6 px-2 truncate">{it.name}</div>
                            <div className="col-span-2 text-center">{it.quantity}</div>
                            <div className="col-span-2 text-right">{money(it.unitPrice)}</div>
                            <div className="col-span-2 text-right px-2">{money(it.quantity * it.unitPrice)}</div>
                        </div>
                    ))}
                </div>

                {/* Totales */}
                <div className="ml-auto w-1/2 space-y-0.5 text-[11px]">
                    <div className="flex justify-between"><span className="text-neutral-500">{L('subtotal', 'Subtotal')}</span><span>{money(subtotal)}</span></div>
                    <div className="flex justify-between"><span className="text-neutral-500">{L('tax', 'IVU')}</span><span>{money(tax)}</span></div>
                    <div className="flex justify-between font-bold text-[13px] pt-1 mt-1 border-t" style={{ color: accent, borderColor: accent }}>
                        <span>{L('total', 'Total')}</span><span>{money(total)}</span>
                    </div>
                </div>

                {/* Notas */}
                {d.showNotes !== false && notes && <div className="text-[10px] text-neutral-500 italic border-t border-neutral-100 pt-2">{notes}</div>}

                {/* Pie */}
                <div className="text-center text-[10px] pt-2" style={{ color: accent }}>{footer}</div>
            </div>
        </div>
    );
};
