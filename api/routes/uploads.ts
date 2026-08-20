import { Hono } from "hono";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { eq } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { uploads, files } from "@db/schema";
import { ensureDirs, tmpPath, finalPath } from "../storage";
import { isAllowedRequest } from "../auth";
import { config } from "../config";

// Chunked, resumable upload protocol:
//   POST /init           { filename, size, mime?, kind?, jobId? } -> { uploadId, chunkSize }
//   GET  /:id/status     -> { received, size, status }            (for resume)
//   PUT  /:id/chunk      header X-Chunk-Offset, raw body          (idempotent)
//   POST /:id/complete   -> verifies size, moves into library, creates file row
export const uploadRoutes = new Hono();

uploadRoutes.use("*", async (c, next) => {
  if (!isAllowedRequest(c.req.raw)) return c.json({ error: "unauthorized" }, 401);
  return next();
});

uploadRoutes.post("/init", async (c) => {
  const body = await c.req.json().catch(() => null);
  const filename = String(body?.filename || "").slice(0, 480);
  const size = Number(body?.size);
  if (!filename || !Number.isFinite(size) || size <= 0) {
    return c.json({ error: "filename and positive size required" }, 400);
  }
  const kind = ["inbox", "outbox", "brand", "broll"].includes(body?.kind) ? body.kind : "inbox";
  const jobId = Number.isFinite(Number(body?.jobId)) ? Number(body.jobId) : null;

  ensureDirs();
  const id = randomUUID();
  fs.closeSync(fs.openSync(tmpPath(id), "w"));
  await getDb().insert(uploads).values({
    id,
    filename,
    sizeBytes: size,
    mime: typeof body?.mime === "string" ? body.mime.slice(0, 250) : null,
    kind,
    jobId,
  });
  return c.json({ uploadId: id, chunkSize: config.chunkSize });
});

uploadRoutes.get("/:id/status", async (c) => {
  const row = await getDb().query.uploads.findFirst({
    where: eq(uploads.id, c.req.param("id")),
  });
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json({ received: row.receivedBytes, size: row.sizeBytes, status: row.status });
});

uploadRoutes.put("/:id/chunk", async (c) => {
  const id = c.req.param("id");
  const offset = Number(c.req.header("x-chunk-offset"));
  if (!Number.isFinite(offset) || offset < 0) return c.json({ error: "bad offset" }, 400);

  const row = await getDb().query.uploads.findFirst({ where: eq(uploads.id, id) });
  if (!row || row.status !== "active") return c.json({ error: "not found" }, 404);

  const buf = Buffer.from(await c.req.arrayBuffer());
  if (buf.length === 0) return c.json({ error: "empty chunk" }, 400);

  const fd = fs.openSync(tmpPath(id), "r+");
  try {
    fs.writeSync(fd, buf, 0, buf.length, offset);
  } finally {
    fs.closeSync(fd);
  }
  const received = Math.max(row.receivedBytes, offset + buf.length);
  await getDb().update(uploads).set({ receivedBytes: received }).where(eq(uploads.id, id));
  return c.json({ received });
});

uploadRoutes.post("/:id/complete", async (c) => {
  const id = c.req.param("id");
  const row = await getDb().query.uploads.findFirst({ where: eq(uploads.id, id) });
  if (!row) return c.json({ error: "not found" }, 404);

  const tmp = tmpPath(id);
  if (!fs.existsSync(tmp)) return c.json({ error: "data missing" }, 400);
  const actual = fs.statSync(tmp).size;
  if (actual !== Number(row.sizeBytes)) {
    return c.json({ error: `size mismatch: got ${actual}, expected ${row.sizeBytes}` }, 400);
  }

  const dest = finalPath(id, row.filename);
  fs.renameSync(tmp, dest);
  const [{ id: fileId }] = await getDb()
    .insert(files)
    .values({
      jobId: row.jobId,
      kind: row.kind,
      filename: row.filename,
      sizeBytes: Number(row.sizeBytes),
      mime: row.mime,
      storagePath: dest,
    })
    .$returningId();
  await getDb().update(uploads).set({ status: "done" }).where(eq(uploads.id, id));
  return c.json({ ok: true, fileId });
});
