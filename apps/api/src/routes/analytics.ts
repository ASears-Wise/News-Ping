import { Hono } from "hono";
import { requireAuth, requireSubscription } from "../middleware/auth";
import type { Env, JWTPayload } from "../types";

const app = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

app.use("/*", requireAuth, requireSubscription);

// Notification frequency by source over time
app.get("/frequency", async (c) => {
  const days = parseInt(c.req.query("days") ?? "30");
  const source = c.req.query("source");

  let sql = `
    SELECT
      source_id,
      date(received_at) as date,
      COUNT(*) as count
    FROM notifications
    WHERE received_at >= datetime('now', ?)
  `;
  const params: (string | number)[] = [`-${days} days`];

  if (source) {
    const sources = source.split(",");
    sql += ` AND source_id IN (${sources.map(() => "?").join(",")})`;
    params.push(...sources);
  }

  sql += " GROUP BY source_id, date(received_at) ORDER BY date ASC";

  const { results } = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json({ data: results });
});

// Hour-of-day distribution (heatmap)
app.get("/timing", async (c) => {
  const days = parseInt(c.req.query("days") ?? "30");

  const { results } = await c.env.DB.prepare(`
    SELECT
      source_id,
      CAST(strftime('%H', received_at) AS INTEGER) as hour,
      CAST(strftime('%w', received_at) AS INTEGER) as day_of_week,
      COUNT(*) as count
    FROM notifications
    WHERE received_at >= datetime('now', ?)
    GROUP BY source_id, hour, day_of_week
    ORDER BY day_of_week, hour
  `)
    .bind(`-${days} days`)
    .all();

  return c.json({ data: results });
});

// Category breakdown
app.get("/categories", async (c) => {
  const days = parseInt(c.req.query("days") ?? "30");
  const source = c.req.query("source");

  let sql = `
    SELECT category, COUNT(*) as count
    FROM notifications
    WHERE received_at >= datetime('now', ?)
  `;
  const params: (string | number)[] = [`-${days} days`];

  if (source) {
    const sources = source.split(",");
    sql += ` AND source_id IN (${sources.map(() => "?").join(",")})`;
    params.push(...sources);
  }

  sql += " GROUP BY category ORDER BY count DESC";

  const { results } = await c.env.DB.prepare(sql).bind(...params).all();
  return c.json({ data: results });
});

// Comparative source stats
app.get("/sources", async (c) => {
  const days = parseInt(c.req.query("days") ?? "30");

  const { results } = await c.env.DB.prepare(`
    SELECT
      n.source_id,
      s.name as source_name,
      s.color as source_color,
      COUNT(*) as total,
      COUNT(CASE WHEN n.category = 'breaking' THEN 1 END) as breaking_count,
      MIN(n.received_at) as earliest,
      MAX(n.received_at) as latest
    FROM notifications n
    JOIN sources s ON n.source_id = s.id
    WHERE n.received_at >= datetime('now', ?)
    GROUP BY n.source_id
    ORDER BY total DESC
  `)
    .bind(`-${days} days`)
    .all();

  return c.json({ data: results });
});

export default app;
