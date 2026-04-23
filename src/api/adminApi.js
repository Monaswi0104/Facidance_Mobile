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
    throw new Error(json.error || "Failed to delete teacher");
  }
  return json;
}

// Departments
export async function getDepartments() {
  const res = await apiFetch("/admin/departments", {}, ADMIN_URL);
  return await res.json();
}

export async function createDepartment(name) {
  const res = await apiFetch("/admin/departments", {
    method: "POST",
    body: JSON.stringify({ name }),
  }, ADMIN_URL);
  return await res.json();
}

export async function deleteDepartment(id) {
  const res = await apiFetch("/admin/departments", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  }, ADMIN_URL);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Failed to delete department");
  }
  return json;
}

// Programs
export async function getPrograms() {
  const res = await apiFetch("/admin/programs", {}, ADMIN_URL);
  return await res.json();
}

export async function createProgram(name, departmentId) {
  const res = await apiFetch("/admin/programs", {
    method: "POST",
    body: JSON.stringify({ name, departmentId }),
  }, ADMIN_URL);
  return await res.json();
}

export async function deleteProgram(id) {
  const res = await apiFetch("/admin/programs", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  }, ADMIN_URL);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Failed to delete program");
  }
  return json;
}

// Courses
export async function getCourses() {
  const res = await apiFetch("/admin/courses", {}, ADMIN_URL);
  return await res.json();
}

export async function createCourse(data) {
  const res = await apiFetch("/admin/courses", {
    method: "POST",
    body: JSON.stringify(data),
  }, ADMIN_URL);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || json.hint || "Failed to create course");
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
    throw new Error(json.error || "Failed to delete course");
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
    throw new Error(json.error || "Failed to update student");
  }
  return json;
}

export async function markStudentGraduated(id) {
  const res = await apiFetch(`/admin/students/${id}/graduate`, {
    method: "POST",
  }, ADMIN_URL);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Failed to graduate student");
  }
  return json;
}

export async function ungraduateStudent(id) {
  const res = await apiFetch(`/admin/students/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "active" }),
  }, ADMIN_URL);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Failed to activate student");
  }
  return json;
}

export async function deleteStudent(id) {
  const res = await apiFetch(`/admin/students/${id}`, {
    method: "DELETE",
  }, ADMIN_URL);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Failed to delete student");
  }
  return json;
}
