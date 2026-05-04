import axios from "axios";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Automatically use 10.0.2.2 for Android emulator pointing to localhost, or environment variable
const BASE_URL = process.env.REACT_APP_API_URL || (Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000");

const API = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // Security: prevent long-hanging requests
});

// Security: Request Interceptor for Authentication & Headers
API.interceptors.request.use(
  async (config) => {
    try {
      // 1. JWT / Auth Token Authentication
      const token = await AsyncStorage.getItem("authToken");
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
      // 2. API Key Authentication (protects against unauthorized client access)
      config.headers["x-api-key"] = process.env.API_KEY || "development_api_key_placeholder";
      
      return config;
    } catch (error) {
      return Promise.reject(error);
    }
  },
  (error) => Promise.reject(error)
);

// Security: Response Interceptor for Centralized Error Handling & Rate Limiting
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      const status = error.response.status;
      if (status === 401) {
        console.warn("[API] Unauthorized: Token may be missing or expired.");
        // Here you would typically trigger a logout or token refresh
        await AsyncStorage.removeItem("authToken");
      } else if (status === 403) {
        console.warn("[API] Forbidden: You lack permissions for this action.");
      } else if (status === 429) {
        console.error("[API] Rate Limit Exceeded. Too many requests.");
        // Emit event or alert user to slow down
      } else if (status >= 500) {
        console.error("[API] Server Error:", error.response.data || "Unknown error");
      }
    } else if (error.request) {
      console.error("[API] Network Error: No response received.");
    }
    return Promise.reject(error);
  }
);

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

  return API.post("/recognize", formData, {
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

  return API.post("/upload-face", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export default API;