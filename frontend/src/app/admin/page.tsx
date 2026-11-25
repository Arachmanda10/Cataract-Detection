"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppNav } from "@/components/app-nav";
import { StatCard } from "@/components/stat-card";
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

  if (!ready) return <main className="p-6">Memuat...</main>;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <AppNav />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <button onClick={() => setReloadKey((k) => k + 1)} className="text-sm underline">
          Muat ulang
        </button>
      </div>

      <div className="flex gap-4 text-sm">
        <Link href="/admin/users" className="underline">
          Kelola user
        </Link>
        <Link href="/admin/predictions" className="underline">
          Monitoring prediksi
        </Link>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {!stats && !error && <p className="text-sm text-gray-600">Memuat data...</p>}

      {stats && (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="font-medium">Pengguna</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard title="Total user" value={String(stats.users.total)} />
              <StatCard title="Admin" value={String(stats.users.admins)} />
              <StatCard title="Diblokir" value={String(stats.users.banned)} />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-medium">Prediksi</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
            <p className="text-sm text-gray-600">
              {LABEL_TEXT.cataract}: {stats.predictions.cataract} · {LABEL_TEXT.normal}:{" "}
              {stats.predictions.normal}
            </p>
          </section>

          <section className="flex flex-col gap-3 rounded border p-4">
            <h2 className="font-medium">Penilaian user terhadap hasil model</h2>
            <p className="text-xs text-gray-500">
              Ini penilaian dari user, bukan akurasi sebenarnya, karena tidak ada label asli
              dari dokter.
            </p>
            {stats.feedback.total === 0 ? (
              <p className="text-sm text-gray-600">Belum ada penilaian.</p>
            ) : (
              <>
                <p className="text-sm">
                  Dinilai benar: {stats.feedback.correct} dari {stats.feedback.total} (
                  {Math.round((stats.feedback.correctRate ?? 0) * 100)}%)
                </p>
                <ul className="flex flex-col gap-1 text-sm text-gray-700">
                  {stats.feedback.byPredictedLabel.map((r) => (
                    <li key={r.label}>
                      Prediksi {LABEL_TEXT[r.label]}: {r.correct} dari {r.total} dinilai benar
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </>
      )}

      {system && (
        <section className="flex flex-col gap-3">
          <h2 className="font-medium">Server</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              title="Database"
              value={system.database.status === "ok" ? "OK" : "Galat"}
              note={`ping ${system.database.pingMs} ms`}
            />
            <StatCard title="Memori (RSS)" value={`${system.memoryMb.rss} MB`} />
            <StatCard title="Node.js" value={system.nodeVersion} />
            <StatCard title="Uptime instance" value={formatUptime(system.uptimeSeconds)} />
          </div>
          <p className="text-xs text-gray-500">
            Backend berjalan serverless. Angka server ini milik satu instance yang kebetulan
            melayani permintaan ini, jadi uptime dan memori bisa berbeda tiap kali dimuat.
          </p>
        </section>
      )}
    </main>
  );
}