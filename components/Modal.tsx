import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon, ExclamationTriangleIcon } from './icons'; // Adjusted path
import { BUTTON_SECONDARY_SM_CLASSES } from '../constants'; // Adjusted path
import { useTranslation } from '../contexts/GlobalSettingsContext';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full' | 'screen';
  /** Si true, no se cierra al presionar Esc. Útil para modales con datos sin guardar. */
  disableEscClose?: boolean;
  /**
   * Hay cambios sin guardar: cerrar (clic fuera, Esc o la X) pide confirmación
   * "¿Deseas salir sin guardar los cambios?" en vez de cerrar y perderlos.
   */
  isDirty?: boolean;
  /** Pie FIJO (botones Guardar/Cancelar): queda siempre visible abajo aunque el contenido haga scroll. */
  footer?: React.ReactNode;
}
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'xl', disableEscClose, isDirty, footer }) => {
  const { t } = useTranslation();
  const [confirmLeave, setConfirmLeave] = useState(false);
  useEffect(() => { if (!isOpen) setConfirmLeave(false); }, [isOpen]);

  // Cierre "suave" (backdrop, Esc, X): si hay cambios sin guardar, primero pregunta.
  const requestClose = () => {
    if (isDirty) setConfirmLeave(true);
    else onClose();
  };

  useEffect(() => {
    if (!isOpen || disableEscClose) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Un control interno (p. ej. la lista de @ de comentarios) ya atendió el Escape.
        if (e.defaultPrevented) return;
        e.stopPropagation();
        if (confirmLeave) setConfirmLeave(false); // Esc en la confirmación = seguir editando
        else requestClose();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, onClose, disableEscClose, isDirty, confirmLeave]);

  // Bloquea el scroll del documento mientras haya un modal abierto (con contador para modales
  // anidados): evita que el autofocus/scroll desplace la página y deje una franja sin cubrir.
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return;
    const body = document.body;
    const count = Number(body.dataset.modalCount || '0');
    if (count === 0) body.dataset.modalPrevOverflow = body.style.overflow;
    body.dataset.modalCount = String(count + 1);
    body.style.overflow = 'hidden';
    return () => {
      const next = Math.max(0, Number(body.dataset.modalCount || '1') - 1);
      body.dataset.modalCount = String(next);
      if (next === 0) { body.style.overflow = body.dataset.modalPrevOverflow || ''; delete body.dataset.modalPrevOverflow; }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses: Record<string, string> = {
    sm: 'max-w-lg',
    md: 'max-w-xl',
    lg: 'max-w-2xl',
    xl: 'max-w-3xl',
    '2xl': 'max-w-4xl',
    '3xl': 'max-w-5xl',
    '4xl': 'max-w-6xl',
    '5xl': 'max-w-7xl',
    '6xl': 'w-[90vw] max-w-[1400px]',
    '7xl': 'w-[95vw] max-w-[1600px]',
    'full': 'w-[95vw] max-w-[1800px] h-[90vh]',
    // Pantalla completa real: 100vw × 100vh, sin bordes redondeados ni padding externo.
    'screen': 'w-screen h-screen max-w-none',
  };

  const isScreen = size === 'screen';

  // Cerrar al hacer clic en el fondo (fuera del contenido). Solo si el clic fue directamente
  // sobre el backdrop, y respetando disableEscClose (modales con datos sin guardar).
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !disableEscClose) requestClose();
  };

  // Portal a <body>: el fondo cubre SIEMPRE toda la ventana (incluido el navbar), sin depender de
  // contenedores con scroll/transform/z-index donde se renderice el modal.
  return createPortal(
    <div onMouseDown={handleBackdrop} className={`fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-75 z-50 flex items-center justify-center ${isScreen ? '' : 'p-4'}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className={`relative bg-white dark:bg-neutral-800 shadow-xl w-full ${sizeClasses[size]} ${isScreen ? 'max-h-none rounded-none' : 'max-h-[90vh] rounded-lg'} flex flex-col`}>
        <div className="flex justify-between items-center p-5 border-b border-neutral-200 dark:border-neutral-700">
          <h3 id="modal-title" className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100">{title}</h3>
          <button onClick={requestClose} className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200" aria-label={t('cmp.modal.close')}>
            <XMarkIcon className="w-7 h-7" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto min-h-0 text-neutral-700 dark:text-neutral-200 text-base">
          {children}
        </div>
        {footer && (
          <div className={`flex-shrink-0 px-6 py-3 border-t border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 ${isScreen ? '' : 'rounded-b-lg'}`}>
            {footer}
          </div>
        )}

        {/* Confirmación de salida con cambios sin guardar (sobre el propio modal). */}
        {confirmLeave && (
          <div className={`absolute inset-0 z-10 flex items-center justify-center bg-black/40 ${isScreen ? '' : 'rounded-lg'}`} onMouseDown={e => { if (e.target === e.currentTarget) setConfirmLeave(false); }}>
            <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-xl p-6 mx-4 max-w-sm w-full text-center" role="alertdialog" aria-modal="true">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-500/30 mb-3">
                <ExclamationTriangleIcon />
              </div>
              <h4 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">{t('cmp.modal.unsaved_title')}</h4>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{t('cmp.modal.unsaved_message')}</p>
              <div className="flex justify-center gap-3 mt-5">
                <button type="button" autoFocus onClick={() => setConfirmLeave(false)} className={BUTTON_SECONDARY_SM_CLASSES}>{t('cmp.modal.keep_editing')}</button>
                <button type="button" onClick={() => { setConfirmLeave(false); onClose(); }} className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-3.5 rounded-md text-base shadow-sm transition-colors">{t('cmp.modal.discard')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: React.ReactNode;
    confirmButtonText?: string;
    cancelButtonText?: string;
    /** Si se indica, obliga a ESCRIBIR esta frase (o la palabra "eliminar") para habilitar el botón.
     *  Para borrados irreversibles (p. ej. un proyecto): confirmación extra anti-accidente. */
    confirmPhrase?: string;
}
export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmButtonText,
    cancelButtonText,
    confirmPhrase,
}) => {
    const { t } = useTranslation();
    const [typed, setTyped] = useState('');
    useEffect(() => { if (!isOpen) setTyped(''); }, [isOpen]);
    const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
    // Con confirmPhrase, el botón se habilita al escribir la frase o la palabra "eliminar"/"delete".
    const canConfirm = !confirmPhrase
        || norm(typed) === norm(confirmPhrase)
        || norm(typed) === 'eliminar'
        || norm(typed) === 'delete';
    // Enter → botón principal (confirmar). Escape → cancelar (lo maneja el Modal base).
    const confirmingRef = useRef(false);
    useEffect(() => {
        if (!isOpen) { confirmingRef.current = false; return; }
        const handler = (e: KeyboardEvent) => {
            if (e.key !== 'Enter') return;
            // Con confirmación escrita, el Enter NO confirma solo (hay que escribir y pulsar el botón).
            if (confirmPhrase) return;
            // No interceptar Enter cuando el foco está en un campo editable.
            const el = document.activeElement as HTMLElement | null;
            if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) return;
            e.preventDefault();
            if (confirmingRef.current) return; // evita doble ejecución
            confirmingRef.current = true;
            onConfirm();
            onClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onConfirm, onClose, confirmPhrase]);

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
            <div>
                 <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-500/30 mb-4">
                    <ExclamationTriangleIcon />
                </div>
                <div className="text-neutral-600 dark:text-neutral-300 mb-4 text-center text-base">{message}</div>
                {confirmPhrase && (
                    <div className="mb-5">
                        <label className="block text-sm text-neutral-600 dark:text-neutral-300 mb-1 text-center">
                            {t('cmp.modal.type_to_confirm', { phrase: confirmPhrase })}
                        </label>
                        <input
                            type="text"
                            value={typed}
                            onChange={e => setTyped(e.target.value)}
                            placeholder={confirmPhrase}
                            autoFocus
                            className="w-full px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-center"
                        />
                    </div>
                )}
                <div className="flex justify-center space-x-4">
                    <button
                        onClick={onClose}
                        className={BUTTON_SECONDARY_SM_CLASSES}
                    >
                        {cancelButtonText ?? t('common.cancel')}
                    </button>
                    <button
                        onClick={() => { if (!canConfirm) return; onConfirm(); onClose(); }}
                        disabled={!canConfirm}
                        className="bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-1.5 px-3 rounded-md text-base shadow-sm transition-colors duration-150"
                    >
                        {confirmButtonText ?? t('common.confirm')}
                    </button>
                </div>
            </div>
        </Modal>
    );
};