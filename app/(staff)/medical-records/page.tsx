'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { FileText } from 'lucide-react';
import { createMedicalRecord, getMedicalRecordAccess, listMedicalRecordOptions, listMedicalRecords, updateMedicalRecord } from '@/actions/medical-record';
import { DataTable } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';

type RecordRow = {
  id: string;
  diagnosis: string | null;
  treatment: string | null;
  prescription: string | null;
  labResult: string | null;
  date: string;
  pet: { name: string; species: string };
  doctor: { name: string };
};

export default function MedicalRecordsPage() {
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ appointmentId: '', diagnosis: '', treatment: '', prescription: '', labResult: '', photos: '', date: '' });

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [recordResult, optionResult, accessResult] = await Promise.all([listMedicalRecords(), listMedicalRecordOptions(), getMedicalRecordAccess()]);
    if (recordResult.success) {
      const normalizedRecords = (recordResult.records ?? []).map((record: any) => ({
        ...record,
        date: record.date ? new Date(record.date).toISOString() : '',
      })) as RecordRow[];
      setRecords(normalizedRecords);
    }
    if (optionResult.success) setAppointments(optionResult.appointments as any[]);
    if (accessResult.success) setCanManage(Boolean(accessResult.canManage));
    setLoading(false);
  }

  function resetForm() {
    setEditingId(null);
    setForm({ appointmentId: '', diagnosis: '', treatment: '', prescription: '', labResult: '', photos: '', date: '' });
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const payload = {
      id: editingId ?? undefined,
      appointmentId: form.appointmentId,
      diagnosis: form.diagnosis,
      treatment: form.treatment,
      prescription: form.prescription,
      labResult: form.labResult,
      photos: form.photos,
      date: form.date,
    } as any;

    const result = editingId ? await updateMedicalRecord(payload) : await createMedicalRecord(payload);
    if (result.success) {
      setMessage(editingId ? 'Rekam medis diperbarui.' : 'Rekam medis dibuat.');
      resetForm();
      await loadData();
      return;
    }

    setMessage(result.message ?? 'Gagal menyimpan rekam medis.');
  }

  const columns: Array<{ key: keyof RecordRow; header: string; render?: (row: RecordRow) => ReactNode }> = [
    { key: 'date', header: 'Tanggal' },
    { key: 'pet', header: 'Hewan', render: (row) => row.pet.name },
    { key: 'doctor', header: 'Dokter', render: (row) => row.doctor?.name ?? '-' },
    { key: 'diagnosis', header: 'Diagnosis', render: (row) => row.diagnosis ?? '-' },
    { key: 'treatment', header: 'Tindakan', render: (row) => row.treatment ?? '-' },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-500">Modul Medical Records</p>
        <h1 className="text-xl font-semibold text-zinc-900">Rekam medis pasien</h1>
      </div>

      {message ? <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">{message}</div> : null}

      {canManage ? (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-zinc-900">
            <FileText className="h-4 w-4" />
            <h2 className="text-base font-semibold">{editingId ? 'Edit rekam medis' : 'Tambah rekam medis'}</h2>
          </div>
          <label className="block text-sm text-zinc-600">
            Appointment
            <select value={form.appointmentId} onChange={(event) => setForm({ ...form, appointmentId: event.target.value })} required className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2">
              <option value="">Pilih appointment</option>
              {appointments.map((appointment) => <option key={appointment.id} value={appointment.id}>{appointment.pet.name} — {appointment.customer.name}</option>)}
            </select>
          </label>
          <label className="block text-sm text-zinc-600">
            Diagnosis
            <textarea value={form.diagnosis} onChange={(event) => setForm({ ...form, diagnosis: event.target.value })} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2" />
          </label>
          <label className="block text-sm text-zinc-600">
            Tindakan
            <textarea value={form.treatment} onChange={(event) => setForm({ ...form, treatment: event.target.value })} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2" />
          </label>
          <label className="block text-sm text-zinc-600">
            Resep
            <textarea value={form.prescription} onChange={(event) => setForm({ ...form, prescription: event.target.value })} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2" />
          </label>
          <label className="block text-sm text-zinc-600">
            Hasil Lab
            <textarea value={form.labResult} onChange={(event) => setForm({ ...form, labResult: event.target.value })} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2" />
          </label>
          <label className="block text-sm text-zinc-600">
            Tanggal
            <input type="datetime-local" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2" />
          </label>
          <div className="flex gap-2">
            <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">{editingId ? 'Simpan perubahan' : 'Buat rekam medis'}</button>
            {editingId ? <button type="button" onClick={resetForm} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-700">Batal</button> : null}
          </div>
        </form>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">Anda hanya bisa melihat data rekam medis pada modul ini.</div>
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        {loading ? <div className="text-sm text-zinc-500">Memuat rekam medis...</div> : records.length === 0 ? <EmptyState title="Belum ada rekam medis" description="Rekam medis akan muncul setelah pemeriksaan selesai." /> : <DataTable title="Daftar rekam medis" columns={columns} rows={records} emptyMessage="Belum ada rekam medis." />}
      </div>
    </div>
  );
}
