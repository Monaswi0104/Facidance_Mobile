import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Alert, TouchableOpacity, Text, View, StyleSheet } from "react-native";
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
          style: "destructive",
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

  const LogoutIcon = () => (
    <TouchableOpacity onPress={confirmLogout} style={s.logoutBtn} activeOpacity={0.7}>
      <View style={s.logoutDoor} />
      <View style={s.logoutArrow}>
        <Text style={s.logoutArrowText}>→</Text>
      </View>
    </TouchableOpacity>
  );

  const commonHeaderStyle = {
    headerStyle: { backgroundColor: "#FFFFFF" },
    headerTintColor: "#0F172A",
    headerTitleStyle: { fontWeight: "700", fontSize: 17, color: "#0F172A" },
    headerShadowVisible: false,
    headerRight: () => <LogoutIcon />,
  };

  return (
    <Stack.Navigator screenOptions={commonHeaderStyle}>

      <Stack.Screen
        name="TeacherDashboard"
        component={TeacherDashboard}
        options={{
          title: "Teacher Panel",
          headerLeft: () => null,
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />

      <Stack.Screen name="MyCourses" component={MyCourses} options={{ title: "My Courses" }} />
      <Stack.Screen name="CourseDetails" component={CourseDetails} options={{ title: "Course Details" }} />
      <Stack.Screen name="AttendanceCamera" component={AttendanceCamera} options={{ title: "Attendance" }} />
      <Stack.Screen name="TrainingScreen" component={TrainingScreen} options={{ title: "Training" }} />
      <Stack.Screen name="StudentEnrollment" component={StudentEnrollment} options={{ title: "Enroll Students" }} />
      <Stack.Screen name="AttendanceReport" component={AttendanceReport} options={{ title: "Report" }} />

    </Stack.Navigator>
  );
}

const s = StyleSheet.create({
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  logoutDoor: {
    width: 12,
    height: 14,
    borderWidth: 2,
    borderColor: "#EF4444",
    borderRightWidth: 0,
    borderRadius: 2,
    marginRight: -2,
  },
  logoutArrow: {
    justifyContent: "center",
    alignItems: "center",
  },
  logoutArrowText: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "900",
  },
});