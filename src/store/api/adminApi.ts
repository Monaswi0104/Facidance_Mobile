/**
 * RTK Query API slice for all Admin endpoints.
 *
 * Provides auto-generated hooks like:
 *   useGetStudentsQuery, useGetTeachersQuery, useGetCoursesQuery,
 *   useDeleteStudentMutation, useGraduateStudentMutation, etc.
 *
 * Tag-based cache invalidation ensures that after a mutation
 * (e.g. deleting a student), the relevant list auto-refetches.
 */
import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithAuth } from "./baseQuery";

export const adminApi = createApi({
  reducerPath: "adminApi",
  baseQuery: baseQueryWithAuth,
  tagTypes: ["Students", "Teachers", "Courses", "Departments", "Programs", "Stats"],
  endpoints: (builder) => ({

    // ─── Stats ─────────────────────────────────────────────────────
    getStats: builder.query<any, void>({
      query: () => "/admin/stats",
      providesTags: ["Stats"],
    }),

    // ─── Teachers ──────────────────────────────────────────────────
    getTeachers: builder.query<any, void>({
      query: () => "/admin/teachers",
      providesTags: ["Teachers"],
    }),

    approveTeacher: builder.mutation<any, { teacherId: string; departmentId: string }>({
      query: ({ teacherId, departmentId }) => ({
        url: "/admin/approve-teacher",
        method: "POST",
        body: { teacher_id: teacherId, department_id: departmentId },
      }),
      invalidatesTags: ["Teachers", "Stats"],
    }),

    deleteTeacher: builder.mutation<any, string>({
      query: (userId) => ({
        url: `/admin/teachers/${userId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Teachers", "Stats"],
    }),

    // ─── Departments ───────────────────────────────────────────────
    getDepartments: builder.query<any, void>({
      query: () => "/admin/departments",
      providesTags: ["Departments"],
    }),

    createDepartment: builder.mutation<any, string>({
      query: (name) => ({
        url: "/admin/departments",
        method: "POST",
        body: { name },
      }),
      invalidatesTags: ["Departments", "Stats"],
    }),

    deleteDepartment: builder.mutation<any, string>({
      query: (id) => ({
        url: `/admin/departments/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Departments", "Stats"],
    }),

    // ─── Programs ──────────────────────────────────────────────────
    getPrograms: builder.query<any, void>({
      query: () => "/admin/programs",
      providesTags: ["Programs"],
    }),

    createProgram: builder.mutation<any, { name: string; departmentId: string }>({
      query: ({ name, departmentId }) => ({
        url: "/admin/programs",
        method: "POST",
        body: { name, department_id: departmentId },
      }),
      invalidatesTags: ["Programs", "Stats"],
    }),

    deleteProgram: builder.mutation<any, string>({
      query: (id) => ({
        url: `/admin/programs/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Programs", "Stats"],
    }),

    // ─── Courses ───────────────────────────────────────────────────
    getCourses: builder.query<any, void>({
      query: () => "/admin/courses",
      providesTags: ["Courses"],
    }),

    createCourse: builder.mutation<any, {
      name: string;
      teacherId: string;
      programId: string;
      academicYear: string;
      semesterNumber: string;
    }>({
      query: (data) => ({
        url: "/admin/courses",
        method: "POST",
        body: {
          name: data.name,
          teacher_id: data.teacherId,
          program_id: data.programId,
          academic_year: data.academicYear,
          semester_number: data.semesterNumber,
        },
      }),
      invalidatesTags: ["Courses", "Stats"],
    }),

    deleteCourse: builder.mutation<any, string>({
      query: (id) => ({
        url: `/admin/courses/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Courses", "Stats"],
    }),

    // ─── Students ──────────────────────────────────────────────────
    getStudents: builder.query<any, void>({
      query: () => "/admin/students",
      providesTags: ["Students"],
    }),

    updateStudent: builder.mutation<any, { id: string; data: any }>({
      query: ({ id, data }) => ({
        url: `/admin/students/${id}`,
        method: "PATCH",
        body: {
          name: data.name,
          email: data.email,
          ...(data.programId && { program_id: data.programId }),
        },
      }),
      invalidatesTags: ["Students"],
    }),

    deleteStudent: builder.mutation<any, string>({
      query: (id) => ({
        url: `/admin/students/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Students", "Stats"],
    }),

    graduateStudent: builder.mutation<any, string>({
      query: (id) => ({
        url: `/admin/students/${id}/graduate`,
        method: "POST",
      }),
      invalidatesTags: ["Students", "Stats"],
    }),

    ungraduateStudent: builder.mutation<any, string>({
      query: (id) => ({
        url: `/admin/students/${id}/ungraduate`,
        method: "POST",
      }),
      invalidatesTags: ["Students", "Stats"],
    }),

    // ─── Analytics ─────────────────────────────────────────────────
    getAnalyticsOverview: builder.query<any, void>({
      query: () => "/admin/analytics/overview",
    }),

    getAttendanceTrends: builder.query<any, void>({
      query: () => "/admin/analytics/attendance-trends",
    }),

    getTeacherLoad: builder.query<any, void>({
      query: () => "/admin/analytics/teacher-load",
      providesTags: ["Teachers"],
    }),

    getProgramDistribution: builder.query<any, void>({
      query: () => "/admin/analytics/program-distribution",
      providesTags: ["Programs"],
    }),
  }),
});

// Export auto-generated hooks
export const {
  // Queries
  useGetStatsQuery,
  useGetTeachersQuery,
  useGetDepartmentsQuery,
  useGetProgramsQuery,
  useGetCoursesQuery,
  useGetStudentsQuery,
  useGetAnalyticsOverviewQuery,
  useGetAttendanceTrendsQuery,
  useGetTeacherLoadQuery,
  useGetProgramDistributionQuery,
  // Mutations
  useApproveTeacherMutation,
  useDeleteTeacherMutation,
  useCreateDepartmentMutation,
  useDeleteDepartmentMutation,
  useCreateProgramMutation,
  useDeleteProgramMutation,
  useCreateCourseMutation,
  useDeleteCourseMutation,
  useUpdateStudentMutation,
  useDeleteStudentMutation,
  useGraduateStudentMutation,
  useUngraduateStudentMutation,
} = adminApi;
