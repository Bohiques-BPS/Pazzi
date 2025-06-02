
import React, { useState, useEffect } from 'react';
import { useECommerceSettings } from '../../contexts/ECommerceSettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { ECommerceSettings } from '../../types';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import { PaintBrushIcon, PhotoIcon, StarIcon, ArrowPathIcon } from '../../components/icons';

export const ClientEcommerceSettingsPage: React.FC = () => {
    const { currentUser } = useAuth();
    const { getSettingsForClient, updateSettingsForClient, getDefaultSettings } = useECommerceSettings();
    
    const [formData, setFormData] = useState<ECommerceSettings>(() => 
        currentUser ? getSettingsForClient(currentUser.id) : getDefaultSettings()
    );
    const [message, setMessage] = useState<string | null>(null);

    useEffect(() => {
        if (currentUser) {
            setFormData(getSettingsForClient(currentUser.id));
        }
    }, [currentUser, getSettingsForClient]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, primaryColor: e.target.value }));
    };
    
    const handleResetToDefaults = () => {
        if (currentUser) {
            const defaultClientSettings = getDefaultSettings(); // Get Pazzi's global defaults
            setFormData(defaultClientSettings); 
            // updateSettingsForClient(currentUser.id, defaultClientSettings); // Optionally persist reset immediately
            setMessage("Configuración restaurada a los valores por defecto de Pazzi. Guarde para aplicar.");
            setTimeout(() => setMessage(null), 4000);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (currentUser) {
            updateSettingsForClient(currentUser.id, formData);
            setMessage("Configuración de tu tienda guardada exitosamente.");
            setTimeout(() => setMessage(null), 3000);
        } else {
            setMessage("Error: Usuario no encontrado.");
        }
    };

    if (!currentUser) {
        return <p className="text-center p-6">Debes iniciar sesión para administrar la configuración de tu tienda.</p>;
    }

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200 mb-6">Configuración de Mi Tienda Online</h1>
            
            {message && (
                <div className={`mb-4 p-3 rounded-md text-sm ${message.includes("Error") ? 'bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300' : 'bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-300'}`}>
                    {message}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md space-y-6">
                <div>
                    <label htmlFor="storeName" className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1">
                        <StarIcon /> Nombre de mi Tienda
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
                        <PhotoIcon /> URL de mi Logo
                    </label>
                    <input
                        type="url"
                        name="logoUrl"
                        id="logoUrl"
                        value={formData.logoUrl}
                        onChange={handleChange}
                        className={inputFormStyle}
                        placeholder="https://ejemplo.com/mi-logo.png"
                    />
                    {formData.logoUrl && (
                        <img src={formData.logoUrl} alt="Vista previa del logo" className="mt-2 h-16 object-contain border dark:border-neutral-700 rounded p-1 bg-neutral-50 dark:bg-neutral-700" />
                    )}
                </div>

                <div>
                    <label htmlFor="template" className="block text-sm font-medium text-neutral-600 dark:text-neutral-300 mb-1">
                        Plantilla de mi Tienda
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
                       <PaintBrushIcon /> Color Primario de mi Tienda
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
                        <ArrowPathIcon /> Restaurar Predeterminados
                    </button>
                    <button type="submit" className={BUTTON_PRIMARY_SM_CLASSES}>
                        Guardar Configuración de mi Tienda
                    </button>
                </div>
            </form>
        </div>
    );
};
