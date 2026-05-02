import React, { useRef, useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Alert, TouchableOpacity, Text, View, StyleSheet, Image, ScrollView, StatusBar, Platform, Dimensions } from "react-native";
import { clearAuth } from "../api/authStorage";
import { useTheme } from "../theme/Theme";
import { LayoutDashboard, Users, Building2, BookOpen, GraduationCap, Layers, LogOut, Sun, Moon, Monitor } from "lucide-react-native";

import AdminDashboard from "../screens/admin/AdminDashboard";
import TeachersManagement from "../screens/admin/TeachersManagement";
import DepartmentsManagement from "../screens/admin/DepartmentsManagement";
import ProgramsManagement from "../screens/admin/ProgramsManagement";
import CoursesManagement from "../screens/admin/CoursesManagement";
import StudentsManagement from "../screens/admin/StudentsManagement";

const Tab = createBottomTabNavigator();

const TAB_CONFIG = [
  { name: "AdminDashboard", label: "Overview", Icon: LayoutDashboard },
  { name: "TeachersManagement", label: "Teachers", Icon: Users },
  { name: "DepartmentsManagement", label: "Departments", Icon: Building2 },
  { name: "ProgramsManagement", label: "Programs", Icon: Layers },
  { name: "CoursesManagement", label: "Courses", Icon: BookOpen },
  { name: "StudentsManagement", label: "Students", Icon: GraduationCap },
];

export default function AdminTabs({ navigation: rootNav }) {

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
    const { colors, isDark, toggleTheme, mode } = useTheme();
    const activeIndex = state.index;
    const scrollViewRef = useRef(null);
    const tabLayouts = useRef({});

    const scrollToTab = (index, animated = true) => {
      const layout = tabLayouts.current[index];
      if (layout && scrollViewRef.current) {
        try {
          const { width: screenWidth } = Dimensions.get("window");
          const scrollX = layout.x - screenWidth / 2 + layout.width / 2;
          scrollViewRef.current.scrollTo({ x: Math.max(0, scrollX), animated });
        } catch (e) {
          console.log("[AdminTabs] Scroll error:", e);
        }
      }
    };

    // Auto-scroll to active tab whenever it changes
    useEffect(() => {
      const timer = setTimeout(() => scrollToTab(activeIndex), 150);
      return () => clearTimeout(timer);
    }, [activeIndex]);

    return (
      <View style={[s.headerWrapper, { backgroundColor: colors.headerBg, borderBottomColor: colors.headerBorder }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={colors.headerBg} />
        {/* Top row: Logo + Logout */}
        <View style={s.headerTopRow}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Image source={require("../assets/logo.png")} style={{ width: 45, height: 45, resizeMode: "contain", marginRight: 8 }} />
            <Text style={{ fontSize: 24, fontWeight: "800", color: colors.primary, letterSpacing: -0.5 }}>Facidance</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity onPress={toggleTheme} style={[s.logoutBtn, { backgroundColor: colors.navPillBg, borderColor: colors.navPillBorder, marginRight: 10 }]} activeOpacity={0.7}>
              {mode === 'dark' ? <Moon size={20} color={colors.foreground} /> : mode === 'light' ? <Sun size={20} color={colors.foreground} /> : <Monitor size={20} color={colors.foreground} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={confirmLogout} style={[s.logoutBtn, { backgroundColor: colors.logoutBg, borderColor: colors.logoutBorder }]} activeOpacity={0.7}>
              <LogOut size={20} color={colors.logoutIcon} style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Nav pills row */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.navRow}
        >
          {TAB_CONFIG.map((tab, i) => {
            const isActive = activeIndex === i;
            const Icon = tab.Icon;
            return (
              <TouchableOpacity
                key={tab.name}
                onLayout={(e) => { tabLayouts.current[i] = e.nativeEvent.layout; }}
                style={[
                  s.navPill,
                  { backgroundColor: colors.navPillBg, borderColor: colors.navPillBorder },
                  isActive && { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
                ]}
                onPress={() => {
                  navigation.navigate(tab.name);
                  setTimeout(() => scrollToTab(i), 100);
                }}
                activeOpacity={0.7}
              >
                <Icon size={18} color={isActive ? colors.primaryForeground : colors.navPillText} style={{ marginRight: 4 }} />
                <Text style={[
                  s.navPillText,
                  { color: colors.navPillText },
                  isActive && { color: colors.primaryForeground },
                ]}>{tab.label}</Text>
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
      <Tab.Screen name="AdminDashboard" component={AdminDashboard} />
      <Tab.Screen name="TeachersManagement" component={TeachersManagement} />
      <Tab.Screen name="DepartmentsManagement" component={DepartmentsManagement} />
      <Tab.Screen name="ProgramsManagement" component={ProgramsManagement} />
      <Tab.Screen name="CoursesManagement" component={CoursesManagement} />
      <Tab.Screen name="StudentsManagement" component={StudentsManagement} />
    </Tab.Navigator>
  );
}

const s = StyleSheet.create({
  headerWrapper: {
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 24) : 50,
    borderBottomWidth: 1,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  navPillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
});
