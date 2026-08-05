/**
 * Lógica pura de cobro de la caja (sin React), para poder probarla de forma determinística.
 * La usa PaymentModal. Reglas de una caja de local:
 *  - El monto se parsea tolerante a locale (coma o punto) y se redondea a centavos.
 *  - Efectivo puede exceder el saldo (se devuelve vuelto); otros métodos no.
 *  - Métodos con referencia (cheque, ATH…) exigen el dato.
 *  - El monto registrado nunca excede el saldo (el excedente en efectivo es vuelto), para que
 *    la conciliación de caja cuadre.
 */

/** Parseo tolerante a locale: acepta coma o punto como separador decimal. */
export const parseAmount = (s: string | number): number => {
    if (typeof s === 'number') return s;
    const cleaned = String(s).replace(/[^\d.,-]/g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : NaN;
};

/** Redondeo a centavos: las comparaciones trabajan sobre los valores mostrados. */
export const round2 = (n: number): number => Math.round((Number(n) || 0) * 100) / 100;

/** Saldo pendiente, redondeado a centavos (el total con IVU puede tener >2 decimales). */
export const computeBalance = (totalAmount: number, totalPaid: number): number =>
    round2(totalAmount - totalPaid);

export interface PaymentEval {
    ok: boolean;
    error?: 'invalid' | 'exceeds' | 'reference';
    applied?: number;   // presente si ok
    change?: number;    // presente si ok
}

/** Evalúa un intento de pago: valida y calcula cuánto se aplica y cuánto es vuelto. */
export function evaluatePayment(params: {
    amountInput: string | number;
    balance: number;          // saldo pendiente (ya redondeado)
    isCash: boolean;
    needsRef: boolean;
    hasReference: boolean;
}): PaymentEval {
    const amount = round2(parseAmount(params.amountInput));
    if (isNaN(amount) || amount <= 0) return { ok: false, error: 'invalid' };
    if (!params.isCash && amount > params.balance + 0.001) return { ok: false, error: 'exceeds' };
    if (params.needsRef && !params.hasReference) return { ok: false, error: 'reference' };
    const applied = params.isCash ? Math.min(amount, params.balance) : amount;
    const change = params.isCash ? Math.max(0, amount - params.balance) : 0;
    return { ok: true, applied, change };
}

/** ¿El monto ingresado cubre el saldo? (para finalizar con un solo Enter). */
export function coversBalance(amountInput: string | number, balance: number): boolean {
    const amount = round2(parseAmount(amountInput));
    return !isNaN(amount) && amount + 0.001 >= balance;
}

/** ¿La venta ya está totalmente pagada? */
export const isFullyPaid = (balance: number): boolean => balance <= 0.001;
