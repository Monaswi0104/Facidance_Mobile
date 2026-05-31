import { getToken, clearAuth } from "./authStorage";

// ─── Production URLs (hardcoded for release builds) ──────────────────────────
export const FALLBACK_URLS = [
  "https://facidance.xyz/api-auth",
  "https://facidance.online/api-auth"
];

// Start with the first URL
export let BASE_URL = FALLBACK_URLS[0];

// Switch to the next fallback URL
export function switchBaseUrl() {
  const currentIndex = FALLBACK_URLS.indexOf(BASE_URL);
  const nextIndex = (currentIndex + 1) % FALLBACK_URLS.length;
  BASE_URL = FALLBACK_URLS[nextIndex];
  console.log(`[Network] Switched BASE_URL to: ${BASE_URL}`);
  return BASE_URL;
}
export const AUTH_URL = "https://facidance.xyz/api-auth";
export const ADMIN_URL = "https://facidance.xyz/admin-api";
export const TEACHER_URL = "https://facidance.xyz/teacher-api";
export const STUDENT_URL = "https://facidance.xyz/student-api";
export const WEB_URL = "https://facidance.xyz";

// To switch back to local dev, comment above and uncomment below:
// import { NativeModules, Platform } from "react-native";
// const DeviceInfo = require("react-native-device-info");
// const isEmu = DeviceInfo.isEmulatorSync();
// const HOST = (Platform.OS === "android" && isEmu) ? "10.0.2.2" : "127.0.0.1";
// export const BASE_URL = `http://${HOST}:8000`;
// export const AUTH_URL = `http://${HOST}:8000`;
// export const ADMIN_URL = `http://${HOST}:8001`;
// export const TEACHER_URL = `http://${HOST}:8002`;
// export const STUDENT_URL = `http://${HOST}:8003`;
// export const WEB_URL = `http://${HOST}:3000`;

// ─── Response Cache ────────────────────────────────────────────────────────────
interface CachedResponse {
  timestamp: number;
  response: Response;
}

const apiCache = new Map<string, CachedResponse>();
const CACHE_TTL = 30000; // 30 seconds

/**
 * Invalidate all cached API responses.
 * Call this after mutations (POST/PUT/DELETE) that affect cached data.
 */
export function invalidateCache(pattern?: string): void {
  if (!pattern) {
    apiCache.clear();
    return;
  }
  for (const key of apiCache.keys()) {
    if (key.includes(pattern)) apiCache.delete(key);
  }
}

// ─── Auth Session Listener (for 401 interceptor) ──────────────────────────────
// The navigation root sets this callback so we can force-logout from anywhere.
let _onSessionExpired: (() => void) | null = null;

/**
 * Register a callback that fires when the API receives a 401 Unauthorized.
 * Typically wired up in the root navigator to reset to the Login screen.
 */
export function setOnSessionExpired(callback: () => void): void {
  _onSessionExpired = callback;
}

// Prevents multiple simultaneous logout triggers
let _isHandlingExpiry = false;

async function handleSessionExpired(): Promise<void> {
  if (_isHandlingExpiry) return;
  _isHandlingExpiry = true;

  try {
    console.warn("[API Interceptor] Session expired (401). Clearing auth and redirecting to login.");
    await clearAuth();
    invalidateCache();

    if (_onSessionExpired) {
      _onSessionExpired();
    }
  } finally {
    // Small delay to prevent rapid re-triggers
    setTimeout(() => { _isHandlingExpiry = false; }, 2000);
  }
}

// ─── Request / Response Interceptors ──────────────────────────────────────────
interface InterceptorRequest {
  endpoint: string;
  options: RequestInit;
  baseUrl: string;
}

interface InterceptorResponse {
  ok: boolean;
  status: number;
  headers: Headers;
  text: () => Promise<string>;
  json: () => Promise<any>;
}

const _requestInterceptors: Array<(endpoint: string, options: RequestInit, baseUrl: string) => InterceptorRequest | void> = [];
const _responseInterceptors: Array<(response: any, endpoint: string, options: RequestInit) => any> = [];

/**
 * Add a request interceptor. Receives (endpoint, options, baseUrl) and must
 * return { endpoint, options, baseUrl } (possibly modified).
 */
export function addRequestInterceptor(fn: (endpoint: string, options: RequestInit, baseUrl: string) => InterceptorRequest | void): () => void {
  _requestInterceptors.push(fn);
  return () => {
    const idx = _requestInterceptors.indexOf(fn);
    if (idx !== -1) _requestInterceptors.splice(idx, 1);
  };
}

/**
 * Add a response interceptor. Receives (response, endpoint, options) and must
 * return the response (possibly modified).
 */
export function addResponseInterceptor(fn: (response: any, endpoint: string, options: RequestInit) => any): () => void {
  _responseInterceptors.push(fn);
  return () => {
    const idx = _responseInterceptors.indexOf(fn);
    if (idx !== -1) _responseInterceptors.splice(idx, 1);
  };
}

// ─── Core Fetch Wrapper ───────────────────────────────────────────────────────

/**
 * Authenticated fetch wrapper with:
 * - Automatic JWT injection
 * - GET response caching (30s TTL)
 * - Exponential backoff retries for 5xx / network errors
 * - 401 interception → auto-logout + redirect to Login
 * - Request/response interceptor pipeline
 */
export async function apiFetch(
  endpoint: string,
  options: RequestInit = {},
  baseUrl: string = BASE_URL,
  retries: number = 2
): Promise<Response> {
  // ── Run request interceptors ──
  let reqEndpoint = endpoint;
  let reqOptions = { ...options };
  let reqBaseUrl = baseUrl;

  for (const interceptor of _requestInterceptors) {
    try {
      const result = interceptor(reqEndpoint, reqOptions, reqBaseUrl);
      if (result) {
        reqEndpoint = result.endpoint ?? reqEndpoint;
        reqOptions = result.options ?? reqOptions;
        reqBaseUrl = result.baseUrl ?? reqBaseUrl;
      }
    } catch (e) {
      console.warn("[Request Interceptor] Error:", (e as Error).message);
    }
  }

  const isGet = !reqOptions.method || reqOptions.method.toUpperCase() === "GET";
  const cacheKey = `${reqBaseUrl}${reqEndpoint}`;

  // ── Cache check (GET only) ──
  if (isGet && apiCache.has(cacheKey)) {
    const cached = apiCache.get(cacheKey)!;
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`[API CACHE HIT] GET ${reqEndpoint}`);
      return cached.response.clone(); // Return a clone so .json() works multiple times
    } else {
      apiCache.delete(cacheKey);
    }
  }

  // ── Build headers ──
  const token = await getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(reqOptions.headers as Record<string, string> || {}),
  };

  // Don't override Content-Type for FormData
  if (reqOptions.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  // ── Retry loop with exponential backoff ──
  let backoffDelay = 1000; // start with 1 second

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${reqBaseUrl}${reqEndpoint}`, {
        ...reqOptions,
        headers,
      });

      console.log(`[API ${reqOptions.method || 'GET'} ${reqEndpoint}] Status:`, response.status);

      // ── 401 Interceptor: session expired ──
      if (response.status === 401) {
        handleSessionExpired(); // fire-and-forget, don't await
        throw new Error("UNAUTHORIZED");
      }

      // ── Non-OK responses ──
      if (!response.ok) {
        // Retry on 5xx server errors
        if (response.status >= 500 && attempt < retries) {
          throw new Error(`SERVER_ERROR_${response.status}`);
        }

        const text = await response.text();
        console.log(`[API FAIL] Response text:`, text.substring(0, 200));

        let errorResponse: InterceptorResponse = {
          ok: false,
          status: response.status,
          headers: response.headers,
          text: async () => text,
          json: async () => {
            try {
              return JSON.parse(text);
            } catch (e) {
              const isHtml = text.trim().startsWith("<");
              return { error: isHtml ? `Server returned an invalid HTML response (Status ${response.status}).` : (text || `HTTP Error ${response.status}`) };
            }
          }
        };

        // Run response interceptors on error responses too
        for (const interceptor of _responseInterceptors) {
          try {
            errorResponse = interceptor(errorResponse, reqEndpoint, reqOptions) || errorResponse;
          } catch (e) { /* skip */ }
        }

        return errorResponse as any;
      }

      // ── Cache successful GET responses ──
      if (response.ok && isGet) {
        apiCache.set(cacheKey, {
          timestamp: Date.now(),
          response: response.clone()
        });
      }

      // ── Run response interceptors ──
      let finalResponse = response;
      for (const interceptor of _responseInterceptors) {
        try {
          finalResponse = interceptor(finalResponse, reqEndpoint, reqOptions) || finalResponse;
        } catch (e) {
          console.warn("[Response Interceptor] Error:", (e as Error).message);
        }
      }

      return finalResponse;
    } catch (err) {
      if ((err as Error).message === "UNAUTHORIZED") {
        // Don't retry auth failures
        throw err;
      }

      if (attempt < retries) {
        console.warn(`[API RETRY ${attempt + 1}/${retries}] ${reqOptions.method || 'GET'} ${reqEndpoint} failed (${(err as Error).message}). Retrying in ${backoffDelay}ms...`);
        
        // Switch fallback URL if we hit a network error or 5xx server error
        if (reqBaseUrl === BASE_URL) {
          reqBaseUrl = switchBaseUrl();
        }

        await new Promise<void>(res => setTimeout(() => res(), backoffDelay));
        backoffDelay *= 2; // Exponential backoff
        continue;
      }
      console.error(`[API NETWORK ERROR] ${reqOptions.method || 'GET'} ${reqEndpoint} failed completely after ${attempt + 1} attempts:`, (err as Error).message);
      throw err;
    }
  }

  // This should never be reached, but TypeScript needs it
  throw new Error("Unexpected error in apiFetch");
}
