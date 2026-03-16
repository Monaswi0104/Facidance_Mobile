import { apiFetch } from "./config";

// Student profile
export async function getStudentMe() {
  const res = await apiFetch("/api/student/me");
  return await res.json();
}

// Student stats
export async function getStudentStats() {
  const res = await apiFetch("/api/student/stats");
  return await res.json();
}

// Student courses
export async function getStudentCourses() {
  const res = await apiFetch("/api/student/courses");
  return await res.json();
}

// Attendance history
export async function getAttendanceHistory() {
  const res = await apiFetch("/api/student/history");
  return await res.json();
}

// Check if photos are uploaded
export async function checkPhotos() {
  const res = await apiFetch("/api/student/check-photos");
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

  const res = await apiFetch("/api/student/upload-photos", {
    method: "POST",
    body: formData,
  });

  return await res.json();
}
