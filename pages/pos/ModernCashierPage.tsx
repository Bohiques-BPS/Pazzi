import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useData } from '../../contexts/DataContext';
import { UserRole, type Product, type CartItem } from '../../types';
import { DEFAULT_CLIENT_ID } from '../../constants';
import { ProductAutocomplete } from '../../components/ui/ProductAutocomplete';
import { ConfirmationModal } from '../../components/Modal';
import { QuickSettingsButton } from '../../components/ui/QuickSettingsButton';
import { isCashDrawerEnabled } from '../../services/cashDrawer';
import { deliveryAddress } from '../../services/deliveries';
import { toast } from '../../hooks/useToast';
import { CameraIcon, TagIcon, TruckIcon, XMarkIcon } from '../../components/icons';
import { useCashierController, renderCashierGate, CashierModals } from './POSCashierPage';

/**
 * Caja moderna (evaluación UX, nov 2026). Misma lógica que la clásica (useCashierController):
 * solo cambia la pantalla.
 *  - Pantalla dividida: productos a la izquierda (búsqueda, categorías, mosaico) y ticket a la derecha.
 *  - TOTAL grande y botón "Cobrar $X (F12)" siempre en la misma esquina.
 *  - Barra de acciones neutra con atajo en cada botón; solo Borrar (rojo) y Cuadre (verde) tienen color.
 *  - Tecla FIJA por método de pago: F1 Efectivo, F2 Tarjeta, F3 ATH Móvil, F4 AgilPay,
 *    F5 Cuenta del cliente, F6 Cheque (aunque alguno no esté habilitado).
 *  - "Borrar" pide confirmación.
 */

/** Teclas fijas por TIPO de método (no por posición): así no cambian al habilitar otros métodos. */
const METHOD_KEYS: { type: string; key: string; label: string }[] = [
    { type: 'cash', key: 'F1', label: 'Efectivo' },
    { type: 'card', key: 'F2', label: 'Tarjeta' },
    { type: 'ath_movil', key: 'F3', label: 'ATH Móvil' },
    { type: 'agilpay', key: 'F4', label: 'AgilPay' },
    { type: 'credit', key: 'F5', label: 'Cuenta del cliente' },
    { type: 'check', key: 'F6', label: 'Cheque' },
];
/** Nombre que se muestra del método ("Crédito C." se entiende mejor como "Cuenta del cliente"). */
const methodLabel = (m: { type?: string; name: string }) => (m.type === 'credit' ? 'Cuenta del cliente' : m.name);

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;
const lineUnit = (it: CartItem) => it.discount
    ? (it.discount.type === 'percentage' ? it.unitPrice * (1 - it.discount.value / 100) : it.unitPrice - it.discount.value)
    : it.unitPrice;

/** Color estable por texto (categoría) para los productos sin foto. */
const PALETTE = ['#0F766E', '#1D4ED8', '#7C3AED', '#B45309', '#BE123C', '#15803D', '#0369A1', '#A21CAF', '#4D7C0F', '#C2410C'];
const colorFor = (s: string) => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return PALETTE[h % PALETTE.length]; };
const initials = (name: string) => name.replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '··';

const Kbd: React.FC<{ k: string; dark?: boolean }> = ({ k, dark }) => (
    <kbd className={`ml-2 inline-flex items-center h-[18px] px-1.5 rounded-[5px] font-sans text-[10px] font-semibold tracking-wide leading-none flex-shrink-0 ${dark ? 'bg-white/15 text-white/85' : 'bg-neutral-100 text-neutral-500 ring-1 ring-inset ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700'}`}>{k}</kbd>
);
/** Etiqueta corta del método para los botones de la caja (el nombre completo va en el pago). */
const shortMethod = (m: { type?: string; name: string }) => (m.type === 'credit' ? 'Cuenta' : m.type === 'ath_movil' ? 'ATH Móvil' : m.name);

export const ModernCashierPage: React.FC = () => {
    const c = useCashierController();
    const {
        t, navigate, settings, sales, currentUser, toggleUserEmergencyOrderMode,
        productSearchRef, quantityInput, setQuantityInput, quantityInputRef,
        cart, selectedClient, selectedProjectId, clientProjects, handleSelectProject,
        enabledMethods, activeModal, setActiveModal, isShiftActive, shiftTooLong, shiftHoursOpen,
        addProductToCart, searchProductsRemote, setShowGeneralItem, setShowScanCamera,
        updateQuantity, handleRequestItemDelete, setEditingLineId, handleOpenDiscountModal,
        handleOpenPaymentModal, clearCart, heldCarts, posError, setPosError,
        subtotal, globalDiscountAmount, generalDiscount, setGeneralDiscount, tax, taxState, taxMunicipal, taxReduced, total,
        isCurrentCajaApplyIVU, currentCajaName, isCurrentCajaExternal, selectableBranches, selectedBranchId, chooseBranch,
        cajasInSelectedBranch, selectedCajaId, chooseCaja, getBranchById, operator, operatorName, clearOperator,
        paymentShortcutRef, deliveryDraft, setDeliveryDraft, setDeliveryModalOpen, handleOpenDrawer, selectedBranchId: branchId,
    } = c;
    const { categories } = useData();

    const [confirmClear, setConfirmClear] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    // Posición del menú "Más" (fijo en pantalla: la barra tiene desplazamiento y lo recortaba).
    const moreRef = useRef<HTMLDivElement>(null);
    const [morePos, setMorePos] = useState<{ top: number; left: number } | null>(null);
    const toggleMore = () => {
        if (moreOpen) { setMoreOpen(false); return; }
        const r = moreRef.current?.getBoundingClientRect();
        if (r) setMorePos({ top: r.bottom + 6, left: Math.min(r.left, window.innerWidth - 256) });
        setMoreOpen(true);
    };
    const [userMenu, setUserMenu] = useState(false);
    const [category, setCategory] = useState<string>('top');
    const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
    const listEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const on = () => setOnline(true), off = () => setOnline(false);
        window.addEventListener('online', on); window.addEventListener('offline', off);
        return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
    }, []);
    useEffect(() => {
        if (!moreOpen) return;
        const close = (e: KeyboardEvent) => { if (e.key === 'Escape') setMoreOpen(false); };
        const onResize = () => setMoreOpen(false);
        window.addEventListener('keydown', close); window.addEventListener('resize', onResize);
        return () => { window.removeEventListener('keydown', close); window.removeEventListener('resize', onResize); };
    }, [moreOpen]);
    // Lo más reciente del ticket queda visible.
    useEffect(() => { listEndRef.current?.scrollIntoView({ block: 'nearest' }); }, [cart.length]);

    const isGeneral = !selectedClient || !!selectedClient.isDefault || selectedClient.id === DEFAULT_CLIENT_ID;
    const clientLabel = isGeneral ? 'Visitante' : (selectedClient!.companyName || `${selectedClient!.name} ${selectedClient!.lastName || ''}`.trim());
    const itemsCount = cart.reduce((a, it) => a + it.quantity, 0);
    const methodByType = (type: string) => enabledMethods.find(m => m.type === type);
    const defaultMethod = methodByType('cash') || enabledMethods[0];

    // Cobrar: abre el pago con Efectivo (o el primer método). Sin cliente → abre el buscador.
    const charge = (methodName?: string) => {
        if (cart.length === 0 || total <= 0) return;
        if (!selectedClient) { setActiveModal('clientSearch'); return; }
        const name = methodName || defaultMethod?.name;
        if (name) handleOpenPaymentModal(name);
    };

    // ── Atajos de la caja moderna (reemplazan los de la clásica solo en esta pantalla) ──
    paymentShortcutRef.current = (e: KeyboardEvent) => {
        if (activeModal !== null || !isShiftActive || confirmClear) return;
        const el = document.activeElement as HTMLElement | null;
        const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
        const k = e.key;
        if ((k === 'u' || k === 'U') && !typing && !e.altKey && !e.ctrlKey) { e.preventDefault(); setActiveModal('clientSearch'); return; }
        if (e.altKey && !e.ctrlKey) {
            const a = k.toLowerCase();
            if (a === 'b') { e.preventDefault(); if (cart.length) setConfirmClear(true); return; }
            if (a === 'p') { e.preventDefault(); setActiveModal('heldCarts'); return; }
            if (a === 'r') { e.preventDefault(); setActiveModal('return'); return; }
            if (a === 's') { e.preventDefault(); setActiveModal('payout'); return; }
            return;
        }
        if (k === 'F7') { e.preventDefault(); setActiveModal('dailyClose'); return; }
        if (k === 'F8') { e.preventDefault(); setActiveModal('reprint'); return; }
        if (k === 'F9') { e.preventDefault(); setActiveModal('punch'); return; }
        if (k === 'F10') { e.preventDefault(); if (cart.length) handleOpenDiscountModal('general'); return; }
        if (k === 'F12') { e.preventDefault(); charge(); return; }
        const fixed = METHOD_KEYS.find(m => m.key === k);
        if (fixed) {
            e.preventDefault();
            const m = methodByType(fixed.type);
            if (!m) { toast.error(`${fixed.label} no está habilitado en esta caja.`); return; }
            charge(m.name);
        }
    };

    // ── Mosaico de productos ──
    const topProductIds = useMemo(() => {
        const count = new Map<string, number>();
        for (const s of (sales || []).slice(0, 300)) {
            if ((s as any).isReturn) continue;
            for (const it of (s.items || []) as any[]) {
                const id = it.productId || it.id;
                if (id) count.set(id, (count.get(id) || 0) + (Number(it.quantity) || 1));
            }
        }
        return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
    }, [sales]);
    const { products } = c;
    const tiles: Product[] = useMemo(() => {
        const active = (products || []).filter((p: any) => p.isActive !== false);
        if (category === 'top') {
            const byId = new Map(active.map(p => [p.id, p]));
            const top = topProductIds.map(id => byId.get(id)).filter(Boolean) as Product[];
            return (top.length ? top : active).slice(0, 30);
        }
        if (category === 'all') return active.slice(0, 60);
        return active.filter(p => p.categoryId === category).slice(0, 60);
    }, [products, category, topProductIds]);
    const catName = (id?: string | null) => categories.find(cat => cat.id === id)?.name || '';
    const stockHere = (p: any) => {
        const row = (p.stockByBranch || []).find((s: any) => s.branchId === branchId);
        return row ? row.quantity : null;
    };
    const tracksStock = (p: any) => !p.isService && !p.allowNoStock;
    const qty = () => Math.max(1, parseInt(quantityInput, 10) || 1);

    if (!c) return null;
    const gate = renderCashierGate(c);
    if (gate) return gate;

    const emergencyOn = !!currentUser?.isEmergencyOrderActive;
    const isMgr = currentUser?.role === UserRole.MANAGER;
    const branchName = getBranchById?.(selectedBranchId)?.name || t('posx.cashier.central_branch');

    const ActionBtn: React.FC<{ label: string; k?: string; onClick: () => void; tone?: 'danger' | 'success'; disabled?: boolean; badge?: number }> = ({ label, k, onClick, tone, disabled, badge }) => (
        <button type="button" onClick={onClick} disabled={disabled}
            className={`relative h-10 min-w-[44px] px-3.5 rounded-lg text-sm font-semibold flex items-center justify-center whitespace-nowrap transition-colors shadow-sm disabled:cursor-not-allowed
                ${tone && !disabled
                    ? (tone === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white')
                    : `bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-100 ring-1 ring-inset ring-neutral-200 dark:ring-neutral-800 ${disabled ? 'opacity-50' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'}`}`}>
            {label}{k && <Kbd k={k} dark={!!tone && !disabled} />}
            {!!badge && <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center">{badge}</span>}
        </button>
    );

    const MORE: { label: string; onClick: () => void; disabled?: boolean; hint?: string }[] = [
        { label: t('pos.client') || 'Cliente', onClick: () => setActiveModal('clientSearch'), hint: 'U' },
        { label: 'Ver cuenta del cliente', onClick: () => setActiveModal('clientAccount'), disabled: isGeneral, hint: isGeneral ? 'Requiere cliente' : undefined },
        { label: t('pos.estimate') || 'Estimado', onClick: () => setActiveModal('clientEstimates'), disabled: !selectedClient, hint: !selectedClient ? 'Requiere cliente' : undefined },
        { label: t('pos.layaway') || 'Apartado', onClick: () => setActiveModal('layaway'), disabled: cart.length === 0 || isGeneral, hint: isGeneral ? 'Requiere cliente' : undefined },
        { label: deliveryDraft ? 'Entrega (marcada)' : 'Entrega', onClick: () => setDeliveryModalOpen(true), disabled: cart.length === 0 && !selectedClient },
        ...(isCashDrawerEnabled() ? [{ label: t('posx.cashier.drawer') || 'Gaveta', onClick: handleOpenDrawer }] : []),
        { label: t('pos.user') || 'Usuario', onClick: () => setActiveModal('userSwitch') },
    ];

    return (
        <div className="flex flex-col h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-800 dark:text-neutral-100 font-sans">
            {/* Encabezado: caja · sucursal · conexión · ponche · cajero */}
            <header className={`flex items-center justify-between gap-3 px-4 h-14 flex-shrink-0 ${isCurrentCajaExternal ? 'bg-amber-700' : 'bg-neutral-900'} text-white`}>
                <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                        <div className="font-bold leading-tight truncate">{currentCajaName}</div>
                        <div className="flex items-center gap-1.5 text-xs text-white/70">
                            {selectableBranches.length > 1 ? (
                                <select value={selectedBranchId} onChange={e => chooseBranch(e.target.value)} className="bg-white/10 rounded px-1 py-0.5 border border-white/20">
                                    {selectableBranches.map(b => <option key={b.id} value={b.id} className="text-neutral-800">{b.name}</option>)}
                                </select>
                            ) : <span>{branchName}</span>}
                            {cajasInSelectedBranch.length > 1 && (
                                <select value={selectedCajaId} onChange={e => chooseCaja(e.target.value)} className="bg-white/10 rounded px-1 py-0.5 border border-white/20">
                                    {cajasInSelectedBranch.map(cj => <option key={cj.id} value={cj.id} className="text-neutral-800">{cj.name}</option>)}
                                </select>
                            )}
                        </div>
                    </div>
                    <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${online ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/20 text-red-300'}`}>
                        <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-400' : 'bg-red-400 animate-pulse'}`} />{online ? 'En línea' : 'Sin conexión'}
                    </span>
                    {emergencyOn && <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-600 animate-pulse">Modo emergencia activo</span>}
                </div>
                <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setActiveModal('punch')} className="h-10 px-3 rounded-md bg-white/10 hover:bg-white/20 text-sm font-semibold flex items-center">Ponche<Kbd k="F9" dark /></button>
                    <QuickSettingsButton buttonClassName="h-10 w-10 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center" />
                    <div className="relative">
                        <button type="button" onClick={() => setUserMenu(v => !v)} className="h-10 px-3 rounded-md bg-white/10 hover:bg-white/20 text-sm font-semibold flex items-center gap-1.5">
                            <span className="text-white/60 font-normal">Cajero:</span> {operator ? operatorName : currentUser?.name} <span aria-hidden>▾</span>
                        </button>
                        {userMenu && (
                            <>
                                <div className="fixed inset-0 z-30" onClick={() => setUserMenu(false)} />
                                <div className="absolute right-0 mt-1 w-64 z-40 rounded-lg shadow-xl bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700 py-1 text-sm">
                                    <button type="button" onClick={() => { setUserMenu(false); setActiveModal('userSwitch'); }} className="w-full text-left px-4 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-700">Cambiar de cajero</button>
                                    {operator && <button type="button" onClick={() => { setUserMenu(false); clearOperator(); }} className="w-full text-left px-4 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-700">Volver a mi usuario</button>}
                                    {isMgr && (
                                        <button type="button" onClick={async () => {
                                            setUserMenu(false);
                                            const ok = await toggleUserEmergencyOrderMode(currentUser?.id || '');
                                            if (ok) toast.success(emergencyOn ? 'Modo Emergencia desactivado.' : 'Modo Emergencia activado.'); else toast.error('No se pudo cambiar el Modo Emergencia.');
                                        }} className="w-full text-left px-4 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                                            Modo emergencia (exención de IVU): <b>{emergencyOn ? 'activo' : 'apagado'}</b>
                                        </button>
                                    )}
                                    <div className="border-t border-neutral-200 dark:border-neutral-700 my-1" />
                                    <button type="button" onClick={() => { setUserMenu(false); if (isMgr) navigate('/'); else setActiveModal('endShift'); }} className="w-full text-left px-4 py-2.5 text-red-600 dark:text-red-400 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                                        {isMgr ? (t('posx.cashier.exit') || 'Salir') : (t('pos.close_shift') || 'Cerrar turno')}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </header>

            {/* Barra de acciones: neutra, con atajo en cada botón */}
            <nav className="flex items-center gap-2 px-4 py-2.5 bg-neutral-100 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 flex-shrink-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <ActionBtn label="Borrar" k="Alt+B" tone="danger" onClick={() => setConfirmClear(true)} disabled={cart.length === 0} />
                <ActionBtn label="Espera" k="Alt+P" onClick={() => setActiveModal('heldCarts')} badge={heldCarts.length} />
                <ActionBtn label="Devolución" k="Alt+R" onClick={() => setActiveModal('return')} />
                <ActionBtn label="Desembolso" k="Alt+S" onClick={() => setActiveModal('payout')} />
                <ActionBtn label="Reimprimir" k="F8" onClick={() => setActiveModal('reprint')} />
                <div ref={moreRef}>
                    <ActionBtn label="Más ▾" onClick={toggleMore} />
                    {moreOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
                            <div style={{ top: morePos?.top ?? 110, left: morePos?.left ?? 16 }} className="fixed w-60 z-50 rounded-xl shadow-2xl bg-white dark:bg-neutral-800 ring-1 ring-black/5 dark:ring-white/10 py-1.5 text-sm">
                                {MORE.map(m => (
                                    <button key={m.label} type="button" disabled={m.disabled} onClick={() => { setMoreOpen(false); m.onClick(); }}
                                        className="w-full text-left px-4 py-2.5 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-between gap-2">
                                        <span>{m.label}</span>{m.hint && <span className="text-xs text-neutral-400">{m.hint}</span>}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
                <div className="flex-1" />
                <ActionBtn label="Cuadre" k="F7" tone="success" onClick={() => setActiveModal('dailyClose')} />
            </nav>

            {shiftTooLong && (
                <div className="bg-amber-100 dark:bg-amber-900/30 border-b border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 px-4 py-2 flex items-center justify-between gap-3 text-sm flex-shrink-0">
                    <span>Este turno lleva <strong>{Math.floor(shiftHoursOpen / 24) >= 1 ? `${Math.floor(shiftHoursOpen / 24)} día(s)` : `${Math.floor(shiftHoursOpen)} h`}</strong> abierto. Ciérrelo para no mezclar ventas de días distintos.</span>
                    <button type="button" onClick={() => setActiveModal('dailyClose')} className="bg-amber-600 hover:bg-amber-700 text-white font-semibold h-9 px-3 rounded-md text-xs whitespace-nowrap">Cerrar turno (F7)</button>
                </div>
            )}

            <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_clamp(360px,34vw,480px)]">
                {/* ── Izquierda: vender ── */}
                <section className="min-h-0 flex flex-col px-4 pt-4 gap-3">
                    <div className="flex items-center gap-2">
                        <label className="flex flex-col items-center flex-shrink-0">
                            <span className="text-[10px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-0.5">Cant.</span>
                            <input ref={quantityInputRef} type="number" min="1" inputMode="numeric" value={quantityInput}
                                onChange={e => { const v = e.target.value.replace(/[^\d]/g, ''); setQuantityInput(v === '0' ? '1' : v); }}
                                onFocus={e => e.currentTarget.select()}
                                onBlur={() => { if (!quantityInput || quantityInput === '0') setQuantityInput('1'); }}
                                onKeyDown={e => { if (e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); productSearchRef.current?.focus(); } }}
                                disabled={!isShiftActive}
                                className="w-16 h-12 text-center text-lg font-bold rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-primary focus:border-primary" />
                        </label>
                        <div className="flex-1 min-w-0 self-end">
                            <ProductAutocomplete
                                onProductSelect={p => addProductToCart(p, qty())}
                                inputRef={productSearchRef}
                                onRemoteSearch={searchProductsRemote}
                                onEmptyArrowLeft={() => quantityInputRef.current?.focus()}
                                onEmptyEnter={() => { if (isShiftActive && !activeModal) setShowGeneralItem(true); }}
                                disabled={!isShiftActive}
                                autoFocus
                                placeholder="Buscar producto, código o SKU"
                            />
                        </div>
                        <button type="button" onClick={() => setShowScanCamera(true)} disabled={!isShiftActive}
                            title="Escanear con la cámara" aria-label="Escanear con la cámara"
                            className="self-end h-12 w-12 xl:w-auto xl:px-3.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 flex items-center justify-center gap-1.5 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:border-primary hover:text-primary disabled:opacity-40">
                            <CameraIcon className="w-5 h-5" /><span className="hidden xl:inline">Escanear</span>
                        </button>
                    </div>

                    {/* Categorías */}
                    <div className="relative flex-shrink-0">
                        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pr-8">
                            {[{ id: 'top', name: 'Más vendidos' }, ...categories.slice(0, 12).map(cat => ({ id: cat.id, name: cat.name })), { id: 'all', name: 'Todos' }].map(cat => (
                                <button key={cat.id} type="button" onClick={() => setCategory(cat.id)}
                                    className={`h-9 px-4 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${category === cat.id ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-300 ring-1 ring-inset ring-neutral-200 dark:ring-neutral-800 hover:text-neutral-900 dark:hover:text-white'}`}>
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                        <div className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-neutral-100 dark:from-neutral-950 to-transparent" />
                    </div>

                    {/* Mosaico */}
                    <div className="flex-1 min-h-0 overflow-y-auto pb-4 -mx-1 px-1">
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-3">
                            <button type="button" onClick={() => setShowGeneralItem(true)} disabled={!isShiftActive}
                                className="h-[176px] rounded-xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex flex-col items-center justify-center gap-1.5 text-neutral-500 dark:text-neutral-400 hover:border-primary hover:text-primary transition-colors">
                                <span className="w-10 h-10 rounded-full bg-neutral-200/70 dark:bg-neutral-800 flex items-center justify-center text-2xl leading-none">+</span>
                                <span className="text-sm font-semibold">Artículo general</span>
                                <Kbd k="Enter" />
                            </button>
                            {tiles.map(p => {
                                const cat = catName(p.categoryId);
                                const st = stockHere(p);
                                const out = tracksStock(p) && st != null && st <= 0;
                                return (
                                    <button key={p.id} type="button" onClick={() => addProductToCart(p, qty())} disabled={!isShiftActive}
                                        className={`group h-[176px] rounded-xl overflow-hidden bg-white dark:bg-neutral-900 ring-1 ring-inset ring-neutral-200 dark:ring-neutral-800 hover:ring-2 hover:ring-primary shadow-sm hover:shadow-md transition text-left flex flex-col ${out ? 'opacity-70' : ''}`}>
                                        <div className="relative h-[92px] flex-shrink-0 overflow-hidden">
                                            {p.imageUrl ? (
                                                <img src={p.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform" loading="lazy" />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center gap-0.5" style={{ backgroundColor: `${colorFor(cat || p.name)}1F`, color: colorFor(cat || p.name) }}>
                                                    <span className="text-[22px] font-bold tracking-wide leading-none">{initials(p.name)}</span>
                                                    {cat && <span className="text-[10px] font-medium opacity-80 truncate max-w-[90%]">{cat}</span>}
                                                </div>
                                            )}
                                            {tracksStock(p) && st != null && (
                                                <span className={`absolute top-1.5 right-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md backdrop-blur ${out ? 'bg-red-600 text-white' : 'bg-white/90 text-neutral-700 dark:bg-neutral-900/80 dark:text-neutral-200'}`}>{out ? 'Agotado' : `Disp. ${st}`}</span>
                                            )}
                                        </div>
                                        <div className="px-2.5 pt-2 pb-2.5 flex-1 flex flex-col min-h-0">
                                            <span className="text-[13px] font-medium leading-snug line-clamp-2 text-neutral-800 dark:text-neutral-100">{p.name}</span>
                                            <span className="mt-auto text-[15px] font-bold tabular-nums text-neutral-900 dark:text-white">{money(p.unitPrice)}</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        {tiles.length === 0 && <p className="text-sm text-neutral-500 text-center py-10">No hay productos en esta categoría. Use la búsqueda.</p>}
                    </div>
                </section>

                {/* ── Derecha: el ticket ── */}
                <aside className="min-h-0 flex flex-col bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800">
                    {/* Cliente: bien visible (inicial, etiqueta, nombre grande); con cliente real, fondo de color. */}
                    <div className={`px-4 py-3 border-b flex items-center gap-3 ${isGeneral ? 'border-neutral-200 dark:border-neutral-800' : 'bg-primary/10 dark:bg-primary/15 border-primary/30 border-l-4 border-l-primary'}`}>
                        <div className={`w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center text-base font-bold ${isGeneral ? 'bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400' : 'bg-primary text-white'}`} aria-hidden>
                            {isGeneral ? 'V' : initials(clientLabel)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className={`text-[10px] font-bold uppercase tracking-widest ${isGeneral ? 'text-neutral-400' : 'text-primary'}`}>Cliente</div>
                            <div className={`text-lg font-bold leading-tight truncate ${isGeneral ? 'text-neutral-600 dark:text-neutral-300' : 'text-neutral-900 dark:text-white'}`} title={clientLabel}>{clientLabel}</div>
                            <div className="text-xs text-neutral-600 dark:text-neutral-300 truncate">{itemsCount ? `${itemsCount} artículo${itemsCount === 1 ? '' : 's'}` : 'Ticket vacío'}{!isGeneral && selectedClient?.phone ? ` · ${selectedClient.phone}` : ''}</div>
                        </div>
                        {!isGeneral && <button type="button" onClick={() => setActiveModal('clientAccount')} className="h-10 px-3 rounded-md text-sm font-medium border border-neutral-200 dark:border-neutral-700 hover:border-primary">Ver</button>}
                        <button type="button" onClick={() => setActiveModal('clientSearch')} className="h-10 px-3 rounded-md text-sm font-semibold border border-neutral-200 dark:border-neutral-700 hover:border-primary">Cambiar<Kbd k="U" /></button>
                    </div>
                    {!isGeneral && (clientProjects?.length || 0) > 0 && (
                        <div className="px-4 py-2 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2 text-sm">
                            <span className="text-neutral-500 flex-shrink-0">Proyecto:</span>
                            <select value={selectedProjectId || ''} onChange={e => handleSelectProject(e.target.value || null)} className="flex-1 min-w-0 h-9 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2">
                                <option value="">Venta general (sin proyecto)</option>
                                {clientProjects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    )}
                    {deliveryDraft && cart.length > 0 && (
                        <div className="px-4 py-2 border-b border-teal-200 dark:border-teal-900 bg-teal-50 dark:bg-teal-900/20 text-sm text-teal-800 dark:text-teal-200 flex items-center gap-2">
                            <TruckIcon className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate flex-1">Para entrega · {deliveryDraft.scheduledDate ? new Date(`${deliveryDraft.scheduledDate}T12:00:00Z`).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }) : 'sin fecha'} · {deliveryAddress(deliveryDraft as any)}</span>
                            <button type="button" onClick={() => setDeliveryModalOpen(true)} className="underline">Editar</button>
                            <button type="button" onClick={() => c.applyDeliveryDraft(null)} aria-label="Quitar entrega"><XMarkIcon className="w-4 h-4" /></button>
                        </div>
                    )}

                    {/* Artículos */}
                    <div className="flex-1 min-h-0 overflow-y-auto">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
                                <div className="flex flex-col items-center gap-2">
                                    <span className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400"><TagIcon className="w-6 h-6" /></span>
                                    <div className="text-base font-semibold text-neutral-700 dark:text-neutral-200">Ticket vacío</div>
                                    <div className="text-sm text-neutral-500 dark:text-neutral-400">Escanee o toque un producto</div>
                                </div>
                            </div>
                        ) : (
                            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {cart.map(it => {
                                    const unit = lineUnit(it);
                                    return (
                                        <li key={it.id} className="px-4 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/60">
                                            <div className="flex items-start gap-2">
                                                <button type="button" onClick={() => setEditingLineId(it.id)} className="flex-1 min-w-0 text-left" title="Tocar para cantidad, descuento, nota o eliminar">
                                                    <div className="font-medium leading-tight truncate">{it.name}</div>
                                                    <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 flex-wrap mt-0.5">
                                                        {it.discount && <span className="line-through">{money(it.unitPrice)}</span>}
                                                        <span>{money(unit)} c/u</span>
                                                        {it.discount && <span className="font-semibold text-emerald-700 dark:text-emerald-400">−{it.discount.type === 'percentage' ? `${it.discount.value}%` : money(it.discount.value)}{it.discount.reason ? ` · ${it.discount.reason}` : ''}</span>}
                                                        {it.priceOverride && <span className="text-amber-600 dark:text-amber-400">precio cambiado</span>}
                                                        {it.skus?.[0] && <span>· {it.skus[0]}</span>}
                                                    </div>
                                                    {it.note && <div className="text-xs text-primary italic truncate">{it.note}</div>}
                                                </button>
                                                <div className="text-right font-semibold tabular-nums w-24 flex-shrink-0">{money(unit * it.quantity)}</div>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                <div className="flex items-center rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                                                    <button type="button" onClick={() => it.quantity <= 1 ? handleRequestItemDelete(it) : updateQuantity(it.id, it.quantity - 1)} className="w-11 h-9 text-lg hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label={`Menos ${it.name}`}>−</button>
                                                    <input type="number" min={1} value={it.quantity} onChange={e => updateQuantity(it.id, parseInt(e.target.value) || 1)} onFocus={e => e.currentTarget.select()}
                                                        className="w-12 h-9 text-center font-semibold bg-transparent border-x border-neutral-200 dark:border-neutral-700 focus:outline-none" aria-label={`Cantidad de ${it.name}`} />
                                                    <button type="button" onClick={() => updateQuantity(it.id, it.quantity + 1)} className="w-11 h-9 text-lg hover:bg-neutral-100 dark:hover:bg-neutral-800" aria-label={`Más ${it.name}`}>+</button>
                                                </div>
                                                <div className="flex-1" />
                                                <button type="button" onClick={() => handleOpenDiscountModal(it.id)} className="h-9 w-11 rounded-md flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30" title="Descuento" aria-label={`Descuento ${it.name}`}><TagIcon className="w-5 h-5" /></button>
                                                <button type="button" onClick={() => handleRequestItemDelete(it)} className="h-9 w-11 rounded-md flex items-center justify-center text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30" title="Quitar" aria-label={`Quitar ${it.name}`}><XMarkIcon className="w-5 h-5" /></button>
                                            </div>
                                        </li>
                                    );
                                })}
                                <div ref={listEndRef} />
                            </ul>
                        )}
                    </div>

                    {/* Totales y cobro: siempre en el mismo lugar */}
                    <div className="border-t border-neutral-200 dark:border-neutral-800 px-4 pt-3 pb-4 space-y-1 text-sm flex-shrink-0">
                        {posError && (
                            <div className="mb-2 rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-3 py-2 flex items-start gap-2" role="alert">
                                <span className="flex-1">{posError}</span>
                                <button type="button" onClick={() => setPosError(null)} aria-label="Cerrar aviso"><XMarkIcon className="w-4 h-4" /></button>
                            </div>
                        )}
                        <div className="flex justify-between"><span className="text-neutral-500 dark:text-neutral-400">Subtotal</span><span className="tabular-nums">{money(subtotal)}</span></div>
                        {generalDiscount && globalDiscountAmount > 0 ? (
                            <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                                <button type="button" onClick={() => handleOpenDiscountModal('general')} className="hover:underline text-left">Descuento general {generalDiscount.type === 'percentage' ? `${generalDiscount.value}%` : ''}{generalDiscount.reason ? <span className="text-xs text-neutral-500 dark:text-neutral-400"> · {generalDiscount.reason}</span> : null}</button>
                                <span className="flex items-center gap-1.5 tabular-nums">−{money(globalDiscountAmount)}<button type="button" onClick={() => setGeneralDiscount(null)} aria-label="Quitar descuento general"><XMarkIcon className="w-4 h-4" /></button></span>
                            </div>
                        ) : (
                            <button type="button" onClick={() => handleOpenDiscountModal('general')} disabled={cart.length === 0} className="text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-40 disabled:no-underline flex items-center">Descuento general<Kbd k="F10" /></button>
                        )}
                        {settings.taxBreakdownEnabled ? (
                            <>
                                <div className="flex justify-between"><span className="text-neutral-500 dark:text-neutral-400">IVU estatal</span><span className="tabular-nums">{money(taxState)}</span></div>
                                <div className="flex justify-between"><span className="text-neutral-500 dark:text-neutral-400">IVU municipal</span><span className="tabular-nums">{money(taxMunicipal)}</span></div>
                                {taxReduced > 0 && <div className="flex justify-between"><span className="text-neutral-500 dark:text-neutral-400">IVU reducido</span><span className="tabular-nums">{money(taxReduced)}</span></div>}
                            </>
                        ) : (
                            <div className="flex justify-between"><span className="text-neutral-500 dark:text-neutral-400">IVU</span><span className="tabular-nums">{money(tax)}</span></div>
                        )}
                        {!isCurrentCajaApplyIVU && <div className="text-xs text-neutral-500 dark:text-neutral-400 text-right">Caja exenta de IVU</div>}
                        <div className="flex items-baseline justify-between pt-2.5 mt-1.5 border-t border-neutral-200 dark:border-neutral-800">
                            <span className="text-sm font-bold tracking-widest text-neutral-500 dark:text-neutral-400">TOTAL</span>
                            <span className="text-[44px] leading-none font-extrabold tabular-nums tracking-tight text-neutral-900 dark:text-white">{money(total)}</span>
                        </div>
                        <button type="button" onClick={() => charge()} disabled={!isShiftActive || cart.length === 0 || total <= 0}
                            className="mt-3 w-full h-14 rounded-xl bg-primary hover:bg-secondary text-white text-lg font-bold flex items-center justify-center shadow-md transition-colors disabled:bg-neutral-200 disabled:text-neutral-400 dark:disabled:bg-neutral-800 dark:disabled:text-neutral-600 disabled:shadow-none disabled:cursor-not-allowed">
                            Cobrar{cart.length > 0 ? ` ${money(total)}` : ''}<Kbd k="F12" dark={cart.length > 0 && total > 0} />
                        </button>
                        <div className="grid grid-cols-3 gap-1.5 mt-2">
                            {METHOD_KEYS.map(mk => {
                                const m = methodByType(mk.type);
                                if (!m) return null;
                                return (
                                    <button key={mk.type} type="button" onClick={() => charge(m.name)} disabled={!isShiftActive || cart.length === 0 || total <= 0} title={methodLabel(m)}
                                        className="relative h-11 px-2 rounded-lg text-[13px] font-semibold ring-1 ring-inset ring-neutral-200 dark:ring-neutral-700 text-neutral-700 dark:text-neutral-200 hover:ring-primary hover:text-primary disabled:opacity-40 disabled:hover:ring-neutral-200 disabled:hover:text-neutral-700 disabled:cursor-not-allowed flex items-center justify-center min-w-0">
                                        <span className="truncate pt-1">{shortMethod(m)}</span>
                                        <span className="absolute top-1 left-1.5 text-[9px] font-bold leading-none text-neutral-400 dark:text-neutral-500">{mk.key}</span>
                                    </button>
                                );
                            })}
                            {/* Métodos personalizados (sin tecla fija) */}
                            {enabledMethods.filter(m => !METHOD_KEYS.some(mk => mk.type === m.type)).map(m => (
                                <button key={m.id} type="button" onClick={() => charge(m.name)} disabled={!isShiftActive || cart.length === 0 || total <= 0}
                                    className="h-11 px-2 rounded-lg text-[13px] font-semibold ring-1 ring-inset ring-neutral-200 dark:ring-neutral-700 text-neutral-700 dark:text-neutral-200 hover:ring-primary disabled:opacity-40 disabled:cursor-not-allowed truncate">
                                    {methodLabel(m)}
                                </button>
                            ))}
                        </div>
                    </div>
                </aside>
            </main>

            <CashierModals c={c} variant="modern" />
            <ConfirmationModal
                isOpen={confirmClear}
                onClose={() => setConfirmClear(false)}
                onConfirm={() => { setConfirmClear(false); clearCart(); }}
                title="Borrar venta"
                message={`Se quitarán los ${itemsCount} artículo(s) del ticket (${money(total)}). Esta acción no se puede deshacer.`}
                confirmButtonText="Borrar"
                cancelButtonText="Cancelar"
            />
        </div>
    );
};

export default ModernCashierPage;
