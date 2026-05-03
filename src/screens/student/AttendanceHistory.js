import React, { useState, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity, ScrollView, TextInput , RefreshControl } from "react-native";
import { getAttendanceHistory, getStudentCourses } from "../../api/studentApi";
import { Theme, useTheme } from "../../theme/Theme";
import { Search, Calendar, CheckCircle, XCircle, TrendingUp, Download, Clock } from "lucide-react-native";
import RNFS from "react-native-fs";
import Share from "react-native-share";

export default function AttendanceHistory({ route }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activeTab, setActiveTab] = useState(route?.params?.initialTab || 'Overview');
  const [data, setData] = useState([]);
  const [courseSummaries, setCourseSummaries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData(false); // Assume it accepts showLoading=false, but just await it
    setIsRefreshing(false);
  }, []);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const historyRes = await getAttendanceHistory();
        
        const historyList = Array.isArray(historyRes) ? historyRes : (historyRes.records || []);
        const sums = historyRes.summary || [];
        
        historyList.sort((a,b) => new Date(b.timestamp || b.date || b.createdAt) - new Date(a.timestamp || a.date || a.createdAt));
        
        setData(historyList);
        setCourseSummaries(sums);
      } catch (e) {
        console.log("History load error:", e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const stats = useMemo(() => {
    const total = data.length;
    const present = data.filter(r => r.status === true).length;
    const absent = total - present;
    const rate = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
    return { total, present, absent, rate };
  }, [data]);

  const filteredRecords = useMemo(() => {
    return data.filter(r => {
      if (filter === 'Present' && !r.status) return false;
      if (filter === 'Absent' && r.status) return false;
      if (search) {
        const q = search.toLowerCase();
        const courseName = (r.course?.name || r.course_name || "").toLowerCase();
        return courseName.includes(q);
      }
      return true;
    });
  }, [data, search, filter]);

  const exportCSV = async () => {
    try {
      const header = "Course,Status,Date";
      const rows = filteredRecords.map((r) => {
         const dt = formatShort(r.timestamp || r.date || r.createdAt);
         const cName = r.course?.name || r.course_name || "Unknown";
         const status = r.status ? "Present" : "Absent";
         return `"${cName}","${status}","${dt}"`;
      });
      const csv = [header, ...rows].join("\n");
      const path = `${RNFS.DownloadDirectoryPath}/attendance_history_${Date.now()}.csv`;
      await RNFS.writeFile(path, csv, "utf8");
      await Share.open({ url: `file://${path}`, type: "text/csv", title: "Export Attendance", filename: "attendance_history" });
    } catch (e) {
      if (e?.message !== "User did not share") console.log("Export error:", e);
    }
  };

  const formatShort = (dateString) => {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  const getBarColor = (rate) => rate >= 90 ? "#10B981" : rate >= 75 ? "#0EA5E9" : rate >= 50 ? "#F59E0B" : "#EF4444";

  /* ═══════════════════════════════════════ */
  /*  Overview Tab                           */
  /* ═══════════════════════════════════════ */
  const renderOverview = () => (
    <View>
      {/* Stats Row - 2x2 grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={styles.statTopRow}>
            <Text style={styles.statLabel}>TOTAL CLASSES</Text>
            <View style={styles.statIconBg}><Calendar size={14} color={colors.primaryForeground} /></View>
          </View>
          <Text style={styles.statNumber} numberOfLines={1} adjustsFontSizeToFit>{stats.total}</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statTopRow}>
            <Text style={[styles.statLabel, { color: "#10B981" }]}>PRESENT</Text>
            <View style={styles.statIconBg}><CheckCircle size={14} color={colors.primaryForeground} /></View>
          </View>
          <Text style={[styles.statNumber, { color: "#10B981" }]} numberOfLines={1} adjustsFontSizeToFit>{stats.present}</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statTopRow}>
            <Text style={[styles.statLabel, { color: colors.destructive }]}>ABSENT</Text>
            <View style={styles.statIconBg}><XCircle size={14} color={colors.primaryForeground} /></View>
          </View>
          <Text style={[styles.statNumber, { color: colors.destructive }]} numberOfLines={1} adjustsFontSizeToFit>{stats.absent}</Text>
        </View>
        <View style={styles.statCard}>
          <View style={styles.statTopRow}>
            <Text style={styles.statLabel}>ATTENDANCE RATE</Text>
            <View style={styles.statIconBg}><TrendingUp size={14} color={colors.primaryForeground} /></View>
          </View>
          <Text style={[styles.statNumber, { color: getBarColor(parseFloat(stats.rate)) }]} numberOfLines={1} adjustsFontSizeToFit>{stats.rate}%</Text>
        </View>
      </View>

      {/* By Course */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>By Course</Text>
        <Text style={styles.sectionSubtitle}>Attendance rate per course</Text>

        {courseSummaries.length === 0 ? (
          <Text style={styles.emptyText}>No course data available.</Text>
        ) : (
          courseSummaries.map((c, i) => {
            const rate = c.rate || 0;
            const total = c.total_sessions || c.total || 0;
            const present = c.present || 0;
            return (
              <View key={i} style={[styles.courseRow, i < courseSummaries.length - 1 && styles.courseRowBorder]}>
                <View style={styles.courseRowTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.courseRowName}>{c.course_name || c.name || "Unknown"}</Text>
                    <Text style={styles.courseRowMeta}>{present}/{total} sessions attended</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <TrendingUp size={11} color={getBarColor(rate)} style={{ marginRight: 3 }} />
                    <Text style={[styles.courseRowPct, { color: getBarColor(rate) }]}>{rate.toFixed(1)}%</Text>
                  </View>
                </View>
                <View style={styles.courseBarTrack}>
                  <View style={[styles.courseBarFill, { width: `${Math.min(rate, 100)}%`, backgroundColor: getBarColor(rate) }]} />
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );

  /* ═══════════════════════════════════════ */
  /*  All Records Tab                        */
  /* ═══════════════════════════════════════ */
  const renderRecords = () => (
    <View>
      {/* Search + Filters */}
      <View style={styles.filterRow}>
        <View style={styles.searchBar}>
          <Search size={13} color={colors.mutedForeground} style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search courses..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View style={styles.filterPills}>
          {["All", "Present", "Absent"].map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterPill, filter === f && styles.filterPillActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterPillText, filter === f && styles.filterPillTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Records Table */}
      <View style={styles.sectionCard}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <View>
            <Text style={styles.sectionTitle}>Attendance Records</Text>
            <Text style={styles.sectionSubtitle}>{filteredRecords.length} records</Text>
          </View>
          <Text style={{ fontSize: 10, color: colors.mutedForeground }}>Sorted by most recent</Text>
        </View>

        {/* Table Header */}
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>COURSE</Text>
          <Text style={[styles.tableHeaderText, { flex: 0.8, textAlign: "center" }]}>STATUS</Text>
          <Text style={[styles.tableHeaderText, { flex: 1.2, textAlign: "right" }]}>DATE</Text>
        </View>

        {filteredRecords.length === 0 ? (
          <Text style={styles.emptyText}>No attendance records match your criteria.</Text>
        ) : (
          filteredRecords.map((r, i) => {
            const dt = formatShort(r.timestamp || r.date || r.createdAt);
            const isPresent = r.status;
            return (
              <View key={r.id || i} style={[styles.tableRow, i < filteredRecords.length - 1 && styles.tableRowBorder]}>
                <Text style={[styles.tdCourse, { flex: 1.5 }]} numberOfLines={1}>{r.course?.name || r.course_name || "Unknown"}</Text>
                <View style={{ flex: 0.8, alignItems: "center" }}>
                  <View style={[styles.statusBadge, { backgroundColor: isPresent ? "#F0FDF4" : "#FEF2F2" }]}>
                    {isPresent ? (
                      <CheckCircle size={11} color="#16A34A" style={{ marginRight: 3 }} />
                    ) : (
                      <XCircle size={11} color="#EF4444" style={{ marginRight: 3 }} />
                    )}
                    <Text style={[styles.statusText, { color: isPresent ? "#16A34A" : "#EF4444" }]}>
                      {isPresent ? "Present" : "Absent"}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.tdDate, { flex: 1.2 }]}>{dt}</Text>
              </View>
            );
          })
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={["#10B981"]} tintColor="#10B981" />
        }
      >

        {/* Header */}
        <View style={styles.headerSection}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Attendance History</Text>
            <Text style={styles.subtitle}>Review and analyze your attendance across all courses.</Text>
          </View>
          <TouchableOpacity style={styles.exportBtn} onPress={exportCSV}>
            <Download size={13} color={colors.textBody} style={{ marginRight: 4 }} />
            <Text style={styles.exportBtnText}>Export CSV</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'Overview' && styles.activeTab]}
            onPress={() => setActiveTab('Overview')}
          >
            <Text style={[styles.tabText, activeTab === 'Overview' && styles.activeTabText]}>Overview</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'All Records' && styles.activeTab]}
            onPress={() => setActiveTab('All Records')}
          >
            <Text style={[styles.tabText, activeTab === 'All Records' && styles.activeTabText]}>All Records</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 40 }} />
        ) : (
          activeTab === 'Overview' ? renderOverview() : renderRecords()
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.secondary },
  container: { padding: 20, paddingBottom: 40 },

  // Header
  headerSection: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, marginTop: 8 },
  title: { fontSize: 24, fontWeight: "800", color: colors.foreground },
  subtitle: { fontSize: 13, color: colors.mutedForeground, marginTop: 3 },
  exportBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
  },
  exportBtnText: { fontSize: 12, fontWeight: "600", color: colors.textBody },

  // Tabs
  tabsContainer: { flexDirection: "row", backgroundColor: colors.background, borderRadius: 10, padding: 3, borderWidth: 1, borderColor: colors.border, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  activeTab: { backgroundColor: colors.secondary, shadowColor: colors.foreground, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.mutedForeground },
  activeTabText: { color: colors.foreground },

  // Stats
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 16 },
  statCard: {
    width: "48%",
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.foreground,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  statLabel: { fontSize: 9, fontWeight: "700", color: colors.mutedForeground, letterSpacing: 0.4, flex: 1, marginRight: 4 },
  statNumber: { fontSize: 24, fontWeight: "800", color: colors.foreground },
  statIconBg: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.primaryDark, justifyContent: "center", alignItems: "center" },

  // Section Card
  sectionCard: {
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.foreground,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: colors.foreground },
  sectionSubtitle: { fontSize: 12, color: colors.mutedForeground, marginTop: 1, marginBottom: 14 },

  // Course Rows
  courseRow: { paddingVertical: 14 },
  courseRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.muted },
  courseRowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  courseRowName: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  courseRowMeta: { fontSize: 11, color: colors.mutedForeground, marginTop: 1 },
  courseRowPct: { fontSize: 13, fontWeight: "700" },
  courseBarTrack: { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: "hidden" },
  courseBarFill: { height: "100%", borderRadius: 3 },

  // Filters
  filterRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  searchBar: {
    flexDirection: "row", alignItems: "center", flex: 1,
    backgroundColor: colors.background, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.border, marginRight: 8,
  },
  searchInput: { flex: 1, fontSize: 12, color: colors.foreground, padding: 0 },
  filterPills: { flexDirection: "row" },
  filterPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.border, marginLeft: 4, backgroundColor: colors.background },
  filterPillActive: { backgroundColor: colors.primaryDark, borderColor: colors.primaryDark },
  filterPillText: { fontSize: 11, fontWeight: "600", color: colors.textBody },
  filterPillTextActive: { color: colors.primaryForeground },

  // Table
  tableHeaderRow: { flexDirection: "row", paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.muted, marginBottom: 4 },
  tableHeaderText: { fontSize: 9, fontWeight: "700", color: colors.mutedForeground, letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  tableRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.muted },
  tdCourse: { fontSize: 13, fontWeight: "500", color: colors.foreground },
  tdDate: { fontSize: 11, color: colors.mutedForeground, textAlign: "right" },
  statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 10, fontWeight: "700" },

  emptyText: { fontSize: 13, color: colors.mutedForeground, textAlign: "center", paddingVertical: 20 },
});