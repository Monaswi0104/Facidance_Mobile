import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, ActivityIndicator, Dimensions, TextInput, Alert, Platform,
  Modal, KeyboardAvoidingView
} from "react-native";
import { getStudents, updateStudent, markStudentGraduated, deleteStudent } from "../../api/adminApi";
import { useFocusEffect } from "@react-navigation/native";
import RNFS from "react-native-fs";
import Share from "react-native-share";

const { width, height } = Dimensions.get("window");

export default function StudentsManagement() {
  const [students, setStudents] = useState([]);
  const [programs, setPrograms] = useState([]); // Needed for Edit dropdown
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all"); 
  const [search, setSearch] = useState("");

  // Modal States
  const [modalType, setModalType] = useState(null); // 'view' | 'edit' | 'graduate' | 'delete' | null
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", programId: "" });
  const [isActionLoading, setIsActionLoading] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await getStudents();
      const list = data.students || data || [];
      const progs = data.programs || [];
      
      setPrograms(progs);

      setStudents(list.map((u) => {
        const s = u.student || {};
        const primaryProgramObj = s.program || {};
        const primaryProgram = primaryProgramObj.name || "";
        const primaryProgramId = primaryProgramObj.id || "";
        
        const coursePrograms = (s.courses || [])
          .map((c) => c.semester?.academicYear?.program?.name)
          .filter(Boolean);
          
        const allPrograms = [...new Set([primaryProgram, ...coursePrograms].filter(Boolean))];

        return {
          id: u.id, // User ID needed for endpoints
          name: u.name || "Student",
          email: u.email || "—",
          status: s.status || "active",
          primaryProgram,
          primaryProgramId,
          primaryDepartment: primaryProgramObj.department?.name || "",
          allPrograms,
          courseCount: s.courses?.length || 0,
          coursesList: s.courses || [],
          createdAt: u.createdAt || new Date(),
        };
      }));
    } catch (e) { console.log(e); }
    finally { setIsLoading(false); }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const filtered = students.filter((s) => {
    if (filter === "active" && s.status !== "active") return false;
    if (filter === "graduated" && s.status !== "graduated") return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.allPrograms.some((p) => p.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalActive = students.filter((s) => s.status === "active").length;
  const totalGraduated = students.filter((s) => s.status === "graduated").length;

  const filterTabs = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "graduated", label: "Graduated" },
  ];

  const exportCSV = async () => {
    try {
      const header = "Name,Email,Primary Program,All Programs,Status,Courses";
      const rows = filtered.map((s) =>
        `"${s.name}","${s.email}","${s.primaryProgram}","${s.allPrograms.join('; ')}","${s.status}",${s.courseCount}`
      );
      const csv = [header, ...rows].join("\n");
      const path = `${RNFS.DownloadDirectoryPath}/students_export_${Date.now()}.csv`;
      await RNFS.writeFile(path, csv, "utf8");
      await Share.open({
        url: Platform.OS === "android" ? `file://${path}` : path,
        type: "text/csv",
        title: "Export Students Data",
      });
    } catch (e) {
      if (e?.message !== "User did not share") Alert.alert("Export Failed", e?.message);
    }
  };

  // --- ACTIONS ---
  const openModal = (type, student) => {
    setSelectedStudent(student);
    setModalType(type);
    if (type === "edit") {
      setEditForm({
        name: student.name,
        email: student.email,
        programId: student.primaryProgramId,
      });
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedStudent(null);
    setEditForm({ name: "", email: "", programId: "" });
  };

  const handleEdit = async () => {
    if (!editForm.name.trim() || !editForm.email.trim() || !editForm.programId) {
      Alert.alert("Error", "Please fill out all fields.");
      return;
    }
    try {
      setIsActionLoading(true);
      await updateStudent(selectedStudent.id, editForm);
      await loadData();
      closeModal();
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to update student.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleGraduate = async () => {
    try {
      setIsActionLoading(true);
      await markStudentGraduated(selectedStudent.id);
      await loadData();
      closeModal();
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to graduate student.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsActionLoading(true);
      await deleteStudent(selectedStudent.id);
      await loadData();
      closeModal();
    } catch (e) {
      Alert.alert("Error", e.message || "Failed to delete student.");
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={[styles.badge, { backgroundColor: "#EF4444" }]}><Text style={styles.badgeText}>S</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Students</Text>
              <Text style={styles.subtitle}>Manage enrolled students, their programs, status and course mapping.</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.exportBtn} onPress={exportCSV}>
            <Text style={styles.exportBtnText}>📥 Export</Text>
          </TouchableOpacity>
        </View>

        {/* Search & Filters */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, program..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View style={styles.filterRow}>
          {filterTabs.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.filterTab, filter === t.key && styles.filterTabActive]}
              onPress={() => setFilter(t.key)}
            >
              <Text style={[styles.filterText, filter === t.key && styles.filterTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats */}
        {isLoading ? (
          <ActivityIndicator size="small" color="#4361EE" style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>TOTAL</Text>
              <View style={styles.statBottom}>
                <Text style={styles.statNumber}>{students.length}</Text>
                <View style={[styles.statIconBg, { backgroundColor: "#3B82F6" }]}><Text style={styles.statIcon}>👨‍🎓</Text></View>
              </View>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>ACTIVE</Text>
              <View style={styles.statBottom}>
                <Text style={styles.statNumber}>{totalActive}</Text>
                <View style={[styles.statIconBg, { backgroundColor: "#10B981" }]}><Text style={styles.statIcon}>✅</Text></View>
              </View>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>GRADUATED</Text>
              <View style={styles.statBottom}>
                <Text style={styles.statNumber}>{totalGraduated}</Text>
                <View style={[styles.statIconBg, { backgroundColor: "#F59E0B" }]}><Text style={styles.statIcon}>🎓</Text></View>
              </View>
            </View>
          </View>
        )}

        {/* List Header */}
        <View style={styles.listHeader}>
          <Text style={styles.listIcon}>👨‍🎓</Text>
          <Text style={styles.listTitle}>Students List</Text>
          <View style={styles.listCountBadge}>
            <Text style={styles.listCountText}>Showing {filtered.length} of {students.length}</Text>
          </View>
        </View>

        {/* List Card */}
        <View style={styles.listCard}>
          {filtered.length === 0 ? (
            <Text style={styles.emptyText}>No students found.</Text>
          ) : (
            filtered.map((s, i) => (
              <View key={s.id} style={[styles.itemRow, i < filtered.length - 1 && styles.itemBorder]}>
                <View style={styles.itemHeader}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", flex: 1 }}>
                    <View style={[styles.avatar, { backgroundColor: ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#06B6D4", "#EC4899"][i % 7] }]}>
                      <Text style={styles.avatarText}>{(s.name || "?")[0].toUpperCase()}</Text>
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{s.name}</Text>
                      <Text style={styles.itemEmail}>{s.email}</Text>
                      {/* Program Badges */}
                      <View style={styles.badgeRow}>
                        {s.allPrograms.length > 0 ? (
                          s.allPrograms.map((p, pi) => (
                            <View key={pi} style={[styles.programBadge, pi === 0 && styles.primaryBadge]}>
                              <Text style={[styles.programBadgeText, pi === 0 && styles.primaryBadgeText]}>{pi === 0 ? `Primary: ${p}` : p}</Text>
                            </View>
                          ))
                        ) : (<Text style={styles.noProgramText}>No program</Text>)}
                        
                        <View style={[styles.statusBadge, s.status === "active" ? styles.statusActive : styles.statusGrad]}>
                          <Text style={[styles.statusText, s.status === "active" ? styles.statusTextActive : styles.statusTextGrad]}>
                            {s.status === "active" ? "Active" : "Graduated"}
                          </Text>
                        </View>
                        {s.courseCount > 0 && (
                          <View style={styles.courseCountBadge}><Text style={styles.courseCountText}>📚 {s.courseCount}</Text></View>
                        )}
                      </View>
                    </View>
                  </View>
                  
                  {/* Action Buttons Row - matching web dashboard */}
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.actionBtn, { borderColor: '#E2E8F0' }]} onPress={() => openModal("view", s)}>
                      <Text style={styles.actionIcon}>👁️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { borderColor: '#E2E8F0' }]} onPress={() => openModal("edit", s)}>
                      <Text style={styles.actionIcon}>✏️</Text>
                    </TouchableOpacity>
                    {s.status !== "graduated" && (
                      <TouchableOpacity style={[styles.actionBtn, { borderColor: '#FEF3C7', backgroundColor: '#FFFBEB' }]} onPress={() => openModal("graduate", s)}>
                        <Text style={styles.actionIcon}>🎓</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={[styles.actionBtn, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]} onPress={() => openModal("delete", s)}>
                      <Text style={styles.actionIcon}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* --- MODALS --- */}
      <Modal visible={modalType !== null} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeModalBtn} onPress={closeModal}><Text style={styles.closeIcon}>✕</Text></TouchableOpacity>
            
            {/* View Details Modal */}
            {modalType === "view" && selectedStudent && (
              <ScrollView>
                <View style={styles.modalHeader}><Text style={styles.modalIcon}>👁️</Text><Text style={styles.modalTitle}>Student Details</Text></View>
                <View style={styles.viewRow}><Text style={styles.viewLabel}>Name:</Text><Text style={styles.viewValue}>{selectedStudent.name}</Text></View>
                <View style={styles.viewRow}><Text style={styles.viewLabel}>Email:</Text><Text style={styles.viewValue}>{selectedStudent.email}</Text></View>
                <View style={styles.viewRow}><Text style={styles.viewLabel}>Primary Program:</Text><Text style={styles.viewValue}>{selectedStudent.primaryProgram || "—"}</Text></View>
                {selectedStudent.primaryDepartment ? (
                  <View style={styles.viewRow}><Text style={styles.viewLabel}>Department:</Text><Text style={styles.viewValue}>{selectedStudent.primaryDepartment}</Text></View>
                ) : null}
                <View style={styles.viewRow}><Text style={styles.viewLabel}>Status:</Text><Text style={styles.viewValue}>{selectedStudent.status === "graduated" ? "Graduated" : "Active"}</Text></View>
                <View style={styles.viewRow}><Text style={styles.viewLabel}>Joined:</Text><Text style={styles.viewValue}>{new Date(selectedStudent.createdAt).toLocaleDateString()}</Text></View>
                
                {selectedStudent.coursesList.length > 0 && (
                  <View style={styles.coursesSection}>
                    <Text style={styles.viewLabel}>Enrolled Courses:</Text>
                    {selectedStudent.coursesList.map((c, idx) => (
                      <View key={idx} style={styles.courseItemCard}>
                        <Text style={styles.courseItemName}>{c.name}</Text>
                        <Text style={styles.courseItemCode}>Code: {c.entryCode}</Text>
                        {c.semester?.academicYear?.program && (
                          <Text style={styles.courseItemProgram}>Program: {c.semester.academicYear.program.name}</Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}
                <TouchableOpacity style={styles.modalCancelBtn} onPress={closeModal}><Text style={styles.modalCancelText}>Close</Text></TouchableOpacity>
              </ScrollView>
            )}

            {/* Edit Modal */}
            {modalType === "edit" && selectedStudent && (
              <View>
                 <View style={styles.modalHeader}><Text style={styles.modalIcon}>✏️</Text><Text style={styles.modalTitle}>Edit Student</Text></View>
                 <Text style={styles.inputLabel}>Name</Text>
                 <TextInput style={styles.modalInput} value={editForm.name} onChangeText={(t) => setEditForm({...editForm, name: t})} />
                 <Text style={styles.inputLabel}>Email</Text>
                 <TextInput style={styles.modalInput} value={editForm.email} keyboardType="email-address" autoCapitalize="none" onChangeText={(t) => setEditForm({...editForm, email: t})} />
                 
                 <Text style={styles.inputLabel}>Primary Program</Text>
                 <ScrollView style={styles.programSelectArea} nestedScrollEnabled={true}>
                   <View style={styles.programGrid}>
                     {programs.map((p) => (
                       <TouchableOpacity key={p.id} style={[styles.pSelectBtn, editForm.programId === p.id && styles.pSelectBtnActive]} onPress={() => setEditForm({...editForm, programId: p.id})}>
                         <Text style={[styles.pSelectText, editForm.programId === p.id && styles.pSelectTextActive]} numberOfLines={2}>{p.name}</Text>
                       </TouchableOpacity>
                     ))}
                   </View>
                 </ScrollView>

                 <View style={styles.modalActionRow}>
                   <TouchableOpacity style={styles.modalCancelBtnAction} onPress={closeModal}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
                   <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleEdit} disabled={isActionLoading}>
                     {isActionLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalConfirmText}>Save</Text>}
                   </TouchableOpacity>
                 </View>
              </View>
            )}

            {/* Graduate Confirmation */}
            {modalType === "graduate" && selectedStudent && (
              <View>
                 <View style={styles.modalHeader}><Text style={styles.modalIcon}>🎓</Text><Text style={styles.modalTitle}>Mark as Graduated</Text></View>
                 <Text style={styles.confirmText}>Are you sure you want to mark <Text style={{fontWeight: '700'}}>{selectedStudent.name}</Text> as graduated?</Text>
                 <View style={styles.modalActionRow}>
                   <TouchableOpacity style={styles.modalCancelBtnAction} onPress={closeModal}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
                   <TouchableOpacity style={[styles.modalConfirmBtn, {backgroundColor: '#6D28D9'}]} onPress={handleGraduate} disabled={isActionLoading}>
                     {isActionLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalConfirmText}>Confirm</Text>}
                   </TouchableOpacity>
                 </View>
              </View>
            )}

            {/* Delete Confirmation */}
            {modalType === "delete" && selectedStudent && (
              <View>
                 <View style={styles.modalHeader}><Text style={styles.modalIcon}>🗑️</Text><Text style={styles.modalTitle}>Delete Student</Text></View>
                 <Text style={styles.confirmText}>Are you sure you want to delete <Text style={{fontWeight: '700'}}>{selectedStudent.name}</Text>? This action cannot be undone.</Text>
                 <View style={styles.modalActionRow}>
                   <TouchableOpacity style={styles.modalCancelBtnAction} onPress={closeModal}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
                   <TouchableOpacity style={[styles.modalConfirmBtn, {backgroundColor: '#DC2626'}]} onPress={handleDelete} disabled={isActionLoading}>
                     {isActionLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.modalConfirmText}>Delete</Text>}
                   </TouchableOpacity>
                 </View>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14, marginTop: 8 },
  headerLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  badge: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 12 },
  badgeText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  title: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 12, color: "#64748B", marginTop: 2 },
  exportBtn: { backgroundColor: "#0F172A", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  exportBtnText: { color: "#FFF", fontSize: 12, fontWeight: "700" },

  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: "#1E293B", padding: 0 },

  filterRow: { flexDirection: "row", marginBottom: 16 },
  filterTab: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: "#F1F5F9", marginRight: 8 },
  filterTabActive: { backgroundColor: "#4361EE" },
  filterText: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  filterTextActive: { color: "#FFF" },

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

  itemRow: { paddingVertical: 16 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  itemHeader: { flexDirection: "column" },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", marginRight: 12, marginTop: 2 },
  avatarText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: "700", color: "#1E293B", marginBottom: 2 },
  itemEmail: { fontSize: 12, color: "#64748B", marginBottom: 6 },

  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  programBadge: { backgroundColor: "#EEF2FF", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  primaryBadge: { backgroundColor: "#DBEAFE" },
  programBadgeText: { fontSize: 10, fontWeight: "600", color: "#4361EE" },
  primaryBadgeText: { color: "#2563EB" },
  noProgramText: { fontSize: 11, color: "#94A3B8", fontStyle: "italic" },

  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusActive: { backgroundColor: "#D1FAE5" },
  statusGrad: { backgroundColor: "#FEF3C7" },
  statusText: { fontSize: 10, fontWeight: "700" },
  statusTextActive: { color: "#059669" },
  statusTextGrad: { color: "#D97706" },

  courseCountBadge: { backgroundColor: "#F1F5F9", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  courseCountText: { fontSize: 10, fontWeight: "600", color: "#64748B" },

  actionRow: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 10 },
  actionBtn: { width: 34, height: 34, borderRadius: 8, borderWidth: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFF" },
  actionIcon: { fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20},
  modalContent: { width: "100%", backgroundColor: "#FFF", borderRadius: 16, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, maxHeight: height * 0.8 },
  closeModalBtn: { position: "absolute", top: 16, right: 16, zIndex: 10, padding: 4 },
  closeIcon: { fontSize: 20, color: "#94A3B8" },
  modalHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  modalIcon: { fontSize: 20, marginRight: 8 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#0F172A" },
  
  // View Styles
  viewRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 6 },
  viewLabel: { fontSize: 14, color: "#64748B", width: 120 },
  viewValue: { fontSize: 14, color: "#0F172A", fontWeight: "500", flex: 1 },
  coursesSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  courseItemCard: { backgroundColor: "#F8FAFC", padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: "#E2E8F0" },
  courseItemName: { fontSize: 14, fontWeight: "600", color: "#0F172A", marginBottom: 4 },
  courseItemCode: { fontSize: 12, color: "#64748B" },
  courseItemProgram: { fontSize: 12, color: "#8B5CF6", marginTop: 4 },
  
  // Edit Styles
  inputLabel: { fontSize: 13, fontWeight: "600", color: "#475569", marginBottom: 6, marginTop: 12 },
  modalInput: { borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 8, padding: 12, fontSize: 14, color: "#0F172A", backgroundColor: "#FFF" },
  programSelectArea: { maxHeight: 150, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 8, padding: 8, backgroundColor: "#F8FAFC" },
  programGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pSelectBtn: { backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6, width: "100%" },
  pSelectBtnActive: { borderColor: "#4361EE", backgroundColor: "#EEF2FF" },
  pSelectText: { fontSize: 13, color: "#475569" },
  pSelectTextActive: { color: "#4361EE", fontWeight: "600" },
  
  // Confirm Styles
  confirmText: { fontSize: 15, color: "#334155", lineHeight: 22, marginBottom: 20 },
  
  // Action Buttons
  modalActionRow: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  modalCancelBtn: { marginTop: 24, paddingVertical: 12, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 8, alignItems: "center" },
  modalCancelBtnAction: { paddingVertical: 10, paddingHorizontal: 20, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 8, alignItems: "center" },
  modalCancelText: { fontSize: 14, fontWeight: "600", color: "#475569" },
  modalConfirmBtn: { backgroundColor: "#0F172A", paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, alignItems: "center", minWidth: 90 },
  modalConfirmText: { color: "#FFF", fontSize: 14, fontWeight: "600" },
});
