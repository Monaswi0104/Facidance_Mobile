import React, {  useState, useCallback , useMemo } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, ActivityIndicator, Dimensions, TextInput, Alert, Platform,
  Modal, KeyboardAvoidingView, FlatList
, RefreshControl } from "react-native";
import { getStudents, updateStudent, markStudentGraduated, ungraduateStudent, deleteStudent } from "../../api/adminApi";
import { useFocusEffect } from "@react-navigation/native";
import { Theme, useTheme } from "../../theme/Theme";
import { Users, Search, CheckCircle, Eye, Edit2, Trash2, BookOpen, RefreshCw, ChevronDown, UserCheck } from "lucide-react-native";
import { StatsRowSkeleton, SearchBarSkeleton, ListCardSkeleton } from "../../components/SkeletonLoader";

const { width, height } = Dimensions.get("window");

export default function StudentsManagement() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [students, setStudents] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData(false); // Assume it accepts showLoading=false, but just await it
    setIsRefreshing(false);
  }, []);
  const [filter, setFilter] = useState("all"); 
  const [search, setSearch] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("all");
  const [showProgramDropdown, setShowProgramDropdown] = useState(false);

  // Modal States
  const [modalType, setModalType] = useState(null);
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
        const primaryProgram = u.program_name || u.student?.program?.name || "";
        const primaryProgramId = u.program_id || u.student?.program?.id || "";
        
        const coursePrograms = (u.courses || u.student?.courses || [])
          .map((c) => c.program_name || c.semester?.academicYear?.program?.name)
          .filter(Boolean);
          
        const allPrograms = [...new Set([primaryProgram, ...coursePrograms].filter(Boolean))];

        return {
          id: u.id, 
          name: u.name || "Student",
          email: u.email || "—",
          status: u.status || u.student?.status || "active",
          primaryProgram,
          primaryProgramId,
          primaryDepartment: u.department_name || u.student?.program?.department?.name || "",
          allPrograms,
          courseCount: u.courses_count || u.courses?.length || u.student?.courses?.length || 0,
          coursesList: u.courses || u.student?.courses || [],
          createdAt: u.joined_at || u.joinedAt || u.createdAt || new Date(),
        };
      }));
    } catch (e) { console.log(e); }
    finally { setIsLoading(false); }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const filtered = students.filter((s) => {
    if (filter === "active" && s.status !== "active") return false;
    if (filter === "graduated" && s.status !== "graduated") return false;
    if (selectedProgram !== "all" && !s.allPrograms.includes(selectedProgram)) return false;
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

  const uniquePrograms = [...new Set(students.flatMap(s => s.allPrograms))].filter(Boolean);

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

  const handleActivate = async () => {
    try {
      setIsActionLoading(true);
      console.log("[StudentsManagement] Activating student:", selectedStudent.id, selectedStudent.name);
      const result = await ungraduateStudent(selectedStudent.id);
      console.log("[StudentsManagement] Activate result:", result);
      await loadData();
      closeModal();
      Alert.alert("Success", "Student has been reactivated successfully.");
    } catch (e) {
      console.error("[StudentsManagement] Activate error:", e);
      Alert.alert("Error", e.message || "Failed to activate student. Please try again.");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsActionLoading(true);
      console.log("[StudentsManagement] Deleting student:", selectedStudent.id, selectedStudent.name);
      await deleteStudent(selectedStudent.id);
      await loadData();
      closeModal();
      Alert.alert("Success", "Student deleted.");
    } catch (e) {
      console.error("[StudentsManagement] Delete failed:", e);
      Alert.alert("Error", e.message || "Failed to delete student.");
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={filtered}
        keyExtractor={(s) => s.id.toString()}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.success]} tintColor={colors.success} />
        }
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.headerSection}>
              <Text style={styles.title}>Students</Text>
              <Text style={styles.subtitle}>Manage enrolled students, programs, status, and course mapping.</Text>
            </View>

            {/* Stats Row */}
            {isLoading ? (
              <View>
                <StatsRowSkeleton count={3} />
                <SearchBarSkeleton />
                <ListCardSkeleton rows={5} />
              </View>
            ) : (
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <View style={styles.statTopRow}>
                    <Text style={styles.statLabel}>TOTAL STUDENTS</Text>
                    <View style={styles.statIconBg}><Users size={14} color={colors.primaryForeground} /></View>
                  </View>
                  <Text style={styles.statNumber}>{students.length}</Text>
                </View>
                <View style={styles.statCard}>
                  <View style={styles.statTopRow}>
                    <Text style={styles.statLabel}>ACTIVE</Text>
                    <View style={styles.statIconBg}><CheckCircle size={14} color={colors.primaryForeground} /></View>
                  </View>
                  <Text style={[styles.statNumber, { color: colors.success }]}>{totalActive}</Text>
                </View>
                <View style={styles.statCard}>
                  <View style={styles.statTopRow}>
                    <Text style={styles.statLabel}>GRADUATED</Text>
                    <View style={styles.statIconBg}><RefreshCw size={14} color={colors.primaryForeground} /></View>
                  </View>
                  <Text style={styles.statNumber}>{totalGraduated}</Text>
                </View>
              </View>
            )}

            {/* Search + Program Filter */}
            <View style={styles.searchFilterRow}>
              <View style={styles.searchBar}>
                <Search size={14} color={colors.mutedForeground} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search name, email, program..."
                  placeholderTextColor={colors.mutedForeground}
                  value={search}
                  onChangeText={setSearch}
                />
              </View>
              <TouchableOpacity style={styles.programDropdown} onPress={() => setShowProgramDropdown(!showProgramDropdown)}>
                <Text style={styles.programDropdownText} numberOfLines={1}>
                  {selectedProgram === "all" ? "All Programs" : selectedProgram}
                </Text>
                <ChevronDown size={14} color={colors.textBody} />
              </TouchableOpacity>
            </View>

            {/* Program Dropdown List */}
            {showProgramDropdown && (
              <View style={styles.dropdownList}>
                <TouchableOpacity
                  style={[styles.dropdownItem, selectedProgram === "all" && styles.dropdownItemActive]}
                  onPress={() => { setSelectedProgram("all"); setShowProgramDropdown(false); }}
                >
                  <Text style={[styles.dropdownItemText, selectedProgram === "all" && styles.dropdownItemTextActive]}>All Programs</Text>
                </TouchableOpacity>
                {uniquePrograms.map((p, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.dropdownItem, selectedProgram === p && styles.dropdownItemActive]}
                    onPress={() => { setSelectedProgram(p); setShowProgramDropdown(false); }}
                  >
                    <Text style={[styles.dropdownItemText, selectedProgram === p && styles.dropdownItemTextActive]} numberOfLines={1}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Filter Pills */}
            <View style={styles.filterRow}>
              {[
                { key: "all", label: "All" },
                { key: "active", label: "Active" },
                { key: "graduated", label: "Graduated" },
              ].map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.filterPill, filter === t.key && styles.filterPillActive]}
                  onPress={() => setFilter(t.key)}
                >
                  <Text style={[styles.filterText, filter === t.key && styles.filterTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Students List Card Top */}
            <View style={[styles.listCard, { paddingBottom: 0, borderBottomWidth: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 }]}>
              <View style={styles.listHeader}>
                <Text style={styles.listTitle}>Students List</Text>
                <View style={styles.listCountBadge}>
                  <Text style={styles.listCountText}>{filtered.length} / {students.length}</Text>
                </View>
              </View>

              {filtered.length === 0 && (
                <Text style={styles.emptyText}>No students found.</Text>
              )}
            </View>
          </>
        }
        renderItem={({ item: s, index }) => (
          <View style={[styles.listCard, { paddingTop: 0, paddingBottom: 0, borderRadius: 0, borderTopWidth: 0, borderBottomWidth: 0, marginBottom: 0 }]}>
            <View style={[styles.studentRow, index < filtered.length - 1 && styles.studentBorder]}>
              {/* Name + Email */}
              <Text style={styles.studentName}>{s.name}</Text>
              <Text style={styles.studentEmail}>{s.email}</Text>

              {/* Badges Row */}
              <View style={styles.badgeRow}>
                {s.primaryProgram ? (
                  <View style={styles.programBadge}>
                    <Text style={styles.programBadgeText} numberOfLines={1}>{s.primaryProgram}</Text>
                  </View>
                ) : (
                  <Text style={styles.noProgramText}>No program</Text>
                )}
                <View style={[styles.statusBadge, s.status === "active" ? styles.statusActive : styles.statusGrad]}>
                  <Text style={[styles.statusText, s.status === "active" ? styles.statusTextActive : styles.statusTextGrad]}>
                    {s.status === "active" ? "Active" : "Graduated"}
                  </Text>
                </View>
                {s.courseCount > 0 && (
                  <View style={styles.courseCountBadge}>
                    <BookOpen size={10} color={colors.mutedForeground} style={{ marginRight: 3 }} />
                    <Text style={styles.courseCountText}>{s.courseCount}</Text>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openModal("view", s)}>
                  <Eye size={14} color={colors.textBody} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openModal("edit", s)}>
                  <Edit2 size={14} color={colors.textBody} />
                </TouchableOpacity>
                {s.status !== "graduated" ? (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.warningLight, borderColor: colors.warning }]} onPress={() => openModal("graduate", s)}>
                    <Users size={14} color={colors.warning} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.successLight, borderColor: colors.success }]} onPress={() => openModal("activate", s)}>
                    <UserCheck size={14} color={colors.success} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.destructiveLight, borderColor: colors.destructiveLight }]} onPress={() => openModal("delete", s)}>
                  <Trash2 size={14} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        ListFooterComponent={
          <View style={[styles.listCard, { paddingTop: 0, borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }]} />
        }
      />

      {/* --- MODALS --- */}
      <Modal visible={modalType !== null} transparent animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeModalBtn} onPress={closeModal}><Text style={styles.closeIcon}>✕</Text></TouchableOpacity>
            
            {/* View Details Modal */}
            {modalType === "view" && selectedStudent && (
              <ScrollView>
                <View style={styles.modalHeader}><Eye size={20} color={colors.foreground} style={{ marginRight: 8 }} /><Text style={styles.modalTitle}>Student Details</Text></View>
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
                        <Text style={styles.courseItemCode}>Code: {c.entry_code || c.entryCode || "—"}</Text>
                        {(c.program_name || c.semester?.academicYear?.program?.name) && (
                          <Text style={styles.courseItemProgram}>
                            Program: {c.program_name || c.semester.academicYear.program.name}
                          </Text>
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
                 <View style={styles.modalHeader}><Edit2 size={20} color={colors.foreground} style={{ marginRight: 8 }} /><Text style={styles.modalTitle}>Edit Student</Text></View>
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
                     {isActionLoading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.modalConfirmText}>Save</Text>}
                   </TouchableOpacity>
                 </View>
              </View>
            )}

            {/* Graduate Confirmation */}
            {modalType === "graduate" && selectedStudent && (
              <View>
                 <View style={styles.modalHeader}><Users size={20} color={colors.foreground} style={{ marginRight: 8 }} /><Text style={styles.modalTitle}>Mark as Graduated</Text></View>
                 <Text style={styles.confirmText}>Are you sure you want to mark <Text style={{fontWeight: '700'}}>{selectedStudent.name}</Text> as graduated?</Text>
                 <View style={styles.modalActionRow}>
                   <TouchableOpacity style={styles.modalCancelBtnAction} onPress={closeModal}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
                   <TouchableOpacity style={[styles.modalConfirmBtn, {backgroundColor: colors.warning}]} onPress={handleGraduate} disabled={isActionLoading}>
                     {isActionLoading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.modalConfirmText}>Confirm</Text>}
                   </TouchableOpacity>
                 </View>
              </View>
            )}

            {/* Activate Confirmation */}
            {modalType === "activate" && selectedStudent && (
              <View>
                 <View style={styles.modalHeader}><UserCheck size={20} color={colors.success} style={{ marginRight: 8 }} /><Text style={styles.modalTitle}>Reactivate Student</Text></View>
                 <Text style={styles.confirmText}>Are you sure you want to reactivate <Text style={{fontWeight: '700'}}>{selectedStudent.name}</Text> and change their status back to Active?</Text>
                 <View style={styles.modalActionRow}>
                   <TouchableOpacity style={styles.modalCancelBtnAction} onPress={closeModal}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
                   <TouchableOpacity style={[styles.modalConfirmBtn, {backgroundColor: colors.success}]} onPress={handleActivate} disabled={isActionLoading}>
                     {isActionLoading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.modalConfirmText}>Activate</Text>}
                   </TouchableOpacity>
                 </View>
              </View>
            )}

            {/* Delete Confirmation */}
            {modalType === "delete" && selectedStudent && (
              <View>
                 <View style={styles.modalHeader}><Trash2 size={20} color={colors.foreground} style={{ marginRight: 8 }} /><Text style={styles.modalTitle}>Delete Student</Text></View>
                 <Text style={styles.confirmText}>Are you sure you want to delete <Text style={{fontWeight: '700'}}>{selectedStudent.name}</Text>? This action cannot be undone.</Text>
                 <View style={styles.modalActionRow}>
                   <TouchableOpacity style={styles.modalCancelBtnAction} onPress={closeModal}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
                   <TouchableOpacity style={[styles.modalConfirmBtn, {backgroundColor: colors.destructive}]} onPress={handleDelete} disabled={isActionLoading}>
                     {isActionLoading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.modalConfirmText}>Delete</Text>}
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

const createStyles = (colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.secondary },
  container: { padding: 20, paddingBottom: 40 },

  // Header
  headerSection: { marginBottom: 16, marginTop: 8 },
  title: { fontSize: 24, fontWeight: "800", color: colors.foreground },
  subtitle: { fontSize: 13, color: colors.mutedForeground, marginTop: 3 },

  // Stats
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  statCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.foreground,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  statLabel: { fontSize: 7, fontWeight: "700", color: colors.mutedForeground, letterSpacing: 0.4, flex: 1, marginRight: 4 },
  statNumber: { fontSize: 22, fontWeight: "800", color: colors.foreground },
  statIconBg: { width: 28, height: 28, borderRadius: 7, backgroundColor: colors.primaryDark, justifyContent: "center", alignItems: "center" },

  // Search + Program Filter
  searchFilterRow: { flexDirection: "row", marginBottom: 10 },
  searchBar: {
    flex: 1,
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.background, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.border, marginRight: 8,
  },
  searchInput: { flex: 1, fontSize: 13, color: colors.foreground, padding: 0 },
  programDropdown: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.background, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.border,
    maxWidth: width * 0.35,
  },
  programDropdownText: { fontSize: 12, color: colors.textBody, fontWeight: "500", flex: 1, marginRight: 4 },

  // Dropdown List
  dropdownList: {
    backgroundColor: colors.background, borderRadius: 10, borderWidth: 1, borderColor: colors.border,
    marginBottom: 10, padding: 4,
    shadowColor: colors.foreground, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  dropdownItem: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8 },
  dropdownItemActive: { backgroundColor: colors.successLight },
  dropdownItemText: { fontSize: 13, color: colors.textBody },
  dropdownItemTextActive: { color: colors.success, fontWeight: "600" },

  // Filters
  filterRow: { flexDirection: "row", marginBottom: 16 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 16, backgroundColor: colors.muted, marginRight: 8 },
  filterPillActive: { backgroundColor: colors.primaryDark },
  filterText: { fontSize: 12, fontWeight: "600", color: colors.mutedForeground },
  filterTextActive: { color: colors.primaryForeground },

  // List
  listCard: {
    backgroundColor: colors.background, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.foreground, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  listHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  listTitle: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  listCountBadge: { backgroundColor: colors.infoLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  listCountText: { fontSize: 11, fontWeight: "700", color: colors.primaryDark },
  emptyText: { fontSize: 14, color: colors.mutedForeground, textAlign: "center", paddingVertical: 24 },

  // Student Row
  studentRow: { paddingVertical: 14 },
  studentBorder: { borderBottomWidth: 1, borderBottomColor: colors.muted },
  studentName: { fontSize: 15, fontWeight: "700", color: colors.foreground, marginBottom: 2 },
  studentEmail: { fontSize: 12, color: colors.mutedForeground, marginBottom: 8 },

  // Badges
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  programBadge: { backgroundColor: colors.primaryDark, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  programBadgeText: { fontSize: 10, fontWeight: "600", color: colors.primaryForeground },
  noProgramText: { fontSize: 11, color: colors.mutedForeground, fontStyle: "italic" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusActive: { backgroundColor: colors.successLight },
  statusGrad: { backgroundColor: colors.warningLight },
  statusText: { fontSize: 10, fontWeight: "700" },
  statusTextActive: { color: colors.success },
  statusTextGrad: { color: colors.warning },
  courseCountBadge: { flexDirection: "row", alignItems: "center", backgroundColor: colors.muted, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  courseCountText: { fontSize: 10, fontWeight: "600", color: colors.mutedForeground },

  // Actions
  actionRow: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  actionBtn: { width: 34, height: 34, borderRadius: 8, borderWidth: 1, borderColor: colors.border, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { width: "100%", backgroundColor: colors.background, borderRadius: 16, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10, maxHeight: height * 0.8 },
  closeModalBtn: { position: "absolute", top: 16, right: 16, zIndex: 10, padding: 4 },
  closeIcon: { fontSize: 20, color: colors.mutedForeground },
  modalHeader: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.foreground },
  
  viewRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 6 },
  viewLabel: { fontSize: 14, color: colors.mutedForeground, width: 120 },
  viewValue: { fontSize: 14, color: colors.foreground, fontWeight: "500", flex: 1 },
  coursesSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.muted },
  courseItemCard: { backgroundColor: colors.secondary, padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
  courseItemName: { fontSize: 14, fontWeight: "600", color: colors.foreground, marginBottom: 4 },
  courseItemCode: { fontSize: 12, color: colors.mutedForeground },
  courseItemProgram: { fontSize: 12, color: colors.info, marginTop: 4 },
  
  inputLabel: { fontSize: 13, fontWeight: "600", color: colors.textBody, marginBottom: 6, marginTop: 12 },
  modalInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 12, fontSize: 14, color: colors.foreground, backgroundColor: colors.background },
  programSelectArea: { maxHeight: 150, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: 8, backgroundColor: colors.secondary },
  programGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pSelectBtn: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 6, width: "100%" },
  pSelectBtnActive: { borderColor: colors.accent, backgroundColor: colors.accentLight },
  pSelectText: { fontSize: 13, color: colors.textBody },
  pSelectTextActive: { color: colors.primaryDark, fontWeight: "600" },
  
  confirmText: { fontSize: 15, color: colors.textSoft, lineHeight: 22, marginBottom: 20 },
  
  modalActionRow: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.muted },
  modalCancelBtn: { marginTop: 24, paddingVertical: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 20, alignItems: "center" },
  modalCancelBtnAction: { paddingVertical: 10, paddingHorizontal: 20, borderWidth: 1, borderColor: colors.border, borderRadius: 20, alignItems: "center" },
  modalCancelText: { fontSize: 14, fontWeight: "600", color: colors.textBody },
  modalConfirmBtn: { backgroundColor: colors.primaryDark, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, alignItems: "center", minWidth: 90 },
  modalConfirmText: { color: colors.primaryForeground, fontSize: 14, fontWeight: "700" },
});
