'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import PageChrome from '@/components/PageChrome';
import ExcelExportButton from '@/components/ExcelExportButton';
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
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
];

const NAVY = '#0b3d8c';

function NavySelect({ value, onChange, disabled, children }) {
  return (
    <div className="relative flex-1 min-w-[120px]">
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full appearance-none bg-transparent px-4 py-2.5 text-sm text-white outline-none disabled:opacity-40 [&>option]:text-slate-900"
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white/70">
        &#9662;
      </span>
    </div>
  );
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
  const [filterOptions, setFilterOptions] = useState({ salesNames: [], customers: [], salesAreas: [], models: [], years: [] });
  const [filters, setFilters] = useState({ year: '', monthNum: '', salesName: '', customer: '', modelId: '', subModelId: '', salesArea: '' });
  const [summary, setSummary] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [kpi, setKpi] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [exportEnabled, setExportEnabled] = useState(true);

  // Kategori (sub-model) is intentionally NOT scoped to the selected Model —
  // it lists every sub-model across all models so the dropdown is always
  // clickable/usable on its own, without needing Model picked first.
  const subModelsForFilter = useMemo(
    () =>
      filterOptions.models.flatMap((m) =>
        (m.subModels || []).map((sm) => ({ ...sm, modelName: m.name }))
      ),
    [filterOptions.models]
  );

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

  // Year and Month are picked via two separate dropdowns in the UI (so the
  // Month list doesn't have to repeat itself per year), but the backend still
  // filters on a single combined value: "YYYY-MM" when both are picked, or
  // just the year when only Year is picked.
  const apiFilters = useMemo(() => {
    const { year, monthNum, ...rest } = filters;
    return {
      ...rest,
      month: year && monthNum ? `${year}-${monthNum}` : undefined,
      year: year && !monthNum ? year : undefined,
    };
  }, [filters]);

  async function refreshDashboard() {
    setLoading(true);
    setError('');
    try {
      const activeFilters = { ...apiFilters, search: search || undefined };
      const [summaryData, rankingData, kpiData, txData] = await Promise.all([
        getGpsDashboardSummary(apiFilters),
        getGpsDashboardRanking(apiFilters),
        getGpsDashboardKpi(apiFilters),
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
      getGpsTransactions({ ...apiFilters, search: search || undefined })
        .then((data) => setTransactions(data.transactions))
        .catch((err) => setError(err.message));
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <PageChrome accentSrc="/gps-header-footer.svg" user={user}>
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
      <div
        className="mb-6 flex flex-wrap divide-y divide-white/20 overflow-hidden rounded-lg shadow-sm no-print sm:divide-x sm:divide-y-0"
        style={{ backgroundColor: NAVY }}
      >
        <NavySelect value={filters.year} onChange={(e) => setFilters((f) => ({ ...f, year: e.target.value, monthNum: '' }))}>
          <option value="">All Year</option>
          {filterOptions.years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </NavySelect>
        <NavySelect
          value={filters.monthNum}
          onChange={(e) => setFilters((f) => ({ ...f, monthNum: e.target.value }))}
          disabled={!filters.year}
        >
          <option value="">All Month</option>
          {MONTH_NAMES.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </NavySelect>
        <NavySelect value={filters.salesName} onChange={(e) => setFilters((f) => ({ ...f, salesName: e.target.value }))}>
          <option value="">All Sales</option>
          {filterOptions.salesNames.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </NavySelect>
        <NavySelect value={filters.customer} onChange={(e) => setFilters((f) => ({ ...f, customer: e.target.value }))}>
          <option value="">All Customer</option>
          {filterOptions.customers.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </NavySelect>
        <NavySelect value={filters.modelId} onChange={(e) => setFilters((f) => ({ ...f, modelId: e.target.value }))}>
          <option value="">All Model</option>
          {filterOptions.models.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </NavySelect>
        <NavySelect value={filters.subModelId} onChange={(e) => setFilters((f) => ({ ...f, subModelId: e.target.value }))}>
          <option value="">All Kategori</option>
          {subModelsForFilter.map((sm) => (
            <option key={sm.id} value={sm.id}>{sm.modelName} — {sm.name}</option>
          ))}
        </NavySelect>
        <NavySelect value={filters.salesArea} onChange={(e) => setFilters((f) => ({ ...f, salesArea: e.target.value }))}>
          <option value="">All Sales Area</option>
          {filterOptions.salesAreas.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </NavySelect>
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
          {canExport && <ExcelExportButton onClick={() => exportGpsRanking(apiFilters)} />}
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
              <ExcelExportButton onClick={() => exportGpsTransactions({ ...apiFilters, search: search || undefined })} />
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
    </PageChrome>
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
  return (
    <AuthGuard requireModule="gps" hideTopBar>
      {(user) => <GpsPageContent user={user} />}
    </AuthGuard>
  );
}
