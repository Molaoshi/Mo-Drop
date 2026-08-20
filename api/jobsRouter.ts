import { z } from "zod";
import fs from "node:fs";
import { TRPCError } from "@trpc/server";
import { createRouter } from "./middleware";
import { authedQuery } from "./guard";
import { DEFAULT_JOB_SPEC } from "@contracts/types";
import {
  listJobs,
  getJob,
  createJob,
  setJobStatus,
  deleteJob,
  addMessage,
  listPresets,
} from "./queries/drop";

const VALID_STATUSES = ["new", "downloading", "editing", "done", "failed", "cancelled"];

// Structured New Job spec. Loose object with defaults so old clients and
// future extra fields both keep working.
const jobSpecSchema = z
  .object({
    preset: z.string().max(64).default(DEFAULT_JOB_SPEC.preset),
    spokenLanguage: z.enum(["ar", "en", "zh", "mixed"]).default(DEFAULT_JOB_SPEC.spokenLanguage),
    subtitles: z.array(z.enum(["ar", "en", "zh"])).max(3).default(DEFAULT_JOB_SPEC.subtitles),
    music: z.enum(["cinematic", "upbeat", "arabic", "none"]).default(DEFAULT_JOB_SPEC.music),
    titleCard: z
      .object({ enabled: z.boolean().default(true), hook: z.string().max(300).default("") })
      .default(DEFAULT_JOB_SPEC.titleCard),
    aiBroll: z
      .object({ enabled: z.boolean().default(false), prompt: z.string().max(500).default("") })
      .default(DEFAULT_JOB_SPEC.aiBroll),
    stockBroll: z
      .object({ enabled: z.boolean().default(false), keywords: z.string().max(300).default("") })
      .default(DEFAULT_JOB_SPEC.stockBroll),
    titleBar: z.string().max(200).default(""),
    endCard: z.enum(["auto", "en", "zh", "ar", "none"]).default(DEFAULT_JOB_SPEC.endCard),
  })
  .optional();

export const jobsRouter = createRouter({
  list: authedQuery.query(() => listJobs()),

  get: authedQuery.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const job = await getJob(input.id);
    if (!job) throw new TRPCError({ code: "NOT_FOUND" });
    return job;
  }),

  // Everything the New Job form needs: style presets (with agent instructions)
  // and the current default spec.
  formMeta: authedQuery.query(async () => ({
    presets: (await listPresets()).map((p) => ({ key: p.key, label: p.label })),
    defaults: DEFAULT_JOB_SPEC,
  })),

  create: authedQuery
    .input(
      z.object({
        title: z.string().min(1).max(255),
        instructions: z.string().optional(),
        spec: jobSpecSchema,
      }),
    )
    .mutation(({ input }) => createJob(input)),

  addMessage: authedQuery
    .input(z.object({ jobId: z.number(), body: z.string().min(1).max(5000) }))
    .mutation(async ({ input }) => {
      await addMessage({ jobId: input.jobId, author: "mo", body: input.body });
    }),

  setStatus: authedQuery
    .input(z.object({ id: z.number(), status: z.enum(VALID_STATUSES as [string, ...string[]]) }))
    .mutation(async ({ input }) => {
      await setJobStatus(input.id, input.status);
    }),

  delete: authedQuery.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const jobFiles = await deleteJob(input.id);
    for (const f of jobFiles) {
      try {
        fs.unlinkSync(f.storagePath);
      } catch {
        // file may already be gone — not fatal
      }
    }
  }),
});
