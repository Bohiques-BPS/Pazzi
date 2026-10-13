/**
 * Permisos que permiten LEER proveedores / pedidos a proveedor.
 * Reflejan los `requirePermission(...)` de GET /suppliers y GET /supplier-orders en el backend
 * (pazi-be/routes/supplier.routes.ts y supplierOrder.routes.ts). Mantener sincronizados.
 */
export const SUPPLIER_READ_PERMS = [
    'suppliers.view',
    'suppliers.manage',
    'supplierOrders.view',
    'supplierOrders.manage',
    'supplierOrders.receive',
    'accounts.viewPayable',
];

export const SUPPLIER_ORDER_READ_PERMS = [
    'supplierOrders.view',
    'supplierOrders.manage',
    'supplierOrders.receive',
    'accounts.viewPayable',
];
