import { apiFetch } from "./config";
import { saveToken, saveUser } from "./authStorage";

/**
 * Safely parse a response body as JSON, falling back to a
 * { detail: <text> } object if the body is not valid JSON.
 */
async function safeJson(response: Response | any): Promise<any> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    const isHtml = text.trim().startsWith("<");
    return { 
      detail: isHtml 
        ? `Server returned an invalid HTML response (Status ${response.status}). The endpoint might be incorrect or down.` 
        : text || `HTTP Error ${response.status}` 
    };
  }
}

export async function loginUser(email: string, password: string): Promise<any> {
  const response = await apiFetch(`/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await safeJson(response);

  if (!response.ok) {
    throw new Error(data.detail || data.error || data.message || "Login failed");
  }

  // Save token and user info
  await saveToken(data.token);
  await saveUser({
    name: data.name,
    email: data.email,
    role: data.role,
  });

  return data; // { token, role, name, email, redirectUrl }
}

export async function registerTeacher(name: string, email: string, password: string): Promise<any> {
  const response = await apiFetch(`/auth/register-teacher`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });

  const data = await safeJson(response);

  if (!response.ok) {
    throw new Error(data.error || data.detail || "Registration failed");
  }

  return data;
}

