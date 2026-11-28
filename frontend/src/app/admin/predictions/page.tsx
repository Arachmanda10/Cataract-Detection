"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { LABEL_TEXT } from "@/lib/labels";
import type { AdminPredictionList, AdminPredictionRow } from "@/lib/types";
import { useRequireAdmin } from "@/lib/use-require-admin";

const LIMIT = 20;

const selectClass =
  "h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring dark:[color-scheme:dark]";

function FeedbackBadge({ r }: { r: AdminPredictionRow }) {
  if (r.feedbackCorrect === null) return <Badge variant="outline">Belum dinilai</Badge>;
  return r.feedbackCorrect ? (
    <Badge variant="secondary">Dinilai benar</Badge>
  ) : (
    <Badge variant="destructive">Dinilai salah</Badge>
  );
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

  if (!ready) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const list = result?.list;
  const loading = !error && result?.key !== `${page}|${label}|${feedback}`;
  const totalPages = Math.max(1, list?.pagination.totalPages ?? 1);

  return (
    <PageShell
      title="Monitoring prediksi"
      description="Semua prediksi dari seluruh pengguna."
      actions={
        <Link href="/admin" className={buttonVariants({ variant: "outline", size: "sm" })}>
          ← Kembali ke admin
        </Link>
      }
    >
      <div className="flex flex-wrap gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="filter-hasil">Hasil</Label>
          <select
            id="filter-hasil"
            value={label}
            onChange={(e) => changeLabel(e.target.value)}
            className={selectClass}
          >
            <option value="">Semua</option>
            <option value="cataract">{LABEL_TEXT.cataract}</option>
            <option value="normal">{LABEL_TEXT.normal}</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filter-penilaian">Penilaian user</Label>
          <select
            id="filter-penilaian"
            value={feedback}
            onChange={(e) => changeFeedback(e.target.value)}
            className={selectClass}
          >
            <option value="">Semua</option>
            <option value="correct">Dinilai benar</option>
            <option value="incorrect">Dinilai salah</option>
            <option value="none">Belum dinilai</option>
          </select>
        </div>
      </div>

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

      {!list && loading && (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      )}

      {list && list.data.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Tidak ada prediksi yang cocok dengan filter.
          </CardContent>
        </Card>
      )}

      {list && list.data.length > 0 && (
        <ul className={`grid gap-4 lg:grid-cols-2 ${loading ? "opacity-50" : ""}`}>
          {list.data.map((r) => (
            <li key={r.id}>
              <Link
                href={`/admin/predictions/${r.id}`}
                className="flex h-full flex-col gap-2 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge variant={r.label === "cataract" ? "destructive" : "default"}>
                    {LABEL_TEXT[r.label]}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {(r.confidence * 100).toFixed(1)}% · {r.inferenceMs} ms
                  </span>
                </div>
                <span className="truncate text-sm">{r.userEmail}</span>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {new Date(r.createdAt).toLocaleString("id-ID", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                  <FeedbackBadge r={r} />
                </div>
                {r.feedbackComment && (
                  <span className="truncate text-xs text-muted-foreground">
                    Komentar: {r.feedbackComment}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {list && list.pagination.totalItems > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <Button variant="outline" onClick={() => setPage(page - 1)} disabled={page <= 1 || loading}>
            Sebelumnya
          </Button>
          <span className="text-muted-foreground">
            Halaman {page} dari {totalPages} ({list.pagination.totalItems} prediksi)
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages || loading}
          >
            Berikutnya
          </Button>
        </div>
      )}
    </PageShell>
  );
}