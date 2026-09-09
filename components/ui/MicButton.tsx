import React from 'react';
import { MicrophoneIcon, MicrophoneSlashIcon } from '../icons';
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
            onClick={toggle}
            title={title || (listening ? 'Detener dictado' : 'Dictar por voz')}
            aria-label={title || 'Dictar por voz'}
            aria-pressed={listening}
            className={`inline-flex items-center justify-center rounded-md p-1.5 transition-colors ${
                listening
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'text-neutral-500 hover:text-primary hover:bg-primary/10 dark:text-neutral-400'
            } ${className || ''}`}
        >
            {listening ? <MicrophoneSlashIcon className="w-5 h-5" /> : <MicrophoneIcon className="w-5 h-5" />}
        </button>
    );
};
