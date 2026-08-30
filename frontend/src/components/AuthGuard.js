'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getMe, logout as logoutApi } from '@/lib/api';

function TopBar({ user }) {
  const router = useRouter();

  async function handleLogout() {
    await logoutApi();
    router.push('/login');
  }

  return (
    <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2 text-sm no-print">
      <Link href="/" className="font-semibold text-slate-900">
        TSU WebApp
      </Link>
      <div className="flex items-center gap-3">
        <span className="text-slate-500">
          {user.name} <span className="text-xs text-slate-400">({user.role})</span>
        </span>
        <button onClick={handleLogout} className="rounded border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-100">
          Logout
        </button>
      </div>
    </div>
  );
}

const MODULE_ACCESS_FIELD = {
  pricing: 'canAccessPricing',
  gps: 'canAccessGps',
};

export default function AuthGuard({ children, requireRole, requireModule, hideTopBar }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    getMe()
      .then((data) => {
        if (requireRole && data.user.role !== requireRole) {
          router.push('/');
          return;
        }
        if (
          requireModule &&
          data.user.role !== 'admin' &&
          !data.user[MODULE_ACCESS_FIELD[requireModule]]
        ) {
          router.push('/');
          return;
        }
        setUser(data.user);
        setStatus('ok');
      })
      .catch(() => router.push('/login'));
  }, [router, requireRole, requireModule]);

  if (status !== 'ok' || !user) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Memuat...</div>;
  }

  return (
    <div className="min-h-screen">
      {!hideTopBar && <TopBar user={user} />}
      {children(user)}
    </div>
  );
}
