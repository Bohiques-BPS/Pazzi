// Config compartido de los campos "avanzados" del producto (importación legacy).
// Lo usan el formulario de producto (pestaña Avanzado) y el modal de importación.
export type AdvancedFieldType = 'text' | 'number' | 'boolean' | 'date';

export interface AdvancedProductField {
    key: string;
    label: string;
    type: AdvancedFieldType;
    group: string;
    aliases: string[]; // encabezados del Excel (para el auto-mapeo del import)
}

export const ADVANCED_PRODUCT_FIELDS: AdvancedProductField[] = [
    // ── Costos y precios ──
    { key: 'priceLevel1', label: 'Precio escala 1', type: 'number', group: 'Costos y precios', aliases: ['precioescala1'] },
    { key: 'priceLevel2', label: 'Precio escala 2', type: 'number', group: 'Costos y precios', aliases: ['precioescala2'] },
    { key: 'priceLevel3', label: 'Precio escala 3', type: 'number', group: 'Costos y precios', aliases: ['precioescala3'] },
    { key: 'handlingCost', label: 'Costo de manejo', type: 'number', group: 'Costos y precios', aliases: ['costomanejo'] },
    { key: 'supplierCost', label: 'Costo del proveedor', type: 'number', group: 'Costos y precios', aliases: ['costosuplidor'] },
    { key: 'lastCost', label: 'Último costo', type: 'number', group: 'Costos y precios', aliases: ['ultimocosto'] },
    { key: 'taxValue', label: 'Tax', type: 'number', group: 'Costos y precios', aliases: ['tax'] },
    { key: 'specialTax', label: 'Tax especial', type: 'number', group: 'Costos y precios', aliases: ['taxespecial'] },
    { key: 'supplier2Name', label: 'Proveedor 2', type: 'text', group: 'Costos y precios', aliases: ['suplidor2'] },

    // ── Reorden y compras ──
    { key: 'reorderMin', label: 'Nivel mínimo', type: 'number', group: 'Reorden y compras', aliases: ['nivelminimo'] },
    { key: 'reorderMax', label: 'Nivel máximo', type: 'number', group: 'Reorden y compras', aliases: ['nivelmaximo'] },
    { key: 'leadTimeDays', label: 'Tiempo de entrega', type: 'number', group: 'Reorden y compras', aliases: ['tiempoentrega'] },
    { key: 'orderMethod', label: 'Método de orden', type: 'text', group: 'Reorden y compras', aliases: ['ordenmetodo'] },
    { key: 'suggestedOrder', label: 'Orden sugerida', type: 'number', group: 'Reorden y compras', aliases: ['ordensugerida'] },
    { key: 'suggestedPurchase', label: 'Compra sugerida', type: 'number', group: 'Reorden y compras', aliases: ['comprasugerida'] },
    { key: 'suggestedOrderCost', label: 'Costo orden sugerida', type: 'number', group: 'Reorden y compras', aliases: ['sugordcost'] },
    { key: 'suggestedOrderUnit', label: 'Unidad orden sugerida', type: 'number', group: 'Reorden y compras', aliases: ['sugordunit'] },

    // ── Unidades ──
    { key: 'unitsPerReceipt', label: 'Unidades por recibo', type: 'number', group: 'Unidades', aliases: ['unidadesrecibo'] },
    { key: 'unitsPerSale', label: 'Unidades por venta', type: 'number', group: 'Unidades', aliases: ['unidadesventa'] },
    { key: 'conversionFactor', label: 'Factor de conversión', type: 'number', group: 'Unidades', aliases: ['factorconversion'] },
    { key: 'weightType', label: 'Tipo de peso', type: 'text', group: 'Unidades', aliases: ['weighttype'] },

    // ── Auto-partes / especificaciones ──
    { key: 'model', label: 'Modelo', type: 'text', group: 'Auto-partes', aliases: ['modelo'] },
    { key: 'yearFrom', label: 'Año desde', type: 'number', group: 'Auto-partes', aliases: ['anodesde'] },
    { key: 'yearTo', label: 'Año hasta', type: 'number', group: 'Auto-partes', aliases: ['anohasta'] },
    { key: 'isOriginal', label: 'Original', type: 'boolean', group: 'Auto-partes', aliases: ['original'] },
    { key: 'substitute', label: 'Sustituto', type: 'text', group: 'Auto-partes', aliases: ['sustituto'] },
    { key: 'serie', label: 'Serie', type: 'text', group: 'Auto-partes', aliases: ['serie'] },

    // ── Impuestos / regulatorio ──
    { key: 'cityTaxable', label: 'Impuesto ciudad', type: 'boolean', group: 'Impuestos / regulatorio', aliases: ['citytaxable'] },
    { key: 'stateTaxable', label: 'Impuesto estado', type: 'boolean', group: 'Impuestos / regulatorio', aliases: ['statetaxable'] },
    { key: 'isFood', label: 'Alimento', type: 'boolean', group: 'Impuestos / regulatorio', aliases: ['alimento'] },
    { key: 'isWic', label: 'WIC', type: 'boolean', group: 'Impuestos / regulatorio', aliases: ['eswic'] },
    { key: 'isSss', label: 'SSS', type: 'boolean', group: 'Impuestos / regulatorio', aliases: ['essss'] },
    { key: 'isCoop', label: 'Coop', type: 'boolean', group: 'Impuestos / regulatorio', aliases: ['escoop'] },
    { key: 'isAlcohol', label: 'Alcohol', type: 'boolean', group: 'Impuestos / regulatorio', aliases: ['esalcohol'] },
    { key: 'isTobacco', label: 'Tabaco', type: 'boolean', group: 'Impuestos / regulatorio', aliases: ['estabaco'] },
    { key: 'isSpecial', label: 'Especial', type: 'boolean', group: 'Impuestos / regulatorio', aliases: ['especial'] },

    // ── Comisiones ──
    { key: 'commissionType', label: 'Tipo de comisión', type: 'text', group: 'Comisiones', aliases: ['comisiontype'] },
    { key: 'commissionValue', label: 'Valor comisión', type: 'number', group: 'Comisiones', aliases: ['comisioval'] },

    // ── Configuración ──
    { key: 'fifoCount', label: 'Conteo FIFO', type: 'boolean', group: 'Configuración', aliases: ['conteofifo'] },
    { key: 'isPerpetual', label: 'Perpetuo', type: 'boolean', group: 'Configuración', aliases: ['perpetuo'] },
    { key: 'printLabel', label: 'Imprimir etiqueta', type: 'boolean', group: 'Configuración', aliases: ['imprimir'] },
    { key: 'manualPrice', label: 'Precio manual', type: 'boolean', group: 'Configuración', aliases: ['preciomanual'] },
    { key: 'allowDiscount', label: 'Permite descuento', type: 'boolean', group: 'Configuración', aliases: ['allowdiscount'] },
    { key: 'isEcommerce', label: 'E-commerce', type: 'boolean', group: 'Configuración', aliases: ['ecomerce'] },
    { key: 'isRaffle', label: 'Tómbola', type: 'boolean', group: 'Configuración', aliases: ['tombola'] },
    { key: 'priceFlag', label: 'Price flag', type: 'text', group: 'Configuración', aliases: ['priceflag'] },
    { key: 'companyId', label: 'Company ID', type: 'text', group: 'Configuración', aliases: ['companyid'] },
    { key: 'spareNum', label: 'Número extra', type: 'number', group: 'Configuración', aliases: ['sparenum'] },
    { key: 'spareText', label: 'Texto extra', type: 'text', group: 'Configuración', aliases: ['sparetext'] },
    { key: 'productComment', label: 'Comentario', type: 'text', group: 'Configuración', aliases: ['prodcoment'] },

    // ── Fechas (se convierten del formato serial de Excel a fecha real) ──
    { key: 'lastSaleDate', label: 'Última venta', type: 'date', group: 'Fechas', aliases: ['ultimaventa'] },
    { key: 'lastReceiptDate', label: 'Último recibo', type: 'date', group: 'Fechas', aliases: ['ultimorecibo'] },
    { key: 'minAlertDate', label: 'Fecha aviso mínimo', type: 'date', group: 'Fechas', aliases: ['fechaavisominimo'] },

    // ── Contadores heredados (informativo) ──
    { key: 'receivedQty', label: 'Recibido', type: 'number', group: 'Contadores heredados', aliases: ['recibido'] },
    { key: 'orderedQty', label: 'Ordenado', type: 'number', group: 'Contadores heredados', aliases: ['ordenado'] },
    { key: 'soldQty', label: 'Vendido', type: 'number', group: 'Contadores heredados', aliases: ['vendido'] },
    { key: 'purchasedQty', label: 'Comprado', type: 'number', group: 'Contadores heredados', aliases: ['comprado'] },
    { key: 'reservedQty', label: 'Reservado', type: 'number', group: 'Contadores heredados', aliases: ['reservado'] },
];

/** Grupos en orden, para renderizar por secciones. */
export const ADVANCED_PRODUCT_GROUPS: string[] = Array.from(
    new Set(ADVANCED_PRODUCT_FIELDS.map(f => f.group))
);
