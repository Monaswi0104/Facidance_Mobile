import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Alert, TouchableOpacity, Text, View, StyleSheet, Image, ScrollView, StatusBar, Platform } from "react-native";
import { clearAuth } from "../api/authStorage";
import { Theme } from "../theme/Theme";
import { LayoutDashboard, BookOpen, Users, Camera, BarChart2 } from "lucide-react-native";

import TeacherDashboard from "../screens/teacher/TeacherDashboard";
import MyCourses from "../screens/teacher/MyCourses";
import CourseDetails from "../screens/teacher/CourseDetails";
import AttendanceCamera from "../screens/teacher/AttendanceCamera";
import AttendanceSession from "../screens/teacher/AttendanceSession";
import StudentEnrollment from "../screens/teacher/StudentEnrollment";
import AttendanceReport from "../screens/teacher/AttendanceReport";

const Stack = createNativeStackNavigator();

const TAB_CONFIG = [
  { name: "TeacherDashboard", label: "Overview", Icon: LayoutDashboard },
  { name: "MyCourses", label: "Courses", Icon: BookOpen },
  { name: "AttendanceCamera", label: "Attendance", Icon: Camera },
  { name: "StudentEnrollment", label: "Students", Icon: Users },
  { name: "AttendanceReport", label: "Reports", Icon: BarChart2 },
];

export default function TeacherTabs({ navigation: rootNav }) {

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
            rootNav.reset({ index: 0, routes: [{ name: "Login" }] });
          },
        },
      ]
    );
  };

  // Custom header that includes logo + logout + nav pills
  function CustomHeader({ navigation, state }) {
    const currentRouteName = state.routes[state.index].name;
    return (
      <View style={s.headerWrapper}>
        {/* Top row: Logo + Logout */}
        <View style={s.headerTopRow}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Image source={require("../assets/logo.png")} style={{ width: 45, height: 45, resizeMode: "contain", marginRight: 8 }} />
            <Text style={{ fontSize: 24, fontWeight: "800", color: "#003135", letterSpacing: -0.5 }}>Facidance</Text>
          </View>
          <TouchableOpacity onPress={confirmLogout} style={s.logoutBtn} activeOpacity={0.7}>
            <View style={s.logoutDoor} />
            <View style={s.logoutArrow}>
              <Text style={s.logoutArrowText}>→</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Nav pills row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.navRow}>
          {TAB_CONFIG.map((tab) => {
            const isActive = tab.name === currentRouteName;
            const Icon = tab.Icon;
            return (
              <TouchableOpacity
                key={tab.name}
                style={[s.navPill, isActive && s.navPillActive]}
                onPress={() => navigation.navigate(tab.name)}
                activeOpacity={0.7}
              >
                <Icon size={18} color={isActive ? "#FFF" : "#64748B"} style={{ marginRight: 4 }} />
                <Text style={[s.navPillText, isActive && s.navPillTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        header: ({ navigation, route }) => {
          const state = navigation.getState();
          // Only show custom header for main tabs, not for nested screens
          const isMainTab = TAB_CONFIG.some(tab => tab.name === route.name);
          if (!isMainTab) return null;
          return <CustomHeader navigation={navigation} state={state} />;
        },
        animation: "slide_from_right",
        animationTypeForReplace: "push",
        gestureEnabled: true,
        gestureDirection: "horizontal",
      }}
    >
      <Stack.Screen name="TeacherDashboard" component={TeacherDashboard} />
      <Stack.Screen name="MyCourses" component={MyCourses} />
      <Stack.Screen name="CourseDetails" component={CourseDetails} options={{ headerShown: false }} />
      <Stack.Screen name="AttendanceCamera" component={AttendanceCamera} />
      <Stack.Screen name="AttendanceSession" component={AttendanceSession} options={{ headerShown: false }} />
      <Stack.Screen name="AttendanceReport" component={AttendanceReport} />
      <Stack.Screen name="StudentEnrollment" component={StudentEnrollment} />
    </Stack.Navigator>
  );
}

const s = StyleSheet.create({
  headerWrapper: {
    backgroundColor: "#FFFFFF",
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 4 : 50,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 4,
    gap: 6,
  },
  navPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  navPillActive: {
    backgroundColor: Theme.colors.primaryDark,
    borderColor: Theme.colors.primaryDark,
  },
  navPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  navPillTextActive: {
    color: "#FFF",
  },
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
