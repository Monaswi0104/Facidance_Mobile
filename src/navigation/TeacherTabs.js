import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Button, Alert } from "react-native";
import { clearAuth } from "../api/authStorage";

import TeacherDashboard from "../screens/teacher/TeacherDashboard";
import MyCourses from "../screens/teacher/MyCourses";
import CourseDetails from "../screens/teacher/CourseDetails";
import AttendanceCamera from "../screens/teacher/AttendanceCamera";
import TrainingScreen from "../screens/teacher/TrainingScreen";
import StudentEnrollment from "../screens/teacher/StudentEnrollment";
import AttendanceReport from "../screens/teacher/AttendanceReport";

const Stack = createNativeStackNavigator();

export default function TeacherTabs({ navigation }) {

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
        name="TeacherDashboard"
        component={TeacherDashboard}
        options={{
          headerLeft: () => null,
          headerBackVisible: false,
          gestureEnabled: false
        }}
      />

      <Stack.Screen name="MyCourses" component={MyCourses}/>
      <Stack.Screen name="CourseDetails" component={CourseDetails}/>
      <Stack.Screen name="AttendanceCamera" component={AttendanceCamera}/>
      <Stack.Screen name="TrainingScreen" component={TrainingScreen}/>
      <Stack.Screen name="StudentEnrollment" component={StudentEnrollment}/>
      <Stack.Screen name="AttendanceReport" component={AttendanceReport}/>

    </Stack.Navigator>
  );
}