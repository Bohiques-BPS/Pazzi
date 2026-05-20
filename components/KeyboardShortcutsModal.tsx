import React from 'react';
import { Modal } from './Modal';

/**
 * Modal con la lista de atajos de teclado disponibles, agrupados por contexto.
 * Se abre con Shift+? a nivel global.
 */

interface ShortcutSpec {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  title: string;
  items: ShortcutSpec[];
}

const GROUPS: ShortcutGroup[] = [
  {
    title: 'Globales',
    items: [
      { keys: ['Shift', '?'], description: 'Mostrar esta ayuda de atajos' },
      { keys: ['Ctrl', 'K'], description: 'Búsqueda global' },
      { keys: ['Alt', '1'], description: 'Ir a Dashboard' },
      { keys: ['Alt', '2'], description: 'Ir a Productos' },
      { keys: ['Alt', '3'], description: 'Ir a Clientes' },
      { keys: ['Alt', '4'], description: 'Ir a POS' },
      { keys: ['Alt', '5'], description: 'Ir a Proyectos' },
      { keys: ['Esc'], description: 'Cerrar modal abierto' },
    ],
  },
  {
    title: 'Formularios',
    items: [
      { keys: ['Ctrl', 'S'], description: 'Guardar' },
      { keys: ['Esc'], description: 'Cancelar / Cerrar' },
    ],
  },
  {
    title: 'POS (Caja)',
    items: [
      { keys: ['F2'], description: 'Cobrar' },
      { keys: ['F3'], description: 'Poner carrito en espera' },
      { keys: ['F4'], description: 'Buscar cliente' },
      { keys: ['F5'], description: 'Aplicar descuento' },
      { keys: ['F8'], description: 'Cancelar venta' },
      { keys: ['F9'], description: 'Abrir/cerrar caja' },
      { keys: ['Ctrl', 'R'], description: 'Devolución' },
      { keys: ['Ctrl', 'L'], description: 'Apartado (layaway)' },
    ],
  },
  {
    title: 'Tablas y listas',
    items: [
      { keys: ['Ctrl', 'N'], description: 'Nuevo registro (contextual)' },
      { keys: ['Ctrl', 'F'], description: 'Buscar en la tabla' },
      { keys: ['/'], description: 'Foco en el buscador' },
    ],
  },
];

interface KeyProps {
  k: string;
}

const KeyChip: React.FC<KeyProps> = ({ k }) => (
  <kbd className="inline-flex items-center justify-center min-w-[1.75rem] px-1.5 py-0.5 text-xs font-mono font-semibold rounded border border-neutral-300 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 shadow-sm">
    {k}
  </kbd>
);

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Atajos de teclado" size="2xl">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[65vh] overflow-y-auto">
      {GROUPS.map(group => (
        <div key={group.title} className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-600 dark:text-neutral-300 border-b border-neutral-200 dark:border-neutral-700 pb-1">
            {group.title}
          </h4>
          <ul className="space-y-1.5">
            {group.items.map((s, i) => (
              <li key={i} className="flex items-center justify-between gap-3 text-sm text-neutral-700 dark:text-neutral-300">
                <span>{s.description}</span>
                <span className="flex items-center gap-1 flex-shrink-0">
                  {s.keys.map((k, j) => (
                    <React.Fragment key={j}>
                      <KeyChip k={k} />
                      {j < s.keys.length - 1 && <span className="text-neutral-400 text-xs">+</span>}
                    </React.Fragment>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-4">
      Tip: en macOS, sustituye <KeyChip k="Ctrl" /> por <KeyChip k="⌘" />.
    </p>
  </Modal>
);
