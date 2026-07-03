'use client';

import { useEffect, useState } from 'react';
import { listPets, getPet } from '@/actions/pet';

type PetSummary = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  birthDate: string | null;
  gender: string | null;
  photo: string | null;
  customer?: { id: string; name: string };
  weightLogs?: Array<{ id: string; weight: number; date: string | Date }>;
  vaccineRecords?: Array<{ id: string; vaccineName: string; date: string | Date; nextDueDate: string | Date | null }>;
  diseaseRecords?: Array<{ id: string; diseaseName: string; note: string | null; date: string | Date }>;
  allergies?: Array<{ id: string; allergen: string; note: string | null }>;
  medicalRecords?: Array<{ id: string; diagnosis: string | null; date: string | Date }>;
};

export default function CustomerPetsPage() {
  const [pets, setPets] = useState<PetSummary[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [selectedPet, setSelectedPet] = useState<PetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      const result = await listPets();
      if (result.success) {
        const petList = (result.pets as PetSummary[]) ?? [];
        setPets(petList);
        if (petList[0]) {
          setSelectedPetId(petList[0].id);
          const detail = await getPet(petList[0].id);
          if (detail.success) {
            setSelectedPet(detail.pet as PetSummary);
          }
        }
      } else {
        setError(result.message ?? 'Gagal memuat data hewan.');
      }
      setLoading(false);
    }
    void load();
  }, []);

  async function handleSelectPet(id: string) {
    setSelectedPetId(id);
    const result = await getPet(id);
    if (result.success) {
      setSelectedPet(result.pet as PetSummary);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-500">Portal Pelanggan</p>
        <h1 className="text-xl font-semibold text-zinc-900">Hewan peliharaan Anda</h1>
      </div>

      {loading ? <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500">Memuat data hewan...</div> : null}
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error}</div> : null}

      {!loading && !error && pets.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500">Belum ada data hewan yang terhubung dengan akun Anda.</div>
      ) : null}

      {!loading && !error && pets.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3">
            {pets.map((pet) => (
              <button key={pet.id} type="button" onClick={() => void handleSelectPet(pet.id)} className={`w-full rounded-xl border p-4 text-left shadow-sm ${selectedPetId === pet.id ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-900'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{pet.name}</p>
                    <p className={`mt-1 text-sm ${selectedPetId === pet.id ? 'text-zinc-300' : 'text-zinc-600'}`}>{pet.species} • {pet.breed || '-'} • {pet.gender || '-'}</p>
                  </div>
                  {pet.photo ? <img src={pet.photo} alt={pet.name} className="h-14 w-14 rounded-lg object-cover" /> : null}
                </div>
              </button>
            ))}
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            {selectedPet ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-zinc-500">Detail hewan</p>
                    <h2 className="text-xl font-semibold text-zinc-900">{selectedPet.name}</h2>
                    <p className="mt-1 text-sm text-zinc-600">{selectedPet.species} • {selectedPet.breed || '-'} • {selectedPet.gender || '-'}</p>
                  </div>
                  {selectedPet.photo ? <img src={selectedPet.photo} alt={selectedPet.name} className="h-20 w-20 rounded-lg object-cover" /> : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 text-sm text-zinc-700">
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"><p className="text-zinc-500">Tanggal lahir</p><p className="mt-1 font-medium">{selectedPet.birthDate ? new Date(selectedPet.birthDate).toLocaleDateString('id-ID') : '-'}</p></div>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"><p className="text-zinc-500">Pemilik</p><p className="mt-1 font-medium">{selectedPet.customer?.name ?? '-'}</p></div>
                </div>

                <div className="rounded-lg border border-zinc-200 p-3 text-sm text-zinc-700">
                  <p className="font-medium text-zinc-900">Berat terkini</p>
                  <p className="mt-1">{selectedPet.weightLogs?.[0] ? `${selectedPet.weightLogs[selectedPet.weightLogs.length - 1].weight} kg` : 'Belum ada pencatatan berat.'}</p>
                </div>

                <div className="rounded-lg border border-zinc-200 p-3 text-sm text-zinc-700">
                  <p className="font-medium text-zinc-900">Vaksin</p>
                  {selectedPet.vaccineRecords?.length ? <ul className="mt-2 space-y-2">{selectedPet.vaccineRecords.map((record) => <li key={record.id} className="rounded bg-zinc-50 p-2">{record.vaccineName} • {new Date(record.date).toLocaleDateString('id-ID')}</li>)}</ul> : <p className="mt-2 text-zinc-500">Belum ada data vaksin.</p>}
                </div>

                <div className="rounded-lg border border-zinc-200 p-3 text-sm text-zinc-700">
                  <p className="font-medium text-zinc-900">Riwayat medis</p>
                  {selectedPet.medicalRecords?.length ? <ul className="mt-2 space-y-2">{selectedPet.medicalRecords.map((record) => <li key={record.id} className="rounded bg-zinc-50 p-2">{record.diagnosis || 'Tanpa diagnosis'} • {new Date(record.date).toLocaleDateString('id-ID')}</li>)}</ul> : <p className="mt-2 text-zinc-500">Belum ada riwayat medis.</p>}
                </div>
              </div>
            ) : <p className="text-sm text-zinc-500">Pilih hewan untuk melihat detail.</p>}
          </div>
        </div>
      ) : null}
    </div>
  );
}
