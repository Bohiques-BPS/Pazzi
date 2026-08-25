import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../Modal';
import { timeclockService } from '../../services/timeclock';
import { ApiError } from '../../services/api';
import { useData } from '../../contexts/DataContext';
import { BUTTON_PRIMARY_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { UserCircleIcon } from '../icons';
import type { Employee } from '../../types';

interface PunchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type PunchDone = { type: 'IN' | 'OUT'; employeeName: string; punchedAt: string };

/** Ponche (F9): selecciona el empleado en una cuadrícula y SIEMPRE confirma con su PIN. */
export const PunchModal: React.FC<PunchModalProps> = ({ isOpen, onClose }) => {
    const { employees } = useData();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<PunchDone | null>(null);
    const [selected, setSelected] = useState<Employee | null>(null);
    const [pin, setPin] = useState('');
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (isOpen) { setSubmitting(false); setError(null); setResult(null); setSelected(null); setPin(''); setSearch(''); }
    }, [isOpen]);

    const list = useMemo(() => {
        const q = search.trim().toLowerCase();
        const arr = (employees || []).filter(e => !!e);
        if (!q) return arr;
        return arr.filter(e => `${e.name} ${e.lastName || ''} ${e.employeeNumber ?? ''}`.toLowerCase().includes(q));
    }, [employees, search]);

    const finishWith = (r: PunchDone) => { setResult(r); setTimeout(() => onClose(), 2200); };

    const doPunch = async () => {
        if (!selected) return;
        setError(null);
        if (pin.trim().length < 3) return setError('Ingresa el PIN.');
        // Identificador: número de empleado si existe, si no el nombre completo.
        const identifier = selected.employeeNumber != null ? String(selected.employeeNumber) : `${selected.name} ${selected.lastName || ''}`.trim();
        setSubmitting(true);
        try {
            const r = await timeclockService.punch(identifier, pin.trim());
            finishWith({ type: r.type, employeeName: r.employeeName, punchedAt: r.punchedAt });
        } catch (err) {
            setError(err instanceof ApiError ? err.message : 'No se pudo registrar el ponche.');
        } finally { setSubmitting(false); }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Ponche de Empleado (F9)" size={selected ? 'md' : '3xl'}>
            {result ? (
                <div className="text-center py-6 space-y-2">
                    <div className={`text-5xl ${result.type === 'IN' ? 'text-green-500' : 'text-amber-500'}`}>{result.type === 'IN' ? '🟢' : '🔴'}</div>
                    <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">{result.type === 'IN' ? 'Entrada registrada' : 'Salida registrada'}</p>
                    <p className="text-lg text-neutral-600 dark:text-neutral-300">{result.employeeName}</p>
                    <p className="text-sm text-neutral-500">{new Date(result.punchedAt).toLocaleString()}</p>
                </div>
            ) : selected ? (
                // Paso 2: PIN del empleado seleccionado.
                <form onSubmit={(e) => { e.preventDefault(); doPunch(); }} className="space-y-4 py-2">
                    <div className="text-center">
                        <UserCircleIcon className="w-16 h-16 mx-auto text-neutral-300 dark:text-neutral-500" />
                        <p className="text-xl font-bold text-neutral-800 dark:text-neutral-100">{selected.name} {selected.lastName}</p>
                        <p className="text-xs uppercase tracking-wider text-neutral-400">Ingresa tu PIN para ponchar</p>
                    </div>
                    <input
                        type="password" inputMode="numeric" value={pin} autoFocus
                        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        placeholder="••••"
                        className="w-full text-3xl tracking-[0.5em] text-center px-3 py-3 border border-neutral-300 dark:border-neutral-600 rounded-md dark:bg-neutral-700"
                    />
                    {error && <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>}
                    <div className="flex justify-between gap-2">
                        <button type="button" onClick={() => { setSelected(null); setPin(''); setError(null); }} className={BUTTON_SECONDARY_SM_CLASSES}>← Volver</button>
                        <button type="submit" disabled={submitting} className={`${BUTTON_PRIMARY_CLASSES} disabled:opacity-50`}>
                            {submitting ? 'Registrando…' : '🕒 Ponchar (Entrada / Salida)'}
                        </button>
                    </div>
                </form>
            ) : (
                // Paso 1: cuadrícula de empleados.
                <div className="space-y-4">
                    <p className="text-center text-lg font-medium text-neutral-700 dark:text-neutral-200">Seleccione un usuario para ponchar</p>
                    <input
                        type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="Buscar empleado..."
                        className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-md dark:bg-neutral-700"
                    />
                    {list.length === 0 ? (
                        <p className="text-center text-neutral-500 py-8">No hay empleados.</p>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[55vh] overflow-y-auto">
                            {list.map(emp => (
                                <button
                                    key={emp.id}
                                    type="button"
                                    onClick={() => { setSelected(emp); setPin(''); setError(null); }}
                                    className="flex flex-col items-center gap-2 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 hover:border-primary hover:bg-primary/5 transition-colors"
                                >
                                    <UserCircleIcon className="w-14 h-14 text-neutral-300 dark:text-neutral-500" />
                                    <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100 text-center leading-tight">{emp.name} {emp.lastName}</span>
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="flex justify-end">
                        <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    </div>
                </div>
            )}
        </Modal>
    );
};
