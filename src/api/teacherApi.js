import { apiFetch } from "./config";

// Teacher profile
export async function getTeacherMe() {
  const res = await apiFetch("/api/teacher/me");
  return await res.json();
}

// Teacher stats
export async function getTeacherStats() {
  const res = await apiFetch("/api/teacher/stats");
  return await res.json();
}

// Teacher courses
export async function getTeacherCourses() {
  const res = await apiFetch("/api/teacher/courses");
  return await res.json();
}

// Students enrolled in a course
export async function getCourseStudents(courseId) {
  const res = await apiFetch(`/api/teacher/students?courseId=${courseId}`);
  return await res.json();
}

// Full course details including aggregated attendance
export async function getCourseDetails(courseId) {
  const res = await apiFetch(`/api/teacher/courses/${courseId}`);
  return await res.json();
}

// Attendance for a course
export async function getCourseAttendance(courseId) {
  const res = await apiFetch(`/api/teacher/attendance?courseId=${courseId}`);
  return await res.json();
}

// Reports
export async function getTeacherReports(courseId, startDate, endDate) {
  let url = `/api/teacher/reports?courseId=${courseId}`;
  if (startDate) url += `&startDate=${startDate}`;
  if (endDate) url += `&endDate=${endDate}`;
  const res = await apiFetch(url);
  return await res.json();
}

// Hierarchy (departments > programs > semesters)
export async function getHierarchy() {
  const res = await apiFetch("/api/teacher/hierarchy");
  return await res.json();
}
