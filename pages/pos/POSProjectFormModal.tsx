import React, { useState, useEffect } from 'react';
import { Project, ProjectFormData, ProjectStatus } from '../../types';
import { useData } from '../../contexts/DataContext';
import { Modal } from '../../components/Modal';
import { inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES } from '../../constants';
import { RichTextEditor } from '../../components/ui/RichTextEditor';

interface POSProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  onProjectCreated: (newProject: Project) => void;
}

export const POSProjectFormModal: React.FC<POSProjectFormModalProps> = ({ isOpen, onClose, clientId, onProjectCreated }) => {
  const { addProject } = useData();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("El nombre del proyecto es obligatorio.");
      return;
    }
    if (!clientId) {
        alert("Error: No se ha seleccionado un cliente.");
        return;
    }

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

    const newProject = addProject(projectData);
    onProjectCreated(newProject);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Crear Nuevo Proyecto Rápido" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Cree un nuevo proyecto para el cliente seleccionado. Podrá añadir más detalles más tarde desde el módulo de Gestión de Proyectos.
            </p>
            <div>
                <label htmlFor="posProjectName" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Nombre del Proyecto</label>
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
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Descripción (Opcional)</label>
                <RichTextEditor
                    value={description}
                    onChange={setDescription}
                    placeholder="Breve descripción del alcance del proyecto..."
                />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES}>Crear y Asignar</button>
            </div>
        </form>
    </Modal>
  );
};
