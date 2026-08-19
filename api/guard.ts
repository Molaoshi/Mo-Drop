import { TRPCError } from "@trpc/server";
import { publicQuery } from "./middleware";
import { isAuthedRequest } from "./auth";

// Cookie-authenticated tRPC procedure, built on top of the generated publicQuery.
export const authedQuery = publicQuery.use(({ ctx, next }) => {
  if (!isAuthedRequest(ctx.req)) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next();
});
