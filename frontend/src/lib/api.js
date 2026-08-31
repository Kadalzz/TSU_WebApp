// Relative paths only — requests go through the Next.js rewrite proxy
// (see next.config.js) so the browser always talks to its own origin,
// keeping the auth cookie strictly first-party.
const API_URL = '';

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || `Request failed: ${res.status}`);
  }

  return data;
}

async function apiUpload(path, formData) {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || `Request failed: ${res.status}`);
  }

  return data;
}

async function apiDownload(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Request failed: ${res.status}`);
  }

  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : 'download.xlsx';

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

// ---------- Auth ----------

export const login = (email, password) =>
  apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });

export const logout = () => apiFetch('/api/auth/logout', { method: 'POST' });

export const getMe = () => apiFetch('/api/auth/me');

// ---------- Pricing: search & export ----------

export const searchPricing = (payload) =>
  apiFetch('/api/pricing/search', { method: 'POST', body: JSON.stringify(payload) });

export const exportPricing = (payload) =>
  apiDownload('/api/pricing/export', { method: 'POST', body: JSON.stringify(payload) });

// ---------- Pricing: columns & KPI ----------

export const getPricingColumns = () => apiFetch('/api/pricing/columns');

export const updatePricingColumns = (columns) =>
  apiFetch('/api/pricing/columns', { method: 'PUT', body: JSON.stringify({ columns }) });

export const getPricingKpi = () => apiFetch('/api/pricing/kpi');

// ---------- Pricing: admin upload history ----------

export const listPricingUploads = () => apiFetch('/api/pricing/uploads');

export const uploadPricingMaster = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiUpload('/api/pricing/uploads', formData);
};

export const rollbackPricingUpload = (id) =>
  apiFetch(`/api/pricing/uploads/${id}/rollback`, { method: 'POST' });

export const deletePricingUpload = (id) =>
  apiFetch(`/api/pricing/uploads/${id}`, { method: 'DELETE' });

export const downloadPricingErrorLog = (id) => apiDownload(`/api/pricing/uploads/${id}/error-log`);

// ---------- Machine: search & export ----------

export const searchMachine = (payload) =>
  apiFetch('/api/machine/search', { method: 'POST', body: JSON.stringify(payload) });

export const exportMachine = (payload) =>
  apiDownload('/api/machine/export', { method: 'POST', body: JSON.stringify(payload) });

// ---------- Machine: admin upload history ----------

export const listMachineUploads = () => apiFetch('/api/machine/uploads');

export const uploadMachineMaster = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiUpload('/api/machine/uploads', formData);
};

export const rollbackMachineUpload = (id) =>
  apiFetch(`/api/machine/uploads/${id}/rollback`, { method: 'POST' });

export const deleteMachineUpload = (id) =>
  apiFetch(`/api/machine/uploads/${id}`, { method: 'DELETE' });

export const downloadMachineErrorLog = (id) => apiDownload(`/api/machine/uploads/${id}/error-log`);

// ---------- GPS: dashboard ----------

function toQueryString(params) {
  const usp = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') usp.set(k, v);
  });
  const qs = usp.toString();
  return qs ? `?${qs}` : '';
}

export const getGpsFilterOptions = () => apiFetch('/api/gps/filters');

export const getGpsDashboardSummary = (filters) =>
  apiFetch(`/api/gps/dashboard/summary${toQueryString(filters)}`);

export const getGpsDashboardRanking = (filters) =>
  apiFetch(`/api/gps/dashboard/ranking${toQueryString(filters)}`);

export const getGpsDashboardKpi = (filters) => apiFetch(`/api/gps/dashboard/kpi${toQueryString(filters)}`);

export const getGpsTransactions = (filters) => apiFetch(`/api/gps/transactions${toQueryString(filters)}`);

export const exportGpsTransactions = (filters) =>
  apiDownload(`/api/gps/transactions/export${toQueryString(filters)}`);

export const exportGpsRanking = (filters) =>
  apiDownload(`/api/gps/dashboard/ranking/export${toQueryString(filters)}`);

export const getGpsModels = () => apiFetch('/api/gps/models');

// ---------- GPS: admin ----------

export const listGpsUploads = () => apiFetch('/api/gps/uploads');

export const uploadGpsTransactions = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiUpload('/api/gps/uploads', formData);
};

export const rollbackGpsUpload = (id) => apiFetch(`/api/gps/uploads/${id}/rollback`, { method: 'POST' });

export const deleteGpsUpload = (id) => apiFetch(`/api/gps/uploads/${id}`, { method: 'DELETE' });

export const downloadGpsErrorLog = (id) => apiDownload(`/api/gps/uploads/${id}/error-log`);

export const createGpsSubModel = (modelId, payload) =>
  apiFetch(`/api/gps/models/${modelId}/sub-models`, { method: 'POST', body: JSON.stringify(payload) });

export const updateGpsSubModel = (id, payload) =>
  apiFetch(`/api/gps/sub-models/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });

export const getGpsUnclassifiedMaterials = () => apiFetch('/api/gps/unclassified-materials');

export const assignGpsMaterialSubModel = (materialNo, subModelId) =>
  apiFetch('/api/gps/material-map', { method: 'POST', body: JSON.stringify({ materialNo, subModelId }) });

// ---------- Users (admin) ----------

export const listUsers = () => apiFetch('/api/users');

export const createUserAccount = (payload) =>
  apiFetch('/api/users', { method: 'POST', body: JSON.stringify(payload) });

export const updateUserAccount = (id, payload) =>
  apiFetch(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });

// ---------- Settings / Feature Flags ----------

export const getFeatureFlags = () => apiFetch('/api/settings/feature-flags');

export const updateFeatureFlag = (key, enabled) =>
  apiFetch(`/api/settings/feature-flags/${key}`, { method: 'PATCH', body: JSON.stringify({ enabled }) });
