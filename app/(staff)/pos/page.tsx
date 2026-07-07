'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ArrowRight, Banknote, CheckCircle2, Printer, Search, ShoppingBag } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { createPosSale, listPosProducts, listProductCategories } from '@/actions/pos';
import { getInvoiceLookups } from '@/actions/invoice';
import { calculatePosTotals } from '@/lib/pos';
import { usePolling } from '@/hooks/use-polling';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';

type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  sellPrice: number;
  stock: number;
  categoryName: string | null;
  imageUrl: string | null;
};

type CartItem = {
  productId: string;
  name: string;
  qty: number;
  price: number;
  stock: number;
};

type CustomerOption = { id: string; name: string };

type CategoryChip = { id: string; name: string; activeProductCount: number };

export default function PosPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<CategoryChip[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [hasMoreProducts, setHasMoreProducts] = useState(false);
  const skipRef = useRef(0);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [discountAmount, setDiscountAmount] = useState('0');
  const [paymentAmount, setPaymentAmount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'NON_CASH'>('CASH');
  const [submitting, setSubmitting] = useState(false);
  const [taxRate, setTaxRate] = useState('0');
  const [createdInvoice, setCreatedInvoice] = useState<any | null>(null);

  const loadCustomers = useCallback(async () => {
    const result = await getInvoiceLookups();
    if (result.success) {
      setCustomers(result.customers ?? []);
    }
  }, []);

  const loadCategories = useCallback(async () => {
    const result = await listProductCategories();
    if (result.success) {
      setCategories(result.categories ?? []);
    } else {
      toast.error(result.message ?? 'Gagal memuat kategori produk.');
    }
  }, []);

  const loadProducts = useCallback(async (append = false) => {
    if (!append) {
      skipRef.current = 0;
    }
    setLoadingProducts(true);

    const result = await listPosProducts({
      categoryId: activeCategoryId || undefined,
      query: searchQuery.trim() || undefined,
      skip: append ? skipRef.current : 0,
      take: 24,
    });

    setLoadingProducts(false);

    if (!result.success) {
      if (!append) {
        setProducts([]);
      }
      setHasMoreProducts(false);
      toast.error(result.message ?? 'Gagal memuat produk.');
      return;
    }

    const fetchedProducts = result.products ?? [];
    if (append) {
      setProducts((current) => [...current, ...fetchedProducts]);
      skipRef.current += fetchedProducts.length;
    } else {
      setProducts(fetchedProducts);
      skipRef.current = fetchedProducts.length;
    }

    setHasMoreProducts(fetchedProducts.length === 24);
  }, [activeCategoryId, searchQuery]);

  const loadMoreProducts = useCallback(async () => {
    if (!hasMoreProducts || loadingProducts) return;
    await loadProducts(true);
  }, [hasMoreProducts, loadingProducts, loadProducts]);

  useEffect(() => {
    void loadCustomers();
    void loadCategories();
  }, [loadCustomers, loadCategories]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProducts(false);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [activeCategoryId, searchQuery, loadProducts]);

  async function handleSearch(event: React.FormEvent) {
    event.preventDefault();
    await loadProducts(false);
  }

  function addToCart(product: ProductRow) {
    if (product.stock <= 0) {
      toast.error('Stok produk tidak cukup.');
      return;
    }

    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? { ...item, qty: Math.min(item.qty + 1, product.stock) }
            : item,
        );
      }

      return [...current, { productId: product.id, name: product.name, qty: 1, price: product.sellPrice, stock: product.stock }];
    });
  }

  function updateQty(productId: string, qty: number) {
    setCart((current) =>
      current
        .map((item) => (item.productId === productId ? { ...item, qty: Math.max(1, Math.min(qty, item.stock)) } : item))
        .filter((item) => item.qty > 0),
    );
  }

  function removeFromCart(productId: string) {
    setCart((current) => current.filter((item) => item.productId !== productId));
  }

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.qty * item.price, 0), [cart]);
  const discount = Number(discountAmount) || 0;
  const totals = useMemo(() => calculatePosTotals(subtotal, discount, Number(taxRate) || 0), [subtotal, discount, taxRate]);
  const payment = Number(paymentAmount) || 0;
  const change = Math.max(0, payment - totals.totalAmount);

  async function handleCheckout(event: React.FormEvent) {
    event.preventDefault();
    if (!customerId && !isWalkIn) {
      toast.error('Pilih pelanggan terlebih dahulu atau aktifkan Jual Tanpa Pelanggan.');
      return;
    }
    if (cart.length === 0) {
      toast.error('Keranjang kosong.');
      return;
    }
    if (payment < totals.totalAmount) {
      toast.error('Jumlah pembayaran kurang dari total transaksi.');
      return;
    }

    setSubmitting(true);
    const result = await createPosSale({
      customerId: isWalkIn ? '' : customerId,
      isWalkIn,
      items: cart.map((item) => ({
        productId: item.productId,
        qty: item.qty,
        price: item.price,
        description: item.name,
      })),
      discountAmount: discount,
      paymentMethod,
      paymentAmount: payment,
      taxRate: Number(taxRate) || 0,
    });

    if (!result.success) {
      toast.error(result.message ?? 'Gagal menyimpan transaksi.');
      setSubmitting(false);
      return;
    }

    setCreatedInvoice(result.invoice);
    setCart([]);
    setDiscountAmount('0');
    setPaymentAmount('0');
    setTaxRate('0');
    toast.success(`Transaksi berhasil. Kembalian ${formatCurrency(change)}.`);
    setSubmitting(false);
  }

  useRefetchOnFocus(loadCustomers);
  usePolling(loadCustomers, 30000);

  function handlePrint() {
    if (!createdInvoice) return;
    const html = `<!DOCTYPE html><html><head><title>Struk ${createdInvoice.invoiceNumber}</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#111}h1,h2,h3{margin:0}table{width:100%;border-collapse:collapse;margin-top:16px}td,th{padding:8px;border:1px solid #ccc;text-align:left}strong{display:inline-block;width:120px}</style></head><body><h1>Struk Penjualan</h1><p><strong>No. Invoice:</strong> ${createdInvoice.invoiceNumber}</p><p><strong>Pelanggan:</strong> ${createdInvoice.customer.name}</p><p><strong>Tanggal:</strong> ${formatDate(createdInvoice.date)}</p><table><thead><tr><th>Produk</th><th>Qty</th><th>Harga</th><th>Subtotal</th></tr></thead><tbody>${createdInvoice.items.map((item: any) => `<tr><td>${item.description}</td><td>${item.qty}</td><td>${formatCurrency(item.price)}</td><td>${formatCurrency(item.subtotal)}</td></tr>`).join('')}</tbody></table><p><strong>Total:</strong> ${formatCurrency(createdInvoice.totalAmount)}</p><p><strong>Dibayar:</strong> ${formatCurrency(createdInvoice.payments?.[0]?.amount ?? 0)}</p><p><strong>Status:</strong> ${createdInvoice.status}</p></body></html>`;
    const popup = window.open('', '_blank');
    if (popup) {
      popup.document.write(html);
      popup.document.close();
      popup.focus();
      popup.print();
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-zinc-500">Modul POS</p>
            <h1 className="text-xl font-semibold text-zinc-900">Transaksi penjualan produk</h1>
          </div>
          <div className="flex items-center gap-2 text-zinc-700">
            <ShoppingBag className="h-5 w-5" />
            <span className="text-sm">Owner & Admin Klinik</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex flex-1 flex-col gap-2 text-sm text-zinc-600">
              Cari produk atau scan barcode
              <div className="flex gap-2">
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Nama, SKU, atau barcode"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2"
                />
                <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
                  <Search className="h-4 w-4" />Cari
                </button>
              </div>
            </label>
          </form>

              <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveCategoryId('')}
              className={`rounded-full border px-3 py-2 text-sm ${activeCategoryId === '' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-700'}`}
            >
              Semua
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategoryId(category.id)}
                className={`rounded-full border px-3 py-2 text-sm ${activeCategoryId === category.id ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-700'}`}
              >
                {category.name} ({category.activeProductCount})
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {loadingProducts && products.length === 0 ? (
              Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="mb-4 h-40 rounded-3xl bg-zinc-100" />
                  <div className="space-y-2">
                    <div className="h-4 w-3/4 rounded bg-zinc-200" />
                    <div className="h-4 w-1/2 rounded bg-zinc-200" />
                    <div className="h-4 w-1/4 rounded bg-zinc-200" />
                  </div>
                </div>
              ))
            ) : products.length === 0 ? (
              <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500">
                Produk akan muncul di sini.
              </div>
            ) : (
              products.map((product) => (
                <div key={product.id} className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => addToCart(product)}
                    className="flex h-full w-full flex-col items-start justify-between p-4 text-left"
                  >
                    <div className="mb-4 h-44 w-full overflow-hidden rounded-3xl bg-zinc-100">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-zinc-400">No Image</div>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-900">{product.name}</h3>
                        <p className="text-xs text-zinc-500">{product.categoryName ?? 'Tanpa kategori'}</p>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-sm text-zinc-700">
                        <span>{formatCurrency(product.sellPrice)}</span>
                        <span className="rounded-full border border-zinc-200 px-2 py-1 text-xs text-zinc-500">Stok {product.stock}</span>
                      </div>
                      <div className="rounded-3xl bg-zinc-900 px-4 py-3 text-center text-sm font-medium text-white">
                        Tambah ke keranjang
                      </div>
                    </div>
                  </button>
                </div>
              ))
            )}
          </div>

          {hasMoreProducts ? (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={loadMoreProducts}
                disabled={loadingProducts}
                className="rounded-full border border-zinc-900 bg-white px-5 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingProducts ? 'Memuat...' : 'Muat lebih banyak'}
              </button>
            </div>
          ) : null}
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-zinc-700">
            <Banknote className="h-4 w-4" />
            <h2 className="text-base font-semibold">Keranjang & pembayaran</h2>
          </div>

          <div className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <label className="block text-sm text-zinc-600">
                Pelanggan
                <select
                  value={customerId}
                  onChange={(event) => setCustomerId(event.target.value)}
                  disabled={isWalkIn}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 disabled:cursor-not-allowed disabled:bg-zinc-100"
                >
                  <option value="">Pilih pelanggan</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>{customer.name}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-600">
                <input
                  type="checkbox"
                  checked={isWalkIn}
                  onChange={(event) => {
                    setIsWalkIn(event.target.checked);
                    if (event.target.checked) {
                      setCustomerId('');
                    }
                  }}
                  className="h-4 w-4 rounded border-zinc-300 text-zinc-900"
                />
                Jual Tanpa Pelanggan
              </label>
            </div>

            <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <table className="min-w-full text-sm">
                <thead className="text-left text-zinc-600">
                  <tr>
                    <th className="px-3 py-2">Produk</th>
                    <th className="px-3 py-2">Qty</th>
                    <th className="px-3 py-2">Harga</th>
                    <th className="px-3 py-2">Subtotal</th>
                    <th className="px-3 py-2">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => (
                    <tr key={item.productId} className="border-t border-zinc-200">
                      <td className="px-3 py-2">{item.name}</td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min={1}
                          max={item.stock}
                          value={item.qty}
                          onChange={(event) => updateQty(item.productId, Number(event.target.value))}
                          className="w-20 rounded-lg border border-zinc-200 px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">{formatCurrency(item.price)}</td>
                      <td className="px-3 py-2">{formatCurrency(item.price * item.qty)}</td>
                      <td className="px-3 py-2">
                        <button type="button" onClick={() => removeFromCart(item.productId)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-700">
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                  {cart.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-sm text-zinc-500">Keranjang kosong.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex items-center justify-between text-sm text-zinc-600"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex items-center justify-between text-sm text-zinc-600"><span>Diskon</span><span>{formatCurrency(discount)}</span></div>
              <div className="flex items-center justify-between text-sm text-zinc-600"><span>Pajak</span><span>{formatCurrency(totals.taxAmount)}</span></div>
              <div className="flex items-center justify-between text-base font-semibold text-zinc-900"><span>Total</span><span>{formatCurrency(totals.totalAmount)}</span></div>
            </div>

            <label className="block text-sm text-zinc-600">
              Diskon (Rp)
              <input type="number" min="0" value={discountAmount} onChange={(event) => setDiscountAmount(event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2" />
            </label>

            <label className="block text-sm text-zinc-600">
              Pajak (%)
              <input type="number" min="0" value={taxRate} onChange={(event) => setTaxRate(event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2" />
            </label>

            <label className="block text-sm text-zinc-600">
              Metode Pembayaran
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as 'CASH' | 'NON_CASH')} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2">
                <option value="CASH">Tunai</option>
                <option value="NON_CASH">Non-tunai</option>
              </select>
            </label>

            <label className="block text-sm text-zinc-600">
              Jumlah Bayar
              <input type="number" min="0" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2" />
            </label>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setCart([])} className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700">
                  Bersihkan Keranjang
                </button>
                <button type="button" onClick={handleCheckout as any} disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70">
                  <ArrowRight className="h-4 w-4" /> {submitting ? 'Memproses...' : 'Bayar'}
                </button>
              </div>
              {createdInvoice ? (
                <button type="button" onClick={handlePrint} className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700">
                  <Printer className="h-4 w-4" /> Cetak Struk
                </button>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      {createdInvoice ? (
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 text-zinc-700">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-semibold">Transaksi selesai</h2>
          </div>
          <div className="mt-4 space-y-2 text-sm text-zinc-700">
            <p>No. Invoice: <strong className="text-zinc-900">{createdInvoice.invoiceNumber}</strong></p>
            <p>Pelanggan: <strong className="text-zinc-900">{createdInvoice.customer.name}</strong></p>
            <p>Total: <strong className="text-zinc-900">{formatCurrency(createdInvoice.totalAmount)}</strong></p>
            <p>Status: <strong className="text-zinc-900">{createdInvoice.status}</strong></p>
            <p>Kembalian: <strong className="text-zinc-900">{formatCurrency(change)}</strong></p>
            <p>Pajak: <strong className="text-zinc-900">{formatCurrency(totals.taxAmount)}</strong></p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
