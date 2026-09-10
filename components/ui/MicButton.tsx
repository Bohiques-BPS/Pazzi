import React from 'react';
import { MicrophoneIcon } from '../icons';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';

interface MicButtonProps {
    /** Recibe cada fragmento de texto dictado (ya finalizado) para acumular en el campo. */
    onText: (text: string) => void;
    /** Texto provisional mientras se habla (opcional). */
    onInterim?: (text: string) => void;
    title?: string;
    className?: string;
    lang?: string;
}

/**
 * Botón de micrófono para dictado por voz. Se oculta solo si el navegador no soporta la API.
 * Al hablar, va llamando `onText` con cada frase reconocida (el consumidor decide dónde ponerla).
 */
export const MicButton: React.FC<MicButtonProps> = ({ onText, onInterim, title, className, lang }) => {
    const { supported, listening, toggle } = useSpeechRecognition({
        lang,
        onFinal: (t) => { if (t) onText(t); },
        onInterim,
    });

    if (!supported) return null;

    return (
        <button
            type="button"
            // preventDefault en mousedown: evita que el botón le quite el foco al input/textarea
            // (ese blur cerraba el formulario de "crear tarea" antes de que empezara el dictado).
            onMouseDown={(e) => e.preventDefault()}
            onClick={toggle}
            title={title || (listening ? 'Detener dictado' : 'Dictar por voz')}
            aria-label={title || 'Dictar por voz'}
            aria-pressed={listening}
            className={`inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-sm font-medium transition-colors flex-shrink-0 ${
                listening
                    ? 'bg-red-500 border-red-500 text-white animate-pulse'
                    : 'border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-300 hover:text-primary hover:border-primary hover:bg-primary/10'
            } ${className || ''}`}
        >
            <MicrophoneIcon className="w-5 h-5" />
            {listening && <span className="text-xs">Grabando…</span>}
        </button>
    );
};
