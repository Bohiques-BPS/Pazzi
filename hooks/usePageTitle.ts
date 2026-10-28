import { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { APP_MODULES_CONFIG, type SubModuleLink } from '../constants';
import { useData } from '../contexts/DataContext';
import { useTranslation } from '../contexts/GlobalSettingsContext';

const APP_NAME = 'Pazzi';

/** Pestañas del detalle de proyecto (?tab=…). */
const PROJECT_TABS: Record<string, string> = {
    details: 'Detalles', chat: 'Chat', tasks: 'Tareas', seguimiento: 'Seguimiento', historico: 'Histórico',
};

/** Todos los enlaces del menú lateral (con su módulo), aplanando los grupos. */
const MENU_LINKS: { link: SubModuleLink; module: string }[] = APP_MODULES_CONFIG.flatMap((m: any) =>
    Object.keys(m)
        .filter(k => k.startsWith('subModules') && Array.isArray(m[k]))
        .flatMap(k => (m[k] as any[]).flatMap(it => it.type === 'group' ? it.children : [it]))
        .filter((l: any) => l?.type === 'link' && typeof l.path === 'string')
        .map((link: SubModuleLink) => ({ link, module: String(m.name) })),
);

/**
 * Título de la pestaña del navegador según la página: "PPAZI · Tareas — Pazzi",
 * "Reportes PM · Gestión de Proyectos — Pazzi"… Así se distinguen varias ventanas abiertas.
 * Usa los mismos nombres del menú lateral (enlace más específico que coincida con la URL).
 */
export function usePageTitle() {
    const { pathname, search } = useLocation();
    const { projects } = useData();
    const { t } = useTranslation();
    const tr = (s: string) => t(s) || s;

    const title = useMemo(() => {
        const params = new URLSearchParams(search);

        // Detalle de proyecto: nombre del proyecto + pestaña.
        const pm = pathname.match(/^\/pm\/projects\/([^/]+)$/);
        if (pm && pm[1] !== 'new') {
            const p = projects.find(x => x.id === pm[1]);
            const tab = PROJECT_TABS[params.get('tab') || 'details'] || 'Detalles';
            return p ? `${p.name} · ${tab}` : `Proyecto · ${tab}`;
        }
        if (pathname === '/pm/projects/new') return 'Nuevo proyecto';
        if (pathname === '/pm/reports') return params.get('tab') === 'tasks' ? 'Reportes PM · Tareas' : 'Reportes PM · Proyectos';

        // Enlace del menú más específico: misma ruta (y misma ?query si el enlace la tiene) o prefijo.
        let best: { link: SubModuleLink; module: string; score: number } | null = null;
        for (const m of MENU_LINKS) {
            const [path, query] = m.link.path.split('?');
            const exact = pathname === path;
            if (!exact && !(path !== '/' && pathname.startsWith(path + '/'))) continue;
            let score = path.length * 10 + (exact ? 5 : 0);
            if (query) {
                const want = new URLSearchParams(query);
                const matches = [...want.entries()].every(([k, v]) => params.get(k) === v);
                if (!matches) continue;
                score += 3;
            }
            if (!best || score > best.score) best = { ...m, score };
        }
        if (best) {
            const page = tr(best.link.name);
            const mod = tr(best.module);
            return page === mod ? page : `${page} · ${mod}`;
        }
        return '';
    }, [pathname, search, projects, t]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        document.title = title ? `${title} — ${APP_NAME}` : `${APP_NAME} - Integrated Business Platform`;
    }, [title]);
}
