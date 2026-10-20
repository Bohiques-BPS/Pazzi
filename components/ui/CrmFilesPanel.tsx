import React, { useEffect, useRef, useState } from 'react';
import { ConfirmationModal } from '../Modal';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { uploadFile } from '../../services/upload';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';

/** Archivo o enlace adjunto a un lead/cliente (propuestas, PDF, Docs, carpeta de Drive…). */
export interface CrmFile {
    id: string;
    kind: 'file' | 'link';
    name: string;
    url: string;
    mimeType?: string | null;
    size?: number | null;
    createdByName?: string | null;
    createdAt: string;
}

export type CrmFileInput = Pick<CrmFile, 'kind' | 'name' | 'url'> & { mimeType?: string | null; size?: number | null };

interface Props {
    load: () => Promise<CrmFile[]>;
    add: (data: CrmFileInput) => Promise<CrmFile>;
    remove: (fileId: string) => Promise<unknown>;
    canEdit: boolean;
    /** Avisa al padre cuántos hay (para el contador de la pestaña). */
    onCountChange?: (n: number) => void;
}

const MAX_MB = 25;
const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.rtf,.odt,.ods,.zip,image/*';

const fmtSize = (n?: number | null) => {
    if (!n) return '';
    if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
    return `${(n / (1024 * 1024)).toFixed(1)} MB`;
};

/** Etiqueta y color del tipo de archivo (sin emojis, como el resto del diseño). */
const typeBadge = (f: CrmFile): { label: string; cls: string } => {
    if (f.kind === 'link') {
        if (/drive\.google\.com|docs\.google\.com/i.test(f.url)) return { label: 'DRIVE', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' };
        return { label: 'LINK', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' };
    }
    const ext = (f.name.match(/\.([a-z0-9]+)$/i)?.[1] || f.url.match(/\.([a-z0-9]+)(?:\?|$)/i)?.[1] || '').toLowerCase();
    const m = (f.mimeType || '').toLowerCase();
    if (ext === 'pdf' || m.includes('pdf')) return { label: 'PDF', cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' };
    if (['doc', 'docx', 'odt', 'rtf'].includes(ext) || m.includes('word')) return { label: 'DOC', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' };
    if (['xls', 'xlsx', 'csv', 'ods'].includes(ext) || m.includes('sheet') || m.includes('excel')) return { label: 'XLS', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' };
    if (['ppt', 'pptx'].includes(ext) || m.includes('presentation')) return { label: 'PPT', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300' };
    if (m.startsWith('image/')) return { label: 'IMG', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' };
    return { label: (ext || 'FILE').toUpperCase().slice(0, 4), cls: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300' };
};

/**
 * Panel "Archivos" de un lead o cliente: subir documentos (PDF, Word, Excel…), agregar enlaces
 * (p. ej. la carpeta de Drive de propuestas) y abrirlos o quitarlos.
 */
export const CrmFilesPanel: React.FC<Props> = ({ load, add, remove, canEdit, onCountChange }) => {
    const [files, setFiles] = useState<CrmFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [showLinkForm, setShowLinkForm] = useState(false);
    const [linkName, setLinkName] = useState('');
    const [linkUrl, setLinkUrl] = useState('');
    const [toDelete, setToDelete] = useState<CrmFile | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const setAndCount = (list: CrmFile[]) => { setFiles(list); onCountChange?.(list.length); };

    useEffect(() => {
        let alive = true;
        setLoading(true);
        load()
            .then(list => { if (alive) setAndCount(Array.isArray(list) ? list : []); })
            .catch(() => { /* sin conexión: lista vacía */ })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const errMsg = (e: unknown, fallback: string) => (e instanceof ApiError || e instanceof Error) ? e.message : fallback;

    const handleFiles = async (list: FileList | null) => {
        const picked = Array.from(list || []);
        if (!picked.length) return;
        setUploading(true);
        try {
            for (const f of picked) {
                if (f.size > MAX_MB * 1024 * 1024) { toast.error(`"${f.name}" pesa más de ${MAX_MB} MB.`); continue; }
                const url = await uploadFile(f);
                const saved = await add({ kind: 'file', name: f.name, url, mimeType: f.type || null, size: f.size });
                setFiles(prev => { const next = [saved, ...prev]; onCountChange?.(next.length); return next; });
            }
            toast.success(picked.length === 1 ? 'Archivo adjuntado.' : 'Archivos adjuntados.');
        } catch (e) {
            toast.error(errMsg(e, 'No se pudo adjuntar el archivo.'));
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const saveLink = async () => {
        let url = linkUrl.trim();
        if (!url) { toast.error('Pega el enlace.'); return; }
        if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
        const name = linkName.trim() || (/drive\.google\.com/i.test(url) ? 'Carpeta de Drive' : url.replace(/^https?:\/\//i, '').slice(0, 80));
        try {
            const saved = await add({ kind: 'link', name, url });
            setFiles(prev => { const next = [saved, ...prev]; onCountChange?.(next.length); return next; });
            setLinkName(''); setLinkUrl(''); setShowLinkForm(false);
            toast.success('Enlace agregado.');
        } catch (e) {
            toast.error(errMsg(e, 'No se pudo agregar el enlace.'));
        }
    };

    const confirmDelete = async () => {
        const f = toDelete;
        setToDelete(null);
        if (!f) return;
        try {
            await remove(f.id);
            setFiles(prev => { const next = prev.filter(x => x.id !== f.id); onCountChange?.(next.length); return next; });
            toast.success('Se quitó el archivo.');
        } catch (e) {
            toast.error(errMsg(e, 'No se pudo quitar el archivo.'));
        }
    };

    return (
        <div className="space-y-3">
            {canEdit && (
                <div className="flex flex-wrap items-center gap-2">
                    <input ref={fileRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={e => handleFiles(e.target.files)} />
                    <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>
                        {uploading ? 'Subiendo…' : 'Subir archivo'}
                    </button>
                    <button type="button" onClick={() => setShowLinkForm(v => !v)} className={BUTTON_SECONDARY_SM_CLASSES}>Agregar enlace</button>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">PDF, Word, Excel, PowerPoint o imágenes (máx. {MAX_MB} MB), o un enlace de Drive/Docs.</span>
                </div>
            )}

            {showLinkForm && canEdit && (
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 p-3 grid grid-cols-1 sm:grid-cols-[1fr_2fr_auto] gap-2 items-center">
                    <input value={linkName} onChange={e => setLinkName(e.target.value)} placeholder="Nombre (ej. Propuesta 2026)" className={INPUT_SM_CLASSES} maxLength={200} />
                    <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); saveLink(); } }} placeholder="https://drive.google.com/…" className={INPUT_SM_CLASSES} />
                    <button type="button" onClick={saveLink} className={BUTTON_PRIMARY_SM_CLASSES}>Guardar</button>
                </div>
            )}

            {loading ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400 py-4 text-center">Cargando…</p>
            ) : files.length === 0 ? (
                <p className="text-sm text-neutral-500 dark:text-neutral-400 py-4 text-center">Aún no hay archivos ni enlaces.</p>
            ) : (
                <ul className="divide-y divide-neutral-100 dark:divide-neutral-700 rounded-lg border border-neutral-200 dark:border-neutral-700">
                    {files.map(f => {
                        const b = typeBadge(f);
                        return (
                            <li key={f.id} className="flex items-center gap-3 px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-700/40">
                                <span className={`w-11 h-8 flex-shrink-0 rounded-md text-[10px] font-bold flex items-center justify-center ${b.cls}`}>{b.label}</span>
                                <span className="flex-1 min-w-0">
                                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="block text-sm font-medium text-neutral-800 dark:text-neutral-100 hover:text-primary truncate" title={f.name}>
                                        <span translate="no">{f.name}</span>
                                    </a>
                                    <span className="block text-xs text-neutral-500 dark:text-neutral-400 truncate">
                                        {[fmtSize(f.size), f.createdByName, new Date(f.createdAt).toLocaleDateString()].filter(Boolean).join(' · ')}
                                    </span>
                                </span>
                                <a href={f.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 text-xs font-medium text-primary hover:underline">Abrir</a>
                                {canEdit && (
                                    <button type="button" onClick={() => setToDelete(f)} className="flex-shrink-0 text-xs font-medium text-red-600 hover:underline">Quitar</button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}

            <ConfirmationModal
                isOpen={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={confirmDelete}
                title="Quitar archivo"
                message={toDelete ? `¿Quitar "${toDelete.name}" de la lista?` : ''}
                confirmButtonText="Quitar"
            />
        </div>
    );
};
