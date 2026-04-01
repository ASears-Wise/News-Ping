import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

// Attach access token to every request
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Auto-refresh on 401
let refreshPromise: Promise<string | null> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (!refreshPromise) {
        refreshPromise = axios
          .post<{ access_token: string }>(`${API_BASE}/api/auth/refresh`, {}, { withCredentials: true })
          .then((r) => {
            accessToken = r.data.access_token;
            return accessToken;
          })
          .catch(() => {
            accessToken = null;
            return null;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newToken = await refreshPromise;
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  }
);

// --- Typed API helpers ---

export type Source = {
  id: string;
  name: string;
  icon_url: string | null;
  color: string | null;
  app_package: string;
  is_active: number;
};

export type Notification = {
  id: string;
  source_id: string;
  source_name: string;
  source_color: string | null;
  source_icon_url: string | null;
  title: string;
  body: string | null;
  big_text: string | null;
  category: string;
  image_url: string | null;
  deep_link: string | null;
  received_at: string;
};

export type NotificationsResponse = {
  data: Notification[];
  next_cursor: string | null;
};

export type User = {
  id: string;
  email: string;
  name: string | null;
};

export type Subscription = {
  id: string;
  stripe_price_id: string;
  status: string;
  current_period_end: string;
  cancel_at_period_end: number;
} | null;

export const authApi = {
  signup: (email: string, password: string, name?: string) =>
    api.post<{ access_token: string; user: User }>("/api/auth/signup", { email, password, name }),
  login: (email: string, password: string) =>
    api.post<{ access_token: string; user: User }>("/api/auth/login", { email, password }),
  logout: () => api.post("/api/auth/logout"),
  me: () => api.get<{ data: User }>("/api/auth/me"),
  refresh: () => api.post<{ access_token: string; user: User }>("/api/auth/refresh"),
};

export const notificationsApi = {
  list: (params: {
    source?: string;
    category?: string;
    q?: string;
    from?: string;
    to?: string;
    cursor?: string;
    limit?: number;
  }) => api.get<NotificationsResponse>("/api/notifications", { params }),
};

export const sourcesApi = {
  list: () => api.get<{ data: Source[] }>("/api/sources"),
};

export const analyticsApi = {
  frequency: (params: { days?: number; source?: string }) =>
    api.get<{ data: { source_id: string; date: string; count: number }[] }>("/api/analytics/frequency", { params }),
  timing: (params: { days?: number }) =>
    api.get<{ data: { source_id: string; hour: number; day_of_week: number; count: number }[] }>(
      "/api/analytics/timing",
      { params }
    ),
  categories: (params: { days?: number; source?: string }) =>
    api.get<{ data: { category: string; count: number }[] }>("/api/analytics/categories", { params }),
  sources: (params: { days?: number }) =>
    api.get<{
      data: { source_id: string; source_name: string; source_color: string; total: number; breaking_count: number }[];
    }>("/api/analytics/sources", { params }),
};

export const billingApi = {
  getSubscription: () => api.get<{ data: Subscription }>("/api/billing/subscription"),
  createCheckout: (priceId: string) =>
    api.post<{ url: string }>("/api/billing/checkout", {
      price_id: priceId,
      success_url: `${window.location.origin}/settings/billing?success=1`,
      cancel_url: `${window.location.origin}/pricing`,
    }),
  createPortal: () =>
    api.post<{ url: string }>("/api/billing/portal", {
      return_url: `${window.location.origin}/settings/billing`,
    }),
};
