import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Dimensions, ActivityIndicator, BackHandler, Alert
} from "react-native";
import { getStudentCourses, getAttendanceHistory } from "../../api/studentApi";
import { getUser, clearAuth } from "../../api/authStorage";
import { useFocusEffect } from "@react-navigation/native";

const { width } = Dimensions.get('window');

const dashboardItems = [
  { id: '1', title: 'My Courses', screen: 'StudentCourses', icon: '📖', desc: 'View all your enrolled courses.' },
  { id: '2', title: 'Attendance History', screen: 'AttendanceHistory', icon: '📅', desc: 'Check detailed attendance for each class.' },
  { id: '3', title: 'My Profile', screen: 'ProfileUpload', icon: '👤', desc: 'Review and update your personal details.' },
];

export default function StudentDashboard({ navigation }) {

  const [stats, setStats] = useState({ courses: 0, avgAttendance: "—", attended: 0, totalSessions: 0 });
  const [userName, setUserName] = useState("Student");
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        try {
          setIsLoading(true);
          const [courses, user, historyRes] = await Promise.all([getStudentCourses(), getUser(), getAttendanceHistory()]);
          if (user?.name) setUserName(user.name);
          
          if (Array.isArray(courses)) {
            const historyList = Array.isArray(historyRes) ? historyRes : (historyRes?.history || []);
            const totalSessions = historyList.length;
            const attendedSessions = historyList.filter(r => r.status === true).length;
            
            setStats({
              courses: courses.length,
              avgAttendance: totalSessions > 0 ? `${((attendedSessions / totalSessions) * 100).toFixed(1)}%` : "—",
              attended: attendedSessions,
              totalSessions: totalSessions,
            });
          }
        } catch (e) {
          console.log("Student dashboard load error:", e);
        } finally {
          setIsLoading(false);
        }
      };
      load();
    }, [])
  );

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
    { label: "MY COURSES", value: stats.courses, color: "#3B82F6", bg: "#EFF6FF", icon: "🎓" },
    { label: "ATTENDANCE %", value: stats.avgAttendance, color: "#10B981", bg: "#ECFDF5", icon: "📊" },
    { label: "CLASSES ATTENDED", value: stats.attended, color: "#D946EF", bg: "#FAF5FF", icon: "✓" },
    { label: "TOTAL SESSIONS", value: stats.totalSessions, color: "#F59E0B", bg: "#FFFBEB", icon: "📅" },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Welcome Header */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeRow}>
            <View style={styles.avatarBadge}>
              <Text style={styles.avatarText}>S</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.welcomeGreeting}>Welcome back,</Text>
              <Text style={styles.welcomeName}>{userName}</Text>
            </View>
          </View>
          <Text style={styles.welcomeDesc}>Track your courses and attendance at a glance.</Text>
        </View>

        {/* Stats Grid */}
        {isLoading ? (
          <ActivityIndicator color="#4361EE" size="small" style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.statsGrid}>
            {statCards.map((s, i) => (
              <View key={i} style={[styles.statCard, { backgroundColor: s.bg }]}>
                <View style={styles.statTopRow}>
                  <Text style={styles.statLabel}>{s.label}</Text>
                  <View style={[styles.statIconBadge, { backgroundColor: s.color }]}>
                    <Text style={{ fontSize: 16 }}>{s.icon}</Text>
                  </View>
                </View>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActionsCard}>
          <View style={styles.quickActionsHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <Text style={styles.shortcutsText}>SHORTCUTS</Text>
          </View>
          <View style={styles.actionsList}>
            {dashboardItems.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.actionRow, index < dashboardItems.length - 1 && styles.actionRowBorder]}
                onPress={() => navigation.navigate(item.screen)}
                activeOpacity={0.7}
              >
                <View style={styles.actionIconContainer}>
                  <Text style={styles.actionIconText}>{item.icon}</Text>
                </View>
                <View style={styles.actionTextContainer}>
                  <Text style={styles.actionTitle}>{item.title}</Text>
                  <Text style={styles.actionDesc}>{item.desc}</Text>
                </View>
                <Text style={styles.actionArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* How to Submit */}
        <View style={styles.guideCard}>
          <View style={styles.guideHeader}>
            <View style={[styles.guideIconBg, { backgroundColor: "#DBEAFE" }]}>
              <Text style={{ fontSize: 16 }}>ℹ️</Text>
            </View>
            <Text style={styles.guideHeaderText}>How to Submit Attendance</Text>
          </View>
          {[
            { step: "1", text: "Get the Entry Code from your teacher." },
            { step: "2", text: "Go to My Courses and open the relevant course." },
            { step: "3", text: "Click on the active attendance batch." },
            { step: "4", text: "Enter the Entry Code when prompted." },
            { step: "5", text: "Upload a clear face photo or selfie and confirm." },
            { step: "6", text: "Wait for your teacher to approve your submission." },
            { step: "7", text: "Track your status in Attendance History." },
          ].map((item, i) => (
            <View key={i} style={styles.guideStepRow}>
              <View style={styles.guideStepBadge}>
                <Text style={styles.guideStepNum}>{item.step}</Text>
              </View>
              <Text style={styles.guideStepText}>{item.text}</Text>
            </View>
          ))}
        </View>

        {/* Insights */}
        <View style={[styles.guideCard, { marginTop: 12 }]}>
          <View style={styles.guideHeader}>
            <View style={[styles.guideIconBg, { backgroundColor: "#D1FAE5" }]}>
              <Text style={{ fontSize: 16 }}>📈</Text>
            </View>
            <Text style={styles.guideHeaderText}>Attendance Insights</Text>
          </View>
          {[
            { step: "•", text: "Aim to maintain at least 75% attendance (or higher if your program requires it)." },
            { step: "•", text: "Regularly check Attendance History to ensure there are no missing entries." },
            { step: "•", text: "If you notice any discrepancy, contact your teacher with the date and course details." },
            { step: "•", text: "Make it a habit to submit attendance as soon as a batch opens." },
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
    backgroundColor: "#10B981",
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
  statValue: { fontSize: 32, fontWeight: "800" },
  statIconBadge: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },

  // Quick Actions
  quickActionsCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    marginBottom: 24,
    overflow: "hidden",
  },
  quickActionsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  shortcutsText: { fontSize: 10, fontWeight: "700", color: "#94A3B8", letterSpacing: 1 },
  actionsList: { paddingHorizontal: 20 },
  actionRow: { flexDirection: "row", alignItems: "center", paddingVertical: 16 },
  actionRowBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  actionIconText: { fontSize: 20 },
  actionTextContainer: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: "700", color: "#1E293B", marginBottom: 2 },
  actionDesc: { fontSize: 12, color: "#94A3B8" },
  actionArrow: { fontSize: 22, color: "#CBD5E1", fontWeight: "300" },

  // Guide Cards
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