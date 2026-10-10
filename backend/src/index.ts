import 'dotenv/config';
import express from 'express';
import { sql } from 'drizzle-orm';
import { toNodeHandler } from 'better-auth/node';
import { db } from './db/index.js';
import { auth } from './auth.js';
import { requireAuth, requireAdmin } from './middleware/auth.js';

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

// Wajib Login
app.get("/api/me", requireAuth, (req, res) => {
  res.json(req.authSession?.user);
});

// Wajib Admin
app.get("/api/admin/ping", requireAuth, requireAdmin, (_req, res) =>{
  res.json({ message: "Halo Admin!"});
})

app.get("/reset-password", (req, res) => {
  res.json({ token: req.query.token, error:  req.query.error });
}); 

// SEMENTARA: halaman uji login Google, hapus saat frontend sudah ada
app.get("/test-login", (_req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="id">
<head><meta charset="utf-8"><title>Tes Login Google</title></head>
<body style="font-family: sans-serif; max-width: 640px; margin: 40px auto;">
  <h1>Tes Login Google</h1>
  <button id="login">Login dengan Google</button>
  <button id="logout">Logout</button>
  <h3>Hasil /api/me</h3>
  <pre id="out">memuat...</pre>
  <script>
    async function showMe() {
      const res = await fetch("/api/me");
      document.getElementById("out").textContent =
        res.status + " " + JSON.stringify(await res.json(), null, 2);
    }
    document.getElementById("login").onclick = async () => {
      const res = await fetch("/api/auth/sign-in/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "google", callbackURL: "/test-login" }),
      });
      const data = await res.json();
      if (!data.url) { alert(JSON.stringify(data)); return; }
      window.location.href = data.url;
    };
    document.getElementById("logout").onclick = async () => {
      await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      showMe();
    };
    showMe();
  </script>
</body>
</html>`);
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});