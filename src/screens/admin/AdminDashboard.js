import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  BackHandler, SafeAreaView, Dimensions, ActivityIndicator
} from "react-native";
import { getAdminStats } from "../../api/adminApi";
import { getUser } from "../../api/authStorage";
import { useFocusEffect } from "@react-navigation/native";

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

  useEffect(() => {
    const backAction = () => true;
    const bh = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => bh.remove();
  }, []);

  const statCards = [
    { label: "TEACHERS", value: stats.teachers, color: "#F59E0B", bg: "#FEF3C7", icon: "👨‍🏫" },
    { label: "STUDENTS", value: stats.students, color: "#10B981", bg: "#D1FAE5", icon: "👨‍🎓" },
    { label: "DEPARTMENTS", value: stats.departments, color: "#3B82F6", bg: "#DBEAFE", icon: "🏢" },
    { label: "PROGRAMS", value: stats.programs, color: "#8B5CF6", bg: "#EDE9FE", icon: "🎓" },
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

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>A</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Admin Dashboard</Text>
            <Text style={styles.subtitle}>Institution-wide overview of teachers, students, departments, and programs.</Text>
          </View>
        </View>

        {/* Stat Cards Grid */}
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
            <TouchableOpacity
              key={i}
              style={styles.actionCard}
              activeOpacity={0.7}
              onPress={() => navigation.navigate(action.screen)}
            >
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

        {/* Setup Guide */}
        <View style={styles.guideRow}>
          <View style={styles.guideCard}>
            <View style={styles.guideHeader}>
              <Text style={styles.guideHeaderIcon}>⚙️</Text>
              <Text style={styles.guideHeaderText}>System Setup Guide</Text>
            </View>
            {[
              "1. Create Departments",
              "2. Add Programs under departments",
              "3. Configure Academic Years & Semesters",
              "4. Register Teachers & assign departments",
              "5. Create Courses for semesters",
              "6. Import Students to programs",
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
  headerBadge: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#4361EE", justifyContent: "center", alignItems: "center", marginRight: 14 },
  headerBadgeText: { color: "#FFF", fontSize: 18, fontWeight: "800" },
  title: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 13, color: "#64748B", marginTop: 2 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 24 },
  statCard: { width: (width - 52) / 2, borderRadius: 16, padding: 16, marginBottom: 12 },
  statLabel: { fontSize: 11, fontWeight: "700", color: "#64748B", letterSpacing: 0.5, marginBottom: 8 },
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