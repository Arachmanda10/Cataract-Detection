"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppNav } from "@/components/app-nav";
import { api } from "@/lib/api";
import type { AdminUser } from "@/lib/types";
import { useRequireAdmin } from "@/lib/use-require-admin";
import { authClient } from "@/lib/auth-client";

const LIMIT = 10;

type ActionResult = { error: { message?: string } | null };

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

  function toggleRole(u: AdminUser) {
    const next = u.role === "admin" ? "user" : "admin";
    if (!window.confirm(`Ubah role ${u.email} menjadi "${next}"?`)) return;
    run(u.id, () => authClient.admin.setRole({ userId: u.id, role: next }));
  }

  function ban(u: AdminUser) {
    const reason = window.prompt(`Alasan memblokir ${u.email} (boleh dikosongkan):`);
    if (reason === null) return; // dibatalkan
    run(u.id, () =>
      authClient.admin.banUser({ userId: u.id, banReason: reason.trim() || undefined }),
    );
  }

  function unban(u: AdminUser) {
    run(u.id, () => authClient.admin.unbanUser({ userId: u.id }));
  }

  function remove(u: AdminUser) {
    if (
      !window.confirm(
        `Hapus ${u.email} beserta semua prediksi dan fotonya? Tindakan ini tidak bisa dibatalkan.`,
      )
    ) {
      return;
    }
    run(u.id, async () => {
      try {
        await api(`/api/admin/users/${u.id}`, { method: "DELETE" });
        return { error: null };
      } catch (err) {
        return { error: { message: err instanceof Error ? err.message : undefined } };
      }
    });
  }

  if (!ready) return <main className="p-6">Memuat...</main>;

  const loading = !error && (!result || result.page !== page || result.search !== search);
  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / LIMIT));
  const myId = session?.user.id;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
      <AppNav />
      <Link href="/admin" className="text-sm underline">
        ← Kembali ke admin
      </Link>
      <h1 className="text-2xl font-semibold">Kelola User</h1>

      <form onSubmit={onSearch} className="flex gap-2">
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Cari berdasarkan email"
          className="flex-1 rounded border p-2 text-sm"
        />
        <button className="rounded bg-black px-3 py-2 text-sm text-white">Cari</button>
      </form>

      {error && (
        <p className="text-sm text-red-600">
          {error}{" "}
          <button onClick={() => setReloadKey((k) => k + 1)} className="underline">
            Coba lagi
          </button>
        </p>
      )}
      {actionError && <p className="text-sm text-red-600">{actionError}</p>}

      {!result && loading && <p className="text-sm text-gray-600">Memuat user...</p>}

      {result && result.users.length === 0 && (
        <p className="text-sm text-gray-600">User tidak ditemukan.</p>
      )}

      {result && result.users.length > 0 && (
        <ul className={`flex flex-col gap-3 ${loading ? "opacity-50" : ""}`}>
          {result.users.map((u) => {
            const isMe = u.id === myId;
            const busy = busyId === u.id;
            return (
              <li key={u.id} className="flex flex-col gap-2 rounded border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{u.name}</span>
                  {isMe && <span className="rounded border px-2 text-xs">Anda</span>}
                  {u.role === "admin" && (
                    <span className="rounded bg-black px-2 text-xs text-white">Admin</span>
                  )}
                  {u.banned && (
                    <span className="rounded bg-red-600 px-2 text-xs text-white">Diblokir</span>
                  )}
                </div>
                <span className="text-sm text-gray-600">{u.email}</span>
                <span className="text-xs text-gray-500">
                  Terdaftar{" "}
                  {new Date(u.createdAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                  {u.banned && u.banReason ? ` · Alasan blokir: ${u.banReason}` : ""}
                </span>
                {!isMe && (
                  <div className="flex flex-wrap gap-2 text-sm">
                    <button
                      onClick={() => toggleRole(u)}
                      disabled={busy}
                      className="rounded border px-2 py-1 disabled:opacity-50"
                    >
                      {u.role === "admin" ? "Jadikan user" : "Jadikan admin"}
                    </button>
                    {u.banned ? (
                      <button
                        onClick={() => unban(u)}
                        disabled={busy}
                        className="rounded border px-2 py-1 disabled:opacity-50"
                      >
                        Buka blokir
                      </button>
                    ) : (
                      <button
                        onClick={() => ban(u)}
                        disabled={busy}
                        className="rounded border px-2 py-1 disabled:opacity-50"
                      >
                        Blokir
                      </button>
                    )}
                    <button
                      onClick={() => remove(u)}
                      disabled={busy}
                      className="rounded border border-red-600 px-2 py-1 text-red-600 disabled:opacity-50"
                    >
                      {busy ? "Memproses..." : "Hapus"}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {result && result.total > 0 && (
        <div className="flex items-center justify-between text-sm">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1 || loading}
            className="rounded border px-3 py-2 disabled:opacity-50"
          >
            Sebelumnya
          </button>
          <span>
            Halaman {page} dari {totalPages} ({result.total} user)
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages || loading}
            className="rounded border px-3 py-2 disabled:opacity-50"
          >
            Berikutnya
          </button>
        </div>
      )}
    </main>
  );
}