import Image from "next/image";
import Link from "next/link";
import {
  ClipboardCheck,
  History,
  LayoutDashboard,
  MessageSquareText,
  ScanEye,
  ShieldCheck,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Faq } from "@/components/landing/faq";

// GANTI kedua alamat ini dengan milik Anda
const GITHUB_URL = "https://github.com/Arachmanda10/Cataract-Detection";
const DOCS_URL = "https://cataract-detection-pavg.vercel.app/docs";

const STEPS = [
  {
    icon: Upload,
    title: "Unggah foto mata",
    text: "Pilih foto JPEG, PNG, atau WebP. Foto diperkecil otomatis di browser sebelum dikirim.",
  },
  {
    icon: ScanEye,
    title: "Model menganalisis",
    text: "Model MobileNetV2 berjalan di server dan menentukan apakah foto terindikasi katarak atau normal.",
  },
  {
    icon: ClipboardCheck,
    title: "Lihat dan nilai hasilnya",
    text: "Anda mendapat label, tingkat keyakinan, dan bisa menilai apakah hasilnya sesuai.",
  },
];

const FEATURES = [
  {
    icon: History,
    title: "Riwayat prediksi",
    text: "Setiap analisis tersimpan lengkap dengan fotonya, dan bisa dibuka atau dihapus kapan saja.",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard pribadi",
    text: "Ringkasan jumlah prediksi, pembagian hasil, dan tren tujuh hari terakhir.",
  },
  {
    icon: MessageSquareText,
    title: "Penilaian hasil",
    text: "Beri tahu apakah hasil model sesuai menurut Anda, lengkap dengan komentar.",
  },
  {
    icon: ShieldCheck,
    title: "Panel admin",
    text: "Admin memantau prediksi semua pengguna, mengelola akun, dan melihat kondisi server.",
  },
];

const TECH = [
  "Next.js",
  "React",
  "Tailwind CSS",
  "shadcn/ui",
  "Express",
  "TypeScript",
  "Better Auth",
  "Drizzle ORM",
  "PostgreSQL (Neon)",
  "Backblaze B2",
  "ONNX Runtime",
  "Vercel",
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-12 md:grid-cols-2 md:py-20">
          <div className="flex flex-col items-start gap-6">
            <Badge variant="secondary">Proyek portofolio, bukan alat diagnosis</Badge>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">
              Deteksi dini katarak dari foto mata
            </h1>
            <p className="max-w-prose text-lg text-muted-foreground">
              Unggah foto mata dan model pembelajaran mesin memberi tahu apakah foto itu
              terindikasi katarak atau normal, lengkap dengan tingkat keyakinannya.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/predict" className={buttonVariants({ variant: "cta", size: "lg" })}>
                Mulai deteksi
              </Link>
              <a href="#cara-kerja" className={buttonVariants({ variant: "outline", size: "lg" })}>
                Lihat cara kerja
              </a>
            </div>
          </div>
          <div className="flex items-center justify-center rounded-2xl bg-secondary p-8">
            <Image
              src="/drishti-icon.svg"
              alt="Ikon mata Drishti"
              width={360}
              height={240}
              priority
              className="h-auto w-full max-w-sm"
            />
          </div>
        </section>

        {/* Cara kerja */}
        <section id="cara-kerja" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-12">
          <h2 className="mb-8 text-3xl font-bold">Cara kerja</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <Card key={title}>
                <CardHeader>
                  <Icon className="mb-2 size-6 text-primary" aria-hidden="true" />
                  <CardTitle>
                    {i + 1}. {title}
                  </CardTitle>
                  <CardDescription>{text}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        {/* Fitur */}
        <section className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="mb-8 text-3xl font-bold">Yang tersedia di aplikasi</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <Card key={title}>
                <CardHeader>
                  <Icon className="mb-2 size-6 text-primary" aria-hidden="true" />
                  <CardTitle>{title}</CardTitle>
                  <CardDescription>{text}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <Faq />

        {/* Keterbatasan */}
        <section className="mx-auto max-w-6xl px-6 py-12">
          <Card className="border-destructive/40">
            <CardHeader>
              <TriangleAlert className="mb-2 size-6 text-destructive" aria-hidden="true" />
              <CardTitle>Penting dibaca</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
              <p>
                Hasil dari aplikasi ini hanya untuk pembelajaran dan <strong>bukan diagnosis
                medis</strong>. Untuk pemeriksaan sebenarnya, temui dokter mata.
              </p>
              <p>
                Kinerja model belum divalidasi secara klinis. Nilai keyakinan yang ditampilkan
                bukan probabilitas klinis.
              </p>
              <p>
                Penilaian pengguna di dashboard adalah pendapat pengguna, bukan akurasi
                sebenarnya, karena tidak ada label dari dokter sebagai pembanding.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Teknologi */}
        <section className="mx-auto max-w-6xl px-6 py-12">
          <h2 className="mb-6 text-3xl font-bold">Dibangun dengan</h2>
          <ul className="flex flex-wrap gap-2">
            {TECH.map((t) => (
              <li key={t}>
                <Badge variant="outline">{t}</Badge>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="mt-8 border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6 text-sm text-muted-foreground">
          <Logo />
          <nav aria-label="Tautan proyek" className="flex gap-4">
            <a href={GITHUB_URL} className="underline underline-offset-4 hover:text-foreground">
              Kode di GitHub
            </a>
            <a href={DOCS_URL} className="underline underline-offset-4 hover:text-foreground">
              Dokumentasi API
            </a>
          </nav>
        </div>
      </footer>
    </>
  );
}