
import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Project, ProjectStatus, Client, Product as ProductType, Employee, ECommerceSettings, ProjectFormData } from '../../types'; // Adjusted path
import { useData } from '../../contexts/DataContext'; // Adjusted path
import { useECommerceSettings } from '../../contexts/ECommerceSettingsContext'; // Adjusted path
import { ProjectFormModal } from './ProjectFormModal'; // Adjusted path
import { ConfirmationModal } from '../../components/Modal'; // Adjusted path
import { ProjectCard } from '../../components/cards/ProjectCard'; // Adjusted path
import { PlusIcon, SparklesIcon } from '../../components/icons'; // Adjusted path
import { INPUT_SM_CLASSES, BUTTON_PRIMARY_SM_CLASSES, BUTTON_SECONDARY_SM_CLASSES } from '../../constants'; // Adjusted path
import { AIImportModal } from '../../components/AIImportModal'; // Adjusted path

interface GenerateQuotationPDFProps {
    project: Project;
    client: Client | undefined;
    allProducts: ProductType[];
    allEmployees: Employee[];
    storeSettings: ECommerceSettings; // Renamed for clarity
}

const generateQuotationPDF = ({project, client, allProducts, allEmployees, storeSettings}: GenerateQuotationPDFProps) => {
    const doc = new (jsPDF as any)(); 

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
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
    doc.text(`Fecha de Inicio Estimada: ${new Date(project.startDate + 'T00:00:00').toLocaleDateString('es-ES')}`, margin, currentY);
    currentY += 5;
    doc.text(`Fecha de Fin Estimada: ${new Date(project.endDate + 'T00:00:00').toLocaleDateString('es-ES')}`, margin, currentY);
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

export const ProjectsListPage: React.FC = () => {
    const { projects, setProjects, getClientById, products: allProductsFromHook, getAllEmployees, clients } = useData(); 
    const { getDefaultSettings } = useECommerceSettings(); // Changed to use getDefaultSettings
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [initialModalTab, setInitialModalTab] = useState<'details' | 'chat'>('details');
    
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [itemToDeleteId, setItemToDeleteId] = useState<string | null>(null);

    const [showAIImportModal, setShowAIImportModal] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'Todos'>('Todos');
    
    const allEmployees = getAllEmployees();

    const openModalForCreate = (initialData?: Partial<ProjectFormData>) => { 
        setEditingProject(null); 
        setInitialModalTab('details');
        if (initialData) {
            setEditingProject({ 
                id: '',
                ...initialData,
                name: initialData.name || '',
                clientId: initialData.clientId || (clients.length > 0 ? clients[0].id : ''),
                startDate: initialData.startDate || new Date().toISOString().split('T')[0],
                endDate: initialData.endDate || '',
                status: initialData.status || ProjectStatus.PENDING,
                description: initialData.description || '',
                assignedProducts: initialData.assignedProducts || [],
                assignedEmployeeIds: initialData.assignedEmployeeIds || [],
            } as Project);
        }
        setShowFormModal(true); 
    };

    const openModalForEdit = (proj: Project, initialTab: 'details' | 'chat' = 'details') => { 
        setEditingProject(proj); 
        setInitialModalTab(initialTab);
        setShowFormModal(true); 
    };
    
    const requestDelete = (projId: string) => {
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
        const currentStoreSettings = getDefaultSettings(); // Get current default settings
        generateQuotationPDF({
            project,
            client,
            allProducts: allProductsFromHook,
            allEmployees,
            storeSettings: currentStoreSettings // Pass the obtained settings
        });
    };

    const handleAiProjectImportSuccess = (dataArray: any[]) => {
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

            // Attempt to find client ID if AI provided a name. For simplicity, exact match for now.
            let foundClientId = item.clientId || '';
            if (!foundClientId && item.clientName) {
                const clientByName = clients.find(c => 
                    (c.name + ' ' + c.lastName).toLowerCase() === item.clientName.toLowerCase() ||
                    c.name.toLowerCase() === item.clientName.toLowerCase()
                );
                if (clientByName) foundClientId = clientByName.id;
            }
            if (!foundClientId && clients.length > 0) { // Fallback if no client match
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
                startDate: item.startDate || new Date().toISOString().split('T')[0],
                endDate: item.endDate || '', // End date can be optional initially
                assignedProducts: [], // Keep manual for bulk import
                assignedEmployeeIds: [], // Keep manual for bulk import
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
        return projects
            .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .filter(p => statusFilter === 'Todos' || p.status === statusFilter);
    }, [projects, searchTerm, statusFilter]);

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl font-semibold text-neutral-700 dark:text-neutral-200">Gestión de Proyectos</h1>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input 
                        type="text" 
                        placeholder="Buscar proyectos..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        className={`${INPUT_SM_CLASSES} flex-grow sm:flex-grow-0`} 
                        aria-label="Buscar proyectos"
                    />
                    <select 
                        value={statusFilter} 
                        onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'Todos')}
                        className={INPUT_SM_CLASSES}
                        aria-label="Filtrar por estado"
                    >
                        <option value="Todos">Todos los Estados</option>
                        {Object.values(ProjectStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button onClick={() => setShowAIImportModal(true)} className={`${BUTTON_SECONDARY_SM_CLASSES} flex items-center flex-shrink-0`}>
                        <SparklesIcon /> Importar con IA
                    </button>
                    <button onClick={() => openModalForCreate()} className={`${BUTTON_PRIMARY_SM_CLASSES} flex items-center flex-shrink-0`}>
                        <PlusIcon /> Crear Proyecto
                    </button>
                </div>
            </div>

            {filteredProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map(proj => (
                        <ProjectCard 
                            key={proj.id} 
                            project={proj} 
                            onEdit={openModalForEdit} 
                            onRequestDelete={requestDelete} 
                            onViewQuotation={handleGenerateQuotationPDF}
                            allEmployees={allEmployees}
                        />
                    ))}
                </div>
            ) : (
                <p className="text-center text-neutral-500 dark:text-neutral-400 py-8">No se encontraron proyectos con los filtros actuales.</p>
            )}
            
            <ProjectFormModal 
                isOpen={showFormModal} 
                onClose={() => setShowFormModal(false)} 
                project={editingProject}
                initialTab={initialModalTab} 
            />
            <ConfirmationModal
                isOpen={showDeleteConfirmModal}
                onClose={() => setShowDeleteConfirmModal(false)}
                onConfirm={confirmDelete}
                title="Confirmar Eliminación"
                message="¿Estás seguro de que quieres eliminar este proyecto? Esta acción no se puede deshacer."
                confirmButtonText="Sí, Eliminar"
            />
            <AIImportModal
                isOpen={showAIImportModal}
                onClose={() => setShowAIImportModal(false)}
                onImportSuccess={handleAiProjectImportSuccess}
                entityName="Proyecto"
                fieldsToExtract="nombre (string), descripción (string), estado (string: Activo, Completado, Pausado, Pendiente), opcionalmente: clientId (string), clientName (string), startDate (string YYYY-MM-DD), endDate (string YYYY-MM-DD)"
                exampleFormat={`{
  "nombre": "Renovación Baño Principal",
  "descripcion": "Actualización completa de azulejos, sanitarios y grifería.",
  "estado": "Pendiente",
  "clientName": "Laura Díaz" 
}`}
            />
        </div>
    );
};
