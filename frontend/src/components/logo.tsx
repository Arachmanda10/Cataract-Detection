import Image from "next/image";
import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2" aria-label="Drishti, ke beranda">
      <Image src="/drishti-icon.svg" alt="" width={36} height={24} priority />
      <span className="font-heading text-lg font-bold uppercase tracking-[0.14em] text-foreground">
        Drishti
      </span>
    </Link>
  );
}