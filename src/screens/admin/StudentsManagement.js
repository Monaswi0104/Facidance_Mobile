import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ScrollView, ActivityIndicator, Dimensions, TextInput, Alert, Platform
} from "react-native";
import { getStudents } from "../../api/adminApi";
import { useFocusEffect } from "@react-navigation/native";
import RNFS from "react-native-fs";
import Share from "react-native-share";

const { width } = Dimensions.get("window");

export default function StudentsManagement() {
  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | active | graduated
  const [search, setSearch] = useState("");

  const loadData = async () => {
    try {
      setIsLoading(true);
      const data = await getStudents();
      const list = data.students || data || [];

      setStudents(list.map((u) => {
        const s = u.student || {};
        // Get primary program from student.program
        const primaryProgram = s.program?.name || "";
        // Get additional programs from courses
        const coursePrograms = (s.courses || [])
          .map((c) => c.semester?.academicYear?.program?.name)
          .filter(Boolean);
        // Deduplicate all programs
        const allPrograms = [...new Set([primaryProgram, ...coursePrograms].filter(Boolean))];

        return {
          id: s.id || u.id,
          name: u.name || "Student",
          email: u.email || "—",
          status: s.status || "active",
          primaryProgram,
          allPrograms,
          courseCount: s.courses?.length || 0,
          photosUploaded: s.photosUploaded || false,
        };
      }));
    } catch (e) { console.log(e); }
    finally { setIsLoading(false); }
  };

  useFocusEffect(useCallback(() => { loadData(); }, []));

  // Apply filters
  const filtered = students.filter((s) => {
    if (filter === "active" && s.status !== "active") return false;
    if (filter === "graduated" && s.status !== "graduated") return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.allPrograms.some((p) => p.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const totalActive = students.filter((s) => s.status === "active").length;
  const totalGraduated = students.filter((s) => s.status === "graduated").length;

  const filterTabs = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "graduated", label: "Graduated" },
  ];

  const exportCSV = async () => {
    try {
      const header = "Name,Email,Primary Program,All Programs,Status,Courses";
      const rows = filtered.map((s) =>
        `"${s.name}","${s.email}","${s.primaryProgram}","${s.allPrograms.join('; ')}","${s.status}",${s.courseCount}`
      );
      const csv = [header, ...rows].join("\n");
      const path = `${RNFS.DownloadDirectoryPath}/students_export_${Date.now()}.csv`;
      await RNFS.writeFile(path, csv, "utf8");
      await Share.open({
        url: Platform.OS === "android" ? `file://${path}` : path,
        type: "text/csv",
        title: "Export Students Data",
        filename: "students_export",
      });
    } catch (e) {
      if (e?.message !== "User did not share") {
        Alert.alert("Export Failed", e?.message || "Could not export CSV.");
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={[styles.badge, { backgroundColor: "#EF4444" }]}>
              <Text style={styles.badgeText}>S</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Students</Text>
              <Text style={styles.subtitle}>Manage enrolled students, their programs, status and course mapping.</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.exportBtn} onPress={exportCSV}>
            <Text style={styles.exportBtnText}>📥 Export</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, program..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          {filterTabs.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.filterTab, filter === t.key && styles.filterTabActive]}
              onPress={() => setFilter(t.key)}
            >
              <Text style={[styles.filterText, filter === t.key && styles.filterTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Stats */}
        {isLoading ? (
          <ActivityIndicator size="small" color="#4361EE" style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>TOTAL STUDENTS</Text>
              <View style={styles.statBottom}>
                <Text style={styles.statNumber}>{students.length}</Text>
                <View style={[styles.statIconBg, { backgroundColor: "#3B82F6" }]}><Text style={styles.statIcon}>👨‍🎓</Text></View>
              </View>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>ACTIVE</Text>
              <View style={styles.statBottom}>
                <Text style={styles.statNumber}>{totalActive}</Text>
                <View style={[styles.statIconBg, { backgroundColor: "#10B981" }]}><Text style={styles.statIcon}>✅</Text></View>
              </View>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>GRADUATED</Text>
              <View style={styles.statBottom}>
                <Text style={styles.statNumber}>{totalGraduated}</Text>
                <View style={[styles.statIconBg, { backgroundColor: "#F59E0B" }]}><Text style={styles.statIcon}>🎓</Text></View>
              </View>
            </View>
          </View>
        )}

        {/* Student List */}
        <View style={styles.listHeader}>
          <Text style={styles.listIcon}>👨‍🎓</Text>
          <Text style={styles.listTitle}>Students List</Text>
          <View style={styles.listCountBadge}>
            <Text style={styles.listCountText}>Showing {filtered.length} of {students.length}</Text>
          </View>
        </View>

        <View style={styles.listCard}>
          {filtered.length === 0 ? (
            <Text style={styles.emptyText}>No students found.</Text>
          ) : (
            filtered.map((s, i) => (
              <View key={s.id} style={[styles.itemRow, i < filtered.length - 1 && styles.itemBorder]}>
                <View style={[styles.avatar, { backgroundColor: ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#06B6D4", "#EC4899"][i % 7] }]}>
                  <Text style={styles.avatarText}>{(s.name || "?")[0].toUpperCase()}</Text>
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{s.name}</Text>
                  <Text style={styles.itemEmail}>{s.email}</Text>
                  {/* Program Badges */}
                  <View style={styles.badgeRow}>
                    {s.allPrograms.length > 0 ? (
                      s.allPrograms.map((p, pi) => (
                        <View key={pi} style={[styles.programBadge, pi === 0 && styles.primaryBadge]}>
                          <Text style={[styles.programBadgeText, pi === 0 && styles.primaryBadgeText]}>
                            {pi === 0 ? `Primary: ${p}` : p}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noProgramText}>No program assigned</Text>
                    )}
                    {/* Status Badge */}
                    <View style={[styles.statusBadge, s.status === "active" ? styles.statusActive : styles.statusGrad]}>
                      <Text style={[styles.statusText, s.status === "active" ? styles.statusTextActive : styles.statusTextGrad]}>
                        {s.status === "active" ? "Active" : "Graduated"}
                      </Text>
                    </View>
                    {/* Course Count */}
                    {s.courseCount > 0 && (
                      <View style={styles.courseCountBadge}>
                        <Text style={styles.courseCountText}>📚 {s.courseCount}</Text>
                      </View>
                    )}
                  </View>
                </View>
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
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14, marginTop: 8 },
  headerLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  badge: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center", marginRight: 12 },
  badgeText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  title: { fontSize: 22, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 12, color: "#64748B", marginTop: 2 },
  exportBtn: { backgroundColor: "#0F172A", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  exportBtnText: { color: "#FFF", fontSize: 12, fontWeight: "700" },

  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  searchIcon: { fontSize: 16, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: "#1E293B", padding: 0 },

  filterRow: { flexDirection: "row", marginBottom: 16 },
  filterTab: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: "#F1F5F9", marginRight: 8 },
  filterTabActive: { backgroundColor: "#4361EE" },
  filterText: { fontSize: 13, fontWeight: "600", color: "#64748B" },
  filterTextActive: { color: "#FFF" },

  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  statCard: { flex: 1, backgroundColor: "#FFF", borderRadius: 14, padding: 14, marginHorizontal: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
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
  listCard: { backgroundColor: "#FFF", borderRadius: 16, padding: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 6, elevation: 1 },
  emptyText: { fontSize: 14, color: "#94A3B8", textAlign: "center", paddingVertical: 24 },

  itemRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 14 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", marginRight: 12, marginTop: 2 },
  avatarText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: "700", color: "#1E293B", marginBottom: 2 },
  itemEmail: { fontSize: 12, color: "#64748B", marginBottom: 6 },

  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  programBadge: { backgroundColor: "#EEF2FF", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  primaryBadge: { backgroundColor: "#DBEAFE" },
  programBadgeText: { fontSize: 10, fontWeight: "600", color: "#4361EE" },
  primaryBadgeText: { color: "#2563EB" },
  noProgramText: { fontSize: 11, color: "#94A3B8", fontStyle: "italic" },

  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusActive: { backgroundColor: "#D1FAE5" },
  statusGrad: { backgroundColor: "#FEF3C7" },
  statusText: { fontSize: 10, fontWeight: "700" },
  statusTextActive: { color: "#059669" },
  statusTextGrad: { color: "#D97706" },

  courseCountBadge: { backgroundColor: "#F1F5F9", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  courseCountText: { fontSize: 10, fontWeight: "600", color: "#64748B" },
});