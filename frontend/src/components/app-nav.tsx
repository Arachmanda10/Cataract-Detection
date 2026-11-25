"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const LINKS = [
  { href: "/predict", text: "Deteksi" },
  { href: "/history", text: "Riwayat" },
  { href: "/dashboard", text: "Dashboard" },
];

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();

  const { data: session } = authClient.useSession();
  const links =
    session?.user.role === "admin"
      ? [...LINKS, { href: "/admin", text: "Admin" }]
      : LINKS;

  async function logout() {
    await authClient.signOut();
    router.replace("/login");
  }

  return (
    <nav className="flex items-center justify-between border-b pb-3">
      <div className="flex gap-4 text-sm">
        <Link href="/" className="font-semibold">
          Beranda
        </Link>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={pathname.startsWith(l.href) ? "font-medium underline" : "text-gray-600"}
          >
            {l.text}
          </Link>
        ))}
      </div>
      <button onClick={logout} className="text-sm underline">
        Keluar
      </button>
    </nav>
  );
}