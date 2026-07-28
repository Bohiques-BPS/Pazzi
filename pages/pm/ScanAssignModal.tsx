import React, { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { Modal } from '../../components/Modal';
import { CameraIcon } from '../../components/icons';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { API_URL } from '../../services/api';
import { toast } from 'react-hot-toast';

// Lazy: ZXing solo se descarga al abrir la cámara (no infla el bundle inicial).
const CameraScanModal = lazy(() =>
    import('../../components/ui/CameraScanModal').then(m => ({ default: m.CameraScanModal }))
);

/** Producto (forma cruda del backend) resuelto tras escanear/buscar un código. */
interface FoundProduct {
    id: string;
    name: string;
    imageUrl?: string;
    categoryId?: string | null;
    departmentId?: string | null;
    category?: { id: string; name: string } | null;
    department?: { id: string; name: string } | null;
    skus?: Array<{ sku: string } | string>;
    barcode13Digits?: string;
    barcode2?: string;
    supplierProductCode?: string;
    chainCode?: string;
}

interface ScanAssignModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Determina si se asigna una categoría o un departamento. */
    mode: 'category' | 'department';
    /** La categoría/departamento destino que se asignará al producto escaneado. */
    target: { id: string; name: string } | null;
    /** Se llama tras una asignación exitosa para refrescar contadores en la lista. */
    onAssigned?: () => void;
}

const codeMatches = (p: FoundProduct, code: string): boolean => {
    const skus = (p.skus || []).map(s => (typeof s === 'string' ? s : s.sku));
    return (
        p.barcode13Digits === code ||
        p.barcode2 === code ||
        p.supplierProductCode === code ||
        p.chainCode === code ||
        skus.includes(code)
    );
};

export const ScanAssignModal: React.FC<ScanAssignModalProps> = ({ isOpen, onClose, mode, target, onAssigned }) => {
    const [code, setCode] = useState('');
    const [searching, setSearching] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [found, setFound] = useState<FoundProduct | null>(null);
    const [showCamera, setShowCamera] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const isCategory = mode === 'category';
    const entityLabel = isCategory ? 'categoría' : 'departamento';

    // Enfoca el campo al abrir y tras cada búsqueda/asignación para escaneo continuo.
    useEffect(() => {
        if (isOpen) {
            setCode('');
            setFound(null);
            setShowCamera(false);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    if (!target) return null;

    const currentAssignment = found
        ? (isCategory ? found.category : found.department)
        : null;
    const currentId = found ? (isCategory ? found.categoryId : found.departmentId) : null;
    const alreadyAssigned = currentId === target.id;

    const resetForNextScan = () => {
        setFound(null);
        setCode('');
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    const handleLookup = async (rawTerm?: string) => {
        const term = (rawTerm ?? code).trim();
        if (!term) return;
        setSearching(true);
        setFound(null);
        try {
            const res = await fetch(`${API_URL}/products?search=${encodeURIComponent(term)}&limit=50`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('pazzi_token')}` },
            });
            const data = await res.json();
            const list: FoundProduct[] = Array.isArray(data) ? data : [];
            if (list.length === 0) {
                toast.error(`No se encontró ningún producto con el código "${term}".`);
                setCode('');
                inputRef.current?.focus();
                return;
            }
            // Preferir coincidencia exacta por código; si no, usar el único resultado.
            const exact = list.find(p => codeMatches(p, term));
            if (exact) {
                setFound(exact);
            } else if (list.length === 1) {
                setFound(list[0]);
            } else {
                toast.error(`El código "${term}" coincide con varios productos. Sé más específico.`);
                setCode('');
                inputRef.current?.focus();
            }
        } catch (err) {
            console.error('Error al buscar producto:', err);
            toast.error('Error de conexión al buscar el producto.');
        } finally {
            setSearching(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleLookup();
        }
    };

    // Código detectado por la cámara: cerrar el escáner, reflejarlo en el input y buscar.
    const handleCameraDetected = (scanned: string) => {
        setShowCamera(false);
        setCode(scanned);
        handleLookup(scanned);
    };

    const handleConfirmAssign = async () => {
        if (!found) return;
        setAssigning(true);
        try {
            const body = isCategory ? { categoryId: target.id } : { departmentId: target.id };
            const res = await fetch(`${API_URL}/products/${found.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('pazzi_token')}`,
                },
                body: JSON.stringify(body),
            });
            if (res.ok) {
                toast.success(`"${found.name}" asignado a ${entityLabel} "${target.name}".`);
                onAssigned?.();
                resetForNextScan();
            } else {
                const errData = await res.json().catch(() => ({}));
                toast.error(errData.error || 'No se pudo asignar el producto.');
            }
        } catch (err) {
            console.error('Error al asignar:', err);
            toast.error('Error de conexión al asignar el producto.');
        } finally {
            setAssigning(false);
        }
    };

    const imgSrc = found?.imageUrl
        ? (found.imageUrl.startsWith('http')
            ? found.imageUrl
            : `${API_URL.replace('/api', '')}${found.imageUrl.startsWith('/') ? '' : '/'}${found.imageUrl}`)
        : null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Escanear y asignar ${entityLabel}`}
            size="md"
        >
            <div className="space-y-5">
                <div className="rounded-md bg-primary/10 px-4 py-2.5 text-sm">
                    Se asignará la {entityLabel}:{' '}
                    <span className="font-semibold text-primary">{target.name}</span>
                </div>

                <div>
                    <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1">
                        Escanea o escribe el código del producto
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Código de barras o SKU…"
                            className={`${INPUT_SM_CLASSES} flex-grow`}
                            autoComplete="off"
                        />
                        <button
                            onClick={() => handleLookup()}
                            disabled={searching || !code.trim()}
                            className={`${BUTTON_PRIMARY_SM_CLASSES} flex-shrink-0 disabled:opacity-50`}
                        >
                            {searching ? 'Buscando…' : 'Buscar'}
                        </button>
                    </div>
                    <div className="mt-2">
                        <button
                            onClick={() => setShowCamera(true)}
                            className={`${BUTTON_SECONDARY_SM_CLASSES} w-full flex items-center justify-center gap-2`}
                        >
                            <CameraIcon className="w-5 h-5" /> Escanear con la cámara del teléfono
                        </button>
                    </div>
                    <p className="mt-1 text-xs text-neutral-400">
                        Puedes usar un lector de código de barras, la cámara del teléfono, o teclear el código y presionar Enter.
                    </p>
                </div>

                {found && (
                    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center flex-shrink-0">
                                {imgSrc ? (
                                    <img src={imgSrc} alt={found.name} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-neutral-400 text-[9px] font-bold">N/A</span>
                                )}
                            </div>
                            <div className="min-w-0">
                                <p className="font-semibold text-neutral-800 dark:text-neutral-100 truncate">{found.name}</p>
                                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                    {isCategory ? 'Categoría' : 'Departamento'} actual:{' '}
                                    <span className="font-medium">{currentAssignment?.name || 'Sin asignar'}</span>
                                </p>
                            </div>
                        </div>

                        {alreadyAssigned ? (
                            <div className="rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 px-3 py-2 text-sm">
                                Este producto ya pertenece a la {entityLabel}{' '}
                                <span className="font-semibold">"{target.name}"</span>. No hay cambios que aplicar.
                            </div>
                        ) : currentAssignment ? (
                            <div className="rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300 px-3 py-2 text-sm">
                                Se cambiará la {entityLabel} de{' '}
                                <span className="font-semibold">"{currentAssignment.name}"</span> a{' '}
                                <span className="font-semibold">"{target.name}"</span>.
                            </div>
                        ) : (
                            <div className="rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 px-3 py-2 text-sm">
                                Se asignará la {entityLabel}{' '}
                                <span className="font-semibold">"{target.name}"</span> a este producto.
                            </div>
                        )}

                        <div className="flex justify-end gap-2">
                            <button onClick={resetForNextScan} className={BUTTON_SECONDARY_SM_CLASSES}>
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmAssign}
                                disabled={assigning || alreadyAssigned}
                                className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}
                            >
                                {assigning ? 'Asignando…' : 'Aceptar y asignar'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showCamera && (
                <Suspense fallback={null}>
                    <CameraScanModal
                        isOpen={showCamera}
                        onClose={() => setShowCamera(false)}
                        onDetected={handleCameraDetected}
                        title={`Escanear ${entityLabel}`}
                    />
                </Suspense>
            )}
        </Modal>
    );
};
