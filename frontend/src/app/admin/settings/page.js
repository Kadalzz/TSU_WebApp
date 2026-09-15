'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import PageChrome from '@/components/PageChrome';
import {
  getFeatureFlags,
  updateFeatureFlag,
  listUsers,
  createUserAccount,
  updateUserAccount,
  getMe,
} from '@/lib/api';

function AdminSettingsContent({ user: loggedInUser }) {
  const [flags, setFlags] = useState([]);
  const [flagsError, setFlagsError] = useState('');
  const [savingKey, setSavingKey] = useState('');

  const [users, setUsers] = useState([]);
  const [me, setMe] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    canAccessPricing: true,
    canAccessGps: true,
  });
  const [usersError, setUsersError] = useState('');
  const [creating, setCreating] = useState(false);

  const refreshUsers = useCallback(() => {
    listUsers().then((d) => setUsers(d.users)).catch((e) => setUsersError(e.message));
  }, []);

  useEffect(() => {
    getFeatureFlags().then((d) => setFlags(d.flags)).catch((e) => setFlagsError(e.message));
    refreshUsers();
    getMe().then((d) => setMe(d.user)).catch(() => {});
  }, [refreshUsers]);

  async function handleToggleFlag(flag) {
    setFlagsError('');
    setSavingKey(flag.key);
    try {
      const { flag: updated } = await updateFeatureFlag(flag.key, !flag.enabled);
      setFlags((prev) => prev.map((f) => (f.key === updated.key ? updated : f)));
    } catch (err) {
      setFlagsError(err.message);
    } finally {
      setSavingKey('');
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setUsersError('');
    setCreating(true);
    try {
      await createUserAccount(form);
      setForm({ name: '', email: '', password: '', role: 'user', canAccessPricing: true, canAccessGps: true });
      refreshUsers();
    } catch (err) {
      setUsersError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(u) {
    setUsersError('');
    try {
      await updateUserAccount(u.id, { isActive: !u.isActive });
      refreshUsers();
    } catch (err) {
      setUsersError(err.message);
    }
  }

  async function handleRoleChange(u, role) {
    setUsersError('');
    try {
      await updateUserAccount(u.id, { role });
      refreshUsers();
    } catch (err) {
      setUsersError(err.message);
    }
  }

  async function handleModuleAccessChange(u, field, value) {
    setUsersError('');
    try {
      await updateUserAccount(u.id, { [field]: value });
      refreshUsers();
    } catch (err) {
      setUsersError(err.message);
    }
  }

  return (
    <PageChrome accentSrc="/standard-accent-bar.svg" user={loggedInUser}>
      <div className="mx-auto max-w-5xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Admin — Settings</h1>
            <p className="text-sm text-slate-500">Fitur export & kelola user, dalam satu tempat</p>
          </div>
          <Link href="/admin" className="text-sm text-slate-500 underline underline-offset-2">
            &larr; Admin Panel
          </Link>
        </div>

        {flagsError && <p className="mb-4 text-sm text-red-600">{flagsError}</p>}

        <section className="mb-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
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
                  onClick={() => handleToggleFlag(flag)}
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

        <h2 className="mb-3 text-lg font-semibold text-slate-900">Kelola User</h2>
        {usersError && <p className="mb-4 text-sm text-red-600">{usersError}</p>}

        <section className="mb-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-medium">Tambah User Baru</h3>
          <form onSubmit={handleCreate} className="grid gap-2 sm:grid-cols-5">
            <input
              type="text"
              placeholder="Nama"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
            <input
              type="email"
              placeholder="Email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
            <input
              type="password"
              placeholder="Password (min 8 karakter)"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="rounded border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="user">User (Sales/Management)</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              disabled={creating}
              className="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {creating ? 'Menyimpan...' : 'Tambah'}
            </button>
            {form.role !== 'admin' && (
              <div className="flex items-center gap-4 sm:col-span-5">
                <label className="flex items-center gap-1.5 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.canAccessPricing}
                    onChange={(e) => setForm((f) => ({ ...f, canAccessPricing: e.target.checked }))}
                  />
                  Akses Smart Parts Pricing
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={form.canAccessGps}
                    onChange={(e) => setForm((f) => ({ ...f, canAccessGps: e.target.checked }))}
                  />
                  Akses Sales GPS
                </label>
              </div>
            )}
          </form>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-medium">Daftar User</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Nama</th>
                  <th className="px-3 py-2 text-left font-medium">Email</th>
                  <th className="px-3 py-2 text-left font-medium">Role</th>
                  <th className="px-3 py-2 text-left font-medium">Akses Modul</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-left font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-slate-100">
                    <td className="px-3 py-2">{u.name}</td>
                    <td className="px-3 py-2">{u.email}</td>
                    <td className="px-3 py-2">
                      <select
                        value={u.role}
                        disabled={u.id === me?.id}
                        onChange={(e) => handleRoleChange(u, e.target.value)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs disabled:opacity-50"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      {u.role === 'admin' ? (
                        <span className="text-xs text-slate-400">Semua modul</span>
                      ) : (
                        <div className="flex flex-col gap-1 text-xs">
                          <label className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={u.canAccessPricing}
                              onChange={(e) => handleModuleAccessChange(u, 'canAccessPricing', e.target.checked)}
                            />
                            Pricing
                          </label>
                          <label className="flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={u.canAccessGps}
                              onChange={(e) => handleModuleAccessChange(u, 'canAccessGps', e.target.checked)}
                            />
                            Sales GPS
                          </label>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {u.isActive ? (
                        <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">Aktif</span>
                      ) : (
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Nonaktif</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => handleToggleActive(u)}
                        disabled={u.id === me?.id}
                        className="text-xs text-slate-600 underline underline-offset-2 disabled:opacity-40"
                      >
                        {u.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </PageChrome>
  );
}

export default function AdminSettingsPage() {
  return (
    <AuthGuard requireRole="admin" hideTopBar>
      {(user) => <AdminSettingsContent user={user} />}
    </AuthGuard>
  );
}
