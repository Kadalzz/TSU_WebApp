'use client';

import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';

function LandingContent({ user }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">TSU WebApp</h1>
        <p className="text-sm text-slate-500">
          Masuk sebagai {user.name} ({user.role})
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Link
          href="/pricing"
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
        >
          <h2 className="mb-2 text-lg font-semibold">Smart Parts Pricing Assistant</h2>
          <p className="text-sm text-slate-500">Cari harga spare part secara massal, dalam hitungan detik.</p>
        </Link>

        <Link
          href="/gps"
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
        >
          <h2 className="mb-2 text-lg font-semibold">Sales GPS</h2>
          <p className="text-sm text-slate-500">Pantau performa Gross Profit tiap Sales.</p>
        </Link>
      </div>

      {user.role === 'admin' && (
        <Link
          href="/admin"
          className="mt-6 inline-block text-sm font-medium text-slate-700 underline underline-offset-2"
        >
          Buka Admin Panel &rarr;
        </Link>
      )}
    </div>
  );
}

export default function LandingPage() {
  return <AuthGuard>{(user) => <LandingContent user={user} />}</AuthGuard>;
}
