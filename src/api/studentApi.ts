import { apiFetch, STUDENT_URL, WEB_URL } from "./config";
import { compressImage } from "../utils/imageCompressor";
import type { Course, FacePhotos, CompressedImage } from "../types/models";

// Student profile
export async function getStudentMe(): Promise<any> {
  const res = await apiFetch("/student/me", {}, STUDENT_URL);
  return await res.json();
}

// Student stats
export async function getStudentStats(): Promise<any> {
  const res = await apiFetch("/student/stats", {}, STUDENT_URL);
  return await res.json();
}

// Student courses
export async function getStudentCourses(): Promise<Course[]> {
  const res = await apiFetch("/student/courses", {}, STUDENT_URL);
  return await res.json();
}

// Single Course Detail
export async function getCourse(courseId: string): Promise<any> {
  const res = await apiFetch(`/student/courses/${courseId}`, {}, STUDENT_URL);
  return await res.json();
}

// Attendance history
export async function getAttendanceHistory(): Promise<any> {
  const res = await apiFetch("/student/history", {}, STUDENT_URL);
  return await res.json();
}

// Course-specific attendance
export async function getCourseAttendance(courseId: string): Promise<any> {
  const res = await apiFetch(`/student/courses/${courseId}/attendance`, {}, STUDENT_URL);
  return await res.json();
}

// Check if photos are uploaded
export async function checkPhotos(): Promise<any> {
  const res = await apiFetch("/student/check-photos", {}, STUDENT_URL);
  return await res.json();
}

// Upload face photos (front, left, right) — compressed before upload
export async function uploadFacePhotos(
  images: FacePhotos,
  studentId: string
): Promise<any> {
  const formData = new FormData();
  formData.append("studentId", studentId);

  const poses: (keyof FacePhotos)[] = ["front", "left", "right"];
  for (const pose of poses) {
    if (images[pose]) {
      // Compress to 720p, 75% quality before upload
      const compressed: CompressedImage = await compressImage(images[pose]!);
      formData.append(pose, {
        uri: compressed.uri,
        type: "image/jpeg",
        name: `${pose}.jpg`,
      } as any);
    }
  }

  const res = await apiFetch("/api/student/upload-photos", {
    method: "POST",
    body: formData,
  }, WEB_URL);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || json.detail || "Failed to upload photos");
  }
  return json;
}
