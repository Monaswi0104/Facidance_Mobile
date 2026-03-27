import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Alert, TouchableOpacity, Text, View, StyleSheet } from "react-native";
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
        name="StudentDashboard"
        component={StudentDashboard}
        options={{
          title: "Student Panel",
          headerLeft: () => null,
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />

      <Stack.Screen name="StudentCourses" component={MyCourses} options={{ title: "My Courses" }} />
      <Stack.Screen name="AttendanceHistory" component={AttendanceHistory} options={{ title: "Attendance" }} />
      <Stack.Screen name="CourseAttendance" component={CourseAttendance} options={{ title: "Course Details" }} />
      <Stack.Screen name="ProfileUpload" component={ProfileUpload} options={{ title: "Profile" }} />

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