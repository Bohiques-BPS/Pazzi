import React, { Suspense, lazy } from 'react';
import { useGlobalSettings } from '../../contexts/GlobalSettingsContext';
import { POSCashierPage } from './POSCashierPage';

const ModernCashierPage = lazy(() => import('./ModernCashierPage').then(m => ({ default: m.ModernCashierPage })));

/**
 * Caja Registradora: muestra el modelo de caja que el gerente eligió en Administración
 * (Configuración de módulos › Caja Registradora › Modelo de caja). Por defecto, la clásica.
 */
export const CashierEntry: React.FC = () => {
    const { settings } = useGlobalSettings();
    if ((settings as any)?.posCashierModel === 'modern') {
        return (
            <Suspense fallback={<div className="h-screen flex items-center justify-center text-neutral-500">Cargando caja…</div>}>
                <ModernCashierPage />
            </Suspense>
        );
    }
    return <POSCashierPage />;
};

export default CashierEntry;
