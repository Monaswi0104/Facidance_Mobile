import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView, ActivityIndicator, TouchableOpacity, Dimensions } from "react-native";
import { getCourseAttendance, getCourse } from "../../api/studentApi";
import { Theme } from "../../theme/Theme";
import { BookOpen, User, Mail, Calendar, GraduationCap, Info, CheckCircle, XCircle, ChevronLeft, BarChart3 } from "lucide-react-native";

const { width } = Dimensions.get('window');

export default function CourseAttendance({ route, navigation }) {

  const { course: initialCourse, tab: initialTab } = route.params;
  const [activeTab, setActiveTab] = useState(initialTab === 'Attendance' ? 'Attendance History' : 'Overview');
  const [isLoading, setIsLoading] = useState(true);
  
  const [course, setCourseDetails] = useState(initialCourse);
  const [courseRecords, setCourseRecords] = useState([]);
  const [totalClasses, setTotalClasses] = useState(initialCourse.sessions || 0);
  const [attended, setAttended] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        const [summary, courseDets] = await Promise.all([
          getCourseAttendance(initialCourse.id),
          getCourse(initialCourse.id).catch(() => ({}))
        ]);
        
        let records = summary.records || [];
        records.sort((a,b) => new Date(b.timestamp || b.date || b.createdAt) - new Date(a.timestamp || a.date || a.createdAt));
        
        setCourseRecords(records);
        setTotalClasses(summary.total_sessions || 0);
        setAttended(summary.present || 0);
        
        setCourseDetails(prev => ({
          ...prev,
          teacherEmail: courseDets.teacher_email || prev.teacherEmail,
          teacherDept: courseDets.teacher_department_name || courseDets.department_name || prev.teacherDept,
          students: courseDets.student_count !== undefined ? courseDets.student_count : prev.students,
        }));
      } catch (e) {
        console.log("CourseAttendance load error:", e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [initialCourse.id]);

  const missed = Math.max(0, totalClasses - attended);
  const percent = totalClasses > 0 ? Math.round((attended / totalClasses) * 100) : 0;

  const formatDate = (dateString) => {
    if (!dateString) return { dateStr: "Unknown Date", timeStr: "" };
    const date = new Date(dateString);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return { 
      dateStr: `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`, 
    };
  };

  const getBarColor = (pct) => pct >= 75 ? "#10B981" : pct >= 50 ? "#F59E0B" : "#EF4444";

  const renderOverview = () => (
    <View>
      {/* Course Details & Instructor side by side */}
      <View style={styles.sectionCard}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardIconBg}><BookOpen size={14} color="#FFF" /></View>
          <View>
            <Text style={styles.cardTitle}>Course Details</Text>
            <Text style={styles.cardSubtitle}>Academic information</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Calendar size={12} color="#94A3B8" style={{ marginRight: 8 }} />
          <View>
            <Text style={styles.infoLabel}>Academic Period</Text>
            <Text style={styles.infoValue}>{course.year} · {course.semester}</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <GraduationCap size={12} color="#94A3B8" style={{ marginRight: 8 }} />
          <View>
            <Text style={styles.infoLabel}>Program</Text>
            <Text style={styles.infoValue}>{course.program}</Text>
          </View>
        </View>
        <View style={styles.infoBanner}>
          <Info size={12} color="#64748B" style={{ marginRight: 6 }} />
          <Text style={styles.infoBannerText}>To mark attendance, use the <Text style={{ fontWeight: "700" }}>entry code shared by your teacher</Text> in class.</Text>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardIconBg}><User size={14} color="#FFF" /></View>
          <View>
            <Text style={styles.cardTitle}>Instructor</Text>
            <Text style={styles.cardSubtitle}>Course teacher details</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <User size={12} color="#94A3B8" style={{ marginRight: 8 }} />
          <View>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{course.teacher}</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Mail size={12} color="#94A3B8" style={{ marginRight: 8 }} />
          <View>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{course.teacherEmail || "Not Provided"}</Text>
          </View>
        </View>
      </View>

      {/* Performance Summary */}
      <View style={styles.sectionCard}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardIconBg}><BarChart3 size={14} color="#FFF" /></View>
          <View>
            <Text style={styles.cardTitle}>Performance Summary</Text>
            <Text style={styles.cardSubtitle}>Your overall attendance for this course</Text>
          </View>
        </View>

        <View style={styles.progressRow}>
          <Text style={styles.progressLabel}>Overall Attendance</Text>
          <Text style={[styles.progressPercent, { color: getBarColor(percent) }]}>{percent}%</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: getBarColor(percent) }]} />
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
          <CheckCircle size={12} color={percent >= 75 ? "#10B981" : "#F59E0B"} style={{ marginRight: 4 }} />
          <Text style={{ fontSize: 11, color: percent >= 75 ? "#10B981" : "#F59E0B", fontWeight: "600" }}>
            {percent >= 75 ? "You're on track — great attendance!" : "Needs improvement — aim for 75%"}
          </Text>
        </View>

        <View style={styles.perfStatsRow}>
          <View style={styles.perfStatBox}>
            <Text style={styles.perfStatLabel}>Sessions Held</Text>
            <Text style={styles.perfStatValue}>{totalClasses}</Text>
          </View>
          <View style={styles.perfStatBox}>
            <Text style={styles.perfStatLabel}>Present</Text>
            <Text style={[styles.perfStatValue, { color: "#10B981" }]}>{attended}</Text>
          </View>
          <View style={styles.perfStatBox}>
            <Text style={styles.perfStatLabel}>Absent</Text>
            <Text style={[styles.perfStatValue, { color: "#EF4444" }]}>{missed}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderHistory = () => (
    <View style={styles.sectionCard}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.cardIconBg}><Calendar size={14} color="#FFF" /></View>
        <View>
          <Text style={styles.cardTitle}>Attendance History</Text>
          <Text style={styles.cardSubtitle}>All session records for this course</Text>
        </View>
      </View>

      {/* Table Header */}
      <View style={styles.tableHeaderRow}>
        <Text style={[styles.tableHeaderText, { flex: 1 }]}>DATE</Text>
        <Text style={[styles.tableHeaderText, { width: 80, textAlign: "right" }]}>STATUS</Text>
      </View>

      {courseRecords.length === 0 ? (
        <Text style={styles.emptyText}>No attendance records found for this course.</Text>
      ) : (
        courseRecords.map((record, index) => {
          const dt = formatDate(record.timestamp || record.date || record.createdAt);
          const isPresent = record.status;
          return (
            <View key={record.id || index} style={[styles.historyRow, index < courseRecords.length - 1 && styles.historyBorder]}>
              <Text style={styles.historyDate}>{dt.dateStr}</Text>
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
          );
        })
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Course Header */}
        <View style={styles.courseHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <View style={styles.headerIconBg}>
              <BookOpen size={18} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.courseTitle} numberOfLines={2}>{course.name}</Text>
              <Text style={styles.courseProgram}>{course.program}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                <User size={11} color="#94A3B8" style={{ marginRight: 4 }} />
                <Text style={styles.courseMeta}>{course.teacher}</Text>
                <Calendar size={11} color="#94A3B8" style={{ marginLeft: 10, marginRight: 4 }} />
                <Text style={styles.courseMeta}>{course.semester} · {course.year}</Text>
              </View>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <View style={styles.codePill}>
              <Text style={styles.codePillText}>{course.code}</Text>
            </View>
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>Active</Text>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>TOTAL SESSIONS</Text>
            <Text style={styles.statNumber}>{totalClasses}</Text>
          </View>
          <View style={[styles.statBox, { borderLeftWidth: 3, borderLeftColor: "#10B981" }]}>
            <Text style={[styles.statLabel, { color: "#10B981" }]}>ATTENDED</Text>
            <Text style={[styles.statNumber, { color: "#10B981" }]}>{attended}</Text>
          </View>
          <View style={[styles.statBox, { borderLeftWidth: 3, borderLeftColor: "#EF4444" }]}>
            <Text style={[styles.statLabel, { color: "#EF4444" }]}>ABSENT</Text>
            <Text style={[styles.statNumber, { color: "#EF4444" }]}>{missed}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>RATE</Text>
            <Text style={[styles.statNumber, { color: getBarColor(percent) }]}>{percent}%</Text>
          </View>
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
            style={[styles.tab, activeTab === 'Attendance History' && styles.activeTab]}
            onPress={() => setActiveTab('Attendance History')}
          >
            <Text style={[styles.tabText, activeTab === 'Attendance History' && styles.activeTabText]}>Attendance History</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={Theme.colors.accent} style={{ marginTop: 40 }} />
        ) : (
          activeTab === 'Overview' ? renderOverview() : renderHistory()
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { padding: 20, paddingBottom: 40 },

  // Course Header
  courseHeader: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  headerIconBg: { width: 40, height: 40, borderRadius: 10, backgroundColor: Theme.colors.primaryDark, justifyContent: "center", alignItems: "center", marginRight: 12 },
  courseTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A", marginBottom: 2 },
  courseProgram: { fontSize: 12, color: "#64748B" },
  courseMeta: { fontSize: 11, color: "#94A3B8" },
  codePill: { borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 6 },
  codePillText: { fontSize: 10, fontWeight: "600", color: "#475569" },
  activePill: { backgroundColor: "#F0FDF4", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1, borderColor: "#DCFCE7" },
  activePillText: { fontSize: 10, fontWeight: "700", color: "#10B981" },

  // Stats Row
  statsRow: { flexDirection: "row", marginBottom: 14 },
  statBox: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statLabel: { fontSize: 7, fontWeight: "700", color: "#94A3B8", letterSpacing: 0.4, marginBottom: 4 },
  statNumber: { fontSize: 20, fontWeight: "800", color: "#0F172A" },

  // Tabs
  tabsContainer: { flexDirection: "row", backgroundColor: "#FFF", borderRadius: 10, padding: 3, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  activeTab: { backgroundColor: "#F8FAFC", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  tabText: { fontSize: 13, fontWeight: "600", color: "#94A3B8" },
  activeTabText: { color: "#0F172A" },

  // Section Card
  sectionCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  cardIconBg: { width: 32, height: 32, borderRadius: 8, backgroundColor: Theme.colors.primaryDark, justifyContent: "center", alignItems: "center", marginRight: 10 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  cardSubtitle: { fontSize: 11, color: "#94A3B8" },

  // Info Rows
  infoRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
  infoLabel: { fontSize: 10, color: "#94A3B8", marginBottom: 1 },
  infoValue: { fontSize: 13, fontWeight: "600", color: "#1E293B" },
  infoBanner: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#F8FAFC", padding: 12, borderRadius: 8, borderWidth: 1, borderColor: "#E2E8F0" },
  infoBannerText: { fontSize: 11, color: "#64748B", flex: 1, lineHeight: 16 },

  // Performance
  progressRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  progressLabel: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  progressPercent: { fontSize: 14, fontWeight: "800" },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: "#E2E8F0", overflow: "hidden", marginBottom: 8 },
  progressFill: { height: "100%", borderRadius: 4 },
  perfStatsRow: { flexDirection: "row", justifyContent: "space-around", borderTopWidth: 1, borderTopColor: "#F1F5F9", paddingTop: 14 },
  perfStatBox: { alignItems: "center" },
  perfStatLabel: { fontSize: 11, color: "#94A3B8", marginBottom: 4 },
  perfStatValue: { fontSize: 18, fontWeight: "800", color: "#0F172A" },

  // Table / History
  tableHeaderRow: { flexDirection: "row", paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "#F1F5F9", marginBottom: 4 },
  tableHeaderText: { fontSize: 9, fontWeight: "700", color: "#94A3B8", letterSpacing: 0.5 },
  historyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14 },
  historyBorder: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  historyDate: { fontSize: 13, color: "#1E293B", fontWeight: "500", flex: 1 },
  statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: "700" },
  emptyText: { fontSize: 13, color: "#94A3B8", textAlign: "center", paddingVertical: 20 },
});