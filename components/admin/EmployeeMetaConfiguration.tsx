import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { UserRole } from '../../types';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES } from '../../constants';
import { TrashIconMini } from '../icons';
import { toast } from '../../hooks/useToast';
import { employeePositionsService, employeeDepartmentsService, type LookupItem } from '../../services/employeeMeta';

interface LookupService {
    getAll: () => Promise<LookupItem[]>;
    create: (name: string) => Promise<LookupItem>;
    update: (id: string, name: string) => Promise<LookupItem>;
    delete: (id: string) => Promise<{ message: string }>;
}

/** Lista gestionable (crear, renombrar, eliminar) de un catálogo simple (puestos o departamentos). */
const LookupManager: React.FC<{ title: string; placeholder: string; service: LookupService }> = ({ title, placeholder, service }) => {
    const { t } = useTranslation();
    const [items, setItems] = useState<LookupItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);
    const [edits, setEdits] = useState<Record<string, string>>({});
    const [busyId, setBusyId] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        service.getAll().then(data => { if (!cancelled) setItems(data); }).catch(() => {}).finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSaving(true);
        try {
            const created = await service.create(name.trim());
            setItems(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
            setName('');
        } catch { toast.error(t('pm2x.quickcreate.save_error')); }
        finally { setSaving(false); }
    };

    const handleRename = async (id: string, original: string) => {
        const next = (edits[id] ?? original).trim();
        if (!next || next === original) return;
        setBusyId(id);
        try {
            const updated = await service.update(id, next);
            setItems(prev => prev.map(i => i.id === id ? updated : i).sort((a, b) => a.name.localeCompare(b.name)));
            setEdits(prev => { const n = { ...prev }; delete n[id]; return n; });
            toast.success(t('admin.meta.renamed'));
        } catch { toast.error(t('pm2x.quickcreate.save_error')); }
        finally { setBusyId(null); }
    };

    const handleDelete = async (id: string) => {
        setBusyId(id);
        try {
            await service.delete(id);
            setItems(prev => prev.filter(i => i.id !== id));
        } catch { toast.error(t('pm2x.quickcreate.delete_error')); }
        finally { setBusyId(null); }
    };

    return (
        <div className="bg-white dark:bg-neutral-800 p-5 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold text-primary mb-3">{title}</h3>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {loading ? (
                    <p className="text-sm text-neutral-400">{t('common.loading') || '…'}</p>
                ) : items.length === 0 ? (
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('pm2x.quickcreate.empty')}</p>
                ) : items.map(it => {
                    const val = edits[it.id] ?? it.name;
                    const changed = val.trim() !== it.name && val.trim() !== '';
                    return (
                        <div key={it.id} className="flex items-center gap-2">
                            <input
                                type="text"
                                value={val}
                                onChange={e => setEdits(prev => ({ ...prev, [it.id]: e.target.value }))}
                                onKeyDown={e => { if (e.key === 'Enter') handleRename(it.id, it.name); }}
                                className={`${inputFormStyle} flex-1`}
                                disabled={busyId === it.id}
                            />
                            {changed && (
                                <button type="button" onClick={() => handleRename(it.id, it.name)} disabled={busyId === it.id} className="p-2 text-primary hover:bg-primary/10 rounded-md" title={t('common.save')}>
                                    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                </button>
                            )}
                            <button type="button" onClick={() => handleDelete(it.id)} disabled={busyId === it.id} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md" title={t('common.delete')}>
                                <TrashIconMini className="w-5 h-5" />
                            </button>
                        </div>
                    );
                })}
            </div>

            <form onSubmit={handleCreate} className="flex items-center gap-2 border-t dark:border-neutral-700 pt-3 mt-3">
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={placeholder} className={`${inputFormStyle} flex-1`} />
                <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES} disabled={saving || !name.trim()}>
                    {saving ? t('common.saving') : t('common.create')}
                </button>
            </form>
        </div>
    );
};

/**
 * Sección de Administración: gestión de Puestos y Departamentos de empleados
 * (crear, renombrar, eliminar). Solo para el MANAGER.
 */
export const EmployeeMetaConfiguration: React.FC = () => {
    const { currentUser } = useAuth();
    const { t } = useTranslation();
    if (currentUser?.role !== UserRole.MANAGER) return null;

    return (
        <div>
            <h2 className="text-xl font-semibold text-primary mb-1">{t('admin.meta.title')}</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">{t('admin.meta.subtitle')}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <LookupManager title={t('pm2x.employee.manage_positions')} placeholder={t('pm2x.employee.position_placeholder')} service={employeePositionsService} />
                <LookupManager title={t('pm2x.employee.manage_departments')} placeholder={t('pm2x.employee.department_placeholder')} service={employeeDepartmentsService} />
            </div>
        </div>
    );
};
