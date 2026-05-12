/**
 * Shared data model types for the Facidance Mobile application.
 * These map to the backend API response structures.
 */

// ─── User & Auth ──────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "teacher" | "student";
}

export interface LoginResponse {
  token: string;
  role: string;
  name: string;
  email: string;
  redirectUrl?: string;
}

export interface RegisterResponse {
  message: string;
  user?: User;
}

// ─── Course ───────────────────────────────────────────────────────────────────

export interface Course {
  id: string;
  name: string;
  code?: string;
  entry_code?: string;
  teacher_id?: string;
  department: string;
  program: string;
  year: string;
  semester: string;
  academic_year?: string;
  student_count?: number;
  session_count?: number;
}

// ─── Student ──────────────────────────────────────────────────────────────────

export interface Student {
  id: string;
  name: string;
  email: string;
  hasPhotos: boolean;
  photoCount: number;
  trained: boolean;
  status?: "active" | "graduated";
  programId?: string;
}

export interface StudentImport {
  name: string;
  email: string;
  rollNumber?: string;
}

// ─── Teacher ──────────────────────────────────────────────────────────────────

export interface Teacher {
  id: string;
  name: string;
  email: string;
  department?: string;
  departmentId?: string;
  status?: "pending" | "approved";
  courseCount?: number;
  studentCount?: number;
}

// ─── Department / Program / Hierarchy ─────────────────────────────────────────

export interface Department {
  id: string;
  name: string;
  programCount?: number;
  programs?: Program[];
}

export interface Program {
  id: string;
  name: string;
  departmentId: string;
  department?: string;
  courseCount?: number;
}

export interface AcademicYear {
  id: string;
  name: string;
  programId: string;
}

export interface Semester {
  id: string;
  name: string;
  academicYearId: string;
}

export interface Hierarchy {
  departments: (Department & {
    programs: (Program & {
      academicYears?: (AcademicYear & {
        semesters?: Semester[];
      })[];
    })[];
  })[];
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export interface AttendanceSession {
  id: string;
  courseId: string;
  date: string;
  duration?: number;
  recognizedStudents: string[];
  totalStudents?: number;
  presentCount?: number;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  studentId: string;
  status: "present" | "absent";
  timestamp?: string;
}

export interface RecognitionResult {
  recognizedStudents: {
    id: string;
    name: string;
    confidence: number;
  }[];
  unrecognized?: number;
  batchId?: string;
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export interface AdminStats {
  totalTeachers: number;
  totalStudents: number;
  totalCourses: number;
  totalDepartments: number;
  totalPrograms: number;
  pendingTeachers: number;
}

export interface TeacherStats {
  totalCourses: number;
  totalStudents: number;
  totalSessions: number;
  averageAttendance: number;
  atRiskStudents?: {
    id: string;
    name: string;
    email: string;
    attendance: number;
    courseName: string;
  }[];
}

export interface StudentStats {
  enrolledCourses: number;
  overallAttendance: number;
  totalSessions: number;
  attendedSessions: number;
}

// ─── Report ───────────────────────────────────────────────────────────────────

export interface ReportData {
  courseName: string;
  sessions: {
    date: string;
    present: number;
    absent: number;
    total: number;
  }[];
  students: {
    id: string;
    name: string;
    email: string;
    attended: number;
    total: number;
    percentage: number;
  }[];
}

// ─── Image / Face Upload ──────────────────────────────────────────────────────

export interface ImageFrame {
  uri: string;
  type?: string;
  name?: string;
}

export interface CompressedImage {
  uri: string;
  size: number;
}

export interface FacePhotos {
  front?: string;
  left?: string;
  right?: string;
}

// ─── API Response Wrapper ─────────────────────────────────────────────────────

export interface ApiError {
  error?: string;
  detail?: string;
  message?: string;
  hint?: string;
}
