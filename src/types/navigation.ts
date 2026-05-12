/**
 * Navigation param list types for all navigators.
 * Provides type-safe navigation across the entire app.
 */

import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NavigatorScreenParams, CompositeScreenProps } from "@react-navigation/native";
import type { Course } from "./models";

// ═══════════════════════════════════════════════════════════════════════════════
// Root Stack (Auth + Role-based tabs)
// ═══════════════════════════════════════════════════════════════════════════════

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  AdminTabs: undefined;
  TeacherTabs: undefined;
  StudentTabs: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

// ═══════════════════════════════════════════════════════════════════════════════
// Admin Tab Navigator
// ═══════════════════════════════════════════════════════════════════════════════

export type AdminTabParamList = {
  AdminDashboard: undefined;
  TeachersManagement: undefined;
  DepartmentsManagement: undefined;
  ProgramsManagement: undefined;
  CoursesManagement: undefined;
  StudentsManagement: undefined;
};

export type AdminTabScreenProps<T extends keyof AdminTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<AdminTabParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

// ═══════════════════════════════════════════════════════════════════════════════
// Teacher Tab Navigator + Nested Stacks
// ═══════════════════════════════════════════════════════════════════════════════

export type TeacherTabParamList = {
  TeacherDashboard: undefined;
  MyCourses: NavigatorScreenParams<TeacherCoursesStackParamList>;
  AttendanceCamera: NavigatorScreenParams<TeacherAttendanceStackParamList>;
  StudentEnrollment: undefined;
  AttendanceReport: undefined;
};

export type TeacherCoursesStackParamList = {
  MyCourses: undefined;
  CourseDetails: { courseId: string };
};

export type TeacherAttendanceStackParamList = {
  AttendanceCamera: undefined;
  AttendanceSession: {
    course: Course;
    studentCount: number;
    trainedCount: number;
    notTrainedCount: number;
  };
};

export type TeacherTabScreenProps<T extends keyof TeacherTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<TeacherTabParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

export type TeacherCoursesStackScreenProps<T extends keyof TeacherCoursesStackParamList> =
  NativeStackScreenProps<TeacherCoursesStackParamList, T>;

export type TeacherAttendanceStackScreenProps<T extends keyof TeacherAttendanceStackParamList> =
  NativeStackScreenProps<TeacherAttendanceStackParamList, T>;

// ═══════════════════════════════════════════════════════════════════════════════
// Student Tab Navigator + Nested Stacks
// ═══════════════════════════════════════════════════════════════════════════════

export type StudentTabParamList = {
  StudentDashboard: undefined;
  StudentCoursesTab: NavigatorScreenParams<StudentCoursesStackParamList>;
  AttendanceHistory: undefined;
  ProfileUpload: undefined;
};

export type StudentCoursesStackParamList = {
  StudentCourses: undefined;
  CourseAttendance: { courseId: string; courseName: string };
};

export type StudentTabScreenProps<T extends keyof StudentTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<StudentTabParamList, T>,
    RootStackScreenProps<keyof RootStackParamList>
  >;

export type StudentCoursesStackScreenProps<T extends keyof StudentCoursesStackParamList> =
  NativeStackScreenProps<StudentCoursesStackParamList, T>;
