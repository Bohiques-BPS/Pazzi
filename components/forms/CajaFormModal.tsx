import React, { useState, useEffect } from 'react';
import { Caja, CajaFormData, Branch } from '../../types';
import { useData } from '../../contexts/DataContext';
import { Modal } from '../Modal';
import { inputFormStyle, BUTTON_SECONDARY_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES } from '../../constants';

interface CajaFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    cajaToEdit: Caja | null;
}

export const CajaFormModal: React.FC<CajaFormModalProps> = ({ isOpen, onClose, cajaToEdit }) => {
    const { setCajas, cajas: allCajas, branches } = useData();
    const activeBranches = branches.filter(b => b.isActive);
    
    const initialFormData: CajaFormData = {
        name: '',
        branchId: activeBranches[0]?.id || '',
        isActive: true,
        applyIVA: true,
        isExternal: false,
    };
    const [formData, setFormData] = useState<CajaFormData>(initialFormData);

    useEffect(() => {
        if (isOpen) {
            if (cajaToEdit) {
                setFormData({
                    name: cajaToEdit.name,
                    branchId: cajaToEdit.branchId,
                    isActive: cajaToEdit.isActive,
                    applyIVA: cajaToEdit.applyIVA,
                    isExternal: cajaToEdit.isExternal || false,
                });
            } else {
                // Reset to initial, ensuring branchId is valid if activeBranches exist
                setFormData({
                    ...initialFormData,
                    branchId: activeBranches[0]?.id || ''
                });
            }
        }
    }, [cajaToEdit, isOpen, activeBranches, initialFormData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.name.trim() === '') {
            alert("El nombre de la caja es obligatorio.");
            return;
        }
        if (!formData.branchId) {
            alert("Por favor, seleccione una sucursal para la caja.");
            return;
        }

        const isDuplicateName = allCajas.some(c => c.name.toLowerCase() === formData.name.toLowerCase() && (!cajaToEdit || c.id !== cajaToEdit.id));
        if (isDuplicateName) {
            alert("Ya existe una caja con este nombre.");
            return;
        }

        if (cajaToEdit) {
            setCajas(prev => prev.map(c => c.id === cajaToEdit.id ? { ...cajaToEdit, ...formData } : c));
        } else {
            const newCaja: Caja = { id: `caja-${Date.now()}`, ...formData };
            setCajas(prev => [...prev, newCaja]);
        }
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={cajaToEdit ? 'Editar Caja (Terminal)' : 'Crear Caja (Terminal)'} size="lg">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="cajaName" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Nombre de la Caja</label>
                    <input type="text" name="name" id="cajaName" value={formData.name} onChange={handleChange} className={inputFormStyle} required />
                </div>
                <div>
                    <label htmlFor="branchId" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Sucursal Asignada</label>
                    <select name="branchId" id="branchId" value={formData.branchId} onChange={handleChange} className={inputFormStyle} required>
                        <option value="">Seleccionar Sucursal</option>
                        {activeBranches.map(branch => (
                            <option key={branch.id} value={branch.id}>{branch.name}</option>
                        ))}
                    </select>
                    {activeBranches.length === 0 && <p className="text-xs text-red-500 mt-1">No hay sucursales activas. Por favor, active o cree una sucursal primero.</p>}
                </div>
                <div className="flex flex-wrap items-center gap-6 pt-2">
                    <label htmlFor="isActive" className="flex items-center text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        <input
                            type="checkbox"
                            name="isActive"
                            id="isActive"
                            checked={formData.isActive}
                            onChange={handleChange}
                            className="h-4 w-4 text-primary focus:ring-primary border-neutral-300 dark:border-neutral-600 rounded mr-2"
                        />
                        Caja Activa
                    </label>
                     <label htmlFor="applyIVA" className="flex items-center text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        <input
                            type="checkbox"
                            name="applyIVA"
                            id="applyIVA"
                            checked={formData.applyIVA}
                            onChange={handleChange}
                            className="h-4 w-4 text-primary focus:ring-primary border-neutral-300 dark:border-neutral-600 rounded mr-2"
                        />
                        Aplicar IVA por Defecto
                    </label>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  "Aplicar IVA por Defecto" indica si las ventas procesadas en esta caja deben incluir IVA automáticamente. Esto puede ser ajustado por producto si necesario.
                </p>

                <div className="pt-2 border-t dark:border-neutral-700">
                    <label htmlFor="isExternal" className="flex items-start text-sm font-medium text-neutral-700 dark:text-neutral-300 p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-100 dark:border-amber-800 cursor-pointer">
                        <input
                            type="checkbox"
                            name="isExternal"
                            id="isExternal"
                            checked={formData.isExternal}
                            onChange={handleChange}
                            className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-neutral-300 dark:border-neutral-600 rounded mr-2 mt-0.5"
                        />
                        <div>
                            <span className="block font-bold text-amber-700 dark:text-amber-400">Caja Externa / Fuera del Sistema</span>
                            <span className="block text-xs text-neutral-500 dark:text-neutral-400 font-normal mt-1">
                                Las ventas realizadas en esta caja se guardarán pero <strong>NO</strong> se incluirán en los reportes financieros estándar por defecto. Útil para ventas paralelas o de prueba.
                            </span>
                        </div>
                    </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES} disabled={activeBranches.length === 0 && !cajaToEdit?.branchId}>Guardar Caja</button>
                </div>
            </form>
        </Modal>
    );
};