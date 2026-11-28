# Drishti: Deteksi Dini Katarak

Aplikasi web full stack untuk skrining awal katarak dari foto mata, memakai model MobileNetV2 yang dijalankan langsung di dalam API Express.

> **English:** Full-stack web app that screens eye photos for cataract with a MobileNetV2 model served via ONNX Runtime inside an Express API. Next.js, Express 5, PostgreSQL, Backblaze B2, deployed on Vercel.

> ⚠️ **Bukan alat medis.** Proyek ini untuk pembelajaran dan portofolio. Hasilnya tidak menggantikan pemeriksaan dokter mata.

**Demo:** https://cataract-detection-pied.vercel.app/ · **API docs (Swagger):** https://cataract-detection-pavg.vercel.app/docs

![Landing page](docs/screenshots/landing-page.png)

## Fitur

- Daftar dan masuk (email dan kata sandi, Better Auth)
- Unggah foto mata, foto diperkecil di browser, lalu dianalisis model
- Riwayat prediksi dengan foto, detail, dan hapus
- Penilaian benar/salah dari pengguna terhadap hasil model
- Dashboard pribadi: total, rata-rata keyakinan, grafik 7 hari
- Panel admin: statistik, kelola user (role, blokir, hapus), monitoring prediksi, kondisi server
- Mode terang dan gelap, tampilan responsif

## Tangkapan layar

| Prediksi | Dashboard | Admin |
|---|---|---|
| ![](docs/screenshots/predict.png) | ![](docs/screenshots/dashboard.png) | ![](docs/screenshots/admin.png) |

## Arsitektur

```
Browser ─► Next.js (Vercel) ──/api/* rewrite──► Express (Vercel Function)
                                                  ├─ onnxruntime-node (model MobileNetV2)
                                                  ├─ PostgreSQL (Neon) via Drizzle
                                                  └─ Backblaze B2 (foto, URL bertanda tangan)
```

| Bagian | Teknologi |
|---|---|
| Frontend | Next.js 16, Tailwind CSS v4, shadcn/ui |
| Backend | Express 5, TypeScript, Better Auth, Drizzle ORM |
| ML | MobileNetV2 (TensorFlow/Keras → ONNX), ONNX Runtime |
| Data | PostgreSQL (Neon), Backblaze B2 |
| Mutu | Vitest, GitHub Actions (CI backend dan frontend), Swagger/OpenAPI |
| Hosting | Vercel (dua proyek: `frontend` dan `backend`) |

## Model

- Arsitektur: MobileNetV2, kelas `cataract` dan `normal`, input 224×224, normalisasi `x/127.5 - 1`
- Data latih: (https://www.kaggle.com/datasets/nandanp6/cataract-image-dataset)
- Hasil evaluasi: < Akurasi 91.74% / Recall 92% / Precision 92%>
- Notebook pelatihan: (https://colab.research.google.com/drive/1XwmwOsYEuVQW94YHh-6P33YXJatiXOwT)

Angka evaluasi berasal dari data uji dataset yang sama, bukan dari foto klinis nyata, jadi jangan dibaca sebagai akurasi diagnosis.

## Menjalankan lokal

Prasyarat: Node.js 22+, database PostgreSQL (mis. proyek gratis Neon), bucket Backblaze B2.

```bash
git clone https://github.com/Arachmanda10/Cataract-Detection.git && cd Cataract-Detection

# Backend
cd backend
cp .env.example .env        # isi nilainya, jangan commit .env
npm install
npm run dev

# Frontend (terminal lain)
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Variabel lingkungan dijelaskan di `backend/.env.example` dan `frontend/.env.example`.

## Pengujian

```bash
cd backend && npm test
cd frontend && npm run lint && npm run build
```

## Keputusan teknis dan batasan yang diketahui

- **Inferensi di dalam Express.** Model kecil (±15 ms per gambar), jadi tidak perlu layanan ML terpisah. Biaya: model ikut dimuat di fungsi serverless.
- **Backend di Vercel Function.** Ada batas body permintaan 4,5 MB, sehingga foto diperkecil di browser dan dibatasi 4 MB. Cold start bisa menambah beberapa detik pada permintaan pertama.
- **Pembatas laju (rate limit) per instance.** Penghitungnya ada di memori, jadi tidak dibagi antar-instance serverless. Untuk produksi sungguhan perlu penyimpanan bersama (mis. Redis).
- **Hari di grafik dihitung dalam UTC**, jadi prediksi sebelum 07:00 WIB tercatat di hari sebelumnya.
- **Penilaian pengguna bukan akurasi klinis.** Tidak ada label asli dari dokter.
- **Foto privat.** Disimpan di bucket privat dan ditampilkan lewat tautan sementara (5 menit).
- **Tidak memakai kartu kredit** pada layanan mana pun (Vercel Hobby, Neon, B2 free tier).

## Peta jalan

- [ ] Verifikasi email saat registrasi
- [ ] Masuk dengan Google
- [ ] Rate limit terpusat
- [ ] Evaluasi model pada data yang lebih beragam

## Lisensi

<MIT>