"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import type { AdminUser } from "@/lib/types";
import { useRequireAdmin } from "@/lib/use-require-admin";

const LIMIT = 10;

type ActionResult = { error: { message?: string } | null };
type Pending = { kind: "role" | "ban" | "delete"; user: AdminUser } | null;

export default function AdminUsersPage() {
  const { session, ready } = useRequireAdmin();

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [result, setResult] = useState<{
    page: number;
    search: string;
    users: AdminUser[];
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [pending, setPending] = useState<Pending>(null);
  const [banReason, setBanReason] = useState("");

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    authClient.admin
      .listUsers({
        query: {
          limit: LIMIT,
          offset: (page - 1) * LIMIT,
          sortBy: "createdAt",
          sortDirection: "desc",
          ...(search
            ? {
                searchValue: search,
                searchField: "email" as const,
                searchOperator: "contains" as const,
              }
            : {}),
        },
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setError(error?.message ?? "Gagal memuat daftar user");
          return;
        }
        setResult({ page, search, users: data.users as AdminUser[], total: data.total });
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Gagal memuat daftar user");
      });

    return () => {
      cancelled = true;
    };
  }, [ready, page, search, reloadKey]);

  // Menjalankan satu aksi untuk satu user, lalu memuat ulang daftar
  async function run(userId: string, action: () => Promise<ActionResult>) {
    setBusyId(userId);
    setActionError(null);
    try {
      const { error } = await action();
      if (error) setActionError(error.message ?? "Aksi gagal");
      else setReloadKey((k) => k + 1);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Aksi gagal");
    } finally {
      setBusyId(null);
    }
  }

  function onSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPage(1);
    setSearch(searchInput.trim());
  }

  function ask(kind: "role" | "ban" | "delete", user: AdminUser) {
    setBanReason("");
    setPending({ kind, user });
  }

  function unban(u: AdminUser) {
    run(u.id, () => authClient.admin.unbanUser({ userId: u.id }));
  }

  function confirmPending() {
    if (!pending) return;
    const { kind, user: u } = pending;
    setPending(null);

    if (kind === "role") {
      const next = u.role === "admin" ? "user" : "admin";
      run(u.id, () => authClient.admin.setRole({ userId: u.id, role: next }));
    } else if (kind === "ban") {
      run(u.id, () =>
        authClient.admin.banUser({ userId: u.id, banReason: banReason.trim() || undefined }),
      );
    } else {
      run(u.id, async () => {
        try {
          await api(`/api/admin/users/${u.id}`, { method: "DELETE" });
          return { error: null };
        } catch (err) {
          return { error: { message: err instanceof Error ? err.message : undefined } };
        }
      });
    }
  }

  if (!ready) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const loading = !error && (!result || result.page !== page || result.search !== search);
  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / LIMIT));
  const myId = session?.user.id;

  const dialogTitle =
    pending?.kind === "role"
      ? `Ubah role menjadi "${pending.user.role === "admin" ? "user" : "admin"}"?`
      : pending?.kind === "ban"
        ? "Blokir user ini?"
        : "Hapus user ini?";
  const dialogText =
    pending?.kind === "delete"
      ? `${pending.user.email} beserta semua prediksi dan fotonya akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`
      : pending
        ? pending.user.email
        : "";

  return (
    <PageShell
      title="Kelola user"
      description="Cari, ubah role, blokir, atau hapus pengguna."
      actions={
        <Link href="/admin" className={buttonVariants({ variant: "outline", size: "sm" })}>
          ← Kembali ke admin
        </Link>
      }
    >
      <form onSubmit={onSearch} className="flex gap-2">
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Cari berdasarkan email"
          aria-label="Cari berdasarkan email"
          className="flex-1"
        />
        <Button type="submit">Cari</Button>
      </form>

      {error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription className="flex flex-wrap items-center gap-3">
            {error}
            <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
              Coba lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {actionError && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {!result && loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}

      {result && result.users.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            User tidak ditemukan.
          </CardContent>
        </Card>
      )}

      {result && result.users.length > 0 && (
        <ul className={`space-y-3 ${loading ? "opacity-50" : ""}`}>
          {result.users.map((u) => {
            const isMe = u.id === myId;
            const busy = busyId === u.id;
            return (
              <li
                key={u.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{u.name}</span>
                    {isMe && <Badge variant="outline">Anda</Badge>}
                    {u.role === "admin" && <Badge>Admin</Badge>}
                    {u.banned && <Badge variant="destructive">Diblokir</Badge>}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{u.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Terdaftar{" "}
                    {new Date(u.createdAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                    {u.banned && u.banReason ? ` · Alasan blokir: ${u.banReason}` : ""}
                  </p>
                </div>
                {!isMe && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => ask("role", u)}
                      disabled={busy}
                    >
                      {u.role === "admin" ? "Jadikan user" : "Jadikan admin"}
                    </Button>
                    {u.banned ? (
                      <Button variant="outline" size="sm" onClick={() => unban(u)} disabled={busy}>
                        Buka blokir
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => ask("ban", u)}
                        disabled={busy}
                      >
                        Blokir
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => ask("delete", u)}
                      disabled={busy}
                    >
                      {busy ? "Memproses..." : "Hapus"}
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {result && result.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <Button variant="outline" onClick={() => setPage(page - 1)} disabled={page <= 1 || loading}>
            Sebelumnya
          </Button>
          <span className="text-muted-foreground">
            Halaman {page} dari {totalPages} ({result.total} user)
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages || loading}
          >
            Berikutnya
          </Button>
        </div>
      )}

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
            <AlertDialogDescription>{dialogText}</AlertDialogDescription>
          </AlertDialogHeader>
          {pending?.kind === "ban" && (
            <div className="space-y-2">
              <Label htmlFor="alasan-blokir">Alasan (boleh dikosongkan)</Label>
              <Input
                id="alasan-blokir"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
              />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <Button
              variant={pending?.kind === "role" ? "default" : "destructive"}
              onClick={confirmPending}
            >
              {pending?.kind === "role"
                ? "Ya, ubah"
                : pending?.kind === "ban"
                  ? "Ya, blokir"
                  : "Ya, hapus"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}