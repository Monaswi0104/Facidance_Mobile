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
              <View key={d.id} style={[styles.itemRow, i < departments.length - 1 && styles.itemBorder]}>
                <View style={[styles.itemDot, { backgroundColor: ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"][i % 5] }]} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{d.name}</Text>
                  <Text style={styles.itemMeta}>📋 {d.programs} programs  ·  👨‍🏫 {d.teachers} teachers</Text>
                </View>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(d)}>
                  <Text style={styles.deleteBtnText}>🗑 Delete</Text>
                </TouchableOpacity>
              </View>
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
});