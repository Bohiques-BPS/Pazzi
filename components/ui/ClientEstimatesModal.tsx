import React, { useState, useMemo, useEffect } from 'react';
import { Client, Estimate, CartItem, EstimateStatus, Product } from '../../types';
import { useData } from '../../contexts/DataContext';
import { Modal } from '../Modal';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadImageAsDataUrl, dataUrlFormat } from '../../utils/imageData';
import { useECommerceSettings } from '../../contexts/ECommerceSettingsContext';
import { toast } from 'react-hot-toast';
import { useTranslation, useGlobalSettings } from '../../contexts/GlobalSettingsContext';
import { splitTax } from '../../utils/taxBreakdown';


interface ClientEstimatesModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client | null;
    onLoadItems: (items: CartItem[], estimateIds: string[]) => void;
    isCartEmpty: boolean;
    /** Datos manuales cuando el cliente es Público General (para saber a quién es el estimado). */
    onCreateFromCart: (manualName?: string, manualAddress?: string, manualPhone?: string) => void;
    /** True si el cliente activo es Público General (mostrar/pedir nombre de la persona). */
    isGeneralClient?: boolean;
}

export const ClientEstimatesModal: React.FC<ClientEstimatesModalProps> = ({ isOpen, onClose, client, onLoadItems, isCartEmpty, onCreateFromCart, isGeneralClient }) => {
    const { t } = useTranslation();
    const { settings } = useGlobalSettings();
    const { estimates, getProductById } = useData();
    const { getDefaultSettings } = useECommerceSettings();
    const [selectedEstimateIds, setSelectedEstimateIds] = useState<string[]>([]);
    const [manualName, setManualName] = useState('');
    const [manualAddress, setManualAddress] = useState('');
    const [manualPhone, setManualPhone] = useState('');

    useEffect(() => {
        if (!isOpen) {
            setSelectedEstimateIds([]);
            setManualName('');
            setManualAddress('');
            setManualPhone('');
        }
    }, [isOpen]);

    // Al crear desde el carrito: si es Público General, exigir el nombre de la persona del estimado.
    const handleCreateFromCart = () => {
        if (isGeneralClient && !manualName.trim()) {
            toast.error(t('cmpx.estimates.name_required'));
            return;
        }
        onCreateFromCart(
            isGeneralClient ? manualName.trim() : undefined,
            isGeneralClient ? manualAddress.trim() : undefined,
            isGeneralClient ? manualPhone.trim() : undefined,
        );
    };

    const clientEstimates = useMemo(() => {
        if (!client) return [];
        return estimates.filter(e =>
            e.clientId === client.id &&
            (e.status === EstimateStatus.BORRADOR || e.status === EstimateStatus.ENVIADO)
        ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [client, estimates]);

    const handleSelectionChange = (estimateId: string) => {
        setSelectedEstimateIds(prev =>
            prev.includes(estimateId)
                ? prev.filter(id => id !== estimateId)
                : [...prev, estimateId]
        );
    };

    const handleLoadToCart = () => {
        const selected = clientEstimates.filter(e => selectedEstimateIds.includes(e.id));
        if (selected.length === 0) {
            toast.error(t('cmpx.estimates.select_one'));
            return;
        }

        const combinedItems: CartItem[] = [];
        selected.forEach(est => {
            est.items.forEach(item => {
                const existingItem = combinedItems.find(ci => ci.id === item.id);
                if (existingItem) {
                    existingItem.quantity += item.quantity;
                } else {
                    combinedItems.push({ ...item });
                }
            });
        });

        onLoadItems(combinedItems, selectedEstimateIds);
    };

    const handleGeneratePDF = async () => {
        const selected = clientEstimates.filter(e => selectedEstimateIds.includes(e.id));
        if (selected.length === 0 || !client) {
            toast.error(t('cmpx.estimates.select_one_client'));
            return;
        }
    
        const storeSettings = getDefaultSettings();
    
        // Combine items from all selected estimates
        const combinedItemsMap = new Map<string, CartItem>();
        selected.forEach(est => {
            est.items.forEach(item => {
                const existing = combinedItemsMap.get(item.id);
                if (existing) {
                    existing.quantity += item.quantity;
                } else {
                    combinedItemsMap.set(item.id, { ...item });
                }
            });
        });
        const combinedItems = Array.from(combinedItemsMap.values());
    
        // Recalculate totals for the combined items
        const subtotal = combinedItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
        // Usar la MISMA tasa que el POS (IVU PR 11.5% por defecto), no un 16% hardcodeado, para que
        // el PDF cuadre con los totales guardados de los estimados combinados.
        const defaultIVURate = Number(settings.defaultTaxRate) || 0.115;
        const ivu = combinedItems.reduce((taxSum, item) => {
            const product = getProductById(item.id);
            const rate = product?.ivuRate ?? defaultIVURate;
            return taxSum + (item.unitPrice * item.quantity * rate);
        }, 0);
        const totalAmount = subtotal + ivu;
    
        // --- PDF Generation using jsPDF ---
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        let y = margin;
    
        // Diseño unificado: datos reales del negocio + colores configurables.
        const toRgb = (hex: string): [number, number, number] => { const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim()); if (!m) return [76, 175, 80]; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
        const rc: any = (settings as any).receiptConfig || {};
        const dz: any = rc.invoiceDesign || {};
        const accent = toRgb(dz.accentColor || storeSettings.primaryColor || '#7E57C2');
        const headerRgb = toRgb(dz.headerColor || '#4CAF50');
        const RM = pageWidth - margin;
        if (dz.showLogo !== false && rc.logoUrl) {
            const logoData = await loadImageAsDataUrl(rc.logoUrl);
            if (logoData) { try { doc.addImage(logoData, dataUrlFormat(logoData), margin, y, 34, 17); } catch { /* ignore */ } }
        }
        doc.setFontSize(14).setFont('helvetica', 'bold'); doc.setTextColor(20);
        doc.text(rc.businessName || storeSettings.storeName || 'Pazzi', RM, y + 4, { align: 'right' });
        doc.setFontSize(9).setFont('helvetica', 'normal'); doc.setTextColor(90);
        let hy = y + 9;
        if (dz.showBusiness !== false) {
            [rc.address, rc.phone, rc.email, rc.rnc ? `RNC/Reg: ${rc.rnc}` : '']
                .filter(Boolean).forEach((line: string) => { doc.text(String(line), RM, hy, { align: 'right' }); hy += 4.5; });
        }
        y = Math.max(y + 20, hy) + 6;
        doc.setFontSize(22).setFont('helvetica', 'bold'); doc.setTextColor(accent[0], accent[1], accent[2]);
        doc.text('Estimación de Costos', margin, y);
        y += 12;
        doc.setFontSize(11).setFont('helvetica', 'normal'); doc.setTextColor(40);
        doc.text(`Estimación para: ${client.name} ${client.lastName}`, margin, y);
        doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, RM, y, { align: 'right' });
        y += 8;
        doc.setTextColor(90);
        doc.text("Agradecemos la oportunidad de presentarle esta estimación para su consideración.", margin, y);
        doc.setTextColor(0);
        y += 8;
        doc.setLineWidth(0.2);
        doc.line(margin, y - 2, pageWidth - margin, y - 2);

        const tableHead = [['Cant.', 'Descripción', 'P. Unitario', 'Total']];
        const tableBody = combinedItems.map(item => [
            item.quantity.toString(),
            item.name,
            `$${item.unitPrice.toFixed(2)}`,
            `$${(item.unitPrice * item.quantity).toFixed(2)}`
        ]);
    
        autoTable(doc, {
            head: tableHead,
            body: tableBody,
            startY: y,
            theme: 'striped',
            headStyles: { fillColor: headerRgb, textColor: 255 },
            didDrawPage: (data) => {
                y = data.cursor?.y || y;
            }
        });
    
        y = (doc as any).lastAutoTable.finalY + 10;
    
        // Totals section
        const totalsX = pageWidth - margin - 60;
        doc.setFontSize(11);
        doc.text("Subtotal:", totalsX, y, { align: 'left' });
        doc.text(`$${subtotal.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
        y += 7;
        if (settings.taxBreakdownEnabled) {
            // Desglose IVU Estatal/Municipal (los estimados no marcan ítems reducidos → reparte proporcional).
            const sp = splitTax(ivu, settings.taxStateRate, settings.taxMunicipalRate);
            doc.text("IVU Estatal:", totalsX, y, { align: 'left' }); doc.text(`$${sp.state.toFixed(2)}`, pageWidth - margin, y, { align: 'right' }); y += 7;
            doc.text("IVU Municipal:", totalsX, y, { align: 'left' }); doc.text(`$${sp.municipal.toFixed(2)}`, pageWidth - margin, y, { align: 'right' }); y += 7;
        } else {
            doc.text("IVU:", totalsX, y, { align: 'left' });
            doc.text(`$${ivu.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
            y += 7;
        }
        doc.setFont("helvetica", "bold");
        doc.text("TOTAL ESTIMADO:", totalsX, y, { align: 'left' });
        doc.text(`$${totalAmount.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
        y += 15;
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text("Términos:", margin, y); y += 5;
        const terms = [
            "- Esta estimación es válida por 30 días.",
            "- Los precios no incluyen costos de instalación o envío a menos que se indique explícitamente.",
            "- Los precios pueden variar según la disponibilidad de los productos."
        ];
        terms.forEach(term => {
            doc.text(term, margin, y);
            y += 4;
        });
    
        y += 5;
        doc.setFont("helvetica", "italic");
        doc.text("¡Esperamos poder servirle!", pageWidth / 2, y, { align: 'center' });
    
        const selectedIdsString = selectedEstimateIds.join('_').slice(0, 10);
        doc.save(`Estimado_${client.name.replace(/\s/g, '_')}_${selectedIdsString}.pdf`);
    };


    if (!client) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('cmpx.estimates.title', { name: client.name })} size="2xl">
            <div className="space-y-6">

                <div>
                    <h3 className="text-lg font-semibold mb-2">{t('cmpx.estimates.load_existing')}</h3>
                    <p className="text-base text-neutral-500 dark:text-neutral-400 mb-3">{t('cmpx.estimates.load_existing_hint')}</p>
                    {clientEstimates.length > 0 ? (
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                            {clientEstimates.map(est => {
                                // Desglose: valor de cobro (subtotal) + IVU. El totalAmount guardado ya incluye IVU.
                                const estSubtotal = est.items.reduce((s, it) => s + (it.unitPrice * it.quantity), 0);
                                const estIvu = Math.max(0, est.totalAmount - estSubtotal);
                                return (
                                <div key={est.id} className="flex items-start p-4 bg-neutral-50 dark:bg-neutral-700/60 rounded-md">
                                    <input
                                        type="checkbox"
                                        checked={selectedEstimateIds.includes(est.id)}
                                        onChange={() => handleSelectionChange(est.id)}
                                        className="form-checkbox h-5 w-5 text-primary rounded border-neutral-300 dark:border-neutral-600 dark:bg-neutral-900 focus:ring-primary mt-1"
                                    />
                                    <div className="ml-4 flex-grow">
                                        <p className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
                                            {t('cmpx.estimates.estimate_hash')}{est.id.slice(-6)} - <span className="font-normal">{new Date(est.date).toLocaleDateString()}</span>
                                        </p>
                                        <p className="text-sm text-neutral-700 dark:text-neutral-200">
                                            ${estSubtotal.toFixed(2)} <span className="text-neutral-500 dark:text-neutral-400">+ ${estIvu.toFixed(2)} {t('cmpx.estimates.ivu_suffix')}</span> <span className="font-semibold">= ${est.totalAmount.toFixed(2)}</span>
                                        </p>
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('cmpx.estimates.items_status', { count: est.items.length, status: est.status })}</p>
                                        {est.notes && <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 italic line-clamp-1">{t('cmpx.estimates.notes_label')} {est.notes}</p>}
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    ) : (
                         <p className="text-center text-base py-8">{t('cmpx.estimates.none_pending')}</p>
                    )}
                </div>

                <div className="border-t pt-6 dark:border-neutral-700">
                    <h3 className="text-lg font-semibold mb-2">{t('cmpx.estimates.create_from_cart')}</h3>
                    <p className="text-sm text-neutral-500 mb-3">{t('cmpx.estimates.create_from_cart_hint')}</p>
                    {isGeneralClient && (
                        <div className="mb-3 space-y-2">
                            <div>
                                <label htmlFor="estimateManualName" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                    {t('cmpx.estimates.manual_name_label')}
                                </label>
                                <input
                                    type="text"
                                    id="estimateManualName"
                                    value={manualName}
                                    onChange={e => setManualName(e.target.value)}
                                    placeholder={t('cmpx.estimates.manual_name_ph')}
                                    className="w-full px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 focus:ring-1 focus:ring-primary focus:border-primary"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                    <label htmlFor="estimateManualPhone" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                        {t('cmpx.estimates.manual_phone_label')}
                                    </label>
                                    <input
                                        type="tel"
                                        id="estimateManualPhone"
                                        value={manualPhone}
                                        onChange={e => setManualPhone(e.target.value)}
                                        placeholder={t('cmpx.estimates.manual_phone_ph')}
                                        className="w-full px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 focus:ring-1 focus:ring-primary focus:border-primary"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="estimateManualAddress" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                                        {t('cmpx.estimates.manual_address_label')}
                                    </label>
                                    <input
                                        type="text"
                                        id="estimateManualAddress"
                                        value={manualAddress}
                                        onChange={e => setManualAddress(e.target.value)}
                                        placeholder={t('cmpx.estimates.manual_address_ph')}
                                        className="w-full px-3 py-2 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 focus:ring-1 focus:ring-primary focus:border-primary"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={handleCreateFromCart}
                        disabled={isCartEmpty}
                        className={`${BUTTON_SECONDARY_SM_CLASSES} w-full text-base py-2.5 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {t('cmpx.estimates.create_with_current')}
                    </button>
                    {isCartEmpty && <p className="text-sm text-center text-red-500 mt-2">{t('cmpx.estimates.cart_empty')}</p>}
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t dark:border-neutral-700">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>{t('common.cancel')}</button>
                    <button
                        type="button"
                        onClick={handleGeneratePDF}
                        className={BUTTON_SECONDARY_SM_CLASSES}
                        disabled={selectedEstimateIds.length === 0}
                    >
                        {t('cmpx.estimates.generate_pdf')}
                    </button>
                    <button
                        type="button"
                        onClick={handleLoadToCart}
                        className={BUTTON_PRIMARY_SM_CLASSES}
                        disabled={selectedEstimateIds.length === 0}
                    >
                        {t('cmpx.estimates.load_to_cart', { count: selectedEstimateIds.length > 0 ? selectedEstimateIds.length : '' })}
                    </button>
                </div>
            </div>
        </Modal>
    );
};