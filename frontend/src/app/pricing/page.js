'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import PageChrome from '@/components/PageChrome';
import ExcelExportButton from '@/components/ExcelExportButton';
import {
  searchPricing,
  exportPricing,
  getPricingColumns,
  getPricingKpi,
  searchMachine,
  exportMachine,
  getFeatureFlags,
} from '@/lib/api';

const NAVY = '#0b3d8c';
const GOLD = '#f5c518';
const RED = '#dc2626';

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

// Negotiation approval routing (Parts): how big is the gap between Current SP
// and the price Sales wants to offer, as a % of Current SP (either direction).
// Colors follow the 3-tier escalation scheme: navy (routine) -> gold (caution)
// -> red (most senior approval needed).
function computeNegotiationAction(currentSP, customPrice) {
  const current = Number(currentSP);
  const custom = Number(customPrice);
  if (!Number.isFinite(current) || current === 0 || !Number.isFinite(custom)) return null;

  const diffPercent = Math.abs((current - custom) / current) * 100;
  if (diffPercent <= 5) {
    return { label: 'Approval Product Support Manager', diffPercent, bg: NAVY, fg: '#fff' };
  }
  if (diffPercent < 15) {
    return { label: 'Need Approval Marketing', diffPercent, bg: GOLD, fg: '#1c1917' };
  }
  return { label: 'Approval Director', diffPercent, bg: RED, fg: '#fff' };
}

// Negotiation approval routing (Machine) — exact formula from supervisor:
// =IF((SP-Custom)/SP<5%;"Approval Sales Manager";IF((SP-Custom)/SP<5.5%;"Approval National Sales Manager";"Approval Marketing / Director"))
// Intentionally NOT an absolute value — only a lower custom price than
// Current SP routes through the 5% / 5.5% tiers below.
function computeMachineNegotiationAction(currentSP, customPrice) {
  const current = Number(currentSP);
  const custom = Number(customPrice);
  if (!Number.isFinite(current) || current === 0 || !Number.isFinite(custom)) return null;

  const diffPercent = ((current - custom) / current) * 100;
  if (diffPercent < 5) {
    return { label: 'Approval Sales Manager', diffPercent, bg: NAVY, fg: '#fff' };
  }
  if (diffPercent < 5.5) {
    return { label: 'Approval National Sales Manager', diffPercent, bg: GOLD, fg: '#1c1917' };
  }
  return { label: 'Approval Marketing / Director', diffPercent, bg: RED, fg: '#fff' };
}

function KpiCard({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function GetPriceButton({ onClick, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded px-4 py-2 text-sm font-semibold text-slate-900 hover:brightness-95 disabled:opacity-50"
      style={{ backgroundColor: GOLD }}
    >
      {children}
    </button>
  );
}

function NegotiationButton({ active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded px-4 py-2 text-sm font-semibold hover:brightness-95"
      style={active ? { backgroundColor: NAVY, color: '#fff' } : { backgroundColor: GOLD, color: '#1c1917' }}
    >
      Negotiation
    </button>
  );
}

function ActionBadge({ action, referenceLabel }) {
  if (!action) return <span className="text-slate-400">-</span>;
  return (
    <span
      className="inline-block rounded px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: action.bg, color: action.fg }}
      title={`Selisih ${action.diffPercent.toFixed(1)}% dari ${referenceLabel}`}
    >
      {action.label}
    </span>
  );
}

function PartsTab({ user }) {
  const [rawText, setRawText] = useState('');
  const [columns, setColumns] = useState([]);
  const [results, setResults] = useState([]);
  const [notFound, setNotFound] = useState([]);
  const [meta, setMeta] = useState(null);
  const [kpi, setKpi] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exportEnabled, setExportEnabled] = useState(true);
  const [negotiationMode, setNegotiationMode] = useState(false);
  const [customPrices, setCustomPrices] = useState({});

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
    <>
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
        <GetPriceButton onClick={handleGetPrice} disabled={loading}>
          {loading ? 'Mencari...' : `GET PRICE (${materialNumbers.length})`}
        </GetPriceButton>
        {canExport && (
          <ExcelExportButton onClick={handleExport} disabled={materialNumbers.length === 0} />
        )}
        {results.length > 0 && (
          <NegotiationButton active={negotiationMode} onClick={() => setNegotiationMode((v) => !v)} />
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
            <thead style={{ backgroundColor: NAVY }}>
              <tr>
                {columns.map((c) => (
                  <th key={c.columnKey} className="px-3 py-2 text-left font-medium text-white">
                    {c.displayLabel}
                  </th>
                ))}
                {negotiationMode && (
                  <>
                    <th className="px-3 py-2 text-left font-medium text-white">Custom Price</th>
                    <th className="px-3 py-2 text-left font-medium text-white">Action</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const action = negotiationMode
                  ? computeNegotiationAction(r.price, customPrices[r.id])
                  : null;
                return (
                  <tr key={r.id} className="border-t border-slate-100">
                    {columns.map((c) => (
                      <td key={c.columnKey} className="px-3 py-2 font-light">
                        {formatCellValue(c.columnKey, r[c.columnKey])}
                      </td>
                    ))}
                    {negotiationMode && (
                      <>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            value={customPrices[r.id] ?? ''}
                            onChange={(e) =>
                              setCustomPrices((prev) => ({ ...prev, [r.id]: e.target.value }))
                            }
                            placeholder="0"
                            className="w-32 rounded border border-slate-300 px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <ActionBadge action={action} referenceLabel="Current SP" />
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
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
    </>
  );
}

function MachineTab({ user }) {
  const [rawText, setRawText] = useState('');
  const [results, setResults] = useState([]);
  const [notFound, setNotFound] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exportEnabled, setExportEnabled] = useState(true);
  const [negotiationMode, setNegotiationMode] = useState(false);
  const [customPrices, setCustomPrices] = useState({});

  const isAdmin = user.role === 'admin';

  useEffect(() => {
    getFeatureFlags()
      .then((data) => {
        const flag = data.flags.find((f) => f.key === 'pricing_export');
        setExportEnabled(flag ? flag.enabled : true);
      })
      .catch(() => {});
  }, []);

  const canExport = isAdmin || exportEnabled;

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
      const data = await searchMachine({ materialNumbers });
      setResults(data.results);
      setNotFound(data.notFound);
      setMeta(data.meta);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    if (materialNumbers.length === 0) return;
    try {
      await exportMachine({ materialNumbers });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
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
        <GetPriceButton onClick={handleGetPrice} disabled={loading}>
          {loading ? 'Mencari...' : `GET PRICE (${materialNumbers.length})`}
        </GetPriceButton>
        {canExport && (
          <ExcelExportButton onClick={handleExport} disabled={materialNumbers.length === 0} />
        )}
        {results.length > 0 && (
          <NegotiationButton active={negotiationMode} onClick={() => setNegotiationMode((v) => !v)} />
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
            <thead style={{ backgroundColor: NAVY }}>
              <tr>
                <th className="px-3 py-2 text-left font-medium text-white">Material</th>
                <th className="px-3 py-2 text-left font-medium text-white">Description</th>
                {isAdmin && <th className="px-3 py-2 text-left font-medium text-white">COGS</th>}
                <th className="px-3 py-2 text-left font-medium text-white">Selling Price</th>
                {negotiationMode && (
                  <>
                    <th className="px-3 py-2 text-left font-medium text-white">Custom Price</th>
                    <th className="px-3 py-2 text-left font-medium text-white">Action</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const action = negotiationMode
                  ? computeMachineNegotiationAction(r.price, customPrices[r.id])
                  : null;
                return (
                  <tr key={r.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-light">{r.materialNumber}</td>
                    <td className="px-3 py-2 font-light">{r.description || '-'}</td>
                    {isAdmin && (
                      <td className="px-3 py-2 font-light">
                        {r.cogs === null || r.cogs === undefined ? '-' : Number(r.cogs).toLocaleString('id-ID')}
                      </td>
                    )}
                    <td className="px-3 py-2 font-light">{Number(r.price).toLocaleString('id-ID')}</td>
                    {negotiationMode && (
                      <>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            value={customPrices[r.id] ?? ''}
                            onChange={(e) =>
                              setCustomPrices((prev) => ({ ...prev, [r.id]: e.target.value }))
                            }
                            placeholder="0"
                            className="w-32 rounded border border-slate-300 px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <ActionBadge action={action} referenceLabel="Selling Price" />
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
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
    </>
  );
}

function PricingPageContent({ user }) {
  const [tab, setTab] = useState('parts');

  return (
    <PageChrome accentSrc="/pricing-header-footer.svg" user={user}>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Smart Parts Pricing Assistant</h1>
            <p className="text-sm text-slate-500">Cari harga spare part & machine secara massal</p>
          </div>
          <Link href="/" className="text-sm text-slate-500 underline underline-offset-2">
            &larr; Kembali
          </Link>
        </div>

        <div className="mb-6 flex items-center overflow-hidden rounded-lg" style={{ backgroundColor: GOLD }}>
          {[
            { key: 'parts', label: '1. Parts' },
            { key: 'machine', label: '2. Machine' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-6 py-2.5 text-sm font-semibold transition"
              style={
                tab === t.key
                  ? { backgroundColor: NAVY, color: '#fff' }
                  : { color: '#1c1917' }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'parts' ? <PartsTab user={user} /> : <MachineTab user={user} />}
      </div>
    </PageChrome>
  );
}

export default function PricingPage() {
  return (
    <AuthGuard requireModule="pricing" hideTopBar>
      {(user) => <PricingPageContent user={user} />}
    </AuthGuard>
  );
}
