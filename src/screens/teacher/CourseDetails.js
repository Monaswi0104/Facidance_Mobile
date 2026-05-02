import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, ActivityIndicator, Dimensions, TextInput, Modal
} from "react-native";
import { getCourseDetails } from "../../api/teacherApi";
import { useFocusEffect } from "@react-navigation/native";
import { Theme, useTheme } from "../../theme/Theme";
import { BookOpen, Building, Calendar, Search, Download, Users, ScanFace, Clock, TrendingUp, CheckCircle, XCircle, User, ChevronLeft } from "lucide-react-native";
import RNFS from "react-native-fs";
import Share from "react-native-share";

const { width } = Dimensions.get("window");

export default function CourseDetails({ route, navigation }) {
  const { colors, isDark } = useTheme();
  const { course } = route.params;
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [totalSessions, setTotalSessions] = useState(course.sessions || 0);
  const [selectedStudent, setSelectedStudent] = useState(null);

  useFocusEffect(useCallback(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const detailData = await getCourseDetails(course.id);
        console.log("[CourseDetails] detailData:", JSON.stringify(detailData));

        // Handle both {students: [...]} and direct array response
        const studentList = detailData?.students || (Array.isArray(detailData) ? detailData : []);
        const fetchedTotalSessions = detailData?.session_count || detailData?._count?.attendance || course.sessions || 0;
        setTotalSessions(fetchedTotalSessions);

        setStudents(studentList.map((s) => ({
          id: s.id,
          name: s.user?.name || s.name || "Student",
          email: s.user?.email || s.email || "—",
          program: s.program?.name || s.program_name || "—",
          faceRegistered: !!s.faceEmbedding || !!s.face_embedding,
          joinedAt: s.joinedAt || s.joined_at || s.created_at,
          status: s.status || "active",
          attended: s._count?.attendance || s.attendance_count || 0,
          total: fetchedTotalSessions,
        })));
      } catch (e) { console.log("[CourseDetails] Error:", e); }
      finally { setIsLoading(false); }
    };
    load();
  }, [course.id]));

  const filtered = students.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.program.toLowerCase().includes(q);
  });

  const faceRegistered = students.filter(s => s.faceRegistered).length;
  const avgAttendance = students.length > 0 && totalSessions > 0
    ? Math.round((students.reduce((sum, s) => sum + s.attended, 0) / (students.length * totalSessions)) * 100)
    : 0;

  const exportCSV = async () => {
    try {
      const header = "Student,Email,Program,Face Data,Status,Attendance";
      const rows = filtered.map((s) =>
        `"${s.name}","${s.email}","${s.program}","${s.faceRegistered ? "Registered" : "—"}","${s.status}","${s.attended}/${s.total}"`
      );
      const csv = [header, ...rows].join("\n");
      const path = `${RNFS.DownloadDirectoryPath}/course_students_${Date.now()}.csv`;
      await RNFS.writeFile(path, csv, "utf8");
      await Share.open({ url: `file://${path}`, type: "text/csv", title: "Export Students", filename: "course_students" });
    } catch (e) {
      if (e?.message !== "User did not share") console.log(e);
    }
  };

  const statCards = [
    { label: "TOTAL STUDENTS", value: students.length, icon: <Users size={18} color={Theme.colors.primaryForeground} />, bg: Theme.colors.primaryDark },
    { label: "FACE REGISTERED", value: faceRegistered, icon: <ScanFace size={18} color={Theme.colors.primaryForeground} />, bg: Theme.colors.primaryDark },
    { label: "TOTAL SESSIONS", value: totalSessions, icon: <Clock size={18} color={Theme.colors.primaryForeground} />, bg: Theme.colors.primaryDark },
    { label: "AVG ATTENDANCE", value: `${avgAttendance}%`, icon: <TrendingUp size={18} color={Theme.colors.primaryForeground} />, bg: Theme.colors.primaryDark },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Change Course Button */}
        <TouchableOpacity style={styles.changeCourseBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={16} color={Theme.colors.textBody} />
          <Text style={styles.changeCourseText}>Change Course</Text>
        </TouchableOpacity>

        {/* Course Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={styles.headerBadge}>
              <BookOpen size={22} color={Theme.colors.primaryForeground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{course.name}</Text>
              <Text style={styles.headerProgram}>{course.program}</Text>
            </View>
            {course.code !== "—" && (
              <View style={styles.codeBadge}>
                <Text style={styles.codeBadgeText}>{course.code}</Text>
              </View>
            )}
          </View>
          <View style={styles.headerMeta}>
            <View style={styles.metaItem}>
              <Building size={13} color={Theme.colors.mutedForeground} style={{ marginRight: 5 }} />
              <Text style={styles.headerMetaText}>{course.department}</Text>
            </View>
            {!!course.semester && (
              <View style={styles.metaItem}>
                <Calendar size={13} color={Theme.colors.mutedForeground} style={{ marginRight: 5 }} />
                <Text style={styles.headerMetaText}>{course.semester}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats Grid */}
        {isLoading ? (
          <ActivityIndicator size="small" color={Theme.colors.accent} style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.statsGrid}>
            {statCards.map((s, i) => (
              <View key={i} style={styles.statCard}>
                <Text style={styles.statLabel}>{s.label}</Text>
                <View style={styles.statRow}>
                  <Text style={styles.statNumber}>{s.value}</Text>
                  <View style={[styles.statIconBg, { backgroundColor: s.bg }]}>{s.icon}</View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Students Section Header */}
        <Text style={styles.sectionTitle}>Enrolled Students</Text>
        <Text style={styles.sectionSubtitle}>{students.length} student{students.length !== 1 ? "s" : ""} in this course</Text>

        <View style={styles.searchExportRow}>
          <View style={styles.searchBar}>
            <Search size={14} color={Theme.colors.mutedForeground} style={{ marginRight: 8 }} />
            <TextInput style={styles.searchInput} placeholder="Search by name, email, or program..."
              placeholderTextColor={Theme.colors.mutedForeground} value={search} onChangeText={setSearch} />
          </View>
          <TouchableOpacity style={styles.exportBtn} onPress={exportCSV}>
            <Download size={14} color={Theme.colors.primaryForeground} style={{ marginRight: 4 }} />
            <Text style={styles.exportBtnText}>Export</Text>
          </TouchableOpacity>
        </View>

        {/* Student Table */}
        <View style={styles.tableCard}>
          {/* Table Header */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderText, { flex: 2.1 }]}>STUDENT</Text>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>PROGRAM</Text>
            <Text style={[styles.tableHeaderText, { flex: 0.8, textAlign: 'center' }]}>FACE</Text>
            <Text style={[styles.tableHeaderText, { flex: 0.8, textAlign: 'center' }]}>ATTEND{"\n"}ANCE</Text>
          </View>

          {filtered.length === 0 ? (
            <Text style={styles.emptyText}>No students found.</Text>
          ) : (
            filtered.map((s, i) => (
              <TouchableOpacity key={s.id} style={[styles.tableRow, i < filtered.length - 1 && styles.tableBorder]} onPress={() => setSelectedStudent(s)}>
                <View style={{ flex: 2.1, paddingRight: 6 }}>
                  <Text style={styles.studentName} numberOfLines={2}>{s.name}</Text>
                  <Text style={styles.studentEmail} numberOfLines={1}>{s.email}</Text>
                </View>
                <Text style={[styles.cellText, { flex: 2, fontSize: 11, paddingRight: 4 }]} numberOfLines={3}>{s.program}</Text>

                <View style={{ flex: 0.8, alignItems: "center" }}>
                  {s.faceRegistered ? (
                    <CheckCircle size={16} color="#10B981" />
                  ) : (
                    <XCircle size={16} color={Theme.colors.mutedForeground} />
                  )}
                </View>

                {/* Attendance with mini bar */}
                <View style={{ flex: 0.8, alignItems: "center" }}>
                  <View style={styles.attendBarTrack}>
                    <View style={[styles.attendBarFill, { width: `${s.total > 0 ? Math.round((s.attended / s.total) * 100) : 0}%` }]} />
                  </View>
                  <Text style={styles.attendText}>{s.attended}/{s.total}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

      </ScrollView>

      {/* Student Details Modal */}
      <Modal visible={!!selectedStudent} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              {selectedStudent && (
                <>
                  <View style={styles.modalHeader}>
                    <View style={styles.modalAvatar}>
                      <User size={22} color="#4361EE" />
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
                    <Text style={styles.modalDetailLabel}>Status:</Text>
                    <Text style={[styles.modalDetailValue, { color: selectedStudent.status === "graduated" ? "#10B981" : "#4361EE" }]}>
                       {selectedStudent.status.toUpperCase()}
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
                          <Text style={[styles.modalDetailValue, { color: Theme.colors.destructive, flex: 0 }]}>Not Registered</Text>
                        </>
                      )}
                    </View>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Attendance:</Text>
                    <Text style={styles.modalDetailValue}>{selectedStudent.attended}/{selectedStudent.total} ({totalSessions > 0 ? Math.round((selectedStudent.attended / totalSessions) * 100) : 0}%)</Text>
                  </View>

                  <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedStudent(null)}>
                    <Text style={styles.modalCloseBtnText}>Close</Text>
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
  safeArea: { flex: 1, backgroundColor: Theme.colors.secondary },
  container: { padding: 20, paddingBottom: 40 },

  // Header Card
  changeCourseBtn: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", backgroundColor: Theme.colors.muted, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: Theme.colors.border },
  changeCourseText: { fontSize: 13, fontWeight: "600", color: Theme.colors.textBody, marginLeft: 4 },
  headerCard: { backgroundColor: Theme.colors.background, borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: Theme.colors.border, shadowColor: Theme.colors.foreground, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  headerTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  headerBadge: { width: 44, height: 44, borderRadius: 12, backgroundColor: Theme.colors.primaryDark, justifyContent: "center", alignItems: "center", marginRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: Theme.colors.foreground, marginBottom: 3 },
  headerProgram: { fontSize: 12, color: Theme.colors.mutedForeground, textTransform: "uppercase" },
  codeBadge: { backgroundColor: Theme.colors.muted, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginLeft: 8, borderWidth: 1, borderColor: Theme.colors.border },
  codeBadgeText: { fontSize: 12, fontWeight: "700", color: Theme.colors.textBody },
  headerMeta: { flexDirection: "row", flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", marginRight: 16 },
  headerMetaText: { fontSize: 13, color: Theme.colors.mutedForeground },

  // Stats
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 20 },
  statCard: {
    width: (width - 52) / 2,
    backgroundColor: Theme.colors.background,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    shadowColor: Theme.colors.foreground,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statLabel: { fontSize: 9, fontWeight: "700", color: Theme.colors.mutedForeground, letterSpacing: 0.5, marginBottom: 6 },
  statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statNumber: { fontSize: 24, fontWeight: "800", color: Theme.colors.foreground },
  statIconBg: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },

  // Section
  sectionTitle: { fontSize: 20, fontWeight: "800", color: Theme.colors.foreground },
  sectionSubtitle: { fontSize: 13, color: Theme.colors.mutedForeground, marginTop: 2, marginBottom: 14 },

  // Search + Export
  searchExportRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  searchBar: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: Theme.colors.background, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: Theme.colors.border, marginRight: 10 },
  searchInput: { flex: 1, fontSize: 13, color: Theme.colors.foreground, padding: 0 },
  exportBtn: { backgroundColor: Theme.colors.primaryDark, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, flexDirection: "row", alignItems: "center" },
  exportBtnText: { color: Theme.colors.primaryForeground, fontSize: 12, fontWeight: "700" },

  // Table
  tableCard: { backgroundColor: Theme.colors.background, borderRadius: 14, padding: 14, shadowColor: Theme.colors.foreground, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1, borderWidth: 1, borderColor: Theme.colors.border },
  tableHeaderRow: { flexDirection: "row", paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: Theme.colors.muted, marginBottom: 6 },
  tableHeaderText: { fontSize: 10, fontWeight: "700", color: Theme.colors.mutedForeground, letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  tableBorder: { borderBottomWidth: 1, borderBottomColor: Theme.colors.muted },
  studentName: { fontSize: 13, fontWeight: "700", color: Theme.colors.foreground, marginBottom: 1 },
  studentEmail: { fontSize: 10, color: Theme.colors.mutedForeground },
  cellText: { fontSize: 12, color: Theme.colors.mutedForeground },
  emptyText: { fontSize: 14, color: Theme.colors.mutedForeground, textAlign: "center", paddingVertical: 20 },

  // Attendance mini bar
  attendBarTrack: { width: "100%", height: 4, borderRadius: 2, backgroundColor: Theme.colors.muted, overflow: "hidden", marginBottom: 3 },
  attendBarFill: { height: "100%", borderRadius: 2, backgroundColor: Theme.colors.accent },
  attendText: { fontSize: 10, fontWeight: "700", color: Theme.colors.textBody },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalCard: { backgroundColor: Theme.colors.background, borderRadius: 20, padding: 24, width: "100%", shadowColor: Theme.colors.foreground, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  modalHeader: { flexDirection: "row", alignItems: "center", marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Theme.colors.muted },
  modalAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#EEF2FF", justifyContent: "center", alignItems: "center", marginRight: 14 },
  modalHeaderInfo: { flex: 1 },
  modalName: { fontSize: 18, fontWeight: "800", color: Theme.colors.foreground, marginBottom: 4 },
  modalEmail: { fontSize: 13, color: Theme.colors.mutedForeground },
  modalDetailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  modalDetailLabel: { fontSize: 13, fontWeight: "600", color: Theme.colors.mutedForeground, flex: 0.4 },
  modalDetailValue: { fontSize: 14, fontWeight: "700", color: Theme.colors.foreground, flex: 0.6, textAlign: "right" },
  modalCloseBtn: { backgroundColor: Theme.colors.muted, paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 10 },
  modalCloseBtnText: { fontSize: 15, fontWeight: "700", color: Theme.colors.textBody },
});