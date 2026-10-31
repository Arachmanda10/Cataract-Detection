import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db/index.js";
import { user } from "../db/auth-schema.js";
import { feedbacks, predictions } from "../db/schema.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { getSignedImageUrl } from "../storage.js";

export const adminRouter = Router();
adminRouter.use(requireAuth, requireAdmin); // semua route di bawah ini khusus admin

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// GET /api/admin/stats  -> statistik seluruh sistem
adminRouter.get("/stats", async (_req, res) => {
  const [[u], [p], [f], byLabel] = await Promise.all([
    db
      .select({
        total: count(),
        admins: sql<number>`count(*) filter (where ${user.role} = 'admin')`.mapWith(Number),
        banned: sql<number>`count(*) filter (where ${user.banned})`.mapWith(Number),
      })
      .from(user),

    db
      .select({
        total: count(),
        cataract: sql<number>`count(*) filter (where ${predictions.label} = 'cataract')`.mapWith(Number),
        normal: sql<number>`count(*) filter (where ${predictions.label} = 'normal')`.mapWith(Number),
        avgConfidence: sql<number | null>`avg(${predictions.confidence})`.mapWith(Number),
        avgInferenceMs: sql<number | null>`avg(${predictions.inferenceMs})`.mapWith(Number),
        last24h: sql<number>`count(*) filter (where ${predictions.createdAt} > now() - interval '24 hours')`.mapWith(Number),
      })
      .from(predictions),

    db
      .select({
        total: count(),
        correct: sql<number>`count(*) filter (where ${feedbacks.isCorrect})`.mapWith(Number),
      })
      .from(feedbacks),

    // Feedback dipecah per label hasil prediksi model
    db
      .select({
        label: predictions.label,
        total: count(),
        correct: sql<number>`count(*) filter (where ${feedbacks.isCorrect})`.mapWith(Number),
      })
      .from(feedbacks)
      .innerJoin(predictions, eq(feedbacks.predictionId, predictions.id))
      .groupBy(predictions.label),
  ]);

  const fbTotal = f?.total ?? 0;
  const predTotal = p?.total ?? 0;

  res.json({
    users: { total: u?.total ?? 0, admins: u?.admins ?? 0, banned: u?.banned ?? 0 },
    predictions: {
      total: predTotal,
      cataract: p?.cataract ?? 0,
      normal: p?.normal ?? 0,
      last24h: p?.last24h ?? 0,
      avgConfidence: predTotal > 0 ? (p?.avgConfidence ?? null) : null,
      avgInferenceMs: predTotal > 0 ? (p?.avgInferenceMs ?? null) : null,
    },
    // PENTING: ini penilaian dari user, BUKAN akurasi sebenarnya (tidak ada label asli)
    feedback: {
      total: fbTotal,
      correct: f?.correct ?? 0,
      correctRate: fbTotal > 0 ? (f?.correct ?? 0) / fbTotal : null,
      byPredictedLabel: byLabel.map((r) => ({
        label: r.label,
        total: r.total,
        correct: r.correct,
        correctRate: r.total > 0 ? r.correct / r.total : null,
      })),
    },
  });
});

// GET /api/admin/predictions?page=1&limit=20&label=cataract&feedback=incorrect
adminRouter.get("/predictions", async (req, res) => {
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(String(req.query.limit ?? "20"), 10) || 20));

  const label = req.query.label === "cataract" || req.query.label === "normal" ? req.query.label : undefined;
  const fb = req.query.feedback;

  // and(...) mengabaikan nilai undefined, jadi filter yang tidak dipakai otomatis hilang
  const where = and(
    label ? eq(predictions.label, label) : undefined,
    fb === "correct" ? eq(feedbacks.isCorrect, true) : undefined,
    fb === "incorrect" ? eq(feedbacks.isCorrect, false) : undefined,
    fb === "none" ? isNull(feedbacks.id) : undefined,
  );

  const [rows, [total]] = await Promise.all([
    db
      .select({
        id: predictions.id,
        label: predictions.label,
        confidence: predictions.confidence,
        inferenceMs: predictions.inferenceMs,
        createdAt: predictions.createdAt,
        userId: user.id,
        userEmail: user.email,
        feedbackCorrect: feedbacks.isCorrect, // null jika belum ada feedback
        feedbackComment: feedbacks.comment,
      })
      .from(predictions)
      .innerJoin(user, eq(predictions.userId, user.id))
      .leftJoin(feedbacks, eq(feedbacks.predictionId, predictions.id))
      .where(where)
      .orderBy(desc(predictions.createdAt))
      .limit(limit)
      .offset((page - 1) * limit),

    db
      .select({ value: count() })
      .from(predictions)
      .leftJoin(feedbacks, eq(feedbacks.predictionId, predictions.id))
      .where(where),
  ]);

  const totalItems = total?.value ?? 0;
  res.json({
    data: rows,
    pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) },
  });
});

// GET /api/admin/predictions/:id  -> detail + URL gambar (hanya di sini gambar ditampilkan)
adminRouter.get("/predictions/:id", async (req, res) => {
  const id = String(req.params.id);
  if (!UUID_RE.test(id)) {
    res.status(404).json({ message: "Prediksi tidak ditemukan" });
    return;
  }

  const [row] = await db
    .select({ prediction: predictions, userEmail: user.email, feedback: feedbacks })
    .from(predictions)
    .innerJoin(user, eq(predictions.userId, user.id))
    .leftJoin(feedbacks, eq(feedbacks.predictionId, predictions.id))
    .where(eq(predictions.id, id));

  if (!row) {
    res.status(404).json({ message: "Prediksi tidak ditemukan" });
    return;
  }

  const { imageKey, ...prediction } = row.prediction;
  res.json({
    ...prediction,
    userEmail: row.userEmail,
    feedback: row.feedback ? { isCorrect: row.feedback.isCorrect, comment: row.feedback.comment } : null,
    imageUrl: await getSignedImageUrl(imageKey),
  });
});

// GET /api/admin/system  -> kesehatan server (berguna untuk memantau batas 512 MB di Render)
adminRouter.get("/system", async (_req, res) => {
  const t0 = performance.now();
  let database: "ok" | "error" = "ok";
  try {
    await db.execute(sql`select 1`);
  } catch {
    database = "error";
  }
  const dbPingMs = Math.round((performance.now() - t0) * 100) / 100;

  const mem = process.memoryUsage();
  const mb = (n: number) => Math.round((n / 1024 / 1024) * 10) / 10;

  res.json({
    uptimeSeconds: Math.round(process.uptime()),
    nodeVersion: process.version,
    memoryMb: { rss: mb(mem.rss), heapUsed: mb(mem.heapUsed), external: mb(mem.external) },
    database: { status: database, pingMs: dbPingMs },
  });
});