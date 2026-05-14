/**
 * Custom fetchBaseQuery wrapper with automatic JWT injection
 * and 401 session-expired handling.
 */
import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { getToken, clearAuth } from "../../api/authStorage";
import { ADMIN_URL } from "../../api/config";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: ADMIN_URL,
  prepareHeaders: async (headers) => {
    const token = await getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

/**
 * Wraps the base query to handle 401 responses globally.
 * On 401, clears stored auth and lets the app's session-expired
 * listener (from config.ts) handle the redirect to Login.
 */
export const baseQueryWithAuth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    console.warn("[RTK Query] 401 received — clearing auth.");
    await clearAuth();
  }

  return result;
};
