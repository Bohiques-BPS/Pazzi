import React, { useEffect, useState } from 'react';
import { rolesService, type Role } from '../../services/roles';
import { RoleFormModal } from './RoleFormModal';
import { ConfirmationModal } from '../../components/Modal';
import { PlusIcon, EditIcon, DeleteIcon } from '../../components/icons';
import { BUTTON_PRIMARY_SM_CLASSES } from '../../constants';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { toast } from '../../hooks/useToast';
import { ApiError } from '../../services/api';

export const RolesListPage: React.FC = () => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<Role | null>(null);
    const [toDelete, setToDelete] = useState<Role | null>(null);

    const refresh = async () => {
        setLoading(true);
        try {
            setRoles(await rolesService.getAll());
        } catch (err) {
            if (err instanceof ApiError) toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => { refresh(); }, []);

    const handleDelete = async () => {
        if (!toDelete) return;
        try {
            await rolesService.delete(toDelete.id);
            toast.success('Rol eliminado');
            setToDelete(null);
            refresh();
        } catch (err) {
            toast.error(err instanceof ApiError ? err.message : 'No se pudo eliminar el rol');
            setToDelete(null);
        }
    };

    const countPerms = (r: Role) => Object.values(r.permissions || {}).filter(Boolean).length;

    return (
        <div>
            <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">Roles y permisos</h1>
                <button onClick={() => { setEditing(null); setShowForm(true); }} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center`}>
                    <PlusIcon /> Crear rol
                </button>
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
                Crea roles con permisos y asígnalos a tus empleados. Al editar un rol, <strong>todos los empleados con ese rol se actualizan al instante</strong>.
            </p>

            {loading && <LoadingSkeleton variant="table" rows={4} />}

            {!loading && roles.length === 0 && (
                <EmptyState
                    title="Sin roles"
                    description="Crea tu primer rol (ej: Caja) con sus permisos para asignarlo a los empleados."
                    cta={<button onClick={() => { setEditing(null); setShowForm(true); }} className={BUTTON_PRIMARY_SM_CLASSES}>+ Crear primer rol</button>}
                />
            )}

            {!loading && roles.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {roles.map(role => (
                        <div key={role.id} className="bg-white dark:bg-neutral-800 p-4 rounded-lg shadow-sm border border-neutral-100 dark:border-neutral-700">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-semibold text-neutral-800 dark:text-neutral-100">{role.name}</h3>
                                    <p className="text-xs text-neutral-500 mt-0.5">
                                        {countPerms(role)} permiso(s) · {role._count?.users ?? 0} empleado(s)
                                    </p>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => { setEditing(role); setShowForm(true); }} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 p-1" aria-label={`Editar ${role.name}`}><EditIcon /></button>
                                    <button onClick={() => setToDelete(role)} className="text-red-600 dark:text-red-400 hover:text-red-800 p-1" aria-label={`Eliminar ${role.name}`}><DeleteIcon /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showForm && (
                <RoleFormModal
                    isOpen={showForm}
                    roleToEdit={editing}
                    onClose={() => { setShowForm(false); refresh(); }}
                />
            )}

            <ConfirmationModal
                isOpen={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={handleDelete}
                title="Eliminar rol"
                message={`¿Eliminar el rol "${toDelete?.name}"? Los empleados con este rol quedarán sin permisos hasta asignarles otro.`}
                confirmButtonText="Eliminar"
            />
        </div>
    );
};
