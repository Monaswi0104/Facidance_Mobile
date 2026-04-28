// Auto-detect: emulator uses 10.0.2.2, physical device uses localhost via adb reverse
import { Platform } from "react-native";
import DeviceInfo from "react-native-device-info";

const isEmulator = DeviceInfo.isEmulatorSync();
const HOST = isEmulator ? "10.0.2.2" : "localhost";

// Service-specific base URLs (matching Facidance deployed nginx proxy)
const PROD_URL = "https://facidance.online";
export const BASE_URL = `${PROD_URL}/auth`;       // nginx /auth/ → auth:8000
export const AUTH_URL = `${PROD_URL}/auth`;        // auth router prefix="/auth" → /auth/auth/login
export const ADMIN_URL = `${PROD_URL}/admin-api`;  // nginx /admin-api/ → admin:8001
export const TEACHER_URL = `${PROD_URL}/teacher-api`; // nginx /teacher-api/ → teacher:8002
export const STUDENT_URL = `${PROD_URL}/student-api`; // nginx /student-api/ → student:8003
export const WEB_URL = PROD_URL; // Direct to Next.js for specific web-only APIs

// Authenticated fetch wrapper — automatically injects JWT token
import { getToken } from "./authStorage";

export async function apiFetch(endpoint, options = {}, baseUrl = BASE_URL) {
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

  try {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    console.log(`[API ${options.method || 'GET'} ${endpoint}] Status:`, response.status);

    if (response.status === 401) {
      throw new Error("UNAUTHORIZED");
    }

    if (!response.ok) {
      const text = await response.text();
      console.log(`[API FAIL] Response text:`, text.substring(0, 200));
      // Re-construct the response as a simple object since 'Response' constructor might not be globally available in React Native
      return { 
        ok: false, 
        status: response.status, 
        headers: response.headers, 
        text: async () => text, 
        json: async () => {
          try {
            return JSON.parse(text);
          } catch (e) {
            return { error: text || `HTTP Error ${response.status}` };
          }
        }
      };
    }

    return response;
  } catch (err) {
    console.error(`[API NETWORK ERROR] ${options.method || 'GET'} ${endpoint} failed:`, err.message);
    throw err;
  }
}
