
import React from 'react';
import { useGlobalSettings, useTranslation } from '../contexts/GlobalSettingsContext';
import { useTheme } from '../contexts/ThemeContext';
import { Theme } from '../types';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES } from '../constants';
import { ClockIcon, WrenchScrewdriverIcon, EyeIcon, ArrowPathIcon, SunIcon, MoonIcon } from '../components/icons';

export const ConfigurationPage: React.FC = () => {
    const { settings, updateSettings } = useGlobalSettings();
    const { theme, setTheme } = useTheme();
    const { t } = useTranslation();

    const handleFontSizeChange = (size: 'sm' | 'md' | 'lg') => {
        updateSettings({ fontSize: size });
    };

    const handleTimezoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateSettings({ timezone: e.target.value });
    };

    const timezones = [
        { value: 'UTC', label: 'UTC (Tiempo Universal)' },
        { value: 'America/Puerto_Rico', label: 'Puerto Rico (AST)' },
        { value: 'America/New_York', label: 'New York (EST/EDT)' },
        { value: 'America/Chicago', label: 'Chicago (CST/CDT)' },
        { value: 'America/Denver', label: 'Denver (MST/MDT)' },
        { value: 'America/Los_Angeles', label: 'Los Angeles (PST/PDT)' },
        { value: 'Europe/Madrid', label: 'Madrid (CET/CEST)' },
    ];

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
                {/* Regional Settings */}
                <section className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-200 mb-4 flex items-center border-b pb-2 dark:border-neutral-700">
                        <ClockIcon className="w-5 h-5 mr-2 text-blue-500" />
                        {t('config.regional')}
                    </h2>
                    <div className="space-y-5">
                        <div>
                            <label htmlFor="timezone" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{t('config.timezone')}</label>
                            <select
                                id="timezone"
                                value={settings.timezone}
                                onChange={handleTimezoneChange}
                                className={inputFormStyle}
                            >
                                {timezones.map(tz => (
                                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                                ))}
                            </select>
                            <p className="text-xs text-neutral-500 mt-1">{t('config.timezone_help')}</p>
                        </div>

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

                        <div>
                             <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{t('config.number_format')}</label>
                             <div className="flex space-x-3">
                                <button
                                    onClick={() => updateSettings({ numberFormat: 'comma_decimal' })}
                                    className={`flex-1 py-2 px-4 rounded-md border text-sm font-medium transition-all ${
                                        settings.numberFormat === 'comma_decimal'
                                            ? 'bg-primary text-white border-primary ring-2 ring-offset-1 ring-primary dark:ring-offset-neutral-800'
                                            : 'bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-600'
                                    }`}
                                >
                                    1,234.56 (US)
                                </button>
                                <button
                                    onClick={() => updateSettings({ numberFormat: 'dot_decimal' })}
                                    className={`flex-1 py-2 px-4 rounded-md border text-sm font-medium transition-all ${
                                        settings.numberFormat === 'dot_decimal'
                                            ? 'bg-primary text-white border-primary ring-2 ring-offset-1 ring-primary dark:ring-offset-neutral-800'
                                            : 'bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-600'
                                    }`}
                                >
                                    1.234,56 (EU)
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
