import 'dotenv/config';
import express from 'express';
import { sql } from 'drizzle-orm';
import { fromNodeHeaders, toNodeHandler } from 'better-auth/node';
import { db } from './db/index.js';
import { auth } from './auth.js';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

//Handler better-auth untuk menangani request ke /auth
app.all('/api/auth/*splat', toNodeHandler(auth));

app.use(express.json());

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

// Cek session user
app.get("/api/me", async (req, res) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if(!session){
    res.status(401).json({ error: "Belum Login" });
    return;
  }

  res.json(session.user);
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});