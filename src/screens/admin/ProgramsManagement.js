import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, ActivityIndicator, Modal, TextInput, Dimensions
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { getPrograms, createProgram, deleteProgram, getDepartments, getAdminStats, getCourses, getStudents, getProgramDistribution } from "../../api/adminApi";
import { useFocusEffect } from "@react-navigation/native";
import { Theme, useTheme } from "../../theme/Theme";
import { BookOpen, Building2, Users, GraduationCap, Plus, Trash2, X, Key } from "lucide-react-native";

export default function ProgramsManagement() {
  const { colors, isDark } = useTheme();
  const [programs, setPrograms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [adminStudents, setAdminStudents] = useState(0);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [progData, deptData, statsData, coursesData, studentsData] = await Promise.all([
        getPrograms(), getDepartments(), getAdminStats(), getCourses(), getStudents()
      ]);

      // Fetch program distribution separately so failure doesn't break everything
      let distMap = {};
      try {
        const distData = await getProgramDistribution();
        const distList = distData?.programs || [];
        distList.forEach(d => { distMap[d.program_id] = d.student_count || 0; });
      } catch (distErr) {
        console.log("[ProgramsManagement] Distribution fetch failed (non-critical):", distErr);
      }

      if (statsData?.students) setAdminStudents(statsData.students);
      const progList = progData.programs || progData || [];
      const deptList = deptData.departments || deptData || [];
      const courseList = coursesData.courses || coursesData || [];

      let studentList = [];
      if (studentsData.students) studentList = studentsData.students;
      else if (Array.isArray(studentsData)) studentList = studentsData;

      setDepartments(deptList);

      const deptMap = {};
      deptList.forEach((d) => { deptMap[d.id] = d.name; });

      setPrograms(progList.map((p) => {
        // Match courses to this program — try all possible field name variants
        const pCourses = courseList.filter(c => 
          c.program_id === p.id || c.programId === p.id || 
          c.program_name === p.name || 
          c.semester?.academicYear?.programId === p.id ||
          c.semester?.academicYear?.program_id === p.id
        );
        
        // Match students to this program for per-course counting
        const pStudents = studentList.filter(s => 
          s.program_id === p.id || s.programId === p.id || 
          s.program_name === p.name || 
          s.student?.program?.id === p.id || s.student?.programId === p.id
        );

        const teacherSet = new Set();
        pCourses.forEach(c => {
          const tName = c.teacher_name || c.teacher?.user?.name;
          if (tName) teacherSet.add(tName);
        });

        // Use the analytics endpoint count (most accurate), then computed, then API fallbacks
        const studentCount = (distMap[p.id] ?? pStudents.length) || p.students_count || p._count?.students || p.students?.length || 0;
        const courseCount = pCourses.length || p.courses_count || p._count?.courses || p.courses?.length || 0;

        return {
          id: p.id,
          name: p.name,
          departmentId: p.department_id || p.departmentId,
          dept: p.department_name || p.department?.name || deptMap[p.department_id || p.departmentId] || "—",
          students: studentCount,
          courses: pCourses.map(c => {
            // Count students enrolled in this specific course
            const courseStudentCount = pStudents.filter(s => {
              const sCourses = s.courses || [];
              return sCourses.some(sc => sc.id === c.id);
            }).length;
            return {
              id: c.id, name: c.name, code: c.code || "—",
              teacher: c.teacher_name || c.teacher?.user?.name || "—",
              semester: c.semester_name || c.semester?.name || "—",
              students: c.student_count || c.students_count || c._count?.students || courseStudentCount || 0,
            };
          }),
          teachers: Array.from(teacherSet),
          totalCourses: courseCount,
        };
      }));
    } catch (e) { console.log("[ProgramsManagement] Error:", e); }
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
      console.log("[ProgramsManagement] Creating program:", newName.trim(), "for department:", selectedDeptId);
      await createProgram(newName.trim(), selectedDeptId);
      setNewName("");
      setShowAddForm(false);
      Alert.alert("Success", "Program created.");
      loadData();
    } catch (e) {
      console.error("[ProgramsManagement] Create failed:", e);
      Alert.alert("Error", e.message || "Failed to create program.");
    }
    finally { setIsCreating(false); }
  };

  const handleDelete = (prog) => {
    Alert.alert("Delete Program", `Remove "${prog.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            console.log("[ProgramsManagement] Deleting program:", prog.id, prog.name);
            await deleteProgram(prog.id);
            loadData();
            Alert.alert("Success", "Program deleted.");
          }
          catch (e) {
            console.error("[ProgramsManagement] Delete failed:", e);
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
        <View style={styles.headerSection}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Programs</Text>
            <Text style={styles.subtitle}>Manage academic programs and degree offerings.</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddForm(!showAddForm)} activeOpacity={0.7}>
            {showAddForm ? (
              <><X size={13} color="#FFF" style={{ marginRight: 3 }} /><Text style={styles.addBtnText}>Close</Text></>
            ) : (
              <><Plus size={13} color="#FFF" style={{ marginRight: 3 }} /><Text style={styles.addBtnText}>Add Program</Text></>
            )}
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        {isLoading ? (
          <ActivityIndicator size="small" color={Theme.colors.accent} style={{ marginVertical: 20 }} />
        ) : (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={styles.statTopRow}>
                  <Text style={styles.statLabel}>TOTAL PROGRAMS</Text>
                  <View style={styles.statIconBg}><BookOpen size={14} color="#FFF" /></View>
                </View>
                <Text style={styles.statNumber}>{programs.length}</Text>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statTopRow}>
                  <Text style={styles.statLabel}>DEPARTMENTS LINKED</Text>
                  <View style={styles.statIconBg}><Building2 size={14} color="#FFF" /></View>
                </View>
                <Text style={styles.statNumber}>{uniqueDepts.size}</Text>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statTopRow}>
                  <Text style={styles.statLabel}>TOTAL STUDENTS</Text>
                  <View style={styles.statIconBg}><GraduationCap size={14} color="#FFF" /></View>
                </View>
                <Text style={styles.statNumber}>{totalStudents}</Text>
              </View>
            </View>

            {/* Inline Add Form */}
            {showAddForm && (
              <View style={styles.addFormCard}>
                <View style={styles.addFormHeader}>
                  <View style={styles.addFormIconBg}><BookOpen size={14} color="#FFF" /></View>
                  <Text style={styles.addFormTitle}>Add New Program</Text>
                  <TouchableOpacity onPress={() => { setShowAddForm(false); setNewName(""); }}>
                    <X size={16} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                <View style={styles.addFormFields}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.addFormLabel}>PROGRAM NAME</Text>
                    <TextInput
                      style={styles.addFormInput}
                      placeholder="e.g. Bachelor of Computer Science"
                      placeholderTextColor="#94A3B8"
                      value={newName}
                      onChangeText={setNewName}
                    />
                  </View>
                </View>
                <View style={styles.addFormRow}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.addFormLabel}>DEPARTMENT</Text>
                    <View style={styles.pickerWrapper}>
                      <Picker
                        selectedValue={selectedDeptId}
                        onValueChange={(v) => setSelectedDeptId(v)}
                        style={styles.picker}
                        mode="dropdown"
                        dropdownIconColor="#1E293B"
                        itemStyle={{ fontSize: 13, color: Theme.colors.foreground }}
                      >
                        <Picker.Item label="Select a department" value={null} color="#94A3B8" />
                        {departments.map(d => (
                          <Picker.Item key={d.id} label={d.name} value={d.id} color={Theme.colors.foreground} />
                        ))}
                      </Picker>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.addFormBtn} onPress={handleAdd} disabled={isCreating}>
                    <Plus size={13} color="#FFF" style={{ marginRight: 3 }} />
                    <Text style={styles.addFormBtnText}>{isCreating ? "..." : "Add"}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* All Programs Card */}
            <View style={styles.listCard}>
              <View style={styles.listHeader}>
                <View style={styles.listHeaderIcon}><BookOpen size={12} color="#FFF" /></View>
                <Text style={styles.listTitle}>All Programs</Text>
                <View style={styles.listCountBadge}>
                  <Text style={styles.listCountText}>{programs.length} total</Text>
                </View>
              </View>

              {programs.length === 0 ? (
                <Text style={styles.emptyText}>No programs created yet.</Text>
              ) : (
                programs.map((p, i) => (
                  <TouchableOpacity key={p.id} style={[styles.progRow, i < programs.length - 1 && styles.progRowBorder]} activeOpacity={0.7} onPress={() => setSelectedProgram(p)}>
                    <View style={styles.progAvatar}>
                      <BookOpen size={14} color={Theme.colors.primaryDark} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.progName}>{p.name}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2, flexWrap: "wrap" }}>
                        <Building2 size={10} color="#94A3B8" style={{ marginRight: 3 }} />
                        <Text style={styles.progMeta}>{p.dept}</Text>
                        <View style={styles.progIdBadge}>
                          <Text style={styles.progIdText}>PROG_ID</Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity style={styles.deleteBtnOutline} onPress={() => handleDelete(p)}>
                      <Trash2 size={11} color="#EF4444" style={{ marginRight: 3 }} />
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Program Detail Modal */}
      <Modal visible={!!selectedProgram} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.detailHeader}>
              <View style={styles.detailHeaderIcon}><BookOpen size={20} color="#FFF" /></View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.detailTitle}>{selectedProgram?.name}</Text>
                <Text style={styles.detailSubtitle}>{selectedProgram?.dept}</Text>
              </View>
            </View>

            <ScrollView style={{ maxHeight: Dimensions.get('window').height * 0.45 }} showsVerticalScrollIndicator={false}>
              <View style={styles.detailInfoItem}>
                <Building2 size={16} color="#94A3B8" style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailInfoLabel}>Department</Text>
                  <Text style={styles.detailInfoValue}>{selectedProgram?.dept}</Text>
                </View>
              </View>
              <View style={styles.detailInfoItem}>
                <Key size={16} color="#94A3B8" style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailInfoLabel}>Program ID</Text>
                  <Text style={[styles.detailInfoValue, { fontSize: 11, letterSpacing: 0.3 }]}>{selectedProgram?.id}</Text>
                </View>
              </View>

              <View style={styles.detailStatsRow}>
                <View style={styles.detailStatBox}>
                  <Text style={styles.detailStatNumber}>{selectedProgram?.totalCourses || selectedProgram?.courses?.length || 0}</Text>
                  <Text style={styles.detailStatLabel}>Courses</Text>
                </View>
                <View style={[styles.detailStatBox, { borderLeftWidth: 1, borderLeftColor: "#E2E8F0" }]}>
                  <Text style={styles.detailStatNumber}>{selectedProgram?.teachers?.length || 0}</Text>
                  <Text style={styles.detailStatLabel}>Faculty</Text>
                </View>
              </View>

              {selectedProgram?.courses?.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>Courses</Text>
                  {selectedProgram.courses.map((c, idx) => (
                    <View key={c.id || idx} style={styles.courseItem}>
                      <View style={styles.courseItemLeft}><BookOpen size={14} color={Theme.colors.primaryDark} /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.courseItemName}>{c.name}</Text>
                        <Text style={styles.courseItemCode}>{c.code}</Text>
                        <View style={styles.courseTagsRow}>
                          <View style={[styles.courseTag, { backgroundColor: "#F0FDFA" }]}>
                            <Text style={[styles.courseTagText, { color: Theme.colors.primaryDark }]}>{c.semester}</Text>
                          </View>
                          <View style={[styles.courseTag, { backgroundColor: "#FEF3C7" }]}>
                            <Text style={[styles.courseTagText, { color: "#D97706" }]}>{c.teacher}</Text>
                          </View>
                          <View style={[styles.courseTag, { backgroundColor: "#F0FDF4" }]}>
                            <Text style={[styles.courseTagText, { color: "#10B981" }]}>{c.students} students</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.closeBtn} activeOpacity={0.7} onPress={() => setSelectedProgram(null)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Theme.colors.secondary },
  container: { padding: 20, paddingBottom: 40 },

  // Header
  headerSection: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, marginTop: 8 },
  title: { fontSize: 24, fontWeight: "800", color: Theme.colors.foreground },
  subtitle: { fontSize: 12, color: Theme.colors.mutedForeground, marginTop: 3 },
  addBtn: { flexDirection: "row", alignItems: "center", backgroundColor: Theme.colors.primaryDark, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { fontSize: 12, fontWeight: "600", color: "#FFF" },

  // Stats
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  statCard: {
    flex: 1, backgroundColor: Theme.colors.background, borderRadius: 12, padding: 14, marginHorizontal: 3,
    borderWidth: 1, borderColor: Theme.colors.border,
    shadowColor: Theme.colors.foreground, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  statTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  statLabel: { fontSize: 7, fontWeight: "700", color: Theme.colors.mutedForeground, letterSpacing: 0.3, flex: 1, marginRight: 4 },
  statNumber: { fontSize: 22, fontWeight: "800", color: Theme.colors.foreground },
  statIconBg: { width: 30, height: 30, borderRadius: 8, backgroundColor: Theme.colors.primaryDark, justifyContent: "center", alignItems: "center" },

  // Add Form
  addFormCard: {
    backgroundColor: Theme.colors.background, borderRadius: 14, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: Theme.colors.border,
    shadowColor: Theme.colors.foreground, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  addFormHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  addFormIconBg: { width: 28, height: 28, borderRadius: 7, backgroundColor: Theme.colors.primaryDark, justifyContent: "center", alignItems: "center", marginRight: 8 },
  addFormTitle: { fontSize: 14, fontWeight: "700", color: Theme.colors.foreground, flex: 1 },
  addFormFields: { marginBottom: 8 },
  addFormLabel: { fontSize: 9, fontWeight: "700", color: Theme.colors.primaryDark, letterSpacing: 0.4, marginBottom: 6 },
  addFormInput: { height: 54, backgroundColor: Theme.colors.secondary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: Theme.colors.foreground, borderWidth: 1, borderColor: Theme.colors.border },
  addFormRow: { flexDirection: "row", alignItems: "flex-end" },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: Theme.colors.border,
    borderRadius: 8,
    backgroundColor: Theme.colors.secondary,
    height: 54,
    justifyContent: "center",
    overflow: "hidden",
  },
  picker: {
    width: "100%",
    height: 54,
    color: Theme.colors.foreground,
    backgroundColor: Theme.colors.secondary,
    transform: [{ translateY: -2 }],
  },
  addFormBtn: { flexDirection: "row", alignItems: "center", backgroundColor: Theme.colors.primaryDark, paddingHorizontal: 14, height: 54, borderRadius: 8, justifyContent: "center", marginLeft: 8 },
  addFormBtnText: { fontSize: 12, fontWeight: "700", color: "#FFF" },

  // List Card
  listCard: {
    backgroundColor: Theme.colors.background, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: Theme.colors.border,
    shadowColor: Theme.colors.foreground, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  listHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  listHeaderIcon: { width: 24, height: 24, borderRadius: 6, backgroundColor: Theme.colors.primaryDark, justifyContent: "center", alignItems: "center", marginRight: 8 },
  listTitle: { fontSize: 14, fontWeight: "700", color: Theme.colors.foreground, flex: 1 },
  listCountBadge: { backgroundColor: "#F0FDFA", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1, borderColor: "#CCFBF1" },
  listCountText: { fontSize: 10, fontWeight: "700", color: Theme.colors.primaryDark },

  // Program Rows
  progRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  progRowBorder: { borderBottomWidth: 1, borderBottomColor: Theme.colors.muted },
  progAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#F0FDFA", justifyContent: "center", alignItems: "center", marginRight: 10 },
  progName: { fontSize: 13, fontWeight: "700", color: Theme.colors.foreground },
  progMeta: { fontSize: 10, color: Theme.colors.mutedForeground, marginRight: 6 },
  progIdBadge: { backgroundColor: Theme.colors.muted, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  progIdText: { fontSize: 8, fontWeight: "700", color: Theme.colors.mutedForeground, letterSpacing: 0.3 },
  deleteBtnOutline: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#FECACA", backgroundColor: "rgba(239,68,68,0.08)", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  deleteBtnText: { fontSize: 10, fontWeight: "700", color: Theme.colors.destructive },

  emptyText: { fontSize: 12, color: Theme.colors.mutedForeground, textAlign: "center", paddingVertical: 20 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalCard: { backgroundColor: Theme.colors.background, borderRadius: 20, padding: 22, width: "100%", maxHeight: Dimensions.get('window').height * 0.85 },
  detailHeader: { flexDirection: "row", alignItems: "center", marginBottom: 18, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Theme.colors.muted },
  detailHeaderIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: Theme.colors.primaryDark, justifyContent: "center", alignItems: "center" },
  detailTitle: { fontSize: 18, fontWeight: "800", color: Theme.colors.foreground },
  detailSubtitle: { fontSize: 11, color: Theme.colors.mutedForeground, marginTop: 2 },
  detailInfoItem: { flexDirection: "row", alignItems: "center", backgroundColor: Theme.colors.secondary, padding: 12, borderRadius: 10, marginBottom: 6, borderWidth: 1, borderColor: Theme.colors.border },
  detailInfoLabel: { fontSize: 9, fontWeight: "700", color: Theme.colors.mutedForeground, letterSpacing: 0.4, marginBottom: 1 },
  detailInfoValue: { fontSize: 14, fontWeight: "700", color: Theme.colors.foreground },
  detailStatsRow: { flexDirection: "row", backgroundColor: Theme.colors.secondary, borderRadius: 10, marginVertical: 12, borderWidth: 1, borderColor: Theme.colors.border },
  detailStatBox: { flex: 1, alignItems: "center", paddingVertical: 14 },
  detailStatNumber: { fontSize: 22, fontWeight: "800", color: Theme.colors.foreground, marginBottom: 2 },
  detailStatLabel: { fontSize: 10, fontWeight: "600", color: Theme.colors.mutedForeground },
  sectionLabel: { fontSize: 11, fontWeight: "800", color: Theme.colors.mutedForeground, letterSpacing: 0.5, marginBottom: 10 },
  courseItem: { flexDirection: "row", backgroundColor: Theme.colors.background, padding: 12, borderRadius: 10, marginBottom: 6, borderWidth: 1, borderColor: Theme.colors.border },
  courseItemLeft: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#F0FDFA", justifyContent: "center", alignItems: "center", marginRight: 10 },
  courseItemName: { fontSize: 13, fontWeight: "700", color: Theme.colors.foreground, marginBottom: 1 },
  courseItemCode: { fontSize: 11, fontWeight: "600", color: Theme.colors.primaryDark, marginBottom: 4 },
  courseTagsRow: { flexDirection: "row", flexWrap: "wrap" },
  courseTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 4, marginBottom: 2 },
  courseTagText: { fontSize: 9, fontWeight: "700" },
  closeBtn: { marginTop: 14, backgroundColor: Theme.colors.primaryDark, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  closeBtnText: { fontSize: 13, fontWeight: "700", color: "#FFF" },
});