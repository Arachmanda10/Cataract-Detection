import { ChevronDown } from "lucide-react";

const ITEMS = [
  {
    q: "Apakah hasil Drishti menggantikan diagnosis dokter?",
    a: "Tidak. Drishti adalah proyek portofolio dan alat bantu skrining awal, bukan alat medis. Hasilnya hanya perkiraan dari model. Pemeriksaan dan diagnosis tetap harus dilakukan dokter mata.",
  },
  {
    q: "Foto seperti apa yang menghasilkan prediksi terbaik?",
    a: "Foto mata dari jarak dekat, terang merata, fokus tajam, tanpa lampu kilat yang memantul di pupil, dan tanpa kacamata yang menutupi mata.",
  },
  {
    q: "Apa arti tingkat keyakinan?",
    a: "Itu seberapa yakin model terhadap label yang dipilihnya, bukan jaminan kebenaran. Keyakinan tinggi tetap bisa keliru, terutama pada foto yang kualitasnya buruk.",
  },
  {
    q: "Apakah foto saya aman?",
    a: "Foto disimpan di penyimpanan privat dan hanya ditampilkan lewat tautan sementara yang kedaluwarsa dalam beberapa menit. Meski begitu, jangan unggah foto yang tidak ingin Anda simpan di layanan percobaan.",
  },
  {
    q: "Apakah ada batas ukuran foto?",
    a: "Ya, maksimal 4 MB per foto. Batas ini mengikuti batas ukuran permintaan pada hosting gratis yang dipakai.",
  },
  {
    q: "Mengapa saya diminta menilai hasil prediksi?",
    a: "Penilaian benar atau salah membantu mengukur seberapa sering model tepat pada foto nyata. Data ini tampil di dashboard Anda.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <h2 className="text-center text-3xl sm:text-4xl">Pertanyaan yang sering diajukan</h2>
      <div className="mt-10 divide-y divide-border rounded-xl border border-border bg-card">
        {ITEMS.map((item) => (
          <details key={item.q} className="group px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
              {item.q}
              <ChevronDown
                className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <p className="mt-3 leading-relaxed text-muted-foreground">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}