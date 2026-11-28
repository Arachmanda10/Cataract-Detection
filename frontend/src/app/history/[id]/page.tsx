"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FeedbackForm } from "@/components/feedback-form";
import { PageShell } from "@/components/page-shell";
import { PredictionResult } from "@/components/prediction-result";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [confirmOpen, setConfirmOpen] = useState(false);
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
    setConfirmOpen(false);
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

  if (!ready) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <PageShell
      title="Detail prediksi"
      actions={
        <Link href="/history" className={buttonVariants({ variant: "outline", size: "sm" })}>
          ← Kembali ke riwayat
        </Link>
      }
    >
      {notFound && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Prediksi tidak ditemukan.
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription className="flex flex-wrap items-center gap-3">
            {error}
            <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
              Coba lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!detail && !notFound && !error && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      )}

      {detail && (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={detail.imageUrl}
              alt="Foto mata"
              onError={() => setImageFailed(true)}
              className="max-h-[28rem] w-full rounded-xl border border-border bg-muted object-contain"
            />
            {imageFailed && (
              <Alert>
                <AlertDescription className="flex flex-wrap items-center gap-3">
                  Foto tidak bisa dimuat (tautannya mungkin sudah kedaluwarsa).
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReloadKey((k) => k + 1)}
                  >
                    Muat ulang
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            <p className="text-sm text-muted-foreground">
              Dianalisis pada{" "}
              {new Date(detail.createdAt).toLocaleString("id-ID", {
                dateStyle: "long",
                timeStyle: "short",
              })}
            </p>

            <div className="space-y-2">
              <Button
                variant="destructive"
                onClick={() => setConfirmOpen(true)}
                disabled={deleting}
              >
                {deleting ? "Menghapus..." : "Hapus prediksi"}
              </Button>
              {deleteError && (
                <Alert variant="destructive" role="alert">
                  <AlertDescription>{deleteError}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <PredictionResult prediction={detail} />
            <FeedbackForm key={detail.id} predictionId={detail.id} initial={detail.feedback} />
          </div>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus prediksi ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Prediksi beserta fotonya akan dihapus permanen. Tindakan ini tidak bisa
              dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <Button variant="destructive" onClick={onDelete}>
              Ya, hapus
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}