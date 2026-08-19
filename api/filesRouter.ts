import { z } from "zod";
import fs from "node:fs";
import { createRouter } from "./middleware";
import { authedQuery } from "./guard";
import { listFiles, deleteFileRow } from "./queries/drop";

export const filesRouter = createRouter({
  list: authedQuery
    .input(z.object({ kind: z.string().optional() }).optional())
    .query(({ input }) => listFiles(input?.kind)),

  delete: authedQuery.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    const row = await deleteFileRow(input.id);
    if (row) {
      try {
        fs.unlinkSync(row.storagePath);
      } catch {
        // already gone
      }
    }
    return { ok: true };
  }),
});
