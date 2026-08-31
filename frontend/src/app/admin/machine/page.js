'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '@/components/AuthGuard';
import {
  uploadMachineMaster,
  listMachineUploads,
  rollbackMachineUpload,
  deleteMachineUpload,
  downloadMachineErrorLog,
} from '@/lib/api';

function AdminMachineContent() {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSummary, setUploadSummary] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [error, setError] = useState('');

  const refreshUploads = useCallback(() => {
    listMachineUploads().then((data) => setUploads(data.uploads)).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    refreshUploads();
  }, [refreshUploads]);

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
      const summary = await uploadMachineMaster(file);
      setUploadSummary(summary);
      refreshUploads();
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
      await rollbackMachineUpload(id);
      refreshUploads();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    setError('');
    try {
      await deleteMachineUpload(id);
      refreshUploads();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Admin — Pricing Machine</h1>
          <p className="text-sm text-slate-500">Upload master harga machine, kelola riwayat versi</p>
        </div>
        <Link href="/admin" className="text-sm text-slate-500 underline underline-offset-2">
          &larr; Admin Panel
        </Link>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <section className="mb-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-medium">Upload Machine Master</h2>
        <p className="mb-3 text-xs text-slate-500">
          Kolom wajib di file Excel: <strong>Material</strong>, Description, COGS, <strong>Selling Price</strong>.
          COGS bersifat rahasia — hanya tampil untuk Admin, tidak pernah ditampilkan ke role User.
        </p>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center rounded border-2 border-dashed px-6 py-10 text-center text-sm ${
            dragOver ? 'border-slate-500 bg-slate-50' : 'border-slate-300'
          }`}
        >
          <p className="mb-2 text-slate-500">Drag & drop file .xlsx atau .csv di sini, atau</p>
          <label className="cursor-pointer rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            Pilih File
            <input
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </label>
          {uploading && <p className="mt-3 text-slate-500">Mengupload & memvalidasi...</p>}
        </div>

        {uploadSummary && (
          <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-4 text-sm">
            <p>
              Versi <strong>{uploadSummary.version}</strong> — {uploadSummary.totalRecords} baris diproses:{' '}
              <span className="text-emerald-600">{uploadSummary.successCount} Data Success</span>,{' '}
              <span className="text-red-600">{uploadSummary.failedCount} Data Failed</span>
            </p>
            {uploadSummary.failedCount > 0 && (
              <button
                onClick={() => downloadMachineErrorLog(uploadSummary.uploadId)}
                className="mt-2 rounded border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-100"
              >
                Download Error Log
              </button>
            )}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-medium">Riwayat Upload</h2>
        <div className="overflow-x-auto">
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
                  <td className="px-3 py-2">
                    {u.successCount} / {u.failedCount}
                  </td>
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
                        <button
                          onClick={() => downloadMachineErrorLog(u.id)}
                          className="text-xs text-slate-600 underline underline-offset-2"
                        >
                          Error Log
                        </button>
                      )}
                      {!u.isActiveVersion && (
                        <>
                          <button
                            onClick={() => handleRollback(u.id)}
                            className="text-xs text-slate-600 underline underline-offset-2"
                          >
                            Rollback
                          </button>
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="text-xs text-red-600 underline underline-offset-2"
                          >
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
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                    Belum ada riwayat upload
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

export default function AdminMachinePage() {
  return <AuthGuard requireRole="admin">{() => <AdminMachineContent />}</AuthGuard>;
}
