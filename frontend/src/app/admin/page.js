'use client';

import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import PageChrome from '@/components/PageChrome';

const NAVY = '#20407f';
const GOLD = '#face0b';

function Icon({ path, color }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      {path}
    </svg>
  );
}

const ICONS = {
  upload: (
    <>
      <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </>
  ),
  cog: (
    <>
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
      <path d="M19.4 13.5a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.56V19.5a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1H4.5a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H10a1.7 1.7 0 0 0 1-1.56V4.5a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V10c.14.42.42.79.79 1.05.36.26.79.4 1.23.42h.09a2 2 0 1 1 0 4h-.09c-.44.02-.87.16-1.23.42" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v18h18" />
      <rect x="7" y="12" width="3" height="6" />
      <rect x="12.5" y="8" width="3" height="10" />
      <rect x="18" y="5" width="3" height="13" />
    </>
  ),
};

function AdminCard({ href, icon, iconColor, title, description }) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span
        className="flex h-10 w-10 flex-none items-center justify-center rounded-lg"
        style={{ backgroundColor: `${iconColor}1a` }}
      >
        <Icon path={ICONS[icon]} color={iconColor} />
      </span>
      <span>
        <span className="block text-base font-semibold text-slate-900 group-hover:underline">{title}</span>
        <span className="mt-0.5 block text-sm text-slate-500">{description}</span>
      </span>
    </Link>
  );
}

function SectionHeading({ children }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: GOLD }} />
      {children}
    </h2>
  );
}

function AdminHubContent({ user }) {
  return (
    <PageChrome accentSrc="/standard-accent-bar.svg" user={user}>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Admin Panel</h1>
            <p className="text-sm text-slate-500">Kelola data, user, dan pengaturan aplikasi</p>
          </div>
          <Link href="/" className="text-sm text-slate-500 underline underline-offset-2">
            &larr; Kembali
          </Link>
        </div>

        <div className="mb-8">
          <SectionHeading>Smart Pricing Assistant</SectionHeading>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminCard
              href="/admin/pricing"
              icon="upload"
              iconColor={NAVY}
              title="Pricing Master (Parts)"
              description="Upload master pricing, atur kolom, riwayat & rollback."
            />
            <AdminCard
              href="/admin/machine"
              icon="upload"
              iconColor={NAVY}
              title="Pricing Machine"
              description="Upload master harga machine, riwayat & rollback."
            />
          </div>
        </div>

        <div className="mb-8">
          <SectionHeading>Sales GPS</SectionHeading>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminCard
              href="/admin/gps"
              icon="chart"
              iconColor={NAVY}
              title="Sales GPS"
              description="Upload transaksi, kelola sub-model & target GP%, riwayat."
            />
          </div>
        </div>

        <div>
          <SectionHeading>Pengaturan</SectionHeading>
          <div className="grid gap-4 sm:grid-cols-2">
            <AdminCard
              href="/admin/settings"
              icon="cog"
              iconColor="#b45309"
              title="Settings"
              description="Fitur export & kelola user (buat akun, atur role, aktif/nonaktifkan)."
            />
          </div>
        </div>
      </div>
    </PageChrome>
  );
}

export default function AdminHubPage() {
  return (
    <AuthGuard requireRole="admin" hideTopBar>
      {(user) => <AdminHubContent user={user} />}
    </AuthGuard>
  );
}
