import { count, desc, eq, gte, sql } from "drizzle-orm";
import { Router } from "express";
import { db } from "../db/index.js";
import { feedbacks, predictions } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

const DAYS = 7;

// GET /api/dashboard
dashboardRouter.get("/", async (req, res) => {
  const userId = req.authSession!.user.id;

  // Awal hari (UTC) 6 hari lalu -> total 7 hari termasuk hari ini
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (DAYS - 1));

  const day = sql<string>`to_char(${predictions.createdAt}, 'YYYY-MM-DD')`;

  const [[summary], [fb], dailyRows, recent] = await Promise.all([
    // 1. Ringkasan prediksi
    db
      .select({
        total: count(),
        cataract: sql<number>`count(*) filter (where ${predictions.label} = 'cataract')`.mapWith(Number),
        normal: sql<number>`count(*) filter (where ${predictions.label} = 'normal')`.mapWith(Number),
        avgConfidence: sql<number | null>`avg(${predictions.confidence})`.mapWith(Number),
      })
      .from(predictions)
      .where(eq(predictions.userId, userId)),

    // 2. Ringkasan feedback
    db
      .select({
        total: count(),
        correct: sql<number>`count(*) filter (where ${feedbacks.isCorrect})`.mapWith(Number),
      })
      .from(feedbacks)
      .where(eq(feedbacks.userId, userId)),

    // 3. Jumlah prediksi per hari (7 hari terakhir)
    db
      .select({ day, total: count() })
      .from(predictions)
      .where(sql`${predictions.userId} = ${userId} and ${gte(predictions.createdAt, since)}`)
      .groupBy(day),

    // 4. Lima prediksi terbaru (tanpa URL gambar agar ringan)
    db
      .select({
        id: predictions.id,
        label: predictions.label,
        confidence: predictions.confidence,
        createdAt: predictions.createdAt,
      })
      .from(predictions)
      .where(eq(predictions.userId, userId))
      .orderBy(desc(predictions.createdAt))
      .limit(5),
  ]);

  // Isi hari yang kosong dengan 0 supaya grafik di frontend nanti tidak bolong
  const byDay = new Map(dailyRows.map((r) => [r.day, r.total]));
  const daily = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(since);
    d.setUTCDate(since.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    return { date: key, total: byDay.get(key) ?? 0 };
  });

  const total = summary?.total ?? 0;
  const feedbackTotal = fb?.total ?? 0;
  const feedbackCorrect = fb?.correct ?? 0;

  res.json({
    predictions: {
      total,
      cataract: summary?.cataract ?? 0,
      normal: summary?.normal ?? 0,
      avgConfidence: total > 0 ? (summary?.avgConfidence ?? 0) : null,
    },
    feedback: {
      total: feedbackTotal,
      correct: feedbackCorrect,
      incorrect: feedbackTotal - feedbackCorrect,
      // null jika belum ada feedback, supaya tidak menampilkan "0%" yang menyesatkan
      correctRate: feedbackTotal > 0 ? feedbackCorrect / feedbackTotal : null,
    },
    daily,
    recent,
  });
});