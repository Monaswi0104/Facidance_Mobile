import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, Alert, ActivityIndicator, Dimensions, TextInput, Modal
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { getCourses, deleteCourse, createCourse, getDepartments, getPrograms, getTeachers } from "../../api/adminApi";
import { useFocusEffect } from "@react-navigation/native";

const { width } = Dimensions.get("window");

export default function CoursesManagement() {
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [form, setForm] = useState({
    departmentId: null,
    teacherId: null,
    programId: null,
    academicYear: "",
    semesterNumber: null,
    name: ""
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [coursesData, deptsData, progsData, teachersData] = await Promise.all([
        getCourses(),
        getDepartments(),
        getPrograms(),
        getTeachers()
      ]);

      const list = coursesData.courses || coursesData || [];
      setCourses(list.map((c) => ({
        id: c.id, name: c.name, code: c.code || "—",
        entryCode: c.entryCode || "—",
        teacher: c.teacher?.user?.name || c.teacher?.name || "—",
        teacherEmail: c.teacher?.user?.email || "",
        teacherDept: c.teacher?.department?.name || "—",
        semester: c.semester?.name || "",
        year: c.semester?.academicYear?.name || "",
        program: c.semester?.academicYear?.program?.name || "",
        department: c.semester?.academicYear?.program?.department?.name || "",
        students: c._count?.students || 0,
        sessions: c._count?.sessions || 0,
      })));

      setDepartments(deptsData.departments || deptsData || []);
      setPrograms(progsData.programs || progsData || []);
      
      const allTeachers = teachersData.teachers || teachersData || [];
      setTeachers(allTeachers.filter(t => t.id && !t.isPending));
    } catch (e) { console.log(e); }
    finally { setIsLoading(false); }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  // We no longer need to calculate uniquePrograms and uniqueTeachers for the stats
  // since the website just shows total programs and total teachers.

  const handleDelete = (course) => {
    Alert.alert("Delete Course", `Remove "${course.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try { await deleteCourse(course.id); loadData(); }
          catch (e) {
            console.log("Delete error:", e);
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
      console.log("Creating course with data:", { name, teacherId, programId, academicYear, semesterNumber });
      const result = await createCourse({ name, teacherId, programId, academicYear, semesterNumber });
      console.log("Create course result:", result);
      if (result.error) {
        Alert.alert("Error", result.error + (result.hint ? `\n\n${result.hint}` : ""));
        return;
      }
      Alert.alert("Success", "Course added successfully!");
      setIsAddingCourse(false);
      setForm({ departmentId: null, teacherId: null, programId: null, academicYear: "", semesterNumber: null, name: "" });
      loadData();
    } catch (e) {
      console.log("Create course error:", e);
      Alert.alert("Error", e.message || "Failed to create course.");
    }
  };

  const colors = ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444"];
  const filteredPrograms = form.departmentId ? programs.filter(p => p.departmentId === form.departmentId) : programs;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={[styles.badge, { backgroundColor: "#10B981" }]}>
              <Text style={styles.badgeText}>C</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Courses</Text>
              <Text style={styles.subtitle}>Manage academic courses and their teachers, programs & semesters.</Text>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.addBtnHeader} 
            onPress={() => setIsAddingCourse(!isAddingCourse)}
          >
            <Text style={styles.addBtnHeaderText}>{isAddingCourse ? "✕ Close" : "⊕ Add Course"}</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        {isLoading ? (
          <ActivityIndicator size="small" color="#4361EE" style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>TOTAL COURSES</Text>
              <View style={styles.statBottom}><Text style={styles.statNumber}>{courses.length}</Text>
                <View style={[styles.statIconBg, { backgroundColor: "#10B981" }]}><Text style={styles.statIcon}>📚</Text></View>
              </View>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>PROGRAMS COVERED</Text>
              <View style={styles.statBottom}><Text style={styles.statNumber}>{programs.length}</Text>
                <View style={[styles.statIconBg, { backgroundColor: "#8B5CF6" }]}><Text style={styles.statIcon}>📋</Text></View>
              </View>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>TEACHING FACULTY</Text>
              <View style={styles.statBottom}><Text style={styles.statNumber}>{teachers.length}</Text>
                <View style={[styles.statIconBg, { backgroundColor: "#3B82F6" }]}><Text style={styles.statIcon}>👨‍🏫</Text></View>
              </View>
            </View>
          </View>
        )}

        {/* Add Course Form UI */}
        {isAddingCourse && (
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>📖 Add New Course</Text>
              <TouchableOpacity onPress={() => setIsAddingCourse(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.formRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Department</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={form.departmentId}
                    onValueChange={(v) => setForm({ ...form, departmentId: v, programId: null })}
                    style={styles.picker}
                  >
                    <Picker.Item label="All Departments" value={null} color="#94A3B8" />
                    {departments.map(d => <Picker.Item key={d.id} label={d.name} value={d.id} color="#1E293B" />)}
                  </Picker>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Teacher</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={form.teacherId}
                    onValueChange={(v) => setForm({ ...form, teacherId: v })}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select Teacher" value={null} color="#94A3B8" />
                    {teachers.map(t => <Picker.Item key={t.id} label={t.name} value={t.id} color="#1E293B" />)}
                  </Picker>
                </View>
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.inputGroupFull}>
                <Text style={styles.inputLabel}>Program</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={form.programId}
                    onValueChange={(v) => setForm({ ...form, programId: v })}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select Program" value={null} color="#94A3B8" />
                    {filteredPrograms.map(p => <Picker.Item key={p.id} label={p.name} value={p.id} color="#1E293B" />)}
                  </Picker>
                </View>
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Academic Year</Text>
                <TextInput 
                  style={styles.textInput} 
                  placeholder="e.g., 2024-2025" 
                  placeholderTextColor="#94A3B8"
                  value={form.academicYear}
                  onChangeText={(text) => setForm({ ...form, academicYear: text })}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Semester</Text>
                <View style={styles.pickerWrapper}>
                  <Picker
                    selectedValue={form.semesterNumber}
                    onValueChange={(v) => setForm({ ...form, semesterNumber: v })}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select Semester" value={null} color="#94A3B8" />
                    {["1","2","3","4","5","6","7","8"].map(s => <Picker.Item key={s} label={`Semester ${s}`} value={s} color="#1E293B" />)}
                  </Picker>
                </View>
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.inputGroupFull}>
                <Text style={styles.inputLabel}>Course Name</Text>
                <TextInput 
                  style={styles.textInput} 
                  placeholder="e.g., Data Structures and Algorithms" 
                  placeholderTextColor="#94A3B8"
                  value={form.name}
                  onChangeText={(text) => setForm({ ...form, name: text })}
                />
              </View>
            </View>

            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsAddingCourse(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleCreateCourse}>
                <Text style={styles.submitBtnText}>Add Course</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Courses List */}
        <View style={styles.listHeader}>
          <Text style={styles.listIcon}>📚</Text>
          <Text style={styles.listTitle}>Courses List</Text>
          <View style={styles.listCountBadge}><Text style={styles.listCountText}>{courses.length} total</Text></View>
        </View>
        <View style={styles.listCard}>
          {courses.length === 0 ? (
            <Text style={styles.emptyText}>No courses yet.</Text>
          ) : (
            courses.map((c, i) => (
              <TouchableOpacity key={c.id} style={[styles.itemRow, i < courses.length - 1 && styles.itemBorder]} activeOpacity={0.7} onPress={() => setSelectedCourse(c)}>
                <View style={[styles.itemDot, { backgroundColor: colors[i % 5] }]} />
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{c.name}</Text>
                  <Text style={styles.itemMeta}>
                    {c.code !== "—" ? `📝 ${c.code}  ·  ` : ""}Teacher: {c.teacher}
                  </Text>
                  {(c.year || c.semester) ? (
                    <Text style={styles.itemMeta}>{c.year}{c.semester ? ` · ${c.semester}` : ""}</Text>
                  ) : null}
                  <Text style={{ fontSize: 11, color: "#94A3B8", marginTop: 3 }}>Tap to view details →</Text>
                </View>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(c)}>
                  <Text style={styles.deleteBtnText}>🗑 Delete</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Course Detail Modal */}
      <Modal visible={!!selectedCourse} transparent animationType="slide">
        <View style={styles.detailOverlay}>
          <View style={styles.detailCard}>
            {/* Header */}
            <View style={styles.detailProfileSection}>
              <View style={styles.detailAvatar}>
                <Text style={styles.detailAvatarText}>📚</Text>
              </View>
              <Text style={styles.detailName}>{selectedCourse?.name}</Text>
              <View style={styles.codeBadge}>
                <Text style={styles.codeBadgeText}>{selectedCourse?.code}</Text>
              </View>
            </View>

            {/* Info Items */}
            <ScrollView style={{ maxHeight: Dimensions.get('window').height * 0.45 }} showsVerticalScrollIndicator={false}>
              <View style={styles.detailInfoList}>
                <View style={styles.detailInfoItem}>
                  <Text style={styles.detailInfoIcon}>👨‍🏫</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailInfoItemLabel}>Teacher</Text>
                    <Text style={styles.detailInfoItemValue}>{selectedCourse?.teacher}</Text>
                    {!!selectedCourse?.teacherEmail && <Text style={styles.detailInfoItemSub}>{selectedCourse.teacherEmail}</Text>}
                  </View>
                </View>
                <View style={styles.detailInfoItem}>
                  <Text style={styles.detailInfoIcon}>🏢</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailInfoItemLabel}>Department</Text>
                    <Text style={styles.detailInfoItemValue}>{selectedCourse?.department || selectedCourse?.teacherDept}</Text>
                  </View>
                </View>
                <View style={styles.detailInfoItem}>
                  <Text style={styles.detailInfoIcon}>📚</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailInfoItemLabel}>Program</Text>
                    <Text style={styles.detailInfoItemValue}>{selectedCourse?.program || "—"}</Text>
                  </View>
                </View>
                <View style={styles.detailInfoItem}>
                  <Text style={styles.detailInfoIcon}>📅</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailInfoItemLabel}>Academic Year & Semester</Text>
                    <Text style={styles.detailInfoItemValue}>{selectedCourse?.year || "—"} • {selectedCourse?.semester || "—"}</Text>
                  </View>
                </View>
                <View style={styles.detailInfoItem}>
                  <Text style={styles.detailInfoIcon}>🔑</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailInfoItemLabel}>Entry Code</Text>
                    <Text style={[styles.detailInfoItemValue, { color: "#10B981", letterSpacing: 2 }]}>{selectedCourse?.entryCode}</Text>
                  </View>
                </View>
              </View>

              {/* Stats Row */}
              <View style={styles.detailStatsRow}>
                <View style={styles.detailStatBox}>
                  <Text style={styles.detailStatNumber}>{selectedCourse?.students || 0}</Text>
                  <Text style={styles.detailStatLabel}>Students</Text>
                </View>
                <View style={[styles.detailStatBox, { borderLeftWidth: 1, borderLeftColor: "#E2E8F0" }]}>
                  <Text style={styles.detailStatNumber}>{selectedCourse?.sessions || 0}</Text>
                  <Text style={styles.detailStatLabel}>Sessions</Text>
                </View>
              </View>
            </ScrollView>

            {/* Close */}
            <TouchableOpacity style={styles.detailCloseBtn} activeOpacity={0.7} onPress={() => setSelectedCourse(null)}>
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
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, marginTop: 8 },
  headerLeft: { flexDirection: "row", alignItems: "center", flex: 1, paddingRight: 10 },
  badge: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 12 },
  badgeText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  title: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 12, color: "#64748B", marginTop: 2 },
  
  addBtnHeader: { backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  addBtnHeaderText: { fontSize: 12, fontWeight: "700", color: "#0F172A" },

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
  itemMeta: { fontSize: 12, color: "#64748B", marginBottom: 1 },
  deleteBtn: { backgroundColor: "#FEE2E2", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  deleteBtnText: { fontSize: 12, fontWeight: "600", color: "#EF4444" },
  
  // Form Styles
  formCard: { backgroundColor: "#FFF", borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2, borderWidth: 1, borderColor: "#F1F5F9" },
  formHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  formTitle: { fontSize: 15, fontWeight: "700", color: "#10B981" },
  closeBtn: { fontSize: 18, color: "#94A3B8", fontWeight: "600" },
  formRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  inputGroup: { flex: 0.48 },
  inputGroupFull: { flex: 1 },
  inputLabel: { fontSize: 11, fontWeight: "600", color: "#475569", marginBottom: 6 },
  pickerWrapper: { height: 44, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 8, justifyContent: "center", overflow: "hidden", backgroundColor: "#F8FAFC" },
  picker: { width: "100%", color: "#0F172A" },
  textInput: { height: 44, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 8, paddingHorizontal: 12, fontSize: 14, color: "#0F172A", backgroundColor: "#F8FAFC" },
  formActions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, marginRight: 12 },
  cancelBtnText: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  submitBtn: { backgroundColor: "#10B981", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  submitBtnText: { fontSize: 13, fontWeight: "700", color: "#FFF" },

  // Detail Modal
  detailOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  detailCard: { backgroundColor: "#FFF", borderRadius: 24, padding: 24, width: "100%", maxHeight: Dimensions.get('window').height * 0.85 },
  detailProfileSection: { alignItems: "center", marginBottom: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  detailAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#F0FDF4", justifyContent: "center", alignItems: "center", marginBottom: 12 },
  detailAvatarText: { fontSize: 28 },
  detailName: { fontSize: 20, fontWeight: "800", color: "#0F172A", textAlign: "center", marginBottom: 8 },
  codeBadge: { backgroundColor: "#EEF2FF", paddingHorizontal: 16, paddingVertical: 5, borderRadius: 20 },
  codeBadgeText: { fontSize: 13, fontWeight: "700", color: "#4361EE", letterSpacing: 1 },
  detailInfoList: { marginBottom: 16 },
  detailInfoItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: "#E2E8F0" },
  detailInfoIcon: { fontSize: 18, marginRight: 14, width: 24, textAlign: "center" },
  detailInfoItemLabel: { fontSize: 10, fontWeight: "700", color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  detailInfoItemValue: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  detailInfoItemSub: { fontSize: 12, color: "#64748B", marginTop: 2 },
  detailStatsRow: { flexDirection: "row", backgroundColor: "#F8FAFC", borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: "#E2E8F0" },
  detailStatBox: { flex: 1, alignItems: "center", paddingVertical: 16 },
  detailStatNumber: { fontSize: 24, fontWeight: "800", color: "#0F172A", marginBottom: 4 },
  detailStatLabel: { fontSize: 11, fontWeight: "600", color: "#94A3B8" },
  detailCloseBtn: { marginTop: 16, backgroundColor: "#0F172A", borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  detailCloseBtnText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
});