import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Modal } from '../Modal';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, inputFormStyle } from '../../constants';
import { toast } from '../../hooks/useToast';
import { ExclamationTriangleIcon } from '../icons';

export interface ImportFieldDef {
    /** Clave destino del campo (la que espera el backend tras el mapeo del padre). */
    key: string;
    label: string;
    required?: boolean;
    type?: 'string' | 'number' | 'boolean';
    /** Nombres de columna candidatos para el auto-mapeo heurístico. */
    aliases?: string[];
}

export interface ImportResult {
    created: number;
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
    return String(value).trim();
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, title, fields, onImport, onDone }) => {
    const [step, setStep] = useState<Step>('upload');
    const [fileName, setFileName] = useState('');
    const [headers, setHeaders] = useState<string[]>([]);
    const [rows, setRows] = useState<Record<string, any>[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [importing, setImporting] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const reset = () => {
        setStep('upload'); setFileName(''); setHeaders([]); setRows([]);
        setMapping({}); setImporting(false); setParsing(false); setResult(null); setError(null);
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
            if (json.length === 0) { setError('El archivo no tiene filas de datos.'); return; }
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
            setError('No se pudo leer el archivo. Asegúrate de que sea .xlsx o .csv válido.');
        } finally {
            setParsing(false);
        }
    };

    const mappedRows = useMemo(() => {
        return rows.map(r => {
            const out: Record<string, any> = {};
            for (const f of fields) {
                const src = mapping[f.key];
                if (src) out[f.key] = coerce(r[src], f.type);
            }
            return out;
        });
    }, [rows, mapping, fields]);

    const missingRequired = fields.filter(f => f.required && !mapping[f.key]);

    const handleImport = async () => {
        if (missingRequired.length > 0) {
            setError(`Falta mapear campos obligatorios: ${missingRequired.map(f => f.label).join(', ')}`);
            return;
        }
        setImporting(true); setError(null);
        try {
            const res = await onImport(mappedRows);
            setResult(res);
            setStep('result');
            if (res.created > 0) { toast.success(`${res.created} registro(s) importado(s).`); onDone?.(); }
        } catch (err: any) {
            setError(err?.message || 'Error al importar.');
        } finally {
            setImporting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={title} size="3xl">
            {(parsing || importing) && (
                <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="animate-spin rounded-full h-14 w-14 border-4 border-white/30 border-t-white mb-4"></div>
                    <p className="text-white font-semibold text-lg">
                        {parsing ? 'Leyendo archivo…' : 'Importando datos…'}
                    </p>
                    {importing && rows.length > 0 && (
                        <p className="text-white/80 text-sm mt-1">Procesando {rows.length} fila(s). No cierres esta ventana.</p>
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
                        Sube un archivo <strong>.xlsx</strong> o <strong>.csv</strong>. Detectaremos las columnas
                        automáticamente y podrás revisarlas antes de importar.
                    </p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                    />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className={BUTTON_PRIMARY_SM_CLASSES}>
                        Seleccionar archivo
                    </button>
                </div>
            )}

            {step === 'map' && (
                <div className="space-y-4">
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">
                        Archivo <strong>{fileName}</strong> — {rows.length} fila(s). Confirma o corrige el mapeo de columnas:
                    </p>
                    <div className="max-h-64 overflow-y-auto border rounded-md dark:border-neutral-700">
                        <table className="min-w-full text-sm">
                            <thead className="bg-neutral-100 dark:bg-neutral-700/50 sticky top-0">
                                <tr>
                                    <th className="text-left p-2">Campo destino</th>
                                    <th className="text-left p-2">Columna del archivo</th>
                                    <th className="text-left p-2">Ejemplo</th>
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
                                                    <option value="">— Ignorar —</option>
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
                        <button type="button" onClick={() => setStep('upload')} className={BUTTON_SECONDARY_SM_CLASSES}>Atrás</button>
                        <button type="button" onClick={handleImport} disabled={importing} className={BUTTON_PRIMARY_SM_CLASSES}>
                            {importing ? 'Importando...' : `Importar ${rows.length} fila(s)`}
                        </button>
                    </div>
                </div>
            )}

            {step === 'result' && result && (
                <div className="space-y-4">
                    <div className="p-4 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 text-green-700 dark:text-green-300">
                        <p className="font-semibold">{result.created} registro(s) importado(s) correctamente.</p>
                        {result.failedCount > 0 && (
                            <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">{result.failedCount} fila(s) con errores (ver abajo).</p>
                        )}
                    </div>
                    {result.failed.length > 0 && (
                        <div className="max-h-56 overflow-y-auto border rounded-md dark:border-neutral-700">
                            <table className="min-w-full text-sm">
                                <thead className="bg-neutral-100 dark:bg-neutral-700/50 sticky top-0">
                                    <tr><th className="text-left p-2 w-16">Fila</th><th className="text-left p-2">Error</th></tr>
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
                        <button type="button" onClick={handleClose} className={BUTTON_PRIMARY_SM_CLASSES}>Listo</button>
                    </div>
                </div>
            )}
        </Modal>
    );
};
