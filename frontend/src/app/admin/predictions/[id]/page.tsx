"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppNav } from "@/components/app-nav";
import { PredictionResult } from "@/components/prediction-result";
import { api, ApiError } from "@/lib/api";
import type { AdminPredictionDetail } from "@/lib/types";
import { useRequireAdmin } from "@/lib/use-require-admin";

export default function AdminPredictionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { ready } = useRequireAdmin();

  const [detail, setDetail] = useState<AdminPredictionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    api<AdminPredictionDetail>(`/api/admin/predictions/${id}`)
      .then((d) => {
        if (cancelled) return;
        setDetail(d);
        setError(null);
        setNotFound(false);
        setImageFailed(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
          return;
        }
        setError(err instanceof Error ? err.message : "Gagal memuat detail");
      });

    return () => {
      cancelled = true;
    };
  }, [ready, id, reloadKey]);

  if (!ready) return <main className="p-6">Memuat...</main>;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-6">
      <AppNav />
      <Link href="/admin/predictions" className="text-sm underline">
        ← Kembali ke daftar
      </Link>

      {notFound && <p className="text-sm text-gray-600">Prediksi tidak ditemukan.</p>}

      {error && (
        <p className="text-sm text-red-600">
          {error}{" "}
          <button onClick={() => setReloadKey((k) => k + 1)} className="underline">
            Coba lagi
          </button>
        </p>
      )}

      {!detail && !notFound && !error && <p className="text-sm text-gray-600">Memuat detail...</p>}

      {detail && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={detail.imageUrl}
            alt="Foto mata"
            onError={() => setImageFailed(true)}
            className="max-h-96 w-full rounded border object-contain"
          />
          {imageFailed && (
            <p className="text-sm text-gray-600">
              Foto tidak bisa dimuat (tautannya mungkin sudah kedaluwarsa).{" "}
              <button onClick={() => setReloadKey((k) => k + 1)} className="underline">
                Muat ulang
              </button>
            </p>
          )}

          <div className="flex flex-col gap-1 text-sm text-gray-600">
            <span>Pengguna: {detail.userEmail}</span>
            <span>
              Dianalisis pada{" "}
              {new Date(detail.createdAt).toLocaleString("id-ID", {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </span>
          </div>

          <PredictionResult prediction={detail} />

          <section className="flex flex-col gap-2 rounded border p-4">
            <h2 className="font-medium">Penilaian user</h2>
            {detail.feedback ? (
              <>
                <p className="text-sm">
                  Hasil dinilai {detail.feedback.isCorrect ? "benar" : "salah"}.
                </p>
                {detail.feedback.comment && (
                  <p className="text-sm text-gray-700">Komentar: {detail.feedback.comment}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-600">Belum ada penilaian.</p>
            )}
          </section>
        </>
      )}
    </main>
  );
}