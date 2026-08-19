import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { authRoutes } from "./routes/auth";
import { uploadRoutes } from "./routes/uploads";
import { fileRoutes } from "./routes/files";
import { agentRoutes } from "./routes/agent";

// Raw (non-tRPC) HTTP routes: login, chunked uploads, file downloads, agent API.
// Mounted before the /api/* 404 catch-all in boot.ts.
export function mountApiRoutes(app: Hono<{ Bindings: HttpBindings }>) {
  app.route("/api/auth", authRoutes);
  app.route("/api/uploads", uploadRoutes);
  app.route("/api/files", fileRoutes);
  app.route("/api/agent", agentRoutes);
}
