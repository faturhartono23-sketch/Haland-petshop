'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import { createUser, deleteUser, listUsers, resetPin, unlockUser } from '@/actions/user';
import { DataTable } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';

type UserRow = {
  id: string;
  username: string;
  name: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  isLocked: boolean;
  mustChangePin: boolean;
  failedPinAttempts: number;
  createdAt: string;
  createdBy?: { username: string; name: string } | null;
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [temporaryPin, setTemporaryPin] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    void loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    const result = await listUsers();
    if (result.success) {
      const normalizedUsers = (result.users ?? []).map((user: any) => ({
        ...user,
        createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : '',
      })) as UserRow[];
      setUsers(normalizedUsers);
    }
    setLoading(false);
  }

  async function handleCreate() {
    setIsCreating(true);
    const result = await createUser({
      username: `user${Date.now().toString().slice(-4)}`,
      name: 'Akun Baru',
      role: 'CUSTOMER',
      phone: '',
      isActive: true,
    });
    setIsCreating(false);
    if (!result.success) {
      setMessage(result.message ?? 'Gagal membuat akun.');
      return;
    }
    setTemporaryPin(result.temporaryPin ?? null);
    setMessage('Akun dibuat. PIN awal ditampilkan sekali.');
    await loadUsers();
  }

  async function handleResetPin(userId: string) {
    const result = await resetPin({ id: userId });
    if (!result.success) {
      setMessage(result.message ?? 'Gagal mereset PIN.');
      return;
    }
    setTemporaryPin(result.temporaryPin ?? null);
    setMessage('PIN berhasil direset.');
    await loadUsers();
  }

  async function handleUnlock(userId: string) {
    const result = await unlockUser({ id: userId });
    if (!result.success) {
      setMessage(result.message ?? 'Gagal membuka kunci akun.');
      return;
    }
    setMessage('Akun berhasil dibuka kuncinya.');
    await loadUsers();
  }

  async function handleDelete(userId: string) {
    const result = await deleteUser({ id: userId });
    if (!result.success) {
      setMessage(result.message ?? 'Gagal menonaktifkan akun.');
      return;
    }
    setMessage('Akun dinonaktifkan.');
    await loadUsers();
  }

  const columns: Array<{ key: keyof UserRow; header: string; render?: (row: UserRow) => ReactNode }> = [
    { key: 'username', header: 'Username' },
    { key: 'name', header: 'Nama' },
    { key: 'role', header: 'Role' },
    { key: 'isActive', header: 'Status', render: (row: UserRow) => (row.isActive ? 'Aktif' : 'Nonaktif') },
    { key: 'isLocked', header: 'Kunci', render: (row: UserRow) => (row.isLocked ? 'Terkunci' : 'Aktif') },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-zinc-500">Modul Users</p>
          <h1 className="text-xl font-semibold text-zinc-900">Kelola akun pengguna</h1>
        </div>
        <button type="button" onClick={handleCreate} disabled={isCreating} className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60">
          <Plus className="h-4 w-4" />
          {isCreating ? 'Membuat...' : 'Tambah Akun'}
        </button>
      </div>

      {message ? <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">{message}</div> : null}
      {temporaryPin ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">PIN awal: {temporaryPin}</div> : null}

      {loading ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500">Memuat data akun...</div>
      ) : users.length === 0 ? (
        <EmptyState title="Belum ada akun" description="Akun pengguna akan muncul di sini setelah dibuat." />
      ) : (
        <DataTable title="Daftar akun" columns={columns} rows={users} emptyMessage="Belum ada akun yang tersedia." />
      )}

      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-900">Aksi cepat</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setMessage('Silakan pilih akun dari tabel untuk aksi lanjut.')} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700">Reset PIN</button>
          <button type="button" onClick={() => setMessage('Silakan pilih akun dari tabel untuk aksi lanjut.')} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700">Unlock</button>
          <button type="button" onClick={() => setMessage('Silakan pilih akun dari tabel untuk aksi lanjut.')} className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700">Edit</button>
        </div>
      </div>

      <ConfirmDialog
        open={showConfirm}
        title="Nonaktifkan akun"
        description="Akun ini akan dinonaktifkan dan tidak bisa login lagi."
        confirmLabel="Nonaktifkan"
        onCancel={() => setShowConfirm(false)}
        onConfirm={() => {
          if (selectedUserId) {
            void handleDelete(selectedUserId);
          }
          setShowConfirm(false);
        }}
      />
    </div>
  );
}
