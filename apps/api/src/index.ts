import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import type { Env } from "./types";
import ingest from "./routes/ingest";
import auth from "./routes/auth";
import notifications from "./routes/notifications";
import analytics from "./routes/analytics";
import billing from "./routes/billing";
import sources from "./routes/sources";

const app = new Hono<{ Bindings: Env }>();

app.use("/*", logger());
app.use(
  "/*",
  cors({
    origin: ["http://localhost:3000", "https://newsping.io", "https://www.newsping.io", "https://newsping-web.alec-629.workers.dev"],
    credentials: true,
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

// Health check
app.get("/", (c) => c.json({ status: "ok", service: "pushpulse-api" }));

// Routes
app.route("/api/ingest", ingest);
app.route("/api/auth", auth);
app.route("/api/notifications", notifications);
app.route("/api/analytics", analytics);
app.route("/api/billing", billing);
app.route("/api/sources", sources);

// 404 handler
app.notFound((c) => c.json({ error: "Not found" }, 404));

// Error handler
app.onError((err, c) => {
  console.error("Unhandled error:", err);
  return c.json({ error: "Internal server error" }, 500);
});

export default app;
