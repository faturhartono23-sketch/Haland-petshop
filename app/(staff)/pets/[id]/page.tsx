'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getPet } from '@/actions/pet';

export default function PetDetailPage() {
  const params = useParams<{ id: string }>();
  const [pet, setPet] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const result = await getPet(params.id);
      if (result.success) setPet(result.pet);
    }
    void load();
  }, [params.id]);

  if (!pet) return <div className="rounded-xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500">Memuat detail hewan...</div>;

  const weightData = (pet.weightLogs ?? []).map((log: any) => ({ name: log.date.slice(0, 10), weight: log.weight }));

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-500">Detail Hewan</p>
        <h1 className="text-xl font-semibold text-zinc-900">{pet.name}</h1>
        <p className="mt-2 text-sm text-zinc-600">{pet.species} • {pet.breed || '-'} • {pet.gender || '-'}</p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900">Grafik Berat Badan</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weightData}>
              <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="weight" stroke="#111827" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-zinc-900">Riwayat Vaksin</h3>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600">{(pet.vaccineRecords ?? []).map((record: any) => <li key={record.id}>• {record.vaccineName}</li>)}</ul>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-zinc-900">Riwayat Penyakit</h3>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600">{(pet.diseaseRecords ?? []).map((record: any) => <li key={record.id}>• {record.diseaseName}</li>)}</ul>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-zinc-900">Alergi</h3>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600">{(pet.allergies ?? []).map((record: any) => <li key={record.id}>• {record.allergen}</li>)}</ul>
        </div>
      </div>
    </div>
  );
}
