'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import {
  uploadGpsTransactions,
  listGpsUploads,
  rollbackGpsUpload,
  deleteGpsUpload,
  downloadGpsErrorLog,
  getGpsModels,
  createGpsSubModel,
  updateGpsSubModel,
  getGpsUnclassifiedMaterials,
  assignGpsMaterialSubModel,
} from '@/lib/api';

function AdminGpsContent() {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSummary, setUploadSummary] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [models, setModels] = useState([]);
  const [unclassified, setUnclassified] = useState([]);
  const [newSubModel, setNewSubModel] = useState({}); // { [modelId]: { name, targetGpPercent } }
  const [assignChoice, setAssignChoice] = useState({}); // { [materialNo]: subModelId }
  const [error, setError] = useState('');

  const refreshAll = useCallback(() => {
    listGpsUploads().then((d) => setUploads(d.uploads)).catch((e) => setError(e.message));
    getGpsModels().then((d) => setModels(d.models)).catch((e) => setError(e.message));
    getGpsUnclassifiedMaterials().then((d) => setUnclassified(d.materials)).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  async function handleFile(file) {
    if (!file) {
      setError('Tidak ada file yang terdeteksi. Coba klik "Pilih File" dan pilih ulang.');
      return;
    }
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!['xlsx', 'csv'].includes(ext)) {
      setError(`Format ".${ext}" tidak didukung. Gunakan .xlsx atau .csv (file .xls lama harus dikonversi ke .xlsx dulu).`);
      return;
    }
    setError('');
    setUploading(true);
    setUploadSummary(null);
    try {
      const summary = await uploadGpsTransactions(file);
      setUploadSummary(summary);
      refreshAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  async function handleRollback(id) {
    setError('');
    try {
      await rollbackGpsUpload(id);
      refreshAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    setError('');
    try {
      await deleteGpsUpload(id);
      refreshAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateSubModel(modelId) {
    const draft = newSubModel[modelId];
    if (!draft?.name || draft?.targetGpPercent === undefined || draft?.targetGpPercent === '') {
      setError('Nama dan Target GP% wajib diisi');
      return;
    }
    setError('');
    try {
      await createGpsSubModel(modelId, { name: draft.name, targetGpPercent: Number(draft.targetGpPercent) });
      setNewSubModel((s) => ({ ...s, [modelId]: { name: '', targetGpPercent: '' } }));
      refreshAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUpdateTarget(subModel, value) {
    setError('');
    try {
      await updateGpsSubModel(subModel.id, {
        name: subModel.name,
        targetGpPercent: Number(value),
        isActive: subModel.isActive,
      });
      refreshAll();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAssign(materialNo) {
    const subModelId = assignChoice[materialNo];
    if (!subModelId) return;
    setError('');
    try {
      await assignGpsMaterialSubModel(materialNo, Number(subModelId));
      refreshAll();
    } catch (err) {
      setError(err.message);
    }
  }

  const allSubModels = models.flatMap((m) => m.subModels.map((sm) => ({ ...sm, modelName: m.name })));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Admin — Sales GPS</h1>
          <p className="text-sm text-slate-500">Upload transaksi, kelola sub-model, assign klasifikasi</p>
        </div>
        <Link href="/admin" className="text-sm text-slate-500 underline underline-offset-2">
          &larr; Admin Panel
        </Link>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {/* Upload */}
      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-medium">Upload Transaksi (Sales_GPS.xlsx)</h2>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center rounded border-2 border-dashed px-6 py-10 text-center text-sm ${dragOver ? 'border-slate-500 bg-slate-50' : 'border-slate-300'}`}
        >
          <p className="mb-2 text-slate-500">Drag & drop file .xlsx atau .csv, atau</p>
          <label className="cursor-pointer rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            Pilih File
            <input type="file" accept=".xlsx,.csv" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          </label>
          {uploading && <p className="mt-3 text-slate-500">Mengupload & memvalidasi...</p>}
        </div>
        {uploadSummary && (
          <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-4 text-sm">
            <p>
              Versi <strong>{uploadSummary.version}</strong> — {uploadSummary.totalRecords} baris:{' '}
              <span className="text-emerald-600">{uploadSummary.successCount} Success</span>,{' '}
              <span className="text-red-600">{uploadSummary.failedCount} Failed</span>
            </p>
            {uploadSummary.failedCount > 0 && (
              <button
                onClick={() => downloadGpsErrorLog(uploadSummary.uploadId)}
                className="mt-2 rounded border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-100"
              >
                Download Error Log
              </button>
            )}
          </div>
        )}
      </section>

      {/* Sub-model management */}
      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-medium">Model & Sub-Model (Target GP%)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {models.map((model) => (
            <div key={model.id} className="rounded border border-slate-200 p-3">
              <p className="mb-2 text-sm font-semibold">
                {model.name} <span className="text-xs font-normal text-slate-400">(prefix {model.codePrefix})</span>
              </p>
              <ul className="mb-3 space-y-1">
                {model.subModels.map((sm) => (
                  <li key={sm.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>{sm.name}</span>
                    <span className="flex items-center gap-1">
                      <input
                        type="number"
                        defaultValue={sm.targetGpPercent}
                        onBlur={(e) => e.target.value !== String(sm.targetGpPercent) && handleUpdateTarget(sm, e.target.value)}
                        className="w-16 rounded border border-slate-300 px-1.5 py-0.5 text-xs"
                      />
                      <span className="text-xs text-slate-400">%</span>
                    </span>
                  </li>
                ))}
                {model.subModels.length === 0 && <li className="text-xs text-slate-400">Belum ada sub-model</li>}
              </ul>
              <div className="flex gap-1">
                <input
                  type="text"
                  placeholder="Nama sub-model"
                  value={newSubModel[model.id]?.name || ''}
                  onChange={(e) => setNewSubModel((s) => ({ ...s, [model.id]: { ...s[model.id], name: e.target.value } }))}
                  className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs"
                />
                <input
                  type="number"
                  placeholder="Target%"
                  value={newSubModel[model.id]?.targetGpPercent || ''}
                  onChange={(e) => setNewSubModel((s) => ({ ...s, [model.id]: { ...s[model.id], targetGpPercent: e.target.value } }))}
                  className="w-16 rounded border border-slate-300 px-2 py-1 text-xs"
                />
                <button
                  onClick={() => handleCreateSubModel(model.id)}
                  className="rounded bg-slate-900 px-2 py-1 text-xs text-white hover:bg-slate-700"
                >
                  Tambah
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Unclassified materials */}
      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-medium">Material Belum Diklasifikasi ({unclassified.length})</h2>
        {unclassified.length === 0 ? (
          <p className="text-sm text-slate-400">Semua material sudah ter-assign ke sub-model</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Material No</th>
                <th className="px-3 py-2 text-left font-medium">Model</th>
                <th className="px-3 py-2 text-left font-medium">Jumlah Transaksi</th>
                <th className="px-3 py-2 text-left font-medium">Assign ke Sub-Model</th>
              </tr>
            </thead>
            <tbody>
              {unclassified.map((u) => (
                <tr key={u.materialNo} className="border-t border-slate-100">
                  <td className="px-3 py-2">{u.materialNo}</td>
                  <td className="px-3 py-2">{u.modelName || '-'}</td>
                  <td className="px-3 py-2">{u.transactionCount}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <select
                        value={assignChoice[u.materialNo] || ''}
                        onChange={(e) => setAssignChoice((s) => ({ ...s, [u.materialNo]: e.target.value }))}
                        className="rounded border border-slate-300 px-2 py-1 text-xs"
                      >
                        <option value="">Pilih sub-model</option>
                        {allSubModels
                          .filter((sm) => sm.modelId === u.modelId)
                          .map((sm) => (
                            <option key={sm.id} value={sm.id}>{sm.name}</option>
                          ))}
                      </select>
                      <button
                        onClick={() => handleAssign(u.materialNo)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100"
                      >
                        Assign
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Upload history */}
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-medium">Riwayat Upload</h2>
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Versi</th>
              <th className="px-3 py-2 text-left font-medium">File</th>
              <th className="px-3 py-2 text-left font-medium">Tanggal</th>
              <th className="px-3 py-2 text-left font-medium">Success/Failed</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
              <th className="px-3 py-2 text-left font-medium">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {uploads.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-3 py-2">{u.version}</td>
                <td className="px-3 py-2">{u.filename}</td>
                <td className="px-3 py-2">{new Date(u.uploadDate).toLocaleString('id-ID')}</td>
                <td className="px-3 py-2">{u.successCount} / {u.failedCount}</td>
                <td className="px-3 py-2">
                  {u.isActiveVersion ? (
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">Aktif</span>
                  ) : (
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Nonaktif</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    {u.failedCount > 0 && (
                      <button onClick={() => downloadGpsErrorLog(u.id)} className="text-xs text-slate-600 underline underline-offset-2">
                        Error Log
                      </button>
                    )}
                    {!u.isActiveVersion && (
                      <>
                        <button onClick={() => handleRollback(u.id)} className="text-xs text-slate-600 underline underline-offset-2">
                          Rollback
                        </button>
                        <button onClick={() => handleDelete(u.id)} className="text-xs text-red-600 underline underline-offset-2">
                          Hapus
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {uploads.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-400">Belum ada riwayat upload</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default function AdminGpsPage() {
  return <AuthGuard requireRole="admin">{() => <AdminGpsContent />}</AuthGuard>;
}
