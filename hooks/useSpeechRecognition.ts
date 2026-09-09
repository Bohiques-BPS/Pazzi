import { useCallback, useEffect, useRef, useState } from 'react';

interface Options {
    /** Idioma del dictado (por defecto español). */
    lang?: string;
    /** Se llama con cada fragmento de texto FINALIZADO (para acumular en el campo). */
    onFinal?: (text: string) => void;
    /** Se llama con el texto provisional mientras se habla (opcional, para vista previa). */
    onInterim?: (text: string) => void;
}

/**
 * Dictado por voz usando la Web Speech API del navegador (SpeechRecognition).
 * No usa backend. Soportado en Chrome/Edge (y navegadores basados en Chromium); si no está
 * soportado, `supported` es false y el consumidor puede ocultar el botón.
 */
export function useSpeechRecognition({ lang = 'es-ES', onFinal, onInterim }: Options = {}) {
    const [supported] = useState(
        () => typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
    );
    const [listening, setListening] = useState(false);
    const recRef = useRef<any>(null);
    // Refs para no recrear el reconocedor cuando cambian los callbacks.
    const onFinalRef = useRef(onFinal); onFinalRef.current = onFinal;
    const onInterimRef = useRef(onInterim); onInterimRef.current = onInterim;

    const stop = useCallback(() => {
        try { recRef.current?.stop(); } catch { /* noop */ }
        setListening(false);
    }, []);

    const start = useCallback(() => {
        if (!supported) return;
        // Si ya hay uno activo, no abras otro.
        if (recRef.current) { try { recRef.current.stop(); } catch { /* noop */ } }
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const rec = new SR();
        rec.lang = lang;
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (e: any) => {
            let interim = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                const r = e.results[i];
                const txt = (r[0]?.transcript || '');
                if (r.isFinal) {
                    const clean = txt.trim();
                    if (clean) onFinalRef.current?.(clean);
                } else {
                    interim += txt;
                }
            }
            onInterimRef.current?.(interim.trim());
        };
        rec.onend = () => { setListening(false); recRef.current = null; };
        rec.onerror = () => { setListening(false); recRef.current = null; };
        recRef.current = rec;
        try { rec.start(); setListening(true); } catch { setListening(false); }
    }, [supported, lang]);

    const toggle = useCallback(() => {
        if (listening) stop(); else start();
    }, [listening, start, stop]);

    // Limpieza al desmontar.
    useEffect(() => () => { try { recRef.current?.stop(); } catch { /* noop */ } }, []);

    return { supported, listening, start, stop, toggle };
}
