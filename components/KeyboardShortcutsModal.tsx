import React from 'react';
import { Modal } from './Modal';
import { useTranslation } from '../contexts/GlobalSettingsContext';

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

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  const GROUPS: ShortcutGroup[] = [
    {
      title: t('cmp.shortcuts.group.global'),
      items: [
        { keys: ['Shift', '?'], description: t('cmp.shortcuts.show_help') },
        { keys: ['Ctrl', 'K'], description: t('cmp.shortcuts.global_search') },
        { keys: ['Alt', '1'], description: t('cmp.shortcuts.goto_dashboard') },
        { keys: ['Alt', '2'], description: t('cmp.shortcuts.goto_products') },
        { keys: ['Alt', '3'], description: t('cmp.shortcuts.goto_clients') },
        { keys: ['Alt', '4'], description: t('cmp.shortcuts.goto_pos') },
        { keys: ['Alt', '5'], description: t('cmp.shortcuts.goto_projects') },
        { keys: ['Esc'], description: t('cmp.shortcuts.close_modal') },
      ],
    },
    {
      title: t('cmp.shortcuts.group.forms'),
      items: [
        { keys: ['Ctrl', 'S'], description: t('common.save') },
        { keys: ['Esc'], description: t('cmp.shortcuts.cancel_close') },
      ],
    },
    {
      title: t('cmp.shortcuts.group.pos'),
      items: [
        { keys: ['F2'], description: t('cmp.shortcuts.pos_charge') },
        { keys: ['F3'], description: t('cmp.shortcuts.pos_hold') },
        { keys: ['F4'], description: t('cmp.shortcuts.pos_find_client') },
        { keys: ['F5'], description: t('cmp.shortcuts.pos_discount') },
        { keys: ['F8'], description: t('cmp.shortcuts.pos_cancel_sale') },
        { keys: ['F9'], description: t('cmp.shortcuts.pos_open_close') },
        { keys: ['Ctrl', 'R'], description: t('cmp.shortcuts.pos_return') },
        { keys: ['Ctrl', 'L'], description: t('cmp.shortcuts.pos_layaway') },
      ],
    },
    {
      title: t('cmp.shortcuts.group.tables'),
      items: [
        { keys: ['Ctrl', 'N'], description: t('cmp.shortcuts.table_new') },
        { keys: ['Ctrl', 'F'], description: t('cmp.shortcuts.table_search') },
        { keys: ['/'], description: t('cmp.shortcuts.table_focus_search') },
      ],
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('cmp.shortcuts.title')} size="2xl">
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
        {t('cmp.shortcuts.tip_before')} <KeyChip k="Ctrl" /> {t('cmp.shortcuts.tip_by')} <KeyChip k="⌘" />.
      </p>
    </Modal>
  );
};
