import { z } from "zod";
import { createRouter } from "./middleware";
import { authedQuery } from "./guard";
import { getBrand, saveBrand, listBrandFiles } from "./queries/drop";

export const brandRouter = createRouter({
  get: authedQuery.query(() => getBrand()),

  update: authedQuery
    .input(
      z.object({
        primary: z.string().max(32),
        background: z.string().max(32),
        text: z.string().max(32),
        notes: z.string().max(8000),
      }),
    )
    .mutation(async ({ input }) => {
      await saveBrand(input);
    }),

  files: authedQuery.query(() => listBrandFiles()),
});
