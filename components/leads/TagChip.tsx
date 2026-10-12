import React from 'react';
import type { LeadTag } from '../../types';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

/** Chip de etiqueta con color (contraste legible en claro/oscuro). */
export const TagChip: React.FC<{ tag: LeadTag; onRemove?: () => void; small?: boolean }> = ({ tag, onRemove, small }) => {
  const { t } = useTranslation();
  const color = tag.color || '#64748b';
  return (
    <span
      translate="no"
      className={`notranslate inline-flex items-center gap-1 rounded-full font-medium ${small ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5'}`}
      style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}
    >
      <span>{tag.name}</span>
      {onRemove && (
        <button type="button" onClick={onRemove} className="leading-none opacity-70 hover:opacity-100" aria-label={t('leads.board.tag_remove', { name: tag.name })}>×</button>
      )}
    </span>
  );
};
