import React, { useState } from 'react';
import { useGlobalSettings, useTranslation } from '../../contexts/GlobalSettingsContext';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { inputFormStyle } from '../../constants';
import { ClockIcon, Cog6ToothIcon, ExclamationTriangleIcon } from '../../components/icons';
import { toast } from '../../hooks/useToast';
import { timezoneOptions } from '../../utils/timezones';
import { DATE_FORMATS } from '../../utils/dateFormat';

/**
 * Administración › Configuración: ajustes del NEGOCIO que heredan el gerente y todos sus empleados
 * (zona horaria, formatos de fecha y números, IVU, lealtad, recordatorios de cobro, Modo Emergencia).
 * Lo personal (idioma, tema, tamaño de letra) queda en /configuration.
 */
export const AdminSettingsPage: React.FC = () => {
    const { settings, updateSettings } = useGlobalSettings();
    const { t } = useTranslation();
    const { isManager } = usePermissions();
    const { currentUser, toggleUserEmergencyOrderMode } = useAuth();
    const emergencyActive = !!currentUser?.isEmergencyOrderActive;
    const [emergencyBusy, setEmergencyBusy] = useState(false);

    const handleToggleEmergency = async () => {
        if (emergencyBusy) return;
        setEmergencyBusy(true);
        const ok = await toggleUserEmergencyOrderMode(currentUser?.id || '');
        if (ok) toast.success(emergencyActive ? 'Modo Emergencia desactivado.' : 'Modo Emergencia activado.');
        else toast.error('No se pudo cambiar el Modo Emergencia.');
        setEmergencyBusy(false);
    };

    const handleTimezoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateSettings({ timezone: e.target.value });
    };

    const timezones = timezoneOptions(settings.timezone);

    if (!isManager) {
        return <p className="p-6 text-neutral-500 dark:text-neutral-400">Solo el gerente puede cambiar la configuración del negocio.</p>;
    }

    return (
        <div className="max-w-3xl mx-auto p-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center">
                    <Cog6ToothIcon className="w-8 h-8 mr-3 text-primary" />
                    Configuración del negocio
                </h1>
                <p className="text-neutral-500 dark:text-neutral-400 mt-1">Aplica a toda la tienda: el gerente y todos sus empleados la heredan.</p>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* Preferencias regionales del negocio */}
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
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{t('config.date_format')}</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {DATE_FORMATS.map(f => (
                                    <button
                                        key={f.key}
                                        type="button"
                                        onClick={() => updateSettings({ dateFormat: f.key } as any)}
                                        className={`py-2 px-3 rounded-md border text-sm transition-all text-left ${
                                            (settings.dateFormat || 'DD/MM/YYYY') === f.key
                                                ? 'bg-primary text-white border-primary ring-2 ring-offset-1 ring-primary dark:ring-offset-neutral-800'
                                                : 'bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-600'
                                        }`}
                                    >
                                        <span className="block font-semibold tabular-nums">{f.example}</span>
                                        <span className="block text-[11px] opacity-75">{f.key}</span>
                                    </button>
                                ))}
                            </div>
                            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{t('config.date_format_hint')}</p>
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

                {/* Modo Emergencia (huracán) */}
                <section className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-200 mb-4 flex items-center border-b pb-2 dark:border-neutral-700">
                        <ExclamationTriangleIcon className="w-5 h-5 mr-2 text-amber-500" />
                        <span>Modo Emergencia (huracán)</span>
                    </h2>
                    <div className={`flex items-center justify-between gap-4 p-4 rounded-lg border ${emergencyActive ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700' : 'bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700'}`}>
                        <div>
                            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                                {emergencyActive ? '🟠 Modo Emergencia ACTIVO' : 'Modo Emergencia apagado'}
                            </p>
                            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                                Con el modo activo, los productos marcados como <strong>“Exención de impuestos en emergencia”</strong> se venden <strong>sin IVU</strong> en toda la tienda (aplica a todas las cajas y colaboradores). Úsalo en periodos de emergencia declarada (ej. huracán).
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleToggleEmergency}
                            disabled={emergencyBusy}
                            className={`shrink-0 py-2 px-4 rounded-md text-sm font-bold text-white transition-all disabled:opacity-50 ${emergencyActive ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-500 hover:bg-amber-600'}`}
                        >
                            {emergencyBusy ? '...' : (emergencyActive ? 'Desactivar' : 'Activar')}
                        </button>
                    </div>
                    <p className="text-xs text-neutral-400 mt-2">
                        Marca qué productos aplican para la exención desde <strong>Productos → editar producto → “Aplicar Exención de Impuestos en Modo Emergencia”</strong>.
                    </p>
                </section>

                {/* Programa de lealtad */}
                <section className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-200 mb-4 flex items-center border-b pb-2 dark:border-neutral-700">
                        ⭐ <span className="ml-2">Programa de Lealtad</span>
                    </h2>
                    <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 cursor-pointer mb-3">
                        <input
                            type="checkbox"
                            checked={(settings.loyaltyPointsPerDollar ?? 0) > 0}
                            onChange={(e) => updateSettings({ loyaltyPointsPerDollar: e.target.checked ? ((settings.loyaltyPointsPerDollar ?? 0) > 0 ? settings.loyaltyPointsPerDollar : 1) : 0 })}
                            className="h-4 w-4"
                        />
                        Activar programa de lealtad
                    </label>
                    {(settings.loyaltyPointsPerDollar ?? 0) > 0 && (
                        <>
                            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Puntos por cada $1 de venta</label>
                            <input
                                type="number" min="0.1" step="0.1"
                                value={settings.loyaltyPointsPerDollar ?? 1}
                                onChange={(e) => updateSettings({ loyaltyPointsPerDollar: Math.max(0, parseFloat(e.target.value) || 0) })}
                                className={`${inputFormStyle} max-w-xs`}
                            />
                            <p className="text-xs text-neutral-500 mt-1">
                                Los puntos se acumulan al cliente al finalizar cada venta.
                                {' '}Ej. 1 = el cliente gana 1 punto por dólar; en una venta de $40 gana 40 puntos.
                            </p>
                        </>
                    )}
                </section>

                {/* Impuestos (IVU) */}
                <section className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-200 mb-4 flex items-center border-b pb-2 dark:border-neutral-700">
                        🧾 <span className="ml-2">Impuestos (IVU)</span>
                    </h2>
                    <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200 mb-3">
                        <input
                            type="checkbox"
                            checked={!!settings.taxBreakdownEnabled}
                            onChange={(e) => {
                                // Al activar, persistir también las tasas efectivas (estándar PR si no había),
                                // para que el desglose no salga con municipal en $0 por tasas null en la BD.
                                if (e.target.checked) {
                                    updateSettings({
                                        taxBreakdownEnabled: true,
                                        taxStateRate: settings.taxStateRate ?? 0.105,
                                        taxMunicipalRate: settings.taxMunicipalRate ?? 0.01,
                                        taxReducedRate: settings.taxReducedRate ?? 0.06,
                                    });
                                } else {
                                    updateSettings({ taxBreakdownEnabled: false });
                                }
                            }}
                            className="h-4 w-4"
                        />
                        Desglosar IVU en <strong>Estatal / Municipal / Reducido</strong> (Puerto Rico)
                    </label>
                    {settings.taxBreakdownEnabled && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Estatal (%)</label>
                                <input type="number" min="0" step="0.1" value={((settings.taxStateRate ?? 0.105) * 100)}
                                    onChange={(e) => updateSettings({ taxStateRate: Math.max(0, (parseFloat(e.target.value) || 0) / 100) })}
                                    className={inputFormStyle} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Municipal (%)</label>
                                <input type="number" min="0" step="0.1" value={((settings.taxMunicipalRate ?? 0.01) * 100)}
                                    onChange={(e) => updateSettings({ taxMunicipalRate: Math.max(0, (parseFloat(e.target.value) || 0) / 100) })}
                                    className={inputFormStyle} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Reducida (%)</label>
                                <input type="number" min="0" step="0.1" value={((settings.taxReducedRate ?? 0.06) * 100)}
                                    onChange={(e) => updateSettings({ taxReducedRate: Math.max(0, (parseFloat(e.target.value) || 0) / 100) })}
                                    className={inputFormStyle} />
                            </div>
                            <div className="sm:col-span-3 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => updateSettings({ taxStateRate: 0.105, taxMunicipalRate: 0.01, taxReducedRate: 0.06 })}
                                    className="text-xs text-primary hover:underline"
                                    title="Restablecer a las tasas estándar de Puerto Rico (10.5% / 1% / 6%)"
                                >
                                    ↺ Volver al default (PR: 10.5% / 1% / 6%)
                                </button>
                            </div>
                        </div>
                    )}
                    <p className="text-xs text-neutral-500 mt-2">
                        Con el desglose activo, los productos normales pagan Estatal + Municipal; los de <strong>departamentos o categorías marcados como "tasa reducida"</strong> pagan la tasa Reducida en su propia línea. Sin el desglose, se usa el IVU por producto/global de siempre.
                    </p>
                </section>

                {/* Recordatorios de cobro (clientes con crédito vencido) */}
                <section className="bg-white dark:bg-neutral-800 p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold text-neutral-700 dark:text-neutral-200 mb-4 flex items-center border-b pb-2 dark:border-neutral-700">
                        📨 <span className="ml-2">Recordatorios de cobro</span>
                    </h2>
                    <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200 mb-3">
                        <input
                            type="checkbox"
                            checked={!!settings.creditReminderEnabled}
                            onChange={(e) => updateSettings({ creditReminderEnabled: e.target.checked })}
                            className="h-4 w-4"
                        />
                        Enviar avisos automáticos por correo a clientes con crédito vencido
                    </label>
                    {settings.creditReminderEnabled && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Días de gracia tras el vencimiento</label>
                                <input type="number" min="0" step="1" value={settings.creditReminderDaysAfterDue ?? 0}
                                    onChange={(e) => updateSettings({ creditReminderDaysAfterDue: Math.max(0, parseInt(e.target.value) || 0) })}
                                    className={inputFormStyle} />
                                <p className="text-xs text-neutral-400 mt-1">Espera estos días después de la fecha de vencimiento antes del primer aviso.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">Reenviar cada (días)</label>
                                <input type="number" min="1" step="1" value={settings.creditReminderRepeatDays ?? 7}
                                    onChange={(e) => updateSettings({ creditReminderRepeatDays: Math.max(1, parseInt(e.target.value) || 1) })}
                                    className={inputFormStyle} />
                                <p className="text-xs text-neutral-400 mt-1">Si sigue sin pagar, se vuelve a enviar cada tantos días.</p>
                            </div>
                        </div>
                    )}
                    <p className="text-xs text-neutral-500 mt-3">
                        Se envía un correo al cliente con el detalle de sus facturas a crédito vencidas y el saldo total. El envío corre automáticamente en segundo plano. <strong>WhatsApp</strong> requiere conectar un proveedor de mensajería (pendiente).
                    </p>
                </section>
            </div>
        </div>
    );
};
