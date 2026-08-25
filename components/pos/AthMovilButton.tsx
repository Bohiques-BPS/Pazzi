import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

interface AthMovilButtonProps {
    publicToken: string;
    environment: string;            // 'production' | 'sandbox'
    total: number;
    subtotal?: number;
    tax?: number;
    items?: { name: string; quantity: number; price: number }[];
    onSuccess: (reference: string) => void;
    onFail?: (msg: string) => void;
    /** Traducción a usar (en páginas públicas, el idioma del navegador del visitante). */
    t?: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * Botón oficial de pago de ATH Móvil (Web Checkout v3).
 *
 * El SDK (athmovilV3.js) lee el objeto global `ATHM_Checkout` y renderiza el botón
 * naranja dentro del contenedor `#ATHMovil_Checkout_Button`. El cliente ingresa su
 * número de teléfono, confirma el pago en su app ATH Móvil, y el SDK invoca los
 * callbacks globales; devolvemos la referencia via `onSuccess` (verificada server-side).
 *
 * IMPORTANTE: requiere HTTPS y un `publicToken` VÁLIDO cuyo `environment` coincida
 * (sandbox vs production). Si no calza, el SDK deja el contenedor vacío en silencio;
 * por eso vigilamos que el botón aparezca y, si no, mostramos un aviso.
 */
export const AthMovilButton: React.FC<AthMovilButtonProps> = ({
    publicToken, environment, total, subtotal, tax, items, onSuccess, onFail, t: tProp,
}) => {
    const { t: tHook } = useTranslation();
    const t = tProp || tHook;
    // Refs para que los callbacks globales siempre llamen la versión vigente.
    const onSuccessRef = useRef(onSuccess); onSuccessRef.current = onSuccess;
    const onFailRef = useRef(onFail); onFailRef.current = onFail;
    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

    // Clave estable: re-inicializa solo cuando cambian datos que importan (no la identidad del array).
    const itemsKey = (items || []).map(it => `${it.name}:${it.quantity}:${it.price}`).join('|');

    useEffect(() => {
        setStatus('loading');
        const round2 = (n: number) => Math.round(n * 100) / 100;
        // ATH Móvil EXIGE que total === subtotal + tax y que la suma de los ítems === subtotal.
        // Si no cuadra, el SDK NO renderiza el botón. Derivamos subtotal = total - tax.
        const totalR = round2(total);
        const tx = round2(tax != null ? tax : 0);
        const sub = round2(Math.max(0, totalR - tx));
        // Ítems para el SDK; si su suma no coincide con el subtotal (ej. abono parcial), usar 1 línea.
        let sdkItems = (items || []).map(it => ({
            name: (it.name || 'Item').slice(0, 50), description: '', quantity: String(it.quantity),
            price: round2(it.price).toFixed(2), tax: '0.00', metadata: '',
        }));
        const itemsSum = round2(sdkItems.reduce((s, it) => s + parseFloat(it.price) * parseInt(it.quantity, 10), 0));
        if (sdkItems.length === 0 || Math.abs(itemsSum - sub) > 0.01) {
            sdkItems = [{ name: 'Pago', description: '', quantity: '1', price: sub.toFixed(2), tax: '0.00', metadata: '' }];
        }
        // Configuración global que lee el SDK de ATH Móvil (debe existir ANTES de cargar el script).
        (window as any).ATHM_Checkout = {
            env: environment === 'sandbox' ? 'sandbox' : 'production',
            publicToken,
            timeout: 600,
            theme: 'btn',
            lang: 'es',
            total: totalR,
            subtotal: sub,
            tax: tx,
            items: sdkItems,
        };

        // Callbacks globales que invoca el SDK.
        const extractRef = (r: any) => String(r?.referenceNumber || r?.ecommerceId || r?.reference || 'ATH-OK');
        (window as any).authorizationATH = (auth: any) => onSuccessRef.current(extractRef(auth));
        (window as any).responseSuccessATH = (resp: any) => onSuccessRef.current(extractRef(resp));
        (window as any).responseFailATH = (r: any) => onFailRef.current?.(r?.message || t('cmpx.athmovil.failed'));
        (window as any).responseCancelATH = () => onFailRef.current?.(t('cmpx.athmovil.cancelled'));
        (window as any).responseExpiredATH = () => onFailRef.current?.(t('cmpx.athmovil.expired'));

        // (Re)cargar el SDK cada montaje para que renderice el botón contra el contenedor actual
        // con la config vigente (el SDK v3 monta el botón al ejecutarse el script).
        const CONTAINER = 'ATHMovil_Checkout_Button';
        document.getElementById('athmovil-sdk')?.remove();
        const s = document.createElement('script');
        s.id = 'athmovil-sdk';
        s.src = 'https://www.athmovil.com/api/js/v3/athmovilV3.js';
        s.async = true;
        s.onerror = () => { setStatus('error'); onFailRef.current?.(t('cmpx.athmovil.sdk_load_error')); };
        document.body.appendChild(s);

        // Vigilar que el SDK inserte el botón en el contenedor; si tras 6s sigue vacío → error visible.
        let elapsed = 0;
        const poll = window.setInterval(() => {
            const el = document.getElementById(CONTAINER);
            if (el && el.childElementCount > 0) { setStatus('ready'); window.clearInterval(poll); return; }
            elapsed += 400;
            if (elapsed >= 6000) { setStatus('error'); window.clearInterval(poll); }
        }, 400);

        return () => window.clearInterval(poll);
    }, [publicToken, environment, total, subtotal, tax, itemsKey]); // eslint-disable-line

    return (
        <div>
            {/* El SDK monta el botón dentro de este contenedor por su id EXACTO (no cambiar el id). */}
            <div id="ATHMovil_Checkout_Button" className="my-2" />
            {status === 'loading' && (
                <p className="text-sm text-neutral-500 text-center py-1">{t('cmpx.athmovil.loading')}</p>
            )}
            {status === 'error' && (
                <p className="text-sm text-red-600 dark:text-red-400 text-center py-1">{t('cmpx.athmovil.render_error')}</p>
            )}
        </div>
    );
};
