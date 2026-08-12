import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import { adminService, type AdminUser } from '../../services/admin';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { Modal, ConfirmationModal } from '../../components/Modal';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';

const STATUS: Record<string, { label: string; cls: string }> = {
    ACTIVE: { label: 'Activa', cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
    DISABLED: { label: 'Deshabilitada', cls: 'bg-neutral-200 text-neutral-500' },
    INVITED: { label: 'Pendiente activación', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
};

export const SuperAdminUsersPage: React.FC = () => {
    const { currentUser, logout } = useAuth();
    const [admins, setAdmins] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState<AdminUser | null>(null);
    const [form, setForm] = useState<{ name: string; lastName: string; email: string; status: string; password: string }>({ name: '', lastName: '', email: '', status: 'ACTIVE', password: '' });
    const [saving, setSaving] = useState(false);
    const [toDelete, setToDelete] = useState<AdminUser | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try { setAdmins(await adminService.listManagers()); }
        catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudieron cargar los administradores.'); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load]);

    const openEdit = (a: AdminUser) => {
        setEditing(a);
        setForm({ name: a.name, lastName: a.lastName, email: a.email, status: a.status, password: '' });
    };

    const save = async () => {
        if (!editing) return;
        setSaving(true);
        try {
            await adminService.updateManager(editing.id, {
                name: form.name.trim(), lastName: form.lastName.trim(), email: form.email.trim(),
                status: form.status, ...(form.password ? { password: form.password } : {}),
            });
            toast.success('Administrador actualizado.');
            setEditing(null); load();
        } catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudo actualizar.'); }
        finally { setSaving(false); }
    };

    const confirmDelete = async () => {
        if (!toDelete) return;
        try {
            await adminService.deleteManager(toDelete.id);
            toast.success('Administrador eliminado.');
            setToDelete(null); load();
        } catch (err) { toast.error(err instanceof ApiError ? err.message : 'No se pudo eliminar.'); }
    };

    // Guard: solo el super-administrador.
    if (currentUser && currentUser.role !== UserRole.SUPER_ADMIN) {
        return <div className="p-8 text-center text-neutral-500">No tienes acceso a esta sección.</div>;
    }

    return (
        <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900">
            <header className="bg-[#00897B] text-white px-6 py-3 flex items-center justify-between">
                <span className="font-bold">Pazzi · Super-Administrador</span>
                <div className="flex items-center gap-3 text-sm">
                    <span className="opacity-90">{currentUser?.name} {currentUser?.lastName}</span>
                    <button onClick={() => logout()} className="bg-black/20 hover:bg-black/30 px-3 py-1 rounded">Cerrar sesión</button>
                </div>
            </header>
            <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100 mb-1">Administradores</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">Ver, editar o eliminar las cuentas de administrador (MANAGER) del sistema.</p>

            {loading ? <LoadingSkeleton variant="table" rows={5} /> : admins.length === 0 ? (
                <EmptyState title="Sin administradores" description="No hay cuentas de administrador registradas." />
            ) : (
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-x-auto">
                    <table className="min-w-full text-sm">
                        <thead className="bg-neutral-50 dark:bg-neutral-900/50 text-neutral-500">
                            <tr>
                                <th className="text-left px-4 py-2">Nombre</th>
                                <th className="text-left px-4 py-2">Email</th>
                                <th className="text-left px-4 py-2">Estado</th>
                                <th className="text-right px-4 py-2">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700">
                            {admins.map(a => {
                                const st = STATUS[a.status] || STATUS.ACTIVE;
                                return (
                                    <tr key={a.id}>
                                        <td className="px-4 py-2 font-medium text-neutral-800 dark:text-neutral-100">{a.name} {a.lastName}</td>
                                        <td className="px-4 py-2 text-neutral-600 dark:text-neutral-300">{a.email}</td>
                                        <td className="px-4 py-2"><span className={`text-xs px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span></td>
                                        <td className="px-4 py-2 text-right whitespace-nowrap">
                                            <button onClick={() => openEdit(a)} className="text-blue-600 dark:text-blue-400 hover:underline text-xs mr-3">Editar</button>
                                            <button onClick={() => setToDelete(a)} className="text-red-600 dark:text-red-400 hover:underline text-xs" disabled={a.id === currentUser?.id}>Eliminar</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Editar administrador" size="md">
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1">Nombre</label>
                            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={`${INPUT_SM_CLASSES} w-full`} />
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1">Apellido</label>
                            <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className={`${INPUT_SM_CLASSES} w-full`} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-neutral-500 mb-1">Email</label>
                        <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={`${INPUT_SM_CLASSES} w-full`} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1">Estado</label>
                            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={`${INPUT_SM_CLASSES} w-full`}>
                                <option value="ACTIVE">Activa</option>
                                <option value="DISABLED">Deshabilitada</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1">Nueva contraseña (opcional)</label>
                            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Dejar vacío para no cambiar" className={`${INPUT_SM_CLASSES} w-full`} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => setEditing(null)} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                        <button onClick={save} disabled={saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{saving ? 'Guardando…' : 'Guardar'}</button>
                    </div>
                </div>
            </Modal>

            <ConfirmationModal
                isOpen={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={confirmDelete}
                title="Eliminar administrador"
                message={`¿Eliminar la cuenta de ${toDelete?.name} ${toDelete?.lastName} (${toDelete?.email})? Esta acción no borra los datos de su tienda, pero la cuenta no podrá iniciar sesión.`}
                confirmButtonText="Sí, eliminar"
            />
            </div>
        </div>
    );
};
