import { z } from "zod";
import { createRouter } from "./middleware";
import { authedQuery } from "./guard";
import { listSecretsMasked, upsertSecret, deleteSecret } from "./queries/drop";

// NOTE: values are write-only from the browser. The full value is only exposed
// via the agent-token API (api/routes/agent.ts), never through tRPC.
export const vaultRouter = createRouter({
  list: authedQuery.query(() => listSecretsMasked()),

  create: authedQuery
    .input(z.object({ name: z.string().min(1).max(128), value: z.string().min(1).max(4000) }))
    .mutation(async ({ input }) => {
      await upsertSecret(input.name.trim(), input.value.trim());
    }),

  delete: authedQuery.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await deleteSecret(input.id);
  }),
});
