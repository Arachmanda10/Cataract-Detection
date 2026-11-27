import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LABEL_TEXT } from "@/lib/labels";
import type { Prediction } from "@/lib/types";

export function PredictionResult({ prediction }: { prediction: Prediction }) {
  const isCataract = prediction.label === "cataract";

  return (
    <Card>
      <CardHeader className="space-y-3">
        <Badge variant={isCataract ? "destructive" : "default"} className="w-fit">
          {isCataract ? "Perlu perhatian" : "Tidak terindikasi"}
        </Badge>
        <h2 className="text-2xl">{LABEL_TEXT[prediction.label]}</h2>
        <p className="text-sm text-muted-foreground">
          Keyakinan model: {(prediction.confidence * 100).toFixed(1)}% ·{" "}
          {prediction.inferenceMs} ms
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {(["cataract", "normal"] as const).map((k) => {
          const value = prediction.probabilities[k] * 100;
          const winner = k === prediction.label;
          return (
            <div key={k} className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className={winner ? "font-medium" : "text-muted-foreground"}>
                  {LABEL_TEXT[k]}
                </span>
                <span className={winner ? "font-medium" : "text-muted-foreground"}>
                  {value.toFixed(1)}%
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={LABEL_TEXT[k]}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(value)}
                className="h-2 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className={`h-full rounded-full ${winner ? "bg-primary" : "bg-muted-foreground/50"}`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          );
        })}
        <p className="border-t border-border pt-4 text-xs text-muted-foreground">
          Hasil ini hanya untuk pembelajaran dan bukan diagnosis medis. Nilai keyakinan bukan
          probabilitas klinis. Untuk pemeriksaan sebenarnya, temui dokter mata.
        </p>
      </CardContent>
    </Card>
  );
}