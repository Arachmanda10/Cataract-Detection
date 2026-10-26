import { randomUUID } from "node:crypto";
import {and, count, desc, eq} from "drizzle-orm"
import { Router } from "express";
import multer from "multer";
import sharp from "sharp";
import { db } from "../db/index.js";
import { predictions, feedbacks } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { deleteImage, getSignedImageUrl, uploadImage } from "../storage.js";
import { predict } from "../ml.js";
import { boolean, uuid } from "better-auth";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_FORMATS = ["jpeg", "png", "webp"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
});

export const predictionsRouter = Router();
predictionsRouter.use(requireAuth);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

//ubah satu baris database menjadi bentuk respon api(tambah url gambar)
async function toResponse(row: typeof predictions.$inferInsert){
  return {
    id: row.id,
    label: row.label,
    confidence: row.confidence,
    probabilities: row.probabilities,
    inferenceMs: row.inferenceMs,
    createdAt: row.createdAt,
    imageUrl: await getSignedImageUrl(row.imageKey),
  };
}

// POST /api/predictions  (form-data, field "image")
predictionsRouter.post("/", upload.single("image"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: "File dengan field 'image' wajib diunggah" });
    return;
  }

  // 1. Validasi isi file + buat versi untuk disimpan di B2
  let stored: Buffer;
  try {
    const meta = await sharp(req.file.buffer).metadata();
    if (!meta.format || !ALLOWED_FORMATS.includes(meta.format)) {
      res.status(415).json({ message: "Format harus JPEG, PNG, atau WebP" });
      return;
    }
    stored = await sharp(req.file.buffer)
      .rotate()
      .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch {
    res.status(400).json({ message: "File bukan gambar yang valid" });
    return;
  }

  // 2. Inferensi memakai file ASLI (sama seperti saat model dites), bukan versi kompres
  const result = await predict(req.file.buffer);

  // 3. Simpan gambar ke B2
  const userId = req.authSession!.user.id;
  const imageKey = `users/${userId}/${randomUUID()}.jpg`;
  await uploadImage(imageKey, stored, "image/jpeg");

  // 4. Simpan hasil ke database; jika gagal, hapus gambar agar tidak jadi file yatim
  let row;
  try {
    [row] = await db
      .insert(predictions)
      .values({
        userId,
        imageKey,
        label: result.label,
        confidence: result.confidence,
        probabilities: result.probabilities,
        inferenceMs: result.inferenceMs,
      })
      .returning();
  } catch (error) {
    await deleteImage(imageKey).catch(() => {});
    throw error;
  }

  res.status(201).json({
    id: row!.id,
    label: row!.label,
    confidence: row!.confidence,
    probabilities: row!.probabilities,
    inferenceMs: row!.inferenceMs,
    createdAt: row!.createdAt,
    imageUrl: await getSignedImageUrl(imageKey),
  });
});

// GET /api/predictions?page=1&limit=10
predictionsRouter.get("/", async (req, res) => {
  const userId = req.authSession!.user.id;

  // Batasi nilai agar tidak ada limit=100000 atau page negatif
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(String(req.query.limit ?? "10"), 10) || 10));

  const [rows, [total]] = await Promise.all([
    db
      .select()
      .from(predictions)
      .where(eq(predictions.userId, userId))
      .orderBy(desc(predictions.createdAt))
      .limit(limit)
      .offset((page - 1) * limit),
    db.select({ value: count() }).from(predictions).where(eq(predictions.userId, userId)),
  ]);

  const totalItems = total?.value ?? 0;
  res.json({
    data: await Promise.all(rows.map(toResponse)),
    pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
  });
});

// GET /api/predictions/:id
predictionsRouter.get("/:id", async (req, res) => {
  const id = String(req.params.id);
  if (!UUID_RE.test(id)) {
    res.status(404).json({ message: "Prediksi tidak ditemukan" });
    return;
  }

  const [row] = await db
    .select()
    .from(predictions)
    .where(and(eq(predictions.id, id), eq(predictions.userId, req.authSession!.user.id)));

  if (!row) {
    // 404 (bukan 403) agar orang tidak bisa mengetahui id milik user lain
    res.status(404).json({ message: "Prediksi tidak ditemukan" });
    return;
  }

    const [fb] = await db
    .select({ isCorrect: feedbacks.isCorrect, comment: feedbacks.comment, updatedAt: feedbacks.updateAt })
    .from(feedbacks)
    .where(eq(feedbacks.predictionId, row.id));

  res.json({ ...(await toResponse(row)), feedback: fb ?? null });
});

// DELETE /api/predictions/:id
predictionsRouter.delete("/:id", async (req, res) => {
  const id = String(req.params.id);
  if (!UUID_RE.test(id)) {
    res.status(404).json({ message: "Prediksi tidak ditemukan" });
    return;
  }

  const [row] = await db
    .delete(predictions)
    .where(and(eq(predictions.id, id), eq(predictions.userId, req.authSession!.user.id)))
    .returning();

  if (!row) {
    res.status(404).json({ message: "Prediksi tidak ditemukan" });
    return;
  }

  // Baris database sudah terhapus; hapus gambarnya (kegagalan di sini tidak menggagalkan respons)
  await deleteImage(row.imageKey).catch((err) => console.error("Gagal hapus gambar:", err));
  res.status(204).send();
});

// PUT /api/predictions/:id/feedback   body: { "isCorrect": true, "comment": "opsional" }
predictionsRouter.put("/:id/feedback", async (req, res) => {
  const id = String(req.params.id);
  const userId = req.authSession!.user.id;

  const { isCorrect, comment } = (req.body ?? {}) as {
    isCorrect?: unknown;
    comment?: unknown;
  };

  if (typeof isCorrect !== "boolean") {
    res.status(400).json({ message: "isCorrect wajib berupa true atau false" });
    return;
  }
  if (comment !== undefined && comment !== null && (typeof comment !== "string" || comment.length > 500)) {
    res.status(400).json({ message: "comment harus teks, maksimal 500 karakter" });
    return;
  }

  if (!UUID_RE.test(id)) {
    res.status(404).json({ message: "Prediksi tidak ditemukan" });
    return;
  }

  // Pastikan prediksi ini milik user yang sedang login
  const [pred] = await db
    .select({ id: predictions.id })
    .from(predictions)
    .where(and(eq(predictions.id, id), eq(predictions.userId, userId)));

  if (!pred) {
    res.status(404).json({ message: "Prediksi tidak ditemukan" });
    return;
  }

  const cleanComment = typeof comment === "string" && comment.trim() ? comment.trim() : null;

  // Upsert: buat baru, atau timpa jika prediksi ini sudah pernah diberi feedback
  const [row] = await db
    .insert(feedbacks)
    .values({ predictionId: id, userId, isCorrect, comment: cleanComment })
    .onConflictDoUpdate({
      target: feedbacks.predictionId,
      set: { isCorrect, comment: cleanComment, updateAt: new Date() },
    })
    .returning();

  res.json({
    predictionId: row!.predictionId,
    isCorrect: row!.isCorrect,
    comment: row!.comment,
    updatedAt: row!.updateAt,
  });
});

// DELETE /api/predictions/:id/feedback
predictionsRouter.delete("/:id/feedback", async (req, res) => {
  const id = String(req.params.id);
  if (!UUID_RE.test(id)) {
    res.status(404).json({ message: "Feedback tidak ditemukan" });
    return;
  }

  const [row] = await db
    .delete(feedbacks)
    .where(and(eq(feedbacks.predictionId, id), eq(feedbacks.userId, req.authSession!.user.id)))
    .returning({ id: feedbacks.id });

  if (!row) {
    res.status(404).json({ message: "Feedback tidak ditemukan" });
    return;
  }
  res.status(204).send();
});