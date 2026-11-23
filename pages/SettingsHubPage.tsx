import React, { Suspense, lazy, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGlobalSettings } from '../contexts/GlobalSettingsContext';
import { usePermissions } from '../hooks/usePermissions';
import { useModuleAccess } from '../hooks/useModuleAccess';
import { AppModule, UserRole } from '../types';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../constants';
import { ChevronLeftIcon, ChevronRightIcon, Cog6ToothIcon, SparklesIcon } from '../components/icons';
import { toast } from '../hooks/useToast';

/**
 * Configuración POR MÓDULO: cada módulo tiene UNA ventana con todas sus configuraciones (las mismas
 * pantallas de siempre, mostradas aquí dentro). Se entra por el enlace "Configuración" del menú del
 * módulo. El asistente es opcional: solo aparece si el usuario pulsa "Asistente paso a paso".
 *
 * Para agregar una configuración nueva a un módulo, basta sumar una sección a TABS.
 */

const named = (factory: () => Promise<any>, name: string) => lazy(() => factory().then(m => ({ default: m[name] })));

interface Section {
    id: string;
    title: string;
    /** Qué se configura aquí, en una línea (lista de la izquierda). */
    desc: string;
    /** Guía del asistente: qué conviene dejar listo en este paso. */
    guide: string;
    Component: React.LazyExoticComponent<React.ComponentType<any>>;
    /** Permiso(s) del colaborador; el gerente ve todo. */
    permission?: string | string[];
}
interface Tab {
    id: string;
    label: string;
    intro: string;
    /** Módulo al que pertenece: si está apagado o el usuario no entra, la pestaña no sale. */
    module?: AppModule;
    /** Sin asistente (ajustes personales). */
    noWizard?: boolean;
    sections: Section[];
}

const TABS: Tab[] = [
    {
        id: 'negocio', label: 'Administración', module: AppModule.ADMINISTRACION,
        intro: 'Lo que aplica a todo el negocio, sin importar el módulo.',
        sections: [
            { id: 'datos', title: 'Datos del negocio', desc: 'Nombre, logo, dirección y teléfono.', guide: 'Escribe el nombre comercial, la dirección y el teléfono, y sube el logo. Salen en recibos, facturas y correos.', Component: named(() => import('./admin/AdminSections'), 'AdminBusinessPage') },
            { id: 'general', title: 'Preferencias generales', desc: 'Zona horaria, formato de fecha y hora, IVU, lealtad, recordatorios.', guide: 'Revisa la zona horaria y el formato de fecha y hora. Define las clases de impuesto (IVU) y, si lo usas, el programa de lealtad y los recordatorios de cobro.', Component: named(() => import('./admin/AdminSettingsPage'), 'AdminSettingsPage') },
            { id: 'modulos', title: 'Módulos del sistema', desc: 'Activar o apagar módulos; modelo de caja; cobro de entregas.', guide: 'Deja encendidos solo los módulos que el negocio usa. Aquí también se elige el modelo de caja y cómo se cobran las entregas.', Component: named(() => import('./admin/AdminSections'), 'AdminModulesPage') },
            { id: 'alertas', title: 'Alertas por correo', desc: 'Avisos automáticos al correo del negocio.', guide: 'Escoge qué avisos quieres recibir por correo (stock bajo, ventas, etc.) y a qué dirección.', Component: named(() => import('./admin/AdminSections'), 'AdminAlertsPage') },
            { id: 'whatsapp', title: 'WhatsApp', desc: 'Conexión del número de WhatsApp del negocio.', guide: 'Conecta el número de WhatsApp Business si vas a escribirle a clientes o leads desde el sistema. Si no lo usas, omite este paso.', Component: named(() => import('./admin/AdminSections'), 'AdminWhatsappPage') },
            { id: 'accesos', title: 'Bitácora de accesos', desc: 'Quién entró al sistema y cuándo.', guide: 'No hay nada que configurar: es el registro de inicios de sesión, para consultarlo cuando haga falta.', Component: named(() => import('./admin/AdminSections'), 'AdminAccessLogPage') },
        ],
    },
    {
        id: 'ventas', label: 'Punto de Venta', module: AppModule.POS,
        intro: 'Todo lo que necesita la caja para vender, cobrar e imprimir.',
        sections: [
            { id: 'cajas', title: 'Cajas', desc: 'Cajas registradoras de cada sucursal y sus turnos.', guide: 'Crea una caja por cada punto de cobro e indica su sucursal y si cobra IVU. Sin al menos una caja no se puede vender.', Component: named(() => import('./pos/POSCajasPage'), 'POSCajasPage'), permission: 'caja.open' },
            { id: 'pagos', title: 'Métodos de pago', desc: 'Efectivo, tarjeta, ATH Móvil, crédito y sus credenciales.', guide: 'Activa los métodos que acepta el negocio. Para ATH Móvil y tarjeta hay que pegar las credenciales del proveedor.', Component: named(() => import('./pos/PaymentMethodsPage'), 'PaymentMethodsPage'), permission: 'settings.viewCompany' },
            { id: 'factura', title: 'Factura y recibo', desc: 'Diseño, textos y datos que salen impresos.', guide: 'Revisa cómo se ve el recibo y la factura: logo, encabezado, pie, tamaño de papel y qué columnas mostrar.', Component: named(() => import('./pos/ReceiptSettingsPage'), 'ReceiptSettingsPage'), permission: 'settings.viewCompany' },
            { id: 'terminal', title: 'Terminal (este equipo)', desc: 'Impresora de recibos, gaveta y etiquetas de ESTA computadora.', guide: 'Se configura en cada computadora de caja: escoge la impresora de recibos, la gaveta y la de etiquetas, y haz una impresión de prueba.', Component: named(() => import('./pos/TerminalSettingsPage'), 'TerminalSettingsPage'), permission: 'pos.access' },
        ],
    },
    {
        id: 'tienda', label: 'Tienda', module: AppModule.TIENDA,
        intro: 'Los locales del negocio: el inventario y las cajas se manejan por sucursal.',
        sections: [
            { id: 'sucursales', title: 'Sucursales', desc: 'Locales del negocio; cada caja pertenece a una sucursal.', guide: 'Crea una sucursal por cada local. El inventario y las cajas se manejan por sucursal.', Component: named(() => import('./admin/BranchesListPage'), 'BranchesListPage'), permission: 'branches.view' },
        ],
    },
    {
        id: 'cuenta', label: 'Mi cuenta', noWizard: true,
        intro: 'Ajustes personales: solo cambian lo que ves tú.',
        sections: [
            { id: 'preferencias', title: 'Apariencia e idioma', desc: 'Tema claro u oscuro, idioma y tamaño de letra.', guide: '', Component: named(() => import('./ConfigurationPage'), 'ConfigurationPage') },
            { id: 'perfil', title: 'Mi perfil y seguridad', desc: 'Nombre, foto, contraseña y verificación en dos pasos.', guide: '', Component: named(() => import('./ProfilePage'), 'ProfilePage') },
        ],
    },
];

export const SettingsHubPage: React.FC = () => {
    const { tab: tabParam, section: sectionParam } = useParams<{ tab?: string; section?: string }>();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { settings, updateSettings } = useGlobalSettings();
    const { can, canAny } = usePermissions();
    const { canAccessModule } = useModuleAccess();
    const [wizard, setWizard] = useState(false);
    const [saving, setSaving] = useState(false);

    const isManager = currentUser?.role === UserRole.MANAGER;
    const allowed = (perm?: string | string[]) => isManager || !perm || (Array.isArray(perm) ? canAny(...perm) : can(perm));

    // Pestañas y secciones que ESTE usuario puede ver.
    const tabs = useMemo(() => TABS
        .filter(t => !t.module || canAccessModule(t.module))
        .map(t => ({ ...t, sections: t.sections.filter(s => allowed(s.permission)) }))
        .filter(t => t.sections.length > 0),
    [currentUser, canAccessModule]); // eslint-disable-line react-hooks/exhaustive-deps

    const tab = tabs.find(t => t.id === tabParam) || tabs[0];
    const section = tab?.sections.find(s => s.id === sectionParam) || tab?.sections[0];
    const progress: Record<string, string> = ((settings as any)?.setupProgress as any) || {};
    const key = (t: Tab, s: Section) => `${t.id}.${s.id}`;

    if (!tab || !section) {
        return <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">No tienes configuraciones disponibles.</div>;
    }

    const go = (t: Tab, s?: Section) => navigate(`/ajustes/${t.id}${s ? `/${s.id}` : ''}`);
    const idx = tab.sections.findIndex(s => s.id === section.id);
    const next = tab.sections[idx + 1];
    const prev = tab.sections[idx - 1];

    // Marca el paso y avanza. Solo quien puede guardar la configuración del negocio deja registro;
    // a los demás el asistente igual los lleva paso a paso.
    const mark = async (state: 'done' | 'skipped') => {
        setSaving(true);
        const ok = await updateSettings({ setupProgress: { ...progress, [key(tab, section)]: state } } as any);
        setSaving(false);
        if (!ok && isManager) toast.error('No se pudo guardar el avance del asistente.');
        if (next) go(tab, next);
        else { setWizard(false); toast.success(`Terminaste el recorrido de la configuración de ${tab.label}.`); }
    };
    const startWizard = () => { setWizard(true); go(tab, tab.sections[0]); };

    const total = tab.sections.length;
    const Active = section.Component;

    return (
        <div className="p-4 sm:p-6 max-w-[1500px] mx-auto">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-neutral-800 dark:text-neutral-100 flex items-center">
                        <Cog6ToothIcon className="w-7 h-7 sm:w-8 sm:h-8 mr-2 sm:mr-3 text-primary flex-shrink-0" />Configuración{tab.noWizard ? '' : ` · ${tab.label}`}
                    </h1>
                    <p className="text-neutral-500 dark:text-neutral-400 mt-1">{tab.intro}</p>
                </div>
                {!tab.noWizard && !wizard && total > 1 && (
                    <button type="button" onClick={startWizard} className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-primary to-teal-500 shadow-md shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 hover:brightness-110 transition" title="Recorre cada configuración de este módulo, una por una">
                        <SparklesIcon className="w-4 h-4 mr-1.5" />Asistente paso a paso
                    </button>
                )}
            </div>

            {/* Asistente: solo si el usuario lo pidió. */}
            {wizard && !tab.noWizard && (
                <div className="bg-white dark:bg-neutral-800 border border-primary/40 rounded-xl p-4 mb-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-primary">Paso {idx + 1} de {total} · {tab.label}</div>
                        <button type="button" onClick={() => setWizard(false)} className="text-xs text-neutral-500 dark:text-neutral-400 hover:underline">Salir del asistente</button>
                    </div>
                    <div className="text-lg font-bold text-neutral-800 dark:text-neutral-100 mt-1">{section.title}</div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">{section.guide}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Haz los cambios en la pantalla de abajo y guárdalos ahí. Después pasa al siguiente.</p>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                        <button type="button" disabled={!prev} onClick={() => prev && go(tab, prev)} className={`${BUTTON_SECONDARY_SM_CLASSES} disabled:opacity-40 inline-flex items-center`}><ChevronLeftIcon className="w-4 h-4 mr-1" />Anterior</button>
                        <button type="button" disabled={saving} onClick={() => mark('skipped')} className={BUTTON_SECONDARY_SM_CLASSES}>Omitir</button>
                        <button type="button" disabled={saving} onClick={() => mark('done')} className={`${BUTTON_PRIMARY_SM_CLASSES} inline-flex items-center`}>{next ? 'Siguiente' : 'Terminar'}<ChevronRightIcon className="w-4 h-4 ml-1" /></button>
                    </div>
                </div>
            )}

            {/* Secciones del módulo como pestañas arriba: caben en pantallas angostas y en el celular
                (se desplazan de lado si no caben). La descripción de la sección va debajo. */}
            {total > 1 && (
                <div className="relative border-b border-neutral-200 dark:border-neutral-700 mb-2">
                    <nav className="flex gap-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist">
                        {tab.sections.map(s => {
                            const active = s.id === section.id;
                            return (
                                <button key={s.id} type="button" role="tab" aria-selected={active} onClick={() => go(tab, s)}
                                    ref={active ? (el => el?.scrollIntoView({ block: 'nearest', inline: 'center' })) : undefined}
                                    className={`flex-shrink-0 px-3 sm:px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${active ? 'border-primary text-primary' : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100'}`}>
                                    {s.title}
                                </button>
                            );
                        })}
                    </nav>
                </div>
            )}
            {total > 1 && <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">{section.desc}</p>}

            <div className="min-w-0">
                {/* La pantalla de configuración de siempre, mostrada aquí dentro. */}
                <Suspense fallback={<div className="p-8 text-center text-neutral-400">Cargando…</div>}>
                    <Active key={`${tab.id}.${section.id}`} />
                </Suspense>
            </div>
        </div>
    );
};

export default SettingsHubPage;
