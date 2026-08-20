import React, { useEffect, useState } from 'react';
import { Modal } from '../../components/Modal';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { permissionsService } from '../../services/permissions';
import { rolesService, type Role } from '../../services/roles';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import type { PermissionCategory } from '../../types';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

interface RoleFormModalProps {
    isOpen: boolean;
    /** Devuelve el rol creado/actualizado para poder seleccionarlo en el form padre. */
    onClose: (savedRole?: Role) => void;
    roleToEdit: Role | null;
}

export const RoleFormModal: React.FC<RoleFormModalProps> = ({ isOpen, onClose, roleToEdit }) => {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [permissions, setPermissions] = useState<Record<string, boolean>>({});
    const [catalog, setCatalog] = useState<PermissionCategory[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        permissionsService.getCatalog().then(res => setCatalog(res.categories)).catch(() => {});
        setName(roleToEdit?.name || '');
        setPermissions(roleToEdit?.permissions || {});
    }, [isOpen, roleToEdit]);

    const togglePerm = (key: string, checked: boolean) =>
        setPermissions(prev => ({ ...prev, [key]: checked }));

    const toggleCategory = (cat: PermissionCategory, target: boolean) =>
        setPermissions(prev => {
            const next = { ...prev };
            for (const p of cat.permissions) next[p.key] = target;
            return next;
        });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) { toast.error(t('pm2x.role.name_required')); return; }
        setSaving(true);
        try {
            const saved = roleToEdit
                ? await rolesService.update(roleToEdit.id, { name: name.trim(), permissions })
                : await rolesService.create({ name: name.trim(), permissions });
            toast.success(roleToEdit ? t('pm2x.role.updated') : t('pm2x.role.created'));
            onClose(saved);
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : t('pm2x.role.save_error'));
        } finally {
            setSaving(false);
        }
    };

    const activeCount = Object.values(permissions).filter(Boolean).length;

    return (
        <Modal isOpen={isOpen} onClose={() => onClose()} title={roleToEdit ? t('pm2x.role.edit_title', { name: roleToEdit.name }) : t('pm2x.role.new_title')} size="3xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">{t('pm2x.role.name_label')}</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputFormStyle} placeholder={t('pm2x.role.name_placeholder')} autoFocus required />
                </div>

                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{t('pm2x.role.permissions_label')}</p>
                    <span className="text-xs text-neutral-500">{t('pm2x.role.active_count', { n: activeCount })}</span>
                </div>

                <div className="max-h-[55vh] overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3 pr-1">
                    {catalog.map(category => {
                        const allOn = category.permissions.every(p => permissions[p.key] === true);
                        return (
                            <fieldset key={category.key} className="border border-neutral-200 dark:border-neutral-600 rounded-md p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <legend className="text-sm font-semibold">{category.label}</legend>
                                    <button type="button" onClick={() => toggleCategory(category, !allOn)} className="text-xs text-primary hover:underline">
                                        {allOn ? t('pm2x.role.remove_all') : t('pm2x.role.all')}
                                    </button>
                                </div>
                                <div className="space-y-1.5">
                                    {category.permissions.map(p => (
                                        <label key={p.key} className="flex items-start gap-2 text-sm cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={permissions[p.key] === true}
                                                onChange={e => togglePerm(p.key, e.target.checked)}
                                                className="mt-0.5 h-4 w-4"
                                            />
                                            <span>{p.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                        );
                    })}
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t dark:border-neutral-700">
                    <button type="button" onClick={() => onClose()} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
                    <button type="submit" disabled={saving} className={BUTTON_PRIMARY_SM_CLASSES}>{saving ? t('common.saving') : t('pm2x.role.save')}</button>
                </div>
            </form>
        </Modal>
    );
};
