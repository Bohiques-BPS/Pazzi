
import React from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from './icons'; // Adjusted path
import { BUTTON_SECONDARY_SM_CLASSES } from '../constants'; // Adjusted path

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full';
}
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'lg' }) => {
  if (!isOpen) return null;

  const sizeClasses: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    'full': 'w-[95vw] max-w-[1600px] h-[90vh]',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-75 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className={`bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col`}>
        <div className="flex justify-between items-center p-4 border-b border-neutral-200 dark:border-neutral-700">
          <h3 id="modal-title" className="text-3xl font-semibold text-neutral-800 dark:text-neutral-100">{title}</h3>
          <button onClick={onClose} className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200" aria-label="Cerrar modal">
            <XMarkIcon />
          </button>
        </div>
        <div className="p-4 overflow-y-auto text-neutral-700 dark:text-neutral-200 text-lg md:text-xl">
          {children}
        </div>
      </div>
    </div>
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
}
export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmButtonText = "Confirmar",
    cancelButtonText = "Cancelar"
}) => {
    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
            <div>
                 <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-500/30 mb-4">
                    <ExclamationTriangleIcon />
                </div>
                <div className="text-neutral-600 dark:text-neutral-300 mb-6 text-center">{message}</div>
                <div className="flex justify-center space-x-4">
                    <button
                        onClick={onClose}
                        className={BUTTON_SECONDARY_SM_CLASSES}
                    >
                        {cancelButtonText}
                    </button>
                    <button
                        onClick={() => { onConfirm(); onClose(); }}
                        className="bg-red-600 hover:bg-red-700 text-white font-semibold py-1.5 px-3 rounded-md text-base shadow-sm transition-colors duration-150"
                    >
                        {confirmButtonText}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
