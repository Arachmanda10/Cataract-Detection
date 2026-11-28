# 👁️ Deteksi Katarak dari Citra Mata dengan MobileNetV2

Proyek klasifikasi biner (`cataract` vs `normal`) dari foto mata menggunakan **transfer learning MobileNetV2** dengan TensorFlow/Keras. Dikerjakan di Google Colab (GPU T4).

> ⚠️ **Disclaimer:** proyek ini dibuat untuk tujuan pembelajaran dan portofolio. Model **bukan alat diagnosis medis** dan tidak boleh menggantikan pemeriksaan oleh dokter mata.

## 📌 Ringkasan

| Item | Keterangan |
|---|---|
| Tugas | Klasifikasi gambar biner: katarak / normal |
| Model | MobileNetV2 (bobot ImageNet) + GlobalAveragePooling + Dropout (0,2) + Dense (2, softmax) |
| Input | 224 × 224 × 3, normalisasi ke rentang [-1, 1] |
| Framework | TensorFlow / Keras |
| Akurasi test | **91,74%** |
| Format ekspor | `.keras`, `.h5`, `.tflite` |

## 📂 Dataset

- Sumber: [Cataract Image Dataset (Kaggle, nandanp6)](https://www.kaggle.com/datasets/nandanp6/cataract-image-dataset)
- Dataset **tidak disertakan** di repository ini. Unduh langsung dari Kaggle (lihat bagian *Cara Menjalankan*).

| Split | Cataract | Normal | Total |
|---|---|---|---|
| Train | 245 | 246 | 491 |
| Test | 61 | 60 | 121 |

Data train dibagi lagi 80% untuk training (393 gambar) dan 20% untuk validasi (98 gambar). Data test dipakai hanya untuk evaluasi akhir.

Ukuran gambar pada dataset sangat bervariasi (misalnya 117×123 hingga 2272×1476 piksel), sehingga semua gambar di-resize ke 224×224.

## 🔄 Alur Kerja

1. **Validasi data:** cek jumlah per kelas, contoh visual, ukuran gambar, dan file rusak.
2. **Pipeline data:** resize 224×224, batch 32, seed tetap (42).
3. **Augmentasi (hanya data train):** flip horizontal, rotasi acak ±5%, zoom acak ±10%.
4. **Preprocessing:** `mobilenet_v2.preprocess_input`.
5. **Training:** Adam (learning rate 0,0001), categorical crossentropy, EarlyStopping pada `val_loss` (patience 5, bobot terbaik dipulihkan).
6. **Evaluasi:** akurasi, confusion matrix, precision/recall/F1.
7. **Ekspor model** dan inferensi pada gambar baru.

## 📊 Hasil

**Test set (121 gambar):** loss 0,2062 · akurasi 0,9174

| Kelas | Precision | Recall | F1-score | Support |
|---|---|---|---|---|
| cataract | 0,86 | 1,00 | 0,92 | 61 |
| normal | 1,00 | 0,83 | 0,91 | 60 |

**Confusion matrix** (baris = aktual, kolom = prediksi):

| | Pred. cataract | Pred. normal |
|---|---|---|
| **Aktual cataract** | 61 | 0 |
| **Aktual normal** | 10 | 50 |

**Interpretasi singkat:**
- Seluruh gambar katarak pada test set terdeteksi (tidak ada *false negative*).
- 10 gambar normal salah diprediksi sebagai katarak. Pola ini relatif lebih aman untuk konteks skrining, karena lebih baik meminta pemeriksaan ulang daripada melewatkan katarak.

## ⚠️ Keterbatasan

- **Data kecil:** test set hanya 121 gambar (1 gambar ≈ 0,83 poin persentase) dan validasi hanya 98 gambar, sehingga estimasi performa memiliki ketidakpastian yang cukup lebar.
- **Overfitting:** akurasi training mencapai ±100% sementara akurasi validasi 83–91%. Training dihentikan oleh EarlyStopping pada epoch 13 dengan bobot terbaik dari epoch 8.
- **Seluruh MobileNetV2 ikut dilatih** (±2,23 juta dari ±2,26 juta parameter bersifat *trainable*), bukan hanya head klasifikasi.
- **Kualitas data beragam:** gambar berasal dari sumber dengan ukuran dan kondisi pengambilan yang berbeda-beda. Keberadaan gambar duplikat antara train dan test belum diperiksa.
- **Confidence bukan probabilitas klinis:** nilai softmax yang tinggi tidak menjamin prediksi benar.
- Belum divalidasi pada data dari perangkat atau populasi lain.

## 🚀 Cara Menjalankan

### Di Google Colab (disarankan)

1. Buka `notebooks/Cataract_Detect.ipynb` di Colab.
2. Aktifkan GPU: **Runtime → Change runtime type → T4 GPU**.
3. Jalankan seluruh sel dari atas ke bawah. Notebook akan mengunduh dataset via `kagglehub` dan menyimpannya ke Google Drive Anda.

### Secara lokal

```bash
git clone https://github.com/Arachmanda10/cataract-detection.git
cd cataract-detection
pip install -r requirements.txt
```

Notebook memakai `google.colab` (mount Drive dan upload file), jadi bagian tersebut perlu disesuaikan jika dijalankan di luar Colab.

### Memakai model hasil training

Preprocessing **tidak tersimpan di dalam model**. Gambar harus di-resize ke 224×224 lalu dinormalisasi dengan `tf.keras.applications.mobilenet_v2.preprocess_input` sebelum diprediksi.

```python
import numpy as np
import tensorflow as tf
from tensorflow.keras.utils import load_img, img_to_array

model = tf.keras.models.load_model("models/cataract_model.keras")
class_names = ["cataract", "normal"]

img = load_img("contoh.png", target_size=(224, 224))
x = np.expand_dims(img_to_array(img), axis=0)
x = tf.keras.applications.mobilenet_v2.preprocess_input(x)

pred = model.predict(x, verbose=0)[0]
print(class_names[np.argmax(pred)], f"{pred.max():.2%}")
```

## 🗂️ Struktur Repository

```
cataract-detection/
├── README.md
├── requirements.txt
├── .gitignore
├── notebooks/
│   └── Cataract_Detect.ipynb
└── models/            # opsional: model berukuran kecil (mis. .tflite)
```

## 🛠️ Rencana Pengembangan

- Membekukan base model, lalu fine-tuning bertahap dengan learning rate lebih kecil.
- Memeriksa duplikasi gambar antara train dan test.
- Menambah data dan memakai validasi silang agar evaluasi lebih stabil.
- Menambahkan visualisasi Grad-CAM untuk melihat area gambar yang memengaruhi prediksi.
- Memasukkan preprocessing ke dalam model agar lebih mudah di-deploy.

## 🙏 Kredit

- Dataset: [nandanp6/cataract-image-dataset](https://www.kaggle.com/datasets/nandanp6/cataract-image-dataset) di Kaggle.
- Arsitektur: [MobileNetV2](https://arxiv.org/abs/1801.04381) (Sandler dkk., 2018), bobot pretrained ImageNet dari Keras Applications.

## 👤 Penulis

**Arachmanda10**
GitHub: [@Arachmanda10](https://github.com/Arachmanda10)
