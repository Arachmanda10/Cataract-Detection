"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api";
import { LABEL_TEXT } from "@/lib/labels";
import type { PredictionList } from "@/lib/types";
import { useRequireLogin } from "@/lib/use-require-login";

const LIMIT = 12;

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

  if (!ready) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const list = state?.list;
  const loading = !error && state?.page !== page;
  const totalPages = Math.max(1, list?.pagination.totalPages ?? 1);

  return (
    <PageShell
      title="Riwayat prediksi"
      description="Semua analisis foto yang pernah Anda lakukan."
      actions={
        <Button variant="outline" size="sm" onClick={reload}>
          Muat ulang
        </Button>
      }
    >
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription className="flex flex-wrap items-center gap-3">
            {error}
            <Button variant="outline" size="sm" onClick={reload}>
              Coba lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!list && loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      )}

      {list && list.pagination.totalItems === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-muted-foreground">Belum ada prediksi.</p>
            <Link href="/predict" className={buttonVariants({ variant: "cta" })}>
              Analisis foto pertama Anda
            </Link>
          </CardContent>
        </Card>
      )}

      {list && list.data.length > 0 && (
        <ul
          className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${loading ? "opacity-50" : ""}`}
        >
          {list.data.map((p) => (
            <li key={p.id}>
              <Link
                href={`/history/${p.id}`}
                className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.imageUrl}
                  alt="Foto mata"
                  loading="lazy"
                  className="aspect-video w-full bg-muted object-cover"
                />
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <Badge
                    variant={p.label === "cataract" ? "destructive" : "default"}
                    className="w-fit"
                  >
                    {LABEL_TEXT[p.label]}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Keyakinan {(p.confidence * 100).toFixed(1)}%
                  </span>
                  <span className="text-sm text-muted-foreground">
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
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <Button
            variant="outline"
            onClick={() => goTo(page - 1)}
            disabled={page <= 1 || loading}
          >
            Sebelumnya
          </Button>
          <span className="text-muted-foreground">
            Halaman {page} dari {totalPages} ({list.pagination.totalItems} prediksi)
          </span>
          <Button
            variant="outline"
            onClick={() => goTo(page + 1)}
            disabled={page >= totalPages || loading}
          >
            Berikutnya
          </Button>
        </div>
      )}
    </PageShell>
  );
}