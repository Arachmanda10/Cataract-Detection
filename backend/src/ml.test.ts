import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { predict } from "./ml.js";

// Gambar sintetis berwarna rata; cukup untuk menguji alur preprocessing dan model
function solid(r: number, g: number, b: number, alpha?: number) {
  const hasAlpha = alpha !== undefined;
  return sharp({
    create: {
      width: 300,
      height: 200,
      channels: hasAlpha ? 4 : 3,
      background: hasAlpha ? { r, g, b, alpha } : { r, g, b },
    },
  });
}

describe("predict (model ONNX)", () => {
  it("mengembalikan label valid dan probabilitas yang berjumlah 1", async () => {
    const out = await predict(await solid(120, 80, 60).png().toBuffer());

    expect(["cataract", "normal"]).toContain(out.label);
    const sum = out.probabilities["cataract"]! + out.probabilities["normal"]!;
    expect(sum).toBeCloseTo(1, 4);
    expect(out.confidence).toBeGreaterThanOrEqual(0.5); // label terpilih = probabilitas terbesar
    expect(out.confidence).toBeLessThanOrEqual(1);
    expect(out.inferenceMs).toBeGreaterThan(0);
  });

  it("hasilnya deterministik untuk gambar yang sama", async () => {
    const img = await solid(200, 200, 200).jpeg().toBuffer();
    const a = await predict(img);
    const b = await predict(img);
    expect(b.label).toBe(a.label);
    expect(b.confidence).toBeCloseTo(a.confidence, 6);
  });

  it("menerima PNG transparan (RGBA) dan JPEG", async () => {
    const rgba = await predict(await solid(10, 20, 30, 0.5).png().toBuffer());
    const jpeg = await predict(await solid(10, 20, 30).jpeg().toBuffer());
    expect(["cataract", "normal"]).toContain(rgba.label);
    expect(["cataract", "normal"]).toContain(jpeg.label);
  });

  it("menolak data yang bukan gambar", async () => {
    await expect(predict(Buffer.from("ini bukan gambar"))).rejects.toThrow();
  });
});