import { apiFetch, TEACHER_URL, ADMIN_URL } from "./config";

// Teacher profile
export async function getTeacherMe() {
  const res = await apiFetch("/teacher/me", {}, TEACHER_URL);
  return await res.json();
}

// Teacher stats
export async function getTeacherStats() {
  const res = await apiFetch("/teacher/stats", {}, TEACHER_URL);
  return await res.json();
}

// Teacher courses
export async function getTeacherCourses() {
  const res = await apiFetch("/teacher/courses", {}, TEACHER_URL);
  return await res.json();
}

// Students enrolled in a course
export async function getCourseStudents(courseId) {
  const res = await apiFetch(`/teacher/students?course_id=${courseId}`, {}, TEACHER_URL);
  return await res.json();
}

// Full course details — fetches students for a specific course
export async function getCourseDetails(courseId) {
  const res = await apiFetch(`/teacher/courses/${courseId}/students`, {}, TEACHER_URL);
  return await res.json();
}

// Attendance for a course
export async function getCourseAttendance(courseId) {
  const res = await apiFetch(`/teacher/attendance/history?course_id=${courseId}`, {}, TEACHER_URL);
  return await res.json();
}

// Reports
export async function getTeacherReports(courseId, startDate, endDate) {
  let url = `/teacher/reports?course_id=${courseId}`;
  if (startDate) url += `&start_date=${startDate}`;
  if (endDate) url += `&end_date=${endDate}`;
  const res = await apiFetch(url, {}, TEACHER_URL);
  return await res.json();
}

// Get all programs (for student import) — extracted from teacher's own hierarchy
export async function getAllPrograms() {
  const hierarchy = await getHierarchy();
  const departments = hierarchy?.departments || [];
  const programs = [];
  const seen = new Set();
  for (const dept of departments) {
    const progs = Array.isArray(dept.programs) ? dept.programs : Object.values(dept.programs || {});
    for (const p of progs) {
      if (!seen.has(p.id)) {
        seen.add(p.id);
        programs.push({ id: p.id, name: p.name, departmentId: p.departmentId });
      }
    }
  }
  return programs;
}

// Hierarchy (departments > programs > semesters)
export async function getHierarchy() {
  const res = await apiFetch("/teacher/hierarchy", {}, TEACHER_URL);
  return await res.json();
}

// Import students into a course
export async function importStudentsCsv(courseId, students) {
  const res = await apiFetch(`/teacher/courses/${courseId}/import`, {
    method: "POST",
    body: JSON.stringify({ students }),
  }, TEACHER_URL);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || "Failed to import students");
  }
  return json;
}

// ─── Attendance APIs ───────────────────────────────────────

// Get students for attendance marking (with training status)
export async function getAttendanceStudents(courseId) {
  const res = await apiFetch("/teacher/attendance/get-students", {
    method: "POST",
    body: JSON.stringify({ courseId }),
  }, TEACHER_URL);
  return await res.json();
}

// Trigger model training for a course
export async function trainModel(courseId) {
  const res = await apiFetch("/teacher/attendance/run-training", {
    method: "POST",
    body: JSON.stringify({ courseId }),
  }, TEACHER_URL);
  return await res.json();
}

// Send camera frame(s) for face recognition
// frames: array of { uri, type, name } objects
export async function recognizeFaces(courseId, frames, batchId = null, autoSubmit = false) {
  const formData = new FormData();
  formData.append("course_id", courseId);
  if (batchId) formData.append("batch_id", batchId);
  formData.append("auto_submit", autoSubmit.toString());

  frames.forEach((frame, i) => {
    formData.append("frames", {
      uri: frame.uri,
      type: frame.type || "image/jpeg",
      name: frame.name || `frame_${i}.jpg`,
    });
  });

  const res = await apiFetch("/teacher/attendance/recognize", {
    method: "POST",
    body: formData,
  }, TEACHER_URL);
  return await res.json();
}

// Submit final attendance for a session
export async function submitAttendance(courseId, batchId, presentStudentIds, date = null) {
  const res = await apiFetch("/teacher/attendance/submit", {
    method: "POST",
    body: JSON.stringify({
      courseId,
      batchId,
      presentStudentIds,
      date: date || new Date().toISOString(),
    }),
  }, TEACHER_URL);
  return await res.json();
}

