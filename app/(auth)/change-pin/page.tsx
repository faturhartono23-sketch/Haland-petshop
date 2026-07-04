'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { changePin } from '@/actions/profile';

export default function ChangePinPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [router, status]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!/^\d{6}$/.test(currentPin) || !/^\d{6}$/.test(newPin) || !/^\d{6}$/.test(confirmPin)) {
      setError('PIN harus terdiri dari 6 digit angka.');
      return;
    }

    if (newPin !== confirmPin) {
      setError('PIN baru dan konfirmasi PIN berbeda.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await changePin({ currentPin, newPin });
      if (!result.success) {
        setError(result.message ?? 'Gagal mengubah PIN.');
        return;
      }

      setSuccess('PIN berhasil diperbarui.');
      const role = (session?.user as { role?: string } | undefined)?.role;
      const redirectTo = role === 'CUSTOMER' ? '/portal' : '/dashboard';
      router.replace(redirectTo);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-zinc-100">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/90 p-8 shadow-2xl">
        <div className="mb-8 space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">Haland Petcare</p>
          <h1 className="text-2xl font-semibold">Ubah PIN</h1>
          <p className="text-sm text-zinc-400">Masukkan PIN lama dan PIN baru 6 digit.</p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm">
            <span className="mb-2 block text-zinc-400">PIN saat ini</span>
            <input
              value={currentPin}
              onChange={(event) => setCurrentPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-center text-lg tracking-[0.4em] outline-none ring-0"
              placeholder="●●●●●●"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
            />
          </label>

          <label className="block text-sm">
            <span className="mb-2 block text-zinc-400">PIN baru</span>
            <input
              value={newPin}
              onChange={(event) => setNewPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-center text-lg tracking-[0.4em] outline-none ring-0"
              placeholder="●●●●●●"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
            />
          </label>

          <label className="block text-sm">
            <span className="mb-2 block text-zinc-400">Konfirmasi PIN baru</span>
            <input
              value={confirmPin}
              onChange={(event) => setConfirmPin(event.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-4 py-3 text-center text-lg tracking-[0.4em] outline-none ring-0"
              placeholder="●●●●●●"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
            />
          </label>

          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          {success ? <p className="text-sm text-emerald-400">{success}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-zinc-100 px-4 py-3 font-medium text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Memproses...' : 'Simpan PIN'}
          </button>
        </form>
      </div>
    </main>
  );
}
