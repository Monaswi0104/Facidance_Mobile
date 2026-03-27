import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  BackHandler, SafeAreaView, Dimensions, ActivityIndicator, Alert
} from "react-native";
import { getAdminStats } from "../../api/adminApi";
import { getUser, clearAuth } from "../../api/authStorage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");

export default function AdminDashboard({ navigation }) {
  const [stats, setStats] = useState({ teachers: 0, students: 0, departments: 0, programs: 0, courses: 0 });
  const [userName, setUserName] = useState("Admin");
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [statsData, user] = await Promise.all([getAdminStats(), getUser()]);
      if (statsData) setStats(statsData);
      if (user?.name) setUserName(user.name);
    } catch (e) { console.log(e); }
    finally { setIsLoading(false); }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

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
    { label: "TEACHERS", value: stats.teachers, color: "#F59E0B", bg: "#FFFBEB", icon: "👨‍🏫" },
    { label: "STUDENTS", value: stats.students, color: "#10B981", bg: "#ECFDF5", icon: "👨‍🎓" },
    { label: "DEPARTMENTS", value: stats.departments, color: "#3B82F6", bg: "#EFF6FF", icon: "🏢" },
    { label: "PROGRAMS", value: stats.programs, color: "#8B5CF6", bg: "#F5F3FF", icon: "🎓" },
  ];

  const quickActions = [
    { title: "Approve Teachers", desc: "Review and manage teacher accounts", screen: "TeachersManagement", icon: "👨‍🏫", color: "#4361EE" },
    { title: "Manage Departments", desc: "Create and organize departments", screen: "DepartmentsManagement", icon: "🏢", color: "#10B981" },
    { title: "Configure Courses", desc: "Create and assign courses", screen: "CoursesManagement", icon: "📚", color: "#F59E0B" },
    { title: "Programs & Structure", desc: "Set up academic programs", screen: "ProgramsManagement", icon: "🎓", color: "#8B5CF6" },
    { title: "Student Directory", desc: "View all enrolled students", screen: "StudentsManagement", icon: "👨‍🎓", color: "#EF4444" },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Welcome Header */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeRow}>
            <View style={styles.avatarBadge}>
              <Text style={styles.avatarText}>A</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.welcomeGreeting}>Welcome back,</Text>
              <Text style={styles.welcomeName}>{userName}</Text>
            </View>
          </View>
          <Text style={styles.welcomeDesc}>Institution-wide overview of teachers, students, departments, and programs.</Text>
        </View>

        {/* Stat Cards Grid */}
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
            <TouchableOpacity
              key={i}
              style={styles.actionCard}
              activeOpacity={0.7}
              onPress={() => navigation.navigate(action.screen)}
            >
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

        {/* Setup Guide */}
        <View style={styles.guideCard}>
          <View style={styles.guideHeader}>
            <View style={styles.guideIconBg}>
              <Text style={{ fontSize: 16 }}>⚙️</Text>
            </View>
            <Text style={styles.guideHeaderText}>Setup Guide</Text>
          </View>
          {[
            { step: "1", text: "Create Departments" },
            { step: "2", text: "Add Programs under departments" },
            { step: "3", text: "Configure Academic Years & Semesters" },
            { step: "4", text: "Register Teachers & assign departments" },
            { step: "5", text: "Create Courses for semesters" },
            { step: "6", text: "Import Students to programs" },
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
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  avatarText: { color: "#FFF", fontSize: 18, fontWeight: "800" },
  welcomeGreeting: { fontSize: 13, color: "#64748B" },
  welcomeName: { fontSize: 20, fontWeight: "800", color: "#0F172A", marginTop: 1 },
  welcomeDesc: { fontSize: 13, color: "#64748B", lineHeight: 19 },

  // Stats Grid
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
  statLabel: { fontSize: 11, fontWeight: "700", color: "#64748B", letterSpacing: 0.5 },
  statNumber: { fontSize: 32, fontWeight: "800" },
  statIconBg: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  statIconText: { fontSize: 16 },

  // Section Header
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#1E293B" },
  sectionCount: { fontSize: 12, fontWeight: "600", color: "#94A3B8" },

  // Quick Actions
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

  // Guide Card
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