import { Hono } from "hono";
import { isAgentRequest } from "../auth";
import {
  listJobs,
  getJob,
  addMessage,
  setJobStatus,
  listSecretsFull,
  upsertSecret,
  getBrand,
  listBrandFiles,
  listPresets,
} from "../queries/drop";

// Token-only API used by Kimi from the editing sandbox.
// Authorization: Bearer <AGENT_TOKEN>
export const agentRoutes = new Hono();

agentRoutes.use("*", async (c, next) => {
  if (!isAgentRequest(c.req.raw)) return c.json({ error: "unauthorized" }, 401);
  return next();
});

agentRoutes.get("/ping", (c) => c.json({ ok: true, ts: Date.now() }));

// Jobs queue — optionally filtered by status (?status=new)
agentRoutes.get("/jobs", async (c) => {
  const all = await listJobs();
  const status = c.req.query("status");
  const filtered = status ? all.filter((j) => j.status === status) : all;
  return c.json({ jobs: filtered });
});

agentRoutes.get("/jobs/:id", async (c) => {
  const job = await getJob(Number(c.req.param("id")));
  if (!job) return c.json({ error: "not found" }, 404);
  return c.json(job);
});

// Post a status update to the job thread; optionally move the job status
agentRoutes.post("/jobs/:id/message", async (c) => {
  const jobId = Number(c.req.param("id"));
  const body = await c.req.json().catch(() => null);
  if (!body?.body || typeof body.body !== "string") {
    return c.json({ error: "body required" }, 400);
  }
  await addMessage({ jobId, author: "kimi", body: body.body.slice(0, 5000) });
  if (typeof body.status === "string" && body.status) {
    await setJobStatus(jobId, body.status.slice(0, 32));
  }
  return c.json({ ok: true });
});

// Style presets — full agent instructions keyed by job spec.preset
agentRoutes.get("/presets", async (c) => {
  const rows = await listPresets();
  return c.json({
    presets: rows.map((p) => ({ key: p.key, label: p.label, instructions: p.instructions })),
  });
});

// Full secret values — agent token only, this is the whole point of the vault
agentRoutes.get("/secrets", async (c) => {
  const rows = await listSecretsFull();
  return c.json({ secrets: rows.map((r) => ({ name: r.name, value: r.value })) });
});

// Vault a key from the editing sandbox (e.g. a key Mo pasted in chat)
agentRoutes.post("/secrets", async (c) => {
  const body = await c.req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const value = typeof body?.value === "string" ? body.value.trim() : "";
  if (!name || !value || name.length > 128 || value.length > 4000) {
    return c.json({ error: "name and value required" }, 400);
  }
  await upsertSecret(name, value);
  return c.json({ ok: true });
});

// Brand kit: colors, notes, and asset files (download via /api/files/:id/download)
agentRoutes.get("/brand", async (c) => {
  const settings = await getBrand();
  const assets = await listBrandFiles();
  return c.json({
    settings,
    assets: assets.map((f) => ({
      id: f.id,
      filename: f.filename,
      sizeBytes: f.sizeBytes,
      mime: f.mime,
    })),
  });
});
