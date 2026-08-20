import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

/**
 * Entrada de teléfono internacional (estilo intl-tel-input) SIN botón "Verify".
 * - Selector de país buscable con bandera (emoji) + nombre + código de marcación.
 * - Guarda el valor como string único: `+<dial> <número nacional>` (p.ej. "+1 7875551234").
 * - Drop-in para campos de teléfono existentes: recibe `value: string` y `onChange(value: string)`.
 *
 * Parseo: si el valor entra con "+", detecta el país por el prefijo de marcación más largo que
 * coincida; si entra sin "+", asume el país por defecto (Puerto Rico +1) y lo trata como nacional.
 */

export interface Country {
  iso: string;
  name: string;
  dial: string; // sin el "+"
  flag: string; // emoji
}

// Lista amplia (Américas + Europa + principales de Asia/África/Oceanía). Puerto Rico primero.
export const COUNTRIES: Country[] = [
  { iso: 'PR', name: 'Puerto Rico', dial: '1', flag: '🇵🇷' },
  { iso: 'US', name: 'United States', dial: '1', flag: '🇺🇸' },
  { iso: 'DO', name: 'República Dominicana', dial: '1', flag: '🇩🇴' },
  { iso: 'MX', name: 'México', dial: '52', flag: '🇲🇽' },
  { iso: 'CO', name: 'Colombia', dial: '57', flag: '🇨🇴' },
  { iso: 'ES', name: 'España', dial: '34', flag: '🇪🇸' },
  { iso: 'AR', name: 'Argentina', dial: '54', flag: '🇦🇷' },
  { iso: 'VE', name: 'Venezuela', dial: '58', flag: '🇻🇪' },
  { iso: 'PE', name: 'Perú', dial: '51', flag: '🇵🇪' },
  { iso: 'CL', name: 'Chile', dial: '56', flag: '🇨🇱' },
  { iso: 'EC', name: 'Ecuador', dial: '593', flag: '🇪🇨' },
  { iso: 'GT', name: 'Guatemala', dial: '502', flag: '🇬🇹' },
  { iso: 'CU', name: 'Cuba', dial: '53', flag: '🇨🇺' },
  { iso: 'BO', name: 'Bolivia', dial: '591', flag: '🇧🇴' },
  { iso: 'HN', name: 'Honduras', dial: '504', flag: '🇭🇳' },
  { iso: 'PY', name: 'Paraguay', dial: '595', flag: '🇵🇾' },
  { iso: 'SV', name: 'El Salvador', dial: '503', flag: '🇸🇻' },
  { iso: 'NI', name: 'Nicaragua', dial: '505', flag: '🇳🇮' },
  { iso: 'CR', name: 'Costa Rica', dial: '506', flag: '🇨🇷' },
  { iso: 'PA', name: 'Panamá', dial: '507', flag: '🇵🇦' },
  { iso: 'UY', name: 'Uruguay', dial: '598', flag: '🇺🇾' },
  { iso: 'BR', name: 'Brasil', dial: '55', flag: '🇧🇷' },
  { iso: 'CA', name: 'Canada', dial: '1', flag: '🇨🇦' },
  { iso: 'GB', name: 'United Kingdom', dial: '44', flag: '🇬🇧' },
  { iso: 'FR', name: 'France', dial: '33', flag: '🇫🇷' },
  { iso: 'DE', name: 'Germany (Deutschland)', dial: '49', flag: '🇩🇪' },
  { iso: 'IT', name: 'Italy (Italia)', dial: '39', flag: '🇮🇹' },
  { iso: 'PT', name: 'Portugal', dial: '351', flag: '🇵🇹' },
  { iso: 'NL', name: 'Netherlands', dial: '31', flag: '🇳🇱' },
  { iso: 'BE', name: 'Belgium', dial: '32', flag: '🇧🇪' },
  { iso: 'CH', name: 'Switzerland', dial: '41', flag: '🇨🇭' },
  { iso: 'IE', name: 'Ireland', dial: '353', flag: '🇮🇪' },
  { iso: 'SE', name: 'Sweden', dial: '46', flag: '🇸🇪' },
  { iso: 'NO', name: 'Norway', dial: '47', flag: '🇳🇴' },
  { iso: 'DK', name: 'Denmark', dial: '45', flag: '🇩🇰' },
  { iso: 'FI', name: 'Finland', dial: '358', flag: '🇫🇮' },
  { iso: 'PL', name: 'Poland', dial: '48', flag: '🇵🇱' },
  { iso: 'RU', name: 'Russia', dial: '7', flag: '🇷🇺' },
  { iso: 'CN', name: 'China', dial: '86', flag: '🇨🇳' },
  { iso: 'JP', name: 'Japan', dial: '81', flag: '🇯🇵' },
  { iso: 'KR', name: 'South Korea', dial: '82', flag: '🇰🇷' },
  { iso: 'IN', name: 'India (भारत)', dial: '91', flag: '🇮🇳' },
  { iso: 'PH', name: 'Philippines', dial: '63', flag: '🇵🇭' },
  { iso: 'AU', name: 'Australia', dial: '61', flag: '🇦🇺' },
  { iso: 'NZ', name: 'New Zealand', dial: '64', flag: '🇳🇿' },
  { iso: 'ZA', name: 'South Africa', dial: '27', flag: '🇿🇦' },
  { iso: 'NG', name: 'Nigeria', dial: '234', flag: '🇳🇬' },
  { iso: 'EG', name: 'Egypt', dial: '20', flag: '🇪🇬' },
  { iso: 'MA', name: 'Morocco', dial: '212', flag: '🇲🇦' },
  { iso: 'AE', name: 'United Arab Emirates', dial: '971', flag: '🇦🇪' },
  { iso: 'SA', name: 'Saudi Arabia', dial: '966', flag: '🇸🇦' },
  { iso: 'IL', name: 'Israel', dial: '972', flag: '🇮🇱' },
  { iso: 'TR', name: 'Turkey', dial: '90', flag: '🇹🇷' },
];

const DEFAULT_ISO = 'PR';

// Ordena por longitud de dial desc para hallar el prefijo más largo que coincida.
const BY_DIAL_LEN = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);

function parseValue(value: string): { country: Country; national: string } {
  const def = COUNTRIES.find(c => c.iso === DEFAULT_ISO)!;
  const raw = (value || '').trim();
  if (!raw) return { country: def, national: '' };
  if (raw.startsWith('+')) {
    const digits = raw.slice(1).replace(/[^\d]/g, '');
    const match = BY_DIAL_LEN.find(c => digits.startsWith(c.dial));
    if (match) return { country: match, national: digits.slice(match.dial.length) };
  }
  // Sin prefijo internacional: se asume país por defecto, todo es número nacional.
  return { country: def, national: raw.replace(/^\+/, '') };
}

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value, onChange, placeholder, className = '', disabled, required, id, name,
}) => {
  const { t } = useTranslation();
  const [country, setCountry] = useState<Country>(() => parseValue(value).country);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Número nacional derivado del valor RELATIVO al país actual (así no se pierde la selección
  // entre países que comparten código, p.ej. +1 = PR/US/DO/CA).
  const national = useMemo(() => {
    const raw = (value || '').trim();
    if (!raw) return '';
    const digits = raw.replace(/[^\d]/g, '');
    if (raw.startsWith('+')) {
      if (digits.startsWith(country.dial)) return digits.slice(country.dial.length);
      const m = BY_DIAL_LEN.find(c => digits.startsWith(c.dial));
      return m ? digits.slice(m.dial.length) : digits;
    }
    return digits;
  }, [value, country.dial]);

  // Re-sincroniza el país SOLO si el valor externo trae un código de marcación DISTINTO
  // (evita voltear la selección cuando el usuario elige otro país del mismo código).
  useEffect(() => {
    const det = parseValue(value);
    if (det.country.dial !== country.dial) setCountry(det.country);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cerrar al hacer click fuera.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => { if (open) setTimeout(() => searchRef.current?.focus(), 0); }, [open]);

  const emit = (c: Country, national: string) => {
    const nat = national.trim();
    onChange(nat ? `+${c.dial} ${nat}` : '');
  };

  const handleNational = (e: React.ChangeEvent<HTMLInputElement>) => {
    emit(country, e.target.value);
  };

  const selectCountry = (c: Country) => {
    setCountry(c);
    setOpen(false);
    setSearch('');
    emit(c, national);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(q) || c.dial.includes(q.replace('+', '')) || c.iso.toLowerCase().includes(q),
    );
  }, [search]);

  return (
    <div
      ref={wrapRef}
      className={`relative flex items-stretch bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded-md shadow-sm h-12 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary ${disabled ? 'opacity-60' : ''} ${className}`}
    >
      {/* Selector de país */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 px-2 rounded-l-md border-r border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-600 disabled:cursor-not-allowed focus:outline-none shrink-0"
        aria-label={t('cmp.phone.select_country')}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="text-lg leading-none">{country.flag}</span>
        <span className="text-sm text-neutral-600 dark:text-neutral-300">+{country.dial}</span>
        <svg className="w-3 h-3 text-neutral-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" /></svg>
      </button>

      {/* Número nacional */}
      <input
        type="tel"
        id={id}
        name={name}
        value={national}
        onChange={handleNational}
        placeholder={placeholder || '(787) 555-1234'}
        disabled={disabled}
        required={required}
        className="flex-1 min-w-0 px-3 bg-transparent text-lg text-neutral-700 dark:text-neutral-200 rounded-r-md focus:outline-none"
      />

      {/* Dropdown de países */}
      {open && (
        <div className="absolute z-30 top-full left-0 mt-1 w-72 max-h-72 overflow-hidden rounded-md border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 shadow-lg flex flex-col">
          <div className="p-2 border-b border-neutral-100 dark:border-neutral-700">
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('cmp.phone.search_country')}
              className="w-full px-2 py-1.5 text-sm rounded border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <ul className="overflow-y-auto" role="listbox">
            {filtered.map(c => (
              <li key={c.iso}>
                <button
                  type="button"
                  onClick={() => selectCountry(c)}
                  className={`flex items-center gap-2 w-full text-left px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 ${c.iso === country.iso ? 'bg-neutral-50 dark:bg-neutral-700/60 font-medium' : ''}`}
                >
                  <span className="text-lg leading-none">{c.flag}</span>
                  <span className="flex-1 text-neutral-800 dark:text-neutral-100">{c.name}</span>
                  <span className="text-neutral-400">+{c.dial}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-3 text-sm text-neutral-400 text-center">{t('cmp.phone.no_results')}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
