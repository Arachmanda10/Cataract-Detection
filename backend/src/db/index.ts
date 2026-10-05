import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL belum diatur di .env");
}

//pool = kumpulan koneksi yang dipakai secara bergantian 
export const pool = new Pool({
  connectionString,
  max: 5
});

//neon bisa memutus koneksi jika zero scaling, jadi kita perlu menangkap error nya
pool.on("error", (err) => {
  console.error("Koneksi idle terputus:", err.message);
});

export const db = drizzle(pool, { schema });
