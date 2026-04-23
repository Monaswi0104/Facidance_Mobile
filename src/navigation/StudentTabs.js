import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Alert, TouchableOpacity, Text, View, StyleSheet, Image, ScrollView, StatusBar, Platform } from "react-native";
import { clearAuth } from "../api/authStorage";
import { Theme } from "../theme/Theme";
import { LayoutDashboard, BookOpen, ClipboardList, Camera } from "lucide-react-native";

import StudentDashboard from "../screens/student/StudentDashboard";
import MyCourses from "../screens/student/MyCourses";
import AttendanceHistory from "../screens/student/AttendanceHistory";
import CourseAttendance from "../screens/student/CourseAttendance";
import ProfileUpload from "../screens/student/ProfileUpload";

const Tab = createBottomTabNavigator();
const CoursesStack = createNativeStackNavigator();

const TAB_CONFIG = [
  { name: "StudentDashboard", label: "Overview", Icon: LayoutDashboard },
  { name: "StudentCoursesTab", label: "Courses", Icon: BookOpen },
  { name: "AttendanceHistory", label: "Attendance", Icon: ClipboardList },
  { name: "ProfileUpload", label: "Profile", Icon: Camera },
];

// Nested stack for Courses tab: MyCourses -> CourseAttendance detail
function CoursesStackScreen() {
  return (
    <CoursesStack.Navigator screenOptions={{ headerShown: false }}>
      <CoursesStack.Screen name="StudentCourses" component={MyCourses} />
      <CoursesStack.Screen name="CourseAttendance" component={CourseAttendance} />
    </CoursesStack.Navigator>
  );
}

export default function StudentTabs({ navigation: rootNav }) {

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

  // Custom header that includes logo + logout + nav pills (same as AdminTabs)
  function CustomHeader({ navigation, state }) {
    const activeIndex = state.index;
    return (
      <View style={s.headerWrapper}>
        {/* Top row: Logo + Logout */}
        <View style={s.headerTopRow}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Image source={require("../assets/logo.png")} style={{ width: 30, height: 30, resizeMode: "contain", marginRight: 6 }} />
            <Text style={{ fontSize: 17, fontWeight: "800", color: "#003135", letterSpacing: -0.5 }}>Facidance</Text>
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
          {TAB_CONFIG.map((tab, i) => {
            const isActive = activeIndex === i;
            const Icon = tab.Icon;
            return (
              <TouchableOpacity
                key={tab.name}
                style={[s.navPill, isActive && s.navPillActive]}
                onPress={() => navigation.navigate(tab.name)}
                activeOpacity={0.7}
              >
                <Icon size={16} color={isActive ? "#FFF" : "#64748B"} style={{ marginRight: 4 }} />
                <Text style={[s.navPillText, isActive && s.navPillTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  return (
    <Tab.Navigator
      tabBar={() => null}
      screenOptions={{
        header: ({ navigation }) => {
          const state = navigation.getState();
          return <CustomHeader navigation={navigation} state={state} />;
        },
      }}
    >
      <Tab.Screen name="StudentDashboard" component={StudentDashboard} />
      <Tab.Screen name="StudentCoursesTab" component={CoursesStackScreen} />
      <Tab.Screen name="AttendanceHistory" component={AttendanceHistory} />
      <Tab.Screen name="ProfileUpload" component={ProfileUpload} />
    </Tab.Navigator>
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
    paddingBottom: 10,
    gap: 6,
  },
  navPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
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
    fontSize: 11,
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