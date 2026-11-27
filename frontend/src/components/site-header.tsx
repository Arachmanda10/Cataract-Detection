"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export function SiteHeader() {
  const { data: session, isPending } = authClient.useSession();

  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
      <Logo />
      <div className="flex items-center gap-3">
        <ThemeToggle />
        {isPending ? null : session ? (
          <Link href="/predict" className={buttonVariants({ variant: "default" })}>
            Buka aplikasi
          </Link>
        ) : (
          <>
            <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
              Masuk
            </Link>
            <Link href="/register" className={buttonVariants({ variant: "default" })}>
              Daftar
            </Link>
          </>
        )}
      </div>
    </header>
  );
}