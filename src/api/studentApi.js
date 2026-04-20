import { apiFetch, STUDENT_URL } from "./config";

// Student profile
export async function getStudentMe() {
  const res = await apiFetch("/student/me", {}, STUDENT_URL);
  return await res.json();
}

// Student stats
export async function getStudentStats() {
  const res = await apiFetch("/student/stats", {}, STUDENT_URL);
  return await res.json();
}

// Student courses
export async function getStudentCourses() {
  const res = await apiFetch("/student/courses", {}, STUDENT_URL);
  return await res.json();
}

// Single Course Detail
export async function getCourse(courseId) {
  const res = await apiFetch(`/student/courses/${courseId}`, {}, STUDENT_URL);
  return await res.json();
}

// Attendance history
export async function getAttendanceHistory() {
  const res = await apiFetch("/student/history", {}, STUDENT_URL);
  return await res.json();
}

// Course-specific attendance
export async function getCourseAttendance(courseId) {
  const res = await apiFetch(`/student/courses/${courseId}/attendance`, {}, STUDENT_URL);
  return await res.json();
}

// Check if photos are uploaded
export async function checkPhotos() {
  const res = await apiFetch("/student/check-photos", {}, STUDENT_URL);
  return await res.json();
}

// Upload face photos (front, left, right)
export async function uploadFacePhotos(images, studentId) {
  const formData = new FormData();
  formData.append("studentId", studentId);

  ["front", "left", "right"].forEach((pose) => {
    if (images[pose]) {
      formData.append(pose, {
        uri: images[pose],
        type: "image/jpeg",
        name: `${pose}.jpg`,
      });
    }
  });

  const res = await apiFetch("/student/upload-photos", {
    method: "POST",
    body: formData,
  }, STUDENT_URL);

  return await res.json();
}
