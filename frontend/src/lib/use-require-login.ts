"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";      
import { authClient } from "@/lib/auth-client";

//dipakai di halaman yang membutuhkan login, jika belum login maka akan diarahkan ke halaman login
export function useRequireLogin() {
  const router = useRouter();
  const {data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session) router.replace("/login");
  }, [isPending, session, router]);

  return { session, ready: !isPending && !!session };
}