'use client';

import { useEffect, useState } from 'react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { deleteNotification, getNotifications, markAllNotificationsRead, markNotificationRead } from '@/actions/notification';

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  type: string | null;
  date: Date;
};

export function NotificationBell() {
  const [count, setCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    void loadNotifications();
    const interval = window.setInterval(() => {
      void loadNotifications();
    }, 45000);

    return () => clearInterval(interval);
  }, []);

  async function loadNotifications() {
    const result = await getNotifications();
    if (result.success) {
      setNotifications((result.data?.notifications as NotificationItem[]) ?? []);
      setCount(result.data?.unreadCount ?? 0);
      setMessage('');
    }
  }

  async function handleToggle() {
    if (!isOpen) {
      setIsLoading(true);
      await loadNotifications();
      setIsLoading(false);
    }
    setIsOpen((value) => !value);
  }

  async function handleNotificationClick(id: string) {
    const result = await markNotificationRead({ id });
    if (result.success) {
      setNotifications((current) => current.map((item) => (item.id === id ? { ...item, isRead: true } : item)));
      setCount((current) => Math.max(0, current - 1));
      setMessage('');
      return;
    }

    setMessage(result.message ?? 'Gagal menandai notifikasi.');
  }

  async function handleMarkAllRead() {
    const result = await markAllNotificationsRead();
    if (result.success) {
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
      setCount(0);
      setMessage('');
      return;
    }

    setMessage(result.message ?? 'Gagal menandai semua notifikasi.');
  }

  async function handleDelete(id: string) {
    const result = await deleteNotification({ id });
    if (result.success) {
      setNotifications((current) => current.filter((item) => item.id !== id));
      setCount((current) => Math.max(0, current - 1));
      setMessage('');
      return;
    }

    setMessage(result.message ?? 'Gagal menghapus notifikasi.');
  }

  return (
    <div className="relative">
      <button
        type="button"
        className="relative rounded-full border border-zinc-200 p-2.5 text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900"
        aria-label="Notifikasi"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => void handleToggle()}
      >
        <Bell className="h-4 w-4" />
        {count > 0 ? <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-semibold text-white">{count}</span> : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-zinc-900">Notifikasi</p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => void handleMarkAllRead()} className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50" disabled={count === 0}>
                <CheckCheck className="h-3.5 w-3.5" />
                Baca semua
              </button>
              <span className="text-xs text-zinc-500">{count} belum dibaca</span>
            </div>
          </div>

          {isLoading ? <p className="text-sm text-zinc-500">Memuat notifikasi...</p> : notifications.length === 0 ? <p className="text-sm text-zinc-500">Tidak ada notifikasi.</p> : (
            <div className="max-h-72 space-y-2 overflow-auto">
              {notifications.map((item) => (
                <div key={item.id} className={`rounded-lg border px-3 py-2 text-sm transition ${item.isRead ? 'border-zinc-200 bg-zinc-50 text-zinc-500' : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'}`}>
                  <button type="button" onClick={() => void handleNotificationClick(item.id)} className="w-full text-left">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="mt-1 text-xs text-zinc-500">{item.message}</p>
                      </div>
                      {!item.isRead ? <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500" /> : null}
                    </div>
                  </button>
                  <div className="mt-2 flex justify-end">
                    <button type="button" onClick={() => void handleDelete(item.id)} className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50">
                      <Trash2 className="h-3.5 w-3.5" />
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {message ? <p className="mt-2 text-sm text-rose-600">{message}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
