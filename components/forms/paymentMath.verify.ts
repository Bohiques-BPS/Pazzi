/* Verificación determinística de la lógica de caja. Correr: npx tsx paymentMath.verify.ts */
import { parseAmount, round2, computeBalance, evaluatePayment, coversBalance, isFullyPaid } from './paymentMath';

let pass = 0, fail = 0;
const approx = (a: number, b: number) => Math.abs(a - b) < 0.0001;
function check(name: string, cond: boolean, detail = '') {
    if (cond) { pass++; console.log(`  ✓ ${name}`); }
    else { fail++; console.log(`  ✗ ${name}  ${detail}`); }
}

console.log('\n== Parseo tolerante a locale ==');
check('punto', parseAmount('10.50') === 10.5);
check('coma', parseAmount('10,50') === 10.5);
check('con símbolo', parseAmount('$1,234.56'.replace(/,/g, '')) === 1234.56);
check('vacío → NaN', Number.isNaN(parseAmount('')));

console.log('\n== Redondeo del saldo (total con IVU de >2 decimales) ==');
// 22.13 * 1.115 = 24.67495  → saldo mostrado y comparado: 24.67
check('balance 24.67495 → 24.67', computeBalance(24.67495, 0) === 24.67, String(computeBalance(24.67495, 0)));
// 107.97 * 1.115 = 120.38655 → 120.39
check('balance 120.38655 → 120.39', computeBalance(120.38655, 0) === 120.39, String(computeBalance(120.38655, 0)));

console.log('\n== Escenario 1: Tarjeta exacta (el bug del residuo de centavos) ==');
{
    const balance = computeBalance(24.67495, 0); // 24.67
    const r = evaluatePayment({ amountInput: '24.67', balance, isCash: false, needsRef: false, hasReference: false });
    check('acepta el pago (no "supera el saldo")', r.ok === true, JSON.stringify(r));
    if (r.ok) {
        check('aplica 24.67', approx(r.applied, 24.67));
        check('sin vuelto', approx(r.change, 0));
        const newBal = computeBalance(24.67495, r.applied);
        check('saldo queda 0 → totalmente pagado', isFullyPaid(newBal), String(newBal));
    }
}

console.log('\n== Escenario 2: Tarjeta con coma "24,67" ==');
{
    const balance = computeBalance(24.67495, 0);
    const r = evaluatePayment({ amountInput: '24,67', balance, isCash: false, needsRef: false, hasReference: false });
    check('coma se acepta igual', r.ok === true && approx((r as any).applied, 24.67));
}

console.log('\n== Escenario 3: Efectivo con vuelto (cliente da $50 sobre $24.67) ==');
{
    const balance = computeBalance(24.67495, 0); // 24.67
    const r = evaluatePayment({ amountInput: '50', balance, isCash: true, needsRef: false, hasReference: false });
    check('acepta efectivo mayor al saldo', r.ok === true);
    if (r.ok) {
        check('solo aplica el saldo (24.67), no $50', approx(r.applied, 24.67), String(r.applied));
        check('vuelto = 25.33', approx(r.change, 25.33), String(r.change));
    }
}

console.log('\n== Escenario 4: Efectivo contando billetes (+$20 +$5 = $25 sobre $24.67) ==');
{
    const balance = computeBalance(24.67495, 0);
    let tendered = 0;
    tendered = round2(tendered + 20);
    tendered = round2(tendered + 5); // 25.00
    check('acumula a 25.00', tendered === 25);
    const r = evaluatePayment({ amountInput: String(tendered), balance, isCash: true, needsRef: false, hasReference: false });
    check('aplica 24.67 y vuelto 0.33', r.ok && approx((r as any).applied, 24.67) && approx((r as any).change, 0.33));
    check('un solo Enter finaliza (cubre saldo)', coversBalance(String(tendered), balance));
}

console.log('\n== Escenario 5: No-efectivo NO puede exceder el saldo ==');
{
    const balance = computeBalance(24.67495, 0);
    const r = evaluatePayment({ amountInput: '30', balance, isCash: false, needsRef: false, hasReference: false });
    check('tarjeta $30 sobre $24.67 → rechazada', !r.ok && (r as any).error === 'exceeds');
}

console.log('\n== Escenario 6: Método con referencia (Cheque) exige el número ==');
{
    const balance = computeBalance(50, 0);
    const sinRef = evaluatePayment({ amountInput: '50', balance, isCash: false, needsRef: true, hasReference: false });
    check('sin número de cheque → rechazado', !sinRef.ok && (sinRef as any).error === 'reference');
    const conRef = evaluatePayment({ amountInput: '50', balance, isCash: false, needsRef: true, hasReference: true });
    check('con número de cheque → aceptado', conRef.ok === true);
}

console.log('\n== Escenario 7: Pago dividido (efectivo $10 + tarjeta resto) ==');
{
    const total = 24.67495;
    let balance = computeBalance(total, 0); // 24.67
    const p1 = evaluatePayment({ amountInput: '10', balance, isCash: true, needsRef: false, hasReference: false });
    check('efectivo $10 aceptado', p1.ok === true);
    const paid1 = (p1 as any).applied; // 10
    balance = computeBalance(total, paid1); // 14.67
    check('saldo restante 14.67', balance === 14.67, String(balance));
    const p2 = evaluatePayment({ amountInput: '14.67', balance, isCash: false, needsRef: false, hasReference: false });
    check('tarjeta 14.67 aceptada', p2.ok === true);
    const paid2 = paid1 + (p2 as any).applied;
    check('saldo final 0 → pagado', isFullyPaid(computeBalance(total, paid2)));
}

console.log('\n== Escenario 8: Monto 0 o inválido ==');
{
    const balance = computeBalance(24.67, 0);
    check('$0 → inválido', !evaluatePayment({ amountInput: '0', balance, isCash: false, needsRef: false, hasReference: false }).ok);
    check('vacío → inválido', !evaluatePayment({ amountInput: '', balance, isCash: false, needsRef: false, hasReference: false }).ok);
}

console.log(`\n──────────────\nRESULTADO: ${pass} pasaron, ${fail} fallaron\n`);
if (fail > 0) process.exit(1);
