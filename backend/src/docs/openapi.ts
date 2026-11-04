// Spesifikasi OpenAPI 3.0 untuk Cataract Detection API.
// Dibaca oleh Swagger UI (halaman /docs) dan juga tersedia sebagai JSON di /openapi.json.

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

const jsonBody = (schema: object, required = true) => ({
  required,
  content: { "application/json": { schema } },
});

const jsonResponse = (description: string, schema: object) => ({
  description,
  content: { "application/json": { schema } },
});

const errorResponse = (description: string) => jsonResponse(description, ref("Error"));

const idParam = {
  name: "id",
  in: "path",
  required: true,
  description: "UUID prediksi",
  schema: { type: "string", format: "uuid" },
};

const pageParams = (defaultLimit: number) => [
  { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
  { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 50, default: defaultLimit } },
];

const needLogin = [{ cookieAuth: [] }];

const r401 = errorResponse("Belum login");
const r403 = errorResponse("Bukan admin");
const r404 = errorResponse("Tidak ditemukan");
const r429 = errorResponse("Terlalu banyak request (rate limit)");

export const openapi = {
  openapi: "3.0.3",
  info: {
    title: "Cataract Detection API",
    version: "1.0.0",
    description:
      "Backend deteksi katarak dari foto mata (model MobileNetV2 dijalankan lewat ONNX Runtime di dalam Express).\n\n" +
      "**Cara mencoba:** jalankan `POST /api/auth/sign-in/email` di halaman ini terlebih dahulu. " +
      "Browser menyimpan cookie sesi dan otomatis mengirimnya di request berikutnya, tanpa perlu menekan tombol Authorize.\n\n" +
      "**Disclaimer:** proyek pembelajaran/portofolio, bukan alat diagnosis medis.",
  },
  servers: [{ url: "/", description: "Server ini" }],
  tags: [
    { name: "Auth", description: "Registrasi dan login (Better Auth)" },
    { name: "Predictions", description: "Prediksi katarak, riwayat, dan feedback" },
    { name: "Uploads", description: "Upload gambar mentah ke penyimpanan (B2)" },
    { name: "Dashboard", description: "Ringkasan aktivitas user" },
    { name: "Admin", description: "Khusus role admin" },
    { name: "System", description: "Pemeriksaan kesehatan" },
  ],
  paths: {
    "/health": {
      get: {
        tags: ["System"],
        summary: "Cek server hidup",
        responses: { "200": jsonResponse("OK", { type: "object", properties: { status: { type: "string", example: "ok" } } }) },
      },
    },
    "/health/db": {
      get: {
        tags: ["System"],
        summary: "Cek koneksi database",
        responses: {
          "200": jsonResponse("Database terhubung", {
            type: "object",
            properties: { status: { type: "string", example: "ok" }, database: { type: "string", example: "connected" } },
          }),
          "500": errorResponse("Database tidak terjangkau"),
        },
      },
    },

    "/api/auth/sign-up/email": {
      post: {
        tags: ["Auth"],
        summary: "Daftar akun baru",
        requestBody: jsonBody({
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            name: { type: "string", example: "Budi" },
            email: { type: "string", format: "email", example: "budi@contoh.com" },
            password: { type: "string", format: "password", minLength: 8 },
          },
        }),
        responses: { "200": { description: "Akun dibuat, cookie sesi diset" }, "422": errorResponse("Data tidak valid / email sudah terdaftar") },
      },
    },
    "/api/auth/sign-in/email": {
      post: {
        tags: ["Auth"],
        summary: "Login dengan email dan password",
        description: "Setelah berhasil, browser menyimpan cookie sesi dan dipakai otomatis oleh endpoint lain di halaman ini.",
        requestBody: jsonBody({
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string", format: "password" },
          },
        }),
        responses: { "200": { description: "Login berhasil, cookie sesi diset" }, "401": errorResponse("Email atau password salah") },
      },
    },
    "/api/auth/sign-out": {
      post: {
        tags: ["Auth"],
        summary: "Logout",
        security: needLogin,
        responses: { "200": { description: "Sesi dihapus" } },
      },
    },
    "/api/me": {
      get: {
        tags: ["Auth"],
        summary: "Data user yang sedang login",
        security: needLogin,
        responses: { "200": jsonResponse("Data user", ref("User")), "401": r401 },
      },
    },

    "/api/predictions": {
      post: {
        tags: ["Predictions"],
        summary: "Unggah foto mata dan dapatkan prediksi",
        description:
          "Foto divalidasi (JPEG/PNG/WebP, maks 5 MB), diprediksi dengan model, disimpan ke B2, lalu hasilnya dicatat. " +
          "Dibatasi 20 prediksi per 10 menit per user.",
        security: needLogin,
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["image"],
                properties: { image: { type: "string", format: "binary", description: "Foto mata (JPEG, PNG, atau WebP, maks 5 MB)" } },
              },
            },
          },
        },
        responses: {
          "201": jsonResponse("Prediksi tersimpan", ref("Prediction")),
          "400": errorResponse("File tidak ada atau bukan gambar valid"),
          "401": r401,
          "415": errorResponse("Format harus JPEG, PNG, atau WebP"),
          "429": r429,
        },
      },
      get: {
        tags: ["Predictions"],
        summary: "Riwayat prediksi milik sendiri (terbaru di atas)",
        security: needLogin,
        parameters: pageParams(10),
        responses: {
          "200": jsonResponse("Daftar prediksi", {
            type: "object",
            properties: { data: { type: "array", items: ref("Prediction") }, pagination: ref("Pagination") },
          }),
          "401": r401,
        },
      },
    },
    "/api/predictions/{id}": {
      get: {
        tags: ["Predictions"],
        summary: "Detail satu prediksi (beserta feedback jika ada)",
        security: needLogin,
        parameters: [idParam],
        responses: { "200": jsonResponse("Detail prediksi", ref("PredictionDetail")), "401": r401, "404": r404 },
      },
      delete: {
        tags: ["Predictions"],
        summary: "Hapus prediksi (gambar dan feedback ikut terhapus)",
        security: needLogin,
        parameters: [idParam],
        responses: { "204": { description: "Terhapus" }, "401": r401, "404": r404 },
      },
    },
    "/api/predictions/{id}/feedback": {
      put: {
        tags: ["Predictions"],
        summary: "Beri atau ubah feedback (benar/salah) untuk prediksi",
        security: needLogin,
        parameters: [idParam],
        requestBody: jsonBody({
          type: "object",
          required: ["isCorrect"],
          properties: {
            isCorrect: { type: "boolean", description: "true jika hasil prediksi menurut Anda benar" },
            comment: { type: "string", maxLength: 500, nullable: true },
          },
        }),
        responses: {
          "200": jsonResponse("Feedback tersimpan", ref("Feedback")),
          "400": errorResponse("Input tidak valid"),
          "401": r401,
          "404": r404,
        },
      },
      delete: {
        tags: ["Predictions"],
        summary: "Hapus feedback",
        security: needLogin,
        parameters: [idParam],
        responses: { "204": { description: "Terhapus" }, "401": r401, "404": r404 },
      },
    },

    "/api/uploads": {
      post: {
        tags: ["Uploads"],
        summary: "Unggah gambar mentah (tanpa prediksi)",
        security: needLogin,
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                required: ["image"],
                properties: { image: { type: "string", format: "binary" } },
              },
            },
          },
        },
        responses: {
          "201": jsonResponse("Tersimpan", {
            type: "object",
            properties: { key: { type: "string" }, url: { type: "string", format: "uri" }, size: { type: "integer" } },
          }),
          "400": errorResponse("Bukan gambar valid"),
          "401": r401,
          "415": errorResponse("Format tidak didukung"),
        },
      },
      delete: {
        tags: ["Uploads"],
        summary: "Hapus gambar milik sendiri",
        security: needLogin,
        parameters: [{ name: "key", in: "query", required: true, schema: { type: "string" } }],
        responses: { "204": { description: "Terhapus" }, "401": r401, "403": errorResponse("Bukan milik Anda") },
      },
    },
    "/api/uploads/signed-url": {
      get: {
        tags: ["Uploads"],
        summary: "Tautan sementara (5 menit) untuk melihat gambar milik sendiri",
        security: needLogin,
        parameters: [{ name: "key", in: "query", required: true, schema: { type: "string" } }],
        responses: {
          "200": jsonResponse("URL bertanda tangan", { type: "object", properties: { url: { type: "string", format: "uri" } } }),
          "401": r401,
          "403": errorResponse("Bukan milik Anda"),
        },
      },
    },

    "/api/dashboard": {
      get: {
        tags: ["Dashboard"],
        summary: "Ringkasan aktivitas user yang sedang login",
        security: needLogin,
        responses: { "200": jsonResponse("Ringkasan", ref("Dashboard")), "401": r401 },
      },
    },

    "/api/admin/stats": {
      get: {
        tags: ["Admin"],
        summary: "Statistik seluruh sistem",
        description:
          "`feedback.correctRate` adalah penilaian user, BUKAN akurasi model yang sebenarnya (tidak ada label asli dari dokter).",
        security: needLogin,
        responses: { "200": jsonResponse("Statistik", ref("AdminStats")), "401": r401, "403": r403 },
      },
    },
    "/api/admin/predictions": {
      get: {
        tags: ["Admin"],
        summary: "Prediksi semua user (dengan filter)",
        security: needLogin,
        parameters: [
          ...pageParams(20),
          { name: "label", in: "query", schema: { type: "string", enum: ["cataract", "normal"] } },
          { name: "feedback", in: "query", schema: { type: "string", enum: ["correct", "incorrect", "none"] } },
        ],
        responses: {
          "200": jsonResponse("Daftar prediksi", {
            type: "object",
            properties: { data: { type: "array", items: ref("AdminPredictionRow") }, pagination: ref("Pagination") },
          }),
          "401": r401,
          "403": r403,
        },
      },
    },
    "/api/admin/predictions/{id}": {
      get: {
        tags: ["Admin"],
        summary: "Detail prediksi (dengan URL gambar)",
        security: needLogin,
        parameters: [idParam],
        responses: { "200": jsonResponse("Detail", ref("AdminPredictionDetail")), "401": r401, "403": r403, "404": r404 },
      },
    },
    "/api/admin/system": {
      get: {
        tags: ["Admin"],
        summary: "Kesehatan server (uptime, memori, ping database)",
        security: needLogin,
        responses: { "200": jsonResponse("Status server", ref("SystemInfo")), "401": r401, "403": r403 },
      },
    },
    "/api/admin/users/{id}": {
      delete: {
        tags: ["Admin"],
        summary: "Hapus user beserta semua datanya (termasuk file di B2)",
        security: needLogin,
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": jsonResponse("Terhapus", { type: "object", properties: { deletedImages: { type: "integer" } } }),
          "400": errorResponse("Tidak bisa menghapus akun sendiri"),
          "401": r401,
          "403": r403,
          "404": r404,
          "502": errorResponse("Sebagian file gagal dihapus dari penyimpanan; user belum dihapus"),
        },
      },
    },
  },

  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "better-auth.session_token",
        description:
          "Cookie sesi dari Better Auth. Tidak perlu diisi manual: login lewat /api/auth/sign-in/email dan browser mengirimnya otomatis. " +
          "(Pada HTTPS, nama cookie memakai awalan __Secure-.)",
      },
    },
    schemas: {
      Error: { type: "object", properties: { message: { type: "string" } } },
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          email: { type: "string", format: "email" },
          role: { type: "string", example: "user" },
        },
      },
      Probabilities: {
        type: "object",
        properties: { cataract: { type: "number" }, normal: { type: "number" } },
      },
      Prediction: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          label: { type: "string", enum: ["cataract", "normal"] },
          confidence: { type: "number", description: "Probabilitas label terpilih (0-1). Bukan probabilitas klinis." },
          probabilities: ref("Probabilities"),
          inferenceMs: { type: "number" },
          createdAt: { type: "string", format: "date-time" },
          imageUrl: { type: "string", format: "uri", description: "Tautan sementara (5 menit)" },
        },
      },
      FeedbackSummary: {
        type: "object",
        nullable: true,
        properties: {
          isCorrect: { type: "boolean" },
          comment: { type: "string", nullable: true },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      PredictionDetail: {
        allOf: [ref("Prediction"), { type: "object", properties: { feedback: ref("FeedbackSummary") } }],
      },
      Feedback: {
        type: "object",
        properties: {
          predictionId: { type: "string", format: "uuid" },
          isCorrect: { type: "boolean" },
          comment: { type: "string", nullable: true },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Pagination: {
        type: "object",
        properties: {
          page: { type: "integer" },
          limit: { type: "integer" },
          totalItems: { type: "integer" },
          totalPages: { type: "integer" },
        },
      },
      Dashboard: {
        type: "object",
        properties: {
          predictions: {
            type: "object",
            properties: {
              total: { type: "integer" },
              cataract: { type: "integer" },
              normal: { type: "integer" },
              avgConfidence: { type: "number", nullable: true },
            },
          },
          feedback: {
            type: "object",
            properties: {
              total: { type: "integer" },
              correct: { type: "integer" },
              incorrect: { type: "integer" },
              correctRate: { type: "number", nullable: true },
            },
          },
          daily: {
            type: "array",
            description: "7 hari terakhir (UTC)",
            items: {
              type: "object",
              properties: { date: { type: "string", example: "2026-11-04" }, total: { type: "integer" } },
            },
          },
          recent: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                label: { type: "string" },
                confidence: { type: "number" },
                createdAt: { type: "string", format: "date-time" },
              },
            },
          },
        },
      },
      AdminStats: {
        type: "object",
        properties: {
          users: {
            type: "object",
            properties: { total: { type: "integer" }, admins: { type: "integer" }, banned: { type: "integer" } },
          },
          predictions: {
            type: "object",
            properties: {
              total: { type: "integer" },
              cataract: { type: "integer" },
              normal: { type: "integer" },
              last24h: { type: "integer" },
              avgConfidence: { type: "number", nullable: true },
              avgInferenceMs: { type: "number", nullable: true },
            },
          },
          feedback: {
            type: "object",
            properties: {
              total: { type: "integer" },
              correct: { type: "integer" },
              correctRate: { type: "number", nullable: true },
              byPredictedLabel: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    label: { type: "string" },
                    total: { type: "integer" },
                    correct: { type: "integer" },
                    correctRate: { type: "number", nullable: true },
                  },
                },
              },
            },
          },
        },
      },
      AdminPredictionRow: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          label: { type: "string" },
          confidence: { type: "number" },
          inferenceMs: { type: "number" },
          createdAt: { type: "string", format: "date-time" },
          userId: { type: "string" },
          userEmail: { type: "string", format: "email" },
          feedbackCorrect: { type: "boolean", nullable: true, description: "null = belum ada feedback" },
          feedbackComment: { type: "string", nullable: true },
        },
      },
      AdminPredictionDetail: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string" },
          userEmail: { type: "string", format: "email" },
          label: { type: "string" },
          confidence: { type: "number" },
          probabilities: ref("Probabilities"),
          inferenceMs: { type: "number" },
          createdAt: { type: "string", format: "date-time" },
          feedback: {
            type: "object",
            nullable: true,
            properties: { isCorrect: { type: "boolean" }, comment: { type: "string", nullable: true } },
          },
          imageUrl: { type: "string", format: "uri" },
        },
      },
      SystemInfo: {
        type: "object",
        properties: {
          uptimeSeconds: { type: "integer" },
          nodeVersion: { type: "string" },
          memoryMb: {
            type: "object",
            properties: { rss: { type: "number" }, heapUsed: { type: "number" }, external: { type: "number" } },
          },
          database: {
            type: "object",
            properties: { status: { type: "string", enum: ["ok", "error"] }, pingMs: { type: "number" } },
          },
        },
      },
    },
  },
};