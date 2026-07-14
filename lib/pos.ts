import { roundCurrency } from './utils';

export { roundCurrency } from './utils';

export function calculatePosTotals(subtotal: number, discountAmount: number, taxRate: number) {
  const normalizedSubtotal = roundCurrency(Math.max(0, subtotal));
  const normalizedDiscount = roundCurrency(Math.max(0, discountAmount));
  const discountedSubtotal = roundCurrency(Math.max(0, normalizedSubtotal - normalizedDiscount));
  const normalizedTaxRate = roundCurrency(Math.max(0, taxRate));
  const taxAmount = roundCurrency((discountedSubtotal * normalizedTaxRate) / 100);
  const totalAmount = roundCurrency(discountedSubtotal + taxAmount);

  return {
    subtotal: normalizedSubtotal,
    discountAmount: normalizedDiscount,
    taxRate: normalizedTaxRate,
    taxAmount,
    totalAmount,
  };
}

export function getPaymentStatus(paymentAmount: number, totalAmount: number) {
  if (paymentAmount <= 0) {
    return 'UNPAID';
  }

  if (paymentAmount >= totalAmount) {
    return 'PAID';
  }

  return 'PARTIAL_PAYMENT';
}

export function getPaymentSummary(paymentAmount: number, totalAmount: number, paymentMethod: 'CASH' | 'NON_CASH') {
  const normalizedPayment = roundCurrency(Math.max(0, paymentAmount));
  const normalizedTotal = roundCurrency(Math.max(0, totalAmount));

  if (paymentMethod !== 'CASH') {
    return {
      changeAmount: 0,
      shortageAmount: 0,
      isSufficient: true,
      status: 'NON_CASH',
    };
  }

  const shortageAmount = Math.max(0, normalizedTotal - normalizedPayment);
  const changeAmount = Math.max(0, normalizedPayment - normalizedTotal);

  return {
    changeAmount,
    shortageAmount,
    isSufficient: shortageAmount === 0,
    status: shortageAmount === 0 ? 'SUFFICIENT' : 'SHORTAGE',
  };
}
