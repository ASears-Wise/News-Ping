import { Context, Next } from "hono";
import { verifyJWT } from "../lib/crypto";
import type { Env, JWTPayload } from "../types";

export async function requireAuth(c: Context<{ Bindings: Env; Variables: { user: JWTPayload } }>, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing or invalid Authorization header" }, 401);
  }

  const token = authHeader.slice(7);
  const payload = await verifyJWT<JWTPayload>(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  c.set("user", payload);
  await next();
}

export async function requireSubscription(
  c: Context<{ Bindings: Env; Variables: { user: JWTPayload } }>,
  next: Next
) {
  const user = c.get("user");

  // Check KV cache first
  const cacheKey = `sub:${user.sub}`;
  const cached = await c.env.CACHE.get(cacheKey);
  if (cached === "active") {
    await next();
    return;
  }

  // Check D1
  const sub = await c.env.DB.prepare(
    "SELECT status FROM subscriptions WHERE user_id = ? AND status IN ('active', 'trialing') LIMIT 1"
  )
    .bind(user.sub)
    .first<{ status: string }>();

  if (!sub) {
    return c.json({ error: "Active subscription required" }, 403);
  }

  // Cache for 5 minutes
  await c.env.CACHE.put(cacheKey, "active", { expirationTtl: 300 });
  await next();
}

export async function requireIngestKey(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Missing API key" }, 401);
  }

  const key = authHeader.slice(7);
  if (key !== c.env.INGEST_API_KEY) {
    return c.json({ error: "Invalid API key" }, 401);
  }

  await next();
}
