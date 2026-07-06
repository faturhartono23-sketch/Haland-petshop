'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { KeyRound, PencilLine, Plus, RefreshCw, Unlock, UserRoundCheck, UserRoundX } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { activateUser, createUser, deleteUser, listUsers, resetPin, unlockUser, updateUser } from '@/actions/user';
import { DataTable } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { UserFormDialog } from '@/components/users/user-form-dialog';
import { canPerformAction, getRoleLabel, type Role } from '@/lib/permissions';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';

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

type UserFormValues = {
  id?: string;
  username: string;
  name: string;
  phone: string;
  role: Role;
  isActive: boolean;
};

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [temporaryPin, setTemporaryPin] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [submitting, setSubmitting] = useState(false);
  const [pendingActionUserId, setPendingActionUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const actorRole = (session?.user as { role?: string } | undefined)?.role as Role | undefined;
  const canCreateUsers = Boolean(actorRole && canPerformAction(actorRole, 'users', 'create'));
  const canUpdateUsers = Boolean(actorRole && canPerformAction(actorRole, 'users', 'update'));
  const canDeleteUsers = Boolean(actorRole && canPerformAction(actorRole, 'users', 'delete'));

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setMessage('');
    const result = await listUsers();
    if (result.success) {
      const normalizedUsers = (result.users ?? []).map((user: { createdAt: Date | string; id: string; username: string; name: string; phone: string | null; role: string; isActive: boolean; isLocked: boolean; mustChangePin: boolean; failedPinAttempts: number; createdBy?: { username: string; name: string } | null }) => ({
        ...user,
        createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : '',
      })) as UserRow[];
      setUsers(normalizedUsers);
    } else {
      setMessage(result.message ?? 'Gagal memuat daftar pengguna.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useRefetchOnFocus(loadUsers);

  function openCreateDialog() {
    if (!canCreateUsers) {
      setMessage('Anda tidak berwenang membuat akun.');
      return;
    }

    setFormMode('create');
    setSelectedUser(null);
    setShowForm(true);
  }

  function openEditDialog(user: UserRow) {
    if (!canUpdateUsers) {
      setMessage('Anda tidak berwenang mengubah akun.');
      return;
    }

    setFormMode('edit');
    setSelectedUser(user);
    setShowForm(true);
  }

  async function handleFormSubmit(values: UserFormValues) {
    if (!canCreateUsers && formMode === 'create') {
      setMessage('Anda tidak berwenang membuat akun.');
      return;
    }

    if (!canUpdateUsers && formMode === 'edit') {
      setMessage('Anda tidak berwenang mengubah akun.');
      return;
    }

    setSubmitting(true);
    setMessage('');
    const payload = {
      username: values.username.trim(),
      name: values.name.trim(),
      phone: values.phone.trim(),
      role: values.role,
      isActive: values.isActive,
    };

    const result = formMode === 'create'
      ? await createUser(payload)
      : await updateUser({ id: values.id ?? '', ...payload });

    setSubmitting(false);
    if (!result.success) {
      setMessage(result.message ?? 'Proses akun gagal.');
      return;
    }

    setShowForm(false);
    const temporaryPinValue = result.success && typeof result === 'object' && result !== null && 'temporaryPin' in result
      ? ((result as { temporaryPin?: string | null }).temporaryPin ?? null)
      : null;
    setTemporaryPin(temporaryPinValue);
    setMessage(formMode === 'create' ? 'Akun berhasil dibuat.' : 'Akun berhasil diperbarui.');
    await loadUsers();
  }

  async function handleResetPin(userId: string) {
    if (!canUpdateUsers) {
      setMessage('Anda tidak berwenang mereset PIN.');
      return;
    }

    setPendingActionUserId(userId);
    const result = await resetPin({ id: userId });
    setPendingActionUserId(null);
    if (!result.success) {
      setMessage(result.message ?? 'Gagal mereset PIN.');
      return;
    }
    setTemporaryPin(result.temporaryPin ?? null);
    setMessage('PIN berhasil direset.');
    await loadUsers();
  }

  async function handleUnlock(userId: string) {
    if (!canUpdateUsers) {
      setMessage('Anda tidak berwenang membuka kunci akun.');
      return;
    }

    setPendingActionUserId(userId);
    const result = await unlockUser({ id: userId });
    setPendingActionUserId(null);
    if (!result.success) {
      setMessage(result.message ?? 'Gagal membuka kunci akun.');
      return;
    }
    setMessage('Akun berhasil dibuka kuncinya.');
    await loadUsers();
  }

  async function handleDeactivate(userId: string) {
    if (!canDeleteUsers) {
      setMessage('Anda tidak berwenang menonaktifkan akun.');
      return;
    }

    setPendingActionUserId(userId);
    const result = await deleteUser({ id: userId });
    setPendingActionUserId(null);
    if (!result.success) {
      setMessage(result.message ?? 'Gagal menonaktifkan akun.');
      return;
    }
    setMessage('Akun dinonaktifkan.');
    await loadUsers();
  }

  async function handleActivate(userId: string) {
    if (!canUpdateUsers) {
      setMessage('Anda tidak berwenang mengaktifkan akun.');
      return;
    }

    setPendingActionUserId(userId);
    const result = await activateUser({ id: userId });
    setPendingActionUserId(null);
    if (!result.success) {
      setMessage(result.message ?? 'Gagal mengaktifkan akun.');
      return;
    }
    setMessage('Akun berhasil diaktifkan.');
    await loadUsers();
  }

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return users;
    }

    return users.filter((user) => {
      const haystack = [user.username, user.name, getRoleLabel(user.role), user.isActive ? 'aktif' : 'nonaktif', user.isLocked ? 'terkunci' : 'aktif'].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [searchTerm, users]);

  const columns: Array<{ key: keyof UserRow; header: string; render?: (row: UserRow) => ReactNode }> = [
    { key: 'username', header: 'Username' },
    { key: 'name', header: 'Nama' },
    { key: 'role', header: 'Role', render: (row: UserRow) => getRoleLabel(row.role) },
    { key: 'isActive', header: 'Status', render: (row: UserRow) => (row.isActive ? 'Aktif' : 'Nonaktif') },
    { key: 'isLocked', header: 'Kunci', render: (row: UserRow) => (row.isLocked ? 'Terkunci' : 'Aktif') },
    { key: 'id', header: 'Aksi', render: (row: UserRow) => {
      const isOwnAccount = session?.user?.id === row.id;
      return (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => openEditDialog(row)} disabled={!canUpdateUsers || isOwnAccount} className="rounded-lg border border-zinc-200 px-2 py-1 text-sm text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50">
            <PencilLine className="mr-1 inline h-4 w-4" />Edit
          </button>
          <button type="button" onClick={() => void handleResetPin(row.id)} disabled={pendingActionUserId === row.id || !canUpdateUsers || isOwnAccount} className="rounded-lg border border-zinc-200 px-2 py-1 text-sm text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50">
            <KeyRound className="mr-1 inline h-4 w-4" />Reset PIN
          </button>
          <button type="button" onClick={() => void handleUnlock(row.id)} disabled={pendingActionUserId === row.id || !canUpdateUsers || isOwnAccount} className="rounded-lg border border-zinc-200 px-2 py-1 text-sm text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50">
            <Unlock className="mr-1 inline h-4 w-4" />Unlock
          </button>
          {row.isActive ? (
            <button type="button" onClick={() => { setSelectedUser(row); setShowConfirm(true); }} disabled={!canDeleteUsers || isOwnAccount} className="rounded-lg border border-rose-200 px-2 py-1 text-sm text-rose-700 disabled:cursor-not-allowed disabled:opacity-50">
              <UserRoundX className="mr-1 inline h-4 w-4" />Nonaktifkan
            </button>
          ) : (
            <button type="button" onClick={() => void handleActivate(row.id)} disabled={pendingActionUserId === row.id || !canUpdateUsers || isOwnAccount} className="rounded-lg border border-emerald-200 px-2 py-1 text-sm text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
              <UserRoundCheck className="mr-1 inline h-4 w-4" />Aktifkan
            </button>
          )}
        </div>
      );
    }
  },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-zinc-500">Modul Users</p>
          <h1 className="text-xl font-semibold text-zinc-900">Kelola akun pengguna</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void loadUsers()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700">
            <RefreshCw className="h-4 w-4" />Segarkan
          </button>
          <button type="button" onClick={openCreateDialog} disabled={!canCreateUsers} className="inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60">
            <Plus className="h-4 w-4" />Tambah Akun
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <label className="block text-sm text-zinc-600">
          Cari akun
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Cari username, nama, role, atau status"
            className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2"
          />
        </label>
      </div>

      {message ? <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">{message}</div> : null}
      {temporaryPin ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">PIN awal: {temporaryPin}</div> : null}

      {loading ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500">Memuat data akun...</div>
      ) : filteredUsers.length === 0 ? (
        <EmptyState title="Belum ada akun" description="Akun pengguna akan muncul di sini setelah dibuat." />
      ) : (
        <DataTable title="Daftar akun" columns={columns} rows={filteredUsers} emptyMessage="Belum ada akun yang tersedia." />
      )}

      <UserFormDialog
        open={showForm}
        mode={formMode}
        initialValues={selectedUser ? {
          id: selectedUser.id,
          username: selectedUser.username,
          name: selectedUser.name,
          phone: selectedUser.phone ?? '',
          role: selectedUser.role as Role,
          isActive: selectedUser.isActive,
        } : undefined}
        submitting={submitting}
        onClose={() => setShowForm(false)}
        onSubmit={handleFormSubmit}
      />

      <ConfirmDialog
        open={showConfirm}
        title="Nonaktifkan akun"
        description="Akun ini akan dinonaktifkan dan tidak bisa login lagi."
        confirmLabel="Nonaktifkan"
        onCancel={() => setShowConfirm(false)}
        onConfirm={() => {
          if (selectedUser?.id) {
            void handleDeactivate(selectedUser.id);
          }
          setShowConfirm(false);
        }}
      />
    </div>
  );
}
