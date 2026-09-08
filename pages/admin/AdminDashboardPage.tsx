import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../contexts/GlobalSettingsContext';
import { API_URL } from '../../services/api';
import { useCurrency } from '../../hooks/useCurrency';
import { CashBillIcon, DocumentArrowUpIcon, BriefcaseIcon, ClipboardDocumentListIcon, ShoppingCartIcon, CubeIcon, UserGroupIcon, IdentificationIcon, BuildingStorefrontIcon, Squares2X2Icon, BellIcon, ClockIcon } from '../../components/icons';

interface Overview {
    sales: { today: { total: number; count: number }; month: { total: number; count: number } };
    catalog: { products: number; clients: number; employees: number };
    projects: { active: number; pendingTasks: number };
    ecommerce: { pendingOrders: number };
    invoices: { pendingCount: number; pendingBalance: number };
}

export const AdminDashboardPage: React.FC = () => {
    const { t } = useTranslation();
    const cur = useCurrency();
    const money = (n: number) => `${cur}${(Number(n) || 0).toFixed(2)}`;
    const [data, setData] = useState<Overview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true); setError('');
        fetch(`${API_URL}/settings/admin-overview`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('pazzi_token')}` } })
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(setData)
            .catch(() => setError('No se pudo cargar el resumen.'))
            .finally(() => setLoading(false));
    }, []);

    const Kpi: React.FC<{ icon: React.ComponentType<any>; label: string; value: string; sub?: string; accent?: string }> = ({ icon: Icon, label, value, sub, accent = 'text-primary' }) => (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 shadow-sm">
            <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400 text-sm">
                <Icon className={`w-5 h-5 ${accent}`} /><span className="truncate">{label}</span>
            </div>
            <div className="text-2xl font-bold text-neutral-800 dark:text-neutral-100 mt-1 tabular-nums">{value}</div>
            {sub && <div className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{sub}</div>}
        </div>
    );

    const quickLinks = [
        { to: '/admin/business', label: t('adminx.nav.business') || 'Datos del Negocio', icon: BuildingStorefrontIcon },
        { to: '/admin/modules', label: t('adminx.nav.modules') || 'Módulos del Sistema', icon: Squares2X2Icon },
        { to: '/admin/alerts', label: t('adminx.nav.alerts') || 'Alertas por Correo', icon: BellIcon },
        { to: '/admin/access-log', label: t('adminx.nav.access_log') || 'Bitácora de accesos', icon: ClockIcon },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">{t('adminx.dashboard.title')}</h1>
                <p className="mt-1 text-lg text-neutral-500 dark:text-neutral-400">{t('adminx.overview.subtitle') || 'Resumen del negocio en un vistazo.'}</p>
            </div>

            {loading ? (
                <p className="py-10 text-center text-neutral-500 dark:text-neutral-400">Cargando resumen…</p>
            ) : error ? (
                <p className="py-10 text-center text-red-600 dark:text-red-400">{error}</p>
            ) : data && (
                <>
                    {/* Ventas */}
                    <section>
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500 mb-3">{t('adminx.overview.sales') || 'Ventas'}</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Kpi icon={CashBillIcon} label={t('adminx.overview.sales_today') || 'Ventas de hoy'} value={money(data.sales.today.total)} sub={`${data.sales.today.count} ${t('adminx.overview.transactions') || 'transacciones'}`} accent="text-green-600 dark:text-green-400" />
                            <Kpi icon={CashBillIcon} label={t('adminx.overview.sales_month') || 'Ventas del mes'} value={money(data.sales.month.total)} sub={`${data.sales.month.count} ${t('adminx.overview.transactions') || 'transacciones'}`} accent="text-green-600 dark:text-green-400" />
                            <Kpi icon={DocumentArrowUpIcon} label={t('adminx.overview.invoices_pending') || 'Facturas por cobrar'} value={String(data.invoices.pendingCount)} sub={`${t('pos.receivable.col.balance') || 'Saldo'}: ${money(data.invoices.pendingBalance)}`} accent="text-red-600 dark:text-red-400" />
                            <Kpi icon={ShoppingCartIcon} label={t('adminx.overview.ecommerce_pending') || 'Pedidos online pendientes'} value={String(data.ecommerce.pendingOrders)} accent="text-amber-600 dark:text-amber-400" />
                        </div>
                    </section>

                    {/* Proyectos */}
                    <section>
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500 mb-3">{t('adminx.overview.projects') || 'Proyectos'}</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Kpi icon={BriefcaseIcon} label={t('adminx.overview.projects_active') || 'Proyectos activos'} value={String(data.projects.active)} />
                            <Kpi icon={ClipboardDocumentListIcon} label={t('adminx.overview.pending_tasks') || 'Tareas pendientes'} value={String(data.projects.pendingTasks)} accent="text-indigo-600 dark:text-indigo-400" />
                        </div>
                    </section>

                    {/* Catálogo / Equipo */}
                    <section>
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500 mb-3">{t('adminx.overview.catalog') || 'Catálogo y equipo'}</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Kpi icon={CubeIcon} label={t('adminx.overview.products') || 'Productos'} value={String(data.catalog.products)} accent="text-sky-600 dark:text-sky-400" />
                            <Kpi icon={UserGroupIcon} label={t('adminx.overview.clients') || 'Clientes'} value={String(data.catalog.clients)} accent="text-teal-600 dark:text-teal-400" />
                            <Kpi icon={IdentificationIcon} label={t('adminx.overview.employees') || 'Colaboradores'} value={String(data.catalog.employees)} accent="text-violet-600 dark:text-violet-400" />
                        </div>
                    </section>
                </>
            )}

            {/* Accesos rápidos a la configuración */}
            <section>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500 mb-3">{t('adminx.overview.config') || 'Configuración'}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {quickLinks.map(q => {
                        const Icon = q.icon;
                        return (
                            <Link key={q.to} to={q.to} className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-5 shadow-sm hover:shadow-md hover:border-primary/50 transition-all flex flex-col items-center text-center gap-2">
                                <Icon className="w-6 h-6 text-primary" />
                                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">{q.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </section>
        </div>
    );
};

export default AdminDashboardPage;
