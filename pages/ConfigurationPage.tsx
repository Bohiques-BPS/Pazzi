
import React from 'react';
import { Link } from 'react-router-dom';
import { useGlobalSettings, useTranslation } from '../contexts/GlobalSettingsContext';
import { useTheme } from '../contexts/ThemeContext';
import { usePermissions } from '../hooks/usePermissions';
import { Theme } from '../types';
import { BUTTON_PRIMARY_SM_CLASSES } from '../constants';
import { ClockIcon, WrenchScrewdriverIcon, EyeIcon, SunIcon, MoonIcon } from '../components/icons';

export const ConfigurationPage: React.FC = () => {
    const { settings, updateSettings } = useGlobalSettings();
    const { theme, setTheme } = useTheme();
    const { t } = useTranslation();
    const { isManager } = usePermissions();

    const handleFontSizeChange = (size: 'sm' | 'md' | 'lg') => {
        updateSettings({ fontSize: size });
    };

    return (
        <div className="max-w-3xl mx-auto p-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center">
                    <WrenchScrewdriverIcon className="w-8 h-8 mr-3 text-primary" />
                    {t('config.title')}
                </h1>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1">{t('config.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {isManager && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
                        <p className="text-sm text-neutral-700 dark:text-neutral-200">
                            Zona horaria, formatos de fecha y números, IVU, lealtad, recordatorios y Modo Emergencia aplican a todo el negocio: están en <strong>Administración › Configuración</strong>.
                        </p>
                        <Link to="/admin/settings" className={BUTTON_PRIMARY_SM_CLASSES}>Ir a Administración</Link>
                    </div>
                )}
                {/* Regional Settings */}
                <section className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-200 mb-4 flex items-center border-b pb-2 dark:border-neutral-700">
                        <ClockIcon className="w-5 h-5 mr-2 text-blue-500" />
                        {t('config.regional')}
                    </h2>
                    <div className="space-y-5">

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{t('config.language')}</label>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => updateSettings({ language: 'es' })}
                                    className={`flex-1 py-2 px-4 rounded-md border text-sm font-medium transition-all ${
                                        settings.language === 'es'
                                            ? 'bg-primary text-white border-primary ring-2 ring-offset-1 ring-primary dark:ring-offset-neutral-800'
                                            : 'bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-600'
                                    }`}
                                >
                                    Español
                                </button>
                                <button
                                    onClick={() => updateSettings({ language: 'en' })}
                                    className={`flex-1 py-2 px-4 rounded-md border text-sm font-medium transition-all ${
                                        settings.language === 'en'
                                            ? 'bg-primary text-white border-primary ring-2 ring-offset-1 ring-primary dark:ring-offset-neutral-800'
                                            : 'bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-600'
                                    }`}
                                >
                                    English
                                </button>
                            </div>
                        </div>

                    </div>
                </section>

                {/* Appearance Settings */}
                <section className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-200 mb-4 flex items-center border-b pb-2 dark:border-neutral-700">
                        <EyeIcon className="w-5 h-5 mr-2 text-green-500" />
                        {t('config.appearance')}
                    </h2>
                    
                    <div className="mb-6 border-b border-neutral-200 dark:border-neutral-700 pb-6">
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">Tema de la Aplicación</label>
                        <div className="flex items-center space-x-4">
                            <button 
                                onClick={() => setTheme(Theme.LIGHT)} 
                                className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center ${theme === Theme.LIGHT ? 'ring-2 ring-offset-2 dark:ring-offset-neutral-800 ring-primary' : 'opacity-70 hover:opacity-100'}`}
                            >
                                <SunIcon />{' '}Claro
                            </button>
                            <button 
                                onClick={() => setTheme(Theme.DARK)} 
                                className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center ${theme === Theme.DARK ? 'ring-2 ring-offset-2 dark:ring-offset-neutral-800 ring-primary' : 'opacity-70 hover:opacity-100'}`}
                            >
                                    <MoonIcon />{' '}Oscuro
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">{t('config.font_size')}</label>
                        <div className="grid grid-cols-3 gap-4">
                            <button
                                onClick={() => handleFontSizeChange('sm')}
                                className={`py-3 px-4 rounded-lg border flex flex-col items-center justify-center transition-all ${
                                    settings.fontSize === 'sm'
                                        ? 'bg-primary/10 border-primary text-primary ring-1 ring-primary'
                                        : 'bg-white dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-600'
                                }`}
                            >
                                <span className="text-sm font-bold mb-1">Aa</span>
                                <span className="text-xs text-neutral-500 dark:text-neutral-400">{t('config.small')}</span>
                            </button>
                            
                            <button
                                onClick={() => handleFontSizeChange('md')}
                                className={`py-3 px-4 rounded-lg border flex flex-col items-center justify-center transition-all ${
                                    settings.fontSize === 'md'
                                        ? 'bg-primary/10 border-primary text-primary ring-1 ring-primary'
                                        : 'bg-white dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-600'
                                }`}
                            >
                                <span className="text-base font-bold mb-1">Aa</span>
                                <span className="text-xs text-neutral-500 dark:text-neutral-400">{t('config.medium')}</span>
                            </button>

                            <button
                                onClick={() => handleFontSizeChange('lg')}
                                className={`py-3 px-4 rounded-lg border flex flex-col items-center justify-center transition-all ${
                                    settings.fontSize === 'lg'
                                        ? 'bg-primary/10 border-primary text-primary ring-1 ring-primary'
                                        : 'bg-white dark:bg-neutral-700 border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-600'
                                }`}
                            >
                                <span className="text-lg font-bold mb-1">Aa</span>
                                <span className="text-xs text-neutral-500 dark:text-neutral-400">{t('config.large')}</span>
                            </button>
                        </div>
                        <div className="mt-4 p-3 bg-neutral-100 dark:bg-neutral-900 rounded-md">
                            <p className="text-neutral-600 dark:text-neutral-300">
                                {t('config.preview')}
                            </p>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
};
