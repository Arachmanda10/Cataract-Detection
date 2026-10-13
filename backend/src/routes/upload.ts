import { randomUUID } from "node:crypto";
import { Router } from "express";
import multer from "multer";
import sharp from "sharp";
import { requireAuth } from "../middleware/auth.js";
import {
  deleteImage,
  getSignedImageUrl,
  uploadImage,
} from "../storage.js";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_FORMATS = ["jpeg", "png", "webp"];

// File ditampung di memori (buffer), karena akan diproses lalu langsung dikirim ke B2
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
});

export const uploadsRouter = Router();

// Semua route di router ini wajib login (dijalankan SEBELUM multer membaca file)
uploadsRouter.use(requireAuth);

// Pemilik file ditentukan dari awalan key: users/<userId>/...
function ownsKey(userId: string, key: string) {
  return key.startsWith(`users/${userId}/`) && !key.includes("..");
}

// POST /api/uploads  (form-data, field "image")
uploadsRouter.post("/", upload.single("image"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: "File dengan field 'image' wajib diunggah" });
    return;
  }

  let processed: Buffer;
  try {
    // sharp membaca isi file sebenarnya, bukan sekadar nama atau tipe dari klien
    const meta = await sharp(req.file.buffer).metadata();
    if (!meta.format || !ALLOWED_FORMATS.includes(meta.format)) {
      res.status(415).json({ message: "Format harus JPEG, PNG, atau WebP" });
      return;
    }

    processed = await sharp(req.file.buffer)
      .rotate() // terapkan orientasi EXIF
      .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 }) // metadata (termasuk lokasi GPS) ikut terbuang
      .toBuffer();
  } catch {
    res.status(400).json({ message: "File bukan gambar yang valid" });
    return;
  }

  const userId = req.authSession!.user.id; // dijamin ada oleh requireAuth
  const key = `users/${userId}/${randomUUID()}.jpg`;

  await uploadImage(key, processed, "image/jpeg");
  const url = await getSignedImageUrl(key);

  res.status(201).json({ key, url, size: processed.length });
});

// GET /api/uploads/signed-url?key=...
uploadsRouter.get("/signed-url", async (req, res) => {
  const key = typeof req.query.key === "string" ? req.query.key : "";
  const userId = req.authSession!.user.id;

  if (!ownsKey(userId, key)) {
    res.status(403).json({ message: "Tidak berhak mengakses file ini" });
    return;
  }

  res.json({ url: await getSignedImageUrl(key) });
});

// DELETE /api/uploads?key=...
uploadsRouter.delete("/", async (req, res) => {
  const key = typeof req.query.key === "string" ? req.query.key : "";
  const userId = req.authSession!.user.id;

  if (!ownsKey(userId, key)) {
    res.status(403).json({ message: "Tidak berhak menghapus file ini" });
    return;
  }

  await deleteImage(key);
  res.status(204).send();
});