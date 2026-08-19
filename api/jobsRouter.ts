import { z } from "zod";
import fs from "node:fs";
import { TRPCError } from "@trpc/server";
import { createRouter } from "./middleware";
import { authedQuery } from "./guard";
import {
  listJobs,
  getJob,
  createJob,
  setJobStatus,
  deleteJob,
  addMessage,
} from "./queries/drop";

const VALID_STATUSES = ["new", "downloading", "editing", "done", "failed", "cancelled"];

export const jobsRouter = createRouter({
  list: authedQuery.query(() => listJobs()),

  get: authedQuery.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const job = await getJob(input.id);
    if (!job) throw new TRPCError({ code: "NOT_FOUND" });
    return job;
  }),

  create: authedQuery
    .input(z.object({ title: z.string().min(1).max(255), instructions: z.string().optional() }))
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
