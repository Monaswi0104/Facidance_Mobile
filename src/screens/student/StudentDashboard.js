import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Dimensions, ActivityIndicator, BackHandler, Alert, RefreshControl
} from "react-native";
import { getStudentCourses, getStudentStats } from "../../api/studentApi";
import { getUser, clearAuth } from "../../api/authStorage";
import { useFocusEffect } from "@react-navigation/native";
import { Theme } from "../../theme/Theme";
import { BookOpen, BarChart3, Clock, ChevronRight, ArrowUpRight, CheckCircle, Lightbulb, AlertTriangle, User } from "lucide-react-native";

const { width } = Dimensions.get('window');

export default function StudentDashboard({ navigation }) {

  const [stats, setStats] = useState({ courses: 0, avgAttendance: "—", avgRaw: 0, attended: 0, totalSessions: 0 });
  const [userName, setUserName] = useState("Student");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      const [courses, user, statsRes] = await Promise.all([getStudentCourses(), getUser(), getStudentStats()]);
      if (user?.name) setUserName(user.name);
      
      const courseList = Array.isArray(courses) ? courses : (courses?.courses || []);
      const rawPct = statsRes?.attendance_percentage ?? 0;
      
      setStats({
        courses: statsRes?.total_courses ?? courseList.length,
        avgAttendance: rawPct != null ? `${rawPct.toFixed(1)}%` : "—",
        avgRaw: rawPct,
        attended: statsRes?.total_present ?? 0,
        totalSessions: 0,
      });
    } catch (e) {
      console.log("Student dashboard load error:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData(false);
    setIsRefreshing(false);
  }, [loadData]);

  useFocusEffect(useCallback(() => {
    loadData(true);
  }, [loadData]));

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

  const getAttendanceColor = (raw) => {
    if (raw >= 75) return "#10B981";
    if (raw >= 50) return "#F59E0B";
    return "#EF4444";
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        contentContainerStyle={styles.container} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={["#10B981"]} tintColor="#10B981" />
        }
      >

        {/* Welcome Header */}
        <View style={styles.welcomeSection}>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeTitle}>Welcome back 👋</Text>
            <Text style={styles.welcomeName}>{userName}</Text>
            <Text style={styles.welcomeSubtitle}>Here's an overview of your attendance and courses.</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.headerBtnOutline} onPress={() => navigation.navigate("AttendanceHistory")}>
              <BarChart3 size={13} color="#475569" style={{ marginRight: 4 }} />
              <Text style={styles.headerBtnOutlineText}>History</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtnFilled} onPress={() => navigation.navigate("StudentCoursesTab")}>
              <BookOpen size={13} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={styles.headerBtnFilledText}>Courses</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtnOutline} onPress={() => navigation.navigate("ProfileUpload")}>
              <User size={13} color="#475569" style={{ marginRight: 4 }} />
              <Text style={styles.headerBtnOutlineText}>Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Row */}
        {isLoading ? (
          <ActivityIndicator color={Theme.colors.accent} size="small" style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statCard} activeOpacity={0.7} onPress={() => navigation.navigate("StudentCoursesTab")}>
              <View style={styles.statTopRow}>
                <Text style={styles.statLabel}>MY COURSES</Text>
                <View style={styles.statIconBg}><BookOpen size={14} color="#FFF" /></View>
              </View>
              <Text style={styles.statNumber}>{stats.courses}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                <CheckCircle size={10} color="#10B981" style={{ marginRight: 3 }} />
                <Text style={styles.statSubText}>enrolled</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.statCard} activeOpacity={0.7} onPress={() => navigation.navigate("AttendanceHistory")}>
              <View style={styles.statTopRow}>
                <Text style={styles.statLabel}>ATTENDANCE RATE</Text>
                <View style={styles.statIconBg}><BarChart3 size={14} color="#FFF" /></View>
              </View>
              <Text style={[styles.statNumber, { color: getAttendanceColor(stats.avgRaw) }]}>{stats.avgAttendance}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                <CheckCircle size={10} color="#10B981" style={{ marginRight: 3 }} />
                <Text style={styles.statSubText}>{stats.avgRaw >= 75 ? "On track" : "Needs attention"}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.statCard} activeOpacity={0.7} onPress={() => navigation.navigate("AttendanceHistory")}>
              <View style={styles.statTopRow}>
                <Text style={styles.statLabel}>CLASSES{"\n"}ATTENDED</Text>
                <View style={styles.statIconBg}><Clock size={14} color="#FFF" /></View>
              </View>
              <Text style={styles.statNumber}>{stats.attended}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* How Attendance Works */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>How Attendance Works</Text>
          <Text style={styles.sectionSubtitle}>Understand how your presence is tracked during class</Text>
          {[
            "Join a class when your teacher invites you.",
            "Upload or capture your face images (front, left, right) from your profile.",
            "Your teacher trains the system using your facial data before the session.",
            "Each class session lasts around 45 minutes.",
            "Attendance is automatically captured every 2 minutes using AI.",
            "Missing more than 2 captures may mark you absent.",
            "Stay present and visible throughout the class to remain marked present.",
          ].map((text, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{String(i + 1).padStart(2, "0")}</Text>
              </View>
              <Text style={styles.stepText}>{text}</Text>
            </View>
          ))}
        </View>

        {/* Attendance Insights */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Attendance Insights</Text>
          <Text style={styles.sectionSubtitle}>Your current standing</Text>

          {/* Big Percentage */}
          <View style={styles.insightCircleCard}>
            <Text style={styles.insightRateLabel}>OVERALL RATE</Text>
            <Text style={[styles.insightBigPercent, { color: getAttendanceColor(stats.avgRaw) }]}>
              {stats.avgAttendance}
            </Text>
            <View style={styles.insightProgressTrack}>
              <View style={[styles.insightProgressFill, { width: `${Math.min(stats.avgRaw, 100)}%`, backgroundColor: getAttendanceColor(stats.avgRaw) }]} />
            </View>
            <Text style={styles.insightTarget}>Target: 75% minimum</Text>
          </View>

          {/* Tips */}
          {[
            { icon: Lightbulb, color: "#F59E0B", text: "Submit attendance as soon as a batch opens." },
            { icon: Lightbulb, color: "#F59E0B", text: "Ensure good lighting when taking your face photo." },
            { icon: AlertTriangle, color: "#F59E0B", text: "Contact your teacher if you notice any discrepancy." },
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <tip.icon size={14} color={tip.color} style={{ marginRight: 8 }} />
              <Text style={styles.tipText}>{tip.text}</Text>
            </View>
          ))}

          {/* Full History */}
          <TouchableOpacity style={styles.fullHistoryBtn} onPress={() => navigation.navigate("AttendanceHistory")}>
            <ArrowUpRight size={14} color="#475569" style={{ marginRight: 6 }} />
            <Text style={styles.fullHistoryText}>Full History</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { padding: 20, paddingBottom: 40 },

  // Welcome
  welcomeSection: { marginBottom: 18, marginTop: 4 },
  welcomeTitle: { fontSize: 18, fontWeight: "700", color: "#64748B", marginBottom: 2 },
  welcomeName: { fontSize: 22, fontWeight: "800", color: "#0F172A", marginBottom: 4 },
  welcomeSubtitle: { fontSize: 13, color: "#64748B", marginBottom: 12 },
  headerButtons: { flexDirection: "row", gap: 8 },
  headerBtnOutline: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E2E8F0",
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
  },
  headerBtnOutlineText: { fontSize: 12, fontWeight: "600", color: "#475569" },
  headerBtnFilled: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Theme.colors.primaryDark,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
  },
  headerBtnFilledText: { fontSize: 12, fontWeight: "600", color: "#FFF" },

  // Stats
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  statCard: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  statLabel: { fontSize: 7, fontWeight: "700", color: "#94A3B8", letterSpacing: 0.4, flex: 1, marginRight: 4 },
  statNumber: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  statSubText: { fontSize: 10, color: "#10B981", fontWeight: "600" },
  statIconBg: { width: 28, height: 28, borderRadius: 8, backgroundColor: Theme.colors.primaryDark, justifyContent: "center", alignItems: "center" },

  // Section Cards
  sectionCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  sectionSubtitle: { fontSize: 12, color: "#94A3B8", marginTop: 2, marginBottom: 16 },

  // Steps
  stepRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  stepBadge: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Theme.colors.primaryDark,
    justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  stepBadgeText: { fontSize: 10, fontWeight: "700", color: "#FFF" },
  stepText: { fontSize: 13, color: "#475569", flex: 1, lineHeight: 18 },

  // Insights
  insightCircleCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  insightRateLabel: { fontSize: 9, fontWeight: "700", color: "#94A3B8", letterSpacing: 0.5, marginBottom: 6 },
  insightBigPercent: { fontSize: 40, fontWeight: "800", marginBottom: 8 },
  insightProgressTrack: { width: "80%", height: 6, borderRadius: 3, backgroundColor: "#E2E8F0", overflow: "hidden", marginBottom: 6 },
  insightProgressFill: { height: "100%", borderRadius: 3 },
  insightTarget: { fontSize: 11, color: "#94A3B8" },

  // Tips
  tipRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  tipText: { fontSize: 12, color: "#475569", flex: 1 },

  // Full History
  fullHistoryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0",
    paddingVertical: 12, borderRadius: 10, marginTop: 14,
  },
  fullHistoryText: { fontSize: 13, fontWeight: "600", color: "#475569" },
});