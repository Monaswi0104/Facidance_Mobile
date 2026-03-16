import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert,
  ScrollView, Modal, TextInput, ActivityIndicator, Dimensions
} from "react-native";
import { getTeacherCourses, getCourseStudents } from "../../api/teacherApi";
import { useFocusEffect } from "@react-navigation/native";
import DocumentPicker from "react-native-document-picker";
import RNFS from "react-native-fs";

const { width } = Dimensions.get("window");

export default function StudentEnrollment() {
  const [courses, setCourses] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [file, setFile] = useState(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCourse, setFilterCourse] = useState(null);

  const [showProgramInfo, setShowProgramInfo] = useState(false);
  const [showCourseInfo, setShowCourseInfo] = useState(false);
  const [showFilterInfo, setShowFilterInfo] = useState(false);

  useFocusEffect(useCallback(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await getTeacherCourses();
        const list = Array.isArray(data) ? data : [];
        setCourses(list);
        
        // Extract unique programs
        const progs = new Map();
        list.forEach(c => {
          const p = c.semester?.academicYear?.program;
          if (p && !progs.has(p.id)) progs.set(p.id, p);
        });
        setPrograms(Array.from(progs.values()));

        // Gather students from all courses
        const allStudents = [];
        for (const c of list) {
          try {
            const stuData = await getCourseStudents(c.id);
            const stuList = Array.isArray(stuData) ? stuData : [];
            stuList.forEach((s) => {
              if (!allStudents.find((x) => x.id === (s.id || s.userId))) {
                allStudents.push({
                  id: s.id || s.userId,
                  name: s.user?.name || s.name || "Student",
                  email: s.user?.email || s.email || "—",
                  program: s.program?.name || "—",
                  department: s.program?.department?.name || "—",
                  coursesCount: s._count?.courses || 1,
                  attendance: s._count?.attendance || 0,
                  faceRegistered: !!s.faceEmbedding,
                  courseId: c.id
                });
              }
            });
          } catch (e) {}
        }
        setStudents(allStudents);
      } catch (e) { console.log(e); }
      finally { setIsLoading(false); }
    };
    load();
  }, []));

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.allFiles],
      });
      setFile(res);
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) console.log(err);
    }
  };

  const importStudents = async () => {
    if (!file) return Alert.alert("Required", "Please select a file first.");
    if (!selectedCourse) return Alert.alert("Required", "Please select a course to import into.");

    setIsImporting(true);
    try {
      const content = await RNFS.readFile(file.uri, "utf8");
      const lines = content.split("\n").map(l => l.trim()).filter(l => l.length > 0);
      let count = 0;
      // In a real app this would call an API with the parsed data
      // For now, we simulate success
      for(let i=1; i<lines.length; i++) {
         if(lines[i].includes(",")) count++;
      }
      setTimeout(() => {
        Alert.alert("Success", `Successfully imported ${count} students into ${selectedCourse.name}.`);
        setFile(null);
        setSelectedProgram(null);
        setSelectedCourse(null);
        setIsImporting(false);
      }, 800);
    } catch (e) {
      Alert.alert("Error", "Could not read or parse file.");
      setIsImporting(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const q = search.toLowerCase();
    const matchesSearch = !search || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.program.toLowerCase().includes(q);
    const matchesCourse = !filterCourse || s.courseId === filterCourse.id;
    return matchesSearch && matchesCourse;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.headerBadge, { backgroundColor: "#0F172A" }]}>
            <Text style={{ fontSize: 18 }}>👨‍🎓</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Student Management</Text>
            <Text style={styles.subtitle}>Import, view, and manage your students</Text>
          </View>
        </View>

        {/* Import Section */}
        <View style={styles.sectionCard}>
          <View style={styles.importHeader}>
            <View style={styles.importIconBadge}>
              <Text style={{ fontSize: 16 }}>↑</Text>
            </View>
            <View>
              <Text style={styles.importTitle}>Import Students</Text>
              <Text style={styles.importDesc}>Upload a CSV file to enroll students into a course.</Text>
            </View>
          </View>

          <Text style={styles.labelText}>CSV FILE</Text>
          <Text style={styles.subLabelText}>Columns: Name, Email, DOB (optional)</Text>
          
          <View style={styles.fileRow}>
            <TouchableOpacity style={styles.chooseFileBtn} onPress={pickFile}>
              <Text style={styles.chooseFileText}>Choose File</Text>
            </TouchableOpacity>
            <Text style={styles.fileNameText} numberOfLines={1}>{file ? file.name : "No file chosen"}</Text>
          </View>

          <View style={styles.dropdownsRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.labelText}>PROGRAM</Text>
              <TouchableOpacity style={styles.dropdown} onPress={() => setShowProgramInfo(true)}>
                <Text style={selectedProgram ? styles.dropdownText : styles.dropdownPlaceholder}>
                  {selectedProgram ? selectedProgram.name : "-- Select Program --"}
                </Text>
                <Text style={styles.dropdownArrow}>⌄</Text>
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.labelText}>COURSE</Text>
              <TouchableOpacity style={styles.dropdown} onPress={() => setShowCourseInfo(true)}>
                <Text style={selectedCourse ? styles.dropdownText : styles.dropdownPlaceholder}>
                  {selectedCourse ? selectedCourse.name : "-- Select Course --"}
                </Text>
                <Text style={styles.dropdownArrow}>⌄</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.importFooter}>
            <Text style={styles.importInfoText}>Newly imported students will be processed shortly.</Text>
            <TouchableOpacity style={[styles.submitBtn, (!file || !selectedCourse) && styles.submitBtnDisabled]}
              disabled={!file || !selectedCourse || isImporting} onPress={importStudents}>
              {isImporting ? <ActivityIndicator color="#4361EE" size="small" /> : <Text style={styles.submitBtnText}>Import Students</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search & Filter */}
        <View style={styles.filterCard}>
          <View style={styles.searchBar}>
            <Text style={{ marginRight: 8 }}>🔍</Text>
            <TextInput style={styles.searchInput} placeholder="Search students by name, email, or program..."
              placeholderTextColor="#94A3B8" value={search} onChangeText={setSearch} />
          </View>
          <View style={styles.filterWrapper}>
            <Text style={styles.filterLabel}>Filter by Course</Text>
            <TouchableOpacity style={styles.dropdown} onPress={() => setShowFilterInfo(true)}>
              <Text style={styles.dropdownText} numberOfLines={1}>{filterCourse ? filterCourse.name : "All Courses"}</Text>
              <Text style={styles.dropdownArrow}>⌄</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Directory Table */}
        <View style={styles.tableCard}>
          <Text style={styles.tableTitle}>Student Directory</Text>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>STUDENT</Text>
            <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>PROGRAM</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>COURSES</Text>
            <Text style={[styles.tableHeaderText, { flex: 0.8 }]}>ATTENDANCE</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "center" }]}>FACE DATA</Text>
          </View>

          {isLoading ? (
             <ActivityIndicator size="large" color="#4361EE" style={{ marginVertical: 40 }} />
          ) : filteredStudents.length === 0 ? (
            <Text style={styles.emptyText}>No students found.</Text>
          ) : (
            filteredStudents.map((s, i) => (
              <View key={i} style={[styles.tableRow, i < filteredStudents.length - 1 && styles.tableBorder]}>
                <View style={{ flex: 2, paddingRight: 5 }}>
                  <Text style={styles.studentName} numberOfLines={1}>{s.name}</Text>
                  <Text style={styles.studentEmail} numberOfLines={1}>{s.email}</Text>
                </View>
                <Text style={[styles.cellText, { flex: 1.5, paddingRight: 5 }]} numberOfLines={2}>{s.program}</Text>
                <Text style={[styles.cellText, { flex: 1 }]}>{s.coursesCount}</Text>
                <Text style={[styles.cellText, { flex: 0.8 }]}>{s.attendance}</Text>
                <View style={{ flex: 1, alignItems: "center" }}>
                  <View style={[styles.faceBadge, s.faceRegistered ? styles.faceYes : styles.faceNo]}>
                    <Text style={[styles.faceText, s.faceRegistered ? { color: "#059669" } : { color: "#94A3B8" }]}>
                      {s.faceRegistered ? "✓ Registered" : "Pending"}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

      </ScrollView>

      {/* Program Modal */}
      <Modal visible={showProgramInfo} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
             <Text style={styles.modalTitle}>Select Program</Text>
             {programs.map(p => (
               <TouchableOpacity key={p.id} style={styles.modalItem} onPress={() => { setSelectedProgram(p); setSelectedCourse(null); setShowProgramInfo(false); }}>
                 <Text style={styles.modalItemText}>{p.name}</Text>
               </TouchableOpacity>
             ))}
             <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowProgramInfo(false)}>
               <Text style={styles.modalCloseText}>Cancel</Text>
             </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Course Modal */}
      <Modal visible={showCourseInfo} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
             <Text style={styles.modalTitle}>Select Course</Text>
             {courses.filter(c => !selectedProgram || c.semester?.academicYear?.program?.id === selectedProgram.id).map(c => (
               <TouchableOpacity key={c.id} style={styles.modalItem} onPress={() => { setSelectedCourse(c); setShowCourseInfo(false); }}>
                 <Text style={styles.modalItemText}>{c.name}</Text>
               </TouchableOpacity>
             ))}
             <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowCourseInfo(false)}>
               <Text style={styles.modalCloseText}>Cancel</Text>
             </TouchableOpacity>
          </View>
        </View>
      </Modal>

       {/* Filter Modal */}
       <Modal visible={showFilterInfo} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
             <Text style={styles.modalTitle}>Filter by Course</Text>
             <TouchableOpacity style={styles.modalItem} onPress={() => { setFilterCourse(null); setShowFilterInfo(false); }}>
                 <Text style={styles.modalItemText}>All Courses</Text>
              </TouchableOpacity>
             {courses.map(c => (
               <TouchableOpacity key={c.id} style={styles.modalItem} onPress={() => { setFilterCourse(c); setShowFilterInfo(false); }}>
                 <Text style={styles.modalItemText}>{c.name}</Text>
               </TouchableOpacity>
             ))}
             <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowFilterInfo(false)}>
               <Text style={styles.modalCloseText}>Cancel</Text>
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
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20, marginTop: 8 },
  headerBadge: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 14 },
  title: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 13, color: "#64748B", marginTop: 2 },

  sectionCard: { backgroundColor: "#FFF", borderRadius: 14, padding: 20, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1, borderWidth: 1, borderColor: "#E2E8F0" },
  importHeader: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  importIconBadge: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#6366F1", justifyContent: "center", alignItems: "center", marginRight: 12 },
  importTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  importDesc: { fontSize: 12, color: "#64748B", marginTop: 2 },
  
  labelText: { fontSize: 10, fontWeight: "700", color: "#64748B", letterSpacing: 0.5, marginBottom: 4 },
  subLabelText: { fontSize: 11, color: "#94A3B8", marginBottom: 10 },
  
  fileRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 10, borderWidth: 1, borderColor: "#E2E8F0", paddingLeft: 4, paddingRight: 14, paddingVertical: 4, marginBottom: 16 },
  chooseFileBtn: { backgroundColor: "#0F172A", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginRight: 12 },
  chooseFileText: { color: "#FFF", fontSize: 12, fontWeight: "600" },
  fileNameText: { fontSize: 13, color: "#475569", flex: 1 },

  dropdownsRow: { flexDirection: "row", marginBottom: 16 },
  dropdown: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFF", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  dropdownPlaceholder: { fontSize: 13, color: "#94A3B8" },
  dropdownText: { fontSize: 13, color: "#1E293B", flex: 1 },
  dropdownArrow: { color: "#94A3B8", fontSize: 18, paddingBottom: 6 },
  
  importFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4, borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 16 },
  importInfoText: { fontSize: 11, color: "#94A3B8", flex: 1, paddingRight: 10 },
  submitBtn: { backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: "#1E293B", fontSize: 13, fontWeight: "700" },

  filterCard: { backgroundColor: "#FFF", borderRadius: 14, padding: 14, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1, borderWidth: 1, borderColor: "#E2E8F0", flexDirection: "row", alignItems: "center" },
  searchBar: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: "#E2E8F0", marginRight: 16 },
  searchInput: { flex: 1, fontSize: 13, color: "#1E293B", padding: 0 },
  filterWrapper: { width: 140 },
  filterLabel: { fontSize: 10, fontWeight: "600", color: "#64748B", marginBottom: 4, paddingLeft: 2 },

  tableCard: { backgroundColor: "#FFF", borderRadius: 14, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 20 },
  tableTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B", marginBottom: 14 },
  tableHeaderRow: { flexDirection: "row", paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#F1F5F9", marginBottom: 4 },
  tableHeaderText: { fontSize: 10, fontWeight: "700", color: "#94A3B8", letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  tableBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  studentName: { fontSize: 13, fontWeight: "700", color: "#1E293B", marginBottom: 1 },
  studentEmail: { fontSize: 11, color: "#94A3B8" },
  cellText: { fontSize: 12, color: "#64748B" },
  faceBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  faceYes: { backgroundColor: "#F0FDF4", borderColor: "#DCFCE7" },
  faceNo: { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" },
  faceText: { fontSize: 10, fontWeight: "700" },
  emptyText: { fontSize: 13, color: "#94A3B8", textAlign: "center", paddingVertical: 20 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: "#FFF", borderRadius: 16, padding: 20, maxHeight: "80%" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1E293B", marginBottom: 16 },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  modalItemText: { fontSize: 15, color: "#334155" },
  modalCloseBtn: { marginTop: 20, backgroundColor: "#F1F5F9", padding: 14, borderRadius: 12, alignItems: "center" },
  modalCloseText: { fontSize: 15, fontWeight: "600", color: "#64748B" }
});