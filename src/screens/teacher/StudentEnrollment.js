import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert,
  ScrollView, Modal, TextInput, ActivityIndicator, Dimensions
} from "react-native";
import { getTeacherCourses, getCourseStudents, importStudentsCsv, getAllPrograms } from "../../api/teacherApi";
import { useFocusEffect } from "@react-navigation/native";
import { Theme } from "../../theme/Theme";
import { Users, ScanFace, UserX, Upload, Search, ChevronDown, FileUp, User, CheckCircle, XCircle } from "lucide-react-native";
import DocumentPicker from "react-native-document-picker";
import RNFS from "react-native-fs";
import XLSX from "xlsx";

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
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [showProgramInfo, setShowProgramInfo] = useState(false);
  const [showCourseInfo, setShowCourseInfo] = useState(false);
  const [showFilterInfo, setShowFilterInfo] = useState(false);

  useFocusEffect(useCallback(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await getTeacherCourses();
        const list = Array.isArray(data) ? data : (data?.courses || []);
        setCourses(list);
        
        // Fetch all programs from the system
        const allPrograms = await getAllPrograms();
        setPrograms(allPrograms);

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
                  status: s.status,
                  joinedAt: s.joinedAt || s.createdAt || s.user?.createdAt,
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
        type: [DocumentPicker.types.csv, DocumentPicker.types.xlsx, DocumentPicker.types.xls, DocumentPicker.types.allFiles],
      });
      setFile(res);
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) console.log(err);
    }
  };

  const parseFileToRows = async () => {
    const fileName = (file.name || "").toLowerCase();
    const isExcel = fileName.endsWith(".xlsx") || fileName.endsWith(".xls");

    if (isExcel) {
      // Read as base64 and parse with SheetJS
      const base64 = await RNFS.readFile(file.uri, "base64");
      const workbook = XLSX.read(base64, { type: "base64", cellDates: true });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      // Use raw:false + dateNF to get dates as formatted strings
      const csvData = XLSX.utils.sheet_to_csv(firstSheet, { rawNumbers: false, dateNF: 'yyyy-mm-dd' });
      console.log("Parsed CSV from Excel:", csvData);
      return csvData.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    } else {
      // CSV — read as plain text
      const content = await RNFS.readFile(file.uri, "utf8");
      return content.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    }
  };

  // Normalize DOB to YYYY-MM-DD format for consistent password hashing
  const normalizeDob = (raw) => {
    if (!raw || raw === "2000-01-01") return "2000-01-01";
    const s = String(raw).trim();

    // If it's a pure number (Excel serial date), convert it
    if (/^\d{5}$/.test(s)) {
      // Excel serial date: days since Jan 0, 1900
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(excelEpoch.getTime() + (parseInt(s) - 2) * 86400000);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    // DD-MM-YYYY or DD/MM/YYYY
    const ddmmyyyy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (ddmmyyyy) {
      const [, dd, mm, yyyy] = ddmmyyyy;
      return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    }

    // YYYY-MM-DD already
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      return s.substring(0, 10);
    }

    // Fallback: return as-is, let the backend handle it
    return s;
  };

  const importStudents = async () => {
    if (!file) return Alert.alert("Required", "Please select a file first.");
    if (!selectedCourse) return Alert.alert("Required", "Please select a course to import into.");
    if (!selectedProgram) return Alert.alert("Required", "Please select a program.");

    setIsImporting(true);
    try {
      const lines = await parseFileToRows();
      if (lines.length < 2) {
        Alert.alert("Error", "File is empty or has no data rows.");
        setIsImporting(false);
        return;
      }

      // Parse header to find column indices
      const header = lines[0].split(",").map(h => h.trim().toLowerCase());
      const nameIdx = header.findIndex(h => h.includes("name"));
      const emailIdx = header.findIndex(h => h.includes("email"));
      const dobIdx = header.findIndex(h => h.includes("dob") || h.includes("date") || h.includes("birth"));

      if (nameIdx === -1 || emailIdx === -1) {
        Alert.alert("Error", "Could not find 'Name' and 'Email' columns in the file. Please check the header row.");
        setIsImporting(false);
        return;
      }

      // Parse data rows
      const studentRows = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim());
        const name = cols[nameIdx] || "";
        const email = cols[emailIdx] || "";
        const rawDob = dobIdx !== -1 ? (cols[dobIdx] || "") : "";
        const dob = normalizeDob(rawDob);
        console.log(`Row ${i}: name="${name}", email="${email}", rawDob="${rawDob}", normalizedDob="${dob}"`);
        if (name && email) {
          studentRows.push({
            name,
            email,
            dob,
            programId: selectedProgram.id,
          });
        }
      }

      if (studentRows.length === 0) {
        Alert.alert("Error", "No valid student rows found in the file.");
        setIsImporting(false);
        return;
      }

      // Call the real API
      const result = await importStudentsCsv(selectedCourse.id, studentRows);
      const r = result.results || {};
      const successCount = (r.successful || []).length;
      const existingCount = (r.existing || []).length;
      const failedCount = (r.failed || []).length;

      let msg = `${successCount} student(s) imported successfully.`;
      if (existingCount > 0) msg += `\n${existingCount} already enrolled.`;
      if (failedCount > 0) msg += `\n${failedCount} failed.`;

      Alert.alert("Import Complete", msg);
      setFile(null);
      setSelectedProgram(null);
      setSelectedCourse(null);

      // Reload student list
      const allStudents = [];
      for (const c of courses) {
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
                status: s.status,
                joinedAt: s.joinedAt || s.createdAt || s.user?.createdAt,
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
    } catch (e) {
      console.log("Import error:", e);
      Alert.alert("Error", e.message || "Could not read or parse file.");
    } finally {
      setIsImporting(false);
    }
  };

  const faceRegistered = students.filter(s => s.faceRegistered).length;
  const notRegistered = students.length - faceRegistered;

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
          <Text style={styles.title}>Student Management</Text>
          <Text style={styles.subtitle}>Import, view, and manage your students across all courses.</Text>
        </View>

        {/* Stats Row */}
        {!isLoading && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>TOTAL STUDENTS</Text>
              <View style={styles.statBottom}>
                <Text style={styles.statNumber}>{students.length}</Text>
                <View style={styles.statIconBg}><Users size={16} color="#FFF" /></View>
              </View>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>FACE REGISTERED</Text>
              <View style={styles.statBottom}>
                <Text style={styles.statNumber}>{faceRegistered}</Text>
                <View style={styles.statIconBg}><ScanFace size={16} color="#FFF" /></View>
              </View>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>NOT{"\n"}REGISTERED</Text>
              <View style={styles.statBottom}>
                <Text style={styles.statNumber}>{notRegistered}</Text>
                <View style={styles.statIconBg}><UserX size={16} color="#FFF" /></View>
              </View>
            </View>
          </View>
        )}

        {/* Import Section */}
        <View style={styles.sectionCard}>
          <View style={styles.importHeader}>
            <View style={styles.importIconBadge}>
              <Upload size={18} color="#FFF" />
            </View>
            <View style={{ flex: 1, flexShrink: 1 }}>
              <Text style={styles.importTitle}>Import Students</Text>
              <Text style={styles.importDesc}>Upload an Excel file to create accounts and enroll students into a course.</Text>
            </View>
          </View>

          <Text style={styles.labelText}>EXCEL FILE (.XLSX) — COLUMNS: NAME, DOB (DD/MM/YYYY), EMAIL (OPTIONAL)</Text>
          
          <View style={styles.fileRow}>
            <TouchableOpacity style={styles.chooseFileBtn} onPress={pickFile}>
              <Text style={styles.chooseFileText}>Choose file</Text>
            </TouchableOpacity>
            <Text style={styles.fileNameText} numberOfLines={1}>{file ? file.name : "No file chosen"}</Text>
          </View>

          <View style={styles.dropdownsRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={styles.labelText}>PROGRAM *</Text>
              <TouchableOpacity style={styles.dropdown} onPress={() => setShowProgramInfo(true)}>
                <Text style={selectedProgram ? styles.dropdownText : styles.dropdownPlaceholder} numberOfLines={1}>
                  {selectedProgram ? selectedProgram.name : "Select program..."}
                </Text>
                <ChevronDown size={16} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.labelText}>COURSE *</Text>
              <TouchableOpacity style={styles.dropdown} onPress={() => setShowCourseInfo(true)}>
                <Text style={selectedCourse ? styles.dropdownText : styles.dropdownPlaceholder} numberOfLines={1}>
                  {selectedCourse ? selectedCourse.name : "Select course..."}
                </Text>
                <ChevronDown size={16} color="#94A3B8" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.importFooter}>
            <Text style={styles.importInfoText}>Newly imported students will receive login credentials via email.</Text>
            <TouchableOpacity style={[styles.submitBtn, (!file || !selectedCourse || !selectedProgram) && styles.submitBtnDisabled]}
              disabled={!file || !selectedCourse || !selectedProgram || isImporting} onPress={importStudents}>
              {isImporting ? <ActivityIndicator color="#FFF" size="small" /> : (
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <FileUp size={14} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.submitBtnText}>Import Students</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search & Filter */}
        <View style={styles.searchFilterRow}>
          <View style={styles.searchBar}>
            <Search size={14} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput style={styles.searchInput} placeholder="Search by name, email, or program..."
              placeholderTextColor="#94A3B8" value={search} onChangeText={setSearch} />
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilterInfo(true)}>
            <Text style={styles.filterBtnText} numberOfLines={1}>{filterCourse ? filterCourse.name : "All Courses"}</Text>
            <ChevronDown size={14} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Directory Table */}
        <View style={styles.tableCard}>
          <Text style={styles.tableTitle}>Student Directory</Text>
          <Text style={styles.tableSubtitle}>{students.length} student{students.length !== 1 ? "s" : ""}</Text>

          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>STUDENT</Text>
            <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>PROGRAM</Text>
            <Text style={[styles.tableHeaderText, { flex: 0.7, textAlign: "center" }]}>COURSES</Text>
            <Text style={[styles.tableHeaderText, { flex: 0.9, textAlign: "center" }]}>ATTEND.</Text>
            <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "center" }]}>FACE DATA</Text>
          </View>

          {isLoading ? (
             <ActivityIndicator size="large" color={Theme.colors.accent} style={{ marginVertical: 40 }} />
          ) : filteredStudents.length === 0 ? (
            <Text style={styles.emptyText}>No students found.</Text>
          ) : (
            filteredStudents.map((s, i) => (
              <TouchableOpacity key={i} style={[styles.tableRow, i < filteredStudents.length - 1 && styles.tableBorder]} onPress={() => setSelectedStudent(s)}>
                <View style={{ flex: 2, paddingRight: 5 }}>
                  <Text style={styles.studentName} numberOfLines={2}>{s.name}</Text>
                  <Text style={styles.studentEmail} numberOfLines={1}>{s.email}</Text>
                </View>
                <Text style={[styles.cellText, { flex: 1.5, paddingRight: 4, fontSize: 10 }]} numberOfLines={2}>{s.program}</Text>
                <Text style={[styles.cellText, { flex: 0.7, textAlign: "center", fontWeight: "700" }]}>{s.coursesCount}</Text>
                <Text style={[styles.cellText, { flex: 0.9, textAlign: "center", fontWeight: "700" }]}>{s.attendance}</Text>
                <View style={{ flex: 1, alignItems: "center" }}>
                  {s.faceRegistered ? (
                    <View style={styles.faceYes}>
                      <CheckCircle size={11} color="#059669" style={{ marginRight: 2 }} />
                      <Text style={[styles.faceText, { color: "#059669" }]}>Registered</Text>
                    </View>
                  ) : (
                    <View style={styles.faceNo}>
                      <Text style={[styles.faceText, { color: "#94A3B8" }]}>Pending</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

      </ScrollView>

      {/* Program Modal */}
      <Modal visible={showProgramInfo} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
             <Text style={styles.modalTitle}>Select Program</Text>
             <ScrollView style={{ maxHeight: 400 }}>
               {programs.map(p => (
                 <TouchableOpacity key={p.id} style={styles.modalItem} onPress={() => { setSelectedProgram(p); setSelectedCourse(null); setShowProgramInfo(false); }}>
                   <Text style={styles.modalItemText}>{p.name}</Text>
                 </TouchableOpacity>
               ))}
             </ScrollView>
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
             <ScrollView style={{ maxHeight: 400 }}>
               {courses.filter(c => !selectedProgram || c.semester?.academicYear?.program?.id === selectedProgram.id).map(c => (
                 <TouchableOpacity key={c.id} style={styles.modalItem} onPress={() => { setSelectedCourse(c); setShowCourseInfo(false); }}>
                   <Text style={styles.modalItemText}>{c.name}</Text>
                 </TouchableOpacity>
               ))}
             </ScrollView>
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
              <ScrollView style={{ maxHeight: 400 }}>
                {courses.map(c => (
                  <TouchableOpacity key={c.id} style={styles.modalItem} onPress={() => { setFilterCourse(c); setShowFilterInfo(false); }}>
                    <Text style={styles.modalItemText}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
             <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowFilterInfo(false)}>
               <Text style={styles.modalCloseText}>Cancel</Text>
             </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Student Details Modal */}
      <Modal visible={!!selectedStudent} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={styles.modalDetailCard}>
              {selectedStudent && (
                <>
                  <View style={styles.modalHeaderInfoSection}>
                    <View style={styles.modalAvatar}>
                      <User size={22} color={Theme.colors.primaryDark} />
                    </View>
                    <View style={styles.modalHeaderInfo}>
                      <Text style={styles.modalName}>{selectedStudent.name}</Text>
                      <Text style={styles.modalEmail}>{selectedStudent.email}</Text>
                    </View>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Program:</Text>
                    <Text style={styles.modalDetailValue}>{selectedStudent.program}</Text>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Department:</Text>
                    <Text style={styles.modalDetailValue}>{selectedStudent.department}</Text>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Status:</Text>
                    <Text style={[styles.modalDetailValue, { color: selectedStudent.status === "graduated" ? "#10B981" : Theme.colors.accent }]}>
                       {(selectedStudent.status || "active").toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Face Data:</Text>
                    <View style={{ flex: 0.6, flexDirection: "row", justifyContent: "flex-end", alignItems: "center" }}>
                      {selectedStudent.faceRegistered ? (
                        <>
                          <CheckCircle size={14} color="#10B981" style={{ marginRight: 4 }} />
                          <Text style={[styles.modalDetailValue, { color: "#10B981", flex: 0 }]}>Registered</Text>
                        </>
                      ) : (
                        <>
                          <XCircle size={14} color="#EF4444" style={{ marginRight: 4 }} />
                          <Text style={[styles.modalDetailValue, { color: "#EF4444", flex: 0 }]}>Not Registered</Text>
                        </>
                      )}
                    </View>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Courses:</Text>
                    <Text style={styles.modalDetailValue}>{selectedStudent.coursesCount} Enrolled</Text>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Attendance:</Text>
                    <Text style={styles.modalDetailValue}>{selectedStudent.attendance} Total</Text>
                  </View>

                  <TouchableOpacity style={styles.modalDetailCloseBtn} onPress={() => setSelectedStudent(null)}>
                    <Text style={styles.modalDetailCloseBtnText}>Close</Text>
                  </TouchableOpacity>
                </>
              )}
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
  header: { marginBottom: 18, marginTop: 8 },
  title: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 13, color: "#64748B", marginTop: 3 },

  // Stats Row
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  statCard: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statLabel: { fontSize: 8, fontWeight: "700", color: "#94A3B8", letterSpacing: 0.5, marginBottom: 8 },
  statBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statNumber: { fontSize: 24, fontWeight: "800", color: "#0F172A" },
  statIconBg: { width: 32, height: 32, borderRadius: 8, backgroundColor: Theme.colors.primaryDark, justifyContent: "center", alignItems: "center" },

  // Import Section
  sectionCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  importHeader: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  importIconBadge: { width: 40, height: 40, borderRadius: 10, backgroundColor: Theme.colors.primaryDark, justifyContent: "center", alignItems: "center", marginRight: 12 },
  importTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  importDesc: { fontSize: 12, color: "#64748B", marginTop: 2 },
  
  labelText: { fontSize: 10, fontWeight: "700", color: "#64748B", letterSpacing: 0.5, marginBottom: 6 },
  
  fileRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 10, borderWidth: 1, borderColor: "#E2E8F0", paddingLeft: 4, paddingRight: 14, paddingVertical: 4, marginBottom: 16 },
  chooseFileBtn: { backgroundColor: "#F1F5F9", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginRight: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  chooseFileText: { color: "#475569", fontSize: 12, fontWeight: "600" },
  fileNameText: { fontSize: 13, color: "#94A3B8", flex: 1 },

  dropdownsRow: { flexDirection: "row", marginBottom: 16 },
  dropdown: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#FFF", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  dropdownPlaceholder: { fontSize: 13, color: "#94A3B8", flex: 1 },
  dropdownText: { fontSize: 13, color: "#1E293B", flex: 1 },
  
  importFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4, borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 16 },
  importInfoText: { fontSize: 11, color: "#94A3B8", flex: 1, paddingRight: 10 },
  submitBtn: { backgroundColor: Theme.colors.primaryDark, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: "#FFF", fontSize: 13, fontWeight: "700" },

  // Search & Filter
  searchFilterRow: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  searchBar: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: "#E2E8F0", marginRight: 10 },
  searchInput: { flex: 1, fontSize: 13, color: "#1E293B", padding: 0 },
  filterBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: "#E2E8F0" },
  filterBtnText: { fontSize: 12, color: "#1E293B", fontWeight: "600", marginRight: 4, maxWidth: 100 },

  // Table
  tableCard: { backgroundColor: "#FFF", borderRadius: 14, padding: 16, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 20 },
  tableTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  tableSubtitle: { fontSize: 12, color: "#94A3B8", marginTop: 2, marginBottom: 14 },
  tableHeaderRow: { flexDirection: "row", paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#F1F5F9", marginBottom: 4 },
  tableHeaderText: { fontSize: 9, fontWeight: "700", color: "#94A3B8", letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  tableBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  studentName: { fontSize: 12, fontWeight: "700", color: "#1E293B", marginBottom: 1 },
  studentEmail: { fontSize: 10, color: "#94A3B8" },
  cellText: { fontSize: 11, color: "#64748B" },
  faceYes: { flexDirection: "row", alignItems: "center", backgroundColor: "#F0FDF4", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 10 },
  faceNo: { backgroundColor: "#F8FAFC", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 10, borderWidth: 1, borderColor: "#E2E8F0" },
  faceText: { fontSize: 9, fontWeight: "700" },
  emptyText: { fontSize: 13, color: "#94A3B8", textAlign: "center", paddingVertical: 20 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: "#FFF", borderRadius: 16, padding: 20, maxHeight: "80%" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1E293B", marginBottom: 16 },
  modalItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  modalItemText: { fontSize: 15, color: "#334155" },
  modalCloseBtn: { marginTop: 20, backgroundColor: "#F1F5F9", padding: 14, borderRadius: 12, alignItems: "center" },
  modalCloseText: { fontSize: 15, fontWeight: "600", color: "#64748B" },

  // Student Details Modal
  modalDetailCard: { backgroundColor: "#FFF", borderRadius: 20, padding: 24, width: "100%", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  modalHeaderInfoSection: { flexDirection: "row", alignItems: "center", marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  modalAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: Theme.colors.accentLight, justifyContent: "center", alignItems: "center", marginRight: 14 },
  modalHeaderInfo: { flex: 1 },
  modalName: { fontSize: 18, fontWeight: "800", color: "#1E293B", marginBottom: 4 },
  modalEmail: { fontSize: 13, color: "#64748B" },
  modalDetailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  modalDetailLabel: { fontSize: 13, fontWeight: "600", color: "#94A3B8", flex: 0.4 },
  modalDetailValue: { fontSize: 14, fontWeight: "700", color: "#1E293B", flex: 0.6, textAlign: "right" },
  modalDetailCloseBtn: { backgroundColor: "#F1F5F9", paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 10 },
  modalDetailCloseBtnText: { fontSize: 15, fontWeight: "700", color: "#475569" },
});