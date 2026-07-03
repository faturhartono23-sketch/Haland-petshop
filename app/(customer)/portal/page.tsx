'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, ReceiptText, ScrollText, PawPrint, CircleUserRound } from 'lucide-react';
import { getPortalAppointmentSummary } from '@/actions/appointment';
import { getPortalInvoiceSummary } from '@/actions/invoice';

export default function PortalPage() {
  const [upcomingAppointments, setUpcomingAppointments] = useState<number | null>(null);
  const [unpaidInvoices, setUnpaidInvoices] = useState<number | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    const [appointmentResult, invoiceResult] = await Promise.all([getPortalAppointmentSummary(), getPortalInvoiceSummary()]);
    if (appointmentResult.success) {
      setUpcomingAppointments(appointmentResult.upcomingAppointments ?? 0);
    }
    if (invoiceResult.success) {
      setUnpaidInvoices(invoiceResult.unpaidCount ?? 0);
    }
  }

  const cards = [
    { title: 'Hewan Peliharaan', value: '—', subtitle: 'Data placeholder', icon: PawPrint },
    { title: 'Janji Temu', value: upcomingAppointments === null ? '—' : String(upcomingAppointments), subtitle: 'Jumlah appointment mendatang Anda', icon: CalendarDays },
    { title: 'Tagihan', value: '—', subtitle: 'Data placeholder', icon: ReceiptText },
    { title: 'Rekam Medis', value: '—', subtitle: 'Data placeholder', icon: ScrollText },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-500">Portal Pelanggan</p>
        <h1 className="mt-1 text-xl font-semibold text-zinc-900">Kerangka portal</h1>
        <p className="mt-2 text-sm text-zinc-600">Konten personal akan diisi setelah modul terkait selesai.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.title} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-600">{card.title}</p>
                <div className="rounded-lg bg-zinc-100 p-2 text-zinc-700">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-4 text-2xl font-semibold text-zinc-900">{card.value}</p>
              <p className="mt-1 text-sm text-zinc-500">{card.subtitle}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-zinc-700">
          <CircleUserRound className="h-4 w-4" />
          <span className="text-sm font-medium">Profil akun</span>
        </div>
        <p className="mt-2 text-sm text-zinc-500">Bagian profil pelanggan akan diisi pada tahap berikutnya.</p>
      </div>
    </div>
  );
}
