'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import SalesRankingChart, {
  MARGIN_CATEGORY_COLORS,
  MARGIN_CATEGORY_LABELS,
  MARGIN_CATEGORY_TEXT_COLOR,
} from '@/components/gps/SalesRankingChart';
import {
  getGpsFilterOptions,
  getGpsDashboardSummary,
  getGpsDashboardRanking,
  getGpsDashboardKpi,
  getGpsTransactions,
  exportGpsTransactions,
  exportGpsRanking,
  getFeatureFlags,
} from '@/lib/api';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function currentYearMonthOptions() {
  const year = new Date().getFullYear();
  return MONTH_NAMES.map((name, idx) => ({
    value: `${year}-${String(idx + 1).padStart(2, '0')}`,
    label: name,
  }));
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('id-ID');
}

function formatCurrencyOrDash(value) {
  return value === null || value === undefined ? '-' : formatCurrency(value);
}

function formatPercentOrDash(value) {
  return value === null || value === undefined ? '-' : `${Number(value).toFixed(2)}%`;
}

function GpsPageContent({ user }) {
  const [filterOptions, setFilterOptions] = useState({ salesNames: [], customers: [], salesAreas: [], models: [] });
  const [filters, setFilters] = useState({ month: '', salesName: '', customer: '', modelId: '', subModelId: '', salesArea: '' });
  const [summary, setSummary] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [kpi, setKpi] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exportEnabled, setExportEnabled] = useState(true);

  const monthOptions = useMemo(() => currentYearMonthOptions(), []);

  const subModelsForFilter = useMemo(() => {
    if (!filters.modelId) return [];
    const model = filterOptions.models.find((m) => String(m.id) === String(filters.modelId));
    return model?.subModels || [];
  }, [filters.modelId, filterOptions.models]);

  useEffect(() => {
    getGpsFilterOptions().then(setFilterOptions).catch(() => {});
    getFeatureFlags()
      .then((data) => {
        const flag = data.flags.find((f) => f.key === 'gps_export');
        setExportEnabled(flag ? flag.enabled : true);
      })
      .catch(() => {});
  }, []);

  const canExport = user.role === 'admin' || exportEnabled;

  async function refreshDashboard() {
    setLoading(true);
    setError('');
    try {
      const activeFilters = { ...filters, search: search || undefined };
      const [summaryData, rankingData, kpiData, txData] = await Promise.all([
        getGpsDashboardSummary(filters),
        getGpsDashboardRanking(filters),
        getGpsDashboardKpi(filters),
        getGpsTransactions(activeFilters),
      ]);
      setSummary(summaryData.summary);
      setRanking(rankingData.ranking);
      setKpi(kpiData);
      setTransactions(txData.transactions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      getGpsTransactions({ ...filters, search: search || undefined })
        .then((data) => setTransactions(data.transactions))
        .catch((err) => setError(err.message));
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-semibold">Sales GPS</h1>
          <p className="text-sm text-slate-500">Gross Profit performance dashboard</p>
        </div>
        <div className="flex items-center gap-4">
          {canExport && (
            <button onClick={() => window.print()} className="text-sm text-slate-500 underline underline-offset-2">
              Export PDF
            </button>
          )}
          <Link href="/" className="text-sm text-slate-500 underline underline-offset-2">
            &larr; Kembali
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3 lg:grid-cols-6 no-print">
        <select
          value={filters.month}
          onChange={(e) => setFilters((f) => ({ ...f, month: e.target.value }))}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">All Month</option>
          {monthOptions.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <select
          value={filters.salesName}
          onChange={(e) => setFilters((f) => ({ ...f, salesName: e.target.value }))}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">All Sales</option>
          {filterOptions.salesNames.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filters.customer}
          onChange={(e) => setFilters((f) => ({ ...f, customer: e.target.value }))}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">All Customer</option>
          {filterOptions.customers.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={filters.modelId}
          onChange={(e) => setFilters((f) => ({ ...f, modelId: e.target.value, subModelId: '' }))}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">All Model</option>
          {filterOptions.models.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <select
          value={filters.subModelId}
          onChange={(e) => setFilters((f) => ({ ...f, subModelId: e.target.value }))}
          disabled={!filters.modelId}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm disabled:opacity-50"
        >
          <option value="">All Sub Model</option>
          {subModelsForFilter.map((sm) => (
            <option key={sm.id} value={sm.id}>{sm.name}</option>
          ))}
        </select>
        <select
          value={filters.salesArea}
          onChange={(e) => setFilters((f) => ({ ...f, salesArea: e.target.value }))}
          className="rounded border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">All Sales Area</option>
          {filterOptions.salesAreas.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {loading && <p className="mb-4 text-sm text-slate-400">Memuat dashboard...</p>}

      {/* KPI cards */}
      {kpi && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Total Revenue" value={formatCurrency(kpi.totalRevenue)} />
          <KpiCard label="Average Margin" value={`${kpi.averageMarginPercent}%`} />
          <KpiCard label="Total Transaction" value={kpi.totalTransaction} />
          <KpiCard label="Best Sales" value={kpi.bestSales || '-'} />
        </div>
      )}

      {/* Margin summary table */}
      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-medium">Margin Summary</h2>
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Kategori</th>
              <th className="px-3 py-2 text-left font-medium">Jumlah Transaksi</th>
              <th className="px-3 py-2 text-left font-medium">Persentase</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((s) => (
              <tr key={s.category} className="border-t border-slate-100">
                <td className="px-3 py-2">
                  <span
                    className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
                    style={{ backgroundColor: MARGIN_CATEGORY_COLORS[s.category] }}
                  />
                  {MARGIN_CATEGORY_LABELS[s.category]}
                </td>
                <td className="px-3 py-2">{s.count}</td>
                <td className="px-3 py-2">{s.percentage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Sales ranking chart */}
      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between no-print">
          <h2 className="font-medium">Sales Ranking</h2>
          {canExport && (
            <button
              onClick={() => exportGpsRanking(filters)}
              className="rounded border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-100"
            >
              Export Excel
            </button>
          )}
        </div>
        <SalesRankingChart data={ranking} />
      </section>

      {/* Detail transaction */}
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3 no-print">
          <h2 className="font-medium">Detail Transaction</h2>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Cari sales/customer/material..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm"
            />
            {canExport && (
              <button
                onClick={() => exportGpsTransactions({ ...filters, search: search || undefined })}
                className="rounded border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-100"
              >
                Export Excel
              </button>
            )}
          </div>
        </div>
        <div className="max-h-[480px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-100">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Invoice Date</th>
                <th className="px-3 py-2 text-left font-medium">Sales</th>
                <th className="px-3 py-2 text-left font-medium">Customer</th>
                <th className="px-3 py-2 text-left font-medium">Material No</th>
                <th className="px-3 py-2 text-left font-medium">Serial Number</th>
                <th className="px-3 py-2 text-left font-medium">Model</th>
                <th className="px-3 py-2 text-left font-medium">Sales Area</th>
                <th className="px-3 py-2 text-left font-medium">Actual Revenue</th>
                <th className="px-3 py-2 text-left font-medium">Actual Gross Profit%</th>
                <th className="px-3 py-2 text-left font-medium">Kategori</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">{new Date(t.invoiceDate).toISOString().slice(0, 10)}</td>
                  <td className="px-3 py-2">{t.salesName}</td>
                  <td className="px-3 py-2">{t.customerName || '-'}</td>
                  <td className="px-3 py-2">{t.materialNo || '-'}</td>
                  <td className="px-3 py-2">{t.serialNo || '-'}</td>
                  <td className="px-3 py-2">{t.model?.name || '-'}</td>
                  <td className="px-3 py-2">{t.salesArea || '-'}</td>
                  <td className="px-3 py-2">{formatCurrencyOrDash(t.revenue)}</td>
                  <td className="px-3 py-2">{formatPercentOrDash(t.gpPercent)}</td>
                  <td className="px-3 py-2">
                    <span
                      className="rounded px-2 py-0.5 text-xs"
                      style={{
                        backgroundColor: MARGIN_CATEGORY_COLORS[t.marginCategory],
                        color: MARGIN_CATEGORY_TEXT_COLOR[t.marginCategory],
                      }}
                    >
                      {MARGIN_CATEGORY_LABELS[t.marginCategory]}
                    </span>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-6 text-center text-slate-400">
                    Tidak ada transaksi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold">{value}</p>
    </div>
  );
}

export default function GpsPage() {
  return <AuthGuard>{(user) => <GpsPageContent user={user} />}</AuthGuard>;
}
