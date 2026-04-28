import { apiFetch, ADMIN_URL } from "./config";

// Dashboard stats
export async function getAdminStats() {
  const res = await apiFetch("/admin/stats", {}, ADMIN_URL);
  return await res.json();
}

// Analytics – student count per program
export async function getProgramDistribution() {
  const res = await apiFetch("/admin/analytics/program-distribution", {}, ADMIN_URL);
  return await res.json();
}

// Analytics – courses and students per teacher
export async function getTeacherLoad() {
  const res = await apiFetch("/admin/analytics/teacher-load", {}, ADMIN_URL);
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
    body: JSON.stringify({ teacher_id: userId, department_id: departmentId }),
  }, ADMIN_URL);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Failed to approve teacher");
  }
  return json;
}

export async function deleteTeacher(id) {
  console.log("[adminApi] Deleting teacher with id:", id);
  const res = await apiFetch(`/admin/teachers/${id}`, {
    method: "DELETE",
  }, ADMIN_URL);
  const json = await res.json();
  console.log("[adminApi] Teacher delete response:", json);
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
  console.log("[adminApi] Deleting department with id:", id);
  const res = await apiFetch(`/admin/departments/${id}`, {
    method: "DELETE",
  }, ADMIN_URL);
  const json = await res.json();
  console.log("[adminApi] Department delete response:", json);
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
    body: JSON.stringify({ name, department_id: departmentId }),
  }, ADMIN_URL);
  const json = await res.json();
  console.log("[adminApi] Program create response:", json);
  if (!res.ok) {
    throw new Error(json.error || json.detail || "Failed to create program");
  }
  return json;
}

export async function deleteProgram(id) {
  console.log("[adminApi] Deleting program with id:", id);
  const res = await apiFetch(`/admin/programs/${id}`, {
    method: "DELETE",
  }, ADMIN_URL);
  const json = await res.json();
  console.log("[adminApi] Program delete response:", json);
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
  const backendData = {
    name: data.name,
    teacher_id: data.teacherId || data.teacher_id,
    program_id: data.programId || data.program_id,
    academic_year: data.academicYear || data.academic_year,
    semester_number: data.semesterNumber || data.semester_number,
  };
  const res = await apiFetch("/admin/courses", {
    method: "POST",
    body: JSON.stringify(backendData),
  }, ADMIN_URL);
  const json = await res.json();
  console.log("[adminApi] Course create response:", json);
  if (!res.ok) {
    throw new Error(json.error || json.detail || json.hint || "Failed to create course");
  }
  return json;
}

export async function deleteCourse(id) {
  console.log("[adminApi] Deleting course with id:", id);
  const res = await apiFetch(`/admin/courses/${id}`, {
    method: "DELETE",
  }, ADMIN_URL);
  const json = await res.json();
  console.log("[adminApi] Course delete response:", json);
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
  const backendData = {
    name: data.name,
    email: data.email,
    ...(data.programId && { program_id: data.programId }),
    ...(data.program_id && { program_id: data.program_id }),
  };
  const res = await apiFetch(`/admin/students/${id}`, {
    method: "PATCH",
    body: JSON.stringify(backendData),
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
  console.log("[adminApi] Deleting student with id:", id);
  const res = await apiFetch(`/admin/students/${id}`, {
    method: "DELETE",
  }, ADMIN_URL);
  const json = await res.json();
  console.log("[adminApi] Student delete response:", json);
  if (!res.ok) {
    throw new Error(json.error || json.detail || "Failed to delete student");
  }
  return json;
}
