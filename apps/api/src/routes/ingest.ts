import { Hono } from "hono";
import { ulid } from "ulid";
import { sha256 } from "../lib/crypto";
import { categorize } from "../lib/categorize";
import { requireIngestKey } from "../middleware/auth";
import type { Env } from "../types";

const app = new Hono<{ Bindings: Env }>();

app.use("/*", requireIngestKey);

type IngestPayload = {
  source_id: string;
  title: string;
  body?: string;
  big_text?: string;
  android_channel?: string;
  deep_link?: string;
  image_base64?: string;
  raw_extras?: Record<string, unknown>;
  received_at: string;
};

app.post("/notification", async (c) => {
  const payload = await c.req.json<IngestPayload>();

  if (!payload.source_id || !payload.title || !payload.received_at) {
    return c.json({ error: "Missing required fields: source_id, title, received_at" }, 400);
  }

  // Verify source exists
  const source = await c.env.DB.prepare("SELECT id FROM sources WHERE id = ? AND is_active = 1")
    .bind(payload.source_id)
    .first();

  if (!source) {
    return c.json({ error: `Unknown or inactive source: ${payload.source_id}` }, 400);
  }

  // Compute dedup hash
  const dedupInput = `${payload.source_id}:${payload.title}:${payload.body ?? ""}`;
  const dedupHash = await sha256(dedupInput);

  // Categorize
  const category = categorize(payload.title, payload.body ?? null, payload.android_channel ?? null);

  // Upload image to R2 if provided
  let imageUrl: string | null = null;
  if (payload.image_base64) {
    const imageBytes = Uint8Array.from(atob(payload.image_base64), (c) => c.charCodeAt(0));
    const imageKey = `notifications/${payload.source_id}/${Date.now()}.png`;
    await c.env.STORAGE.put(imageKey, imageBytes, {
      httpMetadata: { contentType: "image/png" },
    });
    imageUrl = imageKey;
  }

  const id = ulid();

  // INSERT OR IGNORE for dedup
  const result = await c.env.DB.prepare(
    `INSERT OR IGNORE INTO notifications
     (id, source_id, title, body, big_text, category, image_url, deep_link, android_channel, raw_extras, dedup_hash, received_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      payload.source_id,
      payload.title,
      payload.body ?? null,
      payload.big_text ?? null,
      category,
      imageUrl,
      payload.deep_link ?? null,
      payload.android_channel ?? null,
      payload.raw_extras ? JSON.stringify(payload.raw_extras) : null,
      dedupHash,
      payload.received_at
    )
    .run();

  if (result.meta.changes === 0) {
    return c.json({ status: "duplicate", id: null });
  }

  return c.json({ status: "created", id, category }, 201);
});

type HeartbeatPayload = {
  emulator_id: string;
  sources: string[];
};

app.post("/heartbeat", async (c) => {
  const payload = await c.req.json<HeartbeatPayload>();

  if (!payload.emulator_id || !payload.sources?.length) {
    return c.json({ error: "Missing required fields: emulator_id, sources" }, 400);
  }

  const now = new Date().toISOString();
  const stmt = c.env.DB.prepare(
    `INSERT INTO emulator_heartbeats (emulator_id, source_id, last_heartbeat_at, status)
     VALUES (?, ?, ?, 'healthy')
     ON CONFLICT (emulator_id, source_id)
     DO UPDATE SET last_heartbeat_at = ?, status = 'healthy'`
  );

  const batch = payload.sources.map((sourceId) => stmt.bind(payload.emulator_id, sourceId, now, now));
  await c.env.DB.batch(batch);

  return c.json({ status: "ok" });
});

export default app;
