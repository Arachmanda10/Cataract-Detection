"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FeedbackForm } from "@/components/feedback-form";
import { api, ApiError } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { shrinkImage } from "@/lib/image";
import type { Prediction } from "@/lib/types";

const LABEL_TEXT = { cataract: "Terindikasi katarak", normal: "Normal" } as const;
const MAX_RAW_SIZE = 20 * 1024 * 1024; // 20 MB sebelum diperkecil

export default function PredictPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Prediction | null>(null);

  // Belum login -> kembali ke halaman login
  useEffect(() => {
    if (!isPending && !session) router.replace("/login");
  }, [isPending, session, router]);

  function pickFile(f: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    setError(null);
    setResult(null);

    if (f && f.size > MAX_RAW_SIZE) {
      setFile(null);
      setPreview(null);
      setError("Ukuran berkas terlalu besar (maksimal 20 MB)");
      return;
    }
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setSlow(false);
    setError(null);
    setResult(null);
    // Jika lebih dari 8 detik, kemungkinan server sedang bangun
    const timer = setTimeout(() => setSlow(true), 8000);

    try {
      const small = await shrinkImage(file);
      const body = new FormData();
      body.append("image", small); // jangan set Content-Type; browser mengisinya sendiri
      setResult(await api<Prediction>("/api/predictions", { method: "POST", body }));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  }

  if (isPending || !session) {
    return <main className="p-6">Memuat...</main>;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Deteksi Katarak</h1>
        <Link href="/" className="text-sm underline">Beranda</Link>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          className="rounded border p-2"
        />
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Pratinjau foto mata" className="max-h-72 rounded border object-contain" />
        )}
        <button
          disabled={!file || loading}
          className="rounded bg-black p-2 text-white disabled:opacity-50"
        >
          {loading ? "Menganalisis..." : "Analisis"}
        </button>
        {loading && slow && (
          <p className="text-sm text-gray-600">
            Server sedang bangun atau sibuk, mohon tunggu sebentar...
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      {result && (
        <>
          <section className="flex flex-col gap-3 rounded border p-4">
            <h2 className="text-xl font-semibold">{LABEL_TEXT[result.label]}</h2>
            <p className="text-sm text-gray-600">
              Keyakinan model: {(result.confidence * 100).toFixed(1)}% · {result.inferenceMs} ms
            </p>
            {(["cataract", "normal"] as const).map((k) => (
              <div key={k}>
                <div className="flex justify-between text-sm">
                  <span>{LABEL_TEXT[k]}</span>
                  <span>{(result.probabilities[k] * 100).toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded bg-gray-200">
                  <div
                    className="h-2 rounded bg-black"
                    style={{ width: `${result.probabilities[k] * 100}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="text-xs text-gray-500">
              Hasil ini hanya untuk pembelajaran dan bukan diagnosis medis. Nilai keyakinan
              bukan probabilitas klinis. Untuk pemeriksaan sebenarnya, temui dokter mata.
            </p>
          </section>

          <FeedbackForm key={result.id} predictionId={result.id} />
        </>
      )}
    </main>
  );
}