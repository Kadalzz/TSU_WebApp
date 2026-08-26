'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import { listUsers, createUserAccount, updateUserAccount, getMe } from '@/lib/api';

function AdminUsersContent() {
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
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(() => {
    listUsers().then((d) => setUsers(d.users)).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    refresh();
    getMe().then((d) => setMe(d.user)).catch(() => {});
  }, [refresh]);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      await createUserAccount(form);
      setForm({ name: '', email: '', password: '', role: 'user', canAccessPricing: true, canAccessGps: true });
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(user) {
    setError('');
    try {
      await updateUserAccount(user.id, { isActive: !user.isActive });
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRoleChange(user, role) {
    setError('');
    try {
      await updateUserAccount(user.id, { role });
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleModuleAccessChange(user, field, value) {
    setError('');
    try {
      await updateUserAccount(user.id, { [field]: value });
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Admin — Kelola User</h1>
          <p className="text-sm text-slate-500">Buat akun, atur role, aktif/nonaktifkan</p>
        </div>
        <Link href="/admin" className="text-sm text-slate-500 underline underline-offset-2">
          &larr; Admin Panel
        </Link>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-medium">Tambah User Baru</h2>
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
        <h2 className="mb-3 font-medium">Daftar User</h2>
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
      </section>
    </div>
  );
}

export default function AdminUsersPage() {
  return <AuthGuard requireRole="admin">{() => <AdminUsersContent />}</AuthGuard>;
}
