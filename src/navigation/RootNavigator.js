import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import AuthNavigator from "./AuthNavigator";

export default function RootNavigator(){

  const linking = {
    prefixes: ['facidance://', 'https://facidance.com'],
    config: {
      screens: {
        AuthNavigator: {
          screens: {
            Login: 'login',
            Register: 'register',
            TeacherTabs: {
              screens: {
                TeacherDashboard: 'teacher/dashboard',
                StudentEnrollment: 'teacher/students',
                AttendanceReport: 'teacher/reports',
                MyCourses: {
                  path: 'teacher/courses',
                  screens: {
                    MyCourses: '',
                    CourseDetails: ':courseId',
                  }
                },
                AttendanceCamera: {
                  path: 'teacher/attendance',
                  screens: {
                    AttendanceCamera: '',
                    AttendanceSession: 'session/:courseId'
                  }
                }
              }
            },
            StudentTabs: {
              screens: {
                StudentDashboard: 'student/dashboard',
                ProfileUpload: 'student/profile',
                AttendanceHistory: 'student/attendance',
                StudentCoursesTab: {
                  path: 'student/courses',
                  screens: {
                    StudentCourses: '',
                    CourseAttendance: ':courseId'
                  }
                }
              }
            },
            AdminTabs: {
              screens: {
                AdminDashboard: 'admin/dashboard'
              }
            }
          }
        }
      }
    }
  };

return(

<NavigationContainer linking={linking}>

<AuthNavigator/>

</NavigationContainer>

);

}