'use client';

import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';

function AdminHubContent() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin Panel</h1>
        <Link href="/" className="text-sm text-slate-500 underline underline-offset-2">
          &larr; Kembali
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Link
          href="/admin/pricing"
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
        >
          <h2 className="mb-2 text-lg font-semibold">Pricing Master</h2>
          <p className="text-sm text-slate-500">Upload master pricing, atur kolom, riwayat & rollback.</p>
        </Link>

        <Link
          href="/admin/gps"
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
        >
          <h2 className="mb-2 text-lg font-semibold">Sales GPS</h2>
          <p className="text-sm text-slate-500">Upload transaksi, kelola sub-model & target GP%, riwayat.</p>
        </Link>

        <Link
          href="/admin/users"
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
        >
          <h2 className="mb-2 text-lg font-semibold">Kelola User</h2>
          <p className="text-sm text-slate-500">Buat akun, atur role Admin/User, aktif/nonaktifkan.</p>
        </Link>

        <Link
          href="/admin/settings"
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
        >
          <h2 className="mb-2 text-lg font-semibold">Settings</h2>
          <p className="text-sm text-slate-500">Nyalakan/matikan fitur export untuk role User.</p>
        </Link>
      </div>
    </div>
  );
}

export default function AdminHubPage() {
  return <AuthGuard requireRole="admin">{() => <AdminHubContent />}</AuthGuard>;
}
