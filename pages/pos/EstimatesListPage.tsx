import React, { useState, useMemo } from 'react';
import { Estimate, EstimateStatus, Client, Product, CartItem, EstimateFormData } from '../../types';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { DataTable, TableColumn } from '../../components/DataTable';
import { EstimateFormModal } from './EstimateFormModal';
import { ConfirmationModal } from '../../components/Modal';
import { PlusIcon, EditIcon, DeleteIcon, PrinterIcon } from '../../components/icons';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useECommerceSettings } from '../../contexts/ECommerceSettingsContext';

const generateEstimatePDF = async (estimate: Estimate, client: Client | undefined, getProductById: (id: string) => Product | undefined, storeSettings: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
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
    doc.text("Tel: (555) 123-PAZZI", pageWidth - margin, y, { align: 'right' });
    y += 10;
    
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Estimación de Costos", pageWidth / 2, y, { align: 'center' });
    y += 15;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    if (client) {
        doc.text(`Estimación para: ${client.name} ${client.lastName}`, margin, y);
    }
    doc.text(`Fecha: ${new Date(estimate.date).toLocaleDateString()}`, pageWidth - margin, y, { align: 'right' });
    y += 8;

    doc.text("Agradecemos la oportunidad de presentarle esta estimación para su consideración.", margin, y);
    y += 10;
    
    doc.setLineWidth(0.2);
    doc.line(margin, y - 2, pageWidth - margin, y - 2);

    const tableHead = [['Cant.', 'Descripción', 'P. Unitario', 'Total']];
    const tableBody = estimate.items.map(item => [
        item.quantity.toString(),
        getProductById(item.id)?.name || item.name,
        `$${item.unitPrice.toFixed(2)}`,
        `$${(item.unitPrice * item.quantity).toFixed(2)}`
    ]);

    const subtotal = estimate.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const iva = estimate.totalAmount - subtotal;

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
    doc.text(`$${estimate.totalAmount.toFixed(2)}`, pageWidth - margin, y, { align: 'right' });
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
    
    const qrText = `Estimado Pazzi\nID: ${estimate.id.slice(-6)}\nCliente: ${client?.name || 'N/A'}\nTotal: $${estimate.totalAmount.toFixed(2)}`;
    let qrCodeDataUrl = '';
    if ((window as any).QRCode) {
        try {
            qrCodeDataUrl = await (window as any).QRCode.toDataURL(qrText);
        } catch (err) {
            console.error("Failed to generate QR code", err);
        }
    } else {
        console.error("QRCode library is not loaded.");
    }

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        if (qrCodeDataUrl) {
            const qrSize = 20;
            const qrX = margin;
            const qrY = pageHeight - margin - qrSize - 5;
            doc.addImage(qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
            doc.setFontSize(7);
            doc.setTextColor(150);
            doc.text("Escanear para detalles", qrX + qrSize / 2, qrY + qrSize + 3, { align: 'center' });
        }
        
        doc.setFont("helvetica", "italic");
        doc.text("¡Esperamos poder servirle!", pageWidth / 2, pageHeight - margin - 5, { align: 'center' });
    }

    doc.save(`Estimado_${estimate.id.slice(-6)}.pdf`);
};


export const EstimatesListPage: React.FC = () => {
    const { estimates, setEstimates, getClientById, getProductById } = useData();
    const { currentUser } = useAuth();
    const { getDefaultSettings } = useECommerceSettings();
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingEstimate, setEditingEstimate] = useState<Estimate | null>(null);
    
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

    const [selectedEstimateIds, setSelectedEstimateIds] = useState<string[]>([]);
    const [showCombineConfirm, setShowCombineConfirm] = useState(false);

    const sortedEstimates = useMemo(() => 
        [...estimates].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [estimates]);

    const openModalForCreate = () => {
        setEditingEstimate(null);
        setShowFormModal(true);
    };

    const openModalForEdit = (estimate: Estimate) => {
        setEditingEstimate(estimate);
        setShowFormModal(true);
    };

    const requestDelete = (estimateId: string) => {
        setItemToDeleteId(estimateId);
        setShowDeleteConfirmModal(true);
    };

    const confirmDelete = () => {
        if (itemToDeleteId) {
            setEstimates(prev => prev.filter(e => e.id !== itemToDeleteId));
            setItemToDeleteId(null);
        }
        setShowDeleteConfirmModal(false);
    };
    
    const handlePrint = async (estimate: Estimate) => {
        const client = getClientById(estimate.clientId);
        const settings = getDefaultSettings();
        await generateEstimatePDF(estimate, client, getProductById, settings);
    };

    const handleCombine = () => {
        if (selectedEstimateIds.length < 2) {
            alert("Seleccione al menos dos estimados para combinar.");
            return;
        }

        const selected = sortedEstimates.filter(e => selectedEstimateIds.includes(e.id));
        const firstClientId = selected[0].clientId;
        if (!selected.every(e => e.clientId === firstClientId)) {
            alert("Solo se pueden combinar estimados del mismo cliente.");
            return;
        }

        setShowCombineConfirm(true);
    };

    const confirmCombine = () => {
        if (!currentUser) {
            alert("Error de autenticación.");
            return;
        }
        const selected = estimates.filter(e => selectedEstimateIds.includes(e.id));
        const firstClient = getClientById(selected[0].clientId);
        if (!firstClient) return;

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

        const newTotalAmount = combinedItems.reduce((sum, item) => {
            const product = getProductById(item.id);
            const ivaRate = product?.ivaRate ?? 0.16;
            return sum + (item.unitPrice * item.quantity * (1 + ivaRate));
        }, 0);
        
        const originalIds = selected.map(e => `#${e.id.slice(-6)}`).join(', ');

        const newEstimate: Estimate = {
            id: `est-${Date.now()}`,
            date: new Date().toISOString(),
            clientId: firstClient.id,
            items: combinedItems,
            totalAmount: newTotalAmount,
            status: EstimateStatus.BORRADOR,
            notes: `Combinado de estimados: ${originalIds}.\n\n--- NOTAS ORIGINALES ---\n${selected.map(e => e.notes).filter(Boolean).join('\n---\n')}`,
            employeeId: currentUser.id,
            branchId: selected[0].branchId,
        };

        setEstimates(prev => [
            ...prev.map(e => selectedEstimateIds.includes(e.id) ? { ...e, status: EstimateStatus.COMBINADO } : e),
            newEstimate
        ]);

        setSelectedEstimateIds([]);
        setShowCombineConfirm(false);
    };

    const handleGeneratePDF = async () => {
        // FIX: Use `estimates` from context and derive `client` from selection.
        const selected = estimates.filter(e => selectedEstimateIds.includes(e.id));
        if (selected.length === 0) {
            alert("Seleccione al menos un estimado para generar el PDF.");
            return;
        }

        const firstClientId = selected[0].clientId;
        if (!selected.every(e => e.clientId === firstClientId)) {
            alert("Solo puede generar un PDF combinado para estimados del mismo cliente.");
            return;
        }
        
        const client = getClientById(firstClientId);
        if (!client) {
            alert("No se pudo encontrar la información del cliente para los estimados seleccionados.");
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
        const pageHeight = doc.internal.pageSize.getHeight();
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
    
        const qrText = `Estimado Combinado Pazzi\nCliente: ${client.name} ${client.lastName}\nTotal: $${totalAmount.toFixed(2)}`;
        let qrCodeDataUrl = '';
        if ((window as any).QRCode) {
            try {
                qrCodeDataUrl = await (window as any).QRCode.toDataURL(qrText);
            } catch (err) {
                console.error("Failed to generate QR code", err);
            }
        } else {
            console.error("QRCode library is not loaded.");
        }
    
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            
            if (qrCodeDataUrl) {
                const qrSize = 20;
                const qrX = margin;
                const qrY = pageHeight - margin - qrSize - 5;
                doc.addImage(qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
                doc.setFontSize(7);
                doc.setTextColor(150);
                doc.text("Escanear para detalles", qrX + qrSize / 2, qrY + qrSize + 3, { align: 'center' });
            }
            
            doc.setFont("helvetica", "italic");
            doc.text("¡Esperamos poder servirle!", pageWidth / 2, pageHeight - margin - 5, { align: 'center' });
        }
    
        const selectedIdsString = selectedEstimateIds.join('_').slice(0, 10);
        doc.save(`Estimado_${client.name.replace(/\s/g, '_')}_${selectedIdsString}.pdf`);
    };

    const columns: TableColumn<Estimate>[] = [
        { header: 'ID Estimado', accessor: (e) => e.id.substring(0, 8).toUpperCase() },
        { header: 'Fecha', accessor: (e) => new Date(e.date).toLocaleDateString() },
        { header: 'Cliente', accessor: (e) => getClientById(e.clientId)?.name || 'N/A' },
        { header: 'Total', accessor: (e) => `$${e.totalAmount.toFixed(2)}` },
        { 
            header: 'Estado', 
            accessor: (e) => (
                 <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    e.status === EstimateStatus.ENVIADO ? 'bg-blue-100 text-blue-700 dark:bg-blue-700 dark:text-blue-100' :
                    e.status === EstimateStatus.ACEPTADO ? 'bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100' :
                    e.status === EstimateStatus.RECHAZADO || e.status === EstimateStatus.EXPIRADO ? 'bg-red-100 text-red-700 dark:bg-red-600 dark:text-red-100' :
                    e.status === EstimateStatus.COMBINADO ? 'bg-purple-100 text-purple-700 dark:bg-purple-700 dark:text-purple-200' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-200' // Borrador
                }`}>{e.status}</span>
            )
        },
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">Gestión de Estimados</h1>
                <div className="flex items-center gap-2">
                    {selectedEstimateIds.length >= 2 && (
                        <button onClick={handleCombine} className={`${BUTTON_SECONDARY_SM_CLASSES} flex items-center`}>
                            <PlusIcon /> Combinar ({selectedEstimateIds.length})
                        </button>
                    )}
                    <button onClick={openModalForCreate} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center`}>
                        <PlusIcon /> Crear Estimado
                    </button>
                </div>
            </div>
            <DataTable<Estimate>
                data={sortedEstimates}
                columns={columns}
                actions={(estimate) => (
                    <div className="flex space-x-1">
                        <button onClick={() => handlePrint(estimate)} className="text-primary hover:text-secondary p-1" title="Imprimir PDF"><PrinterIcon /></button>
                        <button onClick={() => openModalForEdit(estimate)} className="text-blue-600 dark:text-blue-400 p-1" title="Editar"><EditIcon /></button>
                        <button onClick={() => requestDelete(estimate.id)} className="text-red-600 dark:text-red-400 p-1" title="Eliminar"><DeleteIcon /></button>
                    </div>
                )}
                selectedIds={selectedEstimateIds}
                onSelectionChange={setSelectedEstimateIds}
            />
            <EstimateFormModal 
                isOpen={showFormModal} 
                onClose={() => setShowFormModal(false)} 
                estimateToEdit={editingEstimate}
            />
            <ConfirmationModal
                isOpen={showDeleteConfirmModal}
                onClose={() => setShowDeleteConfirmModal(false)}
                onConfirm={confirmDelete}
                title="Confirmar Eliminación"
                message="¿Estás seguro de que quieres eliminar este estimado? Esta acción no se puede deshacer."
                confirmButtonText="Sí, Eliminar"
            />
            <ConfirmationModal
                isOpen={showCombineConfirm}
                onClose={() => setShowCombineConfirm(false)}
                onConfirm={confirmCombine}
                title="Confirmar Combinación de Estimados"
                message={`¿Está seguro de que desea combinar ${selectedEstimateIds.length} estimados en uno nuevo? Los estimados originales se marcarán como 'Combinado'.`}
                confirmButtonText="Sí, Combinar"
            />
        </div>
    );
};