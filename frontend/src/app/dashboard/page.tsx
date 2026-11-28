"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { StatCard } from "@/components/stat-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api";
import { LABEL_TEXT } from "@/lib/labels";
import type { Dashboard } from "@/lib/types";
import { useRequireLogin } from "@/lib/use-require-login";

function pct(part: number, whole: number) {
  return whole > 0 ? (part / whole) * 100 : 0;
}

export default function DashboardPage() {
  const router = useRouter();
  const { ready } = useRequireLogin();

  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    api<Dashboard>("/api/dashboard")
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError(err instanceof Error ? err.message : "Gagal memuat dashboard");
      });

    return () => {
      cancelled = true;
    };
  }, [ready, reloadKey, router]);

  if (!ready) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const total = data?.predictions.total ?? 0;
  const maxDaily = Math.max(1, ...(data?.daily.map((d) => d.total) ?? [1]));

  return (
    <PageShell title="Dashboard" description="Ringkasan aktivitas deteksi Anda.">
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

      {!data && !error && (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      )}

      {data && total === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-muted-foreground">Belum ada data.</p>
            <Link href="/predict" className={buttonVariants({ variant: "cta" })}>
              Buat prediksi pertama Anda
            </Link>
          </CardContent>
        </Card>
      )}

      {data && total > 0 && (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard title="Total prediksi" value={String(total)} />
            <StatCard
              title="Rata-rata keyakinan"
              value={
                data.predictions.avgConfidence == null
                  ? "-"
                  : `${(data.predictions.avgConfidence * 100).toFixed(1)}%`
              }
            />
            <StatCard
              title="Dinilai benar"
              value={
                data.feedback.total > 0
                  ? `${Math.round(pct(data.feedback.correct, data.feedback.total))}%`
                  : "-"
              }
              note={
                data.feedback.total > 0
                  ? `${data.feedback.correct} benar, ${data.feedback.incorrect} salah`
                  : "Belum ada penilaian"
              }
            />
          </section>

          <div className="grid items-start gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <h2 className="text-lg">Hasil prediksi</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                {(["cataract", "normal"] as const).map((k) => (
                  <div key={k} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span>{LABEL_TEXT[k]}</span>
                      <span className="text-muted-foreground">
                        {data.predictions[k]} ({pct(data.predictions[k], total).toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${k === "cataract" ? "bg-destructive" : "bg-primary"}`}
                        style={{ width: `${pct(data.predictions[k], total)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h2 className="text-lg">7 hari terakhir</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  {data.daily.map((d) => (
                    <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-xs text-foreground">{d.total}</span>
                      <div className="flex h-28 w-full items-end border-b border-border">
                        <div
                          className="w-full rounded-t bg-primary"
                          style={{
                            height: `${(d.total / maxDaily) * 100}%`,
                            minHeight: d.total > 0 ? 4 : 0,
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {d.date.slice(8, 10)}/{d.date.slice(5, 7)}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Pergantian hari dihitung dalam UTC.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <h2 className="text-lg">Prediksi terbaru</h2>
              <Link
                href="/history"
                className="text-sm text-primary underline underline-offset-4"
              >
                Lihat semua
              </Link>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {data.recent.map((r) => (
                  <li key={r.id}>
                    <Link
                      href={`/history/${r.id}`}
                      className="flex flex-wrap justify-between gap-2 rounded-lg border border-border p-3 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <span className="font-medium">{LABEL_TEXT[r.label]}</span>
                      <span className="text-muted-foreground">
                        {(r.confidence * 100).toFixed(1)}% ·{" "}
                        {new Date(r.createdAt).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </PageShell>
  );
}