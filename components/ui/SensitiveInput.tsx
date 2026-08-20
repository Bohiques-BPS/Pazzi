import React, { useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '../icons';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

/**
 * Campo para datos SENSIBLES (número de cuenta, seguro social, etc.).
 * - Por defecto muestra solo los últimos 2 caracteres; el resto enmascarado con "•".
 * - El valor completo solo se revela (y se puede editar) al pulsar el ojito.
 * - Drop-in: mismas props que un <input> controlado (name/value/onChange/className).
 *
 * Nota: el enmascarado es solo visual (anti "mirar por encima del hombro"). El valor real
 * sigue viajando al cliente porque el formulario debe permitir editarlo.
 */

/** Enmascara todo menos los últimos 2 caracteres. */
function maskValue(v: string): string {
  const s = v || '';
  if (s.length <= 2) return '•'.repeat(s.length);
  return '•'.repeat(Math.min(s.length - 2, 12)) + s.slice(-2);
}

interface SensitiveInputProps {
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

export const SensitiveInput: React.FC<SensitiveInputProps> = ({
  name, value, onChange, placeholder, className = '', id, disabled,
}) => {
  const { t } = useTranslation();
  // Existente (con valor) → oculto por defecto. Nuevo (vacío) → editable de una vez.
  const [revealed, setRevealed] = useState<boolean>(() => !value);

  const showReal = revealed || !value;

  return (
    <div className="relative">
      <input
        type="text"
        id={id}
        name={name}
        value={showReal ? value : maskValue(value)}
        onChange={onChange}
        readOnly={!showReal}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        aria-label={placeholder}
        className={`${className} pr-10 ${!showReal ? 'font-mono tracking-widest cursor-default select-none' : ''}`}
      />
      <button
        type="button"
        onClick={() => setRevealed(r => !r)}
        disabled={disabled}
        className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 disabled:opacity-50"
        aria-label={revealed ? t('cmp.sensitive.hide') : t('cmp.sensitive.show')}
        title={revealed ? t('cmp.sensitive.hide') : t('cmp.sensitive.show')}
        tabIndex={-1}
      >
        {revealed ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
      </button>
    </div>
  );
};
