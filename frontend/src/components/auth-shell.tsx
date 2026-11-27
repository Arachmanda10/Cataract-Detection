import Link from "next/link";
import { ShieldCheck, ScanEye, History } from "lucide-react";
import { Logo } from "@/components/logo";

const POINTS = [
  { icon: ScanEye, text: "Skrining awal katarak dari foto mata dalam hitungan detik" },
  { icon: History, text: "Riwayat dan dashboard pribadi untuk memantau hasil" },
  { icon: ShieldCheck, text: "Foto disimpan privat dan hanya tampil lewat tautan sementara" },
];

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-secondary p-12 lg:flex">
        <Logo />
        <div className="max-w-md space-y-6">
          <h2 className="text-4xl leading-tight">Deteksi dini, langkah awal yang berarti.</h2>
          <ul className="space-y-4">
            {POINTS.map((p) => (
              <li key={p.text} className="flex items-start gap-3 text-muted-foreground">
                <p.icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <span>{p.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-muted-foreground">
          Proyek portofolio, bukan alat medis. Hasil tidak menggantikan dokter mata.
        </p>
      </aside>

      <main className="flex w-full items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden">
            <Logo />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
          </div>
          {children}
          <Link
            href="/"
            className="inline-block text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            ← Kembali ke beranda
          </Link>
        </div>
      </main>
    </div>
  );
}