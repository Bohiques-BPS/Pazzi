import React, { useEffect, useRef } from 'react';

interface AthMovilButtonProps {
    publicToken: string;
    environment: string;            // 'production' | 'sandbox'
    total: number;
    subtotal?: number;
    tax?: number;
    items?: { name: string; quantity: number; price: number }[];
    onSuccess: (reference: string) => void;
    onFail?: (msg: string) => void;
}

/**
 * Botón oficial de pago de ATH Móvil (Web Checkout v3).
 *
 * Requiere un `publicToken` válido de ATH Móvil Business. El cliente confirma el
 * pago en su app ATH Móvil; el SDK invoca los callbacks globales y devolvemos el
 * número de referencia via `onSuccess`.
 *
 * NOTA: no se puede probar en vivo sin credenciales reales. Para producción se
 * recomienda además VERIFICAR la transacción en el backend con el `privateToken`
 * (endpoint de ATH Móvil) antes de dar la venta por pagada.
 */
export const AthMovilButton: React.FC<AthMovilButtonProps> = ({
    publicToken, environment, total, subtotal, tax, items, onSuccess, onFail,
}) => {
    // Refs para que los callbacks globales siempre llamen la versión vigente.
    const onSuccessRef = useRef(onSuccess); onSuccessRef.current = onSuccess;
    const onFailRef = useRef(onFail); onFailRef.current = onFail;
    const scriptLoaded = useRef(false);

    useEffect(() => {
        const sub = subtotal != null ? subtotal : total;
        const tx = tax != null ? tax : 0;
        // Configuración global que lee el SDK de ATH Móvil.
        (window as any).ATHM_Checkout = {
            env: environment === 'sandbox' ? 'sandbox' : 'production',
            publicToken,
            timeout: 600,
            theme: 'btn',
            lang: 'es',
            total: Number(total.toFixed(2)),
            subtotal: Number(sub.toFixed(2)),
            tax: Number(tx.toFixed(2)),
            items: (items || []).map(it => ({
                name: it.name.slice(0, 50), description: '', quantity: String(it.quantity),
                price: it.price.toFixed(2), tax: '0.00', metadata: '',
            })),
        };

        // Callbacks globales que invoca el SDK.
        const extractRef = (r: any) => String(r?.referenceNumber || r?.ecommerceId || r?.reference || 'ATH-OK');
        (window as any).authorizationATH = (auth: any) => onSuccessRef.current(extractRef(auth));
        (window as any).responseSuccessATH = (resp: any) => onSuccessRef.current(extractRef(resp));
        (window as any).responseFailATH = (r: any) => onFailRef.current?.(r?.message || 'Pago ATH Móvil fallido.');
        (window as any).responseCancelATH = () => onFailRef.current?.('Pago ATH Móvil cancelado.');
        (window as any).responseExpiredATH = () => onFailRef.current?.('Pago ATH Móvil expirado.');

        if (!scriptLoaded.current) {
            scriptLoaded.current = true;
            const s = document.createElement('script');
            s.src = 'https://www.athmovil.com/api/js/v3/athmovilV3.js';
            s.async = true;
            s.onerror = () => onFailRef.current?.('No se pudo cargar el SDK de ATH Móvil.');
            document.body.appendChild(s);
        }
    }, [publicToken, environment, total, subtotal, tax, items]);

    // El SDK monta el botón dentro de este contenedor por su id.
    return <div id="ATHMovil_Checkout_Button_payment" className="my-2" />;
};
