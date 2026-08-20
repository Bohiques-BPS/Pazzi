import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '../Modal';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

interface CameraScanModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Se llama con el texto del código (barras/QR) al detectarlo. */
    onDetected: (code: string) => void;
    title?: string;
}

/**
 * Escáner de códigos de barras / QR usando la cámara del dispositivo (ZXing).
 * Prefiere la cámara trasera (facingMode: environment). Requiere HTTPS o localhost.
 * Reutilizable en cualquier flujo que necesite capturar un código con el teléfono.
 */
export const CameraScanModal: React.FC<CameraScanModalProps> = ({ isOpen, onClose, onDetected, title }) => {
    const { t } = useTranslation();
    const resolvedTitle = title ?? t('cmpx.camera.title');
    const videoRef = useRef<HTMLVideoElement>(null);
    const controlsRef = useRef<IScannerControls | null>(null);
    // Ref al callback para no reiniciar la cámara si el padre pasa una función nueva por render.
    const onDetectedRef = useRef(onDetected);
    onDetectedRef.current = onDetected;

    const [error, setError] = useState<string | null>(null);
    const [starting, setStarting] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        const reader = new BrowserMultiFormatReader();
        setError(null);
        setStarting(true);

        const start = async () => {
            try {
                const controls = await reader.decodeFromConstraints(
                    { video: { facingMode: { ideal: 'environment' } } },
                    videoRef.current!,
                    (result, _err, ctrls) => {
                        if (cancelled || !result) return; // NotFoundException por frame vacío se ignora
                        const text = result.getText();
                        if (!text) return;
                        try { navigator.vibrate?.(120); } catch { /* no soportado */ }
                        ctrls?.stop();
                        onDetectedRef.current(text);
                    },
                );
                if (cancelled) { controls.stop(); return; }
                controlsRef.current = controls;
                setStarting(false);
            } catch (e: any) {
                if (cancelled) return;
                console.error('Error iniciando la cámara:', e);
                setStarting(false);
                if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') {
                    setError(t('cmpx.camera.err_denied'));
                } else if (e?.name === 'NotFoundError' || e?.name === 'OverconstrainedError') {
                    setError(t('cmpx.camera.err_not_found'));
                } else if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
                    setError(t('cmpx.camera.err_https'));
                } else {
                    setError(t('cmpx.camera.err_generic'));
                }
            }
        };
        start();

        return () => {
            cancelled = true;
            try { controlsRef.current?.stop(); } catch { /* ya detenida */ }
            controlsRef.current = null;
        };
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={resolvedTitle} size="md">
            <div className="space-y-3">
                {error ? (
                    <div className="rounded-md bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
                        {error}
                    </div>
                ) : (
                    <div className="relative w-full overflow-hidden rounded-lg bg-black aspect-[4/3]">
                        <video
                            ref={videoRef}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                            autoPlay
                        />
                        {/* Marco guía de escaneo */}
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <div className="w-3/4 h-1/3 border-2 border-white/80 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                        </div>
                        {starting && (
                            <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
                                {t('cmpx.camera.starting')}
                            </div>
                        )}
                    </div>
                )}
                <p className="text-xs text-center text-neutral-500 dark:text-neutral-400">
                    {t('cmpx.camera.hint')}
                </p>
            </div>
        </Modal>
    );
};
