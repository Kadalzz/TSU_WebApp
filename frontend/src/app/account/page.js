'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import PageChrome from '@/components/PageChrome';
import { changeOwnPassword, deleteOwnAccount } from '@/lib/api';

function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password baru tidak cocok');
      return;
    }
    setSaving(true);
    try {
      await changeOwnPassword(currentPassword, newPassword);
      setSuccess('Password berhasil diubah');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 font-medium">Ganti Password</h2>
      <form onSubmit={handleSubmit} className="grid max-w-sm gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Password Saat Ini</label>
          <input
            type="password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Password Baru</label>
          <input
            type="password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min. 8 karakter"
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Konfirmasi Password Baru</label>
          <input
            type="password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-emerald-600">{success}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-fit rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? 'Menyimpan...' : 'Simpan Password Baru'}
        </button>
      </form>
    </section>
  );
}

function DeleteAccountSection() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e) {
    e.preventDefault();
    setError('');
    setDeleting(true);
    try {
      await deleteOwnAccount(password);
      router.push('/login');
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  return (
    <section className="rounded-lg border border-red-200 bg-red-50 p-5 shadow-sm">
      <h2 className="mb-1 font-medium text-red-800">Hapus Akun</h2>
      <p className="mb-4 text-xs text-red-700">
        Akun Anda akan dihapus permanen dan tidak bisa dikembalikan. Anda akan langsung logout setelah ini.
      </p>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="rounded border border-red-400 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
        >
          Hapus Akun Saya
        </button>
      ) : (
        <form onSubmit={handleDelete} className="grid max-w-sm gap-3">
          <label className="block text-sm font-medium text-red-800">
            Ketik password Anda untuk konfirmasi
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border border-red-300 px-3 py-2 text-sm"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={deleting}
              className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? 'Menghapus...' : 'Ya, Hapus Permanen'}
            </button>
            <button
              type="button"
              onClick={() => { setConfirming(false); setPassword(''); setError(''); }}
              className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Batal
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function AccountPageContent({ user }) {
  return (
    <PageChrome accentSrc="/standard-accent-bar.svg" user={user}>
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Pengaturan Akun</h1>
            <p className="text-sm text-slate-500">{user.name} &middot; {user.email}</p>
          </div>
          <Link href="/" className="text-sm text-slate-500 underline underline-offset-2">
            &larr; Kembali
          </Link>
        </div>

        <ChangePasswordSection />
        <DeleteAccountSection />
      </div>
    </PageChrome>
  );
}

export default function AccountPage() {
  return (
    <AuthGuard hideTopBar>
      {(user) => <AccountPageContent user={user} />}
    </AuthGuard>
  );
}
