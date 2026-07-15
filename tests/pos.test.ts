import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePosTotals, getPaymentSummary, validatePosCheckout } from '../lib/pos';

test('calculatePosTotals applies discount before tax', () => {
  const totals = calculatePosTotals(100000, 10000, 10);

  assert.equal(totals.subtotal, 100000);
  assert.equal(totals.discountAmount, 10000);
  assert.equal(totals.taxAmount, 9000);
  assert.equal(totals.totalAmount, 99000);
});

test('getPaymentSummary returns shortage for cash payments below total', () => {
  const summary = getPaymentSummary(80000, 100000, 'CASH');

  assert.equal(summary.changeAmount, 0);
  assert.equal(summary.shortageAmount, 20000);
  assert.equal(summary.isSufficient, false);
  assert.equal(summary.status, 'SHORTAGE');
});

test('getPaymentSummary returns change for cash payments above total', () => {
  const summary = getPaymentSummary(120000, 100000, 'CASH');

  assert.equal(summary.changeAmount, 20000);
  assert.equal(summary.shortageAmount, 0);
  assert.equal(summary.isSufficient, true);
  assert.equal(summary.status, 'SUFFICIENT');
});

test('validatePosCheckout rejects missing customer context', () => {
  const result = validatePosCheckout({
    customerId: '',
    walkInName: '',
    items: [{ qty: 1, price: 100000 }],
    discountType: 'PERCENTAGE',
    discountAmount: 0,
    paymentMethod: 'CASH',
    paymentAmount: 100000,
    subtotal: 100000,
    taxRate: 0,
  });

  assert.equal(result.ok, false);
  assert.equal(result.message, 'Pelanggan wajib dipilih atau isi nama pembeli manual.');
});

test('validatePosCheckout rejects percentage discount above 100%', () => {
  const result = validatePosCheckout({
    customerId: 'customer-1',
    walkInName: '',
    items: [{ qty: 1, price: 100000 }],
    discountType: 'PERCENTAGE',
    discountAmount: 101,
    paymentMethod: 'CASH',
    paymentAmount: 100000,
    subtotal: 100000,
    taxRate: 0,
  });

  assert.equal(result.ok, false);
  assert.equal(result.message, 'Diskon persentase tidak boleh lebih dari 100%.');
});

test('validatePosCheckout rejects cash payment below total', () => {
  const result = validatePosCheckout({
    customerId: 'customer-1',
    walkInName: '',
    items: [{ qty: 1, price: 100000 }],
    discountType: 'PERCENTAGE',
    discountAmount: 0,
    paymentMethod: 'CASH',
    paymentAmount: 90000,
    subtotal: 100000,
    taxRate: 0,
  });

  assert.equal(result.ok, false);
  assert.equal(result.message, 'Jumlah pembayaran kurang dari total transaksi.');
});

test('validatePosCheckout allows manual buyer with non-cash payment', () => {
  const result = validatePosCheckout({
    customerId: '',
    walkInName: 'Budi',
    items: [{ qty: 1, price: 100000 }],
    discountType: 'PERCENTAGE',
    discountAmount: 0,
    paymentMethod: 'NON_CASH',
    paymentAmount: 100000,
    subtotal: 100000,
    taxRate: 0,
  });

  assert.equal(result.ok, true);
});
