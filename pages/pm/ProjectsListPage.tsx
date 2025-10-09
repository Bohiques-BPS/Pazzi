import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import { Project, ProjectStatus, Client, Product as ProductType, Employee, ECommerceSettings, ProjectFormData, UserRole, Visit, VisitStatus } from '../../types'; // Adjusted path
import { useData } from '../../contexts/DataContext'; // Adjusted path
import { useAuth } from '../../contexts/AuthContext'; // Added useAuth
import { useECommerceSettings } from '../../contexts/ECommerceSettingsContext'; // Adjusted path
import { ConfirmationModal } from '../../components/Modal'; // Adjusted path
import { ProjectCard } from '../../components/cards/ProjectCard'; // Adjusted path
import { PlusIcon, SparklesIcon, EditIcon, DeleteIcon, DocumentArrowDownIcon } from '../../components/icons'; // Adjusted path
import { INPUT_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES, ADMIN_USER_ID } from '../../constants'; // Adjusted path
import { AIImportModal } from '../../components/AIImportModal'; // Adjusted path
import { DataTable, TableColumn } from '../../components/DataTable'; // Added TableColumn import

interface GenerateQuotationPDFProps {
    project: Project;
    client: Client | undefined;
    allProducts: ProductType[];
    allEmployees: Employee[];
    storeSettings: ECommerceSettings; 
    visits: Visit[];
}

const generateQuotationPDF = ({project, client, allProducts, allEmployees, storeSettings, visits}: GenerateQuotationPDFProps) => {
    const doc = new (jsPDF as any)(); 

    const projectVisits = visits.filter(v => v.projectId === project.id).sort((a,b) => new Date(a.date + 'T' + a.startTime).getTime() - new Date(b.date + 'T' + b.startTime).getTime());
    const projectMinDate = projectVisits.length > 0 ? new Date(projectVisits[0].date + 'T00:00:00') : null;
    const projectMaxDate = projectVisits.length > 0 ? new Date(projectVisits[projectVisits.length - 1].date + 'T00:00:00') : null;


    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight(); // Defined pageHeight
    const margin = 15;
    let currentY = margin;

    doc.setFont("helvetica", "normal");

    if (storeSettings.logoUrl && !storeSettings.logoUrl.startsWith('https://picsum.photos')) { 
        try {
             doc.setFontSize(10);
             doc.text("Logo Pazzi (URL provided)", margin, currentY + 5); 
             currentY += 10;
        } catch (e) {
            console.error("Error adding logo to PDF:", e);
            doc.setFontSize(10);
            doc.text("Logo Pazzi", margin, currentY + 5); 
            currentY += 10;
        }
    } else {
        doc.setFontSize(18);
        doc.setTextColor(6, 182, 161); 
        doc.setFont("helvetica", "bold");
        doc.text("Pazzi", margin, currentY + 5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0,0,0);
        currentY += 10;
    }
    
    doc.setFontSize(10);
    doc.text(storeSettings.storeName || "Pazzi Remodelaciones", pageWidth - margin, currentY, { align: 'right' });
    currentY += 5;
    doc.text("Calle Falsa 123, Ciudad Ejemplo", pageWidth - margin, currentY, { align: 'right' });
    currentY += 5;
    doc.text("Tel: (555) 123-4567 | Email: info@pazzi.com", pageWidth - margin, currentY, { align: 'right' });
    currentY += 10;

    doc.setLineWidth(0.5);
    doc.line(margin, currentY, pageWidth - margin, currentY);
    currentY += 10;

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("COTIZACIÓN", pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Número de Cotización: COT-${project.id.slice(-6).toUpperCase()}`, margin, currentY);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, pageWidth - margin, currentY, { align: 'right' });
    currentY += 10;

    doc.setFont("helvetica", "bold");
    doc.text("Cliente:", margin, currentY);
    currentY += 5;
    doc.setFont("helvetica", "normal");
    if (client) {
        doc.text(`${client.name} ${client.lastName}`, margin, currentY);
        currentY += 5;
        doc.text(client.email, margin, currentY);
        currentY += 5;
        doc.text(client.phone || "Teléfono no disponible", margin, currentY);
    } else {
        doc.text("Información del cliente no disponible.", margin, currentY);
    }
    currentY += 10;

    doc.setFont("helvetica", "bold");
    doc.text("Detalles del Proyecto:", margin, currentY);
    currentY += 5;
    doc.setFont("helvetica", "normal");
    doc.text(`Nombre: ${project.name}`, margin, currentY);
    currentY += 5;
    if (project.description) {
        const descLines = doc.splitTextToSize(`Descripción: ${project.description}`, pageWidth - 2 * margin);
        doc.text(descLines, margin, currentY);
        currentY += (descLines.length * 5);
    }
    currentY += 2; 
    if (projectMinDate && projectMaxDate) {
        doc.text(`Periodo Estimado de Trabajo: ${projectMinDate.toLocaleDateString('es-ES')} - ${projectMaxDate.toLocaleDateString('es-ES')}`, margin, currentY);
    } else {
        doc.text(`Periodo Estimado de Trabajo: Fechas por definir (según visitas programadas).`, margin, currentY);
    }
    currentY += 10;

    const tableColumnStyles = {
        '0': { cellWidth: 'auto' as const }, 
        '1': { cellWidth: 20, halign: 'right' as const }, 
        '2': { cellWidth: 30, halign: 'right' as const }, 
        '3': { cellWidth: 30, halign: 'right' as const }  
    };
    
    const head = [['Descripción', 'Cant.', 'P. Unitario', 'Total']];
    let subtotal = 0;
    const body = project.assignedProducts.map(pr => {
        const productInfo = allProducts.find(p => p.id === pr.productId);
        const unitPrice = productInfo ? productInfo.unitPrice : 0;
        const itemTotal = unitPrice * pr.quantity;
        subtotal += itemTotal;
        return [
            productInfo ? productInfo.name : 'Producto Desconocido',
            pr.quantity.toString(),
            `$${unitPrice.toFixed(2)}`,
            `$${itemTotal.toFixed(2)}`
        ];
    });

    autoTable(doc as any, {
        head: head,
        body: body,
        startY: currentY,
        theme: 'striped', 
        headStyles: { fillColor: [6, 182, 161], textColor: 255 }, 
        columnStyles: tableColumnStyles,
        margin: { left: margin, right: margin },
        didDrawPage: (data: any) => { currentY = data.cursor.y; } 
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;


    const ivaRate = 0.16; 
    const ivaAmount = subtotal * ivaRate;
    const grandTotal = subtotal + ivaAmount;

    doc.setFontSize(10);
    let totalsX = pageWidth - margin - 60; 
    doc.text("Subtotal:", totalsX, currentY, {align: 'left'});
    doc.text(`$${subtotal.toFixed(2)}`, pageWidth - margin, currentY, {align: 'right'});
    currentY += 7;
    doc.text(`IVA (16%):`, totalsX, currentY, {align: 'left'});
    doc.text(`$${ivaAmount.toFixed(2)}`, pageWidth - margin, currentY, {align: 'right'});
    currentY += 7;
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL COTIZADO:", totalsX, currentY, {align: 'left'});
    doc.text(`$${grandTotal.toFixed(2)}`, pageWidth - margin, currentY, {align: 'right'});
    currentY += 15;
    doc.setFont("helvetica", "normal");

    if (project.assignedEmployeeIds.length > 0) {
        const assignedEmployeesList = project.assignedEmployeeIds
            .map(id => allEmployees.find(e => e.id === id))
            .filter(Boolean) as Employee[];
        if (assignedEmployeesList.length > 0) {
            doc.setFont("helvetica", "bold");
            doc.text("Equipo Asignado:", margin, currentY);
            currentY += 5;
            doc.setFont("helvetica", "normal");
            doc.text(assignedEmployeesList.map(e => `${e.name} ${e.lastName}`).join(', '), margin, currentY);
            currentY += 10;
        }
    }
    
    currentY = Math.max(currentY, pageHeight - margin - 40); 
     if (currentY > pageHeight - margin - 40) { 
        doc.addPage();
        currentY = margin;
    }

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Términos y Condiciones:", margin, currentY);
    currentY += 4;
    doc.setFont("helvetica", "normal");
    const terms = [
        "- Esta cotización es válida por 30 días a partir de la fecha de emisión.",
        "- Los precios están sujetos a cambios sin previo aviso después del período de validez.",
        "- Los trabajos no especificados explícitamente en esta cotización no están incluidos y pueden incurrir en costos adicionales.",
        "- Cualquier cambio al alcance original del proyecto deberá ser evaluado y cotizado por separado.",
        "- El pago se realizará según los términos acordados (ej: 50% anticipo, 50% contra entrega)."
    ];
    terms.forEach(term => {
        if (currentY > pageHeight - margin - 10) { 
            doc.addPage();
            currentY = margin;
        }
        doc.text(term, margin, currentY);
        currentY += 4;
    });
    currentY += 6;

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(100); 
        doc.text('Gracias por su confianza.', pageWidth / 2, pageHeight - margin + 5, { align: 'center' });
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - margin + 5, { align: 'right' });
    }
    
    doc.save(`cotizacion_${project.name.replace(/\s+/g, '_')}.pdf`);
};

interface GenerateInvoicePDFProps {
    project: Project;
    client: Client | undefined;
    allProducts: ProductType[];
    storeSettings: ECommerceSettings;
}

const generateInvoicePDF = ({project, client, allProducts, storeSettings}: GenerateInvoicePDFProps) => {
    const doc = new (jsPDF as any)();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let currentY = margin;

    doc.setFont("helvetica", "normal");

    // Store Logo/Name
    if (storeSettings.logoUrl && !storeSettings.logoUrl.startsWith('https://picsum.photos')) {
        try { doc.text("Logo Placeholder", margin, currentY + 5); currentY +=10; } // Placeholder
        catch (e) { console.error("Error adding logo:", e); doc.text(storeSettings.storeName, margin, currentY + 5); currentY += 10;}
    } else {
        doc.setFontSize(18); doc.setTextColor(6, 182, 161); doc.setFont("helvetica", "bold");
        doc.text(storeSettings.storeName || "Pazzi", margin, currentY + 5);
        doc.setFont("helvetica", "normal"); doc.setTextColor(0,0,0); currentY += 10;
    }
    
    // Store Contact Info
    doc.setFontSize(9);
    doc.text(storeSettings.storeName, pageWidth - margin, currentY, { align: 'right' }); currentY += 4;
    doc.text("Dirección de la Empresa, Ciudad", pageWidth - margin, currentY, { align: 'right' }); currentY += 4; // Replace with actual
    doc.text("Tel: (555) 000-PAZZI | Email: facturacion@pazzi.com", pageWidth - margin, currentY, { align: 'right' }); currentY += 8;

    doc.setLineWidth(0.5); doc.line(margin, currentY, pageWidth - margin, currentY); currentY += 10;

    // Invoice Title
    doc.setFontSize(20); doc.setFont("helvetica", "bold");
    doc.text("FACTURA", pageWidth / 2, currentY, { align: 'center' }); currentY += 10;
    
    // Invoice Details
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text(`Factura N°: ${project.invoiceNumber || 'N/A'}`, margin, currentY);
    doc.text(`Fecha: ${project.invoiceDate ? new Date(project.invoiceDate + 'T00:00:00').toLocaleDateString('es-ES') : 'N/A'}`, pageWidth - margin, currentY, { align: 'right' }); currentY += 5;
    doc.text(`Vencimiento: ${project.paymentDueDate ? new Date(project.paymentDueDate + 'T00:00:00').toLocaleDateString('es-ES') : 'N/A'}`, pageWidth - margin, currentY, { align: 'right' }); currentY += 8;

    // Client Details
    doc.setFont("helvetica", "bold"); doc.text("Facturar A:", margin, currentY); currentY += 5;
    doc.setFont("helvetica", "normal");
    if (client) {
        doc.text(`${client.name} ${client.lastName}`, margin, currentY); currentY += 5;
        doc.text(client.companyName || '', margin, currentY); currentY += client.companyName ? 5 : 0;
        doc.text(client.address || 'Dirección no especificada', margin, currentY); currentY += 5;
        doc.text(client.email, margin, currentY); currentY += 5;
        doc.text(`ID Fiscal: ${client.taxId || 'N/A'}`, margin, currentY);
    } else { doc.text("Cliente no especificado", margin, currentY); }
    currentY += 10;

    // Project Details (brief)
    doc.setFont("helvetica", "bold"); doc.text("Concepto:", margin, currentY); currentY += 5;
    doc.setFont("helvetica", "normal");
    doc.text(`Proyecto: ${project.name}`, margin, currentY); currentY += 5;
    if (project.description) {
        const descLines = doc.splitTextToSize(`Detalle: ${project.description}`, pageWidth - 2 * margin);
        doc.text(descLines, margin, currentY); currentY += (descLines.length * 4);
    }
    currentY += 8;

    // Table of Items
    const tableColumnStyles = {
        '0': { cellWidth: 'auto' as const }, 
        '1': { cellWidth: 20, halign: 'right' as const }, 
        '2': { cellWidth: 30, halign: 'right' as const }, 
        '3': { cellWidth: 25, halign: 'right' as const }, // IVA %
        '4': { cellWidth: 30, halign: 'right' as const }  // Total (con IVA)
    };
    
    const head = [['Descripción', 'Cant.', 'P. Unit.', 'IVA', 'Total']];
    let subtotal = 0;
    let totalIVA = 0;
    const defaultProjectIVARate = 0.16; // Default IVA for project items if not specified on product

    const body = project.assignedProducts.map(pr => {
        const productInfo = allProducts.find(p => p.id === pr.productId);
        const unitPrice = productInfo ? productInfo.unitPrice : 0;
        const lineSubtotal = unitPrice * pr.quantity;
        subtotal += lineSubtotal;
        
        // Use product's IVA if available, otherwise default project IVA
        const itemIVARate = productInfo?.ivaRate !== undefined ? productInfo.ivaRate : defaultProjectIVARate;
        const lineIVA = lineSubtotal * itemIVARate;
        totalIVA += lineIVA;
        const lineTotalWithIVA = lineSubtotal + lineIVA;

        return [
            productInfo ? productInfo.name : 'Producto Desconocido',
            pr.quantity.toString(),
            `$${unitPrice.toFixed(2)}`,
            `$${lineIVA.toFixed(2)} (${(itemIVARate * 100).toFixed(0)}%)`,
            `$${lineTotalWithIVA.toFixed(2)}`
        ];
    });

    autoTable(doc as any, {
        head: head, body: body, startY: currentY, theme: 'striped',
        headStyles: { fillColor: [30, 30, 30], textColor: 255 }, // Darker header for invoice
        columnStyles: tableColumnStyles, margin: { left: margin, right: margin },
        didDrawPage: (data: any) => { currentY = data.cursor.y; } 
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;

    // Totals Section
    const grandTotal = project.invoiceAmount !== undefined ? project.invoiceAmount : subtotal + totalIVA;

    doc.setFontSize(10);
    let totalsX = pageWidth - margin - 70; 
    doc.text("Subtotal:", totalsX, currentY, {align: 'left'});
    doc.text(`$${subtotal.toFixed(2)}`, pageWidth - margin, currentY, {align: 'right'}); currentY += 7;
    doc.text("Total IVA:", totalsX, currentY, {align: 'left'});
    doc.text(`$${totalIVA.toFixed(2)}`, pageWidth - margin, currentY, {align: 'right'}); currentY += 7;
    
    doc.setFontSize(12); doc.setFont("helvetica", "bold");
    doc.text("TOTAL A PAGAR:", totalsX, currentY, {align: 'left'});
    doc.text(`$${grandTotal.toFixed(2)}`, pageWidth - margin, currentY, {align: 'right'}); currentY += 15;
    
    // Payment Terms
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text("Términos de Pago: Neto 30 días desde fecha de factura.", margin, currentY); currentY += 5;
    doc.text("Detalles Bancarios para Transferencia: Banco XYZ, Cuenta: 123-456-789, SWIFT: XYZBANK", margin, currentY); currentY += 10;

    // Footer
    currentY = Math.max(currentY, pageHeight - margin - 20);
    if (currentY > pageHeight - margin - 20) { doc.addPage(); currentY = margin; }
    doc.setFontSize(8);
    doc.text("Gracias por su preferencia.", pageWidth / 2, pageHeight - margin + 5, { align: 'center' });
    
    doc.save(`Factura_${project.invoiceNumber || project.name.replace(/\s+/g, '_')}.pdf`);
};


export const ProjectsListPage: React.FC = () => {
    const { projects: allProjectsContext, setProjects, getClientById, products: allProductsFromHook, getAllEmployees, clients, visits, generateInvoiceForProject } = useData(); 
    const { currentUser } = useAuth();
    const { getDefaultSettings } = useECommerceSettings();
    const navigate = useNavigate();
    
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

    const [showAIImportModal, setShowAIImportModal] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'Todos'>('Todos');
    const [selectedClientFilter, setSelectedClientFilter] = useState<string>('Todos');
    const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('Todos');
    const [selectedProductFilter, setSelectedProductFilter] = useState<string>('Todos');
    const [sortOption, setSortOption] = useState<string>('default');
    
    const allEmployees = getAllEmployees();
    const isEmployeeView = currentUser?.role === UserRole.EMPLOYEE;
    const globalProducts = useMemo(() => allProductsFromHook.filter(p => p.storeOwnerId === ADMIN_USER_ID || !p.storeOwnerId), [allProductsFromHook]);


    const projectsToDisplay = useMemo(() => {
        if (isEmployeeView && currentUser) {
            return allProjectsContext.filter(p => p.assignedEmployeeIds.includes(currentUser.id));
        }
        return allProjectsContext; // For manager
    }, [allProjectsContext, currentUser, isEmployeeView]);

    const handleViewProject = (project: Project, initialTab: 'details' | 'chat' | 'tasks' = 'details') => {
        navigate(`/pm/projects/${project.id}?tab=${initialTab}`);
    };
    
    const requestDelete = (projId: string) => {
        if (isEmployeeView) return; 
        setItemToDeleteId(projId);
        setShowDeleteConfirmModal(true);
    };
    const confirmDelete = () => {
        if(itemToDeleteId){
            setProjects(prev => prev.filter(p => p.id !== itemToDeleteId));
            setItemToDeleteId(null);
        }
        setShowDeleteConfirmModal(false);
    };
    
    const handleGenerateQuotationPDF = (project: Project) => {
        const client = getClientById(project.clientId);
        const currentStoreSettings = getDefaultSettings(); 
        generateQuotationPDF({
            project,
            client,
            allProducts: globalProducts, 
            allEmployees,
            storeSettings: currentStoreSettings,
            visits 
        });
    };

    const handleGenerateInvoice = (project: Project) => {
        if (project.status === ProjectStatus.COMPLETED && !project.invoiceGenerated) {
           const success = generateInvoiceForProject(project.id); // Call context function
           if (success) {
               alert(`Factura generada para ${project.name}. Puede verla desde los detalles del proyecto.`);
               // Force re-render or update project state to reflect changes in UI
               setProjects(prev => prev.map(p => p.id === project.id ? {...p, invoiceGenerated: true, /* other fields updated by context */} : p));
           }
        } else {
            alert("La factura ya fue generada o el proyecto no está completado.");
        }
    };

    const handleViewInvoicePDF = (project: Project) => {
        if (!project.invoiceGenerated) {
            alert("Primero debe generar la factura para este proyecto.");
            return;
        }
        const client = getClientById(project.clientId);
        const storeSettings = getDefaultSettings();
        generateInvoicePDF({ project, client, allProducts: globalProducts, storeSettings });
    };


    const handleAiProjectImportSuccess = (dataArray: any[]) => {
        if (isEmployeeView) return;
        console.log("AI Data Array for Project Import:", dataArray);
        if (!Array.isArray(dataArray)) {
            alert("La IA no devolvió un array de datos de proyectos.");
            return;
        }

        let importedCount = 0;
        let failedCount = 0;
        const newProjects: Project[] = [];

        dataArray.forEach((item, index) => {
            const name = item.nombre || item.name || '';
            const description = item.descripcion || item.description || '';
            
            if (!name) {
                 console.warn(`Ítem ${index} omitido por falta de nombre:`, item);
                failedCount++;
                return;
            }

            let status = ProjectStatus.PENDING;
            if (item.estado || item.status) {
                const aiStatus = (item.estado || item.status).toLowerCase();
                if (aiStatus.includes('activo') || aiStatus.includes('active')) status = ProjectStatus.ACTIVE;
                else if (aiStatus.includes('completado') || aiStatus.includes('completed')) status = ProjectStatus.COMPLETED;
                else if (aiStatus.includes('pausado') || aiStatus.includes('paused')) status = ProjectStatus.PAUSED;
            }

            let foundClientId = item.clientId || '';
            if (!foundClientId && item.clientName) {
                const clientByName = clients.find(c => 
                    (c.name + ' ' + c.lastName).toLowerCase() === item.clientName.toLowerCase() ||
                    c.name.toLowerCase() === item.clientName.toLowerCase()
                );
                if (clientByName) foundClientId = clientByName.id;
            }
            if (!foundClientId && clients.length > 0) { 
                console.warn(`Cliente no encontrado para proyecto "${name}", usando el primer cliente disponible o ninguno si no hay.`);
                foundClientId = clients[0]?.id || ''; 
            }
            if (!foundClientId) {
                console.warn(`Proyecto "${name}" se importará sin cliente asignado, ya que no se encontró coincidencia y no hay clientes disponibles.`);
            }


            const newProject: Project = {
                id: `proj-ai-${Date.now()}-${index}`,
                name,
                description,
                status,
                clientId: foundClientId,
                assignedProducts: [], 
                assignedEmployeeIds: [], 
                visitDate: '',
                visitTime: '',
                workMode: 'daysOnly',
                workDays: [],
                workDayTimeRanges: [],
            };
            newProjects.push(newProject);
            importedCount++;
        });

        if (newProjects.length > 0) {
            setProjects(prev => [...prev, ...newProjects]);
        }
        
        let message = `${importedCount} proyectos importados correctamente.`;
        if (failedCount > 0) {
            message += ` ${failedCount} proyectos no pudieron ser importados por falta de datos o cliente no encontrado.`;
        }
        alert(message);
        setShowAIImportModal(false);
    };
    
    const filteredProjects = useMemo(() => {
        let tempProjects = [...projectsToDisplay]; 

        if (searchTerm) {
            tempProjects = tempProjects.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        if (statusFilter !== 'Todos') {
            tempProjects = tempProjects.filter(p => p.status === statusFilter);
        }
        if (selectedClientFilter !== 'Todos') {
            tempProjects = tempProjects.filter(p => p.clientId === selectedClientFilter);
        }
        if (selectedEmployeeFilter !== 'Todos') {
            tempProjects = tempProjects.filter(p => p.assignedEmployeeIds.includes(selectedEmployeeFilter));
        }
        if (selectedProductFilter !== 'Todos') {
            tempProjects = tempProjects.filter(p => p.assignedProducts.some(ap => ap.productId === selectedProductFilter));
        }

        // Sorting
        if (sortOption === 'nameAsc') {
            tempProjects.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortOption === 'nameDesc') {
            tempProjects.sort((a, b) => b.name.localeCompare(a.name));
        } else if (sortOption === 'upcomingVisit') {
            const getNextVisitDate = (projectId: string): Date | null => {
                const projectVisits = visits
                    .filter(v => v.projectId === projectId && v.status === VisitStatus.PROGRAMADO && new Date(v.date + 'T' + v.endTime) >= new Date())
                    .sort((v1, v2) => new Date(v1.date + 'T' + v1.startTime).getTime() - new Date(v2.date + 'T' + v2.startTime).getTime());
                return projectVisits.length > 0 ? new Date(projectVisits[0].date + 'T' + projectVisits[0].startTime) : null;
            };
            tempProjects.sort((a, b) => {
                const nextVisitA = getNextVisitDate(a.id);
                const nextVisitB = getNextVisitDate(b.id);
                if (nextVisitA && nextVisitB) return nextVisitA.getTime() - nextVisitB.getTime();
                if (nextVisitA) return -1;
                if (nextVisitB) return 1;
                return 0;
            });
        }
        // Default sort is by original order (usually insertion order or ID based on context data)
        return tempProjects;
    }, [projectsToDisplay, searchTerm, statusFilter, selectedClientFilter, selectedEmployeeFilter, selectedProductFilter, sortOption, visits]);

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">
                    {isEmployeeView ? "Mis Proyectos Asignados" : "Gestión de Proyectos"}
                </h1>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {!isEmployeeView && (
                        <>
                            <button onClick={() => setShowAIImportModal(true)} className={`${BUTTON_SECONDARY_SM_CLASSES} flex items-center`}>
                                <SparklesIcon /> Importar con IA
                            </button>
                            <Link to="/pm/projects/new" className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center`}>
                                <PlusIcon /> Crear Proyecto
                            </Link>
                        </>
                    )}
                </div>
            </div>
            
            <div className="mb-4 flex flex-wrap items-center gap-2 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-md shadow-sm">
                <input 
                    type="text" 
                    placeholder="Buscar proyectos..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                    className={`${INPUT_SM_CLASSES} flex-grow sm:flex-grow-0 min-w-[150px]`} 
                    aria-label="Buscar proyectos"
                />
                <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'Todos')}
                    className={`${INPUT_SM_CLASSES} min-w-[150px]`}
                    aria-label="Filtrar por estado"
                >
                    <option value="Todos">Todos los Estados</option>
                    {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                 {!isEmployeeView && (
                    <>
                        <select 
                            value={selectedClientFilter} 
                            onChange={(e) => setSelectedClientFilter(e.target.value)}
                            className={`${INPUT_SM_CLASSES} min-w-[150px]`}
                            aria-label="Filtrar por cliente"
                        >
                            <option value="Todos">Todos los Clientes</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.lastName}</option>)}
                        </select>
                        <select 
                            value={selectedEmployeeFilter} 
                            onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
                            className={`${INPUT_SM_CLASSES} min-w-[150px]`}
                            aria-label="Filtrar por colaborador"
                        >
                            <option value="Todos">Todos los Colaboradores</option>
                            {allEmployees.map(e => <option key={e.id} value={e.id}>{e.name} {e.lastName}</option>)}
                        </select>
                        <select 
                            value={selectedProductFilter} 
                            onChange={(e) => setSelectedProductFilter(e.target.value)}
                            className={`${INPUT_SM_CLASSES} min-w-[150px]`}
                            aria-label="Filtrar por producto"
                        >
                            <option value="Todos">Todos los Productos</option>
                            {globalProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </>
                 )}
                <select 
                    value={sortOption} 
                    onChange={(e) => setSortOption(e.target.value)}
                    className={`${INPUT_SM_CLASSES} min-w-[180px]`}
                    aria-label="Ordenar proyectos por"
                >
                    <option value="default">Ordenar por: Defecto</option>
                    <option value="nameAsc">Nombre (A-Z)</option>
                    <option value="nameDesc">Nombre (Z-A)</option>
                    <option value="upcomingVisit">Próxima Visita</option>
                </select>
            </div>


            {filteredProjects.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                    {filteredProjects.map(proj => (
                        <ProjectCard 
                            key={proj.id} 
                            project={proj} 
                            onViewProject={handleViewProject} 
                            onRequestDelete={requestDelete} 
                            onViewQuotation={handleGenerateQuotationPDF}
                            onGenerateInvoice={handleGenerateInvoice}
                            onViewInvoice={handleViewInvoicePDF}
                            allEmployees={allEmployees}
                            showManagementActions={!isEmployeeView} 
                        />
                    ))}
                </div>
            ) : (
                <p className="text-center text-neutral-500 dark:text-neutral-400 py-8">No se encontraron proyectos con los filtros actuales.</p>
            )}
            
            {!isEmployeeView && (
                 <ConfirmationModal
                    isOpen={showDeleteConfirmModal}
                    onClose={() => setShowDeleteConfirmModal(false)}
                    onConfirm={confirmDelete}
                    title="Confirmar Eliminación"
                    message="¿Estás seguro de que quieres eliminar este proyecto? Esta acción no se puede deshacer."
                    confirmButtonText="Sí, Eliminar"
                />
            )}
            {!isEmployeeView && (
                <AIImportModal
                    isOpen={showAIImportModal}
                    onClose={() => setShowAIImportModal(false)}
                    onImportSuccess={handleAiProjectImportSuccess}
                    entityName="Proyecto"
                    fieldsToExtract="nombre (string), descripción (string), estado (string: Activo, Completado, Pausado, Pendiente), opcionalmente: clientId (string), clientName (string)"
                    exampleFormat={`{
    "nombre": "Renovación Baño Principal",
    "descripcion": "Actualización completa de azulejos, sanitarios y grifería.",
    "estado": "Pendiente",
    "clientName": "Laura Díaz" 
    }`}
                />
            )}
        </div>
    );
};