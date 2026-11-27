"use client";

import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";

type Initial = { isCorrect: boolean; comment: string | null } | null;

export function FeedbackForm({
  predictionId,
  initial = null,
}: {
  predictionId: string;
  initial?: Initial;
}) {
  const [comment, setComment] = useState(initial?.comment ?? "");
  const [saved, setSaved] = useState<boolean | null>(initial?.isCorrect ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setSaving(true);
    setError(null);
    try {
      await api(`/api/predictions/${predictionId}/feedback`, { method: "DELETE" });
      setSaved(null);
      setComment("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus penilaian");
    } finally {
      setSaving(false);
    }
  }

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

  const commentId = `feedback-comment-${predictionId}`;

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg">Apakah hasil ini sesuai menurut Anda?</h2>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={commentId}>Komentar (opsional)</Label>
          <Textarea
            id={commentId}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
            rows={2}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={saved === true ? "default" : "outline"}
            onClick={() => send(true)}
            disabled={saving}
          >
            Sudah benar
          </Button>
          <Button
            type="button"
            variant={saved === false ? "default" : "outline"}
            onClick={() => send(false)}
            disabled={saving}
          >
            Salah
          </Button>
        </div>
        {saved !== null && (
          <div className="space-y-1">
            <p role="status" className="text-sm text-primary">
              Tersimpan: hasil dinilai {saved ? "benar" : "salah"}. Anda masih bisa mengubahnya.
            </p>
            <Button
              type="button"
              variant="link"
              onClick={remove}
              disabled={saving}
              className="h-auto p-0 text-muted-foreground"
            >
              Hapus penilaian
            </Button>
          </div>
        )}
        {error && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}