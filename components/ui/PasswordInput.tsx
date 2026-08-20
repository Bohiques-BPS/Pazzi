import React, { useState } from 'react';
import { EyeIcon, EyeSlashIcon } from '../icons';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

type PasswordInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

/**
 * Input de contraseña con botón de ojo (mostrar/ocultar).
 * Acepta todas las props de <input> excepto `type` (lo controla internamente).
 * Envuelve en un <div className="relative"> — si ya hay un ícono de candado
 * posicionado absolute en el div padre, sigue funcionando correctamente.
 */
export const PasswordInput: React.FC<PasswordInputProps> = ({ className = '', ...props }) => {
    const { t } = useTranslation();
    const [show, setShow] = useState(false);

    return (
        <div className="relative">
            <input
                {...props}
                type={show ? 'text' : 'password'}
                className={`${className} pr-10`}
            />
            <button
                type="button"
                tabIndex={-1}
                onClick={() => setShow(v => !v)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 focus:outline-none"
                aria-label={show ? t('cmpx.password.hide') : t('cmpx.password.show')}
            >
                {show
                    ? <EyeSlashIcon className="w-5 h-5" />
                    : <EyeIcon className="w-5 h-5" />
                }
            </button>
        </div>
    );
};
