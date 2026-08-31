'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { logout as logoutApi } from '@/lib/api';

function displayNameFromEmail(email) {
  const local = (email || '').split('@')[0];
  return local
    .split(/[._-]/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

// Stretched independently of an accent-bar SVG's native (very thin) aspect
// ratio via a CSS background instead of <img>, so it reads as a proper band.
export function AccentBar({ src, className }) {
  return (
    <div
      className={className}
      style={{ backgroundImage: `url(${src})`, backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat' }}
    />
  );
}

// variant "greeting": "Hi {name}, Selamat datang!" (landing page)
// variant "nameRole": bold name + "(role)" underneath, right-aligned (inner pages)
export function ProfileMenu({ user, variant = 'greeting' }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const displayName = variant === 'greeting' ? displayNameFromEmail(user.email) : user.name;

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
    <>
      {open && <div className="fixed inset-0 z-30 bg-slate-900/40" onClick={() => setOpen(false)} />}
      <div className="relative z-40 flex items-center gap-3" ref={ref}>
        {variant === 'greeting' ? (
          <span className="text-sm text-slate-700">Hi {displayName}, Selamat datang!</span>
        ) : (
          <div className="text-right leading-tight">
            <p className="text-sm font-bold text-slate-900">{displayName}</p>
            <p className="text-xs text-slate-500">({user.role})</p>
          </div>
        )}
        <button onClick={() => setOpen((v) => !v)} className="rounded-full">
          <Image src="/profile-symbol.svg" alt="Profil" width={32} height={32} />
        </button>

        {open && (
          <div className="absolute right-0 top-10 z-40 w-64 rounded-xl border border-slate-200 bg-white px-5 py-5 text-center shadow-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center">
              <Image src="/profile-symbol-ring.svg" alt="" width={56} height={56} />
            </div>
            <p className="mt-3 text-sm font-bold text-slate-900">{user.name}</p>
            <p className="mt-0.5 break-all text-xs text-slate-500">@{user.email}</p>
            <button
              onClick={handleLogout}
              className="mt-4 rounded px-6 py-1.5 text-xs font-semibold text-slate-900 hover:brightness-95"
              style={{ backgroundColor: '#f5c518' }}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// Full page chrome for inner pages (Pricing/GPS): top+bottom accent bars in
// the page's own color scheme, plus the shared logo+profile header.
export default function PageChrome({ accentSrc, user, children }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <AccentBar src={accentSrc} className="h-4 w-full" />

      <header className="flex items-center justify-between bg-white px-6 py-3 shadow-sm">
        <Image src="/LOGO.jpg.jpeg" alt="SEM - Tri Swardana Utama" width={200} height={34} className="h-8 w-auto" priority />
        <ProfileMenu user={user} variant="nameRole" />
      </header>

      <main className="flex-1">{children}</main>

      <AccentBar src={accentSrc} className="h-12 w-full" />
    </div>
  );
}
