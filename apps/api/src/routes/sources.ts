import { Hono } from "hono";
import type { Env } from "../types";

const app = new Hono<{ Bindings: Env }>();

app.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, name, icon_url, color, app_package, is_active FROM sources ORDER BY name ASC"
  ).all();

  return c.json({ data: results });
});

export default app;
