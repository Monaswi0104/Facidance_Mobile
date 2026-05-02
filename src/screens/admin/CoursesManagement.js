import React, {  useState, useCallback , useMemo } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, ActivityIndicator, Dimensions, TextInput, Modal
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { getCourses, deleteCourse, createCourse, getDepartments, getPrograms, getTeachers } from "../../api/adminApi";
import { useFocusEffect } from "@react-navigation/native";
import { Theme, useTheme } from "../../theme/Theme";
import { BookOpen, GraduationCap, Users, Building2, Calendar, Key, User, Plus, X, Trash2, Search } from "lucide-react-native";

const { width } = Dimensions.get("window");

export default function CoursesManagement() {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  
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
          try {
            console.log("[CoursesManagement] Deleting course:", course.id, course.name);
            await deleteCourse(course.id);
            loadData();
            Alert.alert("Success", "Course deleted.");
          }
          catch (e) {
            console.error("[CoursesManagement] Delete failed:", e);
            Alert.alert("Error", e.message || "Failed to delete.");
          }
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
      console.log("[CoursesManagement] Creating course:", { name, teacherId, programId, academicYear, semesterNumber });
      const result = await createCourse({ name, teacherId, programId, academicYear, semesterNumber });
      if (result.error) {
        Alert.alert("Error", result.error + (result.hint ? `\n\n${result.hint}` : ""));
        return;
      }
      Alert.alert("Success", "Course added successfully!");
      setShowAddForm(false);
      setForm({ departmentId: null, teacherId: null, programId: null, academicYear: "", semesterNumber: null, name: "" });
      loadData();
    } catch (e) {
      console.error("[CoursesManagement] Create failed:", e);
      Alert.alert("Error", e.message || "Failed to create course.");
    }
  };

  const filteredPrograms = form.departmentId ? programs.filter(p => p.departmentId === form.departmentId || p.department_id === form.departmentId) : programs;

  const filteredCourses = courses.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.name?.toLowerCase().includes(q) || 
           c.code?.toLowerCase().includes(q) || 
           c.teacher?.toLowerCase().includes(q) || 
           c.program?.toLowerCase().includes(q);
  });

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
              <><X size={13} color={colors.primaryForeground} style={{ marginRight: 3 }} /><Text style={styles.addBtnText}>Close</Text></>
            ) : (
              <><Plus size={13} color={colors.primaryForeground} style={{ marginRight: 3 }} /><Text style={styles.addBtnText}>Add Course</Text></>
            )}
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        {isLoading ? (
          <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 20 }} />
        ) : (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={styles.statTopRow}>
                  <Text style={styles.statLabel}>TOTAL COURSES</Text>
                  <View style={styles.statIconBg}><BookOpen size={14} color={colors.primaryForeground} /></View>
                </View>
                <Text style={styles.statNumber}>{courses.length}</Text>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statTopRow}>
                  <Text style={styles.statLabel}>PROGRAMS</Text>
                  <View style={styles.statIconBg}><GraduationCap size={14} color={colors.primaryForeground} /></View>
                </View>
                <Text style={styles.statNumber}>{programs.length}</Text>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statTopRow}>
                  <Text style={styles.statLabel}>FACULTY</Text>
                  <View style={styles.statIconBg}><Users size={14} color={colors.primaryForeground} /></View>
                </View>
                <Text style={styles.statNumber}>{teachers.length}</Text>
              </View>
            </View>

            {/* Inline Add Form */}
            {showAddForm && (
              <View style={styles.addFormCard}>
                <View style={styles.addFormHeader}>
                  <View style={styles.addFormIconBg}><BookOpen size={14} color={colors.primaryForeground} /></View>
                  <Text style={styles.addFormTitle}>Add New Course</Text>
                  <TouchableOpacity onPress={() => setShowAddForm(false)}>
                    <X size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>

                {/* Row 1: Department, Teacher, Program */}
                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>FILTER BY DEPARTMENT</Text>
                    <View style={styles.pickerBox}>
                      <Picker selectedValue={form.departmentId} onValueChange={(v) => setForm({ ...form, departmentId: v, programId: null })} style={styles.picker} dropdownIconColor={colors.foreground}>
                        <Picker.Item label="All Departments" value={null} color={colors.mutedForeground} style={{ backgroundColor: '#FFFFFF' }} />
                        {departments.map(d => <Picker.Item key={d.id} label={d.name} value={d.id} color={colors.foreground} style={{ backgroundColor: '#FFFFFF' }} />)}
                      </Picker>
                    </View>
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>TEACHER *</Text>
                    <View style={styles.pickerBox}>
                      <Picker selectedValue={form.teacherId} onValueChange={(v) => setForm({ ...form, teacherId: v })} style={styles.picker} dropdownIconColor={colors.foreground}>
                        <Picker.Item label="Select Teacher" value={null} color={colors.mutedForeground} style={{ backgroundColor: '#FFFFFF' }} />
                        {teachers.map(t => <Picker.Item key={t.id} label={t.name} value={t.id} color={colors.foreground} style={{ backgroundColor: '#FFFFFF' }} />)}
                      </Picker>
                    </View>
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formFieldFull}>
                    <Text style={styles.formLabel}>PROGRAM *</Text>
                    <View style={styles.pickerBox}>
                      <Picker selectedValue={form.programId} onValueChange={(v) => setForm({ ...form, programId: v })} style={styles.picker} dropdownIconColor={colors.foreground}>
                        <Picker.Item label="Select Program" value={null} color={colors.mutedForeground} style={{ backgroundColor: '#FFFFFF' }} />
                        {filteredPrograms.map(p => <Picker.Item key={p.id} label={p.name} value={p.id} color={colors.foreground} style={{ backgroundColor: '#FFFFFF' }} />)}
                      </Picker>
                    </View>
                  </View>
                </View>

                {/* Row 2: Year, Semester, Name */}
                <View style={styles.formRow}>
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>ACADEMIC YEAR *</Text>
                    <TextInput style={styles.formInput} placeholder="e.g. 2024-2025" placeholderTextColor={colors.mutedForeground} value={form.academicYear} onChangeText={(t) => setForm({ ...form, academicYear: t })} />
                  </View>
                  <View style={styles.formField}>
                    <Text style={styles.formLabel}>SEMESTER *</Text>
                    <View style={styles.pickerBox}>
                      <Picker selectedValue={form.semesterNumber} onValueChange={(v) => setForm({ ...form, semesterNumber: v })} style={styles.picker} dropdownIconColor={colors.foreground}>
                        <Picker.Item label="Select" value={null} color={colors.mutedForeground} style={{ backgroundColor: '#FFFFFF' }} />
                        {["1","2","3","4","5","6","7","8"].map(s => <Picker.Item key={s} label={`Semester ${s}`} value={s} color={colors.foreground} style={{ backgroundColor: '#FFFFFF' }} />)}
                      </Picker>
                    </View>
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formFieldFull}>
                    <Text style={styles.formLabel}>COURSE NAME *</Text>
                    <TextInput style={styles.formInput} placeholder="e.g. Data Structures" placeholderTextColor={colors.mutedForeground} value={form.name} onChangeText={(t) => setForm({ ...form, name: t })} />
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

            {/* Search Bar */}
            <View style={styles.searchBar}>
              <Search size={14} color={colors.mutedForeground} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search courses, teachers, or programs..."
                placeholderTextColor={colors.mutedForeground}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* All Courses Card */}
            <View style={styles.listCard}>
              <View style={styles.listHeader}>
                <View style={styles.listHeaderIcon}><BookOpen size={12} color={colors.primaryForeground} /></View>
                <Text style={styles.listTitle}>All Courses</Text>
                <View style={styles.listCountBadge}>
                  <Text style={styles.listCountText}>{filteredCourses.length} total</Text>
                </View>
              </View>

              {filteredCourses.length === 0 ? (
                <Text style={styles.emptyText}>No courses found.</Text>
              ) : (
                filteredCourses.map((c, i) => (
                  <TouchableOpacity key={c.id} style={[styles.courseRow, i < filteredCourses.length - 1 && styles.courseRowBorder]} activeOpacity={0.7} onPress={() => setSelectedCourse(c)}>
                    <View style={styles.courseAvatar}>
                      <BookOpen size={14} color={colors.primaryDark} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.courseName}>{c.name}</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2, flexWrap: "wrap" }}>
                        {c.code !== "—" && (
                          <View style={styles.codeBadge}>
                            <Text style={styles.codeText}>{c.code}</Text>
                          </View>
                        )}
                        <User size={10} color={colors.mutedForeground} style={{ marginRight: 2 }} />
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
              <View style={styles.detailHeaderIcon}><BookOpen size={20} color={colors.primaryForeground} /></View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.detailTitle}>{selectedCourse?.name}</Text>
                <Text style={styles.detailSubtitle}>{selectedCourse?.code}</Text>
              </View>
            </View>

            <ScrollView style={{ maxHeight: Dimensions.get('window').height * 0.5 }} showsVerticalScrollIndicator={false}>
              {[
                { icon: <User size={16} color={colors.mutedForeground} />, label: "Teacher", value: selectedCourse?.teacher, sub: selectedCourse?.teacherEmail },
                { icon: <Building2 size={16} color={colors.mutedForeground} />, label: "Department", value: selectedCourse?.department },
                { icon: <GraduationCap size={16} color={colors.mutedForeground} />, label: "Program", value: selectedCourse?.program },
                { icon: <Calendar size={16} color={colors.mutedForeground} />, label: "Year & Semester", value: `${selectedCourse?.year || "—"} • ${selectedCourse?.semester || "—"}` },
                { icon: <Key size={16} color={colors.mutedForeground} />, label: "Entry Code", value: selectedCourse?.entryCode, highlight: true },
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

const createStyles = (colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.secondary },
  container: { padding: 20, paddingBottom: 40 },

  // Header
  headerSection: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, marginTop: 8 },
  title: { fontSize: 24, fontWeight: "800", color: colors.foreground },
  subtitle: { fontSize: 12, color: colors.mutedForeground, marginTop: 3 },
  addBtn: { flexDirection: "row", alignItems: "center", backgroundColor: colors.primaryDark, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { fontSize: 12, fontWeight: "600", color: colors.primaryForeground },

  // Stats
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  statCard: {
    flex: 1, backgroundColor: colors.background, borderRadius: 12, padding: 14, marginHorizontal: 3,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.foreground, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  statTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  statLabel: { fontSize: 7, fontWeight: "700", color: colors.mutedForeground, letterSpacing: 0.3, flex: 1, marginRight: 4 },
  statNumber: { fontSize: 22, fontWeight: "800", color: colors.foreground },
  statIconBg: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.primaryDark, justifyContent: "center", alignItems: "center" },

  // Add Form
  addFormCard: {
    backgroundColor: colors.background, borderRadius: 14, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.foreground, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  addFormHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  addFormIconBg: { width: 28, height: 28, borderRadius: 7, backgroundColor: colors.primaryDark, justifyContent: "center", alignItems: "center", marginRight: 8 },
  addFormTitle: { fontSize: 14, fontWeight: "700", color: colors.foreground, flex: 1 },
  formRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  formField: { flex: 0.48 },
  formFieldFull: { flex: 1 },
  formLabel: { fontSize: 8, fontWeight: "700", color: colors.mutedForeground, letterSpacing: 0.3, marginBottom: 4 },
  pickerBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.secondary,
    height: 54,
    justifyContent: "center",
    overflow: "hidden",
  },
  picker: {
    width: "100%",
    height: 54,
    color: colors.foreground,
    backgroundColor: colors.secondary,
    transform: [{ translateY: -2 }],
  },
  formInput: { height: 54, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 10, fontSize: 12, color: colors.foreground, backgroundColor: colors.secondary },
  formActions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.muted },
  formCancelBtn: { paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 },
  formCancelText: { fontSize: 12, fontWeight: "600", color: colors.mutedForeground },
  formSubmitBtn: { backgroundColor: colors.primaryDark, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  formSubmitText: { fontSize: 12, fontWeight: "700", color: colors.primaryForeground },

  // Search Bar
  searchBar: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.background, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: 16,
  },
  searchInput: { flex: 1, fontSize: 13, color: colors.foreground, padding: 0 },

  // List Card
  listCard: {
    backgroundColor: colors.background, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: colors.border,
    shadowColor: colors.foreground, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  listHeader: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  listHeaderIcon: { width: 24, height: 24, borderRadius: 6, backgroundColor: colors.primaryDark, justifyContent: "center", alignItems: "center", marginRight: 8 },
  listTitle: { fontSize: 14, fontWeight: "700", color: colors.foreground, flex: 1 },
  listCountBadge: { backgroundColor: "#F0FDFA", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1, borderColor: "#CCFBF1" },
  listCountText: { fontSize: 10, fontWeight: "700", color: colors.primaryDark },

  // Course Rows
  courseRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  courseRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.muted },
  courseAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#F0FDFA", justifyContent: "center", alignItems: "center", marginRight: 10 },
  courseName: { fontSize: 13, fontWeight: "700", color: colors.foreground },
  courseMeta: { fontSize: 10, color: colors.mutedForeground },
  codeBadge: { backgroundColor: colors.muted, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3, marginRight: 6 },
  codeText: { fontSize: 8, fontWeight: "700", color: colors.mutedForeground, letterSpacing: 0.3 },
  deleteBtnOutline: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#FECACA", backgroundColor: "rgba(239,68,68,0.08)", paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6 },
  deleteBtnText: { fontSize: 10, fontWeight: "700", color: colors.destructive },
  emptyText: { fontSize: 12, color: colors.mutedForeground, textAlign: "center", paddingVertical: 20 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalCard: { backgroundColor: colors.background, borderRadius: 20, padding: 22, width: "100%", maxHeight: Dimensions.get('window').height * 0.85 },
  detailHeader: { flexDirection: "row", alignItems: "center", marginBottom: 18, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.muted },
  detailHeaderIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.primaryDark, justifyContent: "center", alignItems: "center" },
  detailTitle: { fontSize: 18, fontWeight: "800", color: colors.foreground },
  detailSubtitle: { fontSize: 11, color: colors.mutedForeground, marginTop: 2 },
  detailInfoItem: { flexDirection: "row", alignItems: "center", backgroundColor: colors.secondary, padding: 12, borderRadius: 10, marginBottom: 6, borderWidth: 1, borderColor: colors.border },
  detailInfoLabel: { fontSize: 9, fontWeight: "700", color: colors.mutedForeground, letterSpacing: 0.4, marginBottom: 1 },
  detailInfoValue: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  detailInfoSub: { fontSize: 11, color: colors.mutedForeground, marginTop: 1 },
  detailStatsRow: { flexDirection: "row", backgroundColor: colors.secondary, borderRadius: 10, marginVertical: 8, borderWidth: 1, borderColor: colors.border },
  detailStatBox: { flex: 1, alignItems: "center", paddingVertical: 14 },
  detailStatNumber: { fontSize: 24, fontWeight: "800", color: colors.foreground, marginTop: 8 },
  closeBtn: { marginTop: 14, backgroundColor: colors.primaryDark, borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  closeBtnText: { fontSize: 13, fontWeight: "700", color: colors.primaryForeground },
});