import fs from "node:fs";
import path from "node:path";
import { config } from "./config";

export function ensureDirs() {
  fs.mkdirSync(tmpDir(), { recursive: true });
}

export function tmpDir(): string {
  return path.join(config.uploadDir, ".tmp");
}

export function tmpPath(id: string): string {
  return path.join(tmpDir(), id);
}

function safeFilename(name: string): string {
  const cleaned = name.replace(/[^\w.\- ()\[\]#+@]+/g, "_").trim();
  return cleaned.slice(-180) || "file";
}

export function finalPath(id: string, filename: string): string {
  return path.join(config.uploadDir, `${id.slice(0, 8)}_${safeFilename(filename)}`);
}
