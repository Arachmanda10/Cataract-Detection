"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppNav } from "@/components/app-nav";
import { FeedbackForm } from "@/components/feedback-form";
import { PredictionResult } from "@/components/prediction-result";
import { api, ApiError } from "@/lib/api";
import type { PredictionDetail } from "@/lib/types";
import { useRequireLogin } from "@/lib/use-require-login";

export default function PredictionDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { ready } = useRequireLogin();

  const [detail, setDetail] = useState<PredictionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    api<PredictionDetail>(`/api/predictions/${id}`)
      .then((d) => {
        if (cancelled) return;
        setDetail(d);
        setError(null);
        setNotFound(false);
        setImageFailed(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
          return;
        }
        setError(err instanceof Error ? err.message : "Gagal memuat detail");
      });

    return () => {
      cancelled = true;
    };
  }, [ready, id, reloadKey, router]);

  async function onDelete() {
    if (!window.confirm("Hapus prediksi ini beserta fotonya? Tindakan ini tidak bisa dibatalkan.")) {
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await api(`/api/predictions/${id}`, { method: "DELETE" });
      router.replace("/history");
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Gagal menghapus");
      setDeleting(false);
    }
  }

  if (!ready) return <main className="p-6">Memuat...</main>;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-6">
      <AppNav />
      <Link href="/history" className="text-sm underline">
        ← Kembali ke riwayat
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

          <p className="text-sm text-gray-600">
            Dianalisis pada{" "}
            {new Date(detail.createdAt).toLocaleString("id-ID", {
              dateStyle: "long",
              timeStyle: "short",
            })}
          </p>

          <PredictionResult prediction={detail} />
          <FeedbackForm key={detail.id} predictionId={detail.id} initial={detail.feedback} />

          <div className="flex flex-col gap-2">
            <button
              onClick={onDelete}
              disabled={deleting}
              className="self-start rounded border border-red-600 px-3 py-2 text-sm text-red-600 disabled:opacity-50"
            >
              {deleting ? "Menghapus..." : "Hapus prediksi"}
            </button>
            {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
          </div>
        </>
      )}
    </main>
  );
}