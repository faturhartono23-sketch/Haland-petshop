'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { DoorOpen, CalendarDays } from 'lucide-react';
import { cancelPetHotelBooking, createPetHotelBooking, createPetHotelLog, createPetHotelRoom, deletePetHotelRoom, listPetHotelBookings, listPetHotelLogs, listPetHotelRooms, updatePetHotelBooking, updatePetHotelRoom } from '@/actions/pet-hotel';
import { DataTable } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';

type RoomRow = {
  id: string;
  name: string;
  status: string;
  occupancy: number;
};

type BookingRow = {
  id: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  pet: { name: string };
  customer?: { name: string };
  room: { name: string } | null;
};

export default function PetHotelPage() {
  const [tab, setTab] = useState<'rooms' | 'bookings'>('rooms');
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [roomForm, setRoomForm] = useState({ name: '', status: 'AVAILABLE' });

  useEffect(() => {
    void loadData();
  }, [tab]);

  async function loadData() {
    setLoading(true);
    if (tab === 'rooms') {
      const result = await listPetHotelRooms();
      if (result.success && result.rooms) {
        setRooms(result.rooms.map((r: any) => ({
          id: r.id,
          name: r.name,
          status: r.status,
          occupancy: r.bookings?.length ?? 0,
        })));
      }
    } else {
      const result = await listPetHotelBookings();
      if (result.success && result.bookings) {
        setBookings(result.bookings.map((b: any) => ({
          ...b,
          checkInDate: b.checkInDate ? new Date(b.checkInDate).toISOString() : '',
          checkOutDate: b.checkOutDate ? new Date(b.checkOutDate).toISOString() : '',
        })));
      }
    }
    setLoading(false);
  }

  async function handleRoomSubmit(event: React.FormEvent) {
    event.preventDefault();
    const payload = { id: editingId ?? undefined, name: roomForm.name, status: roomForm.status as any };
    const result = editingId ? await updatePetHotelRoom(payload as any) : await createPetHotelRoom({ name: roomForm.name });

    if (result.success) {
      setMessage(editingId ? 'Kamar diperbarui.' : 'Kamar ditambahkan.');
      setEditingId(null);
      setRoomForm({ name: '', status: 'AVAILABLE' });
      await loadData();
      return;
    }
    setMessage(result.message ?? 'Gagal menyimpan kamar.');
  }

  async function handleRoomDelete(id: string) {
    if (!confirm('Yakin hapus kamar ini?')) return;
    const result = await deletePetHotelRoom(id);
    if (result.success) {
      setMessage('Kamar dihapus.');
      await loadData();
      return;
    }
    setMessage(result.message ?? 'Gagal menghapus kamar.');
  }

  const roomColumns: Array<{ key: keyof RoomRow; header: string; render?: (row: RoomRow) => ReactNode }> = [
    { key: 'name', header: 'Nama Kamar' },
    { key: 'status', header: 'Status' },
    { key: 'occupancy', header: 'Penghuni' },
  ];

  const bookingColumns: Array<{ key: keyof BookingRow; header: string; render?: (row: BookingRow) => ReactNode }> = [
    { key: 'checkInDate', header: 'Check-in', render: (row) => new Date(row.checkInDate).toLocaleDateString('id-ID') },
    { key: 'checkOutDate', header: 'Check-out', render: (row) => new Date(row.checkOutDate).toLocaleDateString('id-ID') },
    { key: 'pet', header: 'Hewan', render: (row) => row.pet?.name ?? '-' },
    { key: 'status', header: 'Status' },
    { key: 'room', header: 'Kamar', render: (row) => row.room?.name ?? '-' },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-500">Modul Pet Hotel</p>
        <h1 className="text-xl font-semibold text-zinc-900">Manajemen rawat inap hewan</h1>
      </div>

      {message ? <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">{message}</div> : null}

      <div className="flex gap-2 border-b border-zinc-200">
        <button onClick={() => setTab('rooms')} className={`px-4 py-2 font-medium ${tab === 'rooms' ? 'border-b-2 border-zinc-900 text-zinc-900' : 'text-zinc-600'}`}>
          Kamar
        </button>
        <button onClick={() => setTab('bookings')} className={`px-4 py-2 font-medium ${tab === 'bookings' ? 'border-b-2 border-zinc-900 text-zinc-900' : 'text-zinc-600'}`}>
          Reservasi
        </button>
      </div>

      {tab === 'rooms' ? (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            {loading ? <div className="text-sm text-zinc-500">Memuat kamar...</div> : rooms.length === 0 ? <EmptyState title="Belum ada kamar" description="Tambah kamar untuk memulai." /> : <DataTable title="Daftar kamar" columns={roomColumns} rows={rooms} emptyMessage="Belum ada kamar." />}
          </div>

          <form onSubmit={handleRoomSubmit} className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-zinc-900">
              <DoorOpen className="h-4 w-4" />
              <h2 className="text-base font-semibold">{editingId ? 'Edit kamar' : 'Tambah kamar'}</h2>
            </div>

            <label className="block text-sm text-zinc-600">
              Nama Kamar
              <input type="text" value={roomForm.name} onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })} required className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2" />
            </label>

            <label className="block text-sm text-zinc-600">
              Status
              <select value={roomForm.status} onChange={(e) => setRoomForm({ ...roomForm, status: e.target.value })} className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2">
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="OCCUPIED">OCCUPIED</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
              </select>
            </label>

            <div className="flex flex-wrap gap-2">
              <button type="submit" className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white">
                {editingId ? 'Simpan perubahan' : 'Tambah kamar'}
              </button>
              {editingId ? (
                <button type="button" onClick={() => { setEditingId(null); setRoomForm({ name: '', status: 'AVAILABLE' }); }} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-700">
                  Batal
                </button>
              ) : null}
            </div>
          </form>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          {loading ? <div className="text-sm text-zinc-500">Memuat reservasi...</div> : bookings.length === 0 ? <EmptyState title="Belum ada reservasi" description="Reservasi akan muncul setelah ditambahkan." /> : <DataTable title="Daftar reservasi" columns={bookingColumns} rows={bookings} emptyMessage="Belum ada reservasi." />}
        </div>
      )}
    </div>
  );
}
