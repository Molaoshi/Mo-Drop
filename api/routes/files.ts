import { Hono } from "hono";
import fs from "node:fs";
import { Readable } from "node:stream";
import { eq } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { files } from "@db/schema";
import { isAllowedRequest } from "../auth";

export const fileRoutes = new Hono();

fileRoutes.use("*", async (c, next) => {
  if (!isAllowedRequest(c.req.raw)) return c.json({ error: "unauthorized" }, 401);
  return next();
});

function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]+/g, "_").replace(/"/g, "'");
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

// Download with HTTP Range support (resume-friendly for big videos on flaky networks)
fileRoutes.get("/:id/download", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id)) return c.json({ error: "bad id" }, 400);
  const row = await getDb().query.files.findFirst({ where: eq(files.id, id) });
  if (!row || !fs.existsSync(row.storagePath)) return c.json({ error: "not found" }, 404);

  const total = fs.statSync(row.storagePath).size;
  const mime = row.mime || "application/octet-stream";
  // Images render inline (brand-kit previews) unless ?download=1 forces attachment
  const inlineImage = mime.startsWith("image/") && c.req.query("download") !== "1";
  const headers: Record<string, string> = {
    "Content-Type": mime,
    "Content-Disposition": inlineImage
      ? 'inline; filename="preview"'
      : contentDisposition(row.filename),
    "Accept-Ranges": "bytes",
  };

  const range = c.req.header("range");
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (m && (m[1] !== "" || m[2] !== "")) {
      let start = m[1] === "" ? NaN : parseInt(m[1], 10);
      let end = m[2] === "" ? NaN : parseInt(m[2], 10);
      if (Number.isNaN(start) && !Number.isNaN(end)) {
        // suffix range: last N bytes
        start = Math.max(0, total - end);
        end = total - 1;
      } else {
        if (Number.isNaN(start)) start = 0;
        if (Number.isNaN(end) || end > total - 1) end = total - 1;
      }
      if (start >= total || start > end) {
        return c.body(null, 416, { "Content-Range": `bytes */${total}` });
      }
      const stream = Readable.toWeb(
        fs.createReadStream(row.storagePath, { start, end }),
      ) as ReadableStream;
      return c.body(stream, 206, {
        ...headers,
        "Content-Range": `bytes ${start}-${end}/${total}`,
        "Content-Length": String(end - start + 1),
      });
    }
  }

  const stream = Readable.toWeb(fs.createReadStream(row.storagePath)) as ReadableStream;
  return c.body(stream, 200, { ...headers, "Content-Length": String(total) });
});

fileRoutes.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isFinite(id)) return c.json({ error: "bad id" }, 400);
  const row = await getDb().query.files.findFirst({ where: eq(files.id, id) });
  if (!row) return c.json({ error: "not found" }, 404);
  await getDb().delete(files).where(eq(files.id, id));
  try {
    fs.unlinkSync(row.storagePath);
  } catch {
    // already gone
  }
  return c.json({ ok: true });
});
