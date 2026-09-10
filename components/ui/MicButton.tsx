import React, { useRef } from 'react';
import { MicrophoneIcon } from '../icons';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition';

interface MicButtonProps {
    /** Modo simple (append): recibe cada frase FINALIZADA para acumular donde el consumidor quiera. */
    onText?: (text: string) => void;
    /** Modo EN VIVO (controlado): valor actual del campo. Requiere onChange. */
    value?: string;
    /** Modo EN VIVO: escribe el texto (finales + provisional) en el campo mientras se habla. */
    onChange?: (value: string) => void;
    title?: string;
    className?: string;
    lang?: string;
}

/** Une dos textos con un espacio, evitando espacios dobles. */
const join = (a: string, b: string) => {
    const left = (a || '').replace(/\s+$/, '');
    const right = (b || '').replace(/^\s+/, '');
    if (!left) return right;
    if (!right) return left;
    return `${left} ${right}`;
};

/**
 * Botón de micrófono para dictado por voz (Web Speech API). Se oculta si el navegador no lo soporta.
 * - Modo EN VIVO (value + onChange): escribe mientras hablas, incluyendo el texto provisional.
 * - Modo append (onText): entrega solo las frases finalizadas (útil para editores HTML).
 */
export const MicButton: React.FC<MicButtonProps> = ({ onText, value, onChange, title, className, lang }) => {
    const liveMode = typeof onChange === 'function' && typeof value === 'string';

    // Estado de la sesión de dictado en modo vivo.
    const baseRef = useRef('');        // texto que ya había en el campo al empezar a grabar
    const finalRef = useRef('');       // frases finalizadas acumuladas en esta sesión
    const valueRef = useRef(value);    // último valor del campo (para capturar la base al iniciar)
    valueRef.current = value;

    const { supported, listening, start, stop } = useSpeechRecognition({
        lang,
        onFinal: (t) => {
            if (liveMode) {
                finalRef.current = join(finalRef.current, t);
                onChange!(join(baseRef.current, finalRef.current));
            } else {
                onText?.(t);
            }
        },
        onInterim: (t) => {
            if (liveMode && t) {
                onChange!(join(join(baseRef.current, finalRef.current), t));
            }
        },
    });

    const handleToggle = () => {
        if (listening) { stop(); return; }
        if (liveMode) {
            baseRef.current = valueRef.current || '';
            finalRef.current = '';
        }
        start();
    };

    if (!supported) return null;

    return (
        <button
            type="button"
            // preventDefault en mousedown: evita que el botón le quite el foco al input/textarea
            // (ese blur cerraba el formulario de "crear tarea" antes de que empezara el dictado).
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleToggle}
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
            {listening ? <span className="text-xs">Grabando… (toca para parar)</span> : null}
        </button>
    );
};
