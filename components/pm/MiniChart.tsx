import React, { useId } from 'react';

export interface ChartSeries {
    label: string;
    color: string;
    values: number[];
}

interface Props {
    labels: string[];
    series: ChartSeries[];
    /** Rellena el área bajo la primera serie (estilo "curva S"). */
    area?: boolean;
    height?: number;
    /** Formatea los valores del eje Y / tooltips (ej. dinero). */
    formatY?: (n: number) => string;
}

/** Gráfica de líneas/área en SVG, sin dependencias, adaptada al tema. */
export const MiniChart: React.FC<Props> = ({ labels, series, area = false, height = 200, formatY }) => {
    const uid = useId().replace(/[:]/g, '');
    const W = 640, H = 260;                 // viewBox interno (se escala responsivo)
    const padL = 52, padR = 16, padT = 16, padB = 34;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const fmt = formatY || ((n: number) => String(Math.round(n)));

    const allVals = series.flatMap(s => s.values);
    const rawMax = Math.max(1, ...allVals);
    // Redondea el máximo a un número "bonito".
    const niceMax = (() => {
        const pow = Math.pow(10, Math.floor(Math.log10(rawMax)));
        const n = rawMax / pow;
        const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
        return step * pow;
    })();
    const n = labels.length;
    const x = (i: number) => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    const y = (v: number) => padT + plotH - (v / niceMax) * plotH;

    const linePath = (vals: number[]) => vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
    const areaPath = (vals: number[]) => `${linePath(vals)} L ${x(n - 1).toFixed(1)} ${(padT + plotH).toFixed(1)} L ${x(0).toFixed(1)} ${(padT + plotH).toFixed(1)} Z`;

    const gridLines = [0, 0.25, 0.5, 0.75, 1];

    return (
        <div style={{ width: '100%' }}>
            <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} role="img" preserveAspectRatio="xMidYMid meet">
                <defs>
                    <linearGradient id={`g-${uid}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={series[0]?.color || '#0D9488'} stopOpacity="0.22" />
                        <stop offset="100%" stopColor={series[0]?.color || '#0D9488'} stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Rejilla + etiquetas Y */}
                {gridLines.map((g, i) => {
                    const yy = padT + plotH - g * plotH;
                    return (
                        <g key={i}>
                            <line x1={padL} y1={yy} x2={W - padR} y2={yy} stroke="currentColor" className="text-neutral-200 dark:text-neutral-700" strokeWidth="1" strokeDasharray={i === 0 ? '0' : '4 4'} />
                            <text x={padL - 8} y={yy + 4} textAnchor="end" className="fill-neutral-400 dark:fill-neutral-500" fontSize="12">{fmt(niceMax * g)}</text>
                        </g>
                    );
                })}

                {/* Área bajo la primera serie */}
                {area && series[0] && <path d={areaPath(series[0].values)} fill={`url(#g-${uid})`} />}

                {/* Líneas */}
                {series.map((s, si) => (
                    <g key={si}>
                        <path d={linePath(s.values)} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
                        {s.values.map((v, i) => (
                            <circle key={i} cx={x(i)} cy={y(v)} r="3" fill="white" stroke={s.color} strokeWidth="2">
                                <title>{`${labels[i]} · ${s.label}: ${fmt(v)}`}</title>
                            </circle>
                        ))}
                    </g>
                ))}

                {/* Etiquetas X */}
                {labels.map((lab, i) => (
                    <text key={i} x={x(i)} y={H - 10} textAnchor="middle" className="fill-neutral-400 dark:fill-neutral-500" fontSize="12">{lab}</text>
                ))}
            </svg>

            {/* Leyenda (si hay más de una serie) */}
            {series.length > 1 && (
                <div className="flex items-center justify-center gap-4 mt-1 text-xs">
                    {series.map((s, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                            <span className="w-3 h-1.5 rounded-full" style={{ background: s.color }} />{s.label}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};
