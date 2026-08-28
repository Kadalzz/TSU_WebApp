'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { login } from '@/lib/api';

const NAVY = '#0b3d8c';
const GOLD = '#f5c518';

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <Image
        src="/backgrounf-01.png"
        alt=""
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />

      <div className="relative z-10 w-full max-w-sm">
        <form onSubmit={handleSubmit} className="relative overflow-hidden rounded-2xl bg-white p-8 pb-10 shadow-2xl">
          <div className="mb-5 flex justify-center">
            <Image
              src="/LOGO.jpg.jpeg"
              alt="SEM - Tri Swardana Utama"
              width={280}
              height={47}
              className="h-auto w-64"
              priority
            />
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
