"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export function FeedbackForm({ predictionId }: { predictionId: string }) {
  const [comment, setComment] = useState("");
  const [saved, setSaved] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(isCorrect: boolean) {
    setSaving(true);
    setError(null);
    try {
      await api(`/api/predictions/${predictionId}/feedback`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCorrect, comment: comment.trim() || null }),
      });
      setSaved(isCorrect);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan feedback");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded border p-4">
      <h2 className="font-medium">Apakah hasil ini sesuai menurut Anda?</h2>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={500}
        placeholder="Komentar (opsional)"
        className="rounded border p-2 text-sm"
        rows={2}
      />
      <div className="flex gap-2">
        <button
          onClick={() => send(true)}
          disabled={saving}
          className="rounded border px-3 py-2 disabled:opacity-50"
        >
          Sudah benar
        </button>
        <button
          onClick={() => send(false)}
          disabled={saving}
          className="rounded border px-3 py-2 disabled:opacity-50"
        >
          Salah
        </button>
      </div>
      {saved !== null && (
        <p className="text-sm text-green-700">
          Terima kasih! Tersimpan: hasil dinilai {saved ? "benar" : "salah"}. Anda masih bisa mengubahnya.
        </p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}