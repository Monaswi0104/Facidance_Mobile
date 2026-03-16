import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Dimensions, ActivityIndicator, BackHandler
} from "react-native";
import { getTeacherCourses } from "../../api/teacherApi";
import { getUser } from "../../api/authStorage";
import { useFocusEffect } from "@react-navigation/native";

const { width } = Dimensions.get("window");

export default function TeacherDashboard({ navigation }) {
  const [stats, setStats] = useState({ courses: 0, students: 0, semesters: 0, attendance: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const courses = await getTeacherCourses();
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

  useEffect(() => {
    const bh = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => bh.remove();
  }, []);

  const statCards = [
    { label: "MY COURSES", value: stats.courses, color: "#F59E0B", bg: "#FEF3C7", icon: "📚" },
    { label: "TOTAL STUDENTS", value: stats.students, color: "#10B981", bg: "#D1FAE5", icon: "👨‍🎓" },
    { label: "ACTIVE SEMESTERS", value: stats.semesters, color: "#3B82F6", bg: "#DBEAFE", icon: "📅" },
    { label: "TOTAL ATTENDANCE", value: stats.attendance, color: "#8B5CF6", bg: "#EDE9FE", icon: "✅" },
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

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.headerBadge, { backgroundColor: "#4361EE" }]}>
            <Text style={styles.headerBadgeText}>T</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Teacher Dashboard</Text>
            <Text style={styles.subtitle}>A focused overview of your courses, students, and attendance in one place.</Text>
          </View>
        </View>

        {/* Stats Grid */}
        {isLoading ? (
          <ActivityIndicator size="small" color="#4361EE" style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.statsGrid}>
            {statCards.map((s, i) => (
              <View key={i} style={[styles.statCard, { backgroundColor: s.bg }]}>
                <Text style={styles.statLabel}>{s.label}</Text>
                <View style={styles.statRow}>
                  <Text style={[styles.statNumber, { color: s.color }]}>{s.value}</Text>
                  <View style={[styles.statIconBg, { backgroundColor: s.color }]}>
                    <Text style={styles.statIconText}>{s.icon}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsContainer}>
          {quickActions.map((action, i) => (
            <TouchableOpacity key={i} style={styles.actionCard} activeOpacity={0.7}
              onPress={() => navigation.navigate(action.screen)}>
              <View style={[styles.actionIconBg, { backgroundColor: action.color + "15" }]}>
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

        {/* Workflow Guide */}
        <View style={styles.guideRow}>
          <View style={styles.guideCard}>
            <View style={styles.guideHeader}>
              <Text style={styles.guideHeaderIcon}>⚙️</Text>
              <Text style={styles.guideHeaderText}>Attendance Workflow</Text>
            </View>
            {[
              "1. Open Attendance and click Create Attendance Batch",
              "2. Select Department → Program → Academic Year → Semester → Course",
              "3. Share the generated Entry Code with students",
              "4. Students submit photos using the entry code",
              "5. Optionally upload classroom photos for face recognition",
              "6. Review detected faces and approve submissions",
              "7. Close the batch and generate attendance reports",
            ].map((step, i) => (
              <Text key={i} style={styles.guideStep}>{step}</Text>
            ))}
          </View>

          <View style={[styles.guideCard, { marginTop: 12 }]}>
            <View style={styles.guideHeader}>
              <Text style={styles.guideHeaderIcon}>📥</Text>
              <Text style={styles.guideHeaderText}>Student Import Process</Text>
            </View>
            {[
              "1. Go to My Courses or Students in the navigation",
              "2. Download the sample CSV template provided",
              "3. Fill in the required student details (name, email, roll, etc.)",
              "4. Upload the completed CSV and confirm the import preview",
              "5. Verify that students appear in the course roster",
            ].map((step, i) => (
              <Text key={i} style={styles.guideStep}>{step}</Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20, marginTop: 8 },
  headerBadge: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 14 },
  headerBadgeText: { color: "#FFF", fontSize: 18, fontWeight: "800" },
  title: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 12, color: "#64748B", marginTop: 2 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 24 },
  statCard: { width: (width - 52) / 2, borderRadius: 16, padding: 16, marginBottom: 12 },
  statLabel: { fontSize: 10, fontWeight: "700", color: "#64748B", letterSpacing: 0.5, marginBottom: 8 },
  statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statNumber: { fontSize: 28, fontWeight: "800" },
  statIconBg: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  statIconText: { fontSize: 18 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#1E293B", marginBottom: 12 },
  actionsContainer: { marginBottom: 24 },
  actionCard: { backgroundColor: "#FFF", flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 14, marginBottom: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  actionIconBg: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 14 },
  actionIcon: { fontSize: 22 },
  actionInfo: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: "700", color: "#1E293B", marginBottom: 2 },
  actionDesc: { fontSize: 13, color: "#64748B" },
  actionArrow: { fontSize: 22, color: "#CBD5E1", fontWeight: "300" },
  guideRow: { marginBottom: 10 },
  guideCard: { backgroundColor: "#FFF", borderRadius: 14, padding: 18, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  guideHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  guideHeaderIcon: { fontSize: 18, marginRight: 8 },
  guideHeaderText: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  guideStep: { fontSize: 13, color: "#475569", lineHeight: 22, marginBottom: 2 },
});