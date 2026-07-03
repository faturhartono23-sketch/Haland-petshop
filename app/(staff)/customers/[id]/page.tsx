'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getCustomer } from '@/actions/customer';

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const result = await getCustomer(params.id);
      if (result.success) setCustomer(result.customer);
    }
    void load();
  }, [params.id]);

  if (!customer) return <div className="rounded-xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500">Memuat detail pelanggan...</div>;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-500">Detail Pelanggan</p>
        <h1 className="text-xl font-semibold text-zinc-900">{customer.name}</h1>
        <p className="mt-2 text-sm text-zinc-600">Telepon: {customer.phone || '-'}</p>
      </div>
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900">Informasi tambahan</h2>
        <p className="mt-2 text-sm text-zinc-600">Alamat: {customer.address || '-'}</p>
        <p className="mt-2 text-sm text-zinc-600">Catatan: {customer.notes || '-'}</p>
      </div>
    </div>
  );
}
