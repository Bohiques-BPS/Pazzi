
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { UserRole, AlertSettings } from '../../types';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES } from '../../constants';
import { BellIcon, EnvelopeIcon } from '../icons';

const defaultAlerts: AlertSettings = {
    paymentThreshold: { enabled: false, threshold: 1000, email: '' },
    dailyReports: { enabled: false, email: '' },
    returns: { enabled: false, email: '' },
};

export const AlertsConfiguration: React.FC = () => {
    const { currentUser, updateUserAlertSettings } = useAuth();
    const { cajas } = useData();
    const [settings, setSettings] = useState<AlertSettings>(defaultAlerts);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (currentUser && currentUser.role === UserRole.MANAGER) {
            const userEmail = currentUser.email;
            // Deep merge user settings with defaults
            const userSettings = currentUser.alertSettings || {};
            const mergedSettings: AlertSettings = {
                paymentThreshold: { 
                    ...defaultAlerts.paymentThreshold, 
                    ...userSettings.paymentThreshold,
                    email: userSettings.paymentThreshold?.email || userEmail 
                },
                returns: {
                    ...defaultAlerts.returns,
                    ...userSettings.returns,
                    email: userSettings.returns?.email || userEmail
                },
                dailyReports: {
                    ...defaultAlerts.dailyReports,
                    ...userSettings.dailyReports,
                    email: userSettings.dailyReports?.email || userEmail
                }
            };

            // Ensure settings for each caja exist
            cajas.forEach(caja => {
                const cajaKey = `dailyReport_${caja.id}`;
                if (!mergedSettings[cajaKey]) {
                    mergedSettings[cajaKey] = {
                        enabled: userSettings[cajaKey]?.enabled || false,
                        email: userSettings[cajaKey]?.email || userEmail
                    };
                }
            });

            setSettings(mergedSettings);
        }
    }, [currentUser, cajas]);

    const handleToggle = (key: string) => {
        setSettings(prev => ({
            ...prev,
            [key]: { ...prev[key], enabled: !prev[key].enabled }
        }));
    };

    const handleValueChange = (key: string, field: 'threshold' | 'email', value: string | number) => {
        setSettings(prev => ({
            ...prev,
            [key]: { ...prev[key], [field]: value }
        }));
    };

    const handleSave = async () => {
        if (currentUser) {
            const success = await updateUserAlertSettings(currentUser.id, settings);
            if (success) {
                setMessage('Configuración guardada exitosamente.');
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage('Error al guardar la configuración.');
            }
        }
    };

    if (currentUser?.role !== UserRole.MANAGER) {
        return null;
    }

    const mainEmail = settings.paymentThreshold?.email || currentUser.email;

    return (
        <div className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-primary mb-4 flex items-center">
                <BellIcon className="w-5 h-5 mr-2" />
                Configuración de Alertas por Correo
            </h2>

            <div className="space-y-6">
                <div className="border-b dark:border-neutral-700 pb-4">
                    <label htmlFor="mainAlertEmail" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center mb-1">
                        <EnvelopeIcon className="w-4 h-4 mr-2"/>
                        Correo Principal para Notificaciones
                    </label>
                    <input
                        type="email"
                        id="mainAlertEmail"
                        value={mainEmail}
                        onChange={(e) => {
                            const newEmail = e.target.value;
                            // Update all email fields simultaneously
                            setSettings(prev => {
                                const newSettings = { ...prev };
                                Object.keys(newSettings).forEach(key => {
                                    newSettings[key] = { ...newSettings[key], email: newEmail };
                                });
                                return newSettings;
                            });
                        }}
                        className={inputFormStyle + " max-w-sm"}
                        placeholder="admin@ejemplo.com"
                    />
                </div>

                <div className="flex items-start justify-between">
                    <div>
                        <h4 className="font-medium text-neutral-800 dark:text-neutral-100">Alerta por Monto de Pago</h4>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Recibir un correo cuando una venta o abono excede un monto específico.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={settings.paymentThreshold?.enabled || false} onChange={() => handleToggle('paymentThreshold')} className="sr-only peer" />
                        <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 dark:peer-focus:ring-primary/80 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-primary"></div>
                    </label>
                </div>
                {settings.paymentThreshold?.enabled && (
                    <div className="pl-6">
                        <label className="block text-sm font-medium">Alertar cuando un pago individual excede:</label>
                        <input
                            type="number"
                            value={settings.paymentThreshold.threshold || ''}
                            onChange={(e) => handleValueChange('paymentThreshold', 'threshold', parseFloat(e.target.value) || 0)}
                            className={inputFormStyle + " w-40 mt-1"}
                            placeholder="1000.00"
                        />
                    </div>
                )}
                
                <div className="flex items-start justify-between">
                    <div>
                        <h4 className="font-medium text-neutral-800 dark:text-neutral-100">Alerta por Devolución</h4>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Recibir un correo cada vez que se procesa una devolución.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={settings.returns?.enabled || false} onChange={() => handleToggle('returns')} className="sr-only peer" />
                        <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 dark:peer-focus:ring-primary/80 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-primary"></div>
                    </label>
                </div>
                
                <div>
                    <h4 className="font-medium text-neutral-800 dark:text-neutral-100">Reporte Diario de Caja</h4>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Enviar un reporte diario de cierre de caja por correo para las cajas seleccionadas.</p>
                     <div className="mt-2 space-y-2">
                        {cajas.map(caja => {
                            const cajaKey = `dailyReport_${caja.id}`;
                            return (
                                <div key={caja.id} className="flex items-center justify-between pl-6">
                                    <span className="text-sm">{caja.name}</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={settings[cajaKey]?.enabled || false} onChange={() => handleToggle(cajaKey)} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/30 dark:peer-focus:ring-primary/80 rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-neutral-600 peer-checked:bg-primary"></div>
                                    </label>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-end items-center pt-4 border-t dark:border-neutral-700">
                    {message && <p className="text-sm text-green-600 dark:text-green-400 mr-4">{message}</p>}
                    <button onClick={handleSave} className={BUTTON_PRIMARY_SM_CLASSES}>
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    );
};
