export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

// Panggil backend lewat rewrites (alamat relatif, cookie dikirim otomatis)
export async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);

  if (!res.ok) {
    let message = `Server tidak merespons dengan benar (status ${res.status})`;
    try {
      const body = await res.json();
      if (typeof body?.message === "string") message = body.message;
    } catch {
      // respons bukan JSON (mis. halaman error dari proxy); pakai pesan bawaan
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}