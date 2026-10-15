import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { cajasService, type CajaSession, type CajaWithSession } from '../../services/cajas';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { ExclamationTriangleIcon } from '../icons';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

/** Caja elegible en el selector del modal (incluye el amarre de terminal para avisar, sin bloquear). */
export interface SelectableCaja {
    id: string;
    name: string;
    assignedDeviceName?: string | null;
}

interface OpenCajaModalProps {
    isOpen: boolean;
    onClose: () => void;
    caja: CajaWithSession | { id: string; name: string } | null;
    /** Callback con la sesión recién abierta. El padre puede refrescar listas. */
    onOpened?: (session: CajaSession) => void;
    /** Lista de cajas entre las que el usuario puede elegir (misma sucursal). Si hay >1 se muestra el selector. */
    cajas?: SelectableCaja[];
    /** Cambiar la caja seleccionada (el padre actualiza y re-pasa `caja`). */
    onSelectCaja?: (id: string) => void;
}

export const OpenCajaModal: React.FC<OpenCajaModalProps> = ({ isOpen, onClose, caja, onOpened, cajas, onSelectCaja }) => {
    const { t } = useTranslation();
    const [openingFloat, setOpeningFloat] = useState<string>('');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setOpeningFloat('');
            setNotes('');
            setError(null);
        }
    }, [isOpen]);

    // Al cambiar de caja (desde el selector), limpia el error de la caja anterior.
    useEffect(() => { setError(null); }, [caja?.id]);

    if (!caja) return null;

    // Aviso (no bloqueante) si la caja elegida está amarrada a otra terminal.
    const selectedInfo = cajas?.find(c => c.id === caja.id);
    const assignedTerminal = selectedInfo?.assignedDeviceName || null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        // Campo vacío = abrir con $0 (el campo ya no trae un 0 que haya que borrar).
        const amount = openingFloat.trim() === '' ? 0 : parseFloat(openingFloat);
        if (isNaN(amount) || amount < 0) {
            setError(t('cmpx.opencaja.err_float'));
            return;
        }
        setSubmitting(true);
        try {
            const session = await cajasService.openSession(caja.id, {
                openingFloat: amount,
                openingNotes: notes.trim() || undefined,
            });
            toast.success(t('cmpx.opencaja.opened', { name: caja.name, amount: amount.toFixed(2) }));
            // Si el padre maneja el éxito (onOpened), NO llamamos onClose(): en el POS cashier
            // onClose navega a "/", lo que botaba al usuario al inicio justo después de abrir el turno.
            // El padre cierra el modal según su propio estado (sesión activa / limpiar openingCaja).
            if (onOpened) {
                onOpened(session);
            } else {
                onClose();
            }
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
                if (err.status !== 409) toast.error(err.message);
            } else {
                setError(t('cmpx.common.conn_error'));
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('cmpx.opencaja.title', { name: caja.name })} size="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 rounded-md bg-red-50 border border-red-200 flex items-center text-red-700 text-sm">
                        <ExclamationTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {/* Selector de caja: permite elegir otra caja sin salir del POS (p. ej. si ésta
                    está amarrada a otra terminal). Solo se muestra cuando hay más de una opción. */}
                {cajas && cajas.length > 1 && onSelectCaja && (
                    <div>
                        <label className="block text-sm font-medium">{t('cmpx.opencaja.choose_caja')}</label>
                        <select
                            value={caja.id}
                            onChange={(e) => onSelectCaja(e.target.value)}
                            className={`${inputFormStyle} mt-1`}
                        >
                            {cajas.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name}{c.assignedDeviceName ? ` — ${c.assignedDeviceName}` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Aviso NO bloqueante: la caja elegida está amarrada a otra terminal. El backend
                    rechazará abrirla aquí, pero el usuario puede elegir otra caja arriba. */}
                {assignedTerminal && (
                    <div className="p-3 rounded-md bg-amber-50 border border-amber-200 flex items-start text-amber-700 text-sm">
                        <ExclamationTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                        <span>{t('cmpx.opencaja.terminal_warn', { name: assignedTerminal })}</span>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium">{t('cmpx.opencaja.opening_float')}</label>
                    <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={openingFloat}
                            onChange={(e) => setOpeningFloat(e.target.value)}
                            className={`${inputFormStyle} pl-7`}
                            placeholder="0.00"
                            autoFocus
                        />
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                        {t('cmpx.opencaja.opening_float_hint')}
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium">{t('cmpx.common.notes_optional')}</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className={inputFormStyle}
                        placeholder={t('cmpx.opencaja.notes_ph')}
                    />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES} disabled={submitting}>
                        {submitting ? t('cmpx.opencaja.submitting') : t('cmpx.opencaja.submit')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
