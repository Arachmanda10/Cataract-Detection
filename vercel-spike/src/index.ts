import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();

const MODEL_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "models",
  "cataract_model.onnx",
);

const info = () => ({
  node: process.version,
  platform: process.platform,
  arch: process.arch,
  rssMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
});

app.get("/api/spike", (_req, res) => {
  res.json({ ok: true, ...info() });
});

// Uji 1: sharp
app.get("/api/spike/sharp", async (_req, res) => {
  try {
    const { default: sharp } = await import("sharp");
    const buf = await sharp({
      create: { width: 64, height: 64, channels: 3, background: "#808080" },
    })
      .resize(224, 224)
      .jpeg()
      .toBuffer();
    res.json({ ok: true, jpegBytes: buf.length, ...info() });
  } catch (e) {
    res.status(500).json({ ok: false, step: "sharp", error: String(e), ...info() });
  }
});

// Uji 2: onnxruntime-node (hanya memuat library)
app.get("/api/spike/ort", async (_req, res) => {
  try {
    const ort = await import("onnxruntime-node");
    res.json({ ok: true, loaded: Object.keys(ort).length > 0, ...info() });
  } catch (e) {
    res.status(500).json({ ok: false, step: "ort-import", error: String(e), ...info() });
  }
});

// Uji 3: model ikut terbawa, dimuat, dan dijalankan
app.get("/api/spike/model", async (_req, res) => {
  try {
    const ort = await import("onnxruntime-node");
    const t0 = Date.now();
    const session = await ort.InferenceSession.create(MODEL_PATH);
    const loadMs = Date.now() - t0;

    const data = new Float32Array(1 * 224 * 224 * 3).fill(0);
    const input = new ort.Tensor("float32", data, [1, 224, 224, 3]);
    const t1 = Date.now();
    const out = await session.run({ [session.inputNames[0]]: input });
    const inferMs = Date.now() - t1;

    const first = out[session.outputNames[0]];
    res.json({
      ok: true,
      inputNames: session.inputNames,
      outputNames: session.outputNames,
      output: Array.from(first.data as Float32Array),
      loadMs,
      inferMs,
      ...info(),
    });
  } catch (e) {
    res.status(500).json({ ok: false, step: "model", error: String(e), modelPath: MODEL_PATH, ...info() });
  }
});

if (!process.env.VERCEL) {
  app.listen(3002, () => console.log("spike di http://localhost:3002"));
}

export default app;