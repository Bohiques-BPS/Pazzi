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
        isActive: true,
        applyIVU: true,
        isExternal: false,
    };
    const [formData, setFormData] = useState<CajaFormData>(initialFormData);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Modal anidado para crear una sucursal sin salir del formulario de caja.
    const [showCreateBranch, setShowCreateBranch] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        if (cajaToEdit) {
            setFormData({
                name: cajaToEdit.name,
                branchId: cajaToEdit.branchId,
                isActive: cajaToEdit.isActive,
                applyIVU: (cajaToEdit as any).applyIVA ?? cajaToEdit.applyIVU ?? true,
                isExternal: cajaToEdit.isExternal || false,
            });
        } else {
            setFormData({ ...initialFormData, branchId: activeBranches[0]?.id || '' });
        }
        setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cajaToEdit, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
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
                    onChange={(v) => setFormData(prev => ({ ...prev, branchId: v }))}
                    options={activeBranches.map(b => ({ value: b.id, label: b.name }))}
                    onCreateClick={() => setShowCreateBranch(true)}
                    required
                    placeholder={t('cmpx.cajaform.branch_ph')}
                    emptyHint={t('cmpx.cajaform.branch_empty_hint')}
                    createTitle={t('cmpx.cajaform.create_branch_title')}
                />

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
