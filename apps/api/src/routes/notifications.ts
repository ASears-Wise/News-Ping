import { Hono } from "hono";
import { requireAuth, requireSubscription } from "../middleware/auth";
import type { Env, JWTPayload } from "../types";

const app = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

app.use("/*", requireAuth, requireSubscription);

app.get("/", async (c) => {
  const source = c.req.query("source");
  const category = c.req.query("category");
  const q = c.req.query("q");
  const from = c.req.query("from");
  const to = c.req.query("to");
  const cursor = c.req.query("cursor");
  const limit = Math.min(parseInt(c.req.query("limit") ?? "50"), 100);

  // Full-text search path
  if (q) {
    let sql = `
      SELECT n.*, s.name as source_name, s.icon_url as source_icon_url, s.color as source_color
      FROM notifications n
      JOIN sources s ON n.source_id = s.id
      WHERE n.rowid IN (
        SELECT rowid FROM notifications_fts WHERE notifications_fts MATCH ?
      )
    `;
    const params: (string | number)[] = [q];

    if (source) {
      const sources = source.split(",");
      sql += ` AND n.source_id IN (${sources.map(() => "?").join(",")})`;
      params.push(...sources);
    }
    if (category) {
      sql += " AND n.category = ?";
      params.push(category);
    }
    if (from) {
      sql += " AND n.received_at >= ?";
      params.push(from);
    }
    if (to) {
      sql += " AND n.received_at <= ?";
      params.push(to);
    }
    if (cursor) {
      sql += " AND n.id < ?";
      params.push(cursor);
    }

    sql += " ORDER BY n.received_at DESC LIMIT ?";
    params.push(limit);

    const stmt = c.env.DB.prepare(sql);
    const { results } = await stmt.bind(...params).all();

    return c.json({
      data: results,
      next_cursor: results.length === limit ? (results[results.length - 1] as { id: string }).id : null,
    });
  }

  // Standard filtered query
  let sql = `
    SELECT n.*, s.name as source_name, s.icon_url as source_icon_url, s.color as source_color
    FROM notifications n
    JOIN sources s ON n.source_id = s.id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (source) {
    const sources = source.split(",");
    sql += ` AND n.source_id IN (${sources.map(() => "?").join(",")})`;
    params.push(...sources);
  }
  if (category) {
    sql += " AND n.category = ?";
    params.push(category);
  }
  if (from) {
    sql += " AND n.received_at >= ?";
    params.push(from);
  }
  if (to) {
    sql += " AND n.received_at <= ?";
    params.push(to);
  }
  if (cursor) {
    sql += " AND n.id < ?";
    params.push(cursor);
  }

  sql += " ORDER BY n.received_at DESC LIMIT ?";
  params.push(limit);

  const stmt = c.env.DB.prepare(sql);
  const { results } = await stmt.bind(...params).all();

  return c.json({
    data: results,
    next_cursor: results.length === limit ? (results[results.length - 1] as { id: string }).id : null,
  });
});

app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const result = await c.env.DB.prepare(
    `SELECT n.*, s.name as source_name, s.icon_url as source_icon_url, s.color as source_color
     FROM notifications n
     JOIN sources s ON n.source_id = s.id
     WHERE n.id = ?`
  )
    .bind(id)
    .first();

  if (!result) {
    return c.json({ error: "Notification not found" }, 404);
  }

  return c.json({ data: result });
});

export default app;
