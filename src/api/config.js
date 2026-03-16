// Base URL for the GUAttend backend
// For Android emulator accessing localhost, use 10.0.2.2
// For physical device, use your computer's local IP (e.g., 192.168.x.x)
// For deployed backend, use the production URL

export const BASE_URL = "http://192.168.1.9:3000";

// Authenticated fetch wrapper — automatically injects JWT token
import { getToken } from "./authStorage";

export async function apiFetch(endpoint, options = {}) {
  const token = await getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // Don't override Content-Type for FormData
  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // If unauthorized, could trigger logout
  if (response.status === 401) {
    throw new Error("UNAUTHORIZED");
  }

  return response;
}
