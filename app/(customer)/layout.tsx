import { PortalNav } from '@/components/layout/portal-nav';
import { Navbar } from '@/components/layout/navbar';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#fafafa] text-zinc-900">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col">
        <Navbar />
        <main className="flex-1 px-4 pb-24 pt-2 sm:px-6">{children}</main>
        <PortalNav />
      </div>
    </div>
  );
}
