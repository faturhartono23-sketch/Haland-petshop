'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Plus, Eye } from 'lucide-react';
import { createPet, deletePet, listPets } from '@/actions/pet';
import { DataTable } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';

type PetRow = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  customer?: { name: string } | null;
};

export default function PetsPage() {
  const [pets, setPets] = useState<PetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    void loadPets();
  }, []);

  async function loadPets() {
    setLoading(true);
    const result = await listPets();
    if (result.success) setPets(result.pets as PetRow[]);
    setLoading(false);
  }

  async function handleCreate() {
    const result = await createPet({ customerId: '', name: 'Hewan Baru', species: 'Kucing' });
    if (result.success) {
      setMessage('Data hewan ditambahkan.');
      await loadPets();
      return;
    }
    setMessage(result.message ?? 'Gagal menambahkan data hewan.');
  }

  async function handleDelete(id: string) {
    const result = await deletePet({ id });
    if (result.success) {
      setMessage('Data hewan dihapus.');
      await loadPets();
      return;
    }
    setMessage(result.message ?? 'Gagal menghapus data hewan.');
  }

  const columns: Array<{ key: keyof PetRow; header: string; render?: (row: PetRow) => ReactNode }> = [
    { key: 'name', header: 'Nama' },
    { key: 'species', header: 'Spesies' },
    { key: 'breed', header: 'Ras' },
    { key: 'customer', header: 'Pemilik', render: (row: PetRow) => row.customer?.name ?? '-' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-zinc-500">Modul Pets</p>
          <h1 className="text-xl font-semibold text-zinc-900">Data hewan peliharaan</h1>
        </div>
        <button type="button" onClick={handleCreate} className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700">
          <Plus className="h-4 w-4" />
          Tambah Hewan
        </button>
      </div>

      {message ? <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">{message}</div> : null}

      {loading ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500">Memuat data hewan...</div>
      ) : pets.length === 0 ? (
        <EmptyState title="Belum ada data hewan" description="Tambahkan hewan untuk menampilkan riwayat dan detail." />
      ) : (
        <div className="space-y-3">
          <DataTable title="Daftar hewan" columns={columns} rows={pets} emptyMessage="Belum ada data hewan." />
          <div className="flex flex-wrap gap-2">
            {pets.map((pet) => (
              <div key={pet.id} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
                <Link href={`/dashboard/pets/${pet.id}`} className="inline-flex items-center gap-2 font-medium text-zinc-900">
                  <Eye className="h-4 w-4" />
                  {pet.name}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog open={showConfirm} title="Hapus hewan" description="Data hewan akan dihapus dari sistem." confirmLabel="Hapus" onCancel={() => setShowConfirm(false)} onConfirm={() => { if (selectedId) void handleDelete(selectedId); setShowConfirm(false); }} />
    </div>
  );
}
