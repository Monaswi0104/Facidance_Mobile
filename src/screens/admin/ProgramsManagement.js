import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, ActivityIndicator, Modal, TextInput, Dimensions
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { getPrograms, createProgram, deleteProgram, getDepartments, getAdminStats } from "../../api/adminApi";
import { useFocusEffect } from "@react-navigation/native";

const { width } = Dimensions.get("window");

export default function ProgramsManagement() {
  const [programs, setPrograms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);

  const [adminStudents, setAdminStudents] = useState(0);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [progData, deptData, statsData] = await Promise.all([getPrograms(), getDepartments(), getAdminStats()]);
      if (statsData?.students) setAdminStudents(statsData.students);
      const progList = progData.programs || progData || [];
      const deptList = deptData.departments || deptData || [];
      setDepartments(deptList);

      // Build a department lookup map
      const deptMap = {};
      deptList.forEach((d) => { deptMap[d.id] = d.name; });

      setPrograms(progList.map((p) => {
        // Flatten all courses from all semesters of all academic years
        const allCourses = [];
        const teacherSet = new Set();
        (p.academicYears || []).forEach(ay => {
          (ay.semesters || []).forEach(sem => {
            (sem.courses || []).forEach(c => {
              allCourses.push({
                id: c.id, name: c.name, code: c.code,
                teacher: c.teacher?.user?.name || "—",
                teacherEmail: c.teacher?.user?.email || "",
                semester: sem.name,
                academicYear: ay.name,
                students: c._count?.students || 0,
              });
              if (c.teacher?.user?.name) teacherSet.add(c.teacher.user.name);
            });
          });
        });
        return {
          id: p.id, name: p.name,
          departmentId: p.departmentId,
          dept: p.department?.name || deptMap[p.departmentId] || "—",
          students: p._count?.students || 0,
          courses: allCourses,
          teachers: Array.from(teacherSet),
          academicYears: (p.academicYears || []).map(ay => ay.name),
        };
      }));
    } catch (e) { console.log(e); }
    finally { setIsLoading(false); }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const uniqueDepts = new Set(programs.map(p => p.dept).filter(d => d !== "—"));
  const totalStudents = adminStudents || programs.reduce((a, p) => a + p.students, 0);

  const handleAdd = async () => {
    if (!newName.trim()) { Alert.alert("Error", "Enter a program name."); return; }
    if (!selectedDeptId) { Alert.alert("Error", "Select a department."); return; }
    try {
      setIsCreating(true);
      await createProgram(newName.trim(), selectedDeptId);
      setNewName("");
      setShowAddModal(false);
      Alert.alert("✅ Success", "Program created.");
      loadData();
    } catch (e) { Alert.alert("Error", "Failed to create program."); }
    finally { setIsCreating(false); }
  };

  const handleDelete = (prog) => {
    Alert.alert("Delete Program", `Remove "${prog.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try { await deleteProgram(prog.id); loadData(); }
          catch (e) {
            console.log("Delete error:", e);
            Alert.alert("Error", e.message || "Failed to delete.");
          }
        }
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={[styles.badge, { backgroundColor: "#8B5CF6" }]}>
              <Text style={styles.badgeText}>P</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Programs</Text>
              <Text style={styles.subtitle}>Manage academic programs and degree offerings.</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)}>
            <Text style={styles.addBtnText}>＋ Add</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        {isLoading ? (
          <ActivityIndicator size="small" color="#4361EE" style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>TOTAL PROGRAMS</Text>
              <View style={styles.statBottom}><Text style={styles.statNumber}>{programs.length}</Text>
                <View style={[styles.statIconBg, { backgroundColor: "#8B5CF6" }]}><Text style={styles.statIcon}>📋</Text></View>
              </View>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>DEPTS LINKED</Text>
              <View style={styles.statBottom}><Text style={styles.statNumber}>{uniqueDepts.size}</Text>
                <View style={[styles.statIconBg, { backgroundColor: "#3B82F6" }]}><Text style={styles.statIcon}>🏢</Text></View>
              </View>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>STUDENTS</Text>
              <View style={styles.statBottom}><Text style={styles.statNumber}>{totalStudents}</Text>
                <View style={[styles.statIconBg, { backgroundColor: "#10B981" }]}><Text style={styles.statIcon}>👨‍🎓</Text></View>
              </View>
            </View>
          </View>
        )}

        {/* Programs List */}
        <View style={styles.listHeader}>
          <Text style={styles.listIcon}>📋</Text>
          <Text style={styles.listTitle}>All Programs</Text>
          <View style={styles.listCountBadge}><Text style={styles.listCountText}>{programs.length} total</Text></View>
        </View>
        <View style={styles.listCard}>
          {programs.length === 0 ? (
            <Text style={styles.emptyText}>No programs created yet.</Text>
          ) : (
            programs.map((p, i) => (
              <TouchableOpacity key={p.id} style={[styles.itemRow, i < programs.length - 1 && styles.itemBorder]} activeOpacity={0.7} onPress={() => setSelectedProgram(p)}>
                <View style={[styles.itemDot, { backgroundColor: ["#8B5CF6", "#3B82F6", "#10B981", "#F59E0B", "#EF4444"][i % 5] }]} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{p.name}</Text>
                  <Text style={styles.itemMeta}>🏢 {p.dept}  <Text style={{ color: "#94A3B8" }}>ID: {p.id.slice(0, 7)}…</Text></Text>
                  <Text style={{ fontSize: 11, color: "#94A3B8", marginTop: 3 }}>Tap to view details →</Text>
                </View>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(p)}>
                  <Text style={styles.deleteBtnText}>🗑 Delete</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Modal */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Program</Text>
            <TextInput style={styles.modalInput} placeholder="Program name (e.g. B.Tech CSE)" placeholderTextColor="#94A3B8" value={newName} onChangeText={setNewName} />
            <Text style={styles.modalFieldLabel}>Select Department</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedDeptId}
                onValueChange={(itemValue) => setSelectedDeptId(itemValue)}
                style={styles.picker}
                mode="dropdown"
              >
                <Picker.Item label="Select Department" value={null} color="#94A3B8" />
                {departments.map((d) => (
                  <Picker.Item key={d.id} label={d.name} value={d.id} color="#1E293B" />
                ))}
              </Picker>
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowAddModal(false); setNewName(""); }}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleAdd} disabled={isCreating}>
                <Text style={styles.modalConfirmText}>{isCreating ? "Creating..." : "Add"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Program Detail Modal */}
      <Modal visible={!!selectedProgram} transparent animationType="slide">
        <View style={styles.detailOverlay}>
          <View style={styles.detailCard}>
            {/* Header */}
            <View style={styles.detailProfileSection}>
              <View style={styles.detailAvatar}>
                <Text style={styles.detailAvatarText}>📚</Text>
              </View>
              <Text style={styles.detailName}>{selectedProgram?.name}</Text>
              <View style={styles.codeBadge}>
                <Text style={styles.codeBadgeText}>ID: {selectedProgram?.id?.slice(0, 7)}…</Text>
              </View>
            </View>

            {/* Info Items */}
            <ScrollView style={{ maxHeight: Dimensions.get('window').height * 0.45 }} showsVerticalScrollIndicator={false}>
              <View style={styles.detailInfoList}>
                <View style={styles.detailInfoItem}>
                  <Text style={styles.detailInfoIcon}>🏢</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailInfoItemLabel}>Department</Text>
                    <Text style={styles.detailInfoItemValue}>{selectedProgram?.dept}</Text>
                  </View>
                </View>
                <View style={styles.detailInfoItem}>
                  <Text style={styles.detailInfoIcon}>🔑</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailInfoItemLabel}>Full Program ID</Text>
                    <Text style={[styles.detailInfoItemValue, { fontSize: 12, letterSpacing: 0.5 }]}>{selectedProgram?.id}</Text>
                  </View>
                </View>
              </View>

              {/* Stats Row */}
              <View style={styles.detailStatsRow}>
                <View style={styles.detailStatBox}>
                  <Text style={styles.detailStatNumber}>{selectedProgram?.students || 0}</Text>
                  <Text style={styles.detailStatLabel}>Students</Text>
                </View>
                <View style={[styles.detailStatBox, { borderLeftWidth: 1, borderLeftColor: "#E2E8F0" }]}>
                  <Text style={styles.detailStatNumber}>{selectedProgram?.courses?.length || 0}</Text>
                  <Text style={styles.detailStatLabel}>Courses</Text>
                </View>
                <View style={[styles.detailStatBox, { borderLeftWidth: 1, borderLeftColor: "#E2E8F0" }]}>
                  <Text style={styles.detailStatNumber}>{selectedProgram?.teachers?.length || 0}</Text>
                  <Text style={styles.detailStatLabel}>Faculty</Text>
                </View>
              </View>

              {/* Courses */}
              {selectedProgram?.courses?.length > 0 && (
                <>
                  <Text style={styles.detailSectionTitle}>Courses</Text>
                  {selectedProgram.courses.map((c, idx) => (
                    <View key={c.id || idx} style={styles.courseItem}>
                      <View style={styles.courseItemLeft}>
                        <Text style={styles.courseItemEmoji}>📖</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.courseItemName}>{c.name}</Text>
                        <Text style={styles.courseItemCode}>{c.code}</Text>
                        <View style={styles.courseItemTagsRow}>
                          <View style={[styles.courseTag, { backgroundColor: "#EEF2FF" }]}>
                            <Text style={[styles.courseTagText, { color: "#4361EE" }]}>{c.semester}</Text>
                          </View>
                          <View style={[styles.courseTag, { backgroundColor: "#FEF3C7" }]}>
                            <Text style={[styles.courseTagText, { color: "#D97706" }]}>👨‍🏫 {c.teacher}</Text>
                          </View>
                          <View style={[styles.courseTag, { backgroundColor: "#F0FDF4" }]}>
                            <Text style={[styles.courseTagText, { color: "#10B981" }]}>👥 {c.students}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>

            {/* Close */}
            <TouchableOpacity style={styles.detailCloseBtn} activeOpacity={0.7} onPress={() => setSelectedProgram(null)}>
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
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16, marginTop: 8 },
  headerLeft: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 10 },
  badge: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 12 },
  badgeText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  title: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 12, color: "#64748B", marginTop: 2 },
  addBtn: { backgroundColor: "#0F172A", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  addBtnText: { color: "#FFF", fontSize: 13, fontWeight: "700" },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: "#FFF", borderRadius: 14, padding: 14, marginHorizontal: 3, borderWidth: 1, borderColor: "#E2E8F0", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  statLabel: { fontSize: 9, fontWeight: "700", color: "#94A3B8", letterSpacing: 0.5, marginBottom: 8 },
  statBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statNumber: { fontSize: 24, fontWeight: "800", color: "#1E293B" },
  statIconBg: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  statIcon: { fontSize: 16 },
  listHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  listIcon: { fontSize: 16, marginRight: 8 },
  listTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B", flex: 1 },
  listCountBadge: { backgroundColor: "#EEF2FF", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  listCountText: { fontSize: 11, fontWeight: "700", color: "#4361EE" },
  listCard: { backgroundColor: "#FFF", borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "#E2E8F0", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  emptyText: { fontSize: 14, color: "#94A3B8", textAlign: "center", paddingVertical: 24 },
  itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  itemDot: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", marginRight: 12 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: "700", color: "#1E293B", marginBottom: 3 },
  itemMeta: { fontSize: 12, color: "#64748B" },
  deleteBtn: { backgroundColor: "#FEE2E2", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  deleteBtnText: { fontSize: 12, fontWeight: "600", color: "#EF4444" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 30 },
  modalCard: { backgroundColor: "#FFF", borderRadius: 20, padding: 24, width: "100%" },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A", marginBottom: 16 },
  modalInput: { backgroundColor: "#F8FAFC", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: "#1E293B", borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 16 },
  modalFieldLabel: { fontSize: 13, fontWeight: "600", color: "#64748B", marginBottom: 8 },
  pickerWrapper: { height: 48, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, justifyContent: "center", overflow: "hidden", backgroundColor: "#F8FAFC", marginBottom: 20 },
  picker: { width: "100%", color: "#0F172A" },
  modalBtns: { flexDirection: "row", justifyContent: "flex-end" },
  modalCancel: { paddingHorizontal: 16, paddingVertical: 10, marginRight: 10 },
  modalCancelText: { fontSize: 14, fontWeight: "600", color: "#64748B" },
  modalConfirm: { backgroundColor: "#4361EE", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  modalConfirmText: { fontSize: 14, fontWeight: "700", color: "#FFF" },

  // Detail Modal
  detailOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  detailCard: { backgroundColor: "#FFF", borderRadius: 24, padding: 24, width: "100%", maxHeight: Dimensions.get('window').height * 0.85 },
  detailProfileSection: { alignItems: "center", marginBottom: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  detailAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#F5F3FF", justifyContent: "center", alignItems: "center", marginBottom: 12 },
  detailAvatarText: { fontSize: 28 },
  detailName: { fontSize: 20, fontWeight: "800", color: "#0F172A", textAlign: "center", marginBottom: 8 },
  codeBadge: { backgroundColor: "#EEF2FF", paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  codeBadgeText: { fontSize: 12, fontWeight: "700", color: "#4361EE" },
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
  detailCloseBtn: { marginTop: 16, backgroundColor: "#0F172A", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  detailCloseBtnText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
});