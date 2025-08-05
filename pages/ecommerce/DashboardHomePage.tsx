

import React, { useState, useEffect } from 'react';
import { useECommerceSettings } from '../../contexts/ECommerceSettingsContext'; 
import { ECommerceSettings } from '../../types'; 
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants'; 
import { PaintBrushIcon, PhotoIcon, StarIcon, ArrowPathIcon } from '../../components/icons'; 

export const ECommerceSettingsPage: React.FC = () => {
    const { getDefaultSettings, updateDefaultSettings } = useECommerceSettings();
    const [formData, setFormData] = useState<ECommerceSettings>(getDefaultSettings());
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        setFormData(getDefaultSettings());
    }, [getDefaultSettings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, primaryColor: e.target.value }));
    };
    
    const handleResetToDefaults = () => {
        // This function might need to fetch the "master" defaults if they differ from current `getDefaultSettings`
        // For now, it resets to whatever the context considers the current default.
        // A more robust system might have a hardcoded initial default separate from the editable default.
        const masterDefault: ECommerceSettings = { // This should be from constants.DEFAULT_ECOMMERCE_SETTINGS if it's truly resetting
            storeName: "Pazzi Tienda Online (Predeterminada)",
            logoUrl: "https://picsum.photos/seed/pazzidefaultlogo/150/50",
            template: 'Moderno',
            primaryColor: '#0D9488',
        };
        setFormData(masterDefault);
        updateDefaultSettings(masterDefault);
        setMessage("Configuración predeterminada restaurada.");
         setTimeout(() => setMessage(null), 3000);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateDefaultSettings(formData);
        setMessage("Configuración predeterminada guardada exitosamente.");
        setTimeout(() => setMessage(null), 3000);
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200 mb-6">Configuración Global de E-commerce (Defaults)</h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                Estos ajustes se aplicarán como predeterminados para nuevas tiendas de clientes que no hayan personalizado su propia configuración.
            </p>
            
            {message && (
                <div className="mb-4 p-3 rounded-md text-sm bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-300">
                    {message}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md space-y-6">
                <div>
                    <label htmlFor="storeName" className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1">
                        <StarIcon /> Nombre de Tienda (Predeterminado)
                    </label>
                    <input
                        type="text"
                        name="storeName"
                        id="storeName"
                        value={formData.storeName}
                        onChange={handleChange}
                        className={inputFormStyle}
                        required
                    />
                </div>

                <div>
                    <label htmlFor="logoUrl" className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1">
                        <PhotoIcon /> URL del Logo (Predeterminado)
                    </label>
                    <input
                        type="url"
                        name="logoUrl"
                        id="logoUrl"
                        value={formData.logoUrl}
                        onChange={handleChange}
                        className={inputFormStyle}
                        placeholder="https://ejemplo.com/logo.png"
                    />
                    {formData.logoUrl && (
                        <img src={formData.logoUrl} alt="Vista previa del logo" className="mt-2 h-16 object-contain border dark:border-neutral-700 rounded p-1" />
                    )}
                </div>

                <div>
                    <label htmlFor="template" className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1">
                        Plantilla (Predeterminada)
                    </label>
                    <select
                        name="template"
                        id="template"
                        value={formData.template}
                        onChange={handleChange}
                        className={inputFormStyle}
                    >
                        <option value="Moderno">Moderno</option>
                        <option value="Clasico">Clásico</option>
                        <option value="Minimalista">Minimalista</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="primaryColor" className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1">
                       <PaintBrushIcon /> Color Primario (Predeterminado)
                    </label>
                    <div className="flex items-center space-x-2">
                        <input
                            type="color"
                            name="primaryColor"
                            id="primaryColor"
                            value={formData.primaryColor}
                            onChange={handleColorChange}
                            className="h-10 w-16 p-1 border-neutral-300 dark:border-neutral-600 rounded-md cursor-pointer"
                        />
                        <input 
                            type="text"
                            value={formData.primaryColor}
                            onChange={handleColorChange}
                            className={`${inputFormStyle} w-auto`}
                            placeholder="#0D9488"
                        />
                        <div style={{ backgroundColor: formData.primaryColor }} className="w-8 h-8 rounded-md border border-neutral-300 dark:border-neutral-600"></div>
                    </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t dark:border-neutral-700">
                     <button type="button" onClick={handleResetToDefaults} className={`${BUTTON_SECONDARY_SM_CLASSES} flex items-center`}>
                        <ArrowPathIcon /> Restaurar Defaults Maestros
                    </button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES}>
                        Guardar Configuración Predeterminada
                    </button>
                </div>
            </form>
        </div>
    );
};