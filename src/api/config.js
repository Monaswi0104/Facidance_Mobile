// Auto-detect: emulator uses 10.0.2.2, physical device uses localhost via adb reverse
import { Platform } from "react-native";
import DeviceInfo from "react-native-device-info";

const isEmulator = DeviceInfo.isEmulatorSync();
export const BASE_URL = isEmulator
  ? "http://10.0.2.2:3000"
  : "http://localhost:3000";

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
