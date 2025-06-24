
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { SparklesIcon, XMarkIcon, PaperAirplaneIcon, ChatBubbleLeftRightIcon } from './icons'; // Added ChatBubbleLeftRightIcon
import { BUTTON_PRIMARY_CLASSES } from '../constants';

interface ChatMessage {
    id: string;
    text: string;
    sender: 'user' | 'ai';
    timestamp: string;
}

export const VirtualAssistant: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const { currentUser } = useAuth();
    const { 
        sales, 
        orders, 
        clients, 
        employees, 
        products, 
        projects: allProjects, 
        getUpcomingVisits,
        getProductById, 
        getClientById, 
        getEmployeeById 
    } = useData();

    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);
    
    const summarizeDataForAI = () => {
        const now = new Date();
        const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() -1, now.getDate());
        
        const recentSales = sales
            .filter(s => new Date(s.date) >= oneMonthAgo)
            .slice(0, 3) // Limit to 3 recent sales for brevity in context
            .map(s => {
                const saleClient = s.clientId ? getClientById(s.clientId) : null;
                return { 
                    id: s.id.slice(-6), 
                    total: s.totalAmount, 
                    date: new Date(s.date).toLocaleDateString(), 
                    metodo: s.paymentMethod, 
                    cliente: saleClient ? `${saleClient.name} ${saleClient.lastName}` : (s.clientId ? `ID: ${s.clientId.slice(-4)}` : 'Contado'),
                    items: s.items.map(item => ({ 
                        nombre: getProductById(item.id)?.name || item.name, 
                        cantidad: item.quantity,
                        precioUnitario: item.unitPrice 
                    })).slice(0,3) // Max 3 items per sale in summary
                };
            });

        const recentEcomOrders = orders
            .filter(o => new Date(o.date) >= oneMonthAgo)
            .slice(0, 3) // Limit to 3 recent e-com orders
            .map(o => ({
                id: o.id.slice(-6),
                clienteNombre: o.clientName,
                total: o.totalAmount,
                fecha: new Date(o.date).toLocaleDateString(),
                estado: o.status,
                items: o.items.map(item => ({
                    nombre: getProductById(item.id)?.name || item.name,
                    cantidad: item.quantity,
                    precioUnitario: item.unitPrice
                })).slice(0,3) // Max 3 items per order in summary
            }));
        
        const clientSummary = {
            totalClients: clients.length,
            sampleClients: clients.slice(0, 2).map(c => { // Sample 2 clients
                const clientPOSSales = sales.filter(s => s.clientId === c.id);
                const clientEcomOrders = orders.filter(o => o.clientEmail === c.email );
                
                const recentPOSActivity = clientPOSSales
                    .filter(s => new Date(s.date) >= oneMonthAgo)
                    .slice(0,1) // Take 1 most recent POS sale for this client sample
                    .map(s => `Última venta POS (${new Date(s.date).toLocaleDateString()}): ${s.items.slice(0,2).map(i => `${getProductById(i.id)?.name || i.name} (x${i.quantity})`).join(', ')}${s.items.length > 2 ? ' y más...' : '' } por $${s.totalAmount.toFixed(2)}.`);

                const recentEcomActivity = clientEcomOrders
                    .filter(o => new Date(o.date) >= oneMonthAgo)
                    .slice(0,1) // Take 1 most recent Ecom order for this client sample
                    .map(o => `Último pedido online (${new Date(o.date).toLocaleDateString()}): ${o.items.slice(0,2).map(i => `${getProductById(i.id)?.name || i.name} (x${i.quantity})`).join(', ')}${o.items.length > 2 ? ' y más...' : '' } por $${o.totalAmount.toFixed(2)}.`);

                return {
                    id: c.id.slice(-6),
                    nombre: `${c.name} ${c.lastName}`,
                    tipo: c.clientType,
                    emailResumen: c.email.split('@')[0] + "@...",
                    numVentasPOS: clientPOSSales.length,
                    totalGastadoPOS: clientPOSSales.reduce((sum, s) => sum + s.totalAmount, 0).toFixed(2),
                    actividadPOSReciente: recentPOSActivity.length > 0 ? recentPOSActivity.join(" ") : "Sin ventas POS recientes en resumen.",
                    numPedidosOnline: clientEcomOrders.length,
                    totalGastadoOnline: clientEcomOrders.reduce((sum, o) => sum + o.totalAmount, 0).toFixed(2),
                    actividadOnlineReciente: recentEcomActivity.length > 0 ? recentEcomActivity.join(" ") : "Sin pedidos online recientes en resumen.",
                    proyectosAsignados: allProjects.filter(p => p.clientId === c.id).length
                };
            })
        };
        
        const employeeSummary = {
            totalEmployees: employees.length,
            sampleEmployees: employees.slice(0, 2).map(e => ({ nombre: e.name, puesto: e.role }))
        };

        const upcomingProjects = allProjects
            .filter(p => p.status === 'Activo' || p.status === 'Pendiente')
            .slice(0,2) 
            .map(p => {
                const clientName = getClientById(p.clientId)?.name || 'N/A'; 
                const assignedEmpNames = p.assignedEmployeeIds.map(id => getEmployeeById(id)?.name).filter(Boolean).join(', '); 
                return { 
                    nombre: p.name, 
                    estado: p.status, 
                    cliente: clientName, 
                    asignados: assignedEmpNames || 'Ninguno', 
                    productos: p.assignedProducts.length,
                    fechaVisitaInicial: p.visitDate ? new Date(p.visitDate  + 'T00:00:00').toLocaleDateString() : 'N/P',
                    horaVisitaInicial: p.visitTime || 'N/P',
                    modoTrabajo: p.workMode,
                    diasTrabajoProgramados: p.workDays?.length,
                    rangosHorariosProgramados: p.workDayTimeRanges?.length 
                };
            });
        
        const upcomingVisitsSummary = getUpcomingVisits(2).map(v => {
            const projectName = v.projectId ? allProjects.find(p => p.id === v.projectId)?.name || v.projectId.slice(-6) : 'General'; 
            const assignedStaff = v.assignedEmployeeIds.map(id => getEmployeeById(id)?.name).filter(Boolean).join(', ') || 'N/A';
            return { 
                titulo: v.title, 
                proyecto: projectName, 
                fecha: new Date(v.date + 'T00:00:00').toLocaleDateString(), 
                hora: v.startTime,
                staff: assignedStaff
            };
        });

        const sampleProductsInfo = products
            .filter(p => p.storeOwnerId === 'admin-user' || !p.storeOwnerId) 
            .slice(0, 3)
            .map(p => {
                const mainBranchId = 'branch-central';
                const mainBranchStock = p.stockByBranch.find(sb => sb.branchId === mainBranchId);
                return {
                    nombre: p.name,
                    categoria: p.category || 'N/A',
                    precio: p.unitPrice.toFixed(2),
                    stockSucursalPrincipal: mainBranchStock ? mainBranchStock.quantity : (p.stockByBranch[0]?.quantity || 0)
                };
            });

        return {
            fechaActual: now.toISOString().split('T')[0],
            resumenVentasPOSRecientes: recentSales, // Includes items
            resumenPedidosOnlineRecientes: recentEcomOrders, // Includes items
            infoClientes: clientSummary, // Includes recent activity with item hints
            infoColaboradores: employeeSummary,
            infoProductosMuestra: sampleProductsInfo,
            proyectosDestacados: upcomingProjects,
            proximasVisitas: upcomingVisitsSummary,
            currentUser: currentUser ? { nombre: currentUser.name, rol: currentUser.role } : null,
        };
    };


    const handleSendMessage = async () => {
        if (!userInput.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            text: userInput,
            sender: 'user',
            timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, userMessage]);
        setUserInput('');
        setIsLoading(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const contextualData = summarizeDataForAI();
            
            const systemInstruction = `Eres Pazzi Asistente Virtual, un ayudante experto en la plataforma Pazzi.
Tu objetivo es responder preguntas sobre reportes, ventas (POS y online, incluyendo detalles de artículos en transacciones recientes), clientes (incluyendo su actividad reciente y tipos de productos comprados si están en el resumen), colaboradores, productos y proyectos.
Esto incluye detalles como estado de pedidos, productos en pedidos de clientes, fechas de visitas, y cronogramas de trabajo.
BASA TUS RESPUESTAS ÚNICAMENTE en la información de contexto que te proporciono a continuación.
El contexto incluye:
- Fecha actual.
- Resumen de ventas POS recientes (último mes, hasta 3 ventas, cada una con hasta 3 productos detallados).
- Resumen de pedidos online recientes (último mes, hasta 3 pedidos, cada uno con hasta 3 productos detallados).
- Información general de clientes (total, y muestra de 2 clientes con resumen de actividad incluyendo ventas POS y pedidos online recientes con ejemplos de productos si están en los resúmenes).
- Información general de colaboradores (total, y muestra de 2 colaboradores).
- Información de muestra de productos generales (hasta 3 productos con nombre, categoría, precio y stock en sucursal principal).
- Proyectos destacados (hasta 2 activos/pendientes con detalles).
- Próximas visitas programadas (hasta 2 con detalles).
- Datos del usuario actual (nombre, rol).

Sé conciso, amigable y directo. Si la información no está disponible en el contexto (ej. "productos exactos comprados por un cliente que no está en la muestra" o "historial completo de un cliente" o "detalles de ventas/pedidos no listados en los resúmenes recientes"), indícalo claramente y sugiere cómo el usuario podría encontrar esa información en la plataforma o pide más detalles.
No inventes información. No respondas preguntas que no estén relacionadas con Pazzi o los datos provistos.
Si se te pregunta por los productos que ha pedido un cliente específico, primero verifica si el cliente está en la muestra y si sus pedidos/ventas recientes (con detalle de items) están listados en el contexto. Si no es así, indica que no tienes el detalle completo en el resumen actual.`;
            
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-04-17",
                contents: [{ role: "user", parts: [{text: userInput}] }, {role: "model", parts:[{text: `Contexto actual para Pazzi Asistente: ${JSON.stringify(contextualData)}`}]}],
                config: {
                  systemInstruction: systemInstruction,
                }
            });

            const aiMessageText = response.text;
            const aiMessage: ChatMessage = {
                id: `ai-${Date.now()}`,
                text: aiMessageText || "No pude procesar tu solicitud en este momento.",
                sender: 'ai',
                timestamp: new Date().toISOString(),
            };
            setMessages(prev => [...prev, aiMessage]);

        } catch (error) {
            console.error("Error con Gemini API:", error);
            const errorMessage: ChatMessage = {
                id: `err-${Date.now()}`,
                text: "Lo siento, tuve un problema al conectar con mis servicios. Intenta de nuevo más tarde.",
                sender: 'ai',
                timestamp: new Date().toISOString(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!currentUser) return null; 

    return (
        <>
            {/* Floating Action Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 bg-primary hover:bg-secondary text-white p-4 rounded-full shadow-xl z-50 transition-transform duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-neutral-900"
                aria-label={isOpen ? "Cerrar asistente virtual" : "Abrir asistente virtual"}
            >
                {isOpen ? <XMarkIcon className="w-6 h-6" /> : <ChatBubbleLeftRightIcon className="w-6 h-6" />}
            </button>

            {/* Chat Panel */}
            {isOpen && (
                <div className="fixed bottom-20 right-6 sm:bottom-6 sm:right-24 w-full max-w-sm h-[70vh] sm:h-[500px] bg-white dark:bg-neutral-800 rounded-lg shadow-2xl flex flex-col z-40 border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                    {/* Header */}
                    <div className="flex justify-between items-center p-3 bg-neutral-100 dark:bg-neutral-700 border-b border-neutral-200 dark:border-neutral-600">
                        <h3 className="text-md font-semibold text-primary dark:text-accent flex items-center">
                            <SparklesIcon className="w-5 h-5 mr-2" /> Pazzi Asistente
                        </h3>
                        <button onClick={() => setIsOpen(false)} className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 p-3 space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-600">
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-2.5 rounded-xl shadow-sm ${
                                    msg.sender === 'user' 
                                        ? 'bg-primary text-white dark:bg-primary' 
                                        : 'bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100'
                                }`}>
                                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                    <p className={`text-xs mt-1 opacity-70 ${msg.sender === 'user' ? 'text-right text-neutral-200 dark:text-neutral-400' : 'text-left text-neutral-500 dark:text-neutral-400'}`}>
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                             <div className="flex justify-start">
                                <div className="max-w-[80%] p-2.5 rounded-xl shadow-sm bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-100">
                                    <p className="text-sm italic">Pazzi está pensando...</p>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 border-t border-neutral-200 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700/50">
                        <form
                            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                            className="flex items-center space-x-2"
                        >
                            <input
                                type="text"
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder="Pregúntame algo..."
                                className="flex-grow px-3 py-2 text-sm border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                                disabled={isLoading}
                                aria-label="Escribe tu pregunta al asistente"
                            />
                            <button
                                type="submit"
                                className={`${BUTTON_PRIMARY_CLASSES} !py-2 !px-3 rounded-md flex-shrink-0`}
                                disabled={isLoading || !userInput.trim()}
                                aria-label="Enviar pregunta"
                            >
                                <PaperAirplaneIcon className="w-5 h-5" />
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};
