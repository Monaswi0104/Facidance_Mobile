import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, ActivityIndicator, Dimensions, TextInput, Modal
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { getCourses, deleteCourse, createCourse, getDepartments, getPrograms, getTeachers } from "../../api/adminApi";
import { useFocusEffect } from "@react-navigation/native";
import { Theme } from "../../theme/Theme";
import { BookOpen, GraduationCap, Users, Building2, Calendar, Key, User, Plus, X, Trash2 } from "lucide-react-native";

const { width } = Dimensions.get("window");

export default function CoursesManagement() {
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({
    departmentId: null, teacherId: null, programId: null,
    academicYear: "", semesterNumber: null, name: ""
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [coursesData, deptsData, progsData, teachersData] = await Promise.all([
        getCourses(), getDepartments(), getPrograms(), getTeachers()
      ]);

      const list = coursesData.courses || coursesData || [];
      const deptsList = deptsData.departments || deptsData || [];
      const progsList = progsData.programs || progsData || [];
      const allTeachers = teachersData.teachers || teachersData || [];
      const approvedTeachers = allTeachers.filter(t => t.id && !t.isPending);

      setCourses(list.map((c) => {
        const matchedTeacher = allTeachers.find(t => t.id === c.teacher_id || t.userId === c.teacher_id);
        const matchedProgram = progsList.find(p => p.id === c.program_id);
        const programDeptId = matchedProgram?.department_id || matchedProgram?.departmentId || null;
        const programDept = programDeptId ? deptsList.find(d => d.id === programDeptId) : null;

        return {
          id: c.id, name: c.name, code: c.code || "—",
          entryCode: c.entry_code || c.entryCode || "—",
          teacher: c.teacher_name || matchedTeacher?.name || "—",
          teacherEmail: c.teacher_email || matchedTeacher?.email || "",
          teacherDept: matchedTeacher?.departmentName || matchedTeacher?.department_name || "—",
          semester: c.semester_name || "—",
          year: c.academic_year_name || "—",
          program: c.program_name || matchedProgram?.name || "—",
          department: matchedTeacher?.departmentName || matchedTeacher?.department_name || programDept?.name || "—",
          students: c.student_count || c.students_count || c._count?.students || 0,
          sessions: c.session_count || c.sessions_count || c._count?.sessions || 0,
        };
      }));

      setDepartments(deptsList);
      setPrograms(progsList);
      setTeachers(approvedTeachers);
    } catch (e) { console.log(e); }
    finally { setIsLoading(false); }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const handleDelete = (course) => {
    Alert.alert("Delete Course", `Remove "${course.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try { await deleteCourse(course.id); loadData(); }
          catch (e) { Alert.alert("Error", e.message || "Failed to delete."); }
        }
      },
    ]);
  };

  const handleCreateCourse = async () => {
    const { teacherId, programId, academicYear, semesterNumber, name } = form;
    if (!teacherId || !programId || !academicYear || !semesterNumber || !name) {
      Alert.alert("Missing Fields", "Please fill out all required fields.");
      return;
    }
    try {
      const result = await createCourse({ name, teacherId, programId, academicYear, semesterNumber });
      if (result.error) {
        Alert.alert("Error", result.error + (result.hint ? `\n\n${result.hint}` : ""));
        return;
      }
      Alert.alert("Success", "Course added successfully!");
      setShowAddForm(false);
      setForm({ departmentId: null, teacherId: null, programId: null, academicYear: "", semesterNumber: null, name: "" });
      loadData();
    } catch (e) { Alert.alert("Error", e.message || "Failed to create course."); }
  };

  const filteredPrograms = form.departmentId ? programs.filter(p => p.departmentId === form.departmentId || p.department_id === form.departmentId) : programs;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerSection}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Courses</Text>
            <Text style={styles.subtitle}>Manage academic courses — teachers, programs, semesters.</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddForm(!showAddForm)} activeOpacity={0.7}>
            {showAddForm ? (
              <><X size={13} color="#FFF" style={{ marginRight: 3 }} /><Text style={styles.addBtnText}>Close</Text></>
            ) : (
              <><Plus size={13} color="#FFF" style={{ marginRight: 3 }} /><Text style={styles.addBtnText}>Add Course</Text></>
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
                  <Text style={styles.statLabel}>TOTAL COURSES</Text>
                  <View style={styles.statIconBg}><BookOpen size={14} color="#FFF" /></View>
                </View>
                <Text style={styles.statNumber}>{courses.length}</Text>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statTopRow}>
                  <Text style={styles.statLabel}>PROGRAMS</Text>
                  <View style={styles.statIconBg}><GraduationCap size={14} color="#FFF" /></View>
                </View>
                <Text style={styles.statNumber}>{programs.length}</Text>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statTopRow}>
                  <Text style={styles.statLabel}>FACULTY</Text>
                  <View style={styles.statIconBg}><Users size={14} color="#FFF" /></View>
                </View>
                <Text style={styles.statNumber}>{teachers.length}</Text>
              </View>
            </View>

            {/* Inline Add Form */}
            {showAddForm && (
              <View style={styles.addFormCard}>
                <View style={styles.addFormHeader}>
                  <View style={styles.addFormIconBg}><BookOpen size={14} color="#FFF" /></View>
                  <Text style={styles.addFormTitle}>Add New Course</Text>
                  <TouchableOpacity onPress={() => setShowAddForm(false)}>
                    <X size={16} color="#94A3B8" />
                  </TouchableOpacity>
                </View>

                {/* Row 1: Department, Teacher, Program */}
                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>FILTER BY DEPARTMENT</Text>
                    <View style={styles.pickerBox}>
                      <Picker selectedValue={form.departmentId} onValueChange={(v) => setForm({ ...form, departmentId: v, programId: null })} style={styles.picker} dropdownIconColor="#1E293B">
                        <Picker.Item label="All Departments" value={null} color="#94A3B8" style={{ backgroundColor: '#FFFFFF' }} />
                        {departments.map(d => <Picker.Item key={d.id} label={d.name} value={d.id} color="#1E293B" style={{ backgroundColor: '#FFFFFF' }} />)}
                      </Picker>
                    </View>
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>TEACHER *</Text>
                    <View style={styles.pickerBox}>
                      <Picker selectedValue={form.teacherId} onValueChange={(v) => setForm({ ...form, teacherId: v })} style={styles.picker} dropdownIconColor="#1E293B">
                        <Picker.Item label="Select Teacher" value={null} color="#94A3B8" style={{ backgroundColor: '#FFFFFF' }} />
                        {teachers.map(t => <Picker.Item key={t.id} label={t.name} value={t.id} color="#1E293B" style={{ backgroundColor: '#FFFFFF' }} />)}
                      </Picker>
                    </View>
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formFieldFull}>
                    <Text style={styles.formLabel}>PROGRAM *</Text>
                    <View style={styles.pickerBox}>
                      <Picker selectedValue={form.programId} onValueChange={(v) => setForm({ ...form, programId: v })} style={styles.picker} dropdownIconColor="#1E293B">
                        <Picker.Item label="Select Program" value={null} color="#94A3B8" style={{ backgroundColor: '#FFFFFF' }} />
                        {filteredPrograms.map(p => <Picker.Item key={p.id} label={p.name} value={p.id} color="#1E293B" style={{ backgroundColor: '#FFFFFF' }} />)}
                      </Picker>
                    </View>
                  </View>
                </View>

                {/* Row 2: Year, Semester, Name */}
                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>ACADEMIC YEAR *</Text>
                    <TextInput style={styles.formInput} placeholder="e.g. 2024-2025" placeholderTextColor="#94A3B8" value={form.academicYear} onChangeText={(t) => setForm({ ...form, academicYear: t })} />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>SEMESTER *</Text>
                    <View style={styles.pickerBox}>
                      <Picker selectedValue={form.semesterNumber} onValueChange={(v) => setForm({ ...form, semesterNumber: v })} style={styles.picker} dropdownIconColor="#1E293B">
                        <Picker.Item label="Select" value={null} color="#94A3B8" style={{ backgroundColor: '#FFFFFF' }} />
                        {["1","2","3","4","5","6","7","8"].map(s => <Picker.Item key={s} label={`Semester ${s}`} value={s} color="#1E293B" style={{ backgroundColor: '#FFFFFF' }} />)}
                      </Picker>
                    </View>
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formFieldFull}>
                    <Text style={styles.formLabel}>COURSE NAME *</Text>
                    <TextInput style={styles.formInput} placeholder="e.g. Data Structures" placeholderTextColor="#94A3B8" value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} />
                  </View>
                </View>

                {/* Buttons */}
                <View style={styles.formActions}>
                  <TouchableOpacity style={styles.formCancelBtn} onPress={() => setShowAddForm(false)}>
                    <Text style={styles.formCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.formSubmitBtn} onPress={handleCreateCourse}>
                    <Text style={styles.formSubmitText}>Add Course</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* All Courses Card */}
            <View style={styles.listCard}>
              <View style={styles.listHeader}>
                <View style={styles.listHeaderIcon}><BookOpen size={12} color="#FFF" /></View>
                <Text style={styles.listTitle}>All Courses</Text>
                <View style={styles.listCountBadge}>
                  <Text style={styles.listCountText}>{courses.length} total</Text>
                </View>
              </View>

              {courses.length === 0 ? (
                <Text style={styles.emptyText}>No courses yet.</Text>
              ) : (
                courses.map((c, i) => (
                  <TouchableOpacity key={c.id} style={[styles.courseRow, i < courses.length - 1 && styles.courseRowBorder]} activeOpacity={0.7} onPress={() => setSelectedCourse(c)}>
                    <View style={styles.courseAvatar}>
                      <BookOpen size={14} color={Theme.colors.primaryDark} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.courseName}>{c.name}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2, flexWrap: "wrap" }}>
                        {c.code !== "—" && (
                          <View style={styles.codeBadge}>
                            <Text style={styles.codeText}>{c.code}</Text>
                          </View>
                        )}
                        <User size={10} color="#94A3B8" style={{ marginRight: 2 }} />
                        <Text style={styles.courseMeta}>{c.teacher}</Text>
                        {c.year !== "—" && <Text style={styles.courseMeta}> · {c.year}</Text>}
                        {c.semester !== "—" && <Text style={styles.courseMeta}> · {c.semester}</Text>}
                      </View>
                    </View>
                    <TouchableOpacity style={styles.deleteBtnOutline} onPress={() => handleDelete(c)}>
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

      {/* Course Detail Modal */}
      <Modal visible={!!selectedCourse} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.detailHeader}>
              <View style={styles.detailHeaderIcon}><BookOpen size={20} color="#FFF" /></View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.detailTitle}>{selectedCourse?.name}</Text>
                <Text style={styles.detailSubtitle}>{selectedCourse?.code}</Text>
              </View>
            </View>

            <ScrollView style={{ maxHeight: Dimensions.get('window').height * 0.5 }} showsVerticalScrollIndicator={false}>
              {[
                { icon: <User size={16} color="#94A3B8" />, label: "Teacher", value: selectedCourse?.teacher, sub: selectedCourse?.teacherEmail },
                { icon: <Building2 size={16} color="#94A3B8" />, label: "Department", value: selectedCourse?.department },
                { icon: <GraduationCap size={16} color="#94A3B8" />, label: "Program", value: selectedCourse?.program },
                { icon: <Calendar size={16} color="#94A3B8" />, label: "Year & Semester", value: `${selectedCourse?.year || "—"} • ${selectedCourse?.semester || "—"}` },
                { icon: <Key size={16} color="#94A3B8" />, label: "Entry Code", value: selectedCourse?.entryCode, highlight: true },
              ].map((item, idx) => (
                <View key={idx} style={styles.detailInfoItem}>
                  <View style={{ marginRight: 12 }}>{item.icon}</View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailInfoLabel}>{item.label}</Text>
                    <Text style={[styles.detailInfoValue, item.highlight && { color: "#10B981", letterSpacing: 2 }]}>{item.value || "—"}</Text>
                    {!!item.sub && <Text style={styles.detailInfoSub}>{item.sub}</Text>}
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.closeBtn} activeOpacity={0.7} onPress={() => setSelectedCourse(null)}>
              <Text style={styles.closeBtnText}>Close</Text>
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

  // Header
  headerSection: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, marginTop: 8 },
  title: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 12, color: "#64748B", marginTop: 3 },
  addBtn: { flexDirection: "row", alignItems: "center", backgroundColor: Theme.colors.primaryDark, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { fontSize: 12, fontWeight: "600", color: "#FFF" },

  // Stats
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  statCard: {
    flex: 1, backgroundColor: "#FFF", borderRadius: 12, padding: 14, marginHorizontal: 3,
    borderWidth: 1, borderColor: "#E2E8F0",
    shadowColor: "#0F172A", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  statTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  statLabel: { fontSize: 7, fontWeight: "700", color: "#94A3B8", letterSpacing: 0.3, flex: 1, marginRight: 4 },
  statNumber: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  statIconBg: { width: 30, height: 30, borderRadius: 8, backgroundColor: Theme.colors.primaryDark, justifyContent: "center", alignItems: "center" },

  // Add Form
  addFormCard: {
    backgroundColor: "#FFF", borderRadius: 14, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: "#E2E8F0",
    shadowColor: "#0F172A", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  addFormHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  addFormIconBg: { width: 28, height: 28, borderRadius: 7, backgroundColor: Theme.colors.primaryDark, justifyContent: "center", alignItems: "center", marginRight: 8 },
  addFormTitle: { fontSize: 14, fontWeight: "700", color: "#0F172A", flex: 1 },
  formRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  formField: { flex: 0.48 },
  formFieldFull: { flex: 1 },
  formLabel: { fontSize: 8, fontWeight: "700", color: "#94A3B8", letterSpacing: 0.3, marginBottom: 4 },
  pickerBox: { height: 38, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 8, justifyContent: "center", backgroundColor: "#F8FAFC" },
  picker: { width: "100%", color: "#0F172A" },
  formInput: { height: 38, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 8, paddingHorizontal: 10, fontSize: 12, color: "#0F172A", backgroundColor: "#F8FAFC" },
  formActions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  formCancelBtn: { paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  formCancelText: { fontSize: 12, fontWeight: "600", color: "#94A3B8" },
  formSubmitBtn: { backgroundColor: Theme.colors.primaryDark, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  formSubmitText: { fontSize: 12, fontWeight: "700", color: "#FFF" },

  // List Card
  listCard: {
    backgroundColor: "#FFF", borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: "#E2E8F0",
    shadowColor: "#0F172A", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  listHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  listHeaderIcon: { width: 24, height: 24, borderRadius: 6, backgroundColor: Theme.colors.primaryDark, justifyContent: "center", alignItems: "center", marginRight: 8 },
  listTitle: { fontSize: 14, fontWeight: "700", color: "#0F172A", flex: 1 },
  listCountBadge: { backgroundColor: "#F0FDFA", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1, borderColor: "#CCFBF1" },
  listCountText: { fontSize: 10, fontWeight: "700", color: Theme.colors.primaryDark },

  // Course Rows
  courseRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  courseRowBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  courseAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#F0FDFA", justifyContent: "center", alignItems: "center", marginRight: 10 },
  courseName: { fontSize: 13, fontWeight: "700", color: "#0F172A" },
  courseMeta: { fontSize: 10, color: "#94A3B8" },
  codeBadge: { backgroundColor: "#F1F5F9", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3, marginRight: 6 },
  codeText: { fontSize: 8, fontWeight: "700", color: "#64748B", letterSpacing: 0.3 },
  deleteBtnOutline: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#FECACA", backgroundColor: "#FEF2F2", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  deleteBtnText: { fontSize: 10, fontWeight: "700", color: "#EF4444" },
  emptyText: { fontSize: 12, color: "#94A3B8", textAlign: "center", paddingVertical: 20 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalCard: { backgroundColor: "#FFF", borderRadius: 20, padding: 22, width: "100%", maxHeight: Dimensions.get('window').height * 0.85 },
  detailHeader: { flexDirection: "row", alignItems: "center", marginBottom: 18, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  detailHeaderIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: Theme.colors.primaryDark, justifyContent: "center", alignItems: "center" },
  detailTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  detailSubtitle: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  detailInfoItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", padding: 12, borderRadius: 10, marginBottom: 6, borderWidth: 1, borderColor: "#E2E8F0" },
  detailInfoLabel: { fontSize: 9, fontWeight: "700", color: "#94A3B8", letterSpacing: 0.4, marginBottom: 1 },
  detailInfoValue: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  detailInfoSub: { fontSize: 11, color: "#64748B", marginTop: 1 },
  detailStatsRow: { flexDirection: "row", backgroundColor: "#F8FAFC", borderRadius: 10, marginVertical: 8, borderWidth: 1, borderColor: "#E2E8F0" },
  detailStatBox: { flex: 1, alignItems: "center", paddingVertical: 14 },
  detailStatNumber: { fontSize: 22, fontWeight: "800", color: "#0F172A", marginBottom: 2 },
  detailStatLabel: { fontSize: 10, fontWeight: "600", color: "#94A3B8" },
  closeBtn: { marginTop: 14, backgroundColor: Theme.colors.primaryDark, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  closeBtnText: { fontSize: 13, fontWeight: "700", color: "#FFF" },
});