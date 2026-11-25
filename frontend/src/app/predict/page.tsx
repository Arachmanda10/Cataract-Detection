"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FeedbackForm } from "@/components/feedback-form";
import { api, ApiError } from "@/lib/api";
import { shrinkImage } from "@/lib/image";
import type { Prediction } from "@/lib/types";
import { AppNav } from "@/components/app-nav";
import { PredictionResult } from "@/components/prediction-result";
import { useRequireLogin } from "@/lib/use-require-login";

const MAX_RAW_SIZE = 20 * 1024 * 1024; // 20 MB sebelum diperkecil

export default function PredictPage() {
  const router = useRouter();
  const { ready } = useRequireLogin();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Prediction | null>(null);

  

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

  if (!ready) {
    return <main className="p-6">Memuat...</main>;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 p-6">
      <AppNav />
      <h1 className="text-2xl font-semibold">Deteksi Katarak</h1>

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
          <PredictionResult prediction={result} />

          <FeedbackForm key={result.id} predictionId={result.id} />
        </>
      )}
    </main>
  );
}