import test from 'node:test';
import assert from 'node:assert/strict';
import { calculatePosTotals, getPaymentSummary } from '../lib/pos.ts';

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
