"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FeedbackForm } from "@/components/feedback-form";
import { PageShell } from "@/components/page-shell";
import { PredictionResult } from "@/components/prediction-result";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiError } from "@/lib/api";
import { shrinkImage } from "@/lib/image";
import type { Prediction } from "@/lib/types";
import { useRequireLogin } from "@/lib/use-require-login";

const MAX_RAW_SIZE = 20 * 1024 * 1024; // 20 MB sebelum diperkecil

const TIPS = [
  "Foto dari jarak dekat dengan mata terbuka lebar",
  "Cahaya terang dan merata, tanpa lampu kilat",
  "Fokus tajam dan tidak buram",
  "Lepas kacamata agar tidak menutupi mata",
];

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
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <PageShell
      title="Deteksi katarak"
      description="Unggah foto mata untuk mendapat perkiraan awal dari model."
    >
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-xl">Unggah foto</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="foto">Foto mata</Label>
                <Input
                  id="foto"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                />
                <p className="text-xs text-muted-foreground">
                  Format JPG, PNG, atau WebP. Foto otomatis diperkecil sebelum dikirim.
                </p>
              </div>

              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt="Pratinjau foto mata"
                  className="max-h-80 w-full rounded-lg border border-border bg-muted object-contain"
                />
              ) : (
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {TIPS.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              )}

              <Button type="submit" disabled={!file || loading} className="w-full">
                {loading ? "Menganalisis..." : "Analisis"}
              </Button>

              {loading && slow && (
                <Alert>
                  <AlertDescription>
                    Server sedang bangun atau sibuk, mohon tunggu sebentar...
                  </AlertDescription>
                </Alert>
              )}
              {error && (
                <Alert variant="destructive" role="alert">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {loading && <Skeleton className="h-48 w-full" />}

          {!loading && !result && (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Hasil analisis akan muncul di sini.
              </CardContent>
            </Card>
          )}

          {!loading && result && (
            <>
              <PredictionResult prediction={result} />
              <FeedbackForm key={result.id} predictionId={result.id} />
            </>
          )}
        </div>
      </div>
    </PageShell>
  );
}