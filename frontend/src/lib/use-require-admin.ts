"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useRequireLogin } from "@/lib/use-require-login";

// ready = sudah login DAN role admin. Bukan admin -> dialihkan ke /predict.
// Ini hanya kenyamanan; yang benar-benar menolak adalah requireAdmin di backend.
export function useRequireAdmin() {
  const router = useRouter();
  const { session, ready } = useRequireLogin();
  const isAdmin = ready && session?.user.role === "admin";

  useEffect(() => {
    if (ready && !isAdmin) router.replace("/predict");
  }, [ready, isAdmin, router]);

  return { session, ready: isAdmin };
}