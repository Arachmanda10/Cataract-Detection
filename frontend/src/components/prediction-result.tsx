import { LABEL_TEXT } from "@/lib/labels";
import type { Prediction } from "@/lib/types";

export function PredictionResult({ prediction }: { prediction: Prediction }) {
  return (
    <section className="flex flex-col gap-3 rounded border p-4">
      <h2 className="text-xl font-semibold">{LABEL_TEXT[prediction.label]}</h2>
      <p className="text-sm text-gray-600">
        Keyakinan model: {(prediction.confidence * 100).toFixed(1)}% · {prediction.inferenceMs} ms
      </p>
      {(["cataract", "normal"] as const).map((k) => (
        <div key={k}>
          <div className="flex justify-between text-sm">
            <span>{LABEL_TEXT[k]}</span>
            <span>{(prediction.probabilities[k] * 100).toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded bg-gray-200">
            <div
              className="h-2 rounded bg-black"
              style={{ width: `${prediction.probabilities[k] * 100}%` }}
            />
          </div>
        </div>
      ))}
      <p className="text-xs text-gray-500">
        Hasil ini hanya untuk pembelajaran dan bukan diagnosis medis. Nilai keyakinan bukan
        probabilitas klinis. Untuk pemeriksaan sebenarnya, temui dokter mata.
      </p>
    </section>
  );
}