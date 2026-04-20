import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Dimensions, ActivityIndicator, BackHandler, Alert
} from "react-native";
import { getTeacherCourses, getTeacherStats } from "../../api/teacherApi";
import { getUser, clearAuth } from "../../api/authStorage";
import { useFocusEffect } from "@react-navigation/native";
import { Theme } from "../../theme/Theme";
import { BookOpen, Users, Calendar, CheckCircle, ScanLine, BookMarked, BarChart2, UserPlus, Settings, FileDown } from "lucide-react-native";

const { width } = Dimensions.get("window");

export default function TeacherDashboard({ navigation }) {
  const [stats, setStats] = useState({ courses: 0, students: 0, semesters: 0, attendance: 0 });
  const [userName, setUserName] = useState("Teacher");
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const [coursesData, statsData, user] = await Promise.all([
          getTeacherCourses(),
          getTeacherStats().catch(() => null),
          getUser(),
        ]);
        console.log("[TeacherDashboard] coursesData:", JSON.stringify(coursesData));
        console.log("[TeacherDashboard] statsData:", JSON.stringify(statsData));
        console.log("[TeacherDashboard] statsData keys:", statsData ? Object.keys(statsData) : "null");
        const tempCourses = Array.isArray(coursesData) ? coursesData : (coursesData?.courses || []);
        if (tempCourses.length > 0) console.log("[TeacherDashboard] first course keys:", Object.keys(tempCourses[0]));
        if (user?.name) setUserName(user.name);

        // Handle both array response and {courses: [...]} response
        const courses = Array.isArray(coursesData) ? coursesData : (coursesData?.courses || []);
        const courseCount = Array.isArray(courses) ? courses.length : 0;

        // Use stats endpoint data if available, with course-derived fallbacks
        const totalStudents = statsData?.total_students ?? statsData?.totalStudents ?? statsData?.students ??
          courses.reduce((sum, c) => sum + (c._count?.students || c.studentCount || c.student_count || 0), 0);
        const totalAttendance = statsData?.total_attendance ?? statsData?.totalAttendance ?? statsData?.attendance ?? 0;
        const activeSemesters = statsData?.total_semesters ?? statsData?.active_semesters ?? statsData?.activeSemesters ?? statsData?.semesters ?? 0;

        setStats({
          courses: statsData?.total_courses ?? statsData?.totalCourses ?? courseCount,
          students: totalStudents,
          semesters: activeSemesters,
          attendance: totalAttendance,
        });
      } catch (e) { console.log("[TeacherDashboard] Error:", e); }
      finally { setIsLoading(false); }
    };
    load();
  }, []));

  // Back button prompts logout
  useEffect(() => {
    const backAction = () => {
      Alert.alert(
        "Logout",
        "Would you like to logout?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Logout",
            style: "destructive",
            onPress: async () => {
              await clearAuth();
              navigation.reset({ index: 0, routes: [{ name: "Login" }] });
            },
          },
        ]
      );
      return true;
    };
    const bh = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => bh.remove();
  }, []);

  const statCards = [
    { label: "MY COURSES", value: stats.courses, icon: <BookOpen size={18} color="#FFF" />, sub: stats.semesters ? `${stats.semesters} semester${stats.semesters > 1 ? "s" : ""}` : "" },
    { label: "TOTAL\nSTUDENTS", value: stats.students, icon: <Users size={18} color="#FFF" />, sub: stats.students > 0 ? "enrolled" : "" },
    { label: "ACTIVE\nSEMESTERS", value: stats.semesters, icon: <Calendar size={18} color="#FFF" />, sub: "" },
    { label: "TOTAL\nATTENDANCE", value: stats.attendance, icon: <CheckCircle size={18} color="#FFF" />, sub: stats.attendance > 0 ? "records" : "" },
  ];

  const quickActions = [
    { title: "Take Attendance", desc: "Start a new batch", screen: "AttendanceCamera", icon: <ScanLine size={22} color={Theme.colors.primaryDark} /> },
    { title: "My Courses", desc: "Browse & manage", screen: "MyCourses", icon: <BookMarked size={22} color={Theme.colors.primaryDark} /> },
    { title: "Students", desc: "Import & manage", screen: "StudentEnrollment", icon: <UserPlus size={22} color={Theme.colors.primaryDark} /> },
    { title: "Reports", desc: "Export & analyze", screen: "AttendanceReport", icon: <BarChart2 size={22} color={Theme.colors.primaryDark} /> },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Welcome Header */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeGreeting}>Welcome back 👋</Text>
          <Text style={styles.welcomeName}>{userName}</Text>
          <Text style={styles.welcomeDesc}>Here's what's happening across your courses today.</Text>
        </View>

        {/* Stats Grid */}
        {isLoading ? (
          <ActivityIndicator size="small" color={Theme.colors.accent} style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.statsGrid}>
            {statCards.map((s, i) => (
              <View key={i} style={styles.statCard}>
                <View style={styles.statTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statLabel}>{s.label}</Text>
                    <Text style={styles.statNumber}>{s.value}</Text>
                  </View>
                  <View style={styles.statIconBg}>
                    {s.icon}
                  </View>
                </View>
                {!!s.sub && <Text style={styles.statSub}>↗ {s.sub}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Quick Actions — grid layout like the website */}
        <View style={styles.quickGrid}>
          {quickActions.map((action, i) => (
            <TouchableOpacity key={i} style={styles.quickCard} activeOpacity={0.7}
              onPress={() => navigation.navigate(action.screen)}>
              <View style={styles.quickIconBg}>
                {action.icon}
              </View>
              <Text style={styles.quickTitle}>{action.title}</Text>
              <Text style={styles.quickDesc}>{action.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Workflow Guides */}
        <View style={styles.guideCard}>
          <View style={styles.guideHeader}>
            <View style={styles.guideIconBg}>
              <Settings size={16} color="#475569" />
            </View>
            <Text style={styles.guideHeaderText}>Attendance Workflow</Text>
          </View>
          {[
            { step: "1", text: "Open Attendance and click Create Attendance Batch" },
            { step: "2", text: "Select Department → Program → Academic Year → Semester → Course" },
            { step: "3", text: "Share the generated Entry Code with students" },
            { step: "4", text: "Students submit photos using the entry code" },
            { step: "5", text: "Optionally upload classroom photos for face recognition" },
            { step: "6", text: "Review detected faces and approve submissions" },
            { step: "7", text: "Close the batch and generate attendance reports" },
          ].map((item, i) => (
            <View key={i} style={styles.guideStepRow}>
              <View style={styles.guideStepBadge}>
                <Text style={styles.guideStepNum}>{item.step}</Text>
              </View>
              <Text style={styles.guideStepText}>{item.text}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.guideCard, { marginTop: 12, marginBottom: 10 }]}>
          <View style={styles.guideHeader}>
            <View style={styles.guideIconBg}>
              <FileDown size={16} color="#475569" />
            </View>
            <Text style={styles.guideHeaderText}>Student Import Process</Text>
          </View>
          {[
            { step: "1", text: "Go to My Courses or Students in the navigation" },
            { step: "2", text: "Download the sample CSV template provided" },
            { step: "3", text: "Fill in the required student details (name, email, roll, etc.)" },
            { step: "4", text: "Upload the completed CSV and confirm the import preview" },
            { step: "5", text: "Verify that students appear in the course roster" },
          ].map((item, i) => (
            <View key={i} style={styles.guideStepRow}>
              <View style={styles.guideStepBadge}>
                <Text style={styles.guideStepNum}>{item.step}</Text>
              </View>
              <Text style={styles.guideStepText}>{item.text}</Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { padding: 20, paddingBottom: 40 },

  // Welcome Card
  welcomeCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  welcomeGreeting: { fontSize: 14, color: "#64748B", marginBottom: 2 },
  welcomeName: { fontSize: 22, fontWeight: "800", color: "#0F172A", marginBottom: 4 },
  welcomeDesc: { fontSize: 13, color: "#64748B", lineHeight: 19 },

  // Stats
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 24 },
  statCard: {
    width: (width - 52) / 2,
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  statTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  statLabel: { fontSize: 9, fontWeight: "700", color: "#94A3B8", letterSpacing: 0.5, marginBottom: 6 },
  statNumber: { fontSize: 28, fontWeight: "800", color: "#0F172A" },
  statIconBg: { width: 36, height: 36, borderRadius: 10, backgroundColor: Theme.colors.primaryDark, justifyContent: "center", alignItems: "center" },
  statSub: { fontSize: 11, fontWeight: "600", color: "#10B981", marginTop: 6 },

  // Quick Actions Grid (matching website bottom cards)
  quickGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 24 },
  quickCard: {
    width: (width - 52) / 2,
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  quickIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Theme.colors.accentLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  quickTitle: { fontSize: 14, fontWeight: "700", color: "#0F172A", marginBottom: 2 },
  quickDesc: { fontSize: 11, color: "#94A3B8" },

  // Guide
  guideCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  guideHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  guideIconBg: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  guideHeaderText: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  guideStepRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  guideStepBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  guideStepNum: { fontSize: 12, fontWeight: "700", color: "#64748B" },
  guideStepText: { fontSize: 13, color: "#475569", flex: 1 },
});