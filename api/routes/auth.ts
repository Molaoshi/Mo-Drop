import { Hono } from "hono";
import { config } from "../config";
import {
  sessionCookieHeader,
  clearCookieHeader,
  isAuthedRequest,
} from "../auth";

export const authRoutes = new Hono();

authRoutes.post("/login", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body?.password || body.password !== config.appPassword) {
    return c.json({ ok: false, error: "Wrong password" }, 401);
  }
  c.header("Set-Cookie", sessionCookieHeader());
  return c.json({ ok: true });
});

authRoutes.post("/logout", (c) => {
  c.header("Set-Cookie", clearCookieHeader());
  return c.json({ ok: true });
});

authRoutes.get("/me", (c) => {
  return c.json({ authed: isAuthedRequest(c.req.raw) });
});
