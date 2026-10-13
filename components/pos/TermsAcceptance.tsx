import React, { useState } from 'react';
import type { BusinessTerms } from '../../services/invoices';

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
  /** Texto de la casilla ("He leído y acepto los términos…"), ya traducido. */
  label: string;
  business: BusinessTerms & { businessName?: string };
  /** Traductor de páginas públicas (usePublicT). */
  t: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * Casilla de aceptación de términos en las páginas públicas (pago de factura y autorización de
 * cobro recurrente). Muestra los términos del NEGOCIO (enlace o texto configurado en Configuración
 * de facturas) y, aparte, los de Pazzi como plataforma (/terms y /privacy).
 */
export const TermsAcceptance: React.FC<Props> = ({ checked, onChange, label, business, t }) => {
  const [showText, setShowText] = useState(false);
  const name = business.businessName || t('pay.terms.the_business');
  const linkCls = 'text-teal-700 dark:text-teal-300 underline underline-offset-2 hover:text-teal-800';

  return (
    <div className="space-y-1.5">
      <label className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-300 cursor-pointer select-none">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="h-4 w-4 mt-0.5 flex-shrink-0 accent-teal-600" />
        <span>{label}</span>
      </label>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 pl-6 leading-relaxed">
        {business.termsMode === 'link' && business.termsUrl && (
          <><a href={business.termsUrl} target="_blank" rel="noopener noreferrer" className={linkCls}>{t('pay.terms.business', { name })}</a>{' · '}</>
        )}
        {business.termsMode === 'text' && business.termsText && (
          <><button type="button" onClick={() => setShowText(true)} className={linkCls}>{t('pay.terms.business', { name })}</button>{' · '}</>
        )}
        <a href="/terms" target="_blank" rel="noopener noreferrer" className={linkCls}>{t('pay.terms.pazzi')}</a>
        {' · '}
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className={linkCls}>{t('pay.terms.privacy')}</a>
      </p>

      {showText && business.termsText && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onMouseDown={e => { if (e.target === e.currentTarget) setShowText(false); }} role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
              <h3 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">{t('pay.terms.business', { name })}</h3>
              <button type="button" onClick={() => setShowText(false)} className="text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-200 text-xl leading-none" aria-label={t('pay.terms.close')}>×</button>
            </div>
            <div className="p-4 overflow-y-auto text-sm text-neutral-700 dark:text-neutral-200 whitespace-pre-wrap break-words">{business.termsText}</div>
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-700 flex justify-end gap-2">
              <button type="button" onClick={() => setShowText(false)} className="px-3.5 py-2 rounded-md text-sm font-semibold bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-200">{t('pay.terms.close')}</button>
              <button type="button" onClick={() => { onChange(true); setShowText(false); }} className="px-3.5 py-2 rounded-md text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white">{t('pay.terms.accept_btn')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
