import React, { useRef, useEffect } from "react";
import { Alert } from "react-native";
import { NavigationContainer, CommonActions } from "@react-navigation/native";
import AuthNavigator from "./AuthNavigator";
import { setOnSessionExpired } from "../api/config";

export default function RootNavigator(){
  const navigationRef = useRef(null);

  // Register the 401 session-expired handler once on mount
  useEffect(() => {
    setOnSessionExpired(() => {
      Alert.alert(
        "Session Expired",
        "Your login session has expired. Please sign in again.",
        [{ text: "OK" }]
      );

      // Reset the entire navigation stack back to Login
      if (navigationRef.current) {
        navigationRef.current.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: "Login" }],
          })
        );
      }
    });
  }, []);

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

<NavigationContainer ref={navigationRef} linking={linking as any}>

<AuthNavigator/>

</NavigationContainer>

);

}