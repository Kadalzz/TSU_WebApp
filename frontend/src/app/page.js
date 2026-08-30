'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import { logout as logoutApi } from '@/lib/api';

const NAVY = '#0b3d8c';

function displayNameFromEmail(email) {
  const local = (email || '').split('@')[0];
  return local
    .split(/[._-]/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

function ProfileMenu({ user }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const displayName = displayNameFromEmail(user.email);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleLogout() {
    await logoutApi();
    router.push('/login');
  }

  return (
    <div className="relative flex items-center gap-2" ref={ref}>
      <span className="text-sm text-slate-700">Hi {displayName}, Selamat datang!</span>
      <button onClick={() => setOpen((v) => !v)} className="rounded-full">
        <Image src="/Profile symbol.svg" alt="Profil" width={32} height={32} />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-20 w-56 rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-lg">
          <p className="font-semibold text-slate-900">{user.name}</p>
          <p className="mt-0.5 break-all text-xs text-slate-500">{user.email}</p>
          <button
            onClick={handleLogout}
            className="mt-3 w-full rounded border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-100"
          >
            Logout
          </button>
        </div>
      )}
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
          className="mt-3 inline-flex w-fit items-center gap-1 rounded bg-[#face0b] px-3 py-1 text-xs font-semibold text-slate-900"
        >
          View Detail ↗
        </span>
      </div>
      <img src="/footer section svg.svg" alt="" className="block h-auto w-full" />
    </Link>
  );
}

function LandingContent({ user }) {
  const canPricing = user.role === 'admin' || user.canAccessPricing;
  const canGps = user.role === 'admin' || user.canAccessGps;
  const isAdmin = user.role === 'admin';

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <img src="/Header svg.svg" alt="" className="block h-auto w-full" />

      <header className="flex items-center justify-between bg-white px-6 py-3 shadow-sm">
        <Image src="/LOGO.jpg.jpeg" alt="SEM - Tri Swardana Utama" width={200} height={34} className="h-8 w-auto" priority />
        <ProfileMenu user={user} />
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

      <img src="/Header svg.svg" alt="" className="block h-auto w-full" />
    </div>
  );
}

export default function LandingPage() {
  return <AuthGuard hideTopBar>{(user) => <LandingContent user={user} />}</AuthGuard>;
}
