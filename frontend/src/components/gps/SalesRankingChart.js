'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';

export const MARGIN_CATEGORY_COLORS = {
  not_achieved: '#dc2626',
  underperforming: '#15803d',
  achieved: '#b45309',
  unclassified: '#64748b',
};

export const MARGIN_CATEGORY_LABELS = {
  not_achieved: 'Not Achieved',
  underperforming: 'Underperforming',
  achieved: 'Achieved',
  unclassified: 'Unclassified',
};

export default function SalesRankingChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">Belum ada data untuk ditampilkan</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 48)}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
        <XAxis type="number" tick={{ fontSize: 12, fill: '#475569' }} allowDecimals={false} />
        <YAxis type="category" dataKey="salesName" width={90} tick={{ fontSize: 12, fill: '#0f172a' }} />
        <Tooltip
          formatter={(value, name) => [value, MARGIN_CATEGORY_LABELS[name] || name]}
          contentStyle={{ fontSize: 12, borderRadius: 8 }}
        />
        <Legend formatter={(value) => MARGIN_CATEGORY_LABELS[value] || value} wrapperStyle={{ fontSize: 12 }} />
        {Object.keys(MARGIN_CATEGORY_COLORS).map((key) => (
          <Bar
            key={key}
            dataKey={key}
            name={key}
            stackId="margin"
            fill={MARGIN_CATEGORY_COLORS[key]}
            stroke="#f8fafc"
            strokeWidth={2}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
