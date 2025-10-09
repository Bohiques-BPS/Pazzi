import React, { useState, useMemo, useEffect } from 'react';
import { Client, Estimate, CartItem, EstimateStatus, Product } from '../../types';
import { useData } from '../../contexts/DataContext';
import { Modal } from '../Modal';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useECommerceSettings } from '../../contexts/ECommerceSettingsContext';


interface ClientEstimatesModalProps {
    isOpen: boolean;
    onClose: () => void;
    client: Client | null;
    onLoadItems: (items: CartItem[], estimateIds: string[]) => void;
    isCartEmpty: boolean;
    onCreateFromCart: () => void;
}

export const ClientEstimatesModal: React.FC<ClientEstimatesModalProps> = ({ isOpen, onClose, client, onLoadItems, isCartEmpty, onCreateFromCart }) => {
    const { estimates, getProductById } = useData();
    const { getDefaultSettings } = useECommerceSettings();
    const [selectedEstimateIds, setSelectedEstimateIds] = useState<string[]>([]);

    useEffect(() => {
        if (!isOpen) {
            setSelectedEstimateIds([]);
        }
    }, [isOpen]);

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
            alert("Por favor seleccione al menos un estimado.");
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

    const handleGeneratePDF = () => {
        const selected = clientEstimates.filter(e => selectedEstimateIds.includes(e.id));
        if (selected.length === 0 || !client) {
            alert("Seleccione al menos un estimado y asegúrese de que haya un cliente asignado.");
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
        const defaultIVARate = 0.16;
        const iva = combinedItems.reduce((taxSum, item) => {
            const product = getProductById(item.id);
            const rate = product?.ivaRate ?? defaultIVARate;
            return taxSum + (item.unitPrice * item.quantity * rate);
        }, 0);
        const totalAmount = subtotal + iva;
    
        // --- PDF Generation using jsPDF ---
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        let y = margin;
    
        // Header
        doc.setFontSize(18);
        doc.setTextColor(storeSettings.primaryColor || '#0D9488');
        doc.setFont("helvetica", "bold");
        doc.text(storeSettings.storeName || "Pazzi Tienda Por Defecto", margin, y);
        y += 10;
        
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        doc.text("Sucursal: Sucursal Central", margin, y); // Hardcoded for now
        doc.text("Tel: (555) 123-PAZZI", pageWidth - margin, y, { align: 'right' }); // Hardcoded
        y += 10;
        
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("Estimación de Costos", pageWidth / 2, y, { align: 'center' });
        y += 15;
    
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`Estimación para: ${client.name} ${client.lastName}`, margin, y);
        doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, pageWidth - margin, y, { align: 'right' });
        y += 8;
    
        doc.text("Agradecemos la oportunidad de presentarle esta estimación para su consideración.", margin, y);
        y += 10;
        
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
            headStyles: { fillColor: [13, 148, 136] }, // teal-600
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
        doc.text("IVA:", totalsX, y, { align: 'left' });
        doc.text(`$${iva.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
        y += 7;
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
        <Modal isOpen={isOpen} onClose={onClose} title={`Estimados para ${client.name}`} size="2xl">
            <div className="space-y-6">
                
                <div>
                    <h3 className="text-lg font-semibold mb-2">Cargar Estimado Existente</h3>
                    <p className="text-base text-neutral-500 dark:text-neutral-400 mb-3">Seleccione uno o más estimados para combinar y cargar en el carrito de venta.</p>
                    {clientEstimates.length > 0 ? (
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                            {clientEstimates.map(est => (
                                <div key={est.id} className="flex items-start p-4 bg-neutral-50 dark:bg-neutral-700/60 rounded-md">
                                    <input
                                        type="checkbox"
                                        checked={selectedEstimateIds.includes(est.id)}
                                        onChange={() => handleSelectionChange(est.id)}
                                        className="form-checkbox h-5 w-5 text-primary rounded border-neutral-300 focus:ring-primary mt-1"
                                    />
                                    <div className="ml-4 flex-grow">
                                        <p className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
                                            Estimado #{est.id.slice(-6)} - <span className="font-normal">{new Date(est.date).toLocaleDateString()}</span> - ${est.totalAmount.toFixed(2)}
                                        </p>
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400">{est.items.length} artículo(s) - Estado: {est.status}</p>
                                        {est.notes && <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 italic line-clamp-1">Notas: {est.notes}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <p className="text-center text-base py-8">Este cliente no tiene estimados pendientes.</p>
                    )}
                </div>

                <div className="border-t pt-6 dark:border-neutral-700">
                    <h3 className="text-lg font-semibold mb-2">Crear a partir del Carrito</h3>
                    <p className="text-sm text-neutral-500 mb-3">Use los productos actualmente en el carrito para generar un nuevo estimado para este cliente.</p>
                    <button
                        type="button"
                        onClick={onCreateFromCart}
                        disabled={isCartEmpty}
                        className={`${BUTTON_SECONDARY_SM_CLASSES} w-full text-base py-2.5 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        Crear Estimado con Venta Actual
                    </button>
                    {isCartEmpty && <p className="text-sm text-center text-red-500 mt-2">El carrito está vacío.</p>}
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t dark:border-neutral-700">
                    <button type="button" onClick={onClose} className={BUTTON_SECONDARY_SM_CLASSES}>Cancelar</button>
                    <button
                        type="button"
                        onClick={handleGeneratePDF}
                        className={BUTTON_SECONDARY_SM_CLASSES}
                        disabled={selectedEstimateIds.length === 0}
                    >
                        Generar PDF
                    </button>
                    <button
                        type="button"
                        onClick={handleLoadToCart}
                        className={BUTTON_PRIMARY_SM_CLASSES}
                        disabled={selectedEstimateIds.length === 0}
                    >
                        Cargar {selectedEstimateIds.length > 0 ? selectedEstimateIds.length : ''} Seleccionado(s) al Carrito
                    </button>
                </div>
            </div>
        </Modal>
    );
};