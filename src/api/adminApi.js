import { apiFetch } from "./config";

// Dashboard stats
export async function getAdminStats() {
  const res = await apiFetch("/api/admin/stats");
  return await res.json();
}

// Teachers
export async function getTeachers() {
  const res = await apiFetch("/api/admin/teachers");
  return await res.json();
}

export async function approveTeacher(userId, departmentId) {
  const res = await apiFetch("/api/admin/approve-teacher", {
    method: "POST",
    body: JSON.stringify({ userId, departmentId }),
  });
  return await res.json();
}

export async function deleteTeacher(id) {
  const res = await apiFetch("/api/admin/teachers", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  });
  return await res.json();
}

// Departments
export async function getDepartments() {
  const res = await apiFetch("/api/admin/departments");
  return await res.json();
}

export async function createDepartment(name) {
  const res = await apiFetch("/api/admin/departments", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return await res.json();
}

export async function deleteDepartment(id) {
  const res = await apiFetch("/api/admin/departments", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  });
  return await res.json();
}

// Programs
export async function getPrograms() {
  const res = await apiFetch("/api/admin/programs");
  return await res.json();
}

export async function createProgram(name, departmentId) {
  const res = await apiFetch("/api/admin/programs", {
    method: "POST",
    body: JSON.stringify({ name, departmentId }),
  });
  return await res.json();
}

export async function deleteProgram(id) {
  const res = await apiFetch("/api/admin/programs", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  });
  return await res.json();
}

// Courses
export async function getCourses() {
  const res = await apiFetch("/api/admin/courses");
  return await res.json();
}

export async function deleteCourse(id) {
  const res = await apiFetch("/api/admin/courses", {
    method: "DELETE",
    body: JSON.stringify({ id }),
  });
  return await res.json();
}

// Students
export async function getStudents() {
  const res = await apiFetch("/api/admin/students");
  return await res.json();
}
