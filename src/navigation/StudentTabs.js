import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Button, Alert } from "react-native";
import { clearAuth } from "../api/authStorage";

import StudentDashboard from "../screens/student/StudentDashboard";
import MyCourses from "../screens/student/MyCourses";
import AttendanceHistory from "../screens/student/AttendanceHistory";
import CourseAttendance from "../screens/student/CourseAttendance";
import ProfileUpload from "../screens/student/ProfileUpload";

const Stack = createNativeStackNavigator();

export default function StudentTabs({ navigation }) {

  const confirmLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          onPress: async () => {
            await clearAuth();
            navigation.reset({
              index: 0,
              routes: [{ name: "Login" }],
            });
          },
        },
      ]
    );
  };

  return (
    <Stack.Navigator
      screenOptions={{
        headerRight: () => (
          <Button title="Logout" onPress={confirmLogout} />
        ),
      }}
    >

      <Stack.Screen
        name="StudentDashboard"
        component={StudentDashboard}
        options={{
          headerLeft: () => null,
          headerBackVisible: false,
          gestureEnabled: false
        }}
      />

      <Stack.Screen name="StudentCourses" component={MyCourses}/>
      <Stack.Screen name="AttendanceHistory" component={AttendanceHistory}/>
      <Stack.Screen name="CourseAttendance" component={CourseAttendance}/>
      <Stack.Screen name="ProfileUpload" component={ProfileUpload}/>

    </Stack.Navigator>
  );
}