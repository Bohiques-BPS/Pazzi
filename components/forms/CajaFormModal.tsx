import React, { useState, useEffect } from 'react';
import { Caja, CajaFormData } from '../../types';
import { useData } from '../../contexts/DataContext';
import { Modal } from '../Modal';
import { inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES } from '../../constants';
import { cajasService } from '../../services/cajas';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { ExclamationTriangleIcon } from '../icons';
import { SelectWithCreate } from '../ui/SelectWithCreate';
import { BranchFormModal } from './BranchFormModal';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { CAJA_DESIGNS } from '../../utils/cajaDesigns';
import { getDeviceId, suggestDeviceName } from '../../utils/device';

interface CajaFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    cajaToEdit: Caja | null;
}

export const CajaFormModal: React.FC<CajaFormModalProps> = ({ isOpen, onClose, cajaToEdit }) => {
    const { t } = useTranslation();
    const { setCajas, cajas: allCajas, branches } = useData();
    const activeBranches = branches.filter(b => b.isActive);

    const initialFormData: CajaFormData = {
        name: '',
        branchId: activeBranches[0]?.id || '',
        design: 'teal',
        isActive: true,
        applyIVU: true,
        isExternal: false,
    };
    const [formData, setFormData] = useState<CajaFormData>(initialFormData);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Modal anidado para crear una sucursal sin salir del formulario de caja.
    const [showCreateBranch, setShowCreateBranch] = useState(false);
    // Amarre de terminal (PC).
    const [assignedId, setAssignedId] = useState<string | null>(null);
    const [assignedName, setAssignedName] = useState<string | null>(null);
    const [deviceName, setDeviceName] = useState('');
    const [devicePin, setDevicePin] = useState('');
    const [deviceBusy, setDeviceBusy] = useState(false);
    const thisDeviceId = getDeviceId();
    const isThisDevice = !!assignedId && assignedId === thisDeviceId;

    useEffect(() => {
        if (!isOpen) return;
        if (cajaToEdit) {
            setFormData({
                name: cajaToEdit.name,
                branchId: cajaToEdit.branchId,
                design: cajaToEdit.design || 'teal',
                isActive: cajaToEdit.isActive,
                applyIVU: (cajaToEdit as any).applyIVA ?? cajaToEdit.applyIVU ?? true,
                isExternal: cajaToEdit.isExternal || false,
            });
        } else {
            setFormData({ ...initialFormData, branchId: activeBranches[0]?.id || '' });
        }
        const aId = (cajaToEdit as any)?.assignedDeviceId ?? null;
        const aName = (cajaToEdit as any)?.assignedDeviceName ?? null;
        setAssignedId(aId);
        setAssignedName(aName);
        setDeviceName(aId && aId === getDeviceId() ? (aName || suggestDeviceName()) : suggestDeviceName());
        setDevicePin('');
        setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cajaToEdit, isOpen]);

    // Si las sucursales cargan DESPUÉS de abrir el modal (carga async), autoselecciona la primera
    // para una caja nueva cuando aún no hay ninguna elegida. Evita el estado "muestra una sucursal
    // pero al guardar dice que no hay ninguna seleccionada" (el select mostraba la 1ª pero branchId='').
    useEffect(() => {
        if (!isOpen || cajaToEdit) return;
        if (!formData.branchId && activeBranches.length > 0) {
            setFormData(prev => ({ ...prev, branchId: activeBranches[0].id }));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, cajaToEdit, activeBranches.length, formData.branchId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleAssignDevice = async () => {
        if (!cajaToEdit) return;
        if (!devicePin.trim()) { toast.error('Ingresa el PIN del gerente.'); return; }
        setDeviceBusy(true);
        try {
            const r = await cajasService.assignDevice(cajaToEdit.id, deviceName.trim() || suggestDeviceName(), devicePin.trim());
            setAssignedId(r.assignedDeviceId); setAssignedName(r.assignedDeviceName); setDevicePin('');
            setCajas(prev => prev.map(c => c.id === cajaToEdit.id ? ({ ...c, assignedDeviceId: r.assignedDeviceId, assignedDeviceName: r.assignedDeviceName } as any) : c));
            toast.success('Terminal asignada a esta caja.');
        } catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudo asignar la terminal.'); }
        finally { setDeviceBusy(false); }
    };

    const handleUnassignDevice = async () => {
        if (!cajaToEdit) return;
        if (!devicePin.trim()) { toast.error('Ingresa el PIN del gerente.'); return; }
        setDeviceBusy(true);
        try {
            await cajasService.unassignDevice(cajaToEdit.id, devicePin.trim());
            setAssignedId(null); setAssignedName(null); setDevicePin('');
            setCajas(prev => prev.map(c => c.id === cajaToEdit.id ? ({ ...c, assignedDeviceId: null, assignedDeviceName: null } as any) : c));
            toast.success('Se quitó el amarre de terminal.');
        } catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudo quitar el amarre.'); }
        finally { setDeviceBusy(false); }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (formData.name.trim() === '') {
            setError(t('cmpx.cajaform.err_name'));
            return;
        }
        if (!formData.branchId) {
            setError(t('cmpx.cajaform.err_branch'));
            return;
        }
        const isDuplicateName = allCajas.some(
            c => c.name.toLowerCase() === formData.name.toLowerCase()
                 && c.branchId === formData.branchId
                 && (!cajaToEdit || c.id !== cajaToEdit.id)
        );
        if (isDuplicateName) {
            setError(t('cmpx.cajaform.err_duplicate'));
            return;
        }

        // El BE espera `applyIVA`; el FE lo trabaja como `applyIVU` (misma idea, etiqueta PR).
        const payload = {
            name: formData.name.trim(),
            branchId: formData.branchId,
            design: formData.design || 'teal',
            isActive: formData.isActive,
            applyIVA: formData.applyIVU,
            isExternal: formData.isExternal,
        };

        setSubmitting(true);
        try {
            const saved = cajaToEdit
                ? await cajasService.update(cajaToEdit.id, payload)
                : await cajasService.create(payload);

            // Normalizar applyIVA → applyIVU para el state local
            const normalized: Caja = { ...(saved as any), applyIVU: (saved as any).applyIVA ?? true };

            setCajas(prev => cajaToEdit
                ? prev.map(c => c.id === cajaToEdit.id ? normalized : c)
                : [...prev, normalized]);

            toast.success(cajaToEdit ? t('cmpx.cajaform.updated') : t('cmpx.cajaform.created'));
            onClose();
        } catch (err) {
            if (err instanceof ApiError) setError(err.message);
            else setError(t('cmpx.common.conn_error'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
        <Modal isOpen={isOpen} onClose={onClose} title={cajaToEdit ? t('cmpx.cajaform.title_edit') : t('cmpx.cajaform.title_new')} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 rounded-md bg-red-50 border border-red-200 flex items-center text-red-700 text-sm">
                        <ExclamationTriangleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <div>
                    <label htmlFor="cajaName" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('cmpx.cajaform.name_label')}</label>
                    <input type="text" name="name" id="cajaName" value={formData.name} onChange={handleChange} className={inputFormStyle} required autoFocus />
                </div>
                <SelectWithCreate
                    id="branchId"
                    name="branchId"
                    label={t('cmpx.cajaform.branch_label')}
                    value={formData.branchId}
                    onChange={(v) => { setFormData(prev => ({ ...prev, branchId: v })); if (v) setError(null); }}
                    options={activeBranches.map(b => ({ value: b.id, label: b.name }))}
                    onCreateClick={() => setShowCreateBranch(true)}
                    required
                    placeholder={t('cmpx.cajaform.branch_ph')}
                    emptyHint={t('cmpx.cajaform.branch_empty_hint')}
                    createTitle={t('cmpx.cajaform.create_branch_title')}
                />

                {/* Diseño (tema de color) de la caja */}
                <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">{t('cmpx.cajaform.design_label')}</label>
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                        {CAJA_DESIGNS.map(d => {
                            const selected = (formData.design || 'teal') === d.id;
                            return (
                                <button
                                    key={d.id}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, design: d.id }))}
                                    title={t(d.nameKey)}
                                    aria-label={t(d.nameKey)}
                                    className={`h-9 w-full rounded-md border-2 transition ${selected ? 'border-neutral-800 dark:border-white ring-2 ring-offset-1 dark:ring-offset-neutral-800' : 'border-transparent hover:border-neutral-300'}`}
                                    style={{ backgroundColor: d.color, ...(selected ? { ['--tw-ring-color' as any]: d.color } : {}) }}
                                >
                                    {selected && <span className="text-white text-sm font-bold">✓</span>}
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{t('cmpx.cajaform.design_hint')}</p>
                </div>

                <div className="flex flex-wrap items-center gap-6 pt-2">
                    <label htmlFor="isActive" className="flex items-center text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        <input type="checkbox" name="isActive" id="isActive" checked={formData.isActive} onChange={handleChange} className="h-4 w-4 text-primary focus:ring-primary border-neutral-300 dark:border-neutral-600 rounded mr-2" />
                        {t('cmpx.cajaform.active')}
                    </label>
                    <label htmlFor="applyIVU" className="flex items-center text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        <input type="checkbox" name="applyIVU" id="applyIVU" checked={formData.applyIVU} onChange={handleChange} className="h-4 w-4 text-primary focus:ring-primary border-neutral-300 dark:border-neutral-600 rounded mr-2" />
                        {t('cmpx.cajaform.apply_ivu')}
                    </label>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {t('cmpx.cajaform.apply_ivu_hint')}
                </p>

                <div className="pt-2 border-t dark:border-neutral-700">
                    <label htmlFor="isExternal" className="flex items-start text-sm font-medium text-neutral-700 dark:text-neutral-300 p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-100 dark:border-amber-800 cursor-pointer">
                        <input type="checkbox" name="isExternal" id="isExternal" checked={formData.isExternal} onChange={handleChange} className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-neutral-300 dark:border-neutral-600 rounded mr-2 mt-0.5" />
                        <div>
                            <span className="block font-bold text-amber-700 dark:text-amber-400">{t('cmpx.cajaform.external')}</span>
                            <span className="block text-xs text-neutral-500 dark:text-neutral-400 font-normal mt-1">
                                {t('cmpx.cajaform.external_hint_pre')} <strong>{t('cmpx.cajaform.external_no')}</strong> {t('cmpx.cajaform.external_hint_post')}
                            </span>
                        </div>
                    </label>
                </div>

                {/* Terminal (PC): la caja abre SOLO en la computadora asignada. */}
                <div className="pt-2 border-t dark:border-neutral-700">
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">🖥️ Terminal (computadora)</p>
                    {!cajaToEdit ? (
                        <p className="text-xs text-neutral-500 mt-1">Guarda la caja primero; luego podrás asignarla a una terminal específica.</p>
                    ) : (
                        <div className="mt-2 space-y-2">
                            <p className="text-xs">
                                {assignedId
                                    ? (isThisDevice
                                        ? <span className="text-green-600 dark:text-green-400 font-semibold">✅ Asignada a ESTA terminal{assignedName ? ` (${assignedName})` : ''}</span>
                                        : <span className="text-amber-600 dark:text-amber-400 font-semibold">🔒 Asignada a otra terminal{assignedName ? `: ${assignedName}` : ''}</span>)
                                    : <span className="text-neutral-500">Sin terminal asignada (abre en cualquier PC).</span>}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <input type="text" value={deviceName} onChange={e => setDeviceName(e.target.value)} placeholder="Nombre de la terminal (ej. PC Mostrador)" className={inputFormStyle + ' !text-sm'} />
                                <input type="password" value={devicePin} onChange={e => setDevicePin(e.target.value)} placeholder="PIN del gerente" className={inputFormStyle + ' !text-sm tracking-widest'} />
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={handleAssignDevice} disabled={deviceBusy} className={BUTTON_SECONDARY_SM_CLASSES}>
                                    {isThisDevice ? 'Reasignar a esta terminal' : (assignedId ? 'Mover a ESTA terminal' : 'Asignar a esta terminal')}
                                </button>
                                {assignedId && (
                                    <button type="button" onClick={handleUnassignDevice} disabled={deviceBusy} className={`${BUTTON_SECONDARY_SM_CLASSES} !text-red-600`}>Quitar amarre</button>
                                )}
                            </div>
                            <p className="text-[11px] text-neutral-400">La caja solo abrirá turno en la terminal asignada. Reasignar/quitar requiere PIN del gerente.</p>
                        </div>
                    )}
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES} disabled={submitting || (activeBranches.length === 0 && !cajaToEdit?.branchId)}>
                        {submitting ? t('common.saving') : t('cmpx.cajaform.submit')}
                    </button>
                </div>
            </form>
        </Modal>
        {showCreateBranch && (
            <BranchFormModal
                isOpen={showCreateBranch}
                branchToEdit={null}
                onClose={(createdBranch) => {
                    if (createdBranch) {
                        setFormData(prev => ({ ...prev, branchId: createdBranch.id }));
                        toast.success(t('cmpx.cajaform.branch_created', { name: createdBranch.name }));
                    }
                    setShowCreateBranch(false);
                }}
            />
        )}
        </>
    );
};
