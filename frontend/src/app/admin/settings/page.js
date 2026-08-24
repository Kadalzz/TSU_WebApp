'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import { getFeatureFlags, updateFeatureFlag } from '@/lib/api';

function AdminSettingsContent() {
  const [flags, setFlags] = useState([]);
  const [error, setError] = useState('');
  const [savingKey, setSavingKey] = useState('');

  useEffect(() => {
    getFeatureFlags().then((d) => setFlags(d.flags)).catch((e) => setError(e.message));
  }, []);

  async function handleToggle(flag) {
    setError('');
    setSavingKey(flag.key);
    try {
      const { flag: updated } = await updateFeatureFlag(flag.key, !flag.enabled);
      setFlags((prev) => prev.map((f) => (f.key === updated.key ? updated : f)));
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingKey('');
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Admin — Settings</h1>
          <p className="text-sm text-slate-500">Nyalakan/matikan fitur untuk role User</p>
        </div>
        <Link href="/admin" className="text-sm text-slate-500 underline underline-offset-2">
          &larr; Admin Panel
        </Link>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 font-medium">Fitur Export</h2>
        <p className="mb-4 text-xs text-slate-500">
          Kalau dimatikan, tombol export hilang untuk akun role User — Admin tetap selalu bisa export.
        </p>
        <ul className="divide-y divide-slate-100">
          {flags.map((flag) => (
            <li key={flag.key} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium">{flag.label}</p>
                <p className="text-xs text-slate-400">{flag.enabled ? 'Aktif untuk semua role' : 'Nonaktif untuk role User'}</p>
              </div>
              <button
                onClick={() => handleToggle(flag)}
                disabled={savingKey === flag.key}
                className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-50 ${
                  flag.enabled ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    flag.enabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </li>
          ))}
          {flags.length === 0 && <li className="py-3 text-sm text-slate-400">Memuat...</li>}
        </ul>
      </section>
    </div>
  );
}

export default function AdminSettingsPage() {
  return <AuthGuard requireRole="admin">{() => <AdminSettingsContent />}</AuthGuard>;
}
