'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, ReceiptText, ScrollText, PawPrint, BellRing, BadgeCheck, Clock3 } from 'lucide-react';
import { getPortalAppointmentSummary, listAppointments } from '@/actions/appointment';
import { getPortalInvoiceSummary, getPortalInvoices } from '@/actions/invoice';
import { getNotifications } from '@/actions/notification';
import { listPets } from '@/actions/pet';
import { listMedicalRecords } from '@/actions/medical-record';
import { useRefetchOnFocus } from '@/hooks/use-refetch-on-focus';
import { usePermissions } from '@/hooks/use-permissions';

export default function PortalPage() {
  const [upcomingAppointments, setUpcomingAppointments] = useState<number | null>(null);
  const [unpaidInvoices, setUnpaidInvoices] = useState<number | null>(null);
  const [petCount, setPetCount] = useState<number | null>(null);
  const [medicalRecordCount, setMedicalRecordCount] = useState<number | null>(null);
  const [upcomingList, setUpcomingList] = useState<any[]>([]);
  const [invoiceList, setInvoiceList] = useState<any[]>([]);
  const [notificationList, setNotificationList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { isCustomer, canAccess } = usePermissions();

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    const [appointmentResult, invoiceResult, notificationResult, petResult, medicalResult] = await Promise.all([
      getPortalAppointmentSummary(),
      getPortalInvoiceSummary(),
      getNotifications(),
      listPets(),
      listMedicalRecords(),
    ]);

    if (appointmentResult.success) {
      setUpcomingAppointments(appointmentResult.upcomingAppointments ?? 0);
    }
    if (invoiceResult.success) {
      setUnpaidInvoices(invoiceResult.unpaidCount ?? 0);
    }
    if (petResult.success) {
      setPetCount((petResult.pets as any[])?.length ?? 0);
    }
    if (medicalResult.success) {
      setMedicalRecordCount((medicalResult.records as any[])?.length ?? 0);
    }
    if (notificationResult.success) {
      setNotificationList((notificationResult.data?.notifications as any[]) ?? []);
    }

    const appointmentListResult = await listAppointments();
    if (appointmentListResult.success) {
      setUpcomingList(((appointmentListResult.appointments as any[]) ?? []).filter((item) => item.status !== 'CANCELLED').slice(0, 3));
    }

    const invoiceListResult = await getPortalInvoices();
    if (invoiceListResult.success) {
      setInvoiceList(((invoiceListResult.invoices as any[]) ?? []).slice(0, 3));
    }

    if (!appointmentResult.success || !invoiceResult.success || !notificationResult.success || !petResult.success || !medicalResult.success) {
      setError('Beberapa data portal gagal dimuat.');
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useRefetchOnFocus(loadData);

  const cards = [
    { title: 'Hewan Peliharaan', value: petCount === null ? '—' : String(petCount), subtitle: 'Jumlah hewan terdaftar', icon: PawPrint },
    { title: 'Janji Temu', value: upcomingAppointments === null ? '—' : String(upcomingAppointments), subtitle: 'Jumlah appointment mendatang', icon: CalendarDays },
    { title: 'Tagihan', value: unpaidInvoices === null ? '—' : String(unpaidInvoices), subtitle: 'Invoice belum lunas', icon: ReceiptText },
    { title: 'Rekam Medis', value: medicalRecordCount === null ? '—' : String(medicalRecordCount), subtitle: 'Riwayat kunjungan tersimpan', icon: ScrollText },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-zinc-500">Portal Pelanggan</p>
        <h1 className="mt-1 text-xl font-semibold text-zinc-900">Ringkasan akun Anda</h1>
        <p className="mt-2 text-sm text-zinc-600">Data aktual dari akun, hewan, appointment, tagihan, dan notifikasi Anda.</p>
        {!isCustomer ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">Akses portal ini hanya tersedia untuk akun pelanggan.</p>
        ) : null}
      </div>

      {!canAccess('customer-portal') ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">Anda belum memiliki akses ke bagian portal pelanggan.</div>
      ) : null}
      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

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
              <p className="mt-4 text-2xl font-semibold text-zinc-900">{loading ? '…' : card.value}</p>
              <p className="mt-1 text-sm text-zinc-500">{card.subtitle}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">Appointment mendatang</h2>
          <div className="mt-3 space-y-2">
            {upcomingList.length === 0 ? <p className="text-sm text-zinc-500">Belum ada appointment yang dijadwalkan.</p> : upcomingList.map((item) => (
              <div key={item.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-zinc-900">{item.pet?.name ?? 'Hewan'}</p>
                    <p>{new Date(item.date).toLocaleString('id-ID')}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs ${item.status === 'DONE' ? 'bg-emerald-100 text-emerald-700' : item.status === 'CANCELLED' ? 'bg-rose-100 text-rose-700' : 'bg-zinc-100 text-zinc-700'}`}>{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-zinc-700">
            <BellRing className="h-4 w-4" />
            <span className="text-sm font-medium">Notifikasi terbaru</span>
          </div>
          <div className="mt-3 space-y-2">
            {notificationList.length === 0 ? <p className="text-sm text-zinc-500">Tidak ada notifikasi terbaru.</p> : notificationList.slice(0, 3).map((item) => (
              <div key={item.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
                <p className="font-medium text-zinc-900">{item.title}</p>
                <p className="mt-1 text-xs text-zinc-500">{item.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-zinc-900">Tagihan terbaru</h2>
        <div className="mt-3 space-y-2">
          {invoiceList.length === 0 ? <p className="text-sm text-zinc-500">Belum ada tagihan.</p> : invoiceList.map((invoice) => {
            const isPaid = invoice.status === 'PAID';
            const isPartial = invoice.status === 'PARTIAL_PAYMENT';
            return (
              <div key={invoice.id} className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
                <div>
                  <p className="font-medium text-zinc-900">{invoice.invoiceNumber}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
                    {isPaid ? <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" /> : <Clock3 className="h-3.5 w-3.5 text-amber-600" />}
                    <span>{invoice.status}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-zinc-900">Rp {Number(invoice.totalAmount ?? 0).toLocaleString('id-ID')}</p>
                  {isPartial ? <p className="text-xs text-amber-600">Pembayaran belum lunas</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
