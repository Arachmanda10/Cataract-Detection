import * as ort from "onnxruntime-node";
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ../models berlaku untuk src/ (tsx) maupun dist/ (hasil build)
const MODEL_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../models/cataract_model.onnx"
);

// Urutan HARUS sama dengan saat training
const CLASS_NAMES = ["cataract", "normal"] as const;
const SIZE = 224;

let sessionPromise: Promise<ort.InferenceSession> | null = null;

// Model dimuat sekali, lalu dipakai ulang oleh semua request
export function loadModel(): Promise<ort.InferenceSession> {
  sessionPromise ??= ort.InferenceSession.create(MODEL_PATH);
  return sessionPromise;
}

// Gambar -> Float32Array [224*224*3], urutan RGB (NHWC), nilai [-1, 1]
async function preprocess(image: Buffer): Promise<Float32Array> {
  const { data } = await sharp(image)
    .rotate() // hormati orientasi EXIF
    .removeAlpha()
    .toColourspace("srgb")
    .resize(SIZE, SIZE, { fit: "fill", kernel: "linear" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = new Float32Array(SIZE * SIZE * 3);
  for (let i = 0; i < out.length; i++) {
    out[i] = data[i]! / 127.5 - 1.0; // sama dengan mobilenet_v2.preprocess_input
  }
  return out;
}

export type Prediction = {
  label: (typeof CLASS_NAMES)[number];
  confidence: number;
  probabilities: Record<string, number>;
  inferenceMs: number;
};

export async function predict(image: Buffer): Promise<Prediction> {
  const session = await loadModel();
  const input = await preprocess(image);

  const t0 = performance.now();
  const tensor = new ort.Tensor("float32", input, [1, SIZE, SIZE, 3]);
  const results = await session.run({ [session.inputNames[0]!]: tensor });
  const probs = Array.from(results[session.outputNames[0]!]!.data as Float32Array);
  const inferenceMs = Math.round((performance.now() - t0) * 100) / 100;

  const best = probs[0]! >= probs[1]! ? 0 : 1;
  return {
    label: CLASS_NAMES[best]!,
    confidence: probs[best]!,
    probabilities: Object.fromEntries(CLASS_NAMES.map((n, i) => [n, probs[i]!])),
    inferenceMs,
  };
}