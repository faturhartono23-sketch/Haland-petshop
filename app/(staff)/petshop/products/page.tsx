'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Package } from 'lucide-react';
import { createProduct, listProductCategories, listProducts, updateProduct, deleteProduct, listSuppliers } from '@/actions/product';
import { DataTable } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';

type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  category: { name: string } | null;
  supplier: { name: string } | null;
  buyPrice: number;
  sellPrice: number;
  stock: number;
  minStock: number;
};

export default function PetshopProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    categoryId: '',
    supplierId: '',
    buyPrice: '0',
    sellPrice: '0',
    stock: '0',
    minStock: '0',
  });

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [productsResult, categoriesResult, suppliersResult] = await Promise.all([listProducts(), listProductCategories(), listSuppliers()]);

    if (productsResult.success) setProducts(productsResult.products as any[]);
    if (categoriesResult.success) setCategories(categoriesResult.categories as any[]);
    if (suppliersResult.success) setSuppliers(suppliersResult.suppliers as any[]);
    setLoading(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const payload = {
      id: editingId ?? undefined,
      name: form.name,
      sku: form.sku || undefined,
      barcode: form.barcode || undefined,
      categoryId: form.categoryId || undefined,
      supplierId: form.supplierId || undefined,
      buyPrice: parseFloat(form.buyPrice),
      sellPrice: parseFloat(form.sellPrice),
      stock: parseInt(form.stock),
      minStock: parseInt(form.minStock),
    };

    const result = editingId ? await updateProduct(payload as any) : await createProduct(payload as any);

    if (result.success) {
      setMessage(editingId ? 'Produk diperbarui.' : 'Produk ditambahkan.');
      setEditingId(null);
      setForm({ name: '', sku: '', barcode: '', categoryId: '', supplierId: '', buyPrice: '0', sellPrice: '0', stock: '0', minStock: '0' });
      await loadData();
      return;
    }
    setMessage(result.message ?? 'Gagal menyimpan produk.');
  }

  async function handleDelete(id: string) {
    if (!confirm('Yakin hapus produk ini?')) return;
    const result = await deleteProduct(id);
    if (result.success) {
      setMessage('Produk dihapus.');
      await loadData();
      return;
    }
    setMessage(result.message ?? 'Gagal menghapus produk.');
  }

  function startEdit(product: ProductRow) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      sku: product.sku || '',
      barcode: product.barcode || '',
      categoryId: product.category?.name ?? '',
      supplierId: product.supplier?.name ?? '',
      buyPrice: String(product.buyPrice),
      sellPrice: String(product.sellPrice),
      stock: String(product.stock),
      minStock: String(product.minStock),
    });
  }

  const columns: Array<{ key: keyof ProductRow; header: string; render?: (row: ProductRow) => ReactNode }> = [
    { key: 'name', header: 'Nama Produk' },
    { key: 'sku', header: 'SKU', render: (row) => row.sku ?? '-' },
    { key: 'category', header: 'Kategori', render: (row) => row.category?.name ?? '-' },
    { key: 'buyPrice', header: 'Harga Beli' },
    { key: 'sellPrice', header: 'Harga Jual' },
    { key: 'stock', header: 'Stok' },
    { key: 'minStock', header: 'Min Stok' },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-500">Modul Petshop</p>
        <h1 className="text-xl font-semibold text-zinc-900">Kelola produk</h1>
      </div>

      {message ? <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">{message}</div> : null}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          {loading ? <div className="text-sm text-zinc-500">Memuat produk...</div> : products.length === 0 ? <EmptyState title="Belum ada produk" description="Tambah produk untuk memulai." /> : <DataTable title="Daftar produk" columns={columns} rows={products} emptyMessage="Belum ada produk." />}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-zinc-900">
            <Package className="h-4 w-4" />
            <h2 className="text-base font-semibold">{editingId ? 'Edit produk' : 'Tambah produk'}</h2>
          </div>

          <label className="block text-sm text-zinc-600">
            Nama
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2" />
          </label>

          <label className="block text-sm text-zinc-600">
            SKU
            <input type="text" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2" />
          </label>

          <label className="block text-sm text-zinc-600">
            Harga Beli
            <input type="number" step="0.01" value={form.buyPrice} onChange={(e) => setForm({ ...form, buyPrice: e.target.value })} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2" />
          </label>

          <label className="block text-sm text-zinc-600">
            Harga Jual
            <input type="number" step="0.01" value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: e.target.value })} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2" />
          </label>

          <label className="block text-sm text-zinc-600">
            Stok
            <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2" />
          </label>

          <div className="flex flex-wrap gap-2">
            <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
              {editingId ? 'Simpan' : 'Tambah'}
            </button>
            {editingId ? (
              <button type="button" onClick={() => { setEditingId(null); setForm({ name: '', sku: '', barcode: '', categoryId: '', supplierId: '', buyPrice: '0', sellPrice: '0', stock: '0', minStock: '0' }); }} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-700">
                Batal
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
