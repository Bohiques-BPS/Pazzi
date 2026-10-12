import React from 'react';
import type { LeadTag } from '../../types';
import { XMarkIcon } from '../icons';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

/** Chip de etiqueta con color (mismo formato que los badges de la app; contraste legible en claro/oscuro). */
export const TagChip: React.FC<{ tag: LeadTag; onRemove?: () => void; small?: boolean }> = ({ tag, onRemove, small }) => {
  const { t } = useTranslation();
  const color = tag.color || '#64748b';
  return (
    <span
      translate="no"
      className={`notranslate inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap ${small ? 'text-[10px] px-2 py-0.5' : 'text-[11px] px-2.5 py-1'}`}
      style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}
    >
      <span>{tag.name}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} className="-mr-1 rounded-full p-0.5 opacity-70 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10" aria-label={t('leads.board.tag_remove', { name: tag.name })}>
          <XMarkIcon className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};
