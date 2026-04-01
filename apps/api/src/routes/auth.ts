import { Hono } from "hono";
import { ulid } from "ulid";
import { hashPassword, verifyPassword, sha256, signJWT } from "../lib/crypto";
import { requireAuth } from "../middleware/auth";
import type { Env, JWTPayload, User } from "../types";

const app = new Hono<{ Bindings: Env; Variables: { user: JWTPayload } }>();

const ACCESS_TOKEN_TTL = 15 * 60; // 15 minutes
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days

async function generateTokens(user: Pick<User, "id" | "email">, env: Env) {
  const now = Math.floor(Date.now() / 1000);
  const accessToken = await signJWT(
    { sub: user.id, email: user.email, iat: now, exp: now + ACCESS_TOKEN_TTL },
    env.JWT_SECRET
  );

  const refreshTokenRaw = crypto.randomUUID();
  const refreshTokenHash = await sha256(refreshTokenRaw);
  const refreshTokenId = ulid();

  await env.DB.prepare(
    "INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)"
  )
    .bind(refreshTokenId, user.id, refreshTokenHash, new Date((now + REFRESH_TOKEN_TTL) * 1000).toISOString())
    .run();

  return { accessToken, refreshToken: refreshTokenRaw };
}

function setRefreshCookie(c: { header: (name: string, value: string) => void }, token: string) {
  c.header(
    "Set-Cookie",
    `refresh_token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=${REFRESH_TOKEN_TTL}`
  );
}

function clearRefreshCookie(c: { header: (name: string, value: string) => void }) {
  c.header(
    "Set-Cookie",
    "refresh_token=; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=0"
  );
}

app.post("/signup", async (c) => {
  const { email, password, name } = await c.req.json<{ email: string; password: string; name?: string }>();

  if (!email || !password) {
    return c.json({ error: "Email and password are required" }, 400);
  }
  if (password.length < 8) {
    return c.json({ error: "Password must be at least 8 characters" }, 400);
  }

  const existing = await c.env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email.toLowerCase()).first();
  if (existing) {
    return c.json({ error: "Email already registered" }, 409);
  }

  const id = ulid();
  const passwordHash = await hashPassword(password);

  await c.env.DB.prepare("INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)")
    .bind(id, email.toLowerCase(), passwordHash, name ?? null)
    .run();

  const tokens = await generateTokens({ id, email: email.toLowerCase() }, c.env);
  setRefreshCookie(c, tokens.refreshToken);

  return c.json({ access_token: tokens.accessToken, user: { id, email: email.toLowerCase(), name: name ?? null } }, 201);
});

app.post("/login", async (c) => {
  const { email, password } = await c.req.json<{ email: string; password: string }>();

  if (!email || !password) {
    return c.json({ error: "Email and password are required" }, 400);
  }

  const user = await c.env.DB.prepare("SELECT id, email, password_hash, name FROM users WHERE email = ?")
    .bind(email.toLowerCase())
    .first<Pick<User, "id" | "email" | "password_hash" | "name">>();

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const tokens = await generateTokens(user, c.env);
  setRefreshCookie(c, tokens.refreshToken);

  return c.json({ access_token: tokens.accessToken, user: { id: user.id, email: user.email, name: user.name } });
});

app.post("/refresh", async (c) => {
  const cookie = c.req.header("Cookie");
  const refreshToken = cookie
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("refresh_token="))
    ?.split("=")[1];

  if (!refreshToken) {
    return c.json({ error: "No refresh token" }, 401);
  }

  const tokenHash = await sha256(refreshToken);
  const stored = await c.env.DB.prepare(
    "SELECT rt.id, rt.user_id, rt.expires_at, u.email, u.name FROM refresh_tokens rt JOIN users u ON rt.user_id = u.id WHERE rt.token_hash = ? AND rt.revoked_at IS NULL"
  )
    .bind(tokenHash)
    .first<{ id: string; user_id: string; expires_at: string; email: string; name: string | null }>();

  if (!stored || new Date(stored.expires_at) < new Date()) {
    clearRefreshCookie(c);
    return c.json({ error: "Invalid or expired refresh token" }, 401);
  }

  // Revoke old token
  await c.env.DB.prepare("UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE id = ?")
    .bind(stored.id)
    .run();

  // Issue new tokens
  const tokens = await generateTokens({ id: stored.user_id, email: stored.email }, c.env);
  setRefreshCookie(c, tokens.refreshToken);

  return c.json({ access_token: tokens.accessToken, user: { id: stored.user_id, email: stored.email, name: stored.name } });
});

app.post("/logout", async (c) => {
  const cookie = c.req.header("Cookie");
  const refreshToken = cookie
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("refresh_token="))
    ?.split("=")[1];

  if (refreshToken) {
    const tokenHash = await sha256(refreshToken);
    await c.env.DB.prepare("UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE token_hash = ?")
      .bind(tokenHash)
      .run();
  }

  clearRefreshCookie(c);
  return c.json({ status: "ok" });
});

app.post("/forgot-password", async (c) => {
  const { email } = await c.req.json<{ email: string }>();

  if (!email) {
    return c.json({ error: "Email is required" }, 400);
  }

  const user = await c.env.DB.prepare("SELECT id, email, name FROM users WHERE email = ?")
    .bind(email.toLowerCase())
    .first<Pick<User, "id" | "email" | "name">>();

  // Always return success to prevent user enumeration
  if (!user) {
    return c.json({ status: "ok" });
  }

  // Expire any existing unused tokens for this user
  await c.env.DB.prepare(
    "UPDATE password_reset_tokens SET used_at = datetime('now') WHERE user_id = ? AND used_at IS NULL"
  )
    .bind(user.id)
    .run();

  const tokenRaw = crypto.randomUUID();
  const tokenHash = await sha256(tokenRaw);
  const tokenId = ulid();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  await c.env.DB.prepare(
    "INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)"
  )
    .bind(tokenId, user.id, tokenHash, expiresAt)
    .run();

  const origin = c.req.header("Origin") ?? "https://newsping.io";
  const resetUrl = `${origin}/reset-password?token=${tokenRaw}`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${c.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "NewsPing <noreply@newsping.io>",
      to: user.email,
      subject: "Reset your NewsPing password",
      html: `
        <p>Hi${user.name ? ` ${user.name}` : ""},</p>
        <p>We received a request to reset your NewsPing password. Click the link below to set a new password. This link expires in 1 hour.</p>
        <p><a href="${resetUrl}" style="background:#1a1a1a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Reset password</a></p>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <p style="color:#888;font-size:12px;">NewsPing · newsping.io</p>
      `,
    }),
  });

  return c.json({ status: "ok" });
});

app.post("/reset-password", async (c) => {
  const { token, password } = await c.req.json<{ token: string; password: string }>();

  if (!token || !password) {
    return c.json({ error: "Token and password are required" }, 400);
  }
  if (password.length < 8) {
    return c.json({ error: "Password must be at least 8 characters" }, 400);
  }

  const tokenHash = await sha256(token);
  const stored = await c.env.DB.prepare(
    "SELECT id, user_id, expires_at FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL"
  )
    .bind(tokenHash)
    .first<{ id: string; user_id: string; expires_at: string }>();

  if (!stored || new Date(stored.expires_at) < new Date()) {
    return c.json({ error: "Invalid or expired reset token" }, 400);
  }

  const passwordHash = await hashPassword(password);

  await c.env.DB.batch([
    c.env.DB.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?").bind(
      passwordHash,
      stored.user_id
    ),
    c.env.DB.prepare("UPDATE password_reset_tokens SET used_at = datetime('now') WHERE id = ?").bind(stored.id),
    // Revoke all refresh tokens so existing sessions are invalidated
    c.env.DB.prepare(
      "UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL"
    ).bind(stored.user_id),
  ]);

  return c.json({ status: "ok" });
});

app.get("/me", requireAuth, async (c) => {
  const payload = c.get("user");
  const user = await c.env.DB.prepare("SELECT id, email, name, created_at FROM users WHERE id = ?")
    .bind(payload.sub)
    .first();

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json({ data: user });
});

export default app;
