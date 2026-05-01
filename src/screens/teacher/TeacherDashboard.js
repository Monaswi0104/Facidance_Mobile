import React, { useState, useCallback, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Dimensions, BackHandler, Alert, Linking, RefreshControl
} from "react-native";
import { getTeacherCourses, getTeacherStats, getTeacherReports, getCourseStudents, getTeacherMe } from "../../api/teacherApi";
import { getUser, clearAuth } from "../../api/authStorage";
import { useFocusEffect } from "@react-navigation/native";
import { Theme } from "../../theme/Theme";
import {
  BookOpen, Users, Calendar, CheckCircle, AlertTriangle,
  Mail, TrendingUp, Clock, ArrowUpRight,
  ScanLine, BarChart2, UserPlus, BookMarked
} from "lucide-react-native";
import { StatCardSkeleton, SectionCardSkeleton } from "../../components/SkeletonLoader";

const { width } = Dimensions.get("window");

export default function TeacherDashboard({ navigation }) {
  const [stats, setStats] = useState({ courses: 0, students: 0, semesters: 0, attendance: 0 });
  const [userName, setUserName] = useState("Teacher");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [courses, setCourses] = useState([]);
  const [atRiskStudents, setAtRiskStudents] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  const loadData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setIsLoading(true);
      const [coursesData, statsData, user, meData] = await Promise.all([
        getTeacherCourses(),
        getTeacherStats().catch(() => null),
        getUser(),
        getTeacherMe().catch(() => null),
      ]);

        const tempCourses = Array.isArray(coursesData) ? coursesData : (coursesData?.courses || []);
        console.log("[TeacherDashboard] meData:", JSON.stringify(meData));
        console.log("[TeacherDashboard] user:", JSON.stringify(user));
        const teacherName = meData?.name || meData?.user?.name || user?.name;
        console.log("[TeacherDashboard] teacherName:", teacherName);
        if (teacherName) setUserName(teacherName);

        // Stats
        const courseCount = tempCourses.length;
        const totalStudents = statsData?.total_students ?? statsData?.totalStudents ?? statsData?.students ??
          tempCourses.reduce((sum, c) => sum + (c._count?.students || c.studentCount || c.student_count || 0), 0);
        const totalAttendance = statsData?.total_attendance ?? statsData?.totalAttendance ?? statsData?.attendance ?? 0;
        const activeSemesters = statsData?.total_semesters ?? statsData?.active_semesters ?? statsData?.activeSemesters ?? statsData?.semesters ?? 0;

        setStats({
          courses: statsData?.total_courses ?? statsData?.totalCourses ?? courseCount,
          students: totalStudents,
          semesters: activeSemesters,
          attendance: totalAttendance,
        });

        // Build course overview with attendance data
        const courseDetails = [];
        const allAtRisk = [];
        const activities = [];

        for (const c of tempCourses) {
          try {
            const [reportData, studentData] = await Promise.all([
              getTeacherReports(c.id).catch(() => []),
              getCourseStudents(c.id).catch(() => []),
            ]);

            const reportList = Array.isArray(reportData) ? reportData : (reportData?.students || []);
            const stuList = Array.isArray(studentData) ? studentData : [];
            const totalSessions = reportList.length > 0 ? Math.max(...reportList.map(r => r.totalSessions || r.total || 0)) : (c._count?.sessions || c.sessionCount || c.session_count || 0);
            const avgAttendance = reportList.length > 0
              ? Math.round(reportList.reduce((s, r) => s + (r.percentage ?? 0), 0) / reportList.length)
              : 0;

            courseDetails.push({
              id: c.id,
              name: c.name || "Course",
              code: c.code || c.entry_code || "—",
              students: stuList.length || c._count?.students || c.studentCount || 0,
              sessions: totalSessions,
              attendance: avgAttendance,
              status: "Active",
            });

            // Build activity entries
            activities.push({
              name: c.name || "Course",
              sessions: totalSessions,
              students: stuList.length || c._count?.students || 0,
              time: totalSessions > 0 ? "Recent" : "—",
            });

            // At-risk students (below 75%)
            reportList.forEach((r) => {
              const pct = r.percentage ?? (r.totalSessions > 0 ? Math.round(((r.attended || r.attendedSessions || 0) / (r.totalSessions || 1)) * 100) : 100);
              if (pct < 75) {
                allAtRisk.push({
                  name: r.studentName || r.name || "Student",
                  email: r.studentEmail || r.email || "",
                  course: c.name || "Course",
                  attended: r.attended || r.attendedSessions || 0,
                  total: r.totalSessions || r.total || 0,
                  percent: pct,
                });
              }
            });
          } catch (e) {}
        }

        setCourses(courseDetails);
        setAtRiskStudents(allAtRisk.sort((a, b) => a.percent - b.percent));
        setRecentActivity(activities.slice(0, 4));
      } catch (e) { console.log("[TeacherDashboard] Error:", e); }
      finally { setIsLoading(false); }
  }, []);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData(false);
    setIsRefreshing(false);
  }, [loadData]);

  useFocusEffect(useCallback(() => {
    loadData(true);
  }, [loadData]));

  // Back button prompts logout
  useEffect(() => {
    const backAction = () => {
      Alert.alert("Logout", "Would you like to logout?", [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: async () => { await clearAuth(); navigation.reset({ index: 0, routes: [{ name: "Login" }] }); } },
      ]);
      return true;
    };
    const bh = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => bh.remove();
  }, []);

  const sendEmail = (student) => {
    const subject = `Attendance Alert - ${student.course}`;
    const body = `Dear ${student.name},\n\nYour attendance in ${student.course} is currently at ${student.percent}% (${student.attended}/${student.total} sessions), which is below the required 75% threshold.\n\nPlease ensure regular attendance to avoid academic consequences.\n\nRegards,\n${userName}`;
    const url = `mailto:${student.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url).catch(() => Alert.alert("Error", "Could not open email client."));
  };

  const getBarColor = (pct) => {
    if (pct >= 75) return "#10B981";
    if (pct >= 50) return "#F59E0B";
    return "#EF4444";
  };

  const statCards = [
    { label: "MY COURSES", value: stats.courses, icon: <BookOpen size={18} color="#FFF" />, sub: stats.semesters ? `${stats.semesters} semester` : "" },
    { label: "TOTAL STUDENTS", value: stats.students, icon: <Users size={18} color="#FFF" />, sub: stats.students > 0 ? "enrolled" : "" },
    { label: "ACTIVE SEMESTERS", value: stats.semesters, icon: <Calendar size={18} color="#FFF" />, sub: "" },
    { label: "TOTAL ATTENDANCE", value: stats.attendance, icon: <CheckCircle size={18} color="#FFF" />, sub: atRiskStudents.length > 0 ? `${atRiskStudents.length} at risk` : "", subColor: atRiskStudents.length > 0 ? "#EF4444" : "#10B981" },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        contentContainerStyle={styles.container} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={["#10B981"]} tintColor="#10B981" />
        }
      >

        {/* Welcome Header */}
        <View style={styles.welcomeSection}>
          <View style={{ flex: 1 }}>
            <Text style={styles.welcomeGreeting}>Welcome back 👋</Text>
            <Text style={styles.welcomeName}>{userName}</Text>
            <Text style={styles.welcomeDesc}>Here's what's happening across your courses today.</Text>
          </View>
          <View style={styles.headerBtns}>
            <TouchableOpacity style={styles.headerBtnOutline} onPress={() => navigation.navigate("AttendanceReport")} activeOpacity={0.7}>
              <TrendingUp size={13} color="#475569" style={{ marginRight: 4 }} />
              <Text style={styles.headerBtnText}>Export Report</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtnFilled} onPress={() => navigation.navigate("AttendanceCamera")} activeOpacity={0.7}>
              <CheckCircle size={13} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={styles.headerBtnFilledText}>New Attendance</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Grid */}
        {isLoading ? (
          <View style={styles.statsGrid}>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </View>
        ) : (
          <>
            <View style={styles.statsGrid}>
              {statCards.map((s, i) => (
                <View key={i} style={styles.statCard}>
                  <View style={styles.statTopRow}>
                    <Text style={styles.statLabel}>{s.label}</Text>
                    <View style={styles.statIconBg}>{s.icon}</View>
                  </View>
                  <Text style={styles.statNumber}>{s.value}</Text>
                  {!!s.sub && (
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
                      <TrendingUp size={9} color={s.subColor || "#10B981"} style={{ marginRight: 3 }} />
                      <Text style={[styles.statSub, s.subColor && { color: s.subColor }]}>{s.sub}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* At-Risk Students */}
            {atRiskStudents.length > 0 && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionTitle}>At-Risk Students</Text>
                    <Text style={styles.sectionSubtitle}>Below 75% attendance</Text>
                  </View>
                  <View style={styles.atRiskBadge}>
                    <Text style={styles.atRiskBadgeText}>{atRiskStudents.length} at risk</Text>
                  </View>
                </View>

                <ScrollView style={styles.atRiskScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                  {atRiskStudents.map((s, i) => (
                    <View key={i} style={[styles.atRiskRow, i < atRiskStudents.length - 1 && styles.borderBottom]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.atRiskName} numberOfLines={1}>{s.name}</Text>
                        <Text style={styles.atRiskCourse} numberOfLines={1}>{s.course}</Text>
                      </View>
                      <Text style={styles.atRiskAttend}>{s.attended}/{s.total}</Text>
                      <View style={[styles.percentBadge, { backgroundColor: getBarColor(s.percent) + "18" }]}>
                        <AlertTriangle size={10} color={getBarColor(s.percent)} style={{ marginRight: 3 }} />
                        <Text style={[styles.percentBadgeText, { color: getBarColor(s.percent) }]}>{s.percent}%</Text>
                      </View>
                      {!!s.email && (
                        <TouchableOpacity style={styles.emailBtn} onPress={() => sendEmail(s)} activeOpacity={0.6}>
                          <Mail size={14} color="#64748B" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </ScrollView>

                <TouchableOpacity style={styles.viewFullBtn} onPress={() => navigation.navigate("AttendanceReport")} activeOpacity={0.7}>
                  <Text style={styles.viewFullText}>View full reports</Text>
                  <ArrowUpRight size={12} color={Theme.colors.primaryDark} />
                </TouchableOpacity>
              </View>
            )}

            {/* Course Overview */}
            {isLoading ? (
              <SectionCardSkeleton rows={3} />
            ) : courses.length > 0 ? (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionTitle}>Course Overview</Text>
                    <Text style={styles.sectionSubtitle}>Attendance rates per course</Text>
                  </View>
                  <TouchableOpacity style={styles.viewAllBtn} onPress={() => navigation.navigate("MyCourses")} activeOpacity={0.7}>
                    <Text style={styles.viewAllBtnText}>View all</Text>
                    <ArrowUpRight size={12} color={Theme.colors.primaryDark} />
                  </TouchableOpacity>
                </View>

                {courses.map((c, i) => (
                  <View key={c.id} style={[styles.courseRow, i < courses.length - 1 && styles.borderBottom]}>
                    <View style={{ flex: 1, marginBottom: 6 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                        <Text style={styles.courseName} numberOfLines={1}>{c.name}</Text>
                        <View style={styles.activeChip}>
                          <Text style={styles.activeChipText}>{c.status}</Text>
                        </View>
                      </View>
                      <View style={styles.courseBarTrack}>
                        <View style={[styles.courseBarFill, { width: `${Math.max(c.attendance, 3)}%`, backgroundColor: getBarColor(c.attendance) }]} />
                      </View>
                      <Text style={[styles.courseAttendText, { color: getBarColor(c.attendance) }]}>{c.attendance}% attendance</Text>
                    </View>
                    <View style={styles.courseMetaCol}>
                      <Text style={styles.courseMetaNum}>{c.students}</Text>
                      <Text style={styles.courseMetaLabel}>Students</Text>
                    </View>
                    <View style={styles.courseMetaCol}>
                      <Text style={styles.courseMetaNum}>{c.sessions}</Text>
                      <Text style={styles.courseMetaLabel}>Sessions</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Recent Activity */}
            {isLoading ? (
              <SectionCardSkeleton rows={4} />
            ) : recentActivity.length > 0 ? (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                    <Text style={styles.sectionSubtitle}>Latest actions</Text>
                  </View>
                  <View style={styles.eventsBadge}>
                    <Text style={styles.eventsBadgeText}>{recentActivity.length} events</Text>
                  </View>
                </View>

                {recentActivity.map((a, i) => (
                  <View key={i} style={[styles.activityRow, i < recentActivity.length - 1 && styles.borderBottom]}>
                    <View style={[styles.activityIcon, { backgroundColor: i % 2 === 0 ? "#F0FDF4" : "#EFF6FF" }]}>
                      {i % 2 === 0 ? (
                        <CheckCircle size={16} color="#10B981" />
                      ) : (
                        <BookOpen size={16} color="#3B82F6" />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityTitle} numberOfLines={1}>{a.name}</Text>
                      <Text style={styles.activityMeta}>{a.sessions} sessions · {a.students} students enrolled</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", marginTop: 3 }}>
                        <Clock size={10} color="#CBD5E1" style={{ marginRight: 4 }} />
                        <Text style={styles.activityTime}>{a.time}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Quick Actions Grid */}
            <View style={styles.quickGrid}>
              {[
                { title: "Take Attendance", desc: "Start a new session", screen: "AttendanceCamera", icon: <ScanLine size={22} color={Theme.colors.primaryDark} /> },
                { title: "My Courses", desc: "Browse & manage", screen: "MyCourses", icon: <BookMarked size={22} color={Theme.colors.primaryDark} /> },
                { title: "Students", desc: "Import & manage", screen: "StudentEnrollment", icon: <UserPlus size={22} color={Theme.colors.primaryDark} /> },
                { title: "Reports", desc: "Export & analyze", screen: "AttendanceReport", icon: <BarChart2 size={22} color={Theme.colors.primaryDark} /> },
              ].map((action, i) => (
                <TouchableOpacity key={i} style={styles.quickCard} activeOpacity={0.7}
                  onPress={() => navigation.navigate(action.screen)}>
                  <View style={styles.quickIconBg}>
                    {action.icon}
                  </View>
                  <Text style={styles.quickTitle}>{action.title}</Text>
                  <Text style={styles.quickDesc}>{action.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { padding: 20, paddingBottom: 40 },

  // Welcome
  welcomeSection: { marginBottom: 18, marginTop: 8 },
  welcomeGreeting: { fontSize: 18, fontWeight: "700", color: "#64748B", marginBottom: 2 },
  welcomeName: { fontSize: 22, fontWeight: "800", color: "#0F172A", marginBottom: 4 },
  welcomeDesc: { fontSize: 13, color: "#64748B", marginBottom: 12 },
  headerBtns: { flexDirection: "row", gap: 8 },
  headerBtnOutline: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E2E8F0",
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
  },
  headerBtnText: { fontSize: 12, fontWeight: "600", color: "#475569" },
  headerBtnFilled: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Theme.colors.primaryDark,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
  },
  headerBtnFilledText: { fontSize: 12, fontWeight: "600", color: "#FFF" },

  // Stats
  statsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 16 },
  statCard: {
    width: (width - 52) / 2,
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  statLabel: { fontSize: 9, fontWeight: "700", color: "#94A3B8", letterSpacing: 0.4, flex: 1, marginRight: 4 },
  statNumber: { fontSize: 28, fontWeight: "800", color: "#0F172A" },
  statIconBg: { width: 36, height: 36, borderRadius: 10, backgroundColor: Theme.colors.primaryDark, justifyContent: "center", alignItems: "center" },
  statSub: { fontSize: 11, fontWeight: "600", color: "#10B981" },

  // Section Card
  sectionCard: {
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  sectionSubtitle: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },

  // At-Risk
  atRiskBadge: { backgroundColor: "#FEF2F2", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  atRiskBadgeText: { fontSize: 11, fontWeight: "700", color: "#EF4444" },
  atRiskScroll: { maxHeight: 280 },
  atRiskRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 8 },
  atRiskName: { fontSize: 13, fontWeight: "700", color: "#0F172A" },
  atRiskCourse: { fontSize: 11, color: "#94A3B8", marginTop: 1 },
  atRiskAttend: { fontSize: 12, fontWeight: "600", color: "#64748B", marginRight: 6 },
  percentBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  percentBadgeText: { fontSize: 11, fontWeight: "700" },
  emailBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0",
    justifyContent: "center", alignItems: "center",
  },
  viewFullBtn: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  viewFullText: { fontSize: 13, fontWeight: "600", color: Theme.colors.primaryDark, marginRight: 4 },

  // View All
  viewAllBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#F8FAFC", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "#E2E8F0" },
  viewAllBtnText: { fontSize: 12, fontWeight: "600", color: Theme.colors.primaryDark, marginRight: 4 },

  // Course Overview
  courseRow: { paddingVertical: 14, flexDirection: "row", alignItems: "flex-start" },
  courseName: { fontSize: 14, fontWeight: "700", color: "#0F172A", maxWidth: width * 0.42 },
  activeChip: { backgroundColor: "#D1FAE5", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginLeft: 8 },
  activeChipText: { fontSize: 10, fontWeight: "700", color: "#059669" },
  courseBarTrack: { height: 5, borderRadius: 3, backgroundColor: "#F1F5F9", overflow: "hidden", marginBottom: 4 },
  courseBarFill: { height: "100%", borderRadius: 3 },
  courseAttendText: { fontSize: 11, fontWeight: "600" },
  courseMetaCol: { alignItems: "center", marginLeft: 14, minWidth: 44 },
  courseMetaNum: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  courseMetaLabel: { fontSize: 9, color: "#94A3B8", marginTop: 1 },

  // Recent Activity
  eventsBadge: { backgroundColor: "#EFF6FF", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  eventsBadgeText: { fontSize: 11, fontWeight: "700", color: "#3B82F6" },
  activityRow: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 14 },
  activityIcon: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  activityTitle: { fontSize: 13, fontWeight: "700", color: "#0F172A" },
  activityMeta: { fontSize: 11, color: "#64748B", marginTop: 2 },
  activityTime: { fontSize: 10, color: "#CBD5E1" },

  // Navigation Bar
  navBar: { paddingBottom: 14, gap: 8 },
  navTab: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
    backgroundColor: "#FFF", borderWidth: 1, borderColor: "#E2E8F0",
  },
  navTabActive: { backgroundColor: Theme.colors.primaryDark, borderColor: Theme.colors.primaryDark },
  navTabText: { fontSize: 12, fontWeight: "600", color: "#64748B", marginLeft: 6 },
  navTabTextActive: { color: "#FFF" },

  // Quick Actions Grid
  quickGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 4 },
  quickCard: {
    width: (width - 52) / 2,
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  quickIconBg: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: Theme.colors.accentLight,
    justifyContent: "center", alignItems: "center", marginBottom: 12,
  },
  quickTitle: { fontSize: 14, fontWeight: "700", color: "#0F172A", marginBottom: 2 },
  quickDesc: { fontSize: 11, color: "#94A3B8" },
});