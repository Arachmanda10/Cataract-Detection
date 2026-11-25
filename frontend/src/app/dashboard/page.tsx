"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppNav } from "@/components/app-nav";
import { api, ApiError } from "@/lib/api";
import { LABEL_TEXT } from "@/lib/labels";
import type { Dashboard } from "@/lib/types";
import { useRequireLogin } from "@/lib/use-require-login";

function StatCard({ title, value, note }: { title: string; value: string; note?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded border p-4">
      <span className="text-sm text-gray-600">{title}</span>
      <span className="text-2xl font-semibold">{value}</span>
      {note && <span className="text-xs text-gray-500">{note}</span>}
    </div>
  );
}

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

  if (!ready) return <main className="p-6">Memuat...</main>;

  const total = data?.predictions.total ?? 0;
  const maxDaily = Math.max(1, ...(data?.daily.map((d) => d.total) ?? [1]));

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 p-6">
      <AppNav />
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      {error && (
        <p className="text-sm text-red-600">
          {error}{" "}
          <button onClick={() => setReloadKey((k) => k + 1)} className="underline">
            Coba lagi
          </button>
        </p>
      )}

      {!data && !error && <p className="text-sm text-gray-600">Memuat dashboard...</p>}

      {data && total === 0 && (
        <p className="text-sm text-gray-600">
          Belum ada data.{" "}
          <Link href="/predict" className="underline">
            Buat prediksi pertama Anda
          </Link>
          .
        </p>
      )}

      {data && total > 0 && (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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

          <section className="flex flex-col gap-3 rounded border p-4">
            <h2 className="font-medium">Hasil prediksi</h2>
            {(["cataract", "normal"] as const).map((k) => (
              <div key={k}>
                <div className="flex justify-between text-sm">
                  <span>{LABEL_TEXT[k]}</span>
                  <span>
                    {data.predictions[k]} ({pct(data.predictions[k], total).toFixed(0)}%)
                  </span>
                </div>
                <div className="h-2 rounded bg-gray-200">
                  <div
                    className="h-2 rounded bg-black"
                    style={{ width: `${pct(data.predictions[k], total)}%` }}
                  />
                </div>
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-3 rounded border p-4">
            <h2 className="font-medium">7 hari terakhir</h2>
            <div className="flex gap-2">
              {data.daily.map((d) => (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs">{d.total}</span>
                  <div className="flex h-28 w-full items-end border-b">
                    <div
                      className="w-full rounded-t bg-black"
                      style={{
                        height: `${(d.total / maxDaily) * 100}%`,
                        minHeight: d.total > 0 ? 4 : 0,
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-600">
                    {d.date.slice(8, 10)}/{d.date.slice(5, 7)}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500">Pergantian hari dihitung dalam UTC.</p>
          </section>

          <section className="flex flex-col gap-3 rounded border p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Prediksi terbaru</h2>
              <Link href="/history" className="text-sm underline">
                Lihat semua
              </Link>
            </div>
            <ul className="flex flex-col gap-2">
              {data.recent.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/history/${r.id}`}
                    className="flex justify-between rounded border p-3 text-sm hover:bg-gray-50"
                  >
                    <span className="font-medium">{LABEL_TEXT[r.label]}</span>
                    <span className="text-gray-600">
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
          </section>
        </>
      )}
    </main>
  );
}