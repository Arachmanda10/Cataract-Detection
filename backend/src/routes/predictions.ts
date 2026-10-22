import { randomUUID } from "node:crypto";
import { Router } from "express";
import multer from "multer";
import sharp from "sharp";
import { db } from "../db/index.js";
import { predictions } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";
import { deleteImage, getSignedImageUrl, uploadImage } from "../storage.js";
import { predict } from "../ml.js";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_FORMATS = ["jpeg", "png", "webp"];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
});

export const predictionsRouter = Router();
predictionsRouter.use(requireAuth);

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