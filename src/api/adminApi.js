import { apiFetch, ADMIN_URL } from "./config";

// Dashboard stats
export async function getAdminStats() {
  const res = await apiFetch("/admin/stats", {}, ADMIN_URL);
  return await res.json();
}

// Teachers
export async function getTeachers() {
  const res = await apiFetch("/admin/teachers", {}, ADMIN_URL);
  return await res.json();
}

export async function approveTeacher(userId, departmentId) {
  const res = await apiFetch("/admin/approve-teacher", {
    method: "POST",
    body: JSON.stringify({ userId, departmentId }),
  }, ADMIN_URL);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Failed to approve teacher");
  }
  return json;
}

export async function deleteTeacher(id) {
  const res = await apiFetch("/admin/teachers", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  }, ADMIN_URL);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || json.detail || "Failed to delete teacher");
  }
  return json;
}

// Departments
export async function getDepartments() {
  const res = await apiFetch("/admin/departments", {}, ADMIN_URL);
  return await res.json();
}

export async function createDepartment(name) {
  console.log("[adminApi] Creating department with name:", name);
  const res = await apiFetch("/admin/departments", {
    method: "POST",
    body: JSON.stringify({ name }),
  }, ADMIN_URL);
  const json = await res.json();
  console.log("[adminApi] Department create response:", json);
  if (!res.ok) {
    throw new Error(json.error || json.detail || "Failed to create department");
  }
  return json;
}

export async function deleteDepartment(id) {
  const res = await apiFetch("/admin/departments", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  }, ADMIN_URL);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || json.detail || "Failed to delete department");
  }
  return json;
}

// Programs
export async function getPrograms() {
  const res = await apiFetch("/admin/programs", {}, ADMIN_URL);
  return await res.json();
}

export async function createProgram(name, departmentId) {
  console.log("[adminApi] Creating program with name:", name, "departmentId:", departmentId);
  const res = await apiFetch("/admin/programs", {
    method: "POST",
    body: JSON.stringify({ name, departmentId }),
  }, ADMIN_URL);
  const json = await res.json();
  console.log("[adminApi] Program create response:", json);
  if (!res.ok) {
    throw new Error(json.error || json.detail || "Failed to create program");
  }
  return json;
}

export async function deleteProgram(id) {
  const res = await apiFetch("/admin/programs", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  }, ADMIN_URL);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || json.detail || "Failed to delete program");
  }
  return json;
}

// Courses
export async function getCourses() {
  const res = await apiFetch("/admin/courses", {}, ADMIN_URL);
  return await res.json();
}

export async function createCourse(data) {
  console.log("[adminApi] Creating course with data:", data);
  const res = await apiFetch("/admin/courses", {
    method: "POST",
    body: JSON.stringify(data),
  }, ADMIN_URL);
  const json = await res.json();
  console.log("[adminApi] Course create response:", json);
  if (!res.ok) {
    throw new Error(json.error || json.detail || json.hint || "Failed to create course");
  }
  return json;
}

export async function deleteCourse(id) {
  const res = await apiFetch("/admin/courses", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  }, ADMIN_URL);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || json.detail || "Failed to delete course");
  }
  return json;
}

// Students
export async function getStudents() {
  const res = await apiFetch("/admin/students", {}, ADMIN_URL);
  return await res.json();
}

export async function updateStudent(id, data) {
  const res = await apiFetch(`/admin/students/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  }, ADMIN_URL);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || json.detail || "Failed to update student");
  }
  return json;
}

export async function markStudentGraduated(id) {
  const res = await apiFetch(`/admin/students/${id}/graduate`, {
    method: "POST",
  }, ADMIN_URL);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || json.detail || "Failed to graduate student");
  }
  return json;
}

export async function ungraduateStudent(id) {
  // Try dedicated endpoint first
  try {
    const res = await apiFetch(`/admin/students/${id}/ungraduate`, {
      method: "POST",
    }, ADMIN_URL);
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || json.detail || "Failed to activate student");
    }
    return json;
  } catch (e) {
    // Fallback to generic PATCH if dedicated endpoint doesn't exist
    console.log("[adminApi] Dedicated endpoint failed, trying fallback:", e.message);
    const res = await apiFetch(`/admin/students/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "active" }),
    }, ADMIN_URL);
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || json.detail || "Failed to activate student");
    }
    return json;
  }
}

export async function deleteStudent(id) {
  const res = await apiFetch(`/admin/students/${id}`, {
    method: "DELETE",
  }, ADMIN_URL);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || json.detail || "Failed to delete student");
  }
  return json;
}
