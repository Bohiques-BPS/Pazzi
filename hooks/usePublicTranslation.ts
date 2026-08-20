import { TRANSLATIONS } from '../contexts/GlobalSettingsContext';

/**
 * Traducción para páginas PÚBLICAS (sin login): el idioma se auto-detecta del navegador del
 * visitante (navegador en inglés → 'en'; si no → 'es'). Reutiliza el mismo diccionario TRANSLATIONS.
 * Si una clave falta en el idioma, cae al español (nunca muestra la clave cruda).
 */
export function publicLang(): 'es' | 'en' {
    try {
        return (navigator.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
    } catch {
        return 'es';
    }
}

export function usePublicT() {
    const lang = publicLang();
    return (key: string, params?: Record<string, string | number>): string => {
        // @ts-ignore — índice dinámico sobre el diccionario
        let text: string = (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || TRANSLATIONS.es[key] || key;
        if (params) {
            for (const [k, v] of Object.entries(params)) text = text.replace(`{${k}}`, String(v));
        }
        return text;
    };
}
