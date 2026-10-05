import 'dotenv/config';
import express from 'express';
import { db } from './db/index.js';
import { sql } from 'drizzle-orm';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/health/db', async (_req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', database: 'unreachable' });
  }
});

app.listen(PORT, () => {
  console.log(`Server berjalan di port ${PORT}`);
});