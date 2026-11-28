"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { PredictionResult } from "@/components/prediction-result";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
        <Link
          href="/admin/predictions"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          ← Kembali ke daftar
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
            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              <span>Pengguna: {detail.userEmail}</span>
              <span>
                Dianalisis pada{" "}
                {new Date(detail.createdAt).toLocaleString("id-ID", {
                  dateStyle: "long",
                  timeStyle: "short",
                })}
              </span>
            </div>
          </div>

          <div className="space-y-6">
            <PredictionResult prediction={detail} />

            <Card>
              <CardHeader>
                <h2 className="text-lg">Penilaian user</h2>
              </CardHeader>
              <CardContent className="space-y-2">
                {detail.feedback ? (
                  <>
                    <p className="text-sm">
                      Hasil dinilai {detail.feedback.isCorrect ? "benar" : "salah"}.
                    </p>
                    {detail.feedback.comment && (
                      <p className="text-sm text-muted-foreground">
                        Komentar: {detail.feedback.comment}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Belum ada penilaian.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </PageShell>
  );
}