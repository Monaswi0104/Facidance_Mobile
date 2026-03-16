import axios from "axios";

// change this to your backend IP
const BASE_URL = "http://YOUR_SERVER_IP:8000";

const API = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/* =========================
   AUTH APIs
========================= */

export const loginUser = (data) => {
  return API.post("/login", data);
};

export const registerUser = (data) => {
  return API.post("/register", data);
};

/* =========================
   ADMIN APIs
========================= */

export const getTeachers = () => {
  return API.get("/teachers");
};

export const getDepartments = () => {
  return API.get("/departments");
};

export const getPrograms = () => {
  return API.get("/programs");
};

export const getCourses = () => {
  return API.get("/courses");
};

export const getStudents = () => {
  return API.get("/students");
};

/* =========================
   TEACHER APIs
========================= */

export const getTeacherCourses = (teacherId) => {
  return API.get(`/teacher/courses/${teacherId}`);
};

export const getCourseStudents = (courseId) => {
  return API.get(`/course/students/${courseId}`);
};

export const trainModel = () => {
  return API.post("/train");
};

export const getAttendanceReport = (courseId) => {
  return API.get(`/attendance/report/${courseId}`);
};

/* =========================
   STUDENT APIs
========================= */

export const getStudentCourses = (studentId) => {
  return API.get(`/student/courses/${studentId}`);
};

export const getAttendanceHistory = (studentId) => {
  return API.get(`/student/attendance/${studentId}`);
};

/* =========================
   FACE RECOGNITION
========================= */

export const recognizeAttendance = async (image) => {

  const formData = new FormData();

  formData.append("file", {
    uri: image.uri,
    name: image.fileName,
    type: image.type,
  });

  return axios.post(`${BASE_URL}/recognize`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

/* =========================
   FACE UPLOAD
========================= */

export const uploadFaceImage = async (image) => {

  const formData = new FormData();

  formData.append("image", {
    uri: image.uri,
    name: image.fileName,
    type: image.type,
  });

  return axios.post(`${BASE_URL}/upload-face`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export default API;