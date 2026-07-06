'use client';

import { useCallback, useEffect, useState } from 'react';
import { Lock, User } from 'lucide-react';
import { changePin, getProfileData, updateProfile } from '@/actions/profile';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';

type CustomerProfile = {
  id: string;
  username?: string;
  name: string;
  phone?: string | null;
  role?: string;
  address?: string | null;
  email?: string | null;
  emergencyContact?: string | null;
  photo?: string | null;
};

export default function CustomerProfilePage() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '', email: '', emergencyContact: '', photo: '' });
  const [pinForm, setPinForm] = useState({ currentPin: '', newPin: '' });

  const loadProfile = useCallback(async () => {
    const result = await getProfileData();
    if (result.success && result.data) {
      const customer = result.data.customer as CustomerProfile | null;
      const user = result.data.user as CustomerProfile | null;
      const merged = { ...(user ?? {}), ...(customer ?? {}) } as CustomerProfile;
      setProfile(merged);
      setForm({
        name: merged.name ?? '',
        phone: merged.phone ?? '',
        address: merged.address ?? '',
        email: merged.email ?? '',
        emergencyContact: merged.emergencyContact ?? '',
        photo: merged.photo ?? '',
      });
    } else {
      setMessage(result.message ?? 'Gagal memuat profil.');
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useRefetchOnFocus(loadProfile);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setIsSaving(true);
    setMessage('Menyimpan profil...');
    const result = await updateProfile(form);
    setMessage(result.message ?? 'Profil berhasil disimpan.');
    if (result.success && result.data) {
      const customer = result.data.customer as CustomerProfile | null;
      const user = result.data.user as CustomerProfile | null;
      setProfile({ ...(user ?? {}), ...(customer ?? {}) } as CustomerProfile);
    }
    setIsSaving(false);
  }

  async function handleChangePin(event: React.FormEvent) {
    event.preventDefault();
    setIsUpdatingPin(true);
    setMessage('Memperbarui PIN...');
    const result = await changePin(pinForm);
    setMessage(result.message ?? 'Gagal mengganti PIN.');
    if (result.success) {
      setPinForm({ currentPin: '', newPin: '' });
    }
    setIsUpdatingPin(false);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-500">Profil Pelanggan</p>
        <h1 className="mt-1 text-xl font-semibold text-zinc-900">Kelola profil, kontak, dan PIN Anda</h1>
      </div>

      {message ? <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">{message}</div> : null}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-zinc-700">
            <User className="h-4 w-4" />
            <h2 className="text-base font-semibold">Data profil</h2>
          </div>
          <label className="block text-sm text-zinc-600">
            Nama lengkap
            <input type="text" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2" />
          </label>
          <label className="block text-sm text-zinc-600">
            Telepon
            <input type="text" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2" />
          </label>
          <label className="block text-sm text-zinc-600">
            Email
            <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2" />
          </label>
          <label className="block text-sm text-zinc-600">
            Alamat
            <textarea value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} rows={3} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2" />
          </label>
          <label className="block text-sm text-zinc-600">
            Kontak darurat
            <input type="text" value={form.emergencyContact} onChange={(event) => setForm({ ...form, emergencyContact: event.target.value })} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2" />
          </label>
          <label className="block text-sm text-zinc-600">
            URL foto profil
            <input type="text" value={form.photo} onChange={(event) => setForm({ ...form, photo: event.target.value })} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2" />
          </label>
          <button type="submit" disabled={isSaving} className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60">
            {isSaving ? 'Menyimpan...' : 'Simpan profil'}
          </button>
        </form>

        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-zinc-700">
              <Lock className="h-4 w-4" />
              <h2 className="text-base font-semibold">Ganti PIN</h2>
            </div>
            <form onSubmit={handleChangePin} className="mt-4 space-y-4">
              <label className="block text-sm text-zinc-600">
                PIN saat ini
                <input type="password" value={pinForm.currentPin} onChange={(event) => setPinForm({ ...pinForm, currentPin: event.target.value })} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2" />
              </label>
              <label className="block text-sm text-zinc-600">
                PIN baru
                <input type="password" value={pinForm.newPin} onChange={(event) => setPinForm({ ...pinForm, newPin: event.target.value })} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2" />
              </label>
              <button type="submit" disabled={isUpdatingPin} className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-60">
                {isUpdatingPin ? 'Memperbarui...' : 'Perbarui PIN'}
              </button>
            </form>
          </div>

          {profile ? (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-700 shadow-sm">
              <p className="font-medium text-zinc-900">Ringkasan profil</p>
              <div className="mt-3 space-y-2">
                <p><span className="font-medium">Nama:</span> {profile.name}</p>
                <p><span className="font-medium">Telepon:</span> {profile.phone || '-'}</p>
                <p><span className="font-medium">Email:</span> {profile.email || '-'}</p>
                <p><span className="font-medium">Kontak darurat:</span> {profile.emergencyContact || '-'}</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
