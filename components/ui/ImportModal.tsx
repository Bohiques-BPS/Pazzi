import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Modal } from '../Modal';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, inputFormStyle } from '../../constants';
import { toast } from '../../hooks/useToast';
import { ExclamationTriangleIcon } from '../icons';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

export interface ImportFieldDef {
    /** Clave destino del campo (la que espera el backend tras el mapeo del padre). */
    key: string;
    label: string;
    required?: boolean;
    type?: 'string' | 'number' | 'boolean' | 'date';
    /** Nombres de columna candidatos para el auto-mapeo heurístico. */
    aliases?: string[];
    /** Transformación inteligente: recibe el valor crudo de la columna mapeada y la fila completa
     *  (por si necesita combinar columnas). Si se define, reemplaza la coerción por tipo. */
    transform?: (rawValue: any, row: Record<string, any>) => any;
}

export interface ImportResult {
    created: number;
    updated?: number;
    failedCount: number;
    failed: { row: number; error: string }[];
}

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    /** Definición de los campos destino y sus alias para el auto-mapeo. */
    fields: ImportFieldDef[];
    /** Recibe las filas ya mapeadas (por key) y las envía al backend. */
    onImport: (rows: Record<string, any>[]) => Promise<ImportResult>;
    /** Se llama al terminar con éxito (para refrescar la lista del padre). */
    onDone?: () => void;
}

type Step = 'upload' | 'map' | 'result';

/** Normaliza un encabezado: minúsculas, sin acentos, solo alfanumérico. */
const normalize = (s: string): string =>
    (s || '')
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]/g, '');

/** Intenta adivinar la columna origen para un campo, por label/key/aliases. */
function guessColumn(field: ImportFieldDef, headers: string[]): string {
    const candidates = [field.key, field.label, ...(field.aliases || [])].map(normalize);
    const normHeaders = headers.map(h => ({ raw: h, norm: normalize(h) }));
    // 1) match exacto
    for (const c of candidates) {
        const hit = normHeaders.find(h => h.norm === c);
        if (hit) return hit.raw;
    }
    // 2) contiene / contenido
    for (const c of candidates) {
        const hit = normHeaders.find(h => h.norm.includes(c) || c.includes(h.norm));
        if (hit && c.length >= 3) return hit.raw;
    }
    return '';
}

function coerce(value: any, type?: string): any {
    if (value === undefined || value === null || value === '') return undefined;
    if (type === 'number') {
        const n = parseFloat(String(value).replace(/[^0-9.\-]/g, ''));
        return isNaN(n) ? undefined : n;
    }
    if (type === 'boolean') {
        const v = String(value).trim().toLowerCase();
        return ['1', 'true', 'si', 'sí', 'yes', 'x', 'verdadero'].includes(v);
    }
    if (type === 'date') {
        // Excel guarda fechas como número serial (días desde 1899-12-30). Lo convertimos a fecha real.
        let d: Date | null = null;
        const raw = String(value).trim();
        if (/^\d+(\.\d+)?$/.test(raw)) {
            const serial = parseFloat(raw);
            if (serial > 0) d = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
        } else {
            const parsed = new Date(raw);
            if (!isNaN(parsed.getTime())) d = parsed;
        }
        if (!d || isNaN(d.getTime())) return undefined;
        return d.toISOString().slice(0, 10); // YYYY-MM-DD
    }
    return String(value).trim();
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, title, fields, onImport, onDone }) => {
    const { t } = useTranslation();
    const [step, setStep] = useState<Step>('upload');
    const [fileName, setFileName] = useState('');
    const [headers, setHeaders] = useState<string[]>([]);
    const [rows, setRows] = useState<Record<string, any>[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [importing, setImporting] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const reset = () => {
        setStep('upload'); setFileName(''); setHeaders([]); setRows([]);
        setMapping({}); setImporting(false); setParsing(false); setResult(null); setError(null); setProgress(null);
    };

    const handleClose = () => { reset(); onClose(); };

    const handleFile = async (file: File) => {
        setError(null);
        setParsing(true);
        try {
            // Cede el hilo para que el spinner pinte antes de parsear archivos grandes.
            await new Promise(r => setTimeout(r, 30));
            const buf = await file.arrayBuffer();
            const wb = XLSX.read(buf, { type: 'array' });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
            if (json.length === 0) { setError(t('cmpx.import.no_rows')); return; }
            const hdrs = Object.keys(json[0]);
            setHeaders(hdrs);
            setRows(json);
            setFileName(file.name);
            // Auto-mapeo heurístico
            const auto: Record<string, string> = {};
            for (const f of fields) auto[f.key] = guessColumn(f, hdrs);
            setMapping(auto);
            setStep('map');
        } catch (err: any) {
            setError(t('cmpx.import.read_error'));
        } finally {
            setParsing(false);
        }
    };

    const mappedRows = useMemo(() => {
        return rows.map(r => {
            const out: Record<string, any> = {};
            for (const f of fields) {
                const src = mapping[f.key];
                const raw = src ? r[src] : undefined;
                // Un campo con transform puede derivar su valor aunque no tenga columna mapeada
                // (leyendo otras columnas de la fila). Si no, solo si hay columna origen.
                let val: any;
                if (f.transform) val = f.transform(raw, r);
                else if (src) val = coerce(raw, f.type);
                else continue;
                if (val !== undefined && val !== '') out[f.key] = val;
            }
            return out;
        });
    }, [rows, mapping, fields]);

    const missingRequired = fields.filter(f => f.required && !mapping[f.key]);

    const handleImport = async () => {
        if (missingRequired.length > 0) {
            setError(t('cmpx.import.missing_required', { fields: missingRequired.map(f => f.label).join(', ') }));
            return;
        }
        setImporting(true); setError(null);
        setProgress({ done: 0, total: mappedRows.length });
        try {
            // Importar por lotes: evita "payload too large" y timeouts con miles de filas.
            const CHUNK = 400;
            const agg: ImportResult = { created: 0, updated: 0, failedCount: 0, failed: [] };
            for (let i = 0; i < mappedRows.length; i += CHUNK) {
                const chunk = mappedRows.slice(i, i + CHUNK);
                const res = await onImport(chunk);
                agg.created += res.created || 0;
                agg.updated = (agg.updated || 0) + (res.updated || 0);
                agg.failedCount += res.failedCount || 0;
                if (res.failed?.length && agg.failed.length < 300) {
                    agg.failed.push(...res.failed.map(f => ({ row: f.row + i, error: f.error })));
                }
                setProgress({ done: Math.min(i + CHUNK, mappedRows.length), total: mappedRows.length });
            }
            setResult(agg);
            setStep('result');
            if (agg.created > 0 || (agg.updated ?? 0) > 0) {
                const parts = [];
                if (agg.created > 0) parts.push(t('cmpx.import.created_n', { count: agg.created }));
                if ((agg.updated ?? 0) > 0) parts.push(t('cmpx.import.updated_n', { count: agg.updated }));
                toast.success(parts.join(', ') + '.');
                onDone?.();
            }
        } catch (err: any) {
            setError(err?.message || t('cmpx.import.import_error'));
        } finally {
            setImporting(false);
            setProgress(null);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={title} size="6xl">
            {(parsing || importing) && (
                <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="animate-spin rounded-full h-14 w-14 border-4 border-white/30 border-t-white mb-4"></div>
                    <p className="text-white font-semibold text-lg">
                        {parsing ? t('cmpx.import.reading') : t('cmpx.import.importing')}
                    </p>
                    {importing && progress && (
                        <>
                            <p className="text-white/80 text-sm mt-1">{t('cmpx.import.processing', { done: progress.done.toLocaleString(), total: progress.total.toLocaleString() })}</p>
                            <div className="w-64 h-2 bg-white/20 rounded-full mt-3 overflow-hidden">
                                <div className="h-full bg-white transition-all" style={{ width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%` }} />
                            </div>
                        </>
                    )}
                </div>
            )}
            {error && (
                <div className="mb-3 p-3 rounded-md bg-red-50 border border-red-200 flex items-start text-red-700 text-sm">
                    <ExclamationTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0" /> {error}
                </div>
            )}

            {step === 'upload' && (
                <div className="text-center py-8">
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-4">
                        {t('cmpx.import.upload_help')}
                    </p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                    />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className={BUTTON_PRIMARY_SM_CLASSES}>
                        {t('cmpx.import.select_file')}
                    </button>
                </div>
            )}

            {step === 'map' && (
                <div className="space-y-4">
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">
                        {t('cmpx.import.file_word')} <strong>{fileName}</strong> — {t('cmpx.import.rows_n', { count: rows.length })}.{' '}
                        <strong>{fields.filter(f => mapping[f.key]).length}</strong> {t('cmpx.import.fields_mapped', { total: fields.length })}{' '}
                        {t('cmpx.import.confirm_mapping')}
                    </p>
                    <div className="max-h-[62vh] overflow-y-auto border rounded-md dark:border-neutral-700">
                        <table className="min-w-full text-sm">
                            <thead className="bg-neutral-100 dark:bg-neutral-700/50 sticky top-0">
                                <tr>
                                    <th className="text-left p-2">{t('cmpx.import.col_target')}</th>
                                    <th className="text-left p-2">{t('cmpx.import.col_file')}</th>
                                    <th className="text-left p-2">{t('cmpx.import.col_example')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                                {fields.map(f => {
                                    const src = mapping[f.key];
                                    const example = src ? (rows[0]?.[src] ?? '') : '';
                                    return (
                                        <tr key={f.key}>
                                            <td className="p-2 font-medium">
                                                {f.label}{f.required && <span className="text-red-500"> *</span>}
                                            </td>
                                            <td className="p-2">
                                                <select
                                                    value={src || ''}
                                                    onChange={(e) => setMapping(m => ({ ...m, [f.key]: e.target.value }))}
                                                    className={`${inputFormStyle} mt-0 py-1 text-sm ${f.required && !src ? 'border-red-400' : ''}`}
                                                >
                                                    <option value="">{t('cmpx.import.ignore')}</option>
                                                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                                </select>
                                            </td>
                                            <td className="p-2 text-neutral-500 truncate max-w-[160px]">{String(example)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-between pt-2">
                        <button type="button" onClick={() => setStep('upload')} className={BUTTON_SECONDARY_SM_CLASSES}>{t('cmpx.import.back')}</button>
                        <button type="button" onClick={handleImport} disabled={importing} className={BUTTON_PRIMARY_SM_CLASSES}>
                            {importing ? t('cmpx.import.importing_short') : t('cmpx.import.import_n', { count: rows.length })}
                        </button>
                    </div>
                </div>
            )}

            {step === 'result' && result && (
                <div className="space-y-4">
                    <div className="p-4 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 text-green-700 dark:text-green-300">
                        <p className="font-semibold">
                            {t('cmpx.import.created_n', { count: result.created })}
                            {(result.updated ?? 0) > 0 && ` · ${t('cmpx.import.updated_n', { count: result.updated ?? 0 })}`}.
                        </p>
                        {result.failedCount > 0 && (
                            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">{t('cmpx.import.failed_n', { count: result.failedCount })}</p>
                        )}
                    </div>
                    {result.failed.length > 0 && (
                        <div className="max-h-56 overflow-y-auto border rounded-md dark:border-neutral-700">
                            <table className="min-w-full text-sm">
                                <thead className="bg-neutral-100 dark:bg-neutral-700/50 sticky top-0">
                                    <tr><th className="text-left p-2 w-16">{t('cmpx.import.col_row')}</th><th className="text-left p-2">{t('common.error')}</th></tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                                    {result.failed.map(f => (
                                        <tr key={f.row}><td className="p-2">{f.row}</td><td className="p-2 text-red-600 dark:text-red-400">{f.error}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <div className="flex justify-end pt-2">
                        <button type="button" onClick={handleClose} className={BUTTON_PRIMARY_SM_CLASSES}>{t('cmpx.import.done')}</button>
                    </div>
                </div>
            )}
        </Modal>
    );
};
