import { BASE_URL } from "./config";
import { saveToken, saveUser } from "./authStorage";

export async function loginUser(email, password) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Login failed");
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

export async function registerTeacher(name, email, password) {
  const response = await fetch(`${BASE_URL}/api/auth/register-teacher`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Registration failed");
  }

  return data;
}
