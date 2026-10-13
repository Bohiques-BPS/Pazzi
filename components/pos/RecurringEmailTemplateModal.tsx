import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal } from '../Modal';
import { recurringService, type EnrollEmailTemplate, type RecurringEmailTemplateKey } from '../../services/recurring';
import { ApiError } from '../../services/api';
import { toast } from '../../hooks/useToast';
import { useTranslation, useGlobalSettings } from '../../contexts/GlobalSettingsContext';
import { inputFormStyle, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';

interface Props { isOpen: boolean; onClose: () => void; }

/** Ejemplo para la vista previa (el correo real usa los datos de cada plan). */
const SAMPLE: Record<string, string> = {
  cliente: 'Roberto Negrón', monto: '$49.99', frecuencia: 'mensual', descripcion: 'Plan de mantenimiento', enlace: 'https://www.ppazi.com/enroll/…',
  fecha: 'lunes, 10 de noviembre de 2026', tarjeta: '6603',
};

const KEYS: RecurringEmailTemplateKey[] = ['recurringEnroll', 'recurringPreCharge'];

/**
 * Editor de las plantillas de correo de pagos recurrentes: "Autoriza tu pago recurrente"
 * (enrolamiento; el enlace siempre se incluye) y el aviso previo al débito automático.
 */
export const RecurringEmailTemplateModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { settings } = useGlobalSettings();
  const [key, setKey] = useState<RecurringEmailTemplateKey>('recurringEnroll');
  const [tpl, setTpl] = useState<EnrollEmailTemplate | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTpl(null);
    recurringService.getEmailTemplate(key)
      .then(r => { setTpl(r); setSubject(r.subject); setBody(r.body); })
      .catch(err => toast.error(err instanceof ApiError ? err.message : t('posx.recurring.tpl.load_error')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, key]);

  const dirty = !!tpl && (subject !== tpl.subject || body !== tpl.body);
  const switchKey = (k: RecurringEmailTemplateKey) => {
    if (k === key) return;
    if (dirty) { toast.warning(t('posx.recurring.tpl.save_first')); return; }
    setKey(k);
  };
  const business = ((settings as any)?.receiptConfig?.businessName as string) || 'Mi negocio';
  const fill = (s: string) => s.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, k) => (k.toLowerCase() === 'negocio' ? business : SAMPLE[k.toLowerCase()] ?? `{{${k}}}`));
  const preview = useMemo(() => ({
    subject: fill(subject),
    body: fill(body) + (tpl?.withLink && !/\{\{\s*enlace\s*\}\}/i.test(body) ? `\n\n${SAMPLE.enlace}` : ''),
  }), [subject, body, business, tpl?.withLink]); // eslint-disable-line

  // Inserta la variable en la posición del cursor del cuerpo.
  const insertVar = (v: string) => {
    const el = bodyRef.current;
    const token = `{{${v}}}`;
    if (!el) { setBody(b => b + token); return; }
    const start = el.selectionStart ?? body.length, end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + token.length, start + token.length); });
  };

  const save = async (reset = false) => {
    setSaving(true);
    try {
      const r = await recurringService.saveEmailTemplate(reset ? { key, subject: '', body: '' } : { key, subject, body });
      setTpl(r); setSubject(r.subject); setBody(r.body);
      toast.success(reset ? t('posx.recurring.tpl.reset_ok') : t('posx.recurring.tpl.saved'));
      if (!reset) onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t('posx.recurring.tpl.save_error'));
    } finally { setSaving(false); }
  };

  return (
    <Modal
      isOpen={isOpen} onClose={onClose} title={t('posx.recurring.tpl.title')} size="3xl" isDirty={dirty && !saving}
      footer={tpl ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={() => save(true)} disabled={saving || tpl.isDefault} className="text-sm text-neutral-500 hover:text-red-600 hover:underline disabled:opacity-40 disabled:no-underline">{t('posx.recurring.tpl.reset')}</button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
            <button type="button" onClick={() => save(false)} disabled={saving || !dirty} className={`${BUTTON_PRIMARY_SM_CLASSES} disabled:opacity-50`}>{saving ? t('common.saving') : t('common.save')}</button>
          </div>
        </div>
      ) : undefined}
    >
      {/* Pestañas: una por correo */}
      <div className="flex flex-wrap gap-1 mb-4">
        {KEYS.map(k => (
          <button key={k} type="button" onClick={() => switchKey(k)}
            className={`px-3.5 py-1.5 text-sm font-medium rounded-full transition-colors ${key === k ? 'bg-primary text-white shadow-sm' : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'}`}>
            {t(`posx.recurring.tpl.tab.${k}`)}
          </button>
        ))}
      </div>
      {!tpl ? <p className="text-sm text-neutral-500">{t('posx.recurring.tpl.loading')}</p> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{key === 'recurringPreCharge' ? t('posx.recurring.tpl.help_precharge', { n: tpl.noticeDays }) : t('posx.recurring.tpl.help')}</p>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{t('posx.recurring.tpl.subject')}</label>
              <input value={subject} onChange={e => setSubject(e.target.value)} maxLength={200} className={inputFormStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">{t('posx.recurring.tpl.body')}</label>
              <textarea ref={bodyRef} value={body} onChange={e => setBody(e.target.value)} maxLength={5000} rows={11} className={inputFormStyle + ' !h-auto font-normal text-base'} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-1.5">{t('posx.recurring.tpl.variables')}</p>
              <div className="flex flex-wrap gap-1.5">
                {tpl.variables.map(v => (
                  <button key={v} type="button" onClick={() => insertVar(v)} className="text-xs font-mono px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20" title={t(`posx.recurring.tpl.var.${v}`)}>
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
              {tpl.withLink && <p className="text-xs text-neutral-400 mt-1.5">{t('posx.recurring.tpl.link_note')}</p>}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-1.5">{t('posx.recurring.tpl.preview')}</p>
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 p-4">
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 border-b border-neutral-200 dark:border-neutral-700 pb-2 mb-3"><span translate="no">{preview.subject}</span></p>
              <div className="text-sm text-neutral-700 dark:text-neutral-200 whitespace-pre-wrap break-words" translate="no">{preview.body}</div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};
