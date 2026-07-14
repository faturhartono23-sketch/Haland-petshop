'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, House, ReceiptText, CircleUserRound, PawPrint, Hotel } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';

const items = [
  { href: '/portal', label: 'Beranda', icon: House },
  { href: '/portal/pets', label: 'Hewan', icon: PawPrint },
  { href: '/portal/appointments', label: 'JanjiTemu', icon: CalendarDays },
  { href: '/portal/invoices', label: 'Tagihan', icon: ReceiptText },
  { href: '/portal/pet-hotel', label: 'Pet Hotel', icon: Hotel },
  { href: '/portal/profile', label: 'Profil', icon: CircleUserRound },
];

export function PortalNav() {
  const pathname = usePathname();
  const { canAccess } = usePermissions();
  const visibleItems = items.filter((item) => {
    if (item.href === '/portal') return true;
    return canAccess('customer-portal');
  });

  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-zinc-200 bg-white/95 backdrop-blur sm:static sm:mt-4 sm:rounded-xl sm:border sm:shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-1 px-2 py-2 sm:px-3">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 min-w-0 flex-col items-center rounded-lg px-2 py-2 text-[10px] font-medium ${
                isActive ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              <Icon className="mb-1 h-3.5 w-3.5" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
