import React, { useEffect, useState } from 'react';
import { projectsService } from '../../services/projects';
import { INPUT_SM_CLASSES } from '../../constants';
import { useTranslation } from '../../contexts/GlobalSettingsContext';

interface Props {
    /** Cliente cuyos proyectos se listan. Sin cliente, el select queda deshabilitado. */
    clientId: string;
    value: string;
    onChange: (projectId: string) => void;
    /** Nombre del proyecto actual (si ya venía vinculado y no está en la lista del cliente). */
    currentLabel?: string | null;
    className?: string;
}

/**
 * Select opcional de "Proyecto" para formularios de factura / pago recurrente.
 * Lista los proyectos del cliente elegido (GET /projects?clientId=). Si el usuario no tiene
 * permiso para ver proyectos, el select se muestra deshabilitado (la factura se crea igual).
 */
export const ProjectSelectForClient: React.FC<Props> = ({ clientId, value, onChange, currentLabel, className }) => {
    const { t } = useTranslation();
    const [options, setOptions] = useState<{ id: string; name: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [unavailable, setUnavailable] = useState(false);

    useEffect(() => {
        let alive = true;
        if (!clientId) { setOptions([]); setUnavailable(false); return; }
        setLoading(true);
        projectsService.getAll({ clientId })
            .then(list => { if (alive) { setOptions((Array.isArray(list) ? list : []).map((p: any) => ({ id: p.id, name: p.name }))); setUnavailable(false); } })
            .catch(() => { if (alive) { setOptions([]); setUnavailable(true); } })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [clientId]);

    // El proyecto ya vinculado se muestra aunque no pertenezca al cliente elegido.
    const all = value && !options.some(o => o.id === value)
        ? [{ id: value, name: currentLabel || t('posx.invoices.project_linked') }, ...options]
        : options;
    const disabled = (!clientId && !value) || loading;

    return (
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            disabled={disabled}
            className={`${INPUT_SM_CLASSES} w-full disabled:opacity-60 ${className || ''}`}
            title={unavailable ? t('posx.invoices.project_unavailable') : undefined}
        >
            <option value="">
                {!clientId && !value ? t('posx.invoices.project_pick_client_first')
                    : loading ? t('common.loading')
                    : (all.length === 0 ? t('posx.invoices.project_none_for_client') : t('posx.invoices.project_none'))}
            </option>
            {all.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
    );
};
