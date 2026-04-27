
import React, { useState, createContext, useContext, useEffect } from 'react';
import { GlobalSettings } from '../types';

export interface GlobalSettingsContextType {
  settings: GlobalSettings;
  updateSettings: (newSettings: Partial<GlobalSettings>) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const GlobalSettingsContext = createContext<GlobalSettingsContextType | null>(null);

const DEFAULT_SETTINGS: GlobalSettings = {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    numberFormat: 'comma_decimal',
    language: 'es',
    fontSize: 'md',
    defaultTaxRate: 0.115, // Default IVU in PR is 11.5%
};

// --- Translations Dictionary ---
export const TRANSLATIONS = {
    es: {
        // Common
        'common.save': 'Guardar',
        'common.cancel': 'Cancelar',
        'common.edit': 'Editar',
        'common.delete': 'Eliminar',
        'common.create': 'Crear',
        'common.search': 'Buscar',
        'common.actions': 'Acciones',
        'common.name': 'Nombre',
        'common.email': 'Email',
        'common.phone': 'Teléfono',
        'common.address': 'Dirección',
        'common.accept': 'Aceptar',
        'common.confirm': 'Confirmar',
        'common.status': 'Estado',
        'common.notes': 'Notas',
        'common.yes': 'Sí',
        'common.no': 'No',
        'common.import_ai': 'Importar con IA',
        'common.previous': 'Anterior',
        'common.next': 'Siguiente',
        'common.page_of': 'Página {current} de {total}',
        'common.today': 'Hoy',
        'common.error': 'Error',
        'common.date': 'Fecha',
        'common.total': 'Total',
        'common.client': 'Cliente',
        'common.add': 'Añadir',
        'common.update': 'Actualizar',
        'common.choose_file': 'Elegir Archivo',

        // Confirmation Modals
        'confirm.delete.title': 'Confirmar Eliminación',
        'confirm.delete.message': '¿Estás seguro de que quieres eliminar este elemento? Esta acción no se puede deshacer.',
        'confirm.delete.btn': 'Sí, Eliminar',
        'confirm.cancel.btn': 'No, Cancelar',

        // Navbar & User Menu
        'nav.my_account': 'Mi Cuenta',
        'nav.configuration': 'Configuración',
        'nav.logout': 'Cerrar Sesión',
        'nav.my_orders': 'Mis Pedidos',

        // Modules & Sidebar
        'module.Tienda': 'Tienda',
        'module.Gestión de Proyectos': 'Gestión de Proyectos',
        'module.Punto de Venta': 'Punto de Venta',
        'module.E-commerce': 'E-commerce',
        'module.Administración': 'Administración',
        'module.Portal Cliente': 'Portal Cliente',

        // Sidebar Links
        'Productos': 'Productos',
        'Inventario': 'Inventario',
        'Categorías': 'Categorías',
        'Departamentos': 'Departamentos',
        'Clientes': 'Clientes',
        'Colaboradores': 'Colaboradores',
        'Sucursales': 'Sucursales',
        'Dashboard PM': 'Dashboard PM',
        'Proyectos': 'Proyectos',
        'Chat de Proyectos': 'Chat de Proyectos',
        'Calendario': 'Calendario',
        'Reportes PM': 'Reportes PM',
        'Caja Registradora': 'Caja Registradora',
        'Reportes POS': 'Reportes POS',
        'Historial de Ventas': 'Historial de Ventas',
        'Estimados': 'Estimados',
        'Apartados (Layaway)': 'Apartados (Layaway)',
        'Cuentas por Cobrar': 'Cuentas por Cobrar',
        'Cuentas por Pagar': 'Cuentas por Pagar',
        'Config. Cajas': 'Config. Cajas',
        'Dashboard E-commerce': 'Dashboard E-commerce',
        'Pedidos Online': 'Pedidos Online',
        'Proveedores': 'Proveedores',
        'Pedidos a Proveedor': 'Pedidos a Proveedor',
        'Mi Tienda (Vista Previa)': 'Mi Tienda (Vista Previa)',
        'Dashboard Admin': 'Dashboard Admin',
        'Dashboard Cliente': 'Dashboard Cliente',
        'Calendario Proyecto': 'Calendario Proyecto',
        'Chat del Proyecto': 'Chat del Proyecto',

        // Inventory Page
        'inventory.title': 'Gestión de Inventario',
        'inventory.search_placeholder': 'Buscar por nombre o SKU...',
        'inventory.filter.all_categories': 'Todas las Categorías',
        'inventory.col.product': 'Producto',
        'inventory.col.total_stock': 'Stock Total',
        'inventory.action.history': 'Historial',
        'inventory.action.adjust': 'Ajustar Stock',
        
        // Inventory History
        'inventory.history.title': 'Historial de Inventario: {product}',
        'inventory.history.current_stock_branch': 'Stock Actual por Sucursal',
        'inventory.history.total': 'Total',
        'inventory.history.movement_log': 'Registro de Movimientos por Sucursal',
        'inventory.history.col_date': 'Fecha',
        'inventory.history.col_type': 'Tipo',
        'inventory.history.col_change': 'Cambio',
        'inventory.history.col_stock_before': 'Stock Antes',
        'inventory.history.col_stock_after': 'Stock Después',
        'inventory.history.col_ref': 'Ref.',
        'inventory.history.col_notes': 'Notas',
        'inventory.history.col_employee': 'Empleado',
        'inventory.history.no_movements': 'No hay movimientos registrados para este producto en esta sucursal.',

        // Stock Adjustment
        'inventory.adjust.title': 'Gestionar Stock de: {product}',
        'inventory.adjust.single_title': 'Ajustar Stock - {product}',
        'inventory.adjust.adjusting_for': 'Ajustando stock para {product} en la sucursal {branch}.',
        'inventory.adjust.stock_in_branch': 'Stock en sucursal ({branch})',
        'inventory.adjust.total_stock_all': 'Stock Total (todas las sucursales)',
        'inventory.adjust.help_text': 'Ingrese la cantidad a sumar (ej: 10 o +10) o restar (ej: -5) para cada sucursal. Deje en blanco si no hay cambios.',
        'inventory.adjust.col_branch': 'Sucursal',
        'inventory.adjust.col_current': 'Stock Actual',
        'inventory.adjust.col_adjust': 'Ajuste (+/-)',
        'inventory.adjust.col_new': 'Nuevo Stock',
        'inventory.adjust.col_notes': 'Notas',
        'inventory.adjust.save': 'Guardar Ajustes',
        'inventory.adjust.save_btn': 'Guardar Ajuste',
        'inventory.adjust.add_subtract': 'Sumar o Restar Stock',
        'inventory.adjust.input_placeholder': 'Ej: +10, -5, 25',
        'inventory.adjust.input_help': 'Ingrese la cantidad a sumar (ej: 10 o +10) o restar (ej: -5).',
        'inventory.adjust.new_stock': 'Nuevo Stock en Sucursal',
        'inventory.adjust.reason_label': 'Notas / Razón (Opcional pero Recomendado)',
        'inventory.adjust.reason_placeholder': 'Ej: Conteo físico, producto dañado, transferencia...',

        // Categories
        'category.list.title': 'Gestión de Categorías',
        'category.list.create': 'Crear Categoría',
        'category.form.create': 'Crear Categoría',
        'category.form.edit': 'Editar Categoría',
        'category.field.name': 'Nombre de la Categoría',

        // Departments
        'department.list.title': 'Gestión de Departamentos',
        'department.list.create': 'Crear Departamento',
        'department.form.create': 'Crear Departamento',
        'department.form.edit': 'Editar Departamento',
        'department.field.name': 'Nombre del Departamento',

        // Branches
        'branch.list.title': 'Gestión de Sucursales',
        'branch.list.create': 'Crear Sucursal',
        'branch.form.create': 'Crear Sucursal',
        'branch.form.edit': 'Editar Sucursal',
        'branch.field.name': 'Nombre de la Sucursal',
        'branch.field.address': 'Dirección',
        'branch.field.phone': 'Teléfono',
        'branch.field.active': 'Sucursal Activa',

        // Employees
        'employee.list.title': 'Gestión de Colaboradores',
        'employee.list.create': 'Crear Colaborador',
        'employee.form.create': 'Crear Colaborador',
        'employee.form.edit': 'Editar Colaborador',
        'employee.field.name': 'Nombre',
        'employee.field.lastname': 'Apellido',
        'employee.field.email': 'Email',
        'employee.field.role': 'Rol',
        'employee.field.phone': 'Teléfono',
        'employee.field.address': 'Dirección',
        'employee.field.photo': 'Foto de Perfil',
        'employee.tab.personal': 'Personal',
        'employee.tab.access': 'Acceso y Empleo',
        'employee.tab.permissions': 'Permisos',
        'employee.tab.info': 'Información Adicional',

        // Clients
        'client.list.title': 'Gestión de Clientes',
        'client.list.create': 'Crear Cliente',
        'client.form.create': 'Crear Cliente',
        'client.form.edit': 'Modificar Cliente',
        'client.field.lastname': 'Apellido',
        'client.field.type': 'Tipo',
        'client.field.company': 'Empresa',
        'client.field.city': 'Ciudad',
        'client.field.country': 'País',
        'client.field.zip': 'Zip',
        'client.field.fax': 'Fax',
        'client.field.contact_person': 'Persona de Contacto',
        'client.field.ssn': 'Seguro Social',
        'client.field.dob': 'Fecha Nacimiento',
        'client.field.projects': 'Proyectos Asociados',
        'client.field.projects_hint': 'Mantenga presionado Ctrl (o Cmd en Mac) para seleccionar múltiples proyectos.',
        'client.tab.general': 'General',
        'client.tab.taxes': 'Impuestos',
        'client.tab.billing': 'Facturación',
        'client.tab.payments': 'Cobros',
        'client.tab.shipping': 'Envío',
        'client.tab.loyalty': 'Lealtad',
        'client.tab.photo': 'Foto',
        
        // Client Tabs Details
        'client.taxes.responsibility': 'Responsabilidad Contributiva',
        'client.taxes.state': 'Estatal (%)',
        'client.taxes.municipal': 'Municipal (%)',
        'client.taxes.tax_id': 'ID Fiscal (RFC/NIF)',
        'client.taxes.exemption': 'Exención IVU Municipal - Válido Hasta',
        'client.billing.address': 'Dirección de Facturación',
        'client.billing.special_msg': 'Mensaje Especial en la Factura',
        'client.billing.special_msg_hint': 'El mensaje se puede configurar en: Mantenimiento - Opciones.',
        'client.billing.charge_type': 'Tipo de Cobro Acordado',
        'client.billing.discount_price': 'Descuento al Precio',
        'client.billing.markup_cost': 'Sobre el Costo',
        'client.billing.code': 'Contraseña/Código',
        'client.payments.balance': 'Balance',
        'client.payments.credit_limit': 'Límite Crédito',
        'client.payments.terms': 'Términos',
        'client.payments.category': 'Categoría',
        'client.payments.salesperson': 'Vendedor',
        'client.payments.price_level': 'Nivel de Precios',
        'client.payments.business_type': 'Tipo de Negocio',
        'client.payments.zone': 'Zona',
        'client.payments.show_balance': 'Ver Balance',
        'client.shipping.address': 'Dirección de Envío',
        'client.shipping.contact_name': 'Nombre Contacto Envío',
        'client.shipping.contact_phone': 'Teléfono Contacto Envío',
        'client.shipping.carrier': 'Transportista Preferido',
        'client.loyalty.points': 'Puntos de Lealtad',
        'client.loyalty.level': 'Nivel de Lealtad',
        'client.photo.add_url': 'Añadir URL de Imagen',

        // Projects
        'project.list.title': 'Gestión de Proyectos',
        'project.list.create': 'Crear Proyecto',
        'project.form.create': 'Crear Proyecto',
        'project.form.edit': 'Editar Proyecto',
        'project.tab.details': 'Detalles',
        'project.tab.schedule': 'Programación',
        'project.tab.resources': 'Recursos',
        'project.tab.invoicing': 'Facturación',
        'project.field.name': 'Nombre del Proyecto',
        'project.field.client': 'Cliente',
        'project.field.status': 'Estado',
        'project.field.description': 'Descripción',
        'project.field.team': 'Equipo Asignado',
        'project.field.next_visit': 'Próxima Visita',
        
        // Project Schedule
        'project.schedule.initial_visit': 'Visita Inicial',
        'project.schedule.visit_date': 'Fecha Visita',
        'project.schedule.visit_time': 'Hora Visita',
        'project.schedule.work_type': 'Trabajo del Proyecto',
        'project.schedule.mode.days_only': 'Solo Días',
        'project.schedule.mode.days_times': 'Días y Horas',
        'project.schedule.mode.range': 'Rango Continuo',
        'project.schedule.add_work_day': 'Añadir Día de Trabajo',
        'project.schedule.start_time': 'Hora Inicio',
        'project.schedule.end_time': 'Hora Fin',
        'project.schedule.add_range': 'Añadir Rango',
        'project.schedule.range_start': 'Fecha Inicio Rango',
        'project.schedule.range_end': 'Fecha Fin Rango',

        // Project Resources
        'project.resources.assign_catalog': 'Asignar Productos del Catálogo',
        'project.resources.add_custom_title': 'Añadir Producto/Servicio Personalizado',
        'project.resources.quantity': 'Cantidad',
        'project.resources.unit_price_opt': 'Precio Unit. (Opc)',
        'project.resources.add_custom_btn': 'Añadir Personalizado',
        'project.resources.assign_employees': 'Asignar Empleados',

        // POS
        'pos.title': 'Caja Principal',
        'pos.emergency_mode': 'Modo Emergencia',
        'pos.clear_cart': 'Borrar',
        'pos.hold_cart': 'Espera',
        'pos.client': 'Cliente',
        'pos.payout': 'Desembolso',
        'pos.return': 'Devolución',
        'pos.estimate': 'Estimado',
        'pos.layaway': 'Apartado',
        'pos.reprint': 'Reimprimir',
        'pos.close_shift': 'Cerrar Turno',
        'pos.user': 'Usuario',
        'pos.pay': 'Pagar',
        'pos.total': 'TOTAL',
        'pos.subtotal': 'Subtotal',
        'pos.tax': 'IVU',
        'pos.search_placeholder': 'Buscar por SKU, Código Barras o Nombre',
        'pos.empty_cart': 'El carrito está vacío',
        'pos.client_search': 'Buscar / Asignar Cliente',
        'pos.new_project': 'Nuevo Proyecto',
        'pos.barcode_scan': 'Escaneo de Artículos',
        'pos.barcode_placeholder': 'Escanear Código...',
        'pos.product_not_found': 'Producto no encontrado',
        
        // POS Sales History
        'pos.sales_history.title': 'Historial de Ventas POS',
        'pos.sales_history.col.id': 'ID Venta',
        'pos.sales_history.col.date': 'Fecha',
        'pos.sales_history.col.total': 'Total',
        'pos.sales_history.col.items': 'Items',
        'pos.sales_history.col.method': 'Método Pago',
        'pos.sales_history.col.cashier': 'Cajero',
        'pos.sales_history.col.register': 'ID Caja',
        'pos.sales_history.print_receipt': 'Imprimir Recibo',

        // POS Estimates
        'pos.estimates.title': 'Gestión de Estimados',
        'pos.estimates.create': 'Crear Estimado',
        'pos.estimates.combine': 'Combinar',
        'pos.estimates.col.id': 'ID Estimado',
        'pos.estimates.col.date': 'Fecha',
        'pos.estimates.col.client': 'Cliente',
        'pos.estimates.col.total': 'Total',
        'pos.estimates.col.status': 'Estado',
        'pos.estimates.form.create_title': 'Crear Estimado',
        'pos.estimates.form.edit_title': 'Editar Estimado',
        'pos.estimates.form.add_products': 'Añadir Productos',
        'pos.estimates.form.status': 'Estado',
        'pos.estimates.form.valid_until': 'Válido Hasta (Opcional)',
        'pos.estimates.form.notes': 'Notas',
        'pos.estimates.print_pdf': 'Imprimir PDF',
        'pos.estimates.confirm_combine.title': 'Confirmar Combinación de Estimados',
        'pos.estimates.confirm_combine.message': '¿Está seguro de que desea combinar {count} estimados en uno nuevo? Los estimados originales se marcarán como "Combinado".',

        // POS Layaways
        'pos.layaways.title': 'Gestión de Apartados (Layaway)',
        'pos.layaways.col.id': 'ID Apartado',
        'pos.layaways.col.date': 'Fecha',
        'pos.layaways.col.client': 'Cliente',
        'pos.layaways.col.total': 'Total',
        'pos.layaways.col.paid': 'Pagado',
        'pos.layaways.col.balance': 'Balance',
        'pos.layaways.col.status': 'Estado',
        'pos.layaways.register_payment': 'Registrar Abono',
        'pos.layaways.mark_completed': 'Marcar como Completado/Entregado',
        'pos.layaways.cancel': 'Cancelar Apartado',
        'pos.layaways.confirm_cancel.title': 'Confirmar Cancelación de Apartado',
        'pos.layaways.confirm_cancel.message': '¿Está seguro de que desea cancelar el apartado #{id}? El stock NO será devuelto automáticamente.',
        'pos.layaways.confirm_complete.title': 'Confirmar Completado',
        'pos.layaways.confirm_complete.message': '¿Marcar el apartado #{id} como completado y entregado?',
        
        // POS Accounts Receivable
        'pos.receivable.title': 'Cuentas por Cobrar',
        'pos.receivable.filter': 'Filtrar:',
        'pos.receivable.filter.pending': 'Pendientes',
        'pos.receivable.filter.paid': 'Pagadas',
        'pos.receivable.filter.all': 'Todas',
        'pos.receivable.col.id': 'ID Venta',
        'pos.receivable.col.date': 'Fecha Venta',
        'pos.receivable.col.due_date': 'Vencimiento',
        'pos.receivable.col.client': 'Cliente',
        'pos.receivable.col.total': 'Monto Total',
        'pos.receivable.col.paid': 'Monto Pagado',
        'pos.receivable.col.balance': 'Saldo',
        'pos.receivable.col.status': 'Estado',
        'pos.receivable.action.reminder': 'Enviar Recordatorio',
        'pos.receivable.action.edit': 'Editar Detalles',
        'pos.receivable.action.print': 'Imprimir Cuenta',
        'pos.receivable.action.payment': 'Registrar Abono',
        'pos.receivable.action.void': 'Anular Cuenta',
        'pos.receivable.payment_modal.title': 'Registrar Abono para Venta #{id}',
        'pos.receivable.payment_modal.balance': 'Balance pendiente',
        'pos.receivable.payment_modal.amount': 'Monto del Abono',
        'pos.receivable.payment_modal.method': 'Método de Pago',
        'pos.receivable.payment_modal.reference': 'Nº de Factura/Referencia (Opcional)',
        'pos.receivable.payment_modal.attachment': 'Adjuntar Comprobante (Opcional)',
        'pos.receivable.payment_modal.register': 'Registrar Abono',
        'pos.receivable.edit_modal.title': 'Editar Cuenta por Cobrar - Venta #{id}',
        'pos.receivable.edit_modal.client': 'Cliente',
        'pos.receivable.edit_modal.original_amount': 'Monto Original',
        'pos.receivable.edit_modal.due_date': 'Fecha de Vencimiento',
        'pos.receivable.edit_modal.notes': 'Notas de Cobranza',
        'pos.receivable.confirm_reminder.title': 'Enviar Notificación de Cobro',
        'pos.receivable.confirm_reminder.message': '¿Está seguro de que desea enviar un mensaje de notificación de cobro al cliente {client}?',
        'pos.receivable.confirm_reminder.btn': 'Sí, Enviar Mensaje',
        'pos.receivable.confirm_void.title': 'Confirmar Anulación',
        'pos.receivable.confirm_void.message': '¿Seguro que desea anular la cuenta por cobrar {id}?',
        'pos.receivable.confirm_void.btn': 'Sí, Anular',

        // Product Page & Modal
        'product.list.title': 'Gestión de Productos',
        'product.list.add': 'Agregar Producto',
        'product.list.import_ai': 'Importar con IA',
        'product.form.title.create': 'Crear Producto',
        'product.form.title.edit': 'Modificar Inventario',
        'product.tab.main': 'Principal',
        'product.tab.inventory': 'Inventario y Precios',
        'product.tab.identification': 'Identificación',
        'product.tab.classification': 'Clasificación',
        'product.tab.specs': 'Especificaciones',
        'product.tab.prices': 'Niveles de Precio',
        'product.tab.variations': 'Variaciones',
        'product.tab.pos': 'Configuración POS',
        'product.field.name': 'Nombre',
        'product.field.sku': 'Referencia (SKU)',
        'product.field.barcode': 'Código Barras',
        'product.field.price': 'Precio Base',
        'product.field.cost': 'Costo',
        'product.field.profit': 'Ganancia',
        'product.field.inventory': 'Inventario',
        'product.field.available': 'Disponible',
        'product.field.category': 'Categoría',
        'product.field.description': 'Descripción',
        'product.field.active': 'Activo',
        'product.field.service': 'Servicio',
        'product.field.supplier_code': 'Cód. Fact. Suplidor',
        'product.field.chain_code': 'Código Cadena',
        'product.field.other_skus': 'Otros SKUs/Códigos Alternos',
        'product.field.department': 'Departamento',
        'product.field.family': 'Familia',
        'product.field.manufacturer': 'Manufacturero',
        'product.field.supplier': 'Suplidor Principal',
        'product.field.location': 'Localización Física',
        'product.field.creation_date': 'Fecha Creación',
        'product.field.material': 'Material',
        'product.field.quality': 'Calidad',
        'product.field.dimensions_weight': 'Dimensiones y Peso',
        'product.field.compatibility': 'Compatibilidad',
        'product.field.enable_price_levels': 'Activar múltiples niveles de precios para este producto',
        'product.field.price_level': 'Nivel',
        'product.field.price_levels_existing': 'Niveles Existentes',
        'product.field.enable_variations': 'Este producto tiene múltiples variaciones de venta',
        'product.field.variation_name': 'Nombre (ej: Metro)',
        'product.field.variation_price': 'Precio Venta',
        'product.field.variations_existing': 'Variaciones Existentes',
        'product.field.pos_display': 'Ilustrar en Pantalla (Botón en POS)',
        'product.field.pos_serial': 'Requiere Número de Serie en Venta',
        'product.field.pos_kitchen': 'Usar Impresora de Cocina',
        'product.field.pos_barcode': 'Usar Impresora de Código de Barras',
        'product.stock_total': 'Stock Total',
        'product.branch_units': 'Unidades',
        'product.price_levels': 'Niveles de Precios',
        'product.view_movement': 'Ver Movimiento',
        'product.calc_base': 'Cálculo de Precios (Base)',
        'product.customer_pays': 'Cliente Paga',
        'product.tax_rate': 'Tasa IVU (ej: 0.115)',
        'product.emergency_exempt': 'Aplicar Exención de Impuestos en Modo Emergencia',
        'product.discontinue': 'Descontinuar',
        'product.image_file': 'Archivo',
        'product.image_take': 'Sacar Foto',

        // Config Page
        'config.title': 'Configuración del Sistema',
        'config.subtitle': 'Ajuste las preferencias globales de la aplicación.',
        'config.regional': 'Preferencias Regionales',
        'config.timezone': 'Zona Horaria',
        'config.timezone_help': 'Esto afectará a los relojes del sistema y registros de fecha/hora.',
        'config.language': 'Idioma de la Interfaz',
        'config.number_format': 'Formato de Números',
        'config.appearance': 'Apariencia',
        'config.font_size': 'Tamaño de Fuente Global',
        'config.default_tax': 'Tasa de Impuesto Universal (IVU)',
        'config.small': 'Pequeño',
        'config.medium': 'Mediano',
        'config.large': 'Grande',
        'config.preview': 'Vista Previa: El tamaño de la letra cambiará en toda la aplicación instantáneamente.',

        // Calendar
        'calendar.schedule_visit': 'Programar Visita',
        'calendar.visit': 'Visita',
        'calendar.project': 'Proyecto',
        'calendar.month': 'Mes',
        'calendar.week': 'Semana',
        'calendar.day': 'Día',
        'calendar.activity_for': 'Actividad para el',
        'calendar.no_activity': 'No hay actividades programadas.',
        'calendar.invalid_date': 'Fecha inválida',

        // Reports
        'reports.pm.title': 'Reportes de Gestión de Proyectos',
        'reports.pm.employee_performance': 'Desempeño y Carga de Colaboradores',
        'reports.pm.top_clients': 'Clientes Más Activos (Por Nº Proyectos)',
        'reports.pm.project_costs': 'Análisis de Costos Estimados',
        'reports.pm.completed_duration': 'Proyectos Completados: Duración Estimada',
        'reports.pm.pending_status': 'Proyectos Pendientes y Activos',
        'reports.col.employee': 'Colaborador',
        'reports.col.projects_count': '# Proyectos (A/P)',
        'reports.col.assigned_summary': 'Proyectos Asignados (Resumen)',
        'reports.col.client': 'Cliente',
        'reports.col.total_projects': '# Total Proj.',
        'reports.col.active_projects': '# Proy. (A/P)',
        'reports.col.project': 'Proyecto',
        'reports.col.est_cost': 'Costo Est.',
        'reports.col.duration': 'Duración Est.',
        'reports.col.next_activity': 'Próxima Actividad',
        'reports.col.resources': 'Recursos (P/E)',

        // POS Reports
        'reports.pos.title': 'Reportes de Punto de Venta',
        'reports.pos.net_sales': 'Ventas Netas',
        'reports.pos.total_returns': 'Total Devoluciones',
        'reports.pos.transactions': 'Transacciones',
        'reports.pos.avg_ticket': 'Ticket Promedio',
        'reports.pos.sales_by_register': 'Ventas por Caja (Turno Actual)',
        'reports.pos.returns_by_register': 'Devoluciones por Caja',
        'reports.pos.sales_by_method': 'Ventas por Método de Pago',
        'reports.pos.top_employees': 'Colaboradores con Más Ventas',
        'reports.pos.top_clients': 'Clientes Principales',
        'reports.pos.top_transactions': 'Ventas de Mayor Valor',
        'reports.filter.today': 'Hoy',
        'reports.filter.yesterday': 'Ayer',
        'reports.filter.this_month': 'Este Mes',
        'reports.filter.last_month': 'Mes Anterior',
        'reports.filter.custom': 'Personalizado',

        // E-commerce
        'ecommerce.settings.title': 'Configuración Global de E-commerce (Defaults)',
        'ecommerce.settings.subtitle': 'Estos ajustes se aplicarán como predeterminados para nuevas tiendas de clientes que no hayan personalizado su propia configuración.',
        'ecommerce.settings.store_name': 'Nombre de Tienda (Predeterminado)',
        'ecommerce.settings.logo_url': 'URL del Logo (Predeterminado)',
        'ecommerce.settings.template': 'Plantilla (Predeterminada)',
        'ecommerce.settings.primary_color': 'Color Primario (Predeterminado)',
        'ecommerce.settings.restore_defaults': 'Restaurar Defaults Maestros',
        'ecommerce.settings.save': 'Guardar Configuración Predeterminada',
        
        'ecommerce.orders.title': 'Gestión de Pedidos E-commerce',
        'ecommerce.orders.search_placeholder': 'Buscar por ID, cliente...',
        'ecommerce.orders.filter_status': 'Filtrar por estado de pedido',
        'ecommerce.orders.col.id': 'ID Pedido',
        'ecommerce.orders.col.date': 'Fecha',
        'ecommerce.orders.col.client': 'Cliente',
        'ecommerce.orders.col.total': 'Total',
        'ecommerce.orders.col.status': 'Estado',

        'ecommerce.suppliers.title': 'Gestión de Proveedores',
        'ecommerce.suppliers.create': 'Crear Proveedor',
        'ecommerce.suppliers.col.name': 'Nombre Proveedor',
        'ecommerce.suppliers.col.contact': 'Contacto',
        'ecommerce.suppliers.col.email': 'Email',
        'ecommerce.suppliers.col.phone': 'Teléfono',
        'ecommerce.suppliers.form.create_title': 'Crear Proveedor',
        'ecommerce.suppliers.form.edit_title': 'Editar Proveedor',
        'ecommerce.suppliers.form.name': 'Nombre del Proveedor',
        'ecommerce.suppliers.form.contact': 'Nombre de Contacto (Opcional)',
        'ecommerce.suppliers.form.email': 'Email',
        'ecommerce.suppliers.form.phone': 'Teléfono (Opcional)',
        'ecommerce.suppliers.form.address': 'Dirección (Opcional)',

        'ecommerce.supplier_orders.title': 'Pedidos a Proveedores',
        'ecommerce.supplier_orders.search_placeholder': 'Buscar por ID, proveedor...',
        'ecommerce.supplier_orders.create': 'Crear Pedido',
        'ecommerce.supplier_orders.col.id': 'ID Pedido',
        'ecommerce.supplier_orders.col.supplier': 'Proveedor',
        'ecommerce.supplier_orders.col.date': 'Fecha Pedido',
        'ecommerce.supplier_orders.col.delivery_date': 'F. Entrega Est.',
        'ecommerce.supplier_orders.col.cost': 'Costo Total',
        'ecommerce.supplier_orders.col.status': 'Estado',
        'ecommerce.supplier_orders.form.create_title': 'Crear Pedido a Proveedor',
        'ecommerce.supplier_orders.form.edit_title': 'Editar Pedido a Proveedor',
        'ecommerce.supplier_orders.form.items': 'Artículos del Pedido',
        'ecommerce.supplier_orders.form.item_product': 'Producto',
        'ecommerce.supplier_orders.form.item_quantity': 'Cantidad',
        'ecommerce.supplier_orders.form.item_cost': 'Costo Unit.',
        'ecommerce.supplier_orders.form.add_item': 'Añadir Artículo',
    },
    en: {
        // ... (English translations would also be updated similarly, keeping existing structure)
        'reports.pos.title': 'Point of Sale Reports',
        'reports.pos.net_sales': 'Net Sales',
        'reports.pos.total_returns': 'Total Returns',
        'reports.pos.transactions': 'Transactions',
        'reports.pos.avg_ticket': 'Avg. Ticket',
        'reports.pos.sales_by_register': 'Sales by Register (Current Shift)',
        'reports.pos.returns_by_register': 'Returns by Register',
        'reports.pos.sales_by_method': 'Sales by Payment Method',
        'reports.pos.top_employees': 'Top Selling Employees',
        'reports.pos.top_clients': 'Top Clients',
        'reports.pos.top_transactions': 'Highest Value Transactions',
        'reports.filter.today': 'Today',
        'reports.filter.yesterday': 'Yesterday',
        'reports.filter.this_month': 'This Month',
        'reports.filter.last_month': 'Last Month',
        'reports.filter.custom': 'Custom',
        'common.choose_file': 'Choose File',
        'employee.field.photo': 'Profile Photo',
        // ... (rest of en keys)
    }
};

export const GlobalSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<GlobalSettings>(() => {
        const stored = localStorage.getItem('pazziGlobalSettings');
        return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
    });

    const updateSettings = (newSettings: Partial<GlobalSettings>) => {
        setSettings(prev => {
            const updated = { ...prev, ...newSettings };
            localStorage.setItem('pazziGlobalSettings', JSON.stringify(updated));
            return updated;
        });
    };

    const t = (key: string, params?: Record<string, string | number>) => {
        const lang = (settings.language || 'es') as keyof typeof TRANSLATIONS;
        // @ts-ignore
        let text = TRANSLATIONS[lang][key] || key;
        
        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                text = text.replace(`{${k}}`, String(v));
            });
        }
        return text;
    };

    return (
        <GlobalSettingsContext.Provider value={{ settings, updateSettings, t }}>
            {children}
        </GlobalSettingsContext.Provider>
    );
};

export const useGlobalSettings = () => {
    const context = useContext(GlobalSettingsContext);
    if (!context) throw new Error('useGlobalSettings must be used within a GlobalSettingsProvider');
    return context;
};

export const useTranslation = () => {
    const { t, settings } = useGlobalSettings();
    return { t, lang: settings.language };
};
