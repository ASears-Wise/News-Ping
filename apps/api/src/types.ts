export type Env = {
  DB: D1Database;
  CACHE: KVNamespace;
  STORAGE: R2Bucket;
  INGEST_API_KEY: string;
  JWT_SECRET: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  RESEND_API_KEY: string;
  ENVIRONMENT: string;
};

export type Source = {
  id: string;
  name: string;
  icon_url: string | null;
  color: string | null;
  app_package: string;
  is_active: number;
  created_at: string;
};

export type Notification = {
  id: string;
  source_id: string;
  title: string;
  body: string | null;
  big_text: string | null;
  category: string;
  image_url: string | null;
  deep_link: string | null;
  android_channel: string | null;
  raw_extras: string | null;
  dedup_hash: string;
  received_at: string;
  created_at: string;
};

export type NotificationWithSource = Notification & {
  source_name: string;
  source_icon_url: string | null;
  source_color: string | null;
};

export type User = {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
};

export type JWTPayload = {
  sub: string;
  email: string;
  iat: number;
  exp: number;
};
