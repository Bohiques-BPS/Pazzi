
import React, { useState, useMemo } from 'react';
import { Estimate, EstimateStatus, Client, Product } from '../../types';
import { useData } from '../../contexts/DataContext';
import { DataTable, TableColumn } from '../../components/DataTable';
import { EstimateFormModal } from './EstimateFormModal';
import { ConfirmationModal } from '../../components/Modal';
import { PlusIcon, EditIcon, DeleteIcon, PrinterIcon } from '../../components/icons';
import { BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useECommerceSettings } from '../../contexts/ECommerceSettingsContext';

const generateEstimatePDF = (estimate: Estimate, client: Client | undefined, getProductById: (id: string) => Product | undefined, storeSettings: any) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = margin;

    doc.setFontSize(18);
    doc.setTextColor(storeSettings.primaryColor || '#0D9488');
    doc.setFont("helvetica", "bold");
    doc.text(storeSettings.storeName || "Pazzi", margin, y);
    y += 10;
    
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.text(`Estimado #${estimate.id.slice(-6).toUpperCase()}`, pageWidth - margin, y, { align: 'right' });
    y += 5;
    doc.text(`Fecha: ${new Date(estimate.date).toLocaleDateString()}`, pageWidth - margin, y, { align: 'right' });
    y += 5;
    if (estimate.expiryDate) {
        doc.text(`Válido hasta: ${new Date(estimate.expiryDate  + 'T00:00:00').toLocaleDateString()}`, pageWidth - margin, y, { align: 'right' });
    }
    y += 10;

    doc.text("Para:", margin, y); y += 5;
    if (client) {
        doc.setFont("helvetica", "bold");
        doc.text(`${client.name} ${client.lastName}`, margin, y); y += 5;
        doc.setFont("helvetica", "normal");
        doc.text(client.email, margin, y);
    }
    y += 10;

    const tableHead = [['Cant.', 'Descripción', 'P. Unitario', 'Total']];
    const tableBody = estimate.items.map(item => [
        item.quantity.toString(),
        getProductById(item.id)?.name || item.name,
        `$${item.unitPrice.toFixed(2)}`,
        `$${(item.unitPrice * item.quantity).toFixed(2)}`
    ]);

    autoTable(doc, {
        head: tableHead,
        body: tableBody,
        startY: y,
        theme: 'striped',
        headStyles: { fillColor: [parseInt(storeSettings.primaryColor.slice(1, 3), 16), parseInt(storeSettings.primaryColor.slice(3, 5), 16), parseInt(storeSettings.primaryColor.slice(5, 7), 16)] }
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    const subtotal = estimate.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const iva = estimate.totalAmount - subtotal;
    
    doc.text(`Subtotal: $${subtotal.toFixed(2)}`, pageWidth - margin, y, { align: 'right' }); y += 7;
    doc.text(`IVA: $${iva.toFixed(2)}`, pageWidth - margin, y, { align: 'right' }); y += 7;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Total Estimado: $${estimate.totalAmount.toFixed(2)}`, pageWidth - margin, y, { align: 'right' }); y += 10;
    
    if (estimate.notes) {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text("Notas:", margin, y); y += 5;
        const notesLines = doc.splitTextToSize(estimate.notes, pageWidth - (margin * 2));
        doc.text(notesLines, margin, y);
    }

    doc.save(`Estimado_${estimate.id.slice(-6)}.pdf`);
};


export const EstimatesListPage: React.FC = () => {
    const { estimates, setEstimates, getClientById, getProductById } = useData();
    const { getDefaultSettings } = useECommerceSettings();
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingEstimate, setEditingEstimate] = useState<Estimate | null>(null);
    
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

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
    
    const handlePrint = (estimate: Estimate) => {
        const client = getClientById(estimate.clientId);
        const settings = getDefaultSettings();
        generateEstimatePDF(estimate, client, getProductById, settings);
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
                    'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-200' // Borrador
                }`}>{e.status}</span>
            )
        },
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">Gestión de Estimados</h1>
                <button onClick={openModalForCreate} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center`}>
                    <PlusIcon /> Crear Estimado
                </button>
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
        </div>
    );
};
