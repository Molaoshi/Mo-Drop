import path from "node:path";

// App-level config. Values come from env; the fallbacks are for local dev/preview only.
// On Railway, set APP_PASSWORD and AGENT_TOKEN to real secrets.
export const config = {
  appPassword: process.env.APP_PASSWORD || "mo-drop-2026",
  agentToken: process.env.AGENT_TOKEN || "dev-agent-token-change-me",
  uploadDir: process.env.UPLOAD_DIR || path.resolve(process.cwd(), "data", "uploads"),
  chunkSize: 2 * 1024 * 1024, // 2 MB — progress shows sooner on flaky links, retries are cheap
};
