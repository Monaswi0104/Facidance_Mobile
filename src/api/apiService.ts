/**
 * apiService.ts
 *
 * Legacy Axios-based API service.
 * Kept for backward compatibility — new code should use apiFetch from config.ts instead.
 */

// @ts-ignore — axios is a legacy dependency, this file is kept for reference only
import axios, { type AxiosInstance, type AxiosResponse } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "./config";

const API_BASE_URL: string = BASE_URL;

const API: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // Security: prevent long-hanging requests
});

// Security: Request Interceptor for Authentication & Headers
API.interceptors.request.use(
  async (config: any) => {
    try {
      // 1. JWT / Auth Token Authentication
      const token = await AsyncStorage.getItem("authToken");
      if (token) {
        config.headers["Authorization"] = `Bearer ${token}`;
      }
      // 2. API Key Authentication (protects against unauthorized client access)
      config.headers["x-api-key"] = "development_api_key_placeholder";

      return config;
    } catch (error) {
      return Promise.reject(error);
    }
  },
  (error: any) => Promise.reject(error)
);

// Security: Response Interceptor for Centralized Error Handling & Rate Limiting
API.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: any) => {
    if (error.response) {
      const status: number = error.response.status;
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

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export const loginUser = (data: LoginData): Promise<AxiosResponse> => {
  return API.post("/login", data);
};

export const registerUser = (data: RegisterData): Promise<AxiosResponse> => {
  return API.post("/register", data);
};

/* =========================
   ADMIN APIs
========================= */

export const getTeachers = (): Promise<AxiosResponse> => {
  return API.get("/teachers");
};

export const getDepartments = (): Promise<AxiosResponse> => {
  return API.get("/departments");
};

export const getPrograms = (): Promise<AxiosResponse> => {
  return API.get("/programs");
};

export const getCourses = (): Promise<AxiosResponse> => {
  return API.get("/courses");
};

export const getStudents = (): Promise<AxiosResponse> => {
  return API.get("/students");
};

/* =========================
   TEACHER APIs
========================= */

export const getTeacherCourses = (teacherId: string): Promise<AxiosResponse> => {
  return API.get(`/teacher/courses/${teacherId}`);
};

export const getCourseStudents = (courseId: string): Promise<AxiosResponse> => {
  return API.get(`/course/students/${courseId}`);
};

export const trainModel = (): Promise<AxiosResponse> => {
  return API.post("/train");
};

export const getAttendanceReport = (courseId: string): Promise<AxiosResponse> => {
  return API.get(`/attendance/report/${courseId}`);
};

/* =========================
   STUDENT APIs
========================= */

export const getStudentCourses = (studentId: string): Promise<AxiosResponse> => {
  return API.get(`/student/courses/${studentId}`);
};

export const getAttendanceHistory = (studentId: string): Promise<AxiosResponse> => {
  return API.get(`/student/attendance/${studentId}`);
};

/* =========================
   FACE RECOGNITION
========================= */

interface ImageFile {
  uri: string;
  fileName: string;
  type: string;
}

export const recognizeAttendance = async (image: ImageFile): Promise<AxiosResponse> => {
  const formData = new FormData();

  formData.append("file", {
    uri: image.uri,
    name: image.fileName,
    type: image.type,
  } as any);

  return API.post("/recognize", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

/* =========================
   FACE UPLOAD
========================= */

export const uploadFaceImage = async (image: ImageFile): Promise<AxiosResponse> => {
  const formData = new FormData();

  formData.append("image", {
    uri: image.uri,
    name: image.fileName,
    type: image.type,
  } as any);

  return API.post("/upload-face", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export default API;
