import { useEffect, useCallback } from 'react';

interface Shortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  alt?: boolean;
  shift?: boolean;
  handler: () => void;
  enabled?: boolean;
}

export const useKeyboardShortcuts = (shortcuts: Shortcut[]) => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      if (shortcut.enabled === false) continue;

      const ctrlOrMeta = shortcut.ctrl || shortcut.meta;
      const metaPressed = e.metaKey || e.ctrlKey;

      if (ctrlOrMeta && !metaPressed) continue;
      if (!ctrlOrMeta && metaPressed) continue;
      if (shortcut.alt && !e.altKey) continue;
      if (!shortcut.alt && e.altKey) continue;
      if (shortcut.shift && !e.shiftKey) continue;

      if (e.key.toLowerCase() === shortcut.key.toLowerCase()) {
        e.preventDefault();
        e.stopPropagation();
        shortcut.handler();
        return;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
};
