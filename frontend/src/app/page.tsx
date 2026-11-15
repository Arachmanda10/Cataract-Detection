"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export default function Home() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return <main className="p-6">Memuat...</main>;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-semibold">Deteksi Katarak</h1>
      {session ? (
        <>
          <p>
            Masuk sebagai <b>{session.user.name}</b> ({session.user.email})
          </p>
          <button
            onClick={() => authClient.signOut()}
            className="w-fit rounded border px-3 py-2"
          >
            Keluar
          </button>
        </>
      ) : (
        <p>
          <Link href="/login" className="underline">Masuk</Link> atau{" "}
          <Link href="/register" className="underline">Daftar</Link>
        </p>
      )}
    </main>
  );
}