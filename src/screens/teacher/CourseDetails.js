import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, ActivityIndicator, Dimensions, TextInput
} from "react-native";
import { getCourseDetails } from "../../api/teacherApi";
import { useFocusEffect } from "@react-navigation/native";
import RNFS from "react-native-fs";
import Share from "react-native-share";

const { width } = Dimensions.get("window");

export default function CourseDetails({ route, navigation }) {
  const { course } = route.params;
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [totalSessions, setTotalSessions] = useState(course.sessions || 0);

  useFocusEffect(useCallback(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const detailData = await getCourseDetails(course.id);
        
        if (detailData && detailData.students) {
          const fetchedTotalSessions = detailData._count?.attendance || 0;
          setTotalSessions(fetchedTotalSessions);

          setStudents(detailData.students.map((s) => ({
            id: s.id,
            name: s.user?.name || "Student",
            email: s.user?.email || "—",
            program: s.program?.name || "—",
            faceRegistered: !!s.faceEmbedding,
            joinedAt: s.joinedAt,
            status: s.status || "active",
            attended: s._count?.attendance || 0,
            total: fetchedTotalSessions,
          })));
        }
      } catch (e) { console.log(e); }
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Course Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={[styles.headerBadge, { backgroundColor: "#4361EE" }]}>
              <Text style={{ fontSize: 20 }}>📚</Text>
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
            <Text style={styles.headerMetaText}>🏢 {course.department}</Text>
            <Text style={styles.headerMetaText}>📅 {course.year}{course.semester ? ` · ${course.semester}` : ""}</Text>
          </View>
        </View>

        {/* Stats Grid */}
        {isLoading ? (
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
            <View style={[styles.statCard, { backgroundColor: "#FCE7F3" }]}>
              <Text style={styles.statLabel}>FACE REGISTERED</Text>
              <View style={styles.statRow}>
                <Text style={[styles.statNumber, { color: "#EC4899" }]}>{faceRegistered}</Text>
                <View style={[styles.statIconBg, { backgroundColor: "#EC4899" }]}><Text style={{ fontSize: 16 }}>📸</Text></View>
              </View>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#DBEAFE" }]}>
              <Text style={styles.statLabel}>TOTAL SESSIONS</Text>
              <View style={styles.statRow}>
                <Text style={[styles.statNumber, { color: "#3B82F6" }]}>{totalSessions}</Text>
                <View style={[styles.statIconBg, { backgroundColor: "#3B82F6" }]}><Text style={{ fontSize: 16 }}>🕐</Text></View>
              </View>
            </View>
            <View style={[styles.statCard, { backgroundColor: "#D1FAE5" }]}>
              <Text style={styles.statLabel}>AVG ATTENDANCE</Text>
              <View style={styles.statRow}>
                <Text style={[styles.statNumber, { color: "#10B981" }]}>{avgAttendance}%</Text>
                <View style={[styles.statIconBg, { backgroundColor: "#10B981" }]}><Text style={{ fontSize: 16 }}>✅</Text></View>
              </View>
            </View>
          </View>
        )}

        {/* Students Section */}
        <Text style={styles.sectionTitle}>Students</Text>

        <View style={styles.searchExportRow}>
          <View style={styles.searchBar}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput style={styles.searchInput} placeholder="Search by name, email, or program..."
              placeholderTextColor="#94A3B8" value={search} onChangeText={setSearch} />
          </View>
          <TouchableOpacity style={styles.exportBtn} onPress={exportCSV}>
            <Text style={styles.exportBtnText}>📥 Export</Text>
          </TouchableOpacity>
        </View>

        {/* Student Table */}
        <View style={styles.tableCard}>
          {/* Table Header */}
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderText, { flex: 2.1 }]}>STUDENT</Text>
            <Text style={[styles.tableHeaderText, { flex: 1.2 }]}>PROGRAM</Text>
            <Text style={[styles.tableHeaderText, { flex: 1 }]}>JOINED</Text>
            <Text style={[styles.tableHeaderText, { flex: 0.6, textAlign: 'center' }]}>FACE</Text>
            <Text style={[styles.tableHeaderText, { flex: 0.8, textAlign: 'center' }]}>ATTENDANCE</Text>
          </View>

          {filtered.length === 0 ? (
            <Text style={styles.emptyText}>No students found.</Text>
          ) : (
            filtered.map((s, i) => (
              <View key={s.id} style={[styles.tableRow, i < filtered.length - 1 && styles.tableBorder]}>
                <View style={{ flex: 2.1, paddingRight: 6 }}>
                  <Text style={styles.studentName} numberOfLines={2}>{s.name}</Text>
                  <Text style={styles.studentEmail} numberOfLines={1}>{s.email}</Text>
                </View>
                <Text style={[styles.cellText, { flex: 1.2, fontSize: 11, paddingRight: 4 }]} numberOfLines={3}>{s.program}</Text>
                
                <Text style={[styles.cellText, { flex: 1, fontSize: 10 }]} numberOfLines={1}>
                   {s.joinedAt ? new Date(s.joinedAt).toLocaleDateString() : '—'}
                </Text>

                <View style={{ flex: 0.6, alignItems: "center" }}>
                  <View style={[styles.faceBadge, s.faceRegistered ? styles.faceYes : styles.faceNo]}>
                    <Text style={[styles.faceText, s.faceRegistered ? { color: "#059669" } : { color: "#EF4444" }]}>
                      {s.faceRegistered ? "✅" : "—"}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.cellText, { flex: 0.8, textAlign: "center", fontWeight: "700" }]}>
                  {s.attended}/{s.total}
                </Text>
              </View>
            ))
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { padding: 20, paddingBottom: 40 },

  headerCard: { backgroundColor: "#FFF", borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: "#E2E8F0" },
  headerTop: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  headerBadge: { width: 42, height: 42, borderRadius: 12, justifyContent: "center", alignItems: "center", marginRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A", marginBottom: 3 },
  headerProgram: { fontSize: 12, fontWeight: "600", color: "#4361EE", textTransform: "uppercase" },
  codeBadge: { backgroundColor: "#EEF2FF", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginLeft: 8 },
  codeBadgeText: { fontSize: 11, fontWeight: "700", color: "#4361EE" },
  headerMeta: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  headerMetaText: { fontSize: 13, color: "#64748B" },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 20 },
  statCard: { width: (width - 52) / 2, borderRadius: 14, padding: 14, marginBottom: 10 },
  statLabel: { fontSize: 9, fontWeight: "700", color: "#64748B", letterSpacing: 0.5, marginBottom: 6 },
  statRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statNumber: { fontSize: 24, fontWeight: "800" },
  statIconBg: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },

  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#1E293B", marginBottom: 10 },
  searchExportRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  searchBar: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "#E2E8F0", marginRight: 10 },
  searchIcon: { fontSize: 14, marginRight: 6 },
  searchInput: { flex: 1, fontSize: 13, color: "#1E293B", padding: 0 },
  exportBtn: { backgroundColor: "#0F172A", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  exportBtnText: { color: "#FFF", fontSize: 12, fontWeight: "700" },

  tableCard: { backgroundColor: "#FFF", borderRadius: 14, padding: 14, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  tableHeaderRow: { flexDirection: "row", paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#F1F5F9", marginBottom: 6 },
  tableHeaderText: { fontSize: 10, fontWeight: "700", color: "#94A3B8", letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  tableBorder: { borderBottomWidth: 1, borderBottomColor: "#F8FAFC" },
  studentName: { fontSize: 13, fontWeight: "700", color: "#1E293B", marginBottom: 1 },
  studentEmail: { fontSize: 11, color: "#94A3B8" },
  cellText: { fontSize: 12, color: "#64748B" },
  faceBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  faceYes: { backgroundColor: "#D1FAE5" },
  faceNo: { backgroundColor: "#FEE2E2" },
  faceText: { fontSize: 11, fontWeight: "600" },
  emptyText: { fontSize: 14, color: "#94A3B8", textAlign: "center", paddingVertical: 20 },
});