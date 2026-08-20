import { desc, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "./connection";
import { jobs, files, messages, secrets, brandSettings, presets } from "@db/schema";
import type { JobSpec } from "@contracts/types";

// ---------- jobs ----------

export async function listJobs() {
  const db = getDb();
  const allJobs = await db.select().from(jobs).orderBy(desc(jobs.createdAt));
  const allFiles = await db.select().from(files).orderBy(asc(files.createdAt));
  return allJobs.map((job) => ({
    ...job,
    files: allFiles.filter((f) => f.jobId === job.id),
  }));
}

export async function getJob(id: number) {
  const db = getDb();
  const job = await db.query.jobs.findFirst({ where: eq(jobs.id, id) });
  if (!job) return null;
  const jobFiles = await db
    .select()
    .from(files)
    .where(eq(files.jobId, id))
    .orderBy(asc(files.createdAt));
  const thread = await db
    .select()
    .from(messages)
    .where(eq(messages.jobId, id))
    .orderBy(asc(messages.createdAt));
  return { ...job, files: jobFiles, messages: thread };
}

export async function createJob(data: { title: string; instructions?: string; spec?: JobSpec }) {
  const [{ id }] = await getDb().insert(jobs).values(data).$returningId();
  return id;
}

export async function setJobStatus(id: number, status: string) {
  await getDb().update(jobs).set({ status }).where(eq(jobs.id, id));
}

export async function deleteJob(id: number) {
  const db = getDb();
  await db.delete(messages).where(eq(messages.jobId, id));
  const jobFiles = await db.select().from(files).where(eq(files.jobId, id));
  await db.delete(files).where(eq(files.jobId, id));
  await db.delete(jobs).where(eq(jobs.id, id));
  return jobFiles;
}

// ---------- style presets ----------

export async function listPresets() {
  return getDb().select().from(presets).orderBy(asc(presets.sort));
}

// ---------- messages ----------

export async function addMessage(data: { jobId: number; author: string; body: string }) {
  await getDb().insert(messages).values(data);
}

// ---------- files ----------

export async function listFiles(kind?: string) {
  const db = getDb();
  if (kind) {
    return db
      .select()
      .from(files)
      .where(eq(files.kind, kind))
      .orderBy(desc(files.createdAt));
  }
  return db.select().from(files).orderBy(desc(files.createdAt));
}

export async function getFile(id: number) {
  return getDb().query.files.findFirst({ where: eq(files.id, id) });
}

export async function deleteFileRow(id: number) {
  const row = await getFile(id);
  await getDb().delete(files).where(eq(files.id, id));
  return row;
}

// ---------- secrets (vault) ----------

export async function listSecretsMasked() {
  const rows = await getDb().select().from(secrets).orderBy(asc(secrets.name));
  return rows.map(({ id, name, hint, createdAt }) => ({ id, name, hint, createdAt }));
}

export async function listSecretsFull() {
  return getDb().select().from(secrets).orderBy(asc(secrets.name));
}

export async function upsertSecret(name: string, value: string) {
  const hint = value.slice(-4);
  await getDb()
    .insert(secrets)
    .values({ name, value, hint })
    .onDuplicateKeyUpdate({ set: { value, hint } });
}

export async function deleteSecret(id: number) {
  await getDb().delete(secrets).where(eq(secrets.id, id));
}

// ---------- brand settings ----------

export type BrandData = {
  primary: string;
  background: string;
  text: string;
  notes: string;
};

export const DEFAULT_BRAND: BrandData = {
  primary: "#00d9a3",
  background: "#0a0a0a",
  text: "#ffffff",
  notes: "",
};

export async function getBrand(): Promise<BrandData> {
  const row = await getDb().query.brandSettings.findFirst();
  if (!row) return DEFAULT_BRAND;
  return { ...DEFAULT_BRAND, ...(row.data as Partial<BrandData>) };
}

export async function saveBrand(data: BrandData) {
  const db = getDb();
  const row = await db.query.brandSettings.findFirst();
  if (row) {
    await db.update(brandSettings).set({ data }).where(eq(brandSettings.id, row.id));
  } else {
    await db.insert(brandSettings).values({ data });
  }
}

// ---------- loose brand assets (logo, photos, fonts — not tied to a job) ----------

export async function listBrandFiles() {
  const db = getDb();
  return db
    .select()
    .from(files)
    .where(eq(files.kind, "brand"))
    .orderBy(desc(files.createdAt));
}

export { isNull };
