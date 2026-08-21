import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { UserRole } from '../../types';
import { adminService, type AdminUser } from '../../services/admin';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { Modal, ConfirmationModal } from '../../components/Modal';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, INPUT_SM_CLASSES } from '../../constants';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { DataTable, TableColumn } from '../../components/DataTable';

const STATUS: Record<string, { cls: string; labelKey: string }> = {
    ACTIVE: { cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', labelKey: 'adminx.status.active' },
    DISABLED: { cls: 'bg-neutral-200 text-neutral-500', labelKey: 'adminx.status.disabled' },
    INVITED: { cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', labelKey: 'adminx.status.invited' },
};

export const SuperAdminUsersPage: React.FC = () => {
    const { t } = useTranslation();
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
        catch (err) { toast.error(err instanceof ApiError ? err.message : t('adminx.admins.load_error')); }
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
            toast.success(t('adminx.admins.updated'));
            setEditing(null); load();
        } catch (err) { toast.error(err instanceof ApiError ? err.message : t('adminx.admins.update_error')); }
        finally { setSaving(false); }
    };

    const confirmDelete = async () => {
        if (!toDelete) return;
        try {
            await adminService.deleteManager(toDelete.id);
            toast.success(t('adminx.admins.deleted'));
            setToDelete(null); load();
        } catch (err) { toast.error(err instanceof ApiError ? err.message : t('adminx.admins.delete_error')); }
    };

    // Guard: solo el super-administrador.
    if (currentUser && currentUser.role !== UserRole.SUPER_ADMIN) {
        return <div className="p-8 text-center text-neutral-500">{t('adminx.common.no_access')}</div>;
    }

    return (
        <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900">
            <header className="bg-[#00897B] text-white px-6 py-3 flex items-center justify-between">
                <span className="font-bold">{t('adminx.superadmin.brand')}</span>
                <div className="flex items-center gap-3 text-sm">
                    <span className="opacity-90">{currentUser?.name} {currentUser?.lastName}</span>
                    <button onClick={() => logout()} className="bg-black/20 hover:bg-black/30 px-3 py-1 rounded">{t('adminx.common.logout')}</button>
                </div>
            </header>
            <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100 mb-1">{t('adminx.admins.title')}</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">{t('adminx.admins.subtitle')}</p>

            {loading ? <LoadingSkeleton variant="table" rows={5} /> : admins.length === 0 ? (
                <EmptyState title={t('adminx.admins.empty_title')} description={t('adminx.admins.empty_desc')} />
            ) : (
                <DataTable<AdminUser>
                    data={admins}
                    columns={[
                        { header: t('common.name'), accessor: (a) => <span className="font-medium text-neutral-800 dark:text-neutral-100">{a.name} {a.lastName}</span>, sortValue: a => `${a.name} ${a.lastName}`, filterValue: a => `${a.name} ${a.lastName}` },
                        { header: t('common.email'), accessor: 'email' },
                        { header: t('common.status'), accessor: (a) => { const st = STATUS[a.status] || STATUS.ACTIVE; return <span className={`text-xs px-2 py-0.5 rounded-full ${st.cls}`}>{t(st.labelKey)}</span>; }, sortValue: a => a.status, filterValue: a => t((STATUS[a.status] || STATUS.ACTIVE).labelKey) },
                    ] as TableColumn<AdminUser>[]}
                    actions={(a) => (
                        <>
                            <button onClick={() => openEdit(a)} className="text-blue-600 dark:text-blue-400 hover:underline text-xs mr-3">{t('common.edit')}</button>
                            <button onClick={() => setToDelete(a)} className="text-red-600 dark:text-red-400 hover:underline text-xs" disabled={a.id === currentUser?.id}>{t('common.delete')}</button>
                        </>
                    )}
                />
            )}

            <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={t('adminx.admins.edit_title')} size="md">
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1">{t('common.name')}</label>
                            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={`${INPUT_SM_CLASSES} w-full`} />
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1">{t('adminx.admins.last_name')}</label>
                            <input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className={`${INPUT_SM_CLASSES} w-full`} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-neutral-500 mb-1">{t('common.email')}</label>
                        <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={`${INPUT_SM_CLASSES} w-full`} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1">{t('common.status')}</label>
                            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={`${INPUT_SM_CLASSES} w-full`}>
                                <option value="ACTIVE">{t('adminx.status.active')}</option>
                                <option value="DISABLED">{t('adminx.status.disabled')}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-neutral-500 mb-1">{t('adminx.admins.new_password')}</label>
                            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={t('adminx.admins.password_ph')} className={`${INPUT_SM_CLASSES} w-full`} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button onClick={() => setEditing(null)} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
                        <button onClick={save} disabled={saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{saving ? t('common.saving') : t('common.save')}</button>
                    </div>
                </div>
            </Modal>

            <ConfirmationModal
                isOpen={!!toDelete}
                onClose={() => setToDelete(null)}
                onConfirm={confirmDelete}
                title={t('adminx.admins.delete_confirm_title')}
                message={t('adminx.admins.delete_confirm_message', { name: toDelete?.name, lastName: toDelete?.lastName, email: toDelete?.email })}
                confirmButtonText={t('adminx.confirm.delete_yes')}
            />
            </div>
        </div>
    );
};
