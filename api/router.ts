import { createRouter, publicQuery } from "./middleware";
import { jobsRouter } from "./jobsRouter";
import { filesRouter } from "./filesRouter";
import { vaultRouter } from "./vaultRouter";
import { brandRouter } from "./brandRouter";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  jobs: jobsRouter,
  files: filesRouter,
  vault: vaultRouter,
  brand: brandRouter,
});

export type AppRouter = typeof appRouter;
