'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/api';

const NAVY = '#0b3d8c';
const NAVY_DARK = '#082a63';
const GOLD = '#f5c518';

function IslandPattern() {
  // Abstract stand-in for an archipelago motif — not a geographically
  // accurate map, just soft island-like shapes on the navy background.
  const blobs = [
    { top: '4%', left: '3%', w: 140, h: 90 },
    { top: '10%', left: '22%', w: 90, h: 60 },
    { top: '2%', left: '46%', w: 160, h: 70 },
    { top: '14%', left: '70%', w: 120, h: 80 },
    { top: '6%', left: '88%', w: 100, h: 140 },
    { top: '55%', left: '8%', w: 110, h: 70 },
    { top: '68%', left: '30%', w: 150, h: 90 },
    { top: '60%', left: '58%', w: 130, h: 100 },
    { top: '72%', left: '82%', w: 100, h: 60 },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {blobs.map((b, i) => (
        <div
          key={i}
          className="absolute rounded-[40%] opacity-[0.12]"
          style={{
            top: b.top,
            left: b.left,
            width: b.w,
            height: b.h,
            background: '#3f66ad',
            transform: `rotate(${(i * 37) % 360}deg)`,
          }}
        />
      ))}
    </div>
  );
}

function BottomAccentBar() {
  return (
    <div className="mx-auto -mb-3 flex h-6 w-[94%] overflow-hidden rounded-full shadow">
      <div className="flex-[1.6]" style={{ backgroundColor: NAVY }} />
      <div
        className="w-5"
        style={{ backgroundColor: NAVY, clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }}
      />
      <div className="flex-1" style={{ backgroundColor: GOLD }} />
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden px-4"
      style={{ backgroundColor: NAVY_DARK }}
    >
      <IslandPattern />

      <div className="relative z-10 w-full max-w-sm">
        <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-8 pb-10 shadow-2xl">
          {/* Logo badge */}
          <div className="mb-5 flex justify-center">
            <div
              className="flex items-center gap-2 rounded px-3 py-2"
              style={{ backgroundColor: NAVY }}
            >
              <span
                className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold"
                style={{ backgroundColor: GOLD, color: NAVY }}
              >
                S
              </span>
              <span className="text-sm font-extrabold tracking-wide text-white">SEM</span>
              <span className="h-5 w-px bg-white/40" />
              <span className="text-[10px] font-semibold leading-tight text-white">
                TRI SWARDANA UTAMA
              </span>
            </div>
          </div>

          <p className="mb-6 text-center text-sm font-semibold text-slate-800">
            Welcome To Marketing Dashboard Project!
          </p>

          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            placeholder="Admin@tsu.local"
          />

          <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
            placeholder="••••••••"
          />

          {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-900 transition hover:brightness-95 disabled:opacity-50"
            style={{ backgroundColor: GOLD }}
          >
            {loading ? 'Memproses...' : 'Login'}
          </button>

          <p className="mt-4 text-right text-[11px] text-slate-500">
            A Subsidiary of <span className="font-bold" style={{ color: NAVY }}>Trakindo Utama</span>
          </p>

          <BottomAccentBar />
        </form>
      </div>
    </div>
  );
}
