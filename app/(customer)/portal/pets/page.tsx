'use client';

import { useEffect, useState } from 'react';
import { listPets } from '@/actions/pet';

export default function CustomerPetsPage() {
  const [pets, setPets] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const result = await listPets();
      if (result.success) setPets(result.pets as any[]);
    }
    void load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-500">Portal Pelanggan</p>
        <h1 className="text-xl font-semibold text-zinc-900">Hewan peliharaan Anda</h1>
      </div>
      {pets.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500">Belum ada data hewan yang terhubung dengan akun Anda.</div>
      ) : (
        pets.map((pet) => (
          <div key={pet.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-zinc-900">{pet.name}</h2>
            <p className="mt-1 text-sm text-zinc-600">{pet.species} • {pet.breed || '-'}</p>
          </div>
        ))
      )}
    </div>
  );
}
