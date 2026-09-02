import React, { useState, useEffect } from 'react';
import { Project, ProjectFormData, ProjectStatus } from '../../types';
import { useData } from '../../contexts/DataContext';
import { Modal } from '../../components/Modal';
import { inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES } from '../../constants';
import { RichTextEditor } from '../../components/ui/RichTextEditor';
import { projectsService, normalizeProjectFromApi } from '../../services/projects';
import { ApiError } from '../../services/api';
import { toast } from 'react-hot-toast';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

interface POSProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  onProjectCreated: (newProject: Project) => void;
}

export const POSProjectFormModal: React.FC<POSProjectFormModalProps> = ({ isOpen, onClose, clientId, onProjectCreated }) => {
  const { t } = useTranslation();
  const { setProjects } = useData();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(t('posx.projectform.err_name'));
      return;
    }
    if (!clientId) {
      toast.error(t('posx.projectform.err_client'));
      return;
    }
    if (saving) return;

    const projectData: ProjectFormData = {
      name: name.trim(),
      description: description.trim(),
      clientId,
      status: ProjectStatus.PENDING,
      assignedProducts: [],
      assignedEmployeeIds: [],
      workMode: 'daysOnly',
      workDays: [],
      workDayTimeRanges: [],
    };

    setSaving(true);
    try {
      // Persistir en el backend (antes se creaba solo en memoria con id proj-<ts> y se perdía al recargar).
      const created = normalizeProjectFromApi(await projectsService.create(projectData));
      setProjects(prev => [created, ...prev]);
      toast.success(t('posx.projectform.created'));
      onProjectCreated(created);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo crear el proyecto.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('posx.projectform.title')} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                {t('posx.projectform.intro')}
            </p>
            <div>
                <label htmlFor="posProjectName" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('posx.projectform.name_label')}</label>
                <input
                    type="text"
                    id="posProjectName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputFormStyle}
                    required
                    autoFocus
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('posx.projectform.description_label')}</label>
                <RichTextEditor
                    value={description}
                    onChange={setDescription}
                    placeholder={t('posx.projectform.description_placeholder')}
                />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
                <button type="submit" disabled={saving} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{saving ? t('common.saving') : t('posx.projectform.create_assign')}</button>
            </div>
        </form>
    </Modal>
  );
};
