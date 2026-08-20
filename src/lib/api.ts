// Raw-API helpers (login + chunked uploads). tRPC covers everything else.

export async function apiMe(): Promise<boolean> {
  try {
    const r = await fetch("/api/auth/me", { credentials: "include" });
    if (!r.ok) return false;
    const j = await r.json();
    return !!j.authed;
  } catch {
    return false;
  }
}

export async function apiLogin(password: string): Promise<boolean> {
  try {
    const r = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export async function apiLogout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
}

export interface UploadOptions {
  jobId?: number;
  kind?: "inbox" | "outbox" | "brand";
  onProgress?: (bytesSent: number, total: number) => void;
}

// fetch with a hard timeout — a hung request on a flaky link must fail fast
// so the retry/backoff logic (and the user-visible error) can kick in.
function timedFetch(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}

const INIT_TIMEOUT = 20_000;
const STATUS_TIMEOUT = 20_000;
const CHUNK_TIMEOUT = 45_000;
const COMPLETE_TIMEOUT = 30_000;

// Chunked upload with per-chunk retry + server-side resume state.
// Returns the new file id.
export async function uploadFile(file: File, opts: UploadOptions = {}): Promise<number> {
  const initRes = await timedFetch("/api/uploads/init", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      size: file.size,
      mime: file.type || undefined,
      kind: opts.kind ?? "inbox",
      jobId: opts.jobId,
    }),
  }, INIT_TIMEOUT);
  if (!initRes.ok) throw new Error(`upload init failed (${initRes.status})`);
  const { uploadId, chunkSize } = (await initRes.json()) as {
    uploadId: string;
    chunkSize: number;
  };

  // Resume: ask the server how much it already holds
  let offset = 0;
  const st = await timedFetch(`/api/uploads/${uploadId}/status`, { credentials: "include" }, STATUS_TIMEOUT);
  if (st.ok) {
    const j = await st.json();
    offset = Math.min(Number(j.received) || 0, file.size);
  }
  opts.onProgress?.(offset, file.size);

  while (offset < file.size) {
    const end = Math.min(offset + chunkSize, file.size);
    const blob = file.slice(offset, end);
    let sent = false;
    for (let attempt = 1; attempt <= 4 && !sent; attempt++) {
      try {
        const r = await timedFetch(`/api/uploads/${uploadId}/chunk`, {
          method: "PUT",
          credentials: "include",
          headers: {
            "X-Chunk-Offset": String(offset),
            "Content-Type": "application/octet-stream",
          },
          body: blob,
        }, CHUNK_TIMEOUT);
        if (!r.ok) throw new Error(`chunk failed (${r.status})`);
        sent = true;
      } catch (err) {
        if (attempt === 4) throw err;
        await new Promise((res) => setTimeout(res, 800 * attempt));
      }
    }
    offset = end;
    opts.onProgress?.(offset, file.size);
  }

  const doneRes = await timedFetch(`/api/uploads/${uploadId}/complete`, {
    method: "POST",
    credentials: "include",
  }, COMPLETE_TIMEOUT);
  if (!doneRes.ok) {
    const j = await doneRes.json().catch(() => null);
    throw new Error(j?.error || `upload finalize failed (${doneRes.status})`);
  }
  const j = await doneRes.json();
  return j.fileId as number;
}

export function downloadUrl(id: number): string {
  return `/api/files/${id}/download`;
}

export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}
