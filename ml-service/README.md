
---
title: Cataract ML Service
emoji: 👁️
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# Cataract ML Service

Layanan inferensi untuk klasifikasi katarak vs normal dari foto mata
(MobileNetV2, TFLite) berbasis FastAPI.

- `GET /health` : cek status layanan
- `POST /predict` : prediksi gambar (field `file`, header `X-API-Key`)

Proyek edukasi/portofolio, bukan alat diagnosis medis.