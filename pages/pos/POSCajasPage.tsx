import React, { useEffect, useState } from 'react';
import { DataTable, TableColumn } from '../../components/DataTable';
import { CajaFormModal } from '../../components/forms/CajaFormModal';
import { OpenCajaModal } from '../../components/forms/OpenCajaModal';
import { PayoutModal } from '../../components/forms/PayoutModal';
import { EndShiftModal } from '../../components/ui/EndShiftModal';
import { Modal } from '../../components/Modal';
import { PlusIcon, EditIcon, EyeIcon } from '../../components/icons';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { cajasService, type CajaWithSession, type CajaSession } from '../../services/cajas';
import { useData } from '../../contexts/DataContext';
import { PermissionGate } from '../../components/PermissionGate';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { toast } from '../../hooks/useToast';
import { ApiError } from '../../services/api';

export const POSCajasPage: React.FC = () => {
    const { getBranchById } = useData();
    const [cajas, setCajas] = useState<CajaWithSession[]>([]);
    const [loading, setLoading] = useState(true);

    const [editingCaja, setEditingCaja] = useState<CajaWithSession | null>(null);
    const [showFormModal, setShowFormModal] = useState(false);

    const [openingCaja, setOpeningCaja] = useState<CajaWithSession | null>(null);
    const [closingCaja, setClosingCaja] = useState<CajaWithSession | null>(null);
    const [payoutCaja, setPayoutCaja] = useState<{ caja: CajaWithSession; available: number } | null>(null);
    const [historyCaja, setHistoryCaja] = useState<CajaWithSession | null>(null);

    const refresh = async () => {
        setLoading(true);
        try {
            const data = await cajasService.getAll();
            setCajas(data);
        } catch (err) {
            if (err instanceof ApiError) toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { refresh(); }, []);

    const openModalForCreate = () => {
        setEditingCaja(null);
        setShowFormModal(true);
    };

    const openModalForEdit = (caja: CajaWithSession) => {
        setEditingCaja(caja);
        setShowFormModal(true);
    };

    const handleOpenSession = (caja: CajaWithSession) => {
        if (caja.currentSession) {
            toast.warning('Esta caja ya tiene un turno abierto.');
            return;
        }
        if (!caja.isActive) {
            toast.error('La caja está inactiva.');
            return;
        }
        setOpeningCaja(caja);
    };

    const handleCloseSession = (caja: CajaWithSession) => {
        if (!caja.currentSession) {
            toast.warning('Esta caja no tiene un turno abierto.');
            return;
        }
        setClosingCaja(caja);
    };

    const handlePayout = async (caja: CajaWithSession) => {
        if (!caja.currentSession) {
            toast.warning('Abra un turno primero.');
            return;
        }
        // Cargamos el current session para conocer el efectivo disponible exacto
        try {
            const { totals } = await cajasService.getCurrentSession(caja.id);
            setPayoutCaja({ caja, available: totals?.expectedCash ?? 0 });
        } catch (err) {
            if (err instanceof ApiError) toast.error(err.message);
        }
    };

    const columns: TableColumn<CajaWithSession>[] = [
        { header: 'Nombre', accessor: 'name' },
        {
            header: 'Sucursal',
            accessor: (c) => c.branch?.name || getBranchById(c.branchId)?.name || 'N/A',
        },
        {
            header: 'IVU',
            accessor: (c) => (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    c.applyIVA ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100' : 'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-200'
                }`}>
                    {c.applyIVA ? 'Sí' : 'No'}
                </span>
            ),
        },
        {
            header: 'Turno actual',
            accessor: (c) => c.currentSession ? (
                <div className="text-xs">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100 font-medium mb-1">
                        ● Abierta
                    </span>
                    <div className="text-neutral-500">
                        Por {c.currentSession.openedByUser?.name || ''} {c.currentSession.openedByUser?.lastName || ''}
                    </div>
                    <div className="text-neutral-500">
                        Desde {new Date(c.currentSession.openedAt).toLocaleString()}
                    </div>
                </div>
            ) : (
                <span className="inline-block px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300 text-xs font-medium">
                    Cerrada
                </span>
            ),
        },
        {
            header: 'Estado',
            accessor: (c) => (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    c.isActive ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100' : 'bg-red-100 text-red-700 dark:bg-red-600 dark:text-red-100'
                }`}>
                    {c.isActive ? 'Activa' : 'Inactiva'}
                </span>
            ),
        },
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">Gestión de cajas (terminales POS)</h1>
                <PermissionGate require="branches.manage">
                    <button onClick={openModalForCreate} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center`}>
                        <PlusIcon /> Crear caja
                    </button>
                </PermissionGate>
            </div>

            {loading && <LoadingSkeleton variant="table" rows={5} />}

            {!loading && cajas.length === 0 && (
                <EmptyState
                    title="Sin cajas configuradas"
                    description="Crea tu primera caja (terminal POS) para empezar a registrar ventas."
                    cta={
                        <PermissionGate require="branches.manage">
                            <button onClick={openModalForCreate} className={BUTTON_PRIMARY_SM_CLASSES}>
                                + Crear primera caja
                            </button>
                        </PermissionGate>
                    }
                />
            )}

            {!loading && cajas.length > 0 && (
                <DataTable<CajaWithSession>
                    data={cajas}
                    columns={columns}
                    actions={(caja) => (
                        <div className="flex flex-wrap items-center gap-1">
                            {!caja.currentSession && caja.isActive && (
                                <PermissionGate require="caja.open">
                                    <button
                                        onClick={() => handleOpenSession(caja)}
                                        className="text-xs px-2 py-1 rounded bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/60"
                                        title="Abrir turno"
                                    >
                                        Abrir
                                    </button>
                                </PermissionGate>
                            )}
                            {caja.currentSession && (
                                <>
                                    <PermissionGate require="caja.payout">
                                        <button
                                            onClick={() => handlePayout(caja)}
                                            className="text-xs px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60"
                                            title="Retiro de efectivo"
                                        >
                                            Payout
                                        </button>
                                    </PermissionGate>
                                    <PermissionGate require="caja.close">
                                        <button
                                            onClick={() => handleCloseSession(caja)}
                                            className="text-xs px-2 py-1 rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60"
                                            title="Cerrar turno"
                                        >
                                            Cerrar
                                        </button>
                                    </PermissionGate>
                                </>
                            )}
                            <PermissionGate require={['caja.viewDiscrepancies', 'reports.viewSales', 'branches.manage']}>
                                <button
                                    onClick={() => setHistoryCaja(caja)}
                                    className="text-neutral-500 hover:text-neutral-700 p-1"
                                    title="Historial"
                                >
                                    <EyeIcon className="w-4 h-4" />
                                </button>
                            </PermissionGate>
                            <PermissionGate require="branches.manage">
                                <button
                                    onClick={() => openModalForEdit(caja)}
                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 p-1"
                                    aria-label={`Editar ${caja.name}`}
                                >
                                    <EditIcon />
                                </button>
                            </PermissionGate>
                        </div>
                    )}
                />
            )}

            <CajaFormModal
                isOpen={showFormModal}
                onClose={() => { setShowFormModal(false); refresh(); }}
                cajaToEdit={editingCaja as any}
            />

            {openingCaja && (
                <OpenCajaModal
                    isOpen={!!openingCaja}
                    onClose={() => setOpeningCaja(null)}
                    caja={openingCaja}
                    onOpened={() => refresh()}
                />
            )}

            {closingCaja && (
                <EndShiftModal
                    isOpen={!!closingCaja}
                    onClose={() => setClosingCaja(null)}
                    cajaId={closingCaja.id}
                    cajaName={closingCaja.name}
                    onClosed={() => refresh()}
                />
            )}

            {payoutCaja && (
                <PayoutModal
                    isOpen={!!payoutCaja}
                    onClose={() => { setPayoutCaja(null); refresh(); }}
                    cajaId={payoutCaja.caja.id}
                    currentCashInDrawer={payoutCaja.available}
                    onRecorded={() => refresh()}
                />
            )}

            {historyCaja && (
                <SessionHistoryModal
                    isOpen={!!historyCaja}
                    onClose={() => setHistoryCaja(null)}
                    cajaId={historyCaja.id}
                    cajaName={historyCaja.name}
                />
            )}
        </div>
    );
};

// ─── Historial inline ──────────────────────────

interface SessionHistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    cajaId: string;
    cajaName: string;
}

const SessionHistoryModal: React.FC<SessionHistoryModalProps> = ({ isOpen, onClose, cajaId, cajaName }) => {
    const [sessions, setSessions] = useState<CajaSession[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        setLoading(true);
        cajasService.getSessions(cajaId, { limit: 50 })
            .then(res => { if (!cancelled) setSessions(res.items); })
            .catch(err => { if (!cancelled && err instanceof ApiError) toast.error(err.message); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [isOpen, cajaId]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Historial de turnos — ${cajaName}`} size="3xl">
            {loading && <LoadingSkeleton variant="table" rows={6} />}
            {!loading && sessions.length === 0 && (
                <EmptyState title="Sin turnos registrados" description="Esta caja aún no ha tenido turnos abiertos." />
            )}
            {!loading && sessions.length > 0 && (
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-neutral-100 dark:bg-neutral-700/50">
                            <tr>
                                <th className="text-left p-2">Abierto</th>
                                <th className="text-left p-2">Cerrado</th>
                                <th className="text-left p-2">Por</th>
                                <th className="text-right p-2">Fondo</th>
                                <th className="text-right p-2">Esperado</th>
                                <th className="text-right p-2">Contado</th>
                                <th className="text-right p-2">Diferencia</th>
                                <th className="text-center p-2">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-700">
                            {sessions.map(s => (
                                <tr key={s.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30">
                                    <td className="p-2">{new Date(s.openedAt).toLocaleString()}</td>
                                    <td className="p-2">{s.closedAt ? new Date(s.closedAt).toLocaleString() : '—'}</td>
                                    <td className="p-2">
                                        {s.openedByUser?.name} {s.openedByUser?.lastName}
                                        {s.closedByUser && s.closedByUser.id !== s.openedByUser?.id && (
                                            <div className="text-xs text-neutral-500">
                                                Cerró: {s.closedByUser.name}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-2 text-right">${(s.openingFloat ?? 0).toFixed(2)}</td>
                                    <td className="p-2 text-right">{s.expectedCash != null ? `$${s.expectedCash.toFixed(2)}` : '—'}</td>
                                    <td className="p-2 text-right">{s.countedCash != null ? `$${s.countedCash.toFixed(2)}` : '—'}</td>
                                    <td className={`p-2 text-right font-semibold ${
                                        s.difference == null ? '' :
                                        s.difference === 0 ? 'text-green-600' :
                                        Math.abs(s.difference) < 5 ? 'text-amber-600' : 'text-red-600'
                                    }`}>
                                        {s.difference != null ? `${s.difference >= 0 ? '+' : '-'}$${Math.abs(s.difference).toFixed(2)}` : '—'}
                                    </td>
                                    <td className="p-2 text-center">
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                                            s.status === 'OPEN' ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-100' : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200'
                                        }`}>
                                            {s.status === 'OPEN' ? 'Abierto' : 'Cerrado'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <div className="flex justify-end pt-3">
                <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cerrar</button>
            </div>
        </Modal>
    );
};
