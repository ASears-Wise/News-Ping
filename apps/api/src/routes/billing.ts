import { Hono } from "hono";
import { requireAuth } from "../middleware/auth";
import type { Env, JWTPayload } from "../types";

const app = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

// Stripe is imported dynamically since we use the fetch-based client
async function getStripe(secretKey: string) {
  const Stripe = (await import("stripe")).default;
  return new Stripe(secretKey, { httpClient: Stripe.createFetchHttpClient() });
}

const PRICE_MAP: Record<string, { name: string; lookup: string }> = {
  pro_monthly: { name: "Pro Monthly", lookup: "pro_monthly" },
  pro_annual: { name: "Pro Annual", lookup: "pro_annual" },
  team_monthly: { name: "Team Monthly", lookup: "team_monthly" },
  team_annual: { name: "Team Annual", lookup: "team_annual" },
};

app.post("/checkout", requireAuth, async (c) => {
  const user = c.get("user");
  const { price_id, success_url, cancel_url } = await c.req.json<{
    price_id: string;
    success_url: string;
    cancel_url: string;
  }>();

  if (!price_id || !success_url || !cancel_url) {
    return c.json({ error: "Missing required fields" }, 400);
  }

  const stripe = await getStripe(c.env.STRIPE_SECRET_KEY);

  // Get or create Stripe customer
  let customerId: string | undefined;
  const dbUser = await c.env.DB.prepare("SELECT stripe_customer_id FROM users WHERE id = ?")
    .bind(user.sub)
    .first<{ stripe_customer_id: string | null }>();

  if (dbUser?.stripe_customer_id) {
    customerId = dbUser.stripe_customer_id;
  } else {
    const customer = await stripe.customers.create({ email: user.email, metadata: { user_id: user.sub } });
    customerId = customer.id;
    await c.env.DB.prepare("UPDATE users SET stripe_customer_id = ? WHERE id = ?")
      .bind(customerId, user.sub)
      .run();
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: price_id, quantity: 1 }],
    success_url,
    cancel_url,
    metadata: { user_id: user.sub },
  });

  return c.json({ url: session.url });
});

app.post("/portal", requireAuth, async (c) => {
  const user = c.get("user");
  const { return_url } = await c.req.json<{ return_url: string }>();

  const dbUser = await c.env.DB.prepare("SELECT stripe_customer_id FROM users WHERE id = ?")
    .bind(user.sub)
    .first<{ stripe_customer_id: string | null }>();

  if (!dbUser?.stripe_customer_id) {
    return c.json({ error: "No billing account found" }, 404);
  }

  const stripe = await getStripe(c.env.STRIPE_SECRET_KEY);
  const session = await stripe.billingPortal.sessions.create({
    customer: dbUser.stripe_customer_id,
    return_url,
  });

  return c.json({ url: session.url });
});

app.get("/subscription", requireAuth, async (c) => {
  const user = c.get("user");

  const sub = await c.env.DB.prepare(
    `SELECT id, stripe_price_id, status, current_period_start, current_period_end, cancel_at_period_end
     FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`
  )
    .bind(user.sub)
    .first();

  return c.json({ data: sub ?? null });
});

// Stripe webhook handler
app.post("/webhooks", async (c) => {
  const stripe = await getStripe(c.env.STRIPE_SECRET_KEY);
  const body = await c.req.text();
  const signature = c.req.header("stripe-signature");

  if (!signature) {
    return c.json({ error: "Missing signature" }, 400);
  }

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, c.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return c.json({ error: "Invalid signature" }, 400);
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object;
      const userId =
        sub.metadata?.user_id ??
        (
          await c.env.DB.prepare("SELECT id FROM users WHERE stripe_customer_id = ?")
            .bind(typeof sub.customer === "string" ? sub.customer : sub.customer)
            .first<{ id: string }>()
        )?.id;

      if (!userId) break;

      await c.env.DB.prepare(
        `INSERT INTO subscriptions (id, user_id, stripe_price_id, status, current_period_start, current_period_end, cancel_at_period_end)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET
           status = excluded.status,
           stripe_price_id = excluded.stripe_price_id,
           current_period_start = excluded.current_period_start,
           current_period_end = excluded.current_period_end,
           cancel_at_period_end = excluded.cancel_at_period_end,
           updated_at = datetime('now')`
      )
        .bind(
          sub.id,
          userId,
          sub.items.data[0]?.price.id ?? "",
          sub.status,
          new Date((sub as any).current_period_start * 1000).toISOString(),
          new Date((sub as any).current_period_end * 1000).toISOString(),
          sub.cancel_at_period_end ? 1 : 0
        )
        .run();

      // Invalidate cache
      await c.env.CACHE.delete(`sub:${userId}`);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      await c.env.DB.prepare("UPDATE subscriptions SET status = 'canceled', updated_at = datetime('now') WHERE id = ?")
        .bind(sub.id)
        .run();

      const userId = sub.metadata?.user_id;
      if (userId) await c.env.CACHE.delete(`sub:${userId}`);
      break;
    }
  }

  return c.json({ received: true });
});

export default app;
