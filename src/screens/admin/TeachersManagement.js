import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ScrollView, Alert, ActivityIndicator, Modal, Dimensions
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { getTeachers, approveTeacher, deleteTeacher, getDepartments } from "../../api/adminApi";
import { useFocusEffect } from "@react-navigation/native";

export default function TeachersManagement() {
  const [approved, setApproved] = useState([]);
  const [pending, setPending] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0 });
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  // For inline department assignment
  const [selectedTeacherForDept, setSelectedTeacherForDept] = useState(null);
  const [selectedDeptId, setSelectedDeptId] = useState(null);

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
        courses: t.courses || [],
        createdAt: t.createdAt,
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
    // Toggle the expansion
    if (selectedTeacherForDept === teacher.id) {
      setSelectedTeacherForDept(null);
      setSelectedDeptId(null);
    } else {
      setSelectedTeacherForDept(teacher.id);
      setSelectedDeptId(departments.length > 0 ? departments[0].id : null);
    }
  };

  const confirmApproval = async (teacher) => {
    if (!selectedDeptId) {
      Alert.alert("Missing", "Please select a department first.");
      return;
    }
    
    try {
      await approveTeacher(teacher.userId || teacher.id, selectedDeptId);
      Alert.alert("✅ Approved", `${teacher.name} has been approved and assigned to the department.`);
      setSelectedTeacherForDept(null);
      setSelectedDeptId(null);
      loadTeachers();
    } catch (e) { 
      Alert.alert("Error", "Failed to approve."); 
    }
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
            pending.map((t) => {
              const isExpanded = selectedTeacherForDept === t.id;
              
              return (
                <View key={t.id} style={[styles.teacherRow, isExpanded && styles.teacherRowExpanded]}>
                  {/* Main Row */}
                  <View style={styles.teacherMainRow}>
                    <View style={styles.teacherInfo}>
                      <Text style={styles.teacherName}>{t.name}</Text>
                      <Text style={styles.teacherEmail}>📧 {t.email}</Text>
                      <Text style={styles.pendingStatusText}>Pending approval</Text>
                    </View>
                    <View style={styles.actionBtns}>
                      <TouchableOpacity 
                        style={[styles.approveBtn, isExpanded && styles.approveBtnActive]} 
                        onPress={() => handleApprove(t)}
                      >
                        <Text style={[styles.approveBtnText, isExpanded && styles.approveBtnTextActive]}>
                          {isExpanded ? "Cancel" : "Assign & Approve"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.rejectBtn} onPress={() => handleDelete(t)}>
                        <Text style={styles.rejectBtnText}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Expanded Assignment Area */}
                  {isExpanded && (
                    <View style={styles.assignmentArea}>
                      <Text style={styles.assignmentLabel}>ASSIGN DEPARTMENT</Text>
                      <View style={styles.assignmentControls}>
                        
                        <View style={styles.pickerContainer}>
                          <Picker
                            selectedValue={selectedDeptId}
                            onValueChange={(itemValue) => setSelectedDeptId(itemValue)}
                            style={styles.picker}
                            mode="dropdown"
                          >
                            <Picker.Item label="Select department" value={null} color="#94A3B8" />
                            {departments.map(d => (
                              <Picker.Item key={d.id} label={d.name} value={d.id} color="#1E293B" />
                            ))}
                          </Picker>
                        </View>
                        
                        <TouchableOpacity style={styles.confirmBtn} onPress={() => confirmApproval(t)}>
                          <Text style={styles.confirmBtnText}>✓ Confirm</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
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
              <TouchableOpacity key={t.id} style={styles.teacherRow} activeOpacity={0.7} onPress={() => setSelectedTeacher(t)}>
                <View style={styles.teacherInfo}>
                  <Text style={styles.teacherName}>{t.name}</Text>
                  <Text style={styles.teacherEmail}>📧 {t.email}</Text>
                  <Text style={styles.teacherDept}>Department: <Text style={{ color: "#4361EE" }}>{t.dept}</Text></Text>
                  <Text style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>Tap to view details →</Text>
                </View>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(t)}>
                  <Text style={styles.deleteBtnText}>🗑 Delete</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </View>

      </ScrollView>

      {/* Teacher Detail Modal */}
      <Modal visible={!!selectedTeacher} transparent animationType="slide">
        <View style={styles.detailOverlay}>
          <View style={styles.detailCard}>
            {/* Profile Header */}
            <View style={styles.detailProfileSection}>
              <View style={styles.detailAvatar}>
                <Text style={styles.detailAvatarText}>{selectedTeacher?.name?.charAt(0) || "T"}</Text>
              </View>
              <Text style={styles.detailName}>{selectedTeacher?.name}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>Faculty</Text>
              </View>
            </View>

            {/* Info List */}
            <View style={styles.detailInfoList}>
              <View style={styles.detailInfoItem}>
                <Text style={styles.detailInfoIcon}>📧</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailInfoItemLabel}>Email</Text>
                  <Text style={styles.detailInfoItemValue}>{selectedTeacher?.email}</Text>
                </View>
              </View>
              <View style={styles.detailInfoItem}>
                <Text style={styles.detailInfoIcon}>🏢</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailInfoItemLabel}>Department</Text>
                  <Text style={styles.detailInfoItemValue}>{selectedTeacher?.dept}</Text>
                </View>
              </View>
            </View>

            {/* Stats Row */}
            <View style={styles.detailStatsRow}>
              <View style={styles.detailStatBox}>
                <Text style={styles.detailStatNumber}>{selectedTeacher?.courses?.length || 0}</Text>
                <Text style={styles.detailStatLabel}>Courses</Text>
              </View>
              <View style={[styles.detailStatBox, { borderLeftWidth: 1, borderLeftColor: "#E2E8F0" }]}>
                <Text style={styles.detailStatNumber}>{selectedTeacher?.courses?.reduce((a, c) => a + (c.students || 0), 0) || 0}</Text>
                <Text style={styles.detailStatLabel}>Students</Text>
              </View>
            </View>

            {/* Courses List */}
            <Text style={styles.detailSectionTitle}>Courses Teaching</Text>
            <ScrollView style={{ maxHeight: Dimensions.get('window').height * 0.28 }} showsVerticalScrollIndicator={false}>
              {selectedTeacher?.courses?.length > 0 ? (
                selectedTeacher.courses.map((c, idx) => (
                  <View key={c.id || idx} style={styles.courseItem}>
                    <View style={styles.courseItemLeft}>
                      <Text style={styles.courseItemEmoji}>📖</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.courseItemName}>{c.name}</Text>
                      <Text style={styles.courseItemCode}>{c.code}</Text>
                      <View style={styles.courseItemTagsRow}>
                        <View style={[styles.courseTag, { backgroundColor: "#EEF2FF" }]}>
                          <Text style={[styles.courseTagText, { color: "#4361EE" }]}>{c.program}</Text>
                        </View>
                        <View style={[styles.courseTag, { backgroundColor: "#F0FDF4" }]}>
                          <Text style={[styles.courseTagText, { color: "#10B981" }]}>{c.semester}</Text>
                        </View>
                        <View style={[styles.courseTag, { backgroundColor: "#FEF3C7" }]}>
                          <Text style={[styles.courseTagText, { color: "#D97706" }]}>👥 {c.students}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.detailEmpty}>No courses assigned yet.</Text>
              )}
            </ScrollView>

            {/* Close */}
            <TouchableOpacity style={styles.detailCloseBtn} activeOpacity={0.7} onPress={() => setSelectedTeacher(null)}>
              <Text style={styles.detailCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  teacherRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  teacherRowExpanded: { backgroundColor: "#F8FAFC", paddingHorizontal: 10, marginHorizontal: -10, borderRadius: 12, borderBottomWidth: 0, marginBottom: 8 },
  teacherMainRow: { flexDirection: "row", alignItems: "flex-start" },
  teacherInfo: { flex: 1 },
  teacherName: { fontSize: 16, fontWeight: "700", color: "#1E293B", marginBottom: 3 },
  teacherEmail: { fontSize: 13, color: "#64748B", marginBottom: 4 },
  teacherDept: { fontSize: 13, color: "#64748B" },
  pendingStatusText: { fontSize: 12, fontWeight: "600", color: "#D97706" },
  actionBtns: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  approveBtn: { backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  approveBtnActive: { backgroundColor: "#F1F5F9", borderColor: "#CBD5E1" },
  approveBtnText: { fontSize: 12, fontWeight: "700", color: "#0F172A" },
  approveBtnTextActive: { color: "#64748B" },
  rejectBtn: { backgroundColor: "#FFF", borderWidth: 1, borderColor: "#FEE2E2", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  rejectBtnText: { fontSize: 12, fontWeight: "700", color: "#EF4444" },
  deleteBtn: { backgroundColor: "#FEE2E2", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  deleteBtnText: { fontSize: 12, fontWeight: "700", color: "#EF4444" },
  
  // Assignment Expansion Styles
  assignmentArea: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  assignmentLabel: { fontSize: 10, fontWeight: "700", color: "#94A3B8", letterSpacing: 0.8, marginBottom: 8, textTransform: "uppercase" },
  assignmentControls: { flexDirection: "row", alignItems: "center" },
  pickerContainer: { flex: 1, height: 44, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, marginRight: 12, justifyContent: "center", backgroundColor: "#FFF" },
  picker: { width: "100%", color: "#0F172A" },
  confirmBtn: { backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E2E8F0", height: 44, paddingHorizontal: 16, borderRadius: 22, justifyContent: "center" },
  confirmBtnText: { fontSize: 13, fontWeight: "600", color: "#64748B" },

  // Teacher Detail Modal
  detailOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  detailCard: { backgroundColor: "#FFF", borderRadius: 24, padding: 24, width: "100%", maxHeight: Dimensions.get('window').height * 0.85 },
  detailProfileSection: { alignItems: "center", marginBottom: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  detailAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#0F172A", justifyContent: "center", alignItems: "center", marginBottom: 12 },
  detailAvatarText: { fontSize: 26, fontWeight: "800", color: "#FFF" },
  detailName: { fontSize: 22, fontWeight: "800", color: "#0F172A", textAlign: "center" },
  roleBadge: { backgroundColor: "#EEF2FF", paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, marginTop: 8 },
  roleBadgeText: { fontSize: 12, fontWeight: "700", color: "#4361EE" },
  detailInfoList: { marginBottom: 16 },
  detailInfoItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: "#E2E8F0" },
  detailInfoIcon: { fontSize: 18, marginRight: 14, width: 24, textAlign: "center" },
  detailInfoItemLabel: { fontSize: 10, fontWeight: "700", color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  detailInfoItemValue: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  detailStatsRow: { flexDirection: "row", backgroundColor: "#F8FAFC", borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: "#E2E8F0" },
  detailStatBox: { flex: 1, alignItems: "center", paddingVertical: 16 },
  detailStatNumber: { fontSize: 24, fontWeight: "800", color: "#0F172A", marginBottom: 4 },
  detailStatLabel: { fontSize: 11, fontWeight: "600", color: "#94A3B8" },
  detailSectionTitle: { fontSize: 13, fontWeight: "800", color: "#64748B", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
  courseItem: { flexDirection: "row", backgroundColor: "#FFF", padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: "#E2E8F0" },
  courseItemLeft: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#F0F9FF", justifyContent: "center", alignItems: "center", marginRight: 12 },
  courseItemEmoji: { fontSize: 16 },
  courseItemName: { fontSize: 14, fontWeight: "700", color: "#1E293B", marginBottom: 2 },
  courseItemCode: { fontSize: 12, fontWeight: "600", color: "#4361EE", marginBottom: 6 },
  courseItemTagsRow: { flexDirection: "row", flexWrap: "wrap" },
  courseTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 6, marginBottom: 4 },
  courseTagText: { fontSize: 10, fontWeight: "700" },
  detailEmpty: { fontSize: 13, color: "#94A3B8", fontStyle: "italic", textAlign: "center", paddingVertical: 16 },
  detailCloseBtn: { marginTop: 16, backgroundColor: "#0F172A", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  detailCloseBtnText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
});