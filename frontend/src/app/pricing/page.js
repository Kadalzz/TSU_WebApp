'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import {
  searchPricing,
  exportPricing,
  getPricingColumns,
  getPricingKpi,
  getFeatureFlags,
} from '@/lib/api';

function formatCellValue(columnKey, value) {
  if (value === null || value === undefined || value === '') return '-';
  switch (columnKey) {
    case 'pricingDate':
      return new Date(value).toISOString().slice(0, 10);
    case 'price':
      return Number(value).toLocaleString('id-ID');
    default:
      return String(value);
  }
}

function PricingPageContent({ user }) {
  const [rawText, setRawText] = useState('');
  const [columns, setColumns] = useState([]);
  const [results, setResults] = useState([]);
  const [notFound, setNotFound] = useState([]);
  const [meta, setMeta] = useState(null);
  const [kpi, setKpi] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exportEnabled, setExportEnabled] = useState(true);

  useEffect(() => {
    getPricingColumns()
      .then((data) => setColumns(data.columns.filter((c) => c.isVisible).sort((a, b) => a.sortOrder - b.sortOrder)))
      .catch(() => {});
    getPricingKpi().then(setKpi).catch(() => {});
    getFeatureFlags()
      .then((data) => {
        const flag = data.flags.find((f) => f.key === 'pricing_export');
        setExportEnabled(flag ? flag.enabled : true);
      })
      .catch(() => {});
  }, []);

  const canExport = user.role === 'admin' || exportEnabled;

  const materialNumbers = useMemo(
    () => [
      ...new Set(
        rawText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
      ),
    ],
    [rawText]
  );

  async function handleGetPrice() {
    if (materialNumbers.length === 0) {
      setError('Masukkan minimal 1 material code');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const data = await searchPricing({ materialNumbers });
      setResults(data.results);
      setNotFound(data.notFound);
      setMeta(data.meta);
      getPricingKpi().then(setKpi).catch(() => {});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    if (materialNumbers.length === 0) return;
    try {
      await exportPricing({ materialNumbers });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Smart Parts Pricing Assistant</h1>
          <p className="text-sm text-slate-500">Cari harga spare part secara massal</p>
        </div>
        <Link href="/" className="text-sm text-slate-500 underline underline-offset-2">
          &larr; Kembali
        </Link>
      </div>

      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <label className="mb-1 block text-sm font-medium">Paste Material Code (satu per baris)</label>
        <textarea
          rows={8}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder={'MAT-001\nMAT-002\nMAT-003'}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
      </div>

      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={handleGetPrice}
          disabled={loading}
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? 'Mencari...' : `GET PRICE (${materialNumbers.length})`}
        </button>
        {canExport && (
          <button
            onClick={handleExport}
            disabled={materialNumbers.length === 0}
            className="rounded border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
          >
            EXPORT EXCEL
          </button>
        )}
        {meta && (
          <span className="text-xs text-slate-500">
            {meta.totalFound}/{meta.totalRequested} ditemukan &middot; {meta.responseTimeMs}ms
          </span>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {results.length > 0 && (
        <div className="mb-6 overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                {columns.map((c) => (
                  <th key={c.columnKey} className="px-3 py-2 text-left font-medium">
                    {c.displayLabel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  {columns.map((c) => (
                    <td key={c.columnKey} className="px-3 py-2">
                      {formatCellValue(c.columnKey, r[c.columnKey])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {notFound.length > 0 && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="mb-1 font-medium">{notFound.length} material code tidak ditemukan:</p>
          <p className="break-words">{notFound.join(', ')}</p>
        </div>
      )}

      {kpi && (
        <div className="grid gap-4 sm:grid-cols-4">
          <KpiCard label="Total Material Searched" value={kpi.totalMaterialSearched} />
          <KpiCard label="Average Response Time" value={`${kpi.averageResponseTimeMs} ms`} />
          <KpiCard label="Monthly Search Volume" value={kpi.monthlySearchVolume} />
          <KpiCard label="Pricing Records Available" value={kpi.pricingRecordsAvailable} />
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

export default function PricingPage() {
  return <AuthGuard>{(user) => <PricingPageContent user={user} />}</AuthGuard>;
}
