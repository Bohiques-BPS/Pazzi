import React, { useEffect, useState } from 'react';
import { Modal } from '../../components/Modal';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { permissionsService } from '../../services/permissions';
import { rolesService, type Role } from '../../services/roles';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import type { PermissionCategory } from '../../types';

interface RoleFormModalProps {
    isOpen: boolean;
    /** Devuelve el rol creado/actualizado para poder seleccionarlo en el form padre. */
    onClose: (savedRole?: Role) => void;
    roleToEdit: Role | null;
}

export const RoleFormModal: React.FC<RoleFormModalProps> = ({ isOpen, onClose, roleToEdit }) => {
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
        if (!name.trim()) { toast.error('El nombre del rol es requerido.'); return; }
        setSaving(true);
        try {
            const saved = roleToEdit
                ? await rolesService.update(roleToEdit.id, { name: name.trim(), permissions })
                : await rolesService.create({ name: name.trim(), permissions });
            toast.success(roleToEdit ? 'Rol actualizado. Los empleados con este rol se actualizan al instante.' : 'Rol creado.');
            onClose(saved);
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'Error al guardar el rol.');
        } finally {
            setSaving(false);
        }
    };

    const activeCount = Object.values(permissions).filter(Boolean).length;

    return (
        <Modal isOpen={isOpen} onClose={() => onClose()} title={roleToEdit ? `Editar rol: ${roleToEdit.name}` : 'Nuevo rol'} size="3xl">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Nombre del rol</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputFormStyle} placeholder="Ej: Caja, Vendedor, Supervisor…" autoFocus required />
                </div>

                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">Permisos del rol</p>
                    <span className="text-xs text-neutral-500">{activeCount} activo(s)</span>
                </div>

                <div className="max-h-[55vh] overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-3 pr-1">
                    {catalog.map(category => {
                        const allOn = category.permissions.every(p => permissions[p.key] === true);
                        return (
                            <fieldset key={category.key} className="border border-neutral-200 dark:border-neutral-600 rounded-md p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <legend className="text-sm font-semibold">{category.label}</legend>
                                    <button type="button" onClick={() => toggleCategory(category, !allOn)} className="text-xs text-primary hover:underline">
                                        {allOn ? 'Quitar todos' : 'Todos'}
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
                    <button type="button" onClick={() => onClose()} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button type="submit" disabled={saving} className={BUTTON_PRIMARY_SM_CLASSES}>{saving ? 'Guardando…' : 'Guardar rol'}</button>
                </div>
            </form>
        </Modal>
    );
};
