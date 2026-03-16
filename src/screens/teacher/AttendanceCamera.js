import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, ActivityIndicator, TextInput, Dimensions, Alert
} from "react-native";
import { getTeacherCourses, getCourseStudents } from "../../api/teacherApi";
import { launchCamera } from "react-native-image-picker";
import { useFocusEffect } from "@react-navigation/native";
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
        const list = Array.isArray(data) ? data : [];
        setCourses(list.map((c) => ({
          id: c.id, name: c.name, code: c.code || "",
          program: c.semester?.academicYear?.program?.name || "",
          department: c.semester?.academicYear?.program?.department?.name || "",
          semester: c.semester?.name || "",
          year: c.semester?.academicYear?.name || "",
          students: c._count?.students || 0,
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
        photoCount: s.photoCount || 3,
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
      const res = await fetch(`${API_BASE_URL}/api/train`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: selectedCourse.id }),
      });
      Alert.alert("✅ Training Started", "Model training has been initiated for all untrained students.");
    } catch (e) {
      Alert.alert("Error", "Failed to start training.");
    } finally { setIsTraining(false); }
  };

  const captureAttendance = () => {
    launchCamera({ mediaType: "photo", quality: 0.8 }, async (res) => {
      if (res.assets) {
        const image = res.assets[0];
        const formData = new FormData();
        formData.append("file", { uri: image.uri, type: image.type, name: image.fileName });
        formData.append("courseId", selectedCourse.id);
        try {
          const token = await getToken();
          await fetch(`${API_BASE_URL}/api/recognize`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${token}` },
            body: formData,
          });
          Alert.alert("✅ Attendance Captured", "Photo has been processed for face recognition.");
        } catch (e) {
          Alert.alert("Error", "Failed to process attendance.");
        }
      }
    });
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
            <View style={[styles.headerBadge, { backgroundColor: "#0F172A" }]}>
              <Text style={{ fontSize: 18 }}>📸</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Attendance Management</Text>
              <Text style={styles.subtitle}>Search and select your course to get started.</Text>
            </View>
          </View>

          {/* Select Course Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={{ fontSize: 14 }}>📚</Text>
              <Text style={styles.sectionHeaderText}>Select Course</Text>
            </View>

            <View style={styles.searchBar}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput style={styles.searchInput}
                placeholder="Search by course name, code, department, program..."
                placeholderTextColor="#94A3B8" value={search} onChangeText={setSearch} />
            </View>

            {/* Mini stats */}
            <View style={styles.miniStatsRow}>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatLabel}>Total Courses</Text>
                <Text style={styles.miniStatNumber}>{courses.length}</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatLabel}>Departments</Text>
                <Text style={styles.miniStatNumber}>{new Set(courses.map(c => c.department).filter(Boolean)).size}</Text>
              </View>
            </View>

            {isLoading ? (
              <ActivityIndicator size="small" color="#4361EE" style={{ marginVertical: 20 }} />
            ) : (
              filteredCourses.map((c) => (
                <TouchableOpacity key={c.id} style={styles.courseItem} onPress={() => selectCourse(c)}>
                  <Text style={styles.courseItemName}>{c.name}</Text>
                  <Text style={styles.courseItemMeta}>{c.department} · {c.year}{c.semester ? ` · ${c.semester}` : ""}</Text>
                  <Text style={styles.courseItemMeta}>{c.code} · {c.students} students</Text>
                </TouchableOpacity>
              ))
            )}
          </View>

          {/* How AI Attendance Works */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={{ fontSize: 14 }}>⚡</Text>
              <Text style={styles.sectionHeaderText}>How AI Attendance Works</Text>
            </View>
            {[
              "1. Search for your course using the smart search bar",
              "2. Select from results — courses appear instantly as you type",
              "3. Ensure students have uploaded photos so the model can recognize them",
              "4. Click Train Model to generate or update face embeddings",
              "5. Once trained, use Capture Attendance to start a live recognition session",
            ].map((s, i) => <Text key={i} style={styles.guideStep}>{s}</Text>)}
            <View style={styles.proTipBar}>
              <Text style={styles.proTipText}>💡 Pro Tip: You can search by course code (e.g. IT-701), course name, department, or any combination!</Text>
            </View>
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
          <View style={[styles.headerBadge, { backgroundColor: "#0F172A" }]}>
            <Text style={{ fontSize: 18 }}>📸</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Attendance Management</Text>
            <Text style={styles.subtitle}>Managing: {selectedCourse.name}</Text>
          </View>
          <TouchableOpacity style={styles.backBtn} onPress={() => { setSelectedCourse(null); setStudents([]); }}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        {isLoadingStudents ? (
          <ActivityIndicator size="small" color="#4361EE" style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: "#FEF3C7" }]}>
              <Text style={styles.statLabel}>TOTAL STUDENTS</Text>
              <View style={styles.statRow}>
                <Text style={[styles.statNumber, { color: "#F59E0B" }]}>{students.length}</Text>
                <View style={[styles.statIconBg, { backgroundColor: "#F59E0B" }]}><Text style={{ fontSize: 16 }}>👨‍🎓</Text></View>
              </View>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#D1FAE5" }]}>
              <Text style={styles.statLabel}>TRAINED</Text>
              <View style={styles.statRow}>
                <Text style={[styles.statNumber, { color: "#10B981" }]}>{trained}</Text>
                <View style={[styles.statIconBg, { backgroundColor: "#10B981" }]}><Text style={{ fontSize: 16 }}>✅</Text></View>
              </View>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#DBEAFE" }]}>
              <Text style={styles.statLabel}>HAVE PHOTOS</Text>
              <View style={styles.statRow}>
                <Text style={[styles.statNumber, { color: "#3B82F6" }]}>{withPhotos}</Text>
                <View style={[styles.statIconBg, { backgroundColor: "#3B82F6" }]}><Text style={{ fontSize: 16 }}>📸</Text></View>
              </View>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#FCE7F3" }]}>
              <Text style={styles.statLabel}>NOT TRAINED</Text>
              <View style={styles.statRow}>
                <Text style={[styles.statNumber, { color: "#EC4899" }]}>{notTrained}</Text>
                <View style={[styles.statIconBg, { backgroundColor: "#EC4899" }]}><Text style={{ fontSize: 16 }}>⚠️</Text></View>
              </View>
            </View>
          </View>
        )}

        {/* Attendance Actions */}
        <Text style={styles.sectionTitle}>Attendance Actions</Text>
        <View style={styles.actionsCard}>
          <TouchableOpacity style={styles.actionRow} onPress={trainModel} disabled={isTraining}>
            <View style={[styles.actionDot, { backgroundColor: "#10B981" }]} />
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>{isTraining ? "Training..." : "Train Model"}</Text>
              <Text style={styles.actionDesc}>Prepare or update embeddings for all untrained students</Text>
            </View>
          </TouchableOpacity>
          <View style={{ height: 1, backgroundColor: "#F1F5F9" }} />
          <TouchableOpacity style={styles.actionRow} onPress={captureAttendance}>
            <View style={[styles.actionDot, { backgroundColor: "#4361EE" }]} />
            <View style={styles.actionInfo}>
              <Text style={styles.actionTitle}>Capture Attendance</Text>
              <Text style={styles.actionDesc}>Open the camera-based recognition screen for this course</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Student Training Status + Next Steps */}
        <View style={styles.bottomRow}>
          {/* Student Training Table */}
          <View style={[styles.sectionCard, { flex: 1 }]}>
            <View style={styles.sectionHeaderRow}>
              <Text style={{ fontSize: 14 }}>👁‍🗨</Text>
              <Text style={styles.sectionHeaderText}>Student Training Status</Text>
            </View>

            {/* Table Header */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderText, { width: 24 }]}>#</Text>
              <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>Student</Text>
              <Text style={[styles.tableHeaderText, { flex: 1 }]}>Photos</Text>
              <Text style={[styles.tableHeaderText, { flex: 0.8 }]}>Status</Text>
            </View>

            {students.length === 0 ? (
              <Text style={styles.emptyText}>No students enrolled.</Text>
            ) : (
              students.map((s, i) => (
                <View key={s.id} style={[styles.tableRow, i < students.length - 1 && styles.tableBorder]}>
                  <Text style={[styles.cellText, { width: 24, color: "#94A3B8" }]}>{i + 1}</Text>
                  <View style={{ flex: 1.5 }}>
                    <Text style={styles.studentName} numberOfLines={1}>{s.name}</Text>
                    <Text style={styles.studentEmail} numberOfLines={1}>{s.email}</Text>
                  </View>
                  <View style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
                    <View style={[styles.photoBadge, s.hasPhotos ? styles.photoYes : styles.photoNo]}>
                      <Text style={{ fontSize: 10 }}>{s.hasPhotos ? "✅ Available" : "—"}</Text>
                    </View>
                  </View>
                  <View style={{ flex: 0.8, alignItems: "center" }}>
                    <View style={[styles.statusBadge, s.trained ? styles.trainedYes : styles.trainedNo]}>
                      <Text style={[styles.statusBadgeText, s.trained ? { color: "#059669" } : { color: "#DC2626" }]}>
                        {s.trained ? "Trained" : "Pending"}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Next Steps */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={{ fontSize: 14 }}>📋</Text>
            <Text style={styles.sectionHeaderText}>Next Steps</Text>
          </View>
          {[
            '1. Use the "Capture Attendance" action to start a live session',
            "2. Ask students to look at the camera for accurate detection",
            "3. Review your attendance reports from the Reports section",
          ].map((s, i) => <Text key={i} style={styles.guideStep}>{s}</Text>)}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 18, marginTop: 8 },
  headerBadge: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 14 },
  title: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 12, color: "#64748B", marginTop: 2 },
  backBtn: { backgroundColor: "#F1F5F9", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  backBtnText: { fontSize: 12, fontWeight: "700", color: "#64748B" },

  sectionCard: { backgroundColor: "#FFF", borderRadius: 14, padding: 18, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  sectionHeaderText: { fontSize: 15, fontWeight: "700", color: "#1E293B", marginLeft: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B", marginBottom: 10 },

  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 12 },
  searchIcon: { fontSize: 14, marginRight: 6 },
  searchInput: { flex: 1, fontSize: 13, color: "#1E293B", padding: 0 },

  miniStatsRow: { flexDirection: "row", marginBottom: 12 },
  miniStat: { flex: 1, backgroundColor: "#F8FAFC", borderRadius: 10, padding: 12, marginRight: 8 },
  miniStatLabel: { fontSize: 10, fontWeight: "600", color: "#94A3B8", marginBottom: 4 },
  miniStatNumber: { fontSize: 20, fontWeight: "800", color: "#1E293B" },

  courseItem: { borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, padding: 14, marginBottom: 8 },
  courseItemName: { fontSize: 14, fontWeight: "700", color: "#1E293B", marginBottom: 2 },
  courseItemMeta: { fontSize: 12, color: "#64748B" },

  guideStep: { fontSize: 13, color: "#475569", lineHeight: 22, marginBottom: 2 },
  proTipBar: { backgroundColor: "#EEF2FF", borderRadius: 8, padding: 10, marginTop: 12 },
  proTipText: { fontSize: 12, color: "#4361EE", fontWeight: "600" },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 20 },
  statCard: { width: (width - 52) / 2, borderRadius: 14, padding: 14, marginBottom: 10 },
  statLabel: { fontSize: 9, fontWeight: "700", color: "#64748B", letterSpacing: 0.5, marginBottom: 6 },
  statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statNumber: { fontSize: 24, fontWeight: "800" },
  statIconBg: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },

  actionsCard: { backgroundColor: "#FFF", borderRadius: 14, padding: 6, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  actionRow: { flexDirection: "row", alignItems: "center", padding: 14 },
  actionDot: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", marginRight: 14 },
  actionInfo: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: "700", color: "#1E293B", marginBottom: 2 },
  actionDesc: { fontSize: 12, color: "#64748B" },

  bottomRow: { marginBottom: 16 },
  tableHeaderRow: { flexDirection: "row", paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#F1F5F9", marginBottom: 4 },
  tableHeaderText: { fontSize: 10, fontWeight: "700", color: "#94A3B8", letterSpacing: 0.3 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  tableBorder: { borderBottomWidth: 1, borderBottomColor: "#F8FAFC" },
  cellText: { fontSize: 12 },
  studentName: { fontSize: 12, fontWeight: "700", color: "#1E293B" },
  studentEmail: { fontSize: 10, color: "#94A3B8" },
  photoBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  photoYes: { backgroundColor: "#D1FAE5" },
  photoNo: { backgroundColor: "#F1F5F9" },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  trainedYes: { backgroundColor: "#D1FAE5" },
  trainedNo: { backgroundColor: "#FEE2E2" },
  statusBadgeText: { fontSize: 10, fontWeight: "700" },
  emptyText: { fontSize: 13, color: "#94A3B8", textAlign: "center", paddingVertical: 16 },
});