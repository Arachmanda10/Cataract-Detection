"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppNav } from "@/components/app-nav";
import { api, ApiError } from "@/lib/api";
import { LABEL_TEXT } from "@/lib/labels";
import type { PredictionList } from "@/lib/types";
import { useRequireLogin } from "@/lib/use-require-login";

const LIMIT = 10;

export default function HistoryPage() {
  const router = useRouter();
  const { ready } = useRequireLogin();

  const [page, setPage] = useState(1);
  // Menyimpan halaman mana yang datanya sedang ditampilkan
  const [state, setState] = useState<{ page: number; list: PredictionList } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Dinaikkan untuk memuat ulang (mis. link gambar sudah kedaluwarsa)
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    api<PredictionList>(`/api/predictions?page=${page}&limit=${LIMIT}`)
      .then((list) => {
        if (cancelled) return;
        setState({ page, list });
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError(err instanceof Error ? err.message : "Gagal memuat riwayat");
      });

    // Jika page berubah sebelum respons datang, abaikan respons lama
    return () => {
      cancelled = true;
    };
  }, [ready, page, reloadKey, router]);

  function goTo(p: number) {
    setError(null);
    setPage(p);
  }

  function reload() {
    setError(null);
    setReloadKey((k) => k + 1);
  }

  if (!ready) return <main className="p-6">Memuat...</main>;

  const list = state?.list;
  const loading = !error && state?.page !== page;
  const totalPages = Math.max(1, list?.pagination.totalPages ?? 1);

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <AppNav />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Riwayat Prediksi</h1>
        <button onClick={reload} className="text-sm underline">
          Muat ulang
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600">
          {error}{" "}
          <button onClick={reload} className="underline">
            Coba lagi
          </button>
        </p>
      )}

      {!list && loading && <p className="text-sm text-gray-600">Memuat riwayat...</p>}

      {list && list.pagination.totalItems === 0 && (
        <p className="text-sm text-gray-600">
          Belum ada prediksi.{" "}
          <Link href="/predict" className="underline">
            Coba analisis foto pertama Anda
          </Link>
          .
        </p>
      )}

      {list && list.data.length > 0 && (
        <ul className={`flex flex-col gap-3 ${loading ? "opacity-50" : ""}`}>
          {list.data.map((p) => (
            <li key={p.id}>
              <Link
                href={`/history/${p.id}`}
                className="flex items-center gap-4 rounded border p-3 hover:bg-gray-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.imageUrl}
                  alt="Foto mata"
                  loading="lazy"
                  className="h-16 w-16 rounded border object-cover"
                />
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{LABEL_TEXT[p.label]}</span>
                  <span className="text-sm text-gray-600">
                    Keyakinan {(p.confidence * 100).toFixed(1)}% ·{" "}
                    {new Date(p.createdAt).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {list && list.pagination.totalItems > 0 && (
        <div className="flex items-center justify-between text-sm">
          <button
            onClick={() => goTo(page - 1)}
            disabled={page <= 1 || loading}
            className="rounded border px-3 py-2 disabled:opacity-50"
          >
            Sebelumnya
          </button>
          <span>
            Halaman {page} dari {totalPages} ({list.pagination.totalItems} prediksi)
          </span>
          <button
            onClick={() => goTo(page + 1)}
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