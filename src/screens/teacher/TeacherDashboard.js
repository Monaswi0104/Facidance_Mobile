import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Dimensions, ActivityIndicator, BackHandler, Alert
} from "react-native";
import { getTeacherCourses } from "../../api/teacherApi";
import { getUser, clearAuth } from "../../api/authStorage";
import { useFocusEffect } from "@react-navigation/native";

const { width } = Dimensions.get("window");

export default function TeacherDashboard({ navigation }) {
  const [stats, setStats] = useState({ courses: 0, students: 0, semesters: 0, attendance: 0 });
  const [userName, setUserName] = useState("Teacher");
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const [courses, user] = await Promise.all([getTeacherCourses(), getUser()]);
        if (user?.name) setUserName(user.name);
        if (Array.isArray(courses)) {
          const totalStudents = courses.reduce((sum, c) => sum + (c._count?.students || 0), 0);
          const totalAttendance = courses.reduce((sum, c) => sum + (c._count?.attendance || 0), 0);
          const semesters = new Set(courses.map(c => c.semester?.id).filter(Boolean));
          setStats({ courses: courses.length, students: totalStudents, semesters: semesters.size, attendance: totalAttendance });
        }
      } catch (e) { console.log(e); }
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
    { label: "MY COURSES", value: stats.courses, color: "#F59E0B", bg: "#FFFBEB", icon: "📚" },
    { label: "TOTAL STUDENTS", value: stats.students, color: "#10B981", bg: "#ECFDF5", icon: "👨‍🎓" },
    { label: "ACTIVE SEMESTERS", value: stats.semesters, color: "#3B82F6", bg: "#EFF6FF", icon: "📅" },
    { label: "TOTAL ATTENDANCE", value: stats.attendance, color: "#8B5CF6", bg: "#F5F3FF", icon: "✅" },
  ];

  const quickActions = [
    { title: "Create Attendance Batch", desc: "Start a new attendance session", screen: "AttendanceCamera", icon: "📸", color: "#4361EE" },
    { title: "View My Courses", desc: "Manage courses and enrolled students", screen: "MyCourses", icon: "📚", color: "#10B981" },
    { title: "Attendance Reports", desc: "Analyze and export attendance", screen: "AttendanceReport", icon: "📊", color: "#F59E0B" },
    { title: "Manage Students", desc: "Import and update student records", screen: "StudentEnrollment", icon: "👨‍🎓", color: "#EF4444" },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Welcome Header */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeRow}>
            <View style={styles.avatarBadge}>
              <Text style={styles.avatarText}>T</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.welcomeGreeting}>Welcome back,</Text>
              <Text style={styles.welcomeName}>{userName}</Text>
            </View>
          </View>
          <Text style={styles.welcomeDesc}>A focused overview of your courses, students, and attendance in one place.</Text>
        </View>

        {/* Stats Grid */}
        {isLoading ? (
          <ActivityIndicator size="small" color="#4361EE" style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.statsGrid}>
            {statCards.map((s, i) => (
              <View key={i} style={[styles.statCard, { backgroundColor: s.bg }]}>
                <View style={styles.statTopRow}>
                  <Text style={styles.statLabel}>{s.label}</Text>
                  <View style={[styles.statIconBg, { backgroundColor: s.color }]}>
                    <Text style={styles.statIconText}>{s.icon}</Text>
                  </View>
                </View>
                <Text style={[styles.statNumber, { color: s.color }]}>{s.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <Text style={styles.sectionCount}>{quickActions.length} items</Text>
        </View>
        <View style={styles.actionsContainer}>
          {quickActions.map((action, i) => (
            <TouchableOpacity key={i} style={styles.actionCard} activeOpacity={0.7}
              onPress={() => navigation.navigate(action.screen)}>
              <View style={[styles.actionIconBg, { backgroundColor: action.color + "12" }]}>
                <Text style={styles.actionIcon}>{action.icon}</Text>
              </View>
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDesc}>{action.desc}</Text>
              </View>
              <Text style={styles.actionArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Workflow Guides */}
        <View style={styles.guideCard}>
          <View style={styles.guideHeader}>
            <View style={styles.guideIconBg}>
              <Text style={{ fontSize: 16 }}>⚙️</Text>
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
              <Text style={{ fontSize: 16 }}>📥</Text>
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
  welcomeRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatarBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#4361EE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  avatarText: { color: "#FFF", fontSize: 18, fontWeight: "800" },
  welcomeGreeting: { fontSize: 13, color: "#64748B" },
  welcomeName: { fontSize: 20, fontWeight: "800", color: "#0F172A", marginTop: 1 },
  welcomeDesc: { fontSize: 13, color: "#64748B", lineHeight: 19 },

  // Stats
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 24 },
  statCard: {
    width: (width - 52) / 2,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  statLabel: { fontSize: 10, fontWeight: "700", color: "#64748B", letterSpacing: 0.5 },
  statNumber: { fontSize: 32, fontWeight: "800" },
  statIconBg: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  statIconText: { fontSize: 16 },

  // Section
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#1E293B" },
  sectionCount: { fontSize: 12, fontWeight: "600", color: "#94A3B8" },

  // Actions
  actionsContainer: { marginBottom: 24 },
  actionCard: {
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  actionIconBg: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 14 },
  actionIcon: { fontSize: 22 },
  actionInfo: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: "700", color: "#1E293B", marginBottom: 2 },
  actionDesc: { fontSize: 12, color: "#94A3B8" },
  actionArrow: { fontSize: 22, color: "#CBD5E1", fontWeight: "300" },

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