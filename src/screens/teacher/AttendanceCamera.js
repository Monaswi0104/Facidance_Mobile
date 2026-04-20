import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, ActivityIndicator, TextInput, Dimensions, Alert
} from "react-native";
import { getTeacherCourses, getCourseStudents } from "../../api/teacherApi";
import { useFocusEffect } from "@react-navigation/native";
import { Theme } from "../../theme/Theme";
import { Search, BookOpen, Users, ScanFace, Camera, AlertCircle, Cpu, CheckCircle, XCircle, ArrowLeft, RefreshCw, Info } from "lucide-react-native";
import { BASE_URL } from "../../api/config";
import { getToken } from "../../api/authStorage";

const { width } = Dimensions.get("window");

export default function AttendanceCamera({ navigation }) {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [search, setSearch] = useState("");
  const [isTraining, setIsTraining] = useState(false);

  useFocusEffect(useCallback(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const data = await getTeacherCourses();
        const list = Array.isArray(data) ? data : (data?.courses || []);
        setCourses(list.map((c) => ({
          id: c.id, 
          name: c.name || c.course_name || "Untitled", 
          code: c.code || c.course_code || "",
          program: c.semester?.academicYear?.program?.name || c.program_name || c.program || "",
          department: c.semester?.academicYear?.program?.department?.name || c.department_name || c.department || "",
          semester: c.semester?.name || c.semester_name || "",
          year: c.semester?.academicYear?.name || c.academic_year || c.year || "",
          students: c._count?.students || c.student_count || c.students_count || c.total_students || 0,
        })));
      } catch (e) { console.log(e); }
      finally { setIsLoading(false); }
    };
    load();
  }, []));

  const loadStudents = async (courseId) => {
    try {
      setIsLoadingStudents(true);
      const data = await getCourseStudents(courseId);
      const list = Array.isArray(data) ? data : [];
      setStudents(list.map((s) => ({
        id: s.id,
        name: s.user?.name || "Student",
        email: s.user?.email || "—",
        hasPhotos: !!s.faceEmbedding || s.photosUploaded || false,
        trained: !!s.faceEmbedding,
        photoCount: s.photoCount || 0,
      })));
    } catch (e) { console.log(e); }
    finally { setIsLoadingStudents(false); }
  };

  const selectCourse = (course) => {
    setSelectedCourse(course);
    loadStudents(course.id);
  };

  const filteredCourses = courses.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) ||
      c.department.toLowerCase().includes(q) || c.program.toLowerCase().includes(q);
  });

  const trainModel = async () => {
    try {
      setIsTraining(true);
      const token = await getToken();
      const res = await fetch(`${BASE_URL}/api/train`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: selectedCourse.id }),
      });
      Alert.alert("Training Started", "Model training has been initiated for all students.");
    } catch (e) {
      Alert.alert("Error", "Failed to start training.");
    } finally { setIsTraining(false); }
  };

  const trained = students.filter((s) => s.trained).length;
  const withPhotos = students.filter((s) => s.hasPhotos).length;
  const notTrained = students.length - trained;

  /* ═══════════════════════════════════════════════════════ */
  /* Phase 1: Course Selection                               */
  /* ═══════════════════════════════════════════════════════ */
  if (!selectedCourse) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Attendance Management</Text>
            <Text style={styles.subtitle}>Select a course, train the face recognition model, then capture live attendance.</Text>
          </View>

          {/* Select Course Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconBg}>
                <BookOpen size={16} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionHeaderText}>Select Course</Text>
                <Text style={styles.sectionSubText}>{courses.length} course{courses.length !== 1 ? "s" : ""} available — search to filter</Text>
              </View>
            </View>

            <View style={styles.searchBar}>
              <Search size={14} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput style={styles.searchInput}
                placeholder="Search by course name, department, program, or semester..."
                placeholderTextColor="#94A3B8" value={search} onChangeText={setSearch} />
            </View>

            {isLoading ? (
              <ActivityIndicator size="small" color={Theme.colors.accent} style={{ marginVertical: 20 }} />
            ) : filteredCourses.length === 0 ? (
              <Text style={styles.emptyText}>No courses found.</Text>
            ) : (
              filteredCourses.map((c) => (
                <TouchableOpacity key={c.id} style={styles.courseItem} onPress={() => selectCourse(c)} activeOpacity={0.7}>
                  <Text style={styles.courseItemName}>{c.name}</Text>
                  <Text style={styles.courseItemMeta}>{c.department} → {c.program} → {c.year}{c.semester ? ` → ${c.semester}` : ""}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ═══════════════════════════════════════════════════════ */
  /* Phase 2: Attendance Management (after course selected)  */
  /* ═══════════════════════════════════════════════════════ */
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Attendance Management</Text>
          <Text style={styles.subtitle}>Select a course, train the face recognition model, then capture live attendance.</Text>
        </View>

        {/* Selected Course Banner */}
        <View style={styles.selectedBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.selectedLabel}>SELECTED COURSE</Text>
            <Text style={styles.selectedName}>{selectedCourse.name}</Text>
            <Text style={styles.selectedMeta} numberOfLines={2}>{selectedCourse.department} → {selectedCourse.program} → {selectedCourse.year}{selectedCourse.semester ? ` → ${selectedCourse.semester}` : ""}</Text>
          </View>
          <TouchableOpacity style={styles.changeCourseBtn} onPress={() => { setSelectedCourse(null); setStudents([]); }}>
            <Text style={styles.changeCourseBtnText}>Change{"\n"}course</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        {isLoadingStudents ? (
          <ActivityIndicator size="small" color={Theme.colors.accent} style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={styles.statTopRow}>
                <Text style={styles.statLabel}>STUDENTS</Text>
                <View style={styles.statIconBg}><Users size={14} color="#FFF" /></View>
              </View>
              <Text style={styles.statNumber}>{students.length}</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statTopRow}>
                <Text style={styles.statLabel}>TRAINED</Text>
                <View style={styles.statIconBg}><ScanFace size={14} color="#FFF" /></View>
              </View>
              <Text style={[styles.statNumber, { color: Theme.colors.accent }]}>{trained}</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statTopRow}>
                <Text style={styles.statLabel}>PHOTOS</Text>
                <View style={styles.statIconBg}><Camera size={14} color="#FFF" /></View>
              </View>
              <Text style={styles.statNumber}>{withPhotos}</Text>
            </View>
            <View style={styles.statCard}>
              <View style={styles.statTopRow}>
                <Text style={styles.statLabel}>UNTRAINED</Text>
                <View style={styles.statIconBg}><AlertCircle size={14} color="#FFF" /></View>
              </View>
              <Text style={[styles.statNumber, { color: "#EF4444" }]}>{notTrained}</Text>
            </View>
          </View>
        )}

        {/* Train Model Action */}
        <TouchableOpacity
          style={[styles.trainBtn, isTraining && { opacity: 0.6 }]}
          onPress={trainModel}
          disabled={isTraining}
          activeOpacity={0.8}>
          {isTraining ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Cpu size={16} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.trainBtnText}>Train Recognition Model</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Enrolled Students Table */}
        <View style={styles.tableCard}>
          <Text style={styles.tableTitle}>Enrolled Students</Text>
          <Text style={styles.tableSubtitle}>{students.length} total enrolled</Text>

          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>STUDENT</Text>
            <Text style={[styles.tableHeaderText, { flex: 0.8, textAlign: "center" }]}>PHOTOS</Text>
            <Text style={[styles.tableHeaderText, { flex: 0.8, textAlign: "center" }]}>COUNT</Text>
            <Text style={[styles.tableHeaderText, { flex: 0.9, textAlign: "center" }]}>STATUS</Text>
          </View>

          {students.length === 0 ? (
            <Text style={styles.emptyText}>No students enrolled.</Text>
          ) : (
            students.map((s, i) => (
              <View key={s.id} style={[styles.tableRow, i < students.length - 1 && styles.tableBorder]}>
                <View style={{ flex: 2, paddingRight: 6 }}>
                  <Text style={styles.studentName} numberOfLines={1}>{s.name}</Text>
                  <Text style={styles.studentEmail} numberOfLines={1}>{s.email}</Text>
                </View>
                <View style={{ flex: 0.8, alignItems: "center" }}>
                  {s.hasPhotos ? (
                    <View style={styles.photoAvailable}>
                      <CheckCircle size={11} color="#059669" style={{ marginRight: 2 }} />
                      <Text style={[styles.badgeText, { color: "#059669" }]}>Available</Text>
                    </View>
                  ) : (
                    <View style={styles.photoMissing}>
                      <XCircle size={11} color="#EF4444" style={{ marginRight: 2 }} />
                      <Text style={[styles.badgeText, { color: "#EF4444" }]}>Missing</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.cellNum, { flex: 0.8 }]}>{s.photoCount}</Text>
                <View style={{ flex: 0.9, alignItems: "center" }}>
                  {s.trained ? (
                    <View style={styles.trainedBadge}>
                      <CheckCircle size={11} color="#059669" style={{ marginRight: 2 }} />
                      <Text style={[styles.badgeText, { color: "#059669" }]}>Trained</Text>
                    </View>
                  ) : (
                    <View style={styles.pendingBadge}>
                      <Text style={[styles.badgeText, { color: "#94A3B8" }]}>Pending</Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
            <Info size={14} color={Theme.colors.accent} style={{ marginRight: 6 }} />
            <Text style={styles.infoTitle}>How cumulative attendance works</Text>
          </View>
          <Text style={styles.infoStep}>• Face recognition runs centrally via CCTV/webcam</Text>
          <Text style={styles.infoStep}>• Auto-captures every 2 minutes thereafter</Text>
          <Text style={styles.infoStep}>• Once recognized, students stay marked present</Text>
          <Text style={styles.infoStep}>• Submit at end to save the session record</Text>
          <View style={styles.infoHighlight}>
            <Text style={styles.infoHighlightText}>Students only need to be detected once — no need to stay in frame!</Text>
          </View>
        </View>

      </ScrollView>
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

  // Section Card
  sectionCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  sectionIconBg: { width: 36, height: 36, borderRadius: 10, backgroundColor: Theme.colors.primaryDark, justifyContent: "center", alignItems: "center", marginRight: 12 },
  sectionHeaderText: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  sectionSubText: { fontSize: 11, color: "#94A3B8", marginTop: 1 },

  // Search
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 13, color: "#1E293B", padding: 0 },

  // Course Items
  courseItem: { borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, padding: 14, marginBottom: 8 },
  courseItemName: { fontSize: 14, fontWeight: "700", color: "#1E293B", marginBottom: 3 },
  courseItemMeta: { fontSize: 11, color: "#64748B" },

  // Selected Course Banner
  selectedBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderLeftWidth: 4,
    borderLeftColor: Theme.colors.accent,
  },
  selectedLabel: { fontSize: 9, fontWeight: "700", color: Theme.colors.accent, letterSpacing: 0.5, marginBottom: 3 },
  selectedName: { fontSize: 17, fontWeight: "800", color: "#0F172A", marginBottom: 2 },
  selectedMeta: { fontSize: 11, color: "#64748B" },
  changeCourseBtn: { backgroundColor: "#F1F5F9", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center" },
  changeCourseBtnText: { fontSize: 11, fontWeight: "600", color: "#475569", textAlign: "center" },

  // Stats
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  statLabel: { fontSize: 7, fontWeight: "700", color: "#94A3B8", letterSpacing: 0.4, flex: 1, marginRight: 6 },
  statNumber: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  statIconBg: { width: 26, height: 26, borderRadius: 7, backgroundColor: Theme.colors.primaryDark, justifyContent: "center", alignItems: "center" },

  // Train Button
  trainBtn: {
    flexDirection: "row",
    backgroundColor: Theme.colors.primaryDark,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  trainBtnText: { color: "#FFF", fontSize: 14, fontWeight: "700" },

  // Table
  tableCard: { backgroundColor: "#FFF", borderRadius: 14, padding: 16, marginBottom: 16, shadowColor: "#0F172A", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1, borderWidth: 1, borderColor: "#E2E8F0" },
  tableTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  tableSubtitle: { fontSize: 12, color: "#94A3B8", marginTop: 2, marginBottom: 14 },
  tableHeaderRow: { flexDirection: "row", paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#F1F5F9", marginBottom: 4 },
  tableHeaderText: { fontSize: 9, fontWeight: "700", color: "#94A3B8", letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  tableBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  studentName: { fontSize: 12, fontWeight: "700", color: "#1E293B", marginBottom: 1 },
  studentEmail: { fontSize: 10, color: "#94A3B8" },
  cellNum: { fontSize: 13, fontWeight: "600", color: "#475569", textAlign: "center" },

  // Badges
  photoAvailable: { flexDirection: "row", alignItems: "center" },
  photoMissing: { flexDirection: "row", alignItems: "center" },
  trainedBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#F0FDF4", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8 },
  pendingBadge: { backgroundColor: "#F8FAFC", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: "#E2E8F0" },
  badgeText: { fontSize: 9, fontWeight: "700" },

  // Info
  infoCard: { backgroundColor: "#FFF", borderRadius: 14, padding: 18, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 16 },
  infoTitle: { fontSize: 14, fontWeight: "700", color: "#1E293B" },
  infoStep: { fontSize: 12, color: "#64748B", lineHeight: 20, marginBottom: 2 },
  infoHighlight: { backgroundColor: "#FEF3C7", borderRadius: 8, padding: 10, marginTop: 10 },
  infoHighlightText: { fontSize: 11, color: "#92400E", fontWeight: "600" },

  emptyText: { fontSize: 13, color: "#94A3B8", textAlign: "center", paddingVertical: 16 },
});