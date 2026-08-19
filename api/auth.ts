import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "./config";

const COOKIE_NAME = "mo_drop_session";
const THIRTY_DAYS = 60 * 60 * 24 * 30;

function sign(payload: string): string {
  return createHmac("sha256", config.appPassword).update(payload).digest("base64url");
}

function verifySignature(payload: string, sig: string): boolean {
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function makeSessionToken(): string {
  const payload = `u1.${Date.now()}`;
  return `${payload}.${sign(payload)}`;
}

export function getCookie(req: Request, name: string): string | undefined {
  const raw = req.headers.get("cookie");
  if (!raw) return undefined;
  for (const part of raw.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return undefined;
}

export function isAuthedRequest(req: Request): boolean {
  const token = getCookie(req, COOKIE_NAME);
  if (!token) return false;
  const idx = token.lastIndexOf(".");
  if (idx < 0) return false;
  return verifySignature(token.slice(0, idx), token.slice(idx + 1));
}

export function isAgentRequest(req: Request): boolean {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(config.agentToken);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Browser OR agent token — used for file upload/download routes
export function isAllowedRequest(req: Request): boolean {
  return isAuthedRequest(req) || isAgentRequest(req);
}

export function sessionCookieHeader(): string {
  return `${COOKIE_NAME}=${encodeURIComponent(makeSessionToken())}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${THIRTY_DAYS}`;
}

export function clearCookieHeader(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
