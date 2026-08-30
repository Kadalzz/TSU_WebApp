'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { logout as logoutApi } from '@/lib/api';

const NAVY = '#0b3d8c';
const GOLD = '#f5c518';

function displayNameFromEmail(email) {
  const local = (email || '').split('@')[0];
  return local
    .split(/[._-]/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

function AccentBar({ height = 'h-2' }) {
  return (
    <div className={`flex w-full overflow-hidden ${height}`}>
      <div className="flex-[1.3]" style={{ backgroundColor: NAVY }} />
      <div className="w-4" style={{ backgroundColor: NAVY, clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }} />
      <div className="flex-1" style={{ backgroundColor: GOLD }} />
    </div>
  );
}

function ModuleCard({ href, title, description }) {
  return (
    <Link
      href={href}
      className="flex flex-col overflow-hidden rounded-xl bg-white shadow-[0_8px_30px_rgba(11,61,140,0.15)] transition hover:shadow-[0_12px_40px_rgba(11,61,140,0.25)]"
    >
      <div className="relative h-48 w-full overflow-hidden">
        <Image src="/equipment-photo.jpg" alt="" fill className="object-cover" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
      </div>
      <div className="flex flex-1 flex-col px-5 pb-4 pt-3">
        <h2 className="text-lg font-extrabold tracking-tight text-slate-900">{title}</h2>
        <p className="mt-1 flex-1 text-sm text-slate-500">{description}</p>
        <span
          className="mt-3 inline-flex w-fit items-center gap-1 rounded px-3 py-1 text-xs font-semibold text-slate-900"
          style={{ backgroundColor: GOLD }}
        >
          View Detail ↗
        </span>
      </div>
      <AccentBar />
    </Link>
  );
}

function LandingContent({ user }) {
  const router = useRouter();
  const canPricing = user.role === 'admin' || user.canAccessPricing;
  const canGps = user.role === 'admin' || user.canAccessGps;
  const isAdmin = user.role === 'admin';
  const displayName = displayNameFromEmail(user.email);

  async function handleLogout() {
    await logoutApi();
    router.push('/login');
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <AccentBar />

      <header className="flex items-center justify-between bg-white px-6 py-3 shadow-sm">
        <Image src="/LOGO.jpg.jpeg" alt="SEM - Tri Swardana Utama" width={200} height={34} className="h-8 w-auto" priority />
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-700">Hi {displayName}, Selamat datang!</span>
          <button onClick={handleLogout} title="Logout" className="rounded-full">
            <Image src="/Profile symbol.svg" alt="Logout" width={32} height={32} />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
        <h1 className="mb-8 text-center text-lg font-extrabold tracking-wide text-slate-900">
          JELAJAHI MARKETING DASHBOARD
        </h1>

        <div className="grid gap-6 sm:grid-cols-2">
          {canPricing && (
            <ModuleCard
              href="/pricing"
              title="PRICING MASTER"
              description={
                isAdmin
                  ? 'Upload master pricing, atur kolom, riwayat dan rollback.'
                  : 'Cari harga spare part secara massal, dalam hitungan detik.'
              }
            />
          )}
          {canGps && (
            <ModuleCard
              href="/gps"
              title="SALES GPS"
              description={
                isAdmin
                  ? 'Upload transaksi, kelola sub model dan target GP%, dan riwayat.'
                  : 'Pantau performa Gross Profit tiap Sales.'
              }
            />
          )}
        </div>

        {!canPricing && !canGps && (
          <p className="mt-6 text-center text-sm text-slate-400">
            Akun Anda belum diberi akses ke modul manapun. Hubungi Admin.
          </p>
        )}

        {isAdmin && (
          <div className="mt-8 text-center">
            <Link href="/admin" className="text-sm font-medium text-slate-700 underline underline-offset-2">
              Buka Admin Panel &rarr;
            </Link>
          </div>
        )}

        <p className="mt-10 text-right text-xs text-slate-400">
          A Subsidiary of <span className="font-bold" style={{ color: NAVY }}>Trakindo Utama</span>
        </p>
      </main>

      <AccentBar height="h-10" />
    </div>
  );
}

export default function LandingPage() {
  return <AuthGuard hideTopBar>{(user) => <LandingContent user={user} />}</AuthGuard>;
}
