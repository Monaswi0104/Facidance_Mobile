import React, { useRef, useEffect, useCallback } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Alert, TouchableOpacity, Text, View, StyleSheet, Image, ScrollView, StatusBar, Platform, Dimensions, BackHandler, Modal, ActivityIndicator } from "react-native";
import { clearAuth } from "../api/authStorage";
import { useTheme } from "../theme/Theme";
import { LayoutDashboard, BookOpen, ClipboardList, Camera, LogOut, Sun, Moon, Monitor, Sparkles, X } from "lucide-react-native";
import haptic from "../utils/haptics";

import StudentDashboard from "../screens/student/StudentDashboard";
import MyCourses from "../screens/student/MyCourses";
import AttendanceHistory from "../screens/student/AttendanceHistory";
import CourseAttendance from "../screens/student/CourseAttendance";
import ProfileUpload from "../screens/student/ProfileUpload";
import { getAISuggestions } from "../api/studentApi";

import type { StudentTabParamList, StudentCoursesStackParamList } from "../types/navigation";

const Tab = createBottomTabNavigator<StudentTabParamList>();
const CoursesStack = createNativeStackNavigator<StudentCoursesStackParamList>();

const TAB_CONFIG = [
  { name: "StudentDashboard", label: "Overview", Icon: LayoutDashboard },
  { name: "StudentCoursesTab", label: "Courses", Icon: BookOpen },
  { name: "AttendanceHistory", label: "Attendance", Icon: ClipboardList },
  { name: "ProfileUpload", label: "Profile", Icon: Camera },
];

// Nested stack for Courses tab: MyCourses -> CourseAttendance detail
function CoursesStackScreen() {
  return (
    <CoursesStack.Navigator id="StudentCoursesStack" screenOptions={{ headerShown: false, animation: "slide_from_right", animationDuration: 250 }}>
      <CoursesStack.Screen name="StudentCourses" component={MyCourses} />
      <CoursesStack.Screen name="CourseAttendance" component={CourseAttendance} options={{ animation: "fade_from_bottom", animationDuration: 300 }} />
    </CoursesStack.Navigator>
  );
}

export default function StudentTabs({ navigation: rootNav }) {
  const tabNavRef = useRef(null);

  const confirmLogout = () => {
    haptic.warning();
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

  // Hardware back button handler
  useEffect(() => {
    const onBackPress = () => {
      const state = tabNavRef.current?.getState?.();
      if (!state) return false;
      const activeRoute = state.routes[state.index]?.name;
      if (activeRoute === "StudentDashboard") {
        confirmLogout();
        return true;
      }
      tabNavRef.current?.navigate("StudentDashboard");
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, []);

  // Custom header that includes logo + logout + nav pills
  function CustomHeader({ navigation, state }) {
    const { colors} = useTheme();
    const activeIndex = state.index;
    const scrollViewRef = useRef(null);
    const tabLayouts = useRef({});

    const [aiModalVisible, setAiModalVisible] = React.useState(false);
    const [aiLoading, setAiLoading] = React.useState(false);
    const [aiData, setAiData] = React.useState<any>(null);
    const hasPrefetched = useRef(false);

    // Prefetch AI tips in background for instant loading
    useEffect(() => {
      if (!hasPrefetched.current) {
        hasPrefetched.current = true;
        setAiLoading(true);
        getAISuggestions()
          .then((res) => setAiData(res))
          .catch((e) => console.log("Prefetch AI failed:", e))
          .finally(() => setAiLoading(false));
      }
    }, []);

    const handleOpenAiTips = async () => {
      setAiModalVisible(true);
      // If we don't have data and aren't already loading it, try again
      if (!aiData && !aiLoading) {
        try {
          setAiLoading(true);
          const res = await getAISuggestions();
          setAiData(res);
        } catch (e: any) {
          console.log("Failed to load AI suggestions", e);
          Alert.alert("Error", e?.message || "Failed to load AI suggestions.");
          setAiModalVisible(false);
        } finally {
          setAiLoading(false);
        }
      }
    };

    const scrollToTab = (index, animated = true) => {
      const layout = tabLayouts.current[index];
      if (layout && scrollViewRef.current) {
        try {
          const { width: screenWidth } = Dimensions.get("window");
          const scrollX = layout.x - screenWidth / 2 + layout.width / 2;
          scrollViewRef.current.scrollTo({ x: Math.max(0, scrollX), animated });
        } catch (e: any) {
          console.log("[StudentTabs] Scroll error:", e);
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
        <StatusBar barStyle={"dark-content"} backgroundColor={colors.headerBg} />
        {/* Top row: Logo + Logout */}
        <View style={s.headerTopRow}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Image source={require("../assets/logo.png")} style={{ width: 45, height: 45, resizeMode: "contain", marginRight: 8 }} />
            <Text style={{ fontSize: 24, fontWeight: "800", color: colors.primary, letterSpacing: -0.5 }}>Facidance</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity style={s.aiTipsBtn} onPress={handleOpenAiTips} activeOpacity={0.7}>
              <Sparkles size={16} color="#fff" />
              <Text style={s.aiTipsBtnText}>AI Tips</Text>
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
                  haptic.medium();
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

        {/* AI Tips Modal Overlay */}
        <Modal visible={aiModalVisible} transparent animationType="slide">
          <View style={s.modalOverlay}>
            <View style={s.modalContainer}>
              <View style={s.modalHeader}>
                <View style={s.modalHeaderTitleGroup}>
                  <View style={s.modalIconBg}>
                    <Sparkles size={18} color="#fff" />
                  </View>
                  <View>
                    <Text style={s.modalTitle}>AI Attendance Advisor</Text>
                    <Text style={s.modalSubtitle}>Personalized improvement insights</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => setAiModalVisible(false)} style={s.modalCloseBtn}>
                  <X size={24} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              {aiLoading ? (
                <View style={s.modalLoader}>
                  <ActivityIndicator size="large" color="#0FA4AF" />
                  <Text style={s.modalLoaderText}>Analyzing your attendance...</Text>
                </View>
              ) : aiData && aiData.suggestions ? (
                <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
                  {/* Attendance + Severity */}
                  <View style={s.modalStatsRow}>
                    <View style={s.modalStatBox}>
                      <Text style={s.modalStatBoxLabel}>Overall Attendance</Text>
                      <Text style={s.modalStatBoxValue}>{aiData.attendance_percentage}%</Text>
                    </View>
                    <View style={[s.modalSeverityBox, { backgroundColor: aiData.suggestions.severity === 'high' ? '#fef2f2' : aiData.suggestions.severity === 'medium' ? '#fffbeb' : '#ecfeff' }]}>
                      <Text style={[s.modalSeverityLabel, { color: aiData.suggestions.severity === 'high' ? '#dc2626' : aiData.suggestions.severity === 'medium' ? '#d97706' : '#0FA4AF' }]}>Risk Level</Text>
                      <Text style={[s.modalSeverityValue, { color: aiData.suggestions.severity === 'high' ? '#dc2626' : aiData.suggestions.severity === 'medium' ? '#d97706' : '#0FA4AF' }]}>{aiData.suggestions.severity}</Text>
                    </View>
                  </View>

                  {/* Summary */}
                  <View style={s.modalSection}>
                    <Text style={s.modalSectionTitle}>Summary</Text>
                    <Text style={s.modalSectionText}>{aiData.suggestions.summary}</Text>
                  </View>

                  {/* Urgent Courses */}
                  {aiData.suggestions.urgent_courses?.length > 0 && (
                    <View style={s.modalSection}>
                      <Text style={s.modalSectionTitle}>⚠️ Needs Attention</Text>
                      {aiData.suggestions.urgent_courses.map((course: any, idx: number) => (
                        <View key={idx} style={s.urgentCourseCard}>
                          <View style={s.courseCardHeader}>
                            <Text style={s.urgentCourseTitle}>{course.name}</Text>
                            <View style={s.urgentCourseBadge}>
                              <Text style={s.urgentCourseBadgeText}>{course.current_rate}%</Text>
                            </View>
                          </View>
                          <Text style={s.urgentCourseAdvice}>{course.advice}</Text>
                          {course.sessions_needed > 0 && (
                            <Text style={s.urgentCourseTarget}>🎯 Must attend next {course.sessions_needed} consecutive sessions to reach 75%</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Safe Courses */}
                  {aiData.suggestions.safe_courses?.length > 0 && (
                    <View style={s.modalSection}>
                      <Text style={s.modalSectionTitle}>On Track</Text>
                      {aiData.suggestions.safe_courses.map((course: any, idx: number) => (
                        <View key={idx} style={s.safeCourseCard}>
                          <View style={s.courseCardHeader}>
                            <Text style={s.safeCourseTitle}>{course.name}</Text>
                            <View style={s.safeCourseBadge}>
                              <Text style={s.safeCourseBadgeText}>{course.current_rate}%</Text>
                            </View>
                          </View>
                          <Text style={s.safeCourseAdvice}>{course.advice}</Text>
                          {course.can_miss > 0 && (
                            <Text style={s.safeCourseTarget}>🛡️ Can miss up to {course.can_miss} more sessions safely</Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Suggestions */}
                  <View style={s.modalSection}>
                    <Text style={s.modalSectionTitle}>💡 Suggestions</Text>
                    {aiData.suggestions.suggestions?.map((item: any, idx: number) => (
                      <View key={idx} style={s.suggestionCard}>
                        <View style={s.suggestionNumberBg}>
                          <Text style={s.suggestionNumberText}>{idx + 1}</Text>
                        </View>
                        <View style={s.suggestionContent}>
                          <Text style={s.suggestionTitle}>{item.title}</Text>
                          <Text style={s.suggestionDetail}>{item.detail}</Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* Motivation */}
                  <View style={s.motivationBox}>
                    <Text style={s.motivationText}>✨ {aiData.suggestions.motivation}</Text>
                  </View>
                </ScrollView>
              ) : null}
            </View>
          </View>
        </Modal>

      </View>
    );
  }

  return (
    <Tab.Navigator
      id="StudentTabs"
      tabBar={() => null}
      screenOptions={{
        header: ({ navigation }) => {
          tabNavRef.current = navigation as any;
          const state = navigation.getState();
          return <CustomHeader navigation={navigation as any} state={state} />;
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
  aiTipsBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0FA4AF",
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 10,
    shadowColor: "#0FA4AF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    marginRight: 8,
  },
  aiTipsBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
    marginLeft: 6,
  },
  // AI Tips Modal Styles
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center", padding: 20,
  },
  modalContainer: {
    width: "100%", maxWidth: 650, maxHeight: "85%", backgroundColor: "#fff", borderRadius: 24, padding: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.2, shadowRadius: 60, elevation: 15,
  },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18,
  },
  modalHeaderTitleGroup: {
    flexDirection: "row", alignItems: "center", gap: 10, flex: 1,
  },
  modalIconBg: {
    width: 42, height: 42, borderRadius: 14, backgroundColor: "#0FA4AF", justifyContent: "center", alignItems: "center",
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#0f172a" },
  modalSubtitle: { fontSize: 12, color: "#64748b", marginTop: 2 },
  modalCloseBtn: { padding: 4 },
  modalLoader: { padding: 40, alignItems: "center" },
  modalLoaderText: { marginTop: 12, color: "#64748b", fontSize: 14, fontWeight: "500" },
  modalBody: { flexGrow: 1 },
  modalStatsRow: { flexDirection: "row", gap: 12, marginBottom: 18 },
  modalStatBox: { flex: 1, padding: 16, borderRadius: 16, backgroundColor: "#f8fafc" },
  modalStatBoxLabel: { fontSize: 12, fontWeight: "700", color: "#0f172a" },
  modalStatBoxValue: { fontSize: 26, fontWeight: "800", color: "#0FA4AF", marginTop: 4 },
  modalSeverityBox: { paddingVertical: 16, paddingHorizontal: 20, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  modalSeverityLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  modalSeverityValue: { fontSize: 16, fontWeight: "800", textTransform: "capitalize", marginTop: 4 },
  modalSection: { marginBottom: 20 },
  modalSectionTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a", marginBottom: 10 },
  modalSectionText: { fontSize: 14, color: "#475569", lineHeight: 22 },
  courseCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  urgentCourseCard: { padding: 14, borderRadius: 14, backgroundColor: "#fff7ed", borderColor: "rgba(234,88,12,0.2)", borderWidth: 1, marginBottom: 10 },
  urgentCourseTitle: { fontWeight: "700", color: "#c2410c", fontSize: 14 },
  urgentCourseBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, backgroundColor: "#fed7aa" },
  urgentCourseBadgeText: { fontWeight: "700", color: "#c2410c", fontSize: 12 },
  urgentCourseAdvice: { color: "#92400e", fontSize: 13, lineHeight: 20 },
  urgentCourseTarget: { color: "#c2410c", fontWeight: "700", fontSize: 13, marginTop: 8 },
  safeCourseCard: { padding: 14, borderRadius: 14, backgroundColor: "#f0fdf4", borderColor: "rgba(22,163,74,0.2)", borderWidth: 1, marginBottom: 10 },
  safeCourseTitle: { fontWeight: "700", color: "#15803d", fontSize: 14 },
  safeCourseBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, backgroundColor: "#bbf7d0" },
  safeCourseBadgeText: { fontWeight: "700", color: "#15803d", fontSize: 12 },
  safeCourseAdvice: { color: "#166534", fontSize: 13, lineHeight: 20 },
  safeCourseTarget: { color: "#15803d", fontWeight: "700", fontSize: 13, marginTop: 8 },
  suggestionCard: { flexDirection: "row", gap: 12, padding: 16, borderRadius: 14, borderColor: "#e2e8f0", borderWidth: 1, marginBottom: 10 },
  suggestionNumberBg: { width: 28, height: 28, borderRadius: 8, backgroundColor: "#0FA4AF", justifyContent: "center", alignItems: "center" },
  suggestionNumberText: { color: "#fff", fontWeight: "800", fontSize: 12 },
  suggestionContent: { flex: 1 },
  suggestionTitle: { fontWeight: "700", color: "#0f172a", fontSize: 14 },
  suggestionDetail: { color: "#64748b", fontSize: 13, lineHeight: 20, marginTop: 4 },
  motivationBox: { padding: 18, borderRadius: 16, backgroundColor: "rgba(15,164,175,0.08)", marginBottom: 20 },
  motivationText: { color: "#0f172a", fontWeight: "600", lineHeight: 22, fontSize: 14 },
});
