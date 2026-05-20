import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { cajasService, type CajaSession, type CajaWithSession } from '../../services/cajas';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { ExclamationTriangleIcon } from '../icons';

interface OpenCajaModalProps {
    isOpen: boolean;
    onClose: () => void;
    caja: CajaWithSession | { id: string; name: string } | null;
    /** Callback con la sesión recién abierta. El padre puede refrescar listas. */
    onOpened?: (session: CajaSession) => void;
}

export const OpenCajaModal: React.FC<OpenCajaModalProps> = ({ isOpen, onClose, caja, onOpened }) => {
    const [openingFloat, setOpeningFloat] = useState<string>('0');
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setOpeningFloat('0');
            setNotes('');
            setError(null);
        }
    }, [isOpen]);

    if (!caja) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const amount = parseFloat(openingFloat);
        if (isNaN(amount) || amount < 0) {
            setError('El fondo inicial debe ser un número mayor o igual a 0');
            return;
        }
        setSubmitting(true);
        try {
            const session = await cajasService.openSession(caja.id, {
                openingFloat: amount,
                openingNotes: notes.trim() || undefined,
            });
            toast.success(`Caja '${caja.name}' abierta con $${amount.toFixed(2)} iniciales.`);
            onOpened?.(session);
            onClose();
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
                if (err.status !== 409) toast.error(err.message);
            } else {
                setError('Error de conexión con el servidor');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Abrir turno — ${caja.name}`} size="md">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 rounded-md bg-red-50 border border-red-200 flex items-center text-red-700 text-sm">
                        <ExclamationTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium">Fondo inicial en efectivo</label>
                    <div className="relative mt-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={openingFloat}
                            onChange={(e) => setOpeningFloat(e.target.value)}
                            className={`${inputFormStyle} pl-7`}
                            autoFocus
                            required
                        />
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                        Monto en efectivo con el que se inicia el turno. Será el punto de referencia para el conteo al cierre.
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium">Notas (opcional)</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className={inputFormStyle}
                        placeholder="Observaciones del turno..."
                    />
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES} disabled={submitting}>
                        {submitting ? 'Abriendo...' : 'Abrir turno'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
