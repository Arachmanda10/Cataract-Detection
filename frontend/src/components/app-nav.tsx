"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
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
    session?.user.role === "admin" ? [...LINKS, { href: "/admin", text: "Admin" }] : LINKS;

  async function logout() {
    await authClient.signOut();
    router.replace("/login");
  }

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b pb-3">
      <Logo />
      <nav
        aria-label="Menu utama"
        className="order-3 flex w-full flex-wrap gap-4 text-sm sm:order-none sm:w-auto"
      >
        {links.map((l) => {
          const active = pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "font-medium text-foreground underline underline-offset-4"
                  : "text-muted-foreground hover:text-foreground"
              }
            >
              {l.text}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <button onClick={logout} className="text-sm underline">
          Keluar
        </button>
      </div>
    </header>
  );
}