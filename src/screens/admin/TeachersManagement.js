import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ScrollView, Alert, ActivityIndicator
} from "react-native";
import { getTeachers, approveTeacher, deleteTeacher, getDepartments } from "../../api/adminApi";
import { useFocusEffect } from "@react-navigation/native";

export default function TeachersManagement() {
  const [approved, setApproved] = useState([]);
  const [pending, setPending] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0 });

  const loadTeachers = async () => {
    try {
      setIsLoading(true);
      const [teacherData, deptData] = await Promise.all([getTeachers(), getDepartments()]);
      const all = teacherData.teachers || teacherData || [];
      setDepartments(deptData.departments || deptData || []);

      const app = all.filter(t => !t.isPending).map(t => ({
        id: t.id, userId: t.userId, name: t.name || t.user?.name,
        email: t.email || t.user?.email || "—",
        dept: t.departmentName || t.department?.name || "Unassigned",
      }));
      const pen = all.filter(t => t.isPending).map(t => ({
        id: t.id, userId: t.userId, name: t.name || t.user?.name,
        email: t.email || t.user?.email || "—",
        dept: "—",
      }));

      setApproved(app);
      setPending(pen);
      setStats({ total: all.length, pending: pen.length, approved: app.length });
    } catch (e) { console.log(e); }
    finally { setIsLoading(false); }
  };

  useFocusEffect(useCallback(() => { loadTeachers(); }, []));

  const handleApprove = (teacher) => {
    Alert.alert("Approve Teacher", `Approve ${teacher.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Approve", onPress: async () => {
          try {
            const deptId = departments.length > 0 ? departments[0].id : null;
            await approveTeacher(teacher.userId || teacher.id, deptId);
            Alert.alert("✅ Approved", `${teacher.name} has been approved.`);
            loadTeachers();
          } catch (e) { Alert.alert("Error", "Failed to approve."); }
        }
      },
    ]);
  };

  const handleDelete = (teacher) => {
    Alert.alert("Delete Teacher", `Remove ${teacher.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            await deleteTeacher(teacher.userId || teacher.id);
            Alert.alert("Done", `${teacher.name} removed.`);
            loadTeachers();
          } catch (e) { Alert.alert("Error", "Failed to delete."); }
        }
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.headerBadge, { backgroundColor: "#F59E0B" }]}>
            <Text style={styles.headerBadgeText}>👨‍🏫</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Teachers Management</Text>
            <Text style={styles.subtitle}>Approve new teachers, assign departments, and manage faculty records.</Text>
          </View>
        </View>

        {/* Stats Row */}
        {isLoading ? (
          <ActivityIndicator size="small" color="#4361EE" style={{ marginVertical: 16 }} />
        ) : (
          <View style={styles.statsRow}>
            <View style={styles.miniStat}>
              <Text style={styles.miniLabel}>TOTAL</Text>
              <Text style={styles.miniValue}>{stats.total}</Text>
              <Text style={styles.miniSub}>Teachers</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={styles.miniLabel}>PENDING</Text>
              <Text style={[styles.miniValue, { color: "#F59E0B" }]}>{stats.pending}</Text>
              <Text style={styles.miniSub}>Requests</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={styles.miniLabel}>APPROVED</Text>
              <Text style={[styles.miniValue, { color: "#10B981" }]}>{stats.approved}</Text>
              <Text style={styles.miniSub}>Active</Text>
            </View>
          </View>
        )}

        {/* Pending Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEmoji}>⏳</Text>
          <Text style={styles.sectionTitle}>Pending Approvals</Text>
          <View style={[styles.countBadge, { backgroundColor: "#FEF3C7" }]}>
            <Text style={[styles.countText, { color: "#D97706" }]}>{pending.length} pending</Text>
          </View>
        </View>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionSubtitle}>Review new registrations and assign them to departments</Text>
          {pending.length === 0 ? (
            <Text style={styles.emptyText}>No pending teacher registrations right now.</Text>
          ) : (
            pending.map((t) => (
              <View key={t.id} style={styles.teacherRow}>
                <View style={styles.teacherInfo}>
                  <Text style={styles.teacherName}>{t.name}</Text>
                  <Text style={styles.teacherEmail}>📧 {t.email}</Text>
                </View>
                <View style={styles.actionBtns}>
                  <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(t)}>
                    <Text style={styles.approveBtnText}>✅ Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => handleDelete(t)}>
                    <Text style={styles.rejectBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Approved Section */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionEmoji}>✅</Text>
          <Text style={styles.sectionTitle}>Approved Teachers</Text>
          <View style={[styles.countBadge, { backgroundColor: "#D1FAE5" }]}>
            <Text style={[styles.countText, { color: "#059669" }]}>{approved.length} active</Text>
          </View>
        </View>
        <View style={styles.sectionCard}>
          <Text style={styles.sectionSubtitle}>Teachers already assigned to a department</Text>
          {approved.length === 0 ? (
            <Text style={styles.emptyText}>No approved teachers yet.</Text>
          ) : (
            approved.map((t) => (
              <View key={t.id} style={styles.teacherRow}>
                <View style={styles.teacherInfo}>
                  <Text style={styles.teacherName}>{t.name}</Text>
                  <Text style={styles.teacherEmail}>📧 {t.email}</Text>
                  <Text style={styles.teacherDept}>Department: <Text style={{ color: "#4361EE" }}>{t.dept}</Text></Text>
                </View>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(t)}>
                  <Text style={styles.deleteBtnText}>🗑 Delete</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 16, marginTop: 8 },
  headerBadge: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 14 },
  headerBadgeText: { fontSize: 20 },
  title: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 13, color: "#64748B", marginTop: 2 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  miniStat: { flex: 1, backgroundColor: "#FFF", borderRadius: 14, padding: 14, marginHorizontal: 4, alignItems: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  miniLabel: { fontSize: 10, fontWeight: "700", color: "#94A3B8", letterSpacing: 0.5, marginBottom: 4 },
  miniValue: { fontSize: 22, fontWeight: "800", color: "#1E293B" },
  miniSub: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  sectionEmoji: { fontSize: 18, marginRight: 8 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#1E293B", flex: 1 },
  countBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  countText: { fontSize: 12, fontWeight: "700" },
  sectionCard: { backgroundColor: "#FFF", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  sectionSubtitle: { fontSize: 13, color: "#94A3B8", marginBottom: 14 },
  emptyText: { fontSize: 14, color: "#94A3B8", textAlign: "center", paddingVertical: 20 },
  teacherRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  teacherInfo: { flex: 1 },
  teacherName: { fontSize: 15, fontWeight: "700", color: "#1E293B", marginBottom: 2 },
  teacherEmail: { fontSize: 12, color: "#64748B", marginBottom: 2 },
  teacherDept: { fontSize: 12, color: "#64748B" },
  actionBtns: { flexDirection: "row", alignItems: "center" },
  approveBtn: { backgroundColor: "#D1FAE5", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginRight: 6 },
  approveBtnText: { fontSize: 12, fontWeight: "700", color: "#059669" },
  rejectBtn: { backgroundColor: "#FEE2E2", width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  rejectBtnText: { fontSize: 14, fontWeight: "700", color: "#EF4444" },
  deleteBtn: { backgroundColor: "#FEE2E2", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  deleteBtnText: { fontSize: 12, fontWeight: "700", color: "#EF4444" },
});