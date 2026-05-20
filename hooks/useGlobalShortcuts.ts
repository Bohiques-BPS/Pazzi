import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Atajos de teclado de nivel app.
 * Llamar UNA SOLA VEZ en el AppContent.
 *
 * Atajos:
 *   Shift + ?      → abrir modal de ayuda (onShowHelp)
 *   Ctrl/⌘ + K     → abrir búsqueda global (onSearch)
 *   Alt + 1..5     → navegar a módulos principales
 *   Esc            → es manejado por cada Modal individual (no aquí)
 *
 * Los atajos se desactivan automáticamente cuando el foco está en input/textarea/contentEditable
 * (excepto los que usan modificadores como Ctrl).
 */

interface UseGlobalShortcutsOpts {
  onShowHelp?: () => void;
  onSearch?: () => void;
  enabled?: boolean;
}

const isTypingInElement = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
};

export function useGlobalShortcuts({ onShowHelp, onSearch, enabled = true }: UseGlobalShortcutsOpts) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      const ctrlOrMeta = e.ctrlKey || e.metaKey;
      const typing = isTypingInElement(e.target);

      // Shift+? → help (key === '?' o Shift+'/' según layout)
      if (e.shiftKey && (e.key === '?' || e.key === '/') && !ctrlOrMeta && !typing) {
        e.preventDefault();
        onShowHelp?.();
        return;
      }

      // Ctrl/⌘ + K → búsqueda global
      if (ctrlOrMeta && !e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onSearch?.();
        return;
      }

      // Alt + 1..5 → módulos
      if (e.altKey && !ctrlOrMeta && !e.shiftKey) {
        const moduleByKey: Record<string, string> = {
          '1': '/',
          '2': '/pm/products',
          '3': '/pm/clients',
          '4': '/pos/cashier',
          '5': '/pm/projects',
        };
        const target = moduleByKey[e.key];
        if (target) {
          e.preventDefault();
          navigate(target);
        }
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [navigate, onShowHelp, onSearch, enabled]);
}
