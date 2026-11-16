/**
 * Typed fetch wrapper for the StockLume Express API.
 *
 *   const products = await apiClient.get<Product[]>("/products");
 *   const order    = await apiClient.post<Order>("/orders/123/submit");
 *
 * - Prefixes NEXT_PUBLIC_API_URL (e.g. http://localhost:4000/api)
 * - Attaches the Supabase access token as `Authorization: Bearer <token>`
 * - Unwraps the standard `{ success, data }` body and returns `data`
 * - Throws `ApiClientError` (with `code` + `status`) on any error response
 */
import { publicEnv } from "@/lib/env";
import { getAccessToken } from "@/lib/supabase/client";
import type { ApiResponse } from "@/types";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions extends Omit<RequestInit, "body" | "method"> {
  query?: Query;
  body?: unknown;
  /** Skip attaching the auth token (e.g. /health). */
  skipAuth?: boolean;
}

function buildUrl(path: string, query?: Query) {
  const base = publicEnv.apiUrl.replace(/\/$/, "");
  const url = new URL(`${base}${path.startsWith("/") ? path : `/${path}`}`);
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  });
  return url.toString();
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const { query, body, skipAuth, headers, ...rest } = options;
  const token = skipAuth ? null : await getAccessToken();

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      ...rest,
      method,
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiClientError("Cannot reach the StockLume API. Is it running?", "NETWORK_ERROR", 0);
  }

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!payload) {
    throw new ApiClientError(`Unexpected response (${response.status})`, "INVALID_RESPONSE", response.status);
  }
  if (!payload.success) {
    const { code, message, details } = payload.error;
    throw new ApiClientError(message, code, response.status, details);
  }
  return payload.data;
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>("GET", path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("POST", path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("PUT", path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("PATCH", path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) => request<T>("DELETE", path, options),
};
