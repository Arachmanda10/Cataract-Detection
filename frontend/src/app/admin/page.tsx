"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { StatCard } from "@/components/stat-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { formatUptime } from "@/lib/format";
import { LABEL_TEXT } from "@/lib/labels";
import type { AdminStats, AdminSystem } from "@/lib/types";
import { useRequireAdmin } from "@/lib/use-require-admin";

export default function AdminPage() {
  const { ready } = useRequireAdmin();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [system, setSystem] = useState<AdminSystem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    Promise.all([
      api<AdminStats>("/api/admin/stats"),
      api<AdminSystem>("/api/admin/system"),
    ])
      .then(([s, sys]) => {
        if (cancelled) return;
        setStats(s);
        setSystem(sys);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Gagal memuat data admin");
      });

    return () => {
      cancelled = true;
    };
  }, [ready, reloadKey]);

  if (!ready) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <PageShell
      title="Admin"
      description="Ringkasan pengguna, prediksi, dan kondisi server."
      actions={
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/users" className={buttonVariants({ variant: "outline", size: "sm" })}>
            Kelola user
          </Link>
          <Link
            href="/admin/predictions"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Monitoring prediksi
          </Link>
          <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
            Muat ulang
          </Button>
        </div>
      }
    >
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!stats && !error && (
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      )}

      {stats && (
        <>
          <section className="space-y-3">
            <h2 className="text-xl">Pengguna</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatCard title="Total user" value={String(stats.users.total)} />
              <StatCard title="Admin" value={String(stats.users.admins)} />
              <StatCard title="Diblokir" value={String(stats.users.banned)} />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl">Prediksi</h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard title="Total" value={String(stats.predictions.total)} />
              <StatCard title="24 jam terakhir" value={String(stats.predictions.last24h)} />
              <StatCard
                title="Rata-rata keyakinan"
                value={
                  stats.predictions.avgConfidence == null
                    ? "-"
                    : `${(stats.predictions.avgConfidence * 100).toFixed(1)}%`
                }
              />
              <StatCard
                title="Rata-rata inferensi"
                value={
                  stats.predictions.avgInferenceMs == null
                    ? "-"
                    : `${stats.predictions.avgInferenceMs.toFixed(1)} ms`
                }
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {LABEL_TEXT.cataract}: {stats.predictions.cataract} · {LABEL_TEXT.normal}:{" "}
              {stats.predictions.normal}
            </p>
          </section>

          <Card>
            <CardHeader className="space-y-1">
              <h2 className="text-lg">Penilaian user terhadap hasil model</h2>
              <p className="text-xs text-muted-foreground">
                Ini penilaian dari user, bukan akurasi sebenarnya, karena tidak ada label asli
                dari dokter.
              </p>
            </CardHeader>
            <CardContent>
              {stats.feedback.total === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada penilaian.</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm">
                    Dinilai benar: {stats.feedback.correct} dari {stats.feedback.total} (
                    {Math.round((stats.feedback.correctRate ?? 0) * 100)}%)
                  </p>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {stats.feedback.byPredictedLabel.map((r) => (
                      <li key={r.label}>
                        Prediksi {LABEL_TEXT[r.label]}: {r.correct} dari {r.total} dinilai benar
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {system && (
        <section className="space-y-3">
          <h2 className="text-xl">Server</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard
              title="Database"
              value={system.database.status === "ok" ? "OK" : "Galat"}
              note={`ping ${system.database.pingMs} ms`}
            />
            <StatCard title="Memori (RSS)" value={`${system.memoryMb.rss} MB`} />
            <StatCard title="Node.js" value={system.nodeVersion} />
            <StatCard title="Uptime instance" value={formatUptime(system.uptimeSeconds)} />
          </div>
          <p className="text-xs text-muted-foreground">
            Backend berjalan serverless. Angka server ini milik satu instance yang kebetulan
            melayani permintaan ini, jadi uptime dan memori bisa berbeda tiap kali dimuat.
          </p>
        </section>
      )}
    </PageShell>
  );
}