import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, ActivityIndicator, Modal, TextInput, Dimensions
} from "react-native";
import { getDepartments, createDepartment, deleteDepartment } from "../../api/adminApi";
import { useFocusEffect } from "@react-navigation/native";

const { width } = Dimensions.get("window");

export default function DepartmentsManagement() {
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await getDepartments();
      const list = data.departments || data || [];
      setDepartments(list.map((d) => ({
        id: d.id, name: d.name,
        programs: d.programs?.length || d._count?.programs || 0,
        teachers: d.teachers?.length || d._count?.teachers || 0,
        programsList: d.programs || [],
        teachersList: (d.teachers || []).map(t => {
          const progs = new Set();
          if (t.courses) {
            t.courses.forEach(c => {
               const pName = c?.semester?.academicYear?.program?.name;
               if (pName) progs.add(pName);
            });
          }
          return { ...t, allottedPrograms: Array.from(progs).join(" • ") };
        }),
      })));
    } catch (e) { console.log(e); }
    finally { setIsLoading(false); }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const totalPrograms = departments.reduce((a, d) => a + d.programs, 0);
  const totalTeachers = departments.reduce((a, d) => a + d.teachers, 0);

  const handleAdd = async () => {
    if (!newName.trim()) { Alert.alert("Error", "Please enter a department name."); return; }
    try {
      setIsCreating(true);
      await createDepartment(newName.trim());
      setNewName("");
      setShowAddModal(false);
      Alert.alert("✅ Success", "Department created.");
      loadData();
    } catch (e) { Alert.alert("Error", "Failed to create department."); }
    finally { setIsCreating(false); }
  };

  const handleDelete = (dept) => {
    Alert.alert("Delete Department", `Remove "${dept.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try { await deleteDepartment(dept.id); loadData(); }
          catch (e) { Alert.alert("Error", "Failed to delete."); }
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
            <View style={[styles.badge, { backgroundColor: "#3B82F6" }]}>
              <Text style={styles.badgeText}>D</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Departments</Text>
              <Text style={styles.subtitle}>Manage academic departments and their structure.</Text>
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
              <Text style={styles.statLabel}>TOTAL DEPARTMENTS</Text>
              <View style={styles.statBottom}>
                <Text style={styles.statNumber}>{departments.length}</Text>
                <View style={[styles.statIconBg, { backgroundColor: "#3B82F6" }]}><Text style={styles.statIcon}>🏢</Text></View>
              </View>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>ACTIVE PROGRAMS</Text>
              <View style={styles.statBottom}>
                <Text style={styles.statNumber}>{totalPrograms}</Text>
                <View style={[styles.statIconBg, { backgroundColor: "#EF4444" }]}><Text style={styles.statIcon}>📋</Text></View>
              </View>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>FACULTY</Text>
              <View style={styles.statBottom}>
                <Text style={styles.statNumber}>{totalTeachers}</Text>
                <View style={[styles.statIconBg, { backgroundColor: "#10B981" }]}><Text style={styles.statIcon}>👨‍🏫</Text></View>
              </View>
            </View>
          </View>
        )}

        {/* Dept List */}
        <View style={styles.listHeader}>
          <Text style={styles.listIcon}>🏢</Text>
          <Text style={styles.listTitle}>All Departments</Text>
          <View style={styles.listCountBadge}>
            <Text style={styles.listCountText}>{departments.length} total</Text>
          </View>
        </View>

        <View style={styles.listCard}>
          {departments.length === 0 ? (
            <Text style={styles.emptyText}>No departments created yet.</Text>
          ) : (
            departments.map((d, i) => (
              <TouchableOpacity key={d.id} style={[styles.itemRow, i < departments.length - 1 && styles.itemBorder]} onPress={() => setSelectedDept(d)}>
                <View style={[styles.itemDot, { backgroundColor: ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"][i % 5] }]} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{d.name}</Text>
                  <Text style={styles.itemMeta}>📋 {d.programs} programs  ·  👨‍🏫 {d.teachers} teachers</Text>
                </View>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(d)}>
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
            <Text style={styles.modalTitle}>Add Department</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Department name"
              placeholderTextColor="#94A3B8"
              value={newName}
              onChangeText={setNewName}
            />
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

      {/* Detail Modal */}
      <Modal visible={!!selectedDept} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.detailHeader}>
              <View style={[styles.badge, { backgroundColor: "#3B82F6", width: 44, height: 44, borderRadius: 12 }]}>
                <Text style={[styles.badgeText, { fontSize: 20 }]}>{selectedDept?.name?.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={[styles.modalTitle, { marginBottom: 2 }]}>{selectedDept?.name}</Text>
                <Text style={styles.subtitle}>{selectedDept?.programs} Programs • {selectedDept?.teachers} Teachers</Text>
              </View>
            </View>

            <ScrollView style={{ maxHeight: Dimensions.get('window').height * 0.5 }} showsVerticalScrollIndicator={false}>
              
              <Text style={styles.sectionHeader}>Programs</Text>
              {selectedDept?.programsList?.length > 0 ? (
                selectedDept.programsList.map((p, idx) => (
                  <View key={p.id || idx} style={styles.subItem}>
                    <Text style={styles.subItemIcon}>📋</Text>
                    <Text style={styles.subItemText}>{p.name}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptySubItem}>No programs available.</Text>
              )}

              <Text style={[styles.sectionHeader, { marginTop: 16 }]}>Teachers</Text>
              {selectedDept?.teachersList?.length > 0 ? (
                selectedDept.teachersList.map((t, idx) => (
                  <View key={t.id || idx} style={styles.subItem}>
                    <View style={styles.teacherAvatar}>
                      <Text style={styles.teacherAvatarText}>{t.user?.name?.charAt(0) || "T"}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subItemText}>{t.user?.name || "Unknown Teacher"}</Text>
                      <Text style={styles.subItemSubText}>{t.user?.email || ""}</Text>
                      {!!t.allottedPrograms && (
                        <Text style={[styles.subItemSubText, { color: "#3B82F6", fontWeight: "600", marginTop: 4 }]}>
                          📚 {t.allottedPrograms}
                        </Text>
                      )}
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptySubItem}>No teachers assigned.</Text>
              )}
            </ScrollView>

            <TouchableOpacity style={[styles.modalCancel, { marginTop: 20, backgroundColor: "#F1F5F9", borderRadius: 10, paddingVertical: 14, alignItems: "center" }]} onPress={() => setSelectedDept(null)}>
              <Text style={[styles.modalCancelText, { marginRight: 0 }]}>Close Details</Text>
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
  statCard: { flex: 1, backgroundColor: "#FFF", borderRadius: 14, padding: 14, marginHorizontal: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
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
  listCard: { backgroundColor: "#FFF", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
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
  modalInput: { backgroundColor: "#F8FAFC", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: "#1E293B", borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 20 },
  modalBtns: { flexDirection: "row", justifyContent: "flex-end" },
  modalCancel: { paddingHorizontal: 16, paddingVertical: 10, marginRight: 10 },
  modalCancelText: { fontSize: 14, fontWeight: "600", color: "#64748B" },
  modalConfirm: { backgroundColor: "#4361EE", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  modalConfirmText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
  detailHeader: { flexDirection: "row", alignItems: "center", marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  sectionHeader: { fontSize: 13, fontWeight: "800", color: "#64748B", marginBottom: 12, textTransform: "uppercase", letterSpacing: 0.5 },
  subItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", padding: 12, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: "#E2E8F0" },
  subItemIcon: { fontSize: 18, marginRight: 12 },
  subItemText: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  subItemSubText: { fontSize: 12, color: "#64748B", marginTop: 2 },
  emptySubItem: { fontSize: 13, color: "#94A3B8", fontStyle: "italic", marginBottom: 8 },
  teacherAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#EEF2FF", justifyContent: "center", alignItems: "center", marginRight: 12 },
  teacherAvatarText: { fontSize: 14, fontWeight: "800", color: "#4361EE" }
});