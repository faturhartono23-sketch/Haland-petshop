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

export function validatePosCheckout(input: {
  customerId: string;
  walkInName: string;
  items: Array<{ qty: number; price: number }>;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountAmount: number;
  paymentMethod: 'CASH' | 'NON_CASH';
  paymentAmount: number;
  subtotal: number;
  taxRate: number;
}) {
  const hasManualBuyer = Boolean(input.walkInName?.trim());
  const hasSelectedCustomer = Boolean(input.customerId?.trim());

  if (!hasManualBuyer && !hasSelectedCustomer) {
    return { ok: false as const, message: 'Pelanggan wajib dipilih atau isi nama pembeli manual.' };
  }

  if (input.items.length === 0) {
    return { ok: false as const, message: 'Keranjang tidak boleh kosong.' };
  }

  if (input.discountType === 'PERCENTAGE' && input.discountAmount > 100) {
    return { ok: false as const, message: 'Diskon persentase tidak boleh lebih dari 100%.' };
  }

  if (input.discountType === 'FIXED' && input.discountAmount > 0 && input.discountAmount > 999999999) {
    return { ok: false as const, message: 'Diskon nominal terlalu besar.' };
  }

  if (input.paymentMethod === 'CASH') {
    const totals = calculatePosTotals(input.subtotal, input.discountType === 'PERCENTAGE' ? (input.discountAmount / 100) * input.subtotal : input.discountAmount, input.taxRate);
    if (input.paymentAmount < totals.totalAmount) {
      return { ok: false as const, message: 'Jumlah pembayaran kurang dari total transaksi.' };
    }
  }

  return { ok: true as const };
}
