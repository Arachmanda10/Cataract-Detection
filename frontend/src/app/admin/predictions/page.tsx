"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppNav } from "@/components/app-nav";
import { api } from "@/lib/api";
import { LABEL_TEXT } from "@/lib/labels";
import type { AdminPredictionList, AdminPredictionRow } from "@/lib/types";
import { useRequireAdmin } from "@/lib/use-require-admin";

const LIMIT = 20;

function feedbackText(r: AdminPredictionRow) {
  if (r.feedbackCorrect === null) return "Belum dinilai";
  return r.feedbackCorrect ? "Dinilai benar" : "Dinilai salah";
}

export default function AdminPredictionsPage() {
  const { ready } = useRequireAdmin();

  const [page, setPage] = useState(1);
  const [label, setLabel] = useState("");
  const [feedback, setFeedback] = useState("");
  // key menandai kombinasi halaman+filter mana yang datanya sedang ditampilkan
  const [result, setResult] = useState<{ key: string; list: AdminPredictionList } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const key = `${page}|${label}|${feedback}`;

    const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (label) params.set("label", label);
    if (feedback) params.set("feedback", feedback);

    api<AdminPredictionList>(`/api/admin/predictions?${params}`)
      .then((list) => {
        if (cancelled) return;
        setResult({ key, list });
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Gagal memuat prediksi");
      });

    return () => {
      cancelled = true;
    };
  }, [ready, page, label, feedback, reloadKey]);

  function changeLabel(v: string) {
    setError(null);
    setPage(1);
    setLabel(v);
  }

  function changeFeedback(v: string) {
    setError(null);
    setPage(1);
    setFeedback(v);
  }

  if (!ready) return <main className="p-6">Memuat...</main>;

  const list = result?.list;
  const loading = !error && result?.key !== `${page}|${label}|${feedback}`;
  const totalPages = Math.max(1, list?.pagination.totalPages ?? 1);

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <AppNav />
      <Link href="/admin" className="text-sm underline">
        ← Kembali ke admin
      </Link>
      <h1 className="text-2xl font-semibold">Monitoring Prediksi</h1>

      <div className="flex flex-wrap gap-3 text-sm">
        <label className="flex items-center gap-2">
          Hasil
          <select
            value={label}
            onChange={(e) => changeLabel(e.target.value)}
            className="rounded border p-2"
          >
            <option value="">Semua</option>
            <option value="cataract">{LABEL_TEXT.cataract}</option>
            <option value="normal">{LABEL_TEXT.normal}</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          Penilaian user
          <select
            value={feedback}
            onChange={(e) => changeFeedback(e.target.value)}
            className="rounded border p-2"
          >
            <option value="">Semua</option>
            <option value="correct">Dinilai benar</option>
            <option value="incorrect">Dinilai salah</option>
            <option value="none">Belum dinilai</option>
          </select>
        </label>
      </div>

      {error && (
        <p className="text-sm text-red-600">
          {error}{" "}
          <button onClick={() => setReloadKey((k) => k + 1)} className="underline">
            Coba lagi
          </button>
        </p>
      )}

      {!list && loading && <p className="text-sm text-gray-600">Memuat prediksi...</p>}

      {list && list.data.length === 0 && (
        <p className="text-sm text-gray-600">Tidak ada prediksi yang cocok dengan filter.</p>
      )}

      {list && list.data.length > 0 && (
        <ul className={`flex flex-col gap-3 ${loading ? "opacity-50" : ""}`}>
          {list.data.map((r) => (
            <li key={r.id}>
              <Link
                href={`/admin/predictions/${r.id}`}
                className="flex flex-col gap-1 rounded border p-3 hover:bg-gray-50"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{LABEL_TEXT[r.label]}</span>
                  <span className="text-sm text-gray-600">
                    {(r.confidence * 100).toFixed(1)}% · {r.inferenceMs} ms
                  </span>
                </div>
                <span className="text-sm text-gray-600">{r.userEmail}</span>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                  <span>
                    {new Date(r.createdAt).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                  <span>{feedbackText(r)}</span>
                </div>
                {r.feedbackComment && (
                  <span className="truncate text-xs text-gray-600">
                    Komentar: {r.feedbackComment}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {list && list.pagination.totalItems > 0 && (
        <div className="flex items-center justify-between text-sm">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1 || loading}
            className="rounded border px-3 py-2 disabled:opacity-50"
          >
            Sebelumnya
          </button>
          <span>
            Halaman {page} dari {totalPages} ({list.pagination.totalItems} prediksi)
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages || loading}
            className="rounded border px-3 py-2 disabled:opacity-50"
          >
            Berikutnya
          </button>
        </div>
      )}
    </main>
  );
}